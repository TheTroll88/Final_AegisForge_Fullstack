"""
Claim All Bonuses
==================
Opens accounts and claims welcome bonuses.
"""
import webbrowser
import time

accounts = [
    ("Coinbase", "https://coinbase.com/"),
    ("Kraken", "https://kraken.com/"),
    ("Robinhood", "https://robinearth.com/"),
    ("Chumba", "https://chumba.com/"),
    ("Mcluck", "https://mcluck.com/"),
    ("PlayFame", "https://www.playfame.com/"),
    ("Lucky777", "https://lucky777sweepstakes.com/"),
    ("LuckyLand", "https://luckyland.com/"),
    ("Fortune Coins", "https://fortunecoins.com/"),
    ("Panda Gold", "https://www.pandagold.com/")
]

print(f"Starting Claim Pipeline for {len(accounts)} accounts...")
for name, url in accounts:
    print(f"Opening {name}...")
    webbrowser.open(url)
    time.sleep(5)

print("Pipeline complete.")
