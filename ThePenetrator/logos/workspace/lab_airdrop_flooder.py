"""
LAB Terminal Airdrop Flooder — Prototype
========================================
Custom bot to automate LAB Terminal interactions.
Starts 1 account, authenticates, claims airdrop, and saves logs.
"""
import asyncio
import json
import time
import os
from datetime import datetime
from telethon.sync import TelegramClient

# --- CONFIG ---
TARGET_BOT = "@LAB_Trading_bot"
MASTER_WALLET = "0x36A9D523d70AE8b47898bc9B148B929370C3693F"
LOG_FILE = "logos/workspace/lab_flooder_log.txt"

# Load credentials from Telethon config
TELEGRAM_CONFIG_PATH = os.path.expanduser("~/.logos/telegram/config.json")
if os.path.exists(TELEGRAM_CONFIG_PATH):
    with open(TELEGRAM_CONFIG_PATH, "r") as f:
        tg_config = json.load(f)
    API_ID = int(tg_config.get("api_id", 7568633306))
    API_HASH = tg_config.get("api_hash", "")
    SESSION_NAME = "logos.session"
else:
    API_ID = 7568633306
    API_HASH = ""
    SESSION_NAME = "logos.session"

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")
    with open(LOG_FILE, "a") as f:
        f.write(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {msg}\n")

async def main():
    if not API_ID or not API_HASH:
        log("Error: Telegram API credentials not found.")
        return

    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    
    try:
        await client.connect()
        
        if not await client.is_user_authorized():
            log("Not authorized. Please run manual auth.")
            return
        else:
            log("Already authorized.")
            
        # --- STEP 1: AUTHENTICATE WITH BOT ---
        log("Sending /start to LAB Terminal...")
        await client.send_message(TARGET_BOT, "/start")
        
        # Wait for response, retrying up to 5 times
        for i in range(5):
            response = await client.get_messages(TARGET_BOT, limit=1)
            if response and len(response) > 0 and response[0].text:
                log(f"Bot Response: {response[0].text[:100]}...")
                break
            log(f"Waiting for bot response... ({i+1}/5)")
            await asyncio.sleep(2)
        else:
            log("No response received after retries.")
            return

        # Check for Auth Code
        if response and response[0].text and "Your auth code" in response[0].text:
            try:
                code = response[0].text.split("`")[1]
                log(f"Extracted Code: {code}")
                await client.send_message(TARGET_BOT, code)
                log("Auth code sent.")
                time.sleep(2)
            except IndexError:
                log("Could not extract code from response format.")
        
        # --- STEP 2: CLAIM AIRDROP ---
        log("Attempting to claim airdrop...")
        await client.send_message(TARGET_BOT, "/airdrop")
        
        # --- STEP 3: CHECK BALANCE ---
        await client.send_message(TARGET_BOT, "/balance")
        
        log("Pipeline complete. Check log file for results.")
        
    except Exception as e:
        log(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
