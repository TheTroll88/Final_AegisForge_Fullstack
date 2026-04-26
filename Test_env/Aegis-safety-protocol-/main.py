import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from strategy_loader import load_strategy

market_data = {
    "trend": "up",
    "volume": 1200000,
    "price": 30250.45,
    "prices": [30200, 30210, 30230, 30240, 30250, 30245, 30260, 30270, 30280, 30290,
               30300, 30310, 30320, 30330, 30340, 30350, 30360, 30370, 30380, 30390],
    "rsi": 72,
    "upper_band": 31000,
    "lower_band": 29000,
    "macd": 1.2,
    "signal": 0.8,
    "avg_volume": 500000,
    "resistance": 30500,
    "support": 30000
}


# Define test scenarios for each strategy
test_data = {
    "momentum": {"trend": "up"},
    "moving_average": {"prices": [30000, 30200, 30100, 30500, 30800] * 4},
    "rsi": {"rsi": 75},
    "bollinger": {"price": 28000, "upper_band": 29500, "lower_band": 27500},
    "macd": {"macd": 1.5, "signal": 1.0},
    "volume_spike": {"volume": 5000000, "avg_volume": 2000000},
    "breakout": {"price": 31000, "resistance": 30500, "support": 30000}
}

# Loop through all strategies and test
for strategy_name, market_data in test_data.items():
    strategy = load_strategy(strategy_name)
    decision = strategy(market_data)
    print(f"[{strategy_name.upper()}] Decision: {decision}")
