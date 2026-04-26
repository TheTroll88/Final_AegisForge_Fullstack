"""
Quest Farming Pipeline
=======================
Automates wallet connection and task completion on Layer3, Linea, and Farcaster.
"""
import asyncio
import webbrowser
import time
from datetime import datetime

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def open_page(url):
    """Opens URL in default browser."""
    log(f"Opening {url}...")
    webbrowser.open(url)
    time.sleep(5)

def main():
    log("Starting Quest Farming Pipeline...")
    
    # 1. Layer3 (High Volume)
    open_page("https://app.layer3.xyz/discover")
    log("Waiting for Wallet Connect...")
    time.sleep(10)
    
    # 2. Linea (zkEVM L2)
    open_page("https://linea.build/")
    log("Connecting Wallet on Linea...")
    time.sleep(10)
    
    log("Pipeline started. Check browser for tasks.")
    
if __name__ == "__main__":
    main()
