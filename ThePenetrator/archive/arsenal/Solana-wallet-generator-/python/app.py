import os
import time
import requests
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)

# Allow only specific domains
CORS(app, origins=[
    "https://solanawalletgenerator.netlify.app",
    "http://localhost:3000"
])

COINS_URL = "https://api.coingecko.com/api/v3/coins/markets"
GLOBAL_URL = "https://api.coingecko.com/api/v3/global"
CACHE = {"data": None, "timestamp": 0}
CACHE_DURATION = 60

@app.route('/')
def home():
    return jsonify({"message": "Welcome to the Crypto API"})

@app.route('/crypto-data')
def get_crypto_data():
    global CACHE

    if time.time() - CACHE["timestamp"] < CACHE_DURATION and CACHE["data"]:
        return jsonify(CACHE["data"])

    try:
        global_resp = requests.get(GLOBAL_URL).json()
        total_market_cap = global_resp["data"]["total_market_cap"]["usd"]

        params = {
            "vs_currency": "usd",
            "order": "market_cap_desc",
            "per_page": 250,
            "page": 1,
            "sparkline": False
        }
        coins_resp = requests.get(COINS_URL, params=params)
        coins = coins_resp.json()

        filtered_data = {
            coin["id"]: {
                "price": coin.get("current_price"),
                "market_cap": coin.get("market_cap"),
                "24h_volume": coin.get("total_volume"),
                "circulating_supply": coin.get("circulating_supply"),
                "total_supply": coin.get("total_supply"),
                "ath": coin.get("ath"),
                "24h_change": coin.get("price_change_percentage_24h"),
                "atl": coin.get("atl"),
                "market_dominance": round((coin["market_cap"] / total_market_cap) * 100, 4) if coin.get("market_cap") else None,
                "market_rank": coin.get("market_cap_rank")
            }
            for coin in coins
        }

        CACHE["data"] = filtered_data
        CACHE["timestamp"] = time.time()

        return jsonify(filtered_data)

    except Exception as e:
        return jsonify({"error": "Failed to fetch data", "details": str(e)})

if __name__ == '__main__':
    app.run(debug=True)
