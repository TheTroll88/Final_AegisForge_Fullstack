"""
Telegram Casino Farming Pipeline
================================
Automates daily bonuses and farming on Telegram casinos.
"""
import asyncio
from telethon.sync import TelegramClient
import os
import json

# Config
API_ID = 7568633306
API_HASH = ""
TELEGRAM_CONFIG_PATH = os.path.expanduser("~/.logos/telegram/config.json")
if os.path.exists(TELEGRAM_CONFIG_PATH):
    with open(TELEGRAM_CONFIG_PATH, "r") as f:
        tg_config = json.load(f)
    API_ID = int(tg_config.get("api_id", 7568633306))
    API_HASH = tg_config.get("api_hash", "")
SESSION_NAME = "logos.session"

CASINOS = [
    {"name": "Mcluck", "username": "@MCLUCKcasino"},
    {"name": "Chumba", "username": "@ChumbaCasino"},
    {"name": "PlayFame", "username": "@PlayFameOfficial"},
    {"name": "Lucky777", "username": "@Lucky777sweepstakes"}
]

async def main():
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.connect()
    
    if not await client.is_user_authorized():
        print("Not authorized")
        return
    
    print(f"Starting Casino Farming on {len(CASINOS)} accounts...")
    
    for casino in CASINOS:
        try:
            # Navigate to bot
            await client.send_message(casino["username"], "/start")
            await asyncio.sleep(2)
            
            # Claim daily bonus
            await client.send_message(casino["username"], "daily")
            await asyncio.sleep(2)
            
            # Claim free spins
            await client.send_message(casino["username"], "free")
            await asyncio.sleep(2)
            
            print(f"✅ Processed {casino['name']}")
        except Exception as e:
            print(f"❌ Failed {casino['name']}: {e}")
    
    await client.disconnect()

asyncio.run(main())
