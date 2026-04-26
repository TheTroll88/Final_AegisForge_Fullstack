# Python — Cheat Sheet

> **Primary:** `C:\Program Files\Python39\python.exe` (3.9.7, on PATH)  
> **Also installed:** 3.10.11, 3.11.9, 3.13.7, 3.14.3  
> **Version selector:** `py -3.X` (e.g., `py -3.11 script.py`)  
> **Type:** Interpreted language runtime + package ecosystem  
> **AegisForge Role:** Trading engine, keymint auth, bot-home server, AI inference, OCR pipeline

---

## Version Management

```powershell
# The py launcher selects Python versions
py -3.9 script.py                          # Run with Python 3.9
py -3.11 script.py                         # Run with Python 3.11
py -3.14 script.py                         # Run with Python 3.14 (newest)
py --list                                  # List all installed versions
py -0p                                     # List with full paths
python --version                           # Whatever's first on PATH (3.9)

# Installed versions and paths:
# 3.9.7   → C:\Program Files\Python39\python.exe (on PATH)
# 3.10.11 → C:\Users\natha\AppData\Local\Programs\Python\Python310\python.exe
# 3.11.9  → C:\Users\natha\AppData\Local\Programs\Python\Python311\python.exe
# 3.13.7  → C:\Python313\python.exe
# 3.14.3  → C:\Users\natha\AppData\Local\Python\pythoncore-3.14-64\python.exe
```

---

## pip (Package Manager)

```powershell
# Install packages
pip install requests                       # Install latest
pip install requests==2.31.0              # Specific version
pip install -r requirements.txt           # From requirements file
pip install -e .                           # Install current project (editable/dev mode)
pip install --upgrade pip                  # Update pip itself
pip install --user package                # Install for current user only

# Using specific Python version's pip
py -3.11 -m pip install flask             # Install flask for Python 3.11

# Manage packages
pip uninstall requests                     # Remove package
pip list                                   # Installed packages
pip list --outdated                        # Packages with updates available
pip show flask                             # Package details
pip freeze > requirements.txt             # Export installed packages

# Cache
pip cache purge                            # Clear download cache

# Trusted hosts (for corporate networks)
pip install --trusted-host pypi.org --trusted-host pypi.python.org package
```

---

## Virtual Environments

```powershell
# Create virtual environment
python -m venv .venv                       # Create .venv directory
py -3.11 -m venv .venv                    # Using specific Python version

# Activate (PowerShell)
.\.venv\Scripts\Activate.ps1               # Prompt changes to (.venv)

# Activate (CMD)
.\.venv\Scripts\activate.bat

# Activate (Git Bash)
source .venv/Scripts/activate

# Deactivate
deactivate                                 # Return to system Python

# Why use venvs?
# - Isolate project dependencies
# - Avoid version conflicts between projects
# - Each project gets its own package set
```

---

## Running Code

```powershell
# Run scripts
python script.py                           # Run file
python -c "print('hello')"                # Inline code
python -m http.server 8000                # Run module as script
python -m json.tool < data.json           # Pretty-print JSON
python -i script.py                        # Run then drop into REPL

# Interactive REPL
python                                     # Start REPL
>>> exit() or Ctrl+Z then Enter           # Exit REPL

# Common -m modules
python -m venv .venv                       # Virtual environment
python -m pip install package              # Pip (guaranteed correct)
python -m pytest                           # Test runner
python -m http.server 8000                # Quick HTTP server
python -m json.tool file.json             # JSON formatter
python -m pdb script.py                   # Debugger
python -m timeit "sum(range(1000))"       # Benchmark
python -m ensurepip --upgrade             # Fix/install pip
python -m site --user-site                # User packages directory
```

---

## Key Libraries for AegisForge

```python
# Web / API
import flask                    # Flask web framework (Logos web app)
import fastapi                  # FastAPI (trading engine)
import requests                 # HTTP client
import aiohttp                  # Async HTTP
import uvicorn                  # ASGI server

# Finance / Crypto
import ccxt                     # Crypto exchange API (100+ exchanges)
import web3                     # Ethereum/EVM interaction
import solana                   # Solana SDK
import pandas                   # Data analysis
import numpy                    # Numerical computing
import ta                       # Technical analysis indicators

# AI / ML
import ollama                   # Ollama Python client
import transformers             # Hugging Face models
import torch                    # PyTorch

# System / Security
import hmac                     # HMAC signing (keymint)
import hashlib                  # Hashing
import cryptography             # Encryption
import subprocess               # Run shell commands
import asyncio                  # Async programming
import os, sys, pathlib         # System operations

# Data
import json                     # JSON handling
import sqlite3                  # SQLite database
import psycopg2                 # PostgreSQL client
import redis                    # Redis client
```

---

## Common Patterns

```python
# HTTP API call
import requests
r = requests.get("http://localhost:11434/api/tags")
data = r.json()

# Async HTTP
import aiohttp, asyncio
async def fetch(url):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            return await resp.json()

# File I/O
from pathlib import Path
content = Path("config.json").read_text()
import json
config = json.loads(content)
Path("output.json").write_text(json.dumps(config, indent=2))

# Environment variables
import os
api_key = os.environ.get("API_KEY", "default_value")

# Subprocess
import subprocess
result = subprocess.run(["git", "status"], capture_output=True, text=True)
print(result.stdout)

# HMAC signing (keymint pattern)
import hmac, hashlib
sig = hmac.new(b"secret", b"message", hashlib.sha256).hexdigest()
```

---

## Debugging

```python
# Quick debug
print(f"DEBUG: {variable=}")              # f-string with = (Python 3.8+)

# Breakpoint (built-in debugger)
breakpoint()                               # Drops into pdb at this line
# pdb commands: n(ext), s(tep), c(ontinue), p(rint), q(uit), l(ist)

# Better debugger
pip install ipdb                           # Enhanced debugger
import ipdb; ipdb.set_trace()

# Logging (better than print)
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
logger.debug("Debug message")
logger.info("Info message")
logger.error("Error message")
```

---

## Testing

```powershell
# pytest (recommended)
pip install pytest
python -m pytest                           # Run all tests
python -m pytest test_file.py              # Run specific file
python -m pytest -v                        # Verbose output
python -m pytest -x                        # Stop on first failure
python -m pytest -k "test_keymint"         # Run tests matching name
python -m pytest --tb=short                # Short tracebacks

# unittest (built-in)
python -m unittest discover                # Discover and run all tests
python -m unittest test_module             # Run specific module
```

---

## Useful One-Liners

```powershell
# Quick HTTP server
python -m http.server 8000

# Pretty print JSON
cat data.json | python -m json.tool

# Base64 encode/decode
python -c "import base64; print(base64.b64encode(b'hello').decode())"
python -c "import base64; print(base64.b64decode('aGVsbG8=').decode())"

# Generate secure random token
python -c "import secrets; print(secrets.token_hex(32))"

# Check if port is open
python -c "import socket; s=socket.socket(); s.settimeout(1); print('open' if s.connect_ex(('localhost',8080))==0 else 'closed'); s.close()"

# List all installed packages with versions
pip list --format=columns

# Find where a package is installed
python -c "import flask; print(flask.__file__)"

# Profile a script
python -m cProfile script.py
python -m cProfile -s cumulative script.py  # Sort by cumulative time
```
