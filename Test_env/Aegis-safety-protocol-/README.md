# Aegis

Autonomous crypto trading system with a React command center, Express backend, and modular Python strategy engine.

## What It Does

- **Dashboard**: Real-time React-based command center for monitoring trades, strategies, and system health
- **Strategy Engine**: 9 pluggable trading strategies (MACD, RSI, Bollinger Bands, momentum, scalping, mean reversion, breakout, moving average, volume spike)
- **Gatekeeper**: Entry filtering and risk management layer
- **Automation**: Strategy loader with test harness for validating signals before execution

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  React UI   │────▶│ Express API  │────▶│ Strategy Engine   │
│  (Frontend) │     │ (server.mjs) │     │ (Python modules)  │
└─────────────┘     └──────────────┘     └──────────────────┘
                                                  │
                                          ┌───────┴───────┐
                                          │  9 Strategies  │
                                          │  (pluggable)   │
                                          └───────────────┘
```

## Quick Start

```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Start server (port 8080)
npm start
```

Or use the PowerShell launcher:
```powershell
.\start-app.ps1
```

## Strategies

| Strategy | Signal Type | Description |
|----------|------------|-------------|
| MACD | Trend | Moving average convergence/divergence crossovers |
| RSI | Momentum | Relative strength index overbought/oversold signals |
| Bollinger | Volatility | Price band breakouts and mean reversion |
| Momentum | Trend | Rate of change and trend strength |
| Scalping | Short-term | Quick in/out on small price movements |
| Mean Reversion | Statistical | Price return to moving average |
| Breakout | Pattern | Support/resistance level breaks |
| Moving Average | Trend | Simple/exponential MA crossovers |
| Volume Spike | Volume | Unusual volume detection |

## Testing Strategies

```bash
python main.py
```

Runs the strategy test harness — loads all strategies, feeds test data, validates buy/sell/hold decisions.

## Tech Stack

- **Frontend**: React 18, Webpack 5, Babel
- **Backend**: Express 5 (Node.js)
- **Strategies**: Python 3.10+
- **Process Management**: Custom terminal manager (aegis_terminal.py)

## License

MIT
