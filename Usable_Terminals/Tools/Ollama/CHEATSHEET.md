# Ollama — Cheat Sheet

> **Path:** `C:\Users\natha\AppData\Local\Programs\Ollama\ollama.exe`  
> **API:** `http://localhost:11434`  
> **Models:** `D:\Ollama\models` (OLLAMA_MODELS env var)  
> **Type:** Local LLM inference server  
> **AegisForge Role:** Self-hosted AI brain — Logos daemon runs llama3.1 via Ollama

---

## Model Management

```bash
# List models
ollama list                                # All downloaded models

# Download models
ollama pull llama3.1                       # Download llama3.1
ollama pull codellama                      # Code-focused model
ollama pull mistral                        # Mistral 7B
ollama pull phi3                           # Microsoft Phi-3
ollama pull llama3.1:70b                   # Specific size variant
ollama pull llama3.1:latest                # Latest tag

# Remove models
ollama rm model-name                       # Delete downloaded model

# Model info
ollama show llama3.1                       # Model details (size, parameters, template)
ollama show llama3.1 --modelfile           # Show Modelfile definition
```

---

## Interactive Chat

```bash
# Chat in terminal
ollama run llama3.1                        # Start interactive chat
ollama run codellama                       # Chat with code model
ollama run llama3.1 "What is Solana?"      # Single question (non-interactive)

# Inside chat session:
# Type message → Enter to send
# /bye to exit
# /? for help
# Multiline: press """ to start/end multiline input
```

---

## REST API

```bash
# Health check
curl http://localhost:11434                # Returns "Ollama is running"

# List models
curl http://localhost:11434/api/tags

# Generate (completion)
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1",
  "prompt": "Explain blockchain in one sentence",
  "stream": false
}'

# Chat (conversation)
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.1",
  "messages": [
    {"role": "system", "content": "You are a crypto trading assistant."},
    {"role": "user", "content": "When should I use RSI vs MACD?"}
  ],
  "stream": false
}'

# Streaming response
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1",
  "prompt": "Explain ERC-20 tokens",
  "stream": true
}'

# Embeddings
curl http://localhost:11434/api/embeddings -d '{
  "model": "llama3.1",
  "prompt": "AegisForge trading signal"
}'
```

### PowerShell API Usage

```powershell
# Health check
Invoke-RestMethod http://localhost:11434

# Generate
$body = @{
    model = "llama3.1"
    prompt = "What is proof of authority?"
    stream = $false
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method POST -Body $body -ContentType "application/json"

# Chat
$body = @{
    model = "llama3.1"
    messages = @(
        @{ role = "system"; content = "You are a helpful assistant." }
        @{ role = "user"; content = "Explain gas fees" }
    )
    stream = $false
} | ConvertTo-Json -Depth 5
$response = Invoke-RestMethod -Uri "http://localhost:11434/api/chat" -Method POST -Body $body -ContentType "application/json"
$response.message.content
```

### Python API Usage

```python
import requests

# Generate
response = requests.post("http://localhost:11434/api/generate", json={
    "model": "llama3.1",
    "prompt": "What is a smart contract?",
    "stream": False
})
print(response.json()["response"])

# Chat
response = requests.post("http://localhost:11434/api/chat", json={
    "model": "llama3.1",
    "messages": [
        {"role": "user", "content": "Explain DeFi"}
    ],
    "stream": False
})
print(response.json()["message"]["content"])

# Using ollama Python library
# pip install ollama
import ollama
response = ollama.chat(model="llama3.1", messages=[
    {"role": "user", "content": "What is yield farming?"}
])
print(response["message"]["content"])
```

---

## Custom Models (Modelfile)

```dockerfile
# Create a Modelfile
FROM llama3.1

# Set system prompt
SYSTEM """You are AegisForge's trading AI. You analyze crypto markets
and provide trading signals based on technical analysis. Be concise
and data-driven."""

# Set parameters
PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER num_ctx 4096
PARAMETER stop "<|end|>"
```

```bash
# Build custom model
ollama create aegis-trader -f Modelfile

# Use it
ollama run aegis-trader "Analyze BTC/USD RSI divergence"

# Push to registry (if you have an account)
ollama push username/aegis-trader
```

---

## Parameters Reference

| Parameter | Default | Description |
|---|---|---|
| `temperature` | 0.8 | Creativity (0=deterministic, 2=very creative) |
| `top_p` | 0.9 | Nucleus sampling threshold |
| `top_k` | 40 | Limit token pool size |
| `num_ctx` | 2048 | Context window size (tokens) |
| `num_predict` | 128 | Max tokens to generate (-1 = infinite) |
| `repeat_penalty` | 1.1 | Penalize repetition |
| `seed` | 0 | Random seed (0 = random, set for reproducible output) |

---

## Service Management

```powershell
# Check if running
Invoke-RestMethod http://localhost:11434  # "Ollama is running"

# Start (if not running)
ollama serve                               # Start server in foreground

# On Windows, Ollama usually runs as a tray app or service
# Started automatically when you launch Ollama app

# Environment variables
$env:OLLAMA_HOST = "0.0.0.0:11434"        # Listen on all interfaces
$env:OLLAMA_MODELS = "D:\Ollama\models"   # Custom model directory (already set)
$env:OLLAMA_KEEP_ALIVE = "5m"             # Keep model in memory (default)
$env:OLLAMA_NUM_PARALLEL = "2"            # Parallel requests
```

---

## AegisForge Integration

```
Architecture:
  Ollama (port 11434)
    ↑
  Logos daemon (port 7788) — logos-core.ps1 talks to Ollama
    ↑
  talk_to_him.py (port 9100) — chat client
    ↑
  bot-home (port 8080) — receives chat via HTTP
```

```bash
# Verify the chain
curl http://localhost:11434              # Ollama running?
curl http://localhost:7788/health        # Logos daemon running?
curl http://localhost:8080/health        # Bot-home running?
```
