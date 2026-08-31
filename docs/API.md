# API Reference

Base URL: `http://localhost:8000`

## Authentication

No authentication required for Phase 1 MVP.

## Events API

### Get Events

```http
GET /api/events
```

**Query Parameters:**
- `start_date` (datetime, optional): Filter events from this date
- `end_date` (datetime, optional): Filter events until this date
- `category` (string, optional): Filter by category (FED, INFLATION, EMPLOYMENT, etc.)
- `min_importance` (int, optional): Minimum importance (1-10)
- `limit` (int, optional): Max results (default: 100, max: 1000)

**Response:**
```json
[
  {
    "id": 1,
    "event_name": "Consumer Price Index (CPI)",
    "event_key": "CPI",
    "category": "INFLATION",
    "country": "US",
    "currency": "USD",
    "release_datetime_utc": "2027-01-13T08:30:00Z",
    "importance": 10,
    "forecast": 2.8,
    "previous": 2.9,
    "actual": null,
    "unit": "%",
    "status": "SCHEDULED",
    "created_at": "2027-01-01T00:00:00Z"
  }
]
```

### Get Event Detail

```http
GET /api/events/{event_id}
```

**Response:**
```json
{
  "id": 1,
  "event_name": "CPI",
  "category": "INFLATION",
  "importance": 10,
  "releases": [],
  "impacts": [],
  "ai_summary": "Historical CPI surprises tend to create significant volatility..."
}
```

### Get Upcoming Events

```http
GET /api/events/upcoming
```

**Query Parameters:**
- `days` (int, optional): Days to look ahead (default: 30, max: 365)
- `min_importance` (int, optional): Minimum importance (default: 6)

## Timeline API

### Get Annual Timeline

```http
GET /api/timeline/annual?year=2027
```

**Response:**
```json
{
  "year": 2027,
  "months": [
    {
      "month": 1,
      "month_name": "January",
      "event_count": 15,
      "extreme_events": 3,
      "high_events": 5,
      "events": [...]
    }
  ]
}
```

### Get Monthly Timeline

```http
GET /api/timeline/monthly?year=2027&month=1
```

**Response:**
```json
{
  "year": 2027,
  "month": 1,
  "events": [...],
  "liquidity_summary": null
}
```

## Liquidity API

### Get Current Liquidity

```http
GET /api/liquidity/current
```

**Response:**
```json
{
  "date": "2027-01-15T00:00:00Z",
  "liquidity_score": 35.2,
  "regime": "EXPANDING",
  "regime_confidence": 75.5,
  "components": {
    "tga": -15.3,
    "rrp": -22.1,
    "fed_bs": 45.2,
    "reserves": 18.7,
    "m2": 8.7
  }
}
```

### Get Liquidity History

```http
GET /api/liquidity/history?days=90
```

**Response:**
```json
{
  "data": [
    {
      "date": "2027-01-01T00:00:00Z",
      "liquidity_score": 32.5,
      "regime": "EXPANDING"
    }
  ]
}
```

## Cross-Asset API

### Get Cross-Asset Summary

```http
GET /api/cross-asset
```

**Response:**
```json
[
  {
    "asset": "BTC",
    "current_price": 65000,
    "change_24h": 1200,
    "change_pct_24h": 1.88,
    "liquidity_sensitivity": "VERY_HIGH",
    "usd_sensitivity": "HIGH",
    "regime_bias": "BULLISH"
  }
]
```

## Regime API

### Get Current Regime

```http
GET /api/regime
```

**Response:**
```json
{
  "liquidity_regime": "EXPANDING",
  "liquidity_score": 35.2,
  "usd_regime": "NEUTRAL_USD",
  "usd_confidence": 60.0,
  "rates_direction": "NEUTRAL",
  "credit_condition": "STABLE",
  "timestamp": "2027-01-15T00:00:00Z"
}
```

## Event Categories

- `FED` - Federal Reserve events (FOMC, speeches)
- `INFLATION` - Inflation data (CPI, PCE, PPI)
- `EMPLOYMENT` - Employment data (NFP, unemployment)
- `TREASURY` - Treasury operations (auctions, refunding)
- `GDP` - Growth data (GDP, retail sales, ISM)
- `LIQUIDITY` - Liquidity events
- `CREDIT` - Credit market events
- `OTHER` - Other events

## Event Importance Scale

- `10` - EXTREME (FOMC decisions, major CPI surprises)
- `9` - VERY HIGH (CPI, NFP, PCE)
- `8` - HIGH (FOMC minutes, GDP)
- `6-7` - MEDIUM (ISM, retail sales)
- `4-5` - LOW (weekly claims)
- `1-3` - MINIMAL

## Liquidity Regimes

- `STRONGLY_EXPANDING` (60 to 100)
- `EXPANDING` (20 to 59)
- `NEUTRAL` (-19 to 19)
- `CONTRACTING` (-59 to -20)
- `STRONGLY_CONTRACTING` (-100 to -60)

## Error Responses

```json
{
  "detail": "Error message here"
}
```

**Status Codes:**
- `200` - Success
- `404` - Not found
- `422` - Validation error
- `500` - Server error

## Rate Limiting

No rate limiting in Phase 1 MVP.

## Data Sources

- FRED (Federal Reserve Economic Data)
- U.S. Treasury Fiscal Data API
- Mock data generator (fallback)

## Notes

- All timestamps are in UTC
- Dates can be provided in ISO 8601 format
- Mock mode indicator in logs if real APIs unavailable
- Historical data limited to past 90-365 days depending on endpoint
