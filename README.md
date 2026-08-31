# USD FUND FLOW ANNUAL MAP

Macro research and planning system combining Economic Calendar + USD Liquidity + Treasury Flow + Cross-Asset Analysis

## 🎯 Purpose

This is a **research and planning tool** - NOT a trading bot.
- Track major economic events
- Monitor USD liquidity regimes
- Analyze Treasury flows
- Forecast cross-asset impacts (BTC, Gold, SPX, NASDAQ, Bonds)
- Historical event impact analysis

## 🏗️ Architecture

```
USD FUND FLOW AI
    |
    +-- FED LIQUIDITY (RRP, TGA, Fed BS, QT/QE)
    +-- TREASURY (Issuance, Auctions, Buybacks)
    +-- BANKING (Reserves, Deposits, Credit)
    |
    v
USD LIQUIDITY SCORE (-100 to +100)
    |
    v
CROSS ASSET IMPACT
    |
    +-- BTC
    +-- GOLD
    +-- SPX
    +-- NASDAQ
    +-- BONDS
```

## 🚀 Quick Start

```bash
# Copy environment file
cp .env.example .env

# Edit .env and add API keys (optional - will use mock data if not provided)
# FRED_API_KEY=your_key_here

# Start all services
docker compose up -d

# Access dashboard
open http://localhost:3000
```

## 📊 Features (Phase 1 MVP)

- [x] Annual timeline view
- [x] Monthly timeline view
- [x] Event detail pages
- [x] FRED data integration
- [x] Treasury data integration
- [x] Basic liquidity score
- [x] Cross-asset dashboard
- [x] Historical event impact
- [x] Event importance scoring
- [x] Mock data fallback

## 🔧 Tech Stack

**Backend:**
- Python 3.12+
- FastAPI
- SQLAlchemy
- PostgreSQL
- Redis

**Frontend:**
- Next.js 14
- TypeScript
- Tailwind CSS
- Recharts / TradingView Lightweight Charts

## 📁 Project Structure

```
usd-fund-flow-ai/
├── backend/          # FastAPI application
│   ├── api/          # API routes
│   ├── models/       # SQLAlchemy models
│   ├── services/     # Business logic
│   ├── providers/    # Data providers (FRED, Treasury, etc.)
│   ├── engines/      # Liquidity, USD regime, cross-asset engines
│   └── jobs/         # Scheduled tasks
├── frontend/         # Next.js application
│   ├── components/   # React components
│   ├── pages/        # Page routes
│   └── lib/          # Utilities
├── config/           # Configuration files
├── database/         # Migrations and seeds
├── docker/           # Docker configurations
└── tests/            # Test suites
```

## 🗄️ Database Schema

**Core Tables:**
- `events` - Economic calendar events
- `event_releases` - Actual vs forecast vs previous
- `economic_series` - Time series data (FRED, etc.)
- `liquidity_metrics` - USD liquidity calculations
- `treasury_flows` - Treasury operations
- `market_prices` - Cross-asset prices
- `event_impacts` - Historical event reactions
- `regime_snapshots` - Liquidity/USD regime history

## 🔑 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@db:5432/usd_fund_flow

# Redis
REDIS_URL=redis://redis:6379/0

# Data Providers (optional - will use mock data if not provided)
FRED_API_KEY=
TREASURY_API_KEY=

# AI Provider (optional)
OPENROUTER_API_KEY=
ANTHROPIC_API_KEY=

# Mode
MOCK_MODE=false  # Set to true to force mock data
```

## 📅 Event Importance Scale

- 🔴 10 = EXTREME (FOMC, Major CPI surprises)
- 🟠 8-9 = VERY HIGH (CPI, NFP, PCE)
- 🟡 6-7 = HIGH (FOMC Minutes, GDP)
- 🟢 4-5 = MEDIUM (ISM, Retail Sales)
- 🔵 1-3 = LOW (Weekly claims)

## 💧 Liquidity Score

Range: -100 to +100

**Components:**
- TGA change
- RRP change
- Fed Balance Sheet change
- Bank reserves change
- Treasury net flow
- M2 trend

**Regimes:**
- +60 to +100: STRONGLY EXPANDING
- +20 to +59: EXPANDING
- -19 to +19: NEUTRAL
- -20 to -59: CONTRACTING
- -60 to -100: STRONGLY CONTRACTING

## 🧪 Testing

```bash
# Run all tests
docker compose exec backend pytest

# Run specific test
docker compose exec backend pytest tests/test_liquidity_engine.py

# Run with coverage
docker compose exec backend pytest --cov=backend tests/
```

## 📝 Development

```bash
# Backend development
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend development
cd frontend
npm install
npm run dev
```

## ⚠️ Important Notes

1. **NO FAKE DATA**: All numerical data comes from real APIs or clearly marked mock data
2. **Point-in-time Safety**: Historical analysis uses only data available at that time
3. **Provider Abstraction**: Easy to swap data sources
4. **API Failure Handling**: System continues with cached/mock data if APIs fail
5. **Configuration Driven**: Liquidity weights, event rules, and asset sensitivity in YAML files

## 🚧 Current Limitations

**Phase 1 MVP - Implemented:**
- Basic event calendar
- FRED data integration
- Treasury data tracking
- Simple liquidity score
- Cross-asset dashboard

**Phase 2 - Not Yet Implemented:**
- Historical event impact calculations
- Pre/post event analysis
- Detailed cross-asset correlations

**Phase 3 - Not Yet Implemented:**
- AI Research Agent
- Scenario analysis
- Historical analogues
- Alert system

**Phase 4 - Not Yet Implemented:**
- Hermes integration
- Telegram bot
- Automated reports
- Obsidian vault export

## 📚 API Endpoints

```
GET  /api/events              # List events
GET  /api/events/{id}         # Event detail
GET  /api/timeline/annual     # Annual view
GET  /api/timeline/monthly    # Monthly view
GET  /api/liquidity/current   # Current liquidity score
GET  /api/liquidity/history   # Historical liquidity
GET  /api/cross-asset         # Cross-asset dashboard
GET  /api/regime              # Current USD regime
```

## 🤝 Contributing

This is a research tool. Contributions welcome for:
- Additional data providers
- Improved liquidity models
- Better event impact calculations
- UI/UX improvements

## 📄 License

MIT

## 🎓 Data Sources

- FRED (Federal Reserve Economic Data)
- U.S. Treasury Fiscal Data
- Federal Reserve
- NY Fed
- Market data providers

---

**Built for macro research and market planning**
