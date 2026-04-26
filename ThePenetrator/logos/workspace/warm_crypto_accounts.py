"""
Crypto Account Warming Pipeline
================================
Opens crypto accounts to increase on-chain activity and airdrop eligibility.
"""
import webbrowser
import time

def open_account(url, name):
    """Opens URL in default browser."""
    print(f"[{name}] Opening...")
    webbrowser.open(url)
    time.sleep(3)

def main():
    print("Starting Crypto Account Warming...")
    
    # Major Exchanges
    open_account("https://coinbase.com/", "Coinbase")
    open_account("https://kraken.com/", "Kraken")
    open_account("https://robinearth.com/", "Robinhood")
    open_account("https://www.binance.us/", "Binance US")
    open_account("https://www.gemini.com/", "Gemini")
    
    # DeFi Protocols
    open_account("https://app.uniswap.org/", "Uniswap")
    open_account("https://app.sushi.com/", "SushiSwap")
    open_account("https://app.pancakeswap.finance/", "PancakeSwap")
    open_account("https://app.1inch.io/", "1inch")
    open_account("https://app.zerion.io/", "Zerion")
    open_account("https://app.paradigm.xyz/", "Paradigm")
    
    # L2s & Rollups
    open_account("https://app.zora.ethereum.org/", "Zora")
    open_account("https://app.arbitrum.io/", "Arbitrum")
    open_account("https://app.optimism.io/", "Optimism")
    open_account("https://app.base.org/", "Base")
    open_account("https://app.polygon.technology/", "Polygon")
    
    print("Warming complete. Wait for page loads.")

if __name__ == "__main__":
    main()
