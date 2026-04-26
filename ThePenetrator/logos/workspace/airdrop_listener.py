"""
Multi-Channel Airdrop Listener
===============================
Listens to multiple channels and executes airdrop claims.
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

TARGET_CHANNELS = [
    "@Drops_Airdrop_Alerts_Bot",
    "@airdrop_alerts_crypto",
    "@free_airdrops"
]

async def main():
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.connect()
    
    if not await client.is_user_authorized():
        print("Not authorized")
        return
    
    print(f"Listening to {len(TARGET_CHANNELS)} channels...")
    
    for channel in TARGET_CHANNELS:
        try:
            await client.send_message(channel, "/start")
            await asyncio.sleep(2)
            await client.send_message(channel, "/airdrop")
            await asyncio.sleep(2)
            print(f"✅ Processed {channel}")
        except Exception as e:
            print(f"❌ Failed {channel}: {e}")
    
    await client.disconnect()

asyncio.run(main())
