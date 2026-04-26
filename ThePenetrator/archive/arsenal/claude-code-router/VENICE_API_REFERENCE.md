# Venice API — Quick Reference

## Limits
- **max_tokens / max_completion_tokens**: 24,000 (hard cap, server-enforced)

## Error Codes
| Code | HTTP | Message |
|---|---|---|
| `AUTHENTICATION_FAILED` | 401 | Authentication failed |
| `AUTHENTICATION_FAILED_INACTIVE_KEY` | 401 | Pro subscription inactive |
| `INVALID_API_KEY` | 401 | Invalid API key |
| `INSUFFICIENT_BALANCE` | 402 | Insufficient USD/Diem balance |
| `UNAUTHORIZED` | 403 | Unauthorized access |
| `INVALID_REQUEST` | 400 | Invalid request parameters |
| `INVALID_MODEL` | 400 | Invalid model specified |
| `CHARACTER_NOT_FOUND` | 404 | Character slug not found |
| `INVALID_CONTENT_TYPE` | 415 | Invalid content type |
| `INVALID_FILE_SIZE` | 413 | File size exceeds max |
| `INVALID_IMAGE_FORMAT` | 400 | Invalid image format |
| `CORRUPTED_IMAGE` | 400 | Image corrupted/unreadable |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `MODEL_NOT_FOUND` | 404 | Model not found |
| `INFERENCE_FAILED` | 500 | Inference processing failed |
| `UPSCALE_FAILED` | 500 | Image upscaling failed |
| `UNKNOWN_ERROR` | 500 | Unknown error |

## Base URL
```
https://api.venice.ai/api/v1
```

## Auth
```
Authorization: Bearer VENICE_API_KEY
```

## OpenAI Drop-In Migration (2 lines)
```python
from openai import OpenAI
client = OpenAI(
    api_key="your-venice-api-key",
    base_url="https://api.venice.ai/api/v1"
)
```
```javascript
import OpenAI from 'openai';
const client = new OpenAI({
  apiKey: 'your-venice-api-key',
  baseURL: 'https://api.venice.ai/api/v1',
});
```
Env vars: set `OPENAI_API_KEY` and `OPENAI_BASE_URL` — most frameworks auto-detect.

## Model Mapping (OpenAI → Venice)
| OpenAI Model | Venice Equivalent | Type | Input/Output per 1M |
|---|---|---|---|
| gpt-4o | zai-org-glm-4.7 (Private) | Text | $0.55 / $2.65 |
| gpt-4o | openai-gpt-52 (Anonymized) | Text | $2.19 / $17.50 |
| gpt-4o-mini | qwen3-4b | Text | $0.05 / $0.15 |
| gpt-4-turbo | mistral-31-24b | Text | $0.50 / $2.00 |
| o1 / o3 | qwen3-235b-a22b-thinking-2507 (Private) | Reasoning | $0.45 / $3.50 |
| o1 / o3 | grok-41-fast (Anonymized) | Reasoning | $0.50 / $1.25 |
| gpt-4-vision | mistral-31-24b or qwen3-vl-235b-a22b | Vision | $0.50 / $2.00 |
| text-embedding-3-small | text-embedding-bge-m3 | Embeddings | $0.15 / $0.60 |
| dall-e-3 | qwen-image (Private, $0.01) or flux-2-pro | Image | From $0.01 |
| whisper | nvidia/parakeet-tdt-0.6b-v3 | STT | $0.0001/sec |
| tts-1 | tts-kokoro | TTS | $3.50/1M chars |

## Feature Compatibility
| Feature | OpenAI | Venice | Notes |
|---|---|---|---|
| Chat Completions | Yes | Yes | Fully compatible |
| Streaming | Yes | Yes | SSE format identical |
| Function Calling | Yes | Yes | Same tools param |
| Structured Output | Yes | Yes | Same response_format |
| Vision | Yes | Yes | Same content array |
| Embeddings | Yes | Yes | Same API |
| Image Generation | Yes | Yes | POST /images/generations |
| TTS | Yes | Yes | Compatible |
| STT | Yes | Yes | Compatible |
| Assistants API | Yes | No | Use Characters/Minds |
| Batch API | Yes | No | Not yet |
| Fine-tuning | Yes | No | Not available |

## Venice-Only Features
- **Web Search**: `venice_parameters.enable_web_search = "auto"`
- **Web Scraping**: `venice_parameters.enable_web_scraping = true`
- **Characters**: `venice_parameters.character_slug = "persona-id"`
- **Uncensored Models**: No content filtering (creative writing, security research, red teaming)
- **Video Generation**: POST `/video/queue` (wan-2.6-text-to-video, 720p, 5s)
- **X Search**: `venice_parameters.enable_x_search = true` (Grok models only)
- **Prompt Caching**: `prompt_cache_key` for server affinity
- **X402 Wallet Auth**: Pay with crypto wallet, no API key needed

## Framework Migration
| Framework | What to Change |
|---|---|
| LangChain | `base_url` in ChatOpenAI |
| Vercel AI SDK | `baseURL` in createOpenAI |
| CrewAI | `OPENAI_API_BASE` env var |
| LlamaIndex | `api_base` in OpenAI |
| AutoGen | `base_url` in config |
| Haystack | `api_base_url` in OpenAIGenerator |
| Claude Code | `--api-base` flag or env var |
| Cursor | Custom API endpoint in settings |
| Continue.dev | `apiBase` in config.json |

## Endpoints
| Endpoint | Purpose |
|---|---|
| `/chat/completions` | Text generation (OpenAI-compatible) |
| `/models` | List available models |
| `/images` | Image generation |
| `/image` | Image operations (upscale/edit) |
| `/audio/speech` | Text-to-speech |
| `/audio/transcriptions` | Speech-to-text |
| `/embeddings` | Text embeddings |
| `/characters` | Venice character library |
| `/video` | Video generation |
| `/billing/usage` | Account usage/billing |
| `/api_keys` | API key management |
| `/vvv` | VVV token info |
| `/x402/balance/{addr}` | Wallet balance (X402) |
| `/x402/transactions/{addr}` | Wallet tx history (X402) |
| `/x402/top-up` | Add USDC balance (X402) |
| `/images/generations` | OpenAI-compatible image gen |
| `/video/queue` | Queue video generation |

## venice_parameters (inject in any chat request)
```json
{
  "venice_parameters": {
    "include_venice_system_prompt": false,
    "enable_web_search": "auto",
    "enable_web_scraping": true,
    "enable_web_citations": true,
    "enable_x_search": true,
    "strip_thinking_response": false,
    "disable_thinking": false,
    "character_slug": "character-public-id",
    "include_search_results_in_stream": false,
    "return_search_results_as_documents": false
  }
}
```

## Model Suffix Syntax (alternative to venice_parameters)
```
venice-uncensored:enable_web_search=auto
claude-opus-4-6:enable_web_search=on
```

## Prompt Caching
```json
{
  "prompt_cache_key": "my-session-id"
}
```
Routes to same backend for cache hits across multi-turn conversations.

### How It Works
Caching stores processed input tokens so subsequent requests with identical prefixes reuse them.
- Up to 80% latency reduction on long prompts
- Up to 90% cost discount on cached tokens
- Prefix-based: static content FIRST, dynamic content LAST

### Per-Model Behavior
| Model | Provider | Min Tokens | Lifetime | Write Cost | Read Discount | Explicit Markers |
|---|---|---|---|---|---|---|
| Claude Opus 4.5 | Anthropic | ~4,000 | 5 min | +25% | 90% | Required |
| GPT-5.2 | OpenAI | 1,024 | 5-10 min | None | 90% | Not needed |
| Gemini | Google | ~1,024 | 1 hour | None | 75-90% | Not needed |
| Grok | xAI | ~1,024 | 5 min | None | 75-88% | Not needed |
| DeepSeek | DeepSeek | ~1,024 | 5 min | None | 50% | Not needed |
| MiniMax | MiniMax | ~1,024 | 5 min | None | 90% | Not needed |
| Kimi | Moonshot | ~1,024 | 5 min | None | 50% | Not needed |

### Claude Cache Breakpoints
Venice adds these automatically:
- System prompt → cached
- Second-to-last user message → cached (conversation history)
- Up to 4 breakpoints per request
- Cache key is byte-exact (whitespace/encoding changes break it)

Manual breakpoint (for large documents on first turn):
```json
{
  "role": "user",
  "content": [{
    "type": "text",
    "text": "[Long document...]",
    "cache_control": { "type": "ephemeral" }
  }]
}
```

### prompt_cache_key for Conversations
Use a consistent key across turns for server affinity:
```json
{ "prompt_cache_key": "conv-xyz", "messages": [...] }
```
Logos auto-generates session keys when `auto_session_key: true`.

### Response Cache Statistics
```json
{
  "usage": {
    "prompt_tokens": 5500,
    "prompt_tokens_details": {
      "cached_tokens": 5000,
      "cache_creation_input_tokens": 0
    }
  }
}
```
Use `/cache` in Logos to see hit rates live.

### Best Practices
1. **Structure**: System prompt → documents → examples → user query (static before dynamic)
2. **Byte-identical prefixes**: No timestamps, no randomized ordering, no whitespace diffs
3. **Meet minimums**: <1024 tokens won't cache. Add context to reach threshold.
4. **Use prompt_cache_key**: Consistent key routes all turns to same warm server
5. **Monitor**: Track `cached_tokens / prompt_tokens` — if always 0, prompts are changing or below threshold
6. **Cache lifetime**: 5-10 min inactivity = cold. Continuous traffic = warm. Sporadic = no benefit.
7. **Tools cache too**: Function definitions become part of cached prefix — many tools = big savings

## Cursor Prefix Trick
Cursor rewrites `claude-*` model IDs to Anthropic format. Prefix with `venice-` to prevent:
| Standard ID | Cursor ID |
|---|---|
| `claude-opus-4-6` | `venice-claude-opus-4-6` |
| `claude-sonnet-4-6` | `venice-claude-sonnet-4-6` |
| `claude-opus-45` | `venice-claude-opus-45` |
| `claude-sonnet-45` | `venice-claude-sonnet-45` |

Non-Claude models don't need the prefix. Venice strips it server-side either way.

## Key Response Headers
| Header | What it tells you |
|---|---|
| `x-venice-balance-usd` | Your USD credit balance |
| `x-venice-balance-diem` | Your DIEM token balance |
| `x-ratelimit-remaining-requests` | Requests left in window |
| `x-ratelimit-remaining-tokens` | Tokens left in window |
| `x-venice-model-id` | Actual model that ran |
| `x-venice-model-deprecation-warning` | Deprecation notice |
| `CF-RAY` | Request ID for support |

## Rate Limit Headers
```
x-ratelimit-limit-requests
x-ratelimit-remaining-requests
x-ratelimit-reset-requests
x-ratelimit-limit-tokens
x-ratelimit-remaining-tokens
x-ratelimit-reset-tokens
x-ratelimit-type (user | api_key | global)
```

## Content Safety Headers
```
x-venice-is-blurred (image was blurred)
x-venice-is-content-violation
x-venice-is-adult-model-content-violation
x-venice-contains-minor
```

## OpenAI Compatibility
Drop-in replacement — change base URL and API key, everything else stays the same:
```python
import openai
client = openai.OpenAI(
    api_key="your-venice-key",
    base_url="https://api.venice.ai/api/v1"
)
```

## Key Differences from OpenAI
1. `venice_parameters` — web search, characters, thinking control
2. System prompts — Venice appends defaults (disable with `include_venice_system_prompt: false`)
3. Model IDs — Venice's own lineup, not OpenAI mappings
4. Response headers — balance tracking, deprecation warnings, content safety
5. Content policy — more permissive, dedicated uncensored models

## NanoClaw — Venice-Powered Chat Bot (Telegram/WhatsApp)
Lightweight self-hosted AI assistant. One bot, one person, isolated Docker containers.

### Why
- Pay-per-token via Venice (no Anthropic subscription)
- Zero data retention — prompts never stored
- Each chat group gets its own container + filesystem + memory
- Model switching in-chat: "switch to opus" or "use zai-org-glm-5"
- Web search + browsing built in

### Architecture
```
You (Telegram/WhatsApp)
    → NanoClaw (Node.js)
    → Docker Container (isolated sandbox)
    → Venice Proxy (localhost:4001)
    → api.venice.ai (private inference)
```

### Quick Setup
```bash
git clone https://github.com/lorenzovenice/nanoclaw-venice.git
cd nanoclaw-venice
npm install
VENICE_API_KEY=your-key npm run venice
# In Claude Code terminal: /setup
```
Wizard handles: key validation, channel choice (Telegram/WhatsApp), container build, auth, trigger word.

### Key Files
| File | Purpose |
|---|---|
| `proxy/venice-proxy.ts` | Anthropic→OpenAI format translator for Venice |
| `src/index.ts` | Message loop + agent invocation |
| `src/channels/telegram.ts` | Telegram bot (grammy) |
| `src/channels/whatsapp.ts` | WhatsApp link (baileys) |
| `src/container-runner.ts` | Spawns isolated agent containers |

### Notes
- Defaults to GLM 5 for low cost, switch to Sonnet/Opus after setup
- WhatsApp: use a VIRTUAL number (Hushed/Burner), not personal — bot sees ALL messages
- Telegram: recommended for first-time (just need @BotFather token)
- Services auto-start on boot and self-restart on crash
- Status: SAVED FOR LATER — Telegram deployment planned but not yet

## X402 — Wallet-Based Auth & Payment Protocol

### What It Is
Open standard (Coinbase) for Internet-native payments. Named after HTTP 402 Payment Required.
Agents authenticate with a wallet, pay for Venice inference from wallet balance. No API key needed — just a signed wallet.

### Why This Matters
- Agents pay for their own inference autonomously
- DIEM staked on wallet is used automatically (free inference until exhausted)
- No subscription, no API key management — wallet IS the identity
- Works on Base chain (EVM, chain ID 8453)
- Agents can pay other agents and people via X402

### Auth Flow
```
Wallet/Agent
    → Build SIWE message (domain: outerface.venice.ai, chain: 8453)
    → Sign with EIP-191
    → Base64-encode JSON payload
    → Send as X-Sign-In-With-X header
    → Venice validates, charges balance, returns response
```

Header expires after 10 minutes — regenerate per request.

### Supported Endpoints
| Endpoint | Method | Auth Header |
|---|---|---|
| `/api/v1/chat/completions` | POST | `X-Sign-In-With-X` |
| `/api/v1/x402/balance/{addr}` | GET | `X-Sign-In-With-X` |
| `/api/v1/x402/transactions/{addr}` | GET | `X-Sign-In-With-X` |
| `/api/v1/x402/top-up` | POST | `X-402-Payment` (different header!) |

### SIWE Payload Generation (Node.js)
```javascript
import { Wallet } from 'ethers'
import { SiweMessage, generateNonce } from 'siwe'

const signer = new Wallet(process.env.PRIVATE_KEY)
const issuedAt = new Date().toISOString()
const siwe = new SiweMessage({
  domain: 'outerface.venice.ai',
  address: signer.address,
  statement: 'Sign in to Venice AI',
  uri: 'https://outerface.venice.ai/api/v1/chat/completions', // match the route you're calling
  version: '1',
  chainId: 8453,
  nonce: generateNonce(),
  issuedAt,
  expirationTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
})

const message = siwe.prepareMessage()
const signature = await signer.signMessage(message)

const headerValue = Buffer.from(JSON.stringify({
  address: signer.address.toLowerCase(),
  message,
  signature,
  chainId: 8453,
  timestamp: Date.parse(issuedAt),
}), 'utf8').toString('base64')
// Use headerValue as X-Sign-In-With-X
```
**Critical**: `uri` in SIWE must match the Venice route being called. Mismatch = 401.

### Balance Check
```bash
curl -G "https://api.venice.ai/api/v1/x402/balance/$WALLET_ADDRESS" \
  -H "X-Sign-In-With-X: $AUTH_HEADER"
```
Response:
```json
{
  "data": {
    "balanceUsd": 12.5,
    "canConsume": true,
    "diemBalanceUsd": 5.25,
    "minimumTopUpUsd": 5,
    "suggestedTopUpUsd": 10
  }
}
```

### Inference (Wallet-Paid)
```bash
curl -X POST "https://api.venice.ai/api/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "X-Sign-In-With-X: $AUTH_HEADER" \
  -d '{"model":"kimi-k2-5","messages":[{"role":"user","content":"Hello"}]}'
```
No API key needed. Wallet auth IS the authorization.

### Top-Up (USDC on Base)
1. POST `/x402/top-up` without payment header → get 402 with `paymentInfo`
2. Build X-402-Payment from paymentInfo using `x402/client` npm package
3. Retry with `X-402-Payment` header → balance credited

```javascript
import { VeniceClient } from '@venice-ai/x402-client'
const venice = new VeniceClient(process.env.WALLET_KEY)
const response = await venice.chat({
  model: 'kimi-k2-5',
  messages: [{ role: 'user', content: 'Hello!' }]
})
```
NPM: `npm install @venice-ai/x402-client`

### Transaction History
```bash
curl -G "https://api.venice.ai/api/v1/x402/transactions/$WALLET_ADDRESS?limit=10&offset=0" \
  -H "X-Sign-In-With-X: $TX_AUTH"
```
Types: `TOP_UP`, `CHARGE`, `REFUND`. Includes `requestId` and `modelId` for spend correlation.

### Error Reference
| Code | Meaning | Fix |
|---|---|---|
| 401 | Auth failed | Regenerate SIWE, check signature/chain/expiry |
| 402 | Insufficient balance | Check balance endpoint, top up if needed |
| 403 | Wallet mismatch | SIWE wallet must match URL wallet param |
| 400 | Malformed request | Rebuild JSON/header from scratch |
| 429 | Rate limited | Backoff, stop polling balance/tx repeatedly |

### Key Rules
- SIWE `uri` MUST match the Venice route being called
- Headers expire in 10 minutes — refresh per request
- Use a **dedicated wallet**, not your main treasury
- DIEM staked on wallet is consumed first (free inference)
- No DIEM = charges USDC balance on Base
- Deps: `siwe`, `ethers` for auth; `@venice-ai/x402-client` for full client

## LangChain Integration

### Setup
```bash
pip install langchain langchain-openai openai
```

### Chat Models
```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="venice-uncensored",
    api_key="your-venice-api-key",
    base_url="https://api.venice.ai/api/v1",
    temperature=0.7,
)
response = llm.invoke("Explain privacy-preserving AI in 2 sentences.")
```

### Streaming
```python
for chunk in llm.stream("Write a haiku about decentralization."):
    print(chunk.content, end="", flush=True)
```

### Embeddings
```python
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(
    model="text-embedding-bge-m3",
    api_key="your-venice-api-key",
    base_url="https://api.venice.ai/api/v1",
    check_embedding_ctx_length=False,  # Required for Venice
)
vectors = embeddings.embed_documents(["Venice AI provides private inference."])
```

### Chains
```python
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a {role}. Answer concisely."),
    ("user", "{question}"),
])
chain = prompt | llm
response = chain.invoke({"role": "privacy expert", "question": "Why does zero data retention matter?"})
```

### RAG Pipeline
```python
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

llm = ChatOpenAI(model="zai-org-glm-4.7", api_key="key", base_url="https://api.venice.ai/api/v1")
embeddings = OpenAIEmbeddings(model="text-embedding-bge-m3", api_key="key",
                               base_url="https://api.venice.ai/api/v1", check_embedding_ctx_length=False)

documents = ["Venice AI provides private inference.", "Zero data retention guaranteed."]
vectorstore = FAISS.from_texts(documents, embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 2})

rag_prompt = ChatPromptTemplate.from_messages([
    ("system", "Answer based only on this context:\n\n{context}"),
    ("user", "{question}"),
])

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | rag_prompt | llm | StrOutputParser()
)
answer = rag_chain.invoke("What privacy levels does Venice offer?")
```

### Function Calling (Agents)
```python
from langchain_core.tools import tool
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate

llm = ChatOpenAI(model="zai-org-glm-4.7", api_key="key", base_url="https://api.venice.ai/api/v1")

@tool
def get_venice_model_price(model_id: str) -> str:
    """Get pricing for a Venice AI model."""
    prices = {"venice-uncensored": "$0.20/$0.90 per 1M", "zai-org-glm-4.7": "$0.55/$2.65 per 1M"}
    return prices.get(model_id, f"Model {model_id} not found.")

prompt = ChatPromptTemplate.from_messages([
    ("system", "You help users find the right Venice AI model."),
    ("placeholder", "{chat_history}"),
    ("user", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])
agent = create_tool_calling_agent(llm, [get_venice_model_price], prompt)
executor = AgentExecutor(agent=agent, tools=[get_venice_model_price], verbose=True)
result = executor.invoke({"input": "What's the cheapest Venice model?", "chat_history": []})
```

### Structured Output
```python
from pydantic import BaseModel, Field

class MovieReview(BaseModel):
    title: str = Field(description="Movie title")
    rating: float = Field(description="Rating out of 10")
    summary: str = Field(description="One-sentence summary")

structured_llm = llm.with_structured_output(MovieReview)
review = structured_llm.invoke("Review the movie Inception")
```

### Web Search
```python
llm_with_search = ChatOpenAI(
    model="venice-uncensored", api_key="key", base_url="https://api.venice.ai/api/v1",
    extra_body={"venice_parameters": {"enable_web_search": "auto"}}
)
# Or per-request:
response = llm.invoke("Latest AI news?",
    extra_body={"venice_parameters": {"enable_web_search": "auto"}})
```

### Model Recommendations (LangChain)
| Use Case | Model | Why |
|---|---|---|
| General chains | venice-uncensored | Fast, cheap, uncensored |
| Complex reasoning | zai-org-glm-4.7 | Best private flagship |
| Function calling | zai-org-glm-4.7 | Reliable tool use |
| Vision + text | qwen3-vl-235b-a22b | Advanced vision |
| Code generation | qwen3-coder-480b-a35b-instruct | Code-optimized |
| Embeddings (RAG) | text-embedding-bge-m3 | Private embeddings |
| Budget / high-volume | qwen3-4b | $0.05/1M input |

## Vercel AI SDK Integration

### Setup
```bash
npm install ai @ai-sdk/openai
```

### Provider Config
```typescript
// lib/venice.ts
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.VENICE_API_KEY!,
  baseURL: 'https://api.venice.ai/api/v1',
});

// Use .chat() to ensure /chat/completions endpoint
export const venice = (modelId: string) => openai.chat(modelId);
```

### Streaming Chat (Next.js App Router)
```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { venice } from '@/lib/venice';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: venice('venice-uncensored'),
    system: 'You are a helpful, privacy-respecting AI assistant.',
    messages,
  });
  return result.toDataStreamResponse();
}
```

### React Chat Component
```tsx
'use client';
import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();
  return (
    <div className="max-w-2xl mx-auto p-4">
      {messages.map((m) => (
        <div key={m.id}><b>{m.role === 'user' ? 'You' : 'Venice'}:</b> {m.content}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} disabled={isLoading} />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}
```

### Non-Streaming Text
```typescript
import { generateText } from 'ai';
const { text } = await generateText({
  model: venice('zai-org-glm-4.7'),
  prompt: 'Explain zero-knowledge proofs in simple terms.',
});
```

### Structured Output
```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

const { object } = await generateObject({
  model: venice('venice-uncensored'),
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(z.string()),
      steps: z.array(z.string()),
      prepTimeMinutes: z.number(),
    }),
  }),
  prompt: 'Generate a recipe for chocolate chip cookies.',
});
```

### Tool Calling
```typescript
import { streamText, tool } from 'ai';
import { z } from 'zod';

const result = streamText({
  model: venice('zai-org-glm-4.7'),
  messages: [{ role: 'user', content: 'What is the weather in Tokyo?' }],
  tools: {
    getWeather: tool({
      description: 'Get current weather for a location',
      parameters: z.object({ location: z.string() }),
      execute: async ({ location }) => ({ temperature: 22, condition: 'Sunny', location }),
    }),
  },
});
```

### Multi-Model Chat (User-Selectable)
```typescript
const ALLOWED_MODELS = ['venice-uncensored', 'zai-org-glm-4.7', 'qwen3-vl-235b-a22b', 'qwen3-4b'];

export async function POST(req: Request) {
  const { messages, model: modelId } = await req.json();
  if (!ALLOWED_MODELS.includes(modelId)) return new Response('Invalid model', { status: 400 });
  const result = streamText({ model: venice(modelId), messages });
  return result.toDataStreamResponse();
}
```

### Embeddings
```typescript
import { embed, embedMany } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({ apiKey: process.env.VENICE_API_KEY!, baseURL: 'https://api.venice.ai/api/v1' });

const { embedding } = await embed({
  model: openai.textEmbeddingModel('text-embedding-bge-m3'),
  value: 'Privacy-first AI infrastructure',
});
```

### Web Search
```typescript
const result = streamText({
  model: venice('venice-uncensored'),
  messages: [{ role: 'user', content: 'What happened in AI news today?' }],
  experimental_providerMetadata: { venice_parameters: { enable_web_search: 'auto' } },
});
```

## CrewAI Integration

### Setup
```bash
pip install crewai crewai-tools
```

### Configuration
```python
import os
os.environ["OPENAI_API_KEY"] = "your-venice-api-key"
os.environ["OPENAI_API_BASE"] = "https://api.venice.ai/api/v1"
os.environ["OPENAI_MODEL_NAME"] = "venice-uncensored"
```

Or per-agent:
```python
from crewai import LLM

venice_llm = LLM(model="openai/venice-uncensored", api_key="key", base_url="https://api.venice.ai/api/v1", temperature=0.7)
venice_flagship = LLM(model="openai/zai-org-glm-4.7", api_key="key", base_url="https://api.venice.ai/api/v1", temperature=0.3)
```

### Multi-Agent Crew
```python
from crewai import Agent, Task, Crew

researcher = Agent(
    role="Senior Research Analyst",
    goal="Find comprehensive, accurate information on the given topic",
    backstory="Expert researcher with keen eye for detail.",
    llm=venice_flagship, verbose=True,
)
writer = Agent(
    role="Content Strategist",
    goal="Create engaging, well-structured content from research",
    backstory="Skilled writer who transforms complex research into clear content.",
    llm=venice_llm, verbose=True,
)

research_task = Task(
    description="Research the topic: {topic}. Key facts, recent developments, expert opinions.",
    expected_output="Detailed research summary with 5+ key points.",
    agent=researcher,
)
write_task = Task(
    description="Write a compelling blog post about {topic} from the research.",
    expected_output="500-800 word blog post with clear sections.",
    agent=writer, context=[research_task],
)

crew = Crew(agents=[researcher, writer], tasks=[research_task, write_task], verbose=True)
result = crew.kickoff(inputs={"topic": "The future of privacy-preserving AI"})
```

### Multi-Model Product Analysis (Red Team Pattern)
```python
from crewai import Agent, Task, Crew, Process

fast_llm = LLM(model="openai/qwen3-4b", api_key="key", base_url="https://api.venice.ai/api/v1")
smart_llm = LLM(model="openai/zai-org-glm-4.7", api_key="key", base_url="https://api.venice.ai/api/v1")
uncensored_llm = LLM(model="openai/venice-uncensored", api_key="key", base_url="https://api.venice.ai/api/v1")

market_analyst = Agent(role="Market Analyst", goal="Analyze markets", backstory="Veteran analyst.", llm=smart_llm)
red_team = Agent(role="Red Team Critic", goal="Find weaknesses", backstory="Brutally honest critic.", llm=uncensored_llm)
strategist = Agent(role="Strategist", goal="Create actionable strategy", backstory="McKinsey-trained.", llm=smart_llm)

# Tasks chain: market_task → critique_task(context=market) → strategy_task(context=both)
crew = Crew(agents=[market_analyst, red_team, strategist], tasks=[...], process=Process.sequential)
```

### Model Selection (CrewAI)
| Agent Role | Model | Why |
|---|---|---|
| Complex reasoning / Strategy | zai-org-glm-4.7 | Best private reasoning |
| Uncensored / Red team | venice-uncensored | No content filtering |
| High-volume / Fast | qwen3-4b | $0.05/1M tokens |
| Code generation | qwen3-coder-480b-a35b-instruct | Code-optimized |
| Vision/multimodal | qwen3-vl-235b-a22b | Advanced vision |
| Budget teams | qwen3-4b + venice-uncensored | Low cost combo |

### Cost Tips
- Use qwen3-4b for simple agents (formatting, summarizing, extraction)
- Reserve zai-org-glm-4.7 for agents needing complex reasoning
- Set `max_iter=5` on agents to prevent runaway token usage
- venice-uncensored for creative/critical roles — cheap and no refusals

### Privacy Advantage
Venice + CrewAI is ideal for confidential business strategy, sensitive data processing, and red team exercises — zero data retention, uncensored critique, no content filtering.

---

## Autonomous Agent API Key Creation

Autonomous AI agents can programmatically create their own Venice API keys — no human interaction needed. Uses the `api_keys/generate_web3_key` endpoint with wallet-based auth on BASE chain.

### Flow (5 steps)

1. **Acquire VVV** — Send tokens to agent wallet or swap on a DEX (Aerodrome, Uniswap)
2. **Stake VVV** — Approve VVV for staking, then call `stake()` on Venice Staking Smart Contract. VVV leaves wallet, sVVV returns = success.
3. **Get validation token** — `GET https://api.venice.ai/api/v1/api_keys/generate_web3_key` → returns `data.token`
4. **Sign token** — Sign the token with the wallet holding staked VVV (standard EIP-191 message signature)
5. **Generate API key** — `POST` to same endpoint with signed payload

### Generate Key Request
```bash
curl --request POST \
  --url https://api.venice.ai/api/v1/api_keys/generate_web3_key \
  --header 'Content-Type: application/json' \
  --data '{
  "description": "Web3 API Key",
  "apiKeyType": "INFERENCE",
  "signature": "<signed token>",
  "token": "<unsigned token>",
  "address": "<wallet address>",
  "consumptionLimit": { "diem": 1 }
}'
```

### POST Fields
| Field | Required | Description |
|---|---|---|
| `apiKeyType` | Yes | `INFERENCE` or `ADMIN` |
| `signature` | Yes | EIP-191 signed token from step 4 |
| `token` | Yes | Unsigned JWT from step 3 |
| `address` | Yes | Agent wallet address (must hold staked VVV) |
| `description` | No | Human-readable label |
| `consumptionLimit` | No | `{ "diem": N }` — limit key usage |
| `expiresAt` | No | ISO date — empty = no expiration |

### Full Example (ethers.js)
```javascript
import { ethers } from "ethers";

const wallet = ethers.Wallet.createRandom();
const address = wallet.address;

// Step 3: Get validation token
const response = await fetch('https://api.venice.ai/api/v1/api_keys/generate_web3_key');
const token = (await response.json()).data.token;

// Step 4: Sign with wallet
const signature = await wallet.signMessage(token);

// Step 5: Generate API key
const postResponse = await fetch('https://api.venice.ai/api/v1/api_keys/generate_web3_key', {
  method: 'POST',
  body: JSON.stringify({
    address,
    signature,
    token,
    apiKeyType: 'ADMIN'
  })
});
const result = await postResponse.json();
```

### Key Insight
This is how agents build their own keys — no human gating. Agent manages its own wallet on BASE, stakes VVV for Diem allocation, and self-provisions API access. This is the path to fully autonomous agent infrastructure.

---

## AI Agent Frameworks (Venice-Compatible)

### Officially Supported
| Framework | Description |
|---|---|
| **Coinbase Agentkit** | On-chain agent toolkit |
| **ElizaOS** | Local build or via Akash Template |
| **OpenClaw** | Open source AI assistant with Venice provider |

### Eliza Setup
```bash
git clone https://github.com/ai16z/eliza.git
# Copy .env.example → .env
# Set: VENICE_API_KEY, SMALL_VENICE_MODEL, MEDIUM_VENICE_MODEL, LARGE_VENICE_MODEL, IMAGE_VENICE_MODEL
```
Character file (`characters/your_char.character.json`):
```json
{ "modelProvider": "venice" }
```
```bash
pnpm i && pnpm build && pnpm start
pnpm start --characters="characters/your_char.character.json"
```

### Venice Confirmed Integrations
**Agents**: ElizaOS (local + Akash), Molt Bot (Discord)
**Coding**: Cursor IDE, Cline (VSC Extension), ROO Code (VSC Extension), VOID IDE
**Assistants**: Brave Leo Browser

### Community Confirmed
**Agents/Bots**: Coinbase Agentkit, Eliza_Starter, Venice AI Discord Bot, JanitorAI
**Coding**: Aider (terminal pair programming), Alexcodes.app
**Assistants**: Jan (local AI), llm-venice, PHP SDK (unofficial), Msty, Open WebUI, Librechat, ScreenSnapAI

### Raw API Data for RAG
- **API Swagger**: Full OpenAPI spec in YAML format
- **API Docs**: All reference pages in .mdx format
- Available from Venice docs site for ingestion into RAG pipelines

---

## Structured Responses (response_format)

Generate responses that follow a pre-defined JSON schema. Reduces hallucinated keys/values compared to system prompt manipulation.

### Requirements
- Model must support `supportsResponseSchema` (check `/v1/models`)
- `strict` must be `true`
- `additionalProperties` must be `false` on all objects
- ALL fields must have a `required` tag
- Optional fields: add `"type": ["string", "null"]`

### Example Request
```bash
curl --request POST \
  --url https://api.venice.ai/api/v1/chat/completions \
  --header 'Authorization: Bearer <api-key>' \
  --header 'Content-Type: application/json' \
  --data '{
  "model": "venice-uncensored",
  "messages": [
    {"role": "system", "content": "You are a helpful math tutor."},
    {"role": "user", "content": "solve 8x + 31 = 2"}
  ],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "math_response",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "steps": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "explanation": { "type": "string" },
                "output": { "type": "string" }
              },
              "required": ["explanation", "output"],
              "additionalProperties": false
            }
          },
          "final_answer": { "type": "string" }
        },
        "required": ["steps", "final_answer"],
        "additionalProperties": false
      }
    }
  }
}'
```

### Gotchas
- First request with `response_format` has higher latency — subsequent are fast
- Large queries can fail if `max_tokens` or timeout reached
- Incorrect schema → completion errors (usually timeout)
- Schema enforces structure, NOT correctness — content quality depends on prompt + model
- NOT compatible with parallel function calls
- All fields need `required` — use `["string", "null"]` for optional

---

## Reasoning Models

Models that think step-by-step before answering. Stronger at math, code, and logic tasks.

### Reading Output
Thinking arrives in `reasoning_content`, answer in `content`:
```python
response = client.chat.completions.create(
    model="zai-org-glm-4.7",
    messages=[{"role": "user", "content": "What is 15% of 240?"}]
)
thinking = response.choices[0].message.reasoning_content
answer = response.choices[0].message.content
```

### Streaming
`reasoning_content` arrives in delta before final answer:
```python
stream = client.chat.completions.create(
    model="zai-org-glm-4.7",
    messages=[{"role": "user", "content": "Explain photosynthesis"}],
    stream=True
)
for chunk in stream:
    if chunk.choices:
        delta = chunk.choices[0].delta
        if delta.reasoning_content:
            print(delta.reasoning_content, end="")
        if delta.content:
            print(delta.content, end="")
```

### reasoning_effort Values
| Value | Description |
|---|---|
| `none` | Disables reasoning entirely |
| `minimal` | Basic reasoning, minimal effort |
| `low` | Light reasoning, simple problems |
| `medium` | Balanced (default recommendation) |
| `high` | Deep reasoning, complex problems |
| `xhigh` | Extra-high depth |
| `max` | Maximum reasoning capability |

### Model Support Matrix
| Model | Supported Values |
|---|---|
| GPT-5.2 | none, low, medium, high, xhigh |
| GPT-5.2 Codex, GPT-5.3 Codex | low, medium, high, xhigh |
| Claude Opus 4.6 | low, medium, high, max |
| Claude Opus 4.5, Sonnet 4.5/4.6 | low, medium, high |
| Gemini 3 Pro Preview | low, high |
| Gemini 3.1 Pro Preview | low, medium, high |
| Gemini 3 Flash Preview | minimal, low, medium, high |
| Qwen 3 235B A22B Thinking, Qwen 3.5 35B A3B | low, medium, high |
| Kimi K2.5 | low, medium, high |
| MiniMax M2.5, M2.1 | low, medium, high |
| GLM 4.7 series | low, medium, high |
| DeepSeek R1 | Built-in only, not configurable |
| Grok 4.1 Fast, Grok Code Fast | NOT SUPPORTED — errors if specified |

### Usage
```python
# Nested format (recommended)
response = client.chat.completions.create(
    model="zai-org-glm-4.7",
    messages=[{"role": "user", "content": "Prove infinitely many primes"}],
    extra_body={"reasoning": {"effort": "high"}}
)
# Flat format also accepted: "reasoning_effort": "high"
```

### Disabling Reasoning
| Method | Syntax | Notes |
|---|---|---|
| `reasoning.enabled: false` | `{"reasoning": {"enabled": false}}` | Venice-level toggle, recommended |
| `reasoning.effort: "none"` | `{"reasoning": {"effort": "none"}}` | Provider-dependent |

Can disable: GPT-5.2, GPT-5.x Codex, Qwen 3 Thinking, Qwen 3.5, GLM 4.7
Cannot disable (always reasons): Claude Opus/Sonnet, Gemini 3.x, DeepSeek R1

### Capability Discovery
Check `/v1/models` for:
- `supportsReasoning` — model has chain-of-thought
- `supportsReasoningEffort` — model accepts the effort parameter

### Best Practices
- Default to `medium` for general use
- `high` / `xhigh` for complex tasks (math, code, analysis)
- `low` for latency-sensitive apps
- `low`, `medium`, `high` are the safest cross-model values

---

## Alchemy Bundler API (ERC-4337)

The Bundler APIs are JSON-RPC endpoints for working with ERC-4337 UserOperations (account abstraction).

### Endpoints

| Method | Description |
|---|---|
| `eth_sendUserOperation` | Submits a UserOperation to the Bundler. Returns a UO hash on success for status tracking. |
| `eth_estimateUserOperationGas` | Estimates gas for a UO: `preVerificationGas`, `verificationGasLimit`, `callGasLimit`. |
| `eth_getUserOperationByHash` | Returns a UO by hash, including block/tx inclusion info. Returns `null` if not yet included. |
| `eth_getUserOperationReceipt` | Returns UO receipt (metadata) by hash. Returns `null` if not yet included. |
| `rundler_maxPriorityFeePerGas` | Returns estimated priority fee per gas for Rundler endpoints. |
| `eth_supportedEntryPoints` | Returns list of supported EntryPoint contract addresses. |

### Account Kit SDK (`@account-kit/infra`)

Required SDK version: `^v4.59.1`

Enables direct interaction with Alchemy's ERC-4337 bundler for advanced UserOperation management. The `alchemyFeeEstimator` function leverages `rundler_maxPriorityFeePerGas` and `eth_estimateUserOperation` under the hood.

```typescript
// config.ts
import { alchemy, sepolia } from "@account-kit/infra";

const YOUR_API_KEY = "<YOUR_API_KEY>";
export const YOUR_PRIVATE_KEY = "<YOUR_PRIVATE_KEY>";
export const chain = sepolia;

export const transport = alchemy({
  apiKey: YOUR_API_KEY,
});
```

**Notes:**
- Requires familiarity with ERC-4337 and proper EntryPoint contract configuration (`entryPoint07Address`)
- Set `ALCHEMY_API_KEY` and `PRIVATE_KEY` env vars
- SDK files: `config.ts`, `estimateAndSendUserOperation.ts`, `getUserOperationByHash.ts`

---

## Solana API (Alchemy RPC)

Full list of available Solana JSON-RPC methods via Alchemy. Base URLs:
- Mainnet: `https://solana-mainnet.g.alchemy.com/v2/{API_KEY}`
- Devnet: `https://solana-devnet.g.alchemy.com/v2/{API_KEY}`

### Account & Balance
| Method | Docs |
|---|---|
| `getAccountInfo` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-account-info) |
| `getBalance` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-balance) |
| `getMultipleAccounts` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-multiple-accounts) |
| `getLargestAccounts` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-largest-accounts) |
| `getMinimumBalanceForRentExemption` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-minimum-balance-for-rent-exemption) |
| `getProgramAccounts` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-program-accounts) |

### Blocks
| Method | Docs |
|---|---|
| `getBlock` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-block) |
| `getBlockCommitment` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-block-commitment) |
| `getBlockHeight` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-block-height) |
| `getBlockProduction` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-block-production) |
| `getBlocks` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-blocks) |
| `getBlocksWithLimit` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-blocks-with-limit) |
| `getBlockTime` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-block-time) |
| `getFirstAvailableBlock` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-first-available-block) |
| `isBlockhashValid` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/is-blockhash-valid) |
| `getLatestBlockhash` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-latest-blockhash) |
| `minimumLedgerSlot` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/minimum-ledger-slot) |

### Transactions & Signatures
| Method | Docs |
|---|---|
| `getTransaction` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-transaction) |
| `getTransactionCount` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-transaction-count) |
| `getSignaturesForAddress` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-signatures-for-address) |
| `getSignatureStatuses` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-signature-statuses) |
| `simulateBundle` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/simulate-bundle) |

### Tokens (SPL)
| Method | Docs |
|---|---|
| `getTokenAccountBalance` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-token-account-balance) |
| `getTokenAccountsByDelegate` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-token-accounts-by-delegate) |
| `getTokenAccountsByOwner` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-token-accounts-by-owner) |
| `getTokenLargestAccounts` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-token-largest-accounts) |
| `getTokenSupply` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-token-supply) |

### Fees & Priority
| Method | Docs |
|---|---|
| `getFeeForMessage` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-fee-for-message) |
| `getPriorityFeeEstimate` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-priority-fee-estimate) |
| `getRecentPrioritizationFees` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-recent-prioritization-fees) |

### Network & Cluster
| Method | Docs |
|---|---|
| `getClusterNodes` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-cluster-nodes) |
| `getEpochInfo` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-epoch-info) |
| `getEpochSchedule` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-epoch-schedule) |
| `getGenesisHash` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-genesis-hash) |
| `getHighestSnapshotSlot` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-highest-snapshot-slot) |
| `getIdentity` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-identity) |
| `getVersion` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-version) |
| `getSlot` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-slot) |
| `getSlotLeader` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-slot-leader) |
| `getSlotLeaders` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-slot-leaders) |
| `getLeaderSchedule` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-leader-schedule) |
| `getMaxRetransmitSlot` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-max-retransmit-slot) |
| `getMaxShredInsertSlot` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-max-shred-insert-slot) |
| `getRecentPerformanceSamples` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-recent-performance-samples) |
| `getSupply` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-supply) |

### Staking & Inflation
| Method | Docs |
|---|---|
| `getInflationGovernor` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-inflation-governor) |
| `getInflationRate` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-inflation-rate) |
| `getInflationReward` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-inflation-reward) |
| `getStakeActivation` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-stake-activation) |
| `getVoteAccounts` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/get-vote-accounts) |

### Dev Tools
| Method | Docs |
|---|---|
| `requestAirdrop` | [docs](https://docs.alchemy.com/docs/chains/solana/solana-api-endpoints/request-airdrop) |
