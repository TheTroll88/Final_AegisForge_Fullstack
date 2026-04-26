/**
 * venice_test.ts — Venice AI LLM test client for Aegis Chain dev
 *
 * Venice is OpenAI-compatible. Base URL swapped, your key as Bearer.
 * Usage: npx tsx venice_test.ts
 */

const VENICE_BASE = "https://api.venice.ai/api/v1";
const ROUTER_BASE  = "http://localhost:8787/v1";

// ── Key: set VENICE_API_KEY in your environment before running ───────────────
// To test via local router instead: set USE_ROUTER=1 and ROUTER_KEY to your OpenAI key
const USE_ROUTER  = process.env.USE_ROUTER === "1";
const BASE_URL    = USE_ROUTER ? ROUTER_BASE : VENICE_BASE;
const VENICE_KEY = USE_ROUTER
  ? (process.env.ROUTER_KEY || process.env.VENICE_API_KEY || "")
  : (process.env.VENICE_API_KEY || "");

if (!VENICE_KEY) {
  console.error("ERROR: VENICE_API_KEY environment variable is not set.");
  console.error("Run: $env:VENICE_API_KEY = 'your-key-here'  (PowerShell)");
  process.exit(1);
}

// ── Available strong models on Venice ───────────────────────────────────────
// "gpt-5.2"                   OpenAI GPT-5.2
// "claude-opus-4-6"           Anthropic Claude Opus 4.6  (most powerful)
// "claude-sonnet-4-6"         Anthropic Claude Sonnet 4.6
// "gemini-3-1-pro-preview"    Google Gemini 3.1 Pro
// "kimi-k2-5"                 Kimi K2.5
// "minimax-m25"               MiniMax M2.5
// "qwen3-235b-a22b-thinking"  Qwen 3 235B (built-in reasoning)
// "deepseek-r1"               DeepSeek R1 (built-in reasoning)

const MODEL = "claude-opus-4-6"; // ← swap to any model above

// ── Request ──────────────────────────────────────────────────────────────────
async function veniceChat(prompt: string, reasoningEffort?: string) {
  const body: Record<string, unknown> = {
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
  };

  if (reasoningEffort) {
    body.reasoning = { effort: reasoningEffort };
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VENICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Venice API error ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    choices: Array<{
      message: {
        content: string;
        reasoning_content?: string;
      };
    }>;
    model: string;
    usage: { prompt_tokens: number; completion_tokens: number };
  };

  return data;
}

// ── List available models ─────────────────────────────────────────────────
async function listModels() {
  const res = await fetch(`${BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${VENICE_KEY}` },
  });
  const data = await res.json() as { data: Array<{ id: string; type: string }> };
  return data.data.map((m) => `${m.id} [${m.type}]`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  // npx tsx venice_test.ts --models
  if (args.includes("--models")) {
    console.log("Fetching available models...\n");
    const models = await listModels();
    models.forEach((m) => console.log(" •", m));
    return;
  }

  // npx tsx venice_test.ts --reasoning "prove there are infinite primes"
  const reasoningIdx = args.indexOf("--reasoning");
  const promptIdx = args.indexOf("--prompt");

  const prompt =
    reasoningIdx !== -1
      ? args[reasoningIdx + 1]
      : promptIdx !== -1
      ? args[promptIdx + 1]
      : "Explain in one sentence what a Merkle tree is and why blockchains use them.";

  const effort = reasoningIdx !== -1 ? "high" : undefined;

  console.log(`Model  : ${MODEL}`);
  console.log(`Effort : ${effort ?? "default"}`);
  console.log(`Prompt : ${prompt}\n`);

  const result = await veniceChat(prompt, effort);
  const msg = result.choices[0].message;

  if (msg.reasoning_content) {
    console.log("── Reasoning ────────────────────────────────────────────");
    console.log(msg.reasoning_content);
    console.log("─────────────────────────────────────────────────────────\n");
  }

  console.log("── Answer ───────────────────────────────────────────────");
  console.log(msg.content);
  console.log("─────────────────────────────────────────────────────────");
  console.log(`\nTokens used: ${result.usage.prompt_tokens} in / ${result.usage.completion_tokens} out`);
}

main().catch(console.error);
