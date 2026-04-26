import express, { Request, Response } from "express";
import { getVeniceInferenceKey, } from "./src/vault_reader.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.ROUTER_PORT || 8787);
const ROUTER_KEYS = new Set(
  (process.env.ROUTER_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean),
);

const VENICE_API_KEY = process.env.VENICE_API_KEY || getVeniceInferenceKey();
const VENICE_BASE = "https://api.venice.ai/api/v1";
const FORCE_MODEL = process.env.FORCE_MODEL || "";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const TELEGRAM_ADMIN_IDS = new Set(
  (process.env.TELEGRAM_ADMIN_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);
const TELEGRAM_SIGNING_SECRET = process.env.TELEGRAM_SIGNING_SECRET || "";

const RETRYABLE_STATUS = new Set([402, 408, 429, 500, 502, 503, 504]);

function hasTelegramConfig(): boolean {
  return !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}

async function sendTelegram(message: string): Promise<boolean> {
  if (!hasTelegramConfig()) return false;

  try {
    const endpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        disable_web_page_preview: true,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function isTelegramAdmin(userId: unknown): boolean {
  if (!TELEGRAM_ADMIN_IDS.size) return true;
  if (typeof userId !== "string" && typeof userId !== "number") return false;
  return TELEGRAM_ADMIN_IDS.has(String(userId));
}

type Provider = {
  name: "venice";
  baseUrl: string;
  apiKey: string;
};

function getProviders(): Provider[] {
  const providers: Provider[] = [];

  if (VENICE_API_KEY) {
    providers.push({
      name: "venice",
      baseUrl: VENICE_BASE,
      apiKey: VENICE_API_KEY,
    });
  }

  return providers;
}

function extractBearer(req: Request): string {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return "";
  return auth.slice("Bearer ".length).trim();
}

function isAuthorized(req: Request): boolean {
  if (ROUTER_KEYS.size === 0) return false;
  const token = extractBearer(req);
  return ROUTER_KEYS.has(token);
}

async function proxyChat(req: Request, res: Response) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized router key" });
  }

  const providers = getProviders();
  if (!providers.length) {
    return res.status(500).json({
      error: "No upstream providers configured (set VENICE_API_KEY)",
    });
  }

  const body = req.body;
  // Override model if FORCE_MODEL is set — all agents get claude-opus-4-7
  if (FORCE_MODEL && body && typeof body === "object") {
    body.model = FORCE_MODEL;
  }
  let lastStatus = 500;
  let lastBody = { error: "No provider response" };

  for (const provider of providers) {
    const upstreamUrl = `${provider.baseUrl}/chat/completions`;

    try {
      const upstream = await fetch(upstreamUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const text = await upstream.text();
      const contentType = upstream.headers.get("content-type") || "application/json";

      if (upstream.ok) {
        res.setHeader("x-router-provider", provider.name);
        res.setHeader("content-type", contentType);
        return res.status(upstream.status).send(text);
      }

      lastStatus = upstream.status;
      try {
        lastBody = JSON.parse(text);
      } catch {
        lastBody = { error: text || "Unknown upstream error" };
      }

      if (!RETRYABLE_STATUS.has(upstream.status)) {
        res.setHeader("x-router-provider", provider.name);
        return res.status(upstream.status).json(lastBody);
      }
    } catch (err) {
      console.error(`Upstream ${provider.name} fetch failed:`, err);
      lastStatus = 502;
      lastBody = { error: `Upstream ${provider.name} fetch failed` };
    }
  }

  return res.status(lastStatus).json(lastBody);
}

// ── Anthropic /v1/messages ↔ Venice (OpenAI format) bridge ──────────────────
// Ollama sends native Anthropic-format requests. We translate → OpenAI →
// Venice → translate response back → Anthropic. Ollama never knows.

interface AnthropicMessage {
  role: string;
  content: string | Array<{ type: string; text?: string }>;
}

interface AnthropicRequest {
  model?: string;
  messages: AnthropicMessage[];
  system?: string | Array<{ type: string; text: string }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  stop_sequences?: string[];
}

function anthropicToOpenAI(body: AnthropicRequest, forceModel: string) {
  const messages: Array<{ role: string; content: string }> = [];

  // Prepend system prompt if present
  if (body.system) {
    const systemText = typeof body.system === "string"
      ? body.system
      : body.system.map((b) => b.text || "").join("\n");
    if (systemText) messages.push({ role: "system", content: systemText });
  }

  for (const msg of body.messages) {
    const content = typeof msg.content === "string"
      ? msg.content
      : msg.content.map((b) => b.text || "").join("");
    messages.push({ role: msg.role, content });
  }

  return {
    model: forceModel || body.model || "claude-opus-4-7",
    messages,
    max_tokens: body.max_tokens,
    temperature: body.temperature,
    top_p: body.top_p,
    stream: body.stream || false,
    stop: body.stop_sequences,
  };
}

function toStopReason(finishReason: string | undefined): string {
  if (finishReason === "length") return "max_tokens";
  if (finishReason === "stop") return "end_turn";
  return "end_turn";
}

function openAIToAnthropic(oai: any, reqModel: string) {
  const choice = oai?.choices?.[0];
  const text = choice?.message?.content || "";
  const stopReason = toStopReason(choice?.finish_reason);

  return {
    id: `msg_${Math.random().toString(36).slice(2, 18)}`,
    type: "message",
    role: "assistant",
    model: reqModel,
    content: [{ type: "text", text }],
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: oai?.usage?.prompt_tokens ?? 0,
      output_tokens: oai?.usage?.completion_tokens ?? 0,
    },
  };
}

type ProviderResult = { sent: true } | { sent: false; status: number; body: any };

async function tryMessagesProvider(
  provider: Provider,
  openaiBody: object,
  targetModel: string,
  res: Response,
): Promise<ProviderResult> {
  const upstreamUrl = `${provider.baseUrl}/chat/completions`;
  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(openaiBody),
    });

    const text = await upstream.text();

    if (upstream.ok) {
      let oaiResp: any;
      try { oaiResp = JSON.parse(text); } catch { oaiResp = {}; }
      res.setHeader("x-router-provider", provider.name);
      res.setHeader("content-type", "application/json");
      res.status(200).json(openAIToAnthropic(oaiResp, targetModel));
      return { sent: true };
    }

    let body: any;
    try { body = JSON.parse(text); } catch { body = { type: "error", error: { type: "api_error", message: text } }; }

    if (!RETRYABLE_STATUS.has(upstream.status)) {
      res.setHeader("x-router-provider", provider.name);
      res.status(upstream.status).json(body);
      return { sent: true };
    }

    return { sent: false, status: upstream.status, body };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Upstream ${provider.name} fetch failed: ${message}`);
    return {
      sent: false,
      status: 502,
      body: { type: "error", error: { type: "api_error", message: `Upstream ${provider.name} fetch failed: ${message}` } },
    };
  }
}

async function proxyMessages(req: Request, res: Response) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ type: "error", error: { type: "authentication_error", message: "Unauthorized router key" } });
  }

  const providers = getProviders();
  if (!providers.length) {
    return res.status(500).json({ type: "error", error: { type: "api_error", message: "No upstream providers configured" } });
  }

  const anthropicBody: AnthropicRequest = req.body;
  const targetModel = FORCE_MODEL || anthropicBody.model || "claude-opus-4-7";
  const openaiBody = anthropicToOpenAI(anthropicBody, targetModel);

  let lastStatus = 500;
  let lastBody: any = { type: "error", error: { type: "api_error", message: "No provider response" } };

  for (const provider of providers) {
    const result = await tryMessagesProvider(provider, openaiBody, targetModel, res);
    if (result.sent) return;
    lastStatus = result.status;
    lastBody = result.body;
  }

  return res.status(lastStatus).json(lastBody);
}

app.get("/health", (_req, res) => {
  const providers = getProviders().map((p) => p.name);
  res.json({ ok: true, providers, hasRouterKeys: ROUTER_KEYS.size > 0 });
});

app.post("/admin/telegram/health-ping", async (req, res) => {
  const auth = req.headers["x-admin-secret"] || "";
  if (!TELEGRAM_SIGNING_SECRET || auth !== TELEGRAM_SIGNING_SECRET) {
    return res.status(401).json({ error: "Unauthorized admin request" });
  }

  const providers = getProviders().map((p) => p.name).join(",") || "none";
  const msg = [
    "AEGIS router heartbeat",
    `providers=${providers}`,
    `keys=${ROUTER_KEYS.size}`,
    `model=${FORCE_MODEL || "agent-supplied"}`,
    `ts=${new Date().toISOString()}`,
  ].join("\n");

  const sent = await sendTelegram(msg);
  return res.json({ ok: true, telegramSent: sent });
});

app.post("/telegram/webhook", async (req, res) => {
  const auth = req.headers["x-telegram-bot-api-secret-token"] || "";
  if (TELEGRAM_SIGNING_SECRET && auth !== TELEGRAM_SIGNING_SECRET) {
    return res.status(401).json({ ok: false });
  }

  const message = req.body?.message;
  const chatId = String(message?.chat?.id || "");
  const userId = String(message?.from?.id || "");
  const text = String(message?.text || "").trim();

  if (!text || !chatId) {
    return res.json({ ok: true });
  }

  if (!isTelegramAdmin(userId)) {
    await sendTelegram(`Denied command from non-admin user ${userId}`);
    return res.json({ ok: true });
  }

  const reply = async (content: string) => {
    if (!TELEGRAM_BOT_TOKEN) return;
    const endpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: content,
        disable_web_page_preview: true,
      }),
    });
  };

  if (text === "/status") {
    const providers = getProviders().map((p) => p.name).join(",") || "none";
    await reply([
      "AEGIS router status",
      `providers=${providers}`,
      `keys=${ROUTER_KEYS.size}`,
      `model=${FORCE_MODEL || "agent-supplied"}`,
      `telegram=${hasTelegramConfig() ? "configured" : "not-configured"}`,
      `time=${new Date().toISOString()}`,
    ].join("\n"));
    return res.json({ ok: true });
  }

  if (text === "/health") {
    await reply("AEGIS router is online.");
    return res.json({ ok: true });
  }

  if (text === "/help") {
    await reply("Commands: /status, /health, /help");
    return res.json({ ok: true });
  }

  await reply("Unknown command. Use /help");
  return res.json({ ok: true });
});

// ── Ollama /api/tags — fake model list so vscode-ollama sees claude-opus-4-7 ─
app.get("/api/tags", (_req, res) => {
  const model = FORCE_MODEL || "claude-opus-4-7";
  res.json({
    models: [{
      name: model,
      model: model,
      modified_at: new Date().toISOString(),
      size: 0,
      digest: "aegis-router",
      details: { format: "gguf", family: "claude", parameter_size: "unknown", quantization_level: "none" },
    }],
  });
});

// ── Ollama /api/version — vscode-ollama probes this on connection test ────────
app.get("/api/version", (_req, res) => {
  res.json({ version: "0.6.0-aegis-router" });
});

function processOllamaChunk(line: string, model: string, res: Response): void {
  const trimmed = line.trim();
  if (!trimmed || trimmed === "data: [DONE]" || !trimmed.startsWith("data: ")) return;
  try {
    const chunk = JSON.parse(trimmed.slice(6));
    const delta = chunk?.choices?.[0]?.delta?.content || "";
    const finishReason = chunk?.choices?.[0]?.finish_reason;
    const isDone = !!finishReason;
    res.write(JSON.stringify({
      model,
      created_at: new Date().toISOString(),
      message: { role: "assistant", content: delta },
      done: isDone,
      ...(isDone ? { done_reason: finishReason === "length" ? "length" : "stop" } : {}),
    }) + "\n");
  } catch { /* skip malformed chunks */ }
}

async function streamOllamaResponse(
  body: ReadableStream<Uint8Array>,
  model: string,
  res: Response,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      processOllamaChunk(line, model, res);
    }
  }
  res.end();
}

async function tryChatProvider(
  provider: Provider,
  openaiBody: object,
  model: string,
  isStream: boolean,
  res: Response,
): Promise<boolean> {
  try {
    const upstream = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(openaiBody),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      if (RETRYABLE_STATUS.has(upstream.status)) return false;
      res.status(upstream.status).json({ error: text });
      return true;
    }

    if (!isStream) {
      const oai = await upstream.json();
      const content = oai?.choices?.[0]?.message?.content || "";
      res.json({
        model,
        created_at: new Date().toISOString(),
        message: { role: "assistant", content },
        done: true,
        done_reason: "stop",
      });
      return true;
    }

    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("x-router-provider", provider.name);
    await streamOllamaResponse(upstream.body!, model, res);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Upstream ${provider.name} chat failed: ${message}`);
    return false;
  }
}

// ── Ollama /api/chat — streaming bridge to Venice via OpenAI SSE ──────────────
// vscode-ollama sends: { model, messages, stream: true }
// We translate → OpenAI → Venice → translate SSE back → Ollama NDJSON stream
app.post("/api/chat", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized router key" });
  }

  const providers = getProviders();
  if (!providers.length) {
    return res.status(500).json({ error: "No upstream providers configured" });
  }

  const ollamaBody = req.body;
  const model = FORCE_MODEL || ollamaBody.model || "claude-opus-4-7";
  const isStream = ollamaBody.stream !== false; // default true for Ollama
  const openaiBody = { model, messages: ollamaBody.messages || [], stream: isStream };

  for (const provider of providers) {
    const handled = await tryChatProvider(provider, openaiBody, model, isStream, res);
    if (handled) return;
  }

  return res.status(502).json({ error: "All upstream providers failed" });
});

app.post("/v1/chat/completions", proxyChat);

// Anthropic-format endpoint — Ollama hits this when OLLAMA_CLOUD_BASE_URL=http://localhost:8787
app.post("/v1/messages", proxyMessages);

app.listen(PORT, () => {
  console.log(`\n  AEGIS ROUTER — http://localhost:${PORT}`);
  console.log(`  Providers : ${getProviders().map((p) => p.name).join(", ") || "none"}`);
  console.log(`  Model     : ${FORCE_MODEL || "(agent-supplied)"}`);
  console.log(`  Telegram  : ${hasTelegramConfig() ? "enabled" : "disabled"}`);
  console.log(`  Endpoints :`);
  console.log(`    /api/chat              ← vscode-ollama / Ollama native (streaming)`);
  console.log(`    /api/tags              ← vscode-ollama model list`);
  console.log(`    /v1/chat/completions   ← OpenAI-format agents`);
  console.log(`    /v1/messages           ← Anthropic-format agents`);
  console.log(`    /telegram/webhook      ← Telegram bot control commands`);
  console.log(`    /admin/telegram/health-ping ← Push heartbeat to Telegram`);
  console.log(`    /health                ← status check\n`);
});
