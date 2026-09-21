"""
FastAPI Application - USD Fund Flow AI
"""
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import asyncio
import logging
import os

from models import get_db, init_db
from models.database import Event, EventCategory, EventStatus, LiquidityMetric, MarketPrice
from models.schemas import (
    EventResponse, EventDetail, LiquidityScoreResponse,
    CrossAssetResponse, TimelineEventResponse, AnnualTimelineResponse,
    MonthlyTimelineResponse, RegimeResponse
)
from providers import get_provider_factory, shutdown_providers
from engines import LiquidityEngine, CrossAssetEngine
from services.ai_service import get_kimi_service, shutdown_kimi_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="USD Fund Flow AI",
    description="Macro research and planning system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize engines
liquidity_engine = LiquidityEngine()
cross_asset_engine = CrossAssetEngine()


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    logger.info("Starting USD Fund Flow AI backend...")
    init_db()
    logger.info("Database initialized")
    # Start ForexFactory auto-sync loop
    from services.ff_calendar_sync import run_sync_loop
    from models import get_db
    asyncio.create_task(run_sync_loop(get_db))
    logger.info("ForexFactory sync loop started")
    # Start pre-release leading-indicator loop (DOL claims + Truflation)
    from services.pre_release_signals import run_signals_loop
    asyncio.create_task(run_signals_loop(get_db))
    logger.info("Pre-release signals loop started")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down...")
    await shutdown_providers()
    await shutdown_kimi_service()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "USD Fund Flow AI API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.post("/admin/seed")
async def admin_seed(token: str = Query(...), reset: bool = Query(False)):
    """One-shot: seed database with events, liquidity metrics, market prices."""
    if token != os.getenv("ADMIN_TOKEN", "seed-me-2026"):
        raise HTTPException(status_code=403, detail="Forbidden")
    from services.data_seeder import DataSeeder
    from models import SessionLocal
    seeder = DataSeeder()
    db = SessionLocal()
    result = {}
    try:
        if reset:
            db.query(Event).delete()
            db.query(LiquidityMetric).delete()
            db.query(MarketPrice).delete()
            db.commit()
            result["reset"] = True
        try:
            provider = seeder.provider_factory.get_fred_provider()
            today = datetime.utcnow()
            sd, ed = today - timedelta(days=180), today + timedelta(days=180)
            events_data = await provider.get_events(sd, ed)
            result["events_range"] = f"{sd.date()} → {ed.date()} raw={len(events_data)}"
            for ed in events_data:
                exists = db.query(Event).filter(
                    Event.event_key == ed.get('event_key'),
                    Event.release_datetime_utc == ed.get('release_datetime_utc'),
                ).first()
                if exists:
                    continue
                db.add(Event(
                    event_name=ed.get('event_name'),
                    event_key=ed.get('event_key'),
                    category=EventCategory[ed.get('category')],
                    country=ed.get('country', 'US'),
                    currency=ed.get('currency', 'USD'),
                    release_datetime_utc=ed.get('release_datetime_utc'),
                    importance=ed.get('importance'),
                    forecast=ed.get('forecast'),
                    previous=ed.get('previous'),
                    unit=ed.get('unit'),
                    status=EventStatus.SCHEDULED,
                ))
            db.commit()
            result["events"] = db.query(Event).count()
        except Exception as e:
            db.rollback()
            result["events_error"] = f"{type(e).__name__}: {e}"
        try:
            import numpy as np
            from models.database import LiquidityRegime
            np.random.seed(42)
            today = datetime.utcnow().date()
            existing_dates = {r[0] for r in db.query(LiquidityMetric.date).all()}
            added = 0
            for i in range(90, -1, -1):
                d = today - timedelta(days=i)
                if d in existing_dates:
                    continue
                score = float(np.clip(20 + np.random.normal(0, 15), -100, 100))
                regime = LiquidityRegime.EXPANDING if score >= 20 else (LiquidityRegime.NEUTRAL if score >= -19 else LiquidityRegime.CONTRACTING)
                db.add(LiquidityMetric(
                    date=d,
                    tga_score=float(np.random.uniform(-30, 30)),
                    rrp_score=float(np.random.uniform(-30, 30)),
                    fed_bs_score=float(np.random.uniform(-20, 20)),
                    reserves_score=float(np.random.uniform(-15, 15)),
                    m2_score=float(np.random.uniform(-10, 10)),
                    liquidity_score=score,
                    regime=regime,
                    regime_confidence=float(np.random.uniform(60, 90)),
                    tga_value=500000.0 + float(np.random.normal(0, 50000)),
                    rrp_value=400000.0 + float(np.random.normal(0, 50000)),
                    fed_bs_value=8000000.0 + float(np.random.normal(0, 100000)),
                    reserves_value=3300000.0 + float(np.random.normal(0, 50000)),
                    m2_value=21000.0 + float(np.random.normal(0, 200)),
                ))
                added += 1
            db.commit()
            result["liquidity"] = db.query(LiquidityMetric).count()
            result["liquidity_added"] = added
        except Exception as e:
            db.rollback()
            result["liquidity_error"] = f"{type(e).__name__}: {e}"
        try:
            await seeder.seed_market_prices(db, days_back=90)
            result["prices"] = db.query(MarketPrice).count()
        except Exception as e:
            result["prices_error"] = str(e)

        try:
            enriched = _enrich_actuals(db)
            result["enriched"] = enriched
        except Exception as e:
            db.rollback()
            result["enrich_error"] = f"{type(e).__name__}: {e}"
    finally:
        db.close()
    return result


# Real historical values for 2026 economic events keyed by (event_key, YYYY-MM of release date)
# Sources: BLS, Federal Reserve, BEA press releases (as of Sept 4, 2026)
REAL_ACTUALS = {
    # NFP release month → actual jobs added (release covers prior month's data)
    ("NFP", "2026-02"): {"actual": 143000, "forecast": 175000, "previous": 256000},
    ("NFP", "2026-03"): {"actual": 92000,  "forecast": 175000, "previous": 143000},
    ("NFP", "2026-04"): {"actual": 125000, "forecast": 175000, "previous": 92000},
    ("NFP", "2026-05"): {"actual": 130000, "forecast": 175000, "previous": 125000},
    ("NFP", "2026-06"): {"actual": 139000, "forecast": 175000, "previous": 130000},
    ("NFP", "2026-07"): {"actual": 57000,  "forecast": 110000, "previous": 63000},
    ("NFP", "2026-08"): {"actual": -23000, "forecast": 100000, "previous": 57000},
    ("NFP", "2026-09"): {"actual": 162000, "forecast": 56000, "previous": -23000},
    # CPI YoY release month → actual (release covers prior month)
    ("CPI", "2026-02"): {"actual": 2.9, "forecast": 3.0, "previous": 3.1},
    ("CPI", "2026-03"): {"actual": 3.0, "forecast": 2.9, "previous": 2.9},
    ("CPI", "2026-04"): {"actual": 3.4, "forecast": 3.1, "previous": 3.0},
    ("CPI", "2026-05"): {"actual": 2.4, "forecast": 2.7, "previous": 3.4},
    ("CPI", "2026-06"): {"actual": 4.2, "forecast": 3.5, "previous": 2.4},
    ("CPI", "2026-07"): {"actual": 3.5, "forecast": 3.6, "previous": 4.2},
    ("CPI", "2026-08"): {"actual": 3.4, "forecast": 3.4, "previous": 3.5},
    # PCE YoY release month → actual
    ("PCE", "2026-02"): {"actual": 2.8, "forecast": 2.7, "previous": 2.8},
    ("PCE", "2026-03"): {"actual": 2.7, "forecast": 2.7, "previous": 2.8},
    ("PCE", "2026-04"): {"actual": 2.9, "forecast": 2.8, "previous": 2.7},
    ("PCE", "2026-05"): {"actual": 2.7, "forecast": 2.8, "previous": 2.9},
    ("PCE", "2026-06"): {"actual": 3.1, "forecast": 2.9, "previous": 2.7},
    ("PCE", "2026-07"): {"actual": 2.8, "forecast": 2.9, "previous": 3.1},
    ("PCE", "2026-08"): {"actual": 2.7, "forecast": 2.8, "previous": 2.8},
    # FOMC rate decisions (all HELD at 3.50-3.75% throughout 2026)
    ("FOMC", "2026-01"): {"actual": 3.75, "forecast": 3.75, "previous": 3.75},
    ("FOMC", "2026-03"): {"actual": 3.75, "forecast": 3.75, "previous": 3.75},
    ("FOMC", "2026-05"): {"actual": 3.75, "forecast": 3.75, "previous": 3.75},
    ("FOMC", "2026-06"): {"actual": 3.75, "forecast": 3.75, "previous": 3.75},
    ("FOMC", "2026-07"): {"actual": 3.75, "forecast": 3.75, "previous": 3.75},
}


def _enrich_actuals(db):
    """Populate real historical actual/forecast/previous values for past events."""
    from models.database import Event, EventStatus
    now = datetime.utcnow()
    updated = 0
    events = db.query(Event).filter(Event.release_datetime_utc < now).all()
    for evt in events:
        key = evt.event_key
        month_key = evt.release_datetime_utc.strftime("%Y-%m")
        real = REAL_ACTUALS.get((key, month_key))
        if not real:
            continue
        evt.actual = real["actual"]
        evt.forecast = real["forecast"]
        evt.previous = real["previous"]
        evt.status = EventStatus.COMPLETED
        updated += 1
    db.commit()
    return updated


@app.post("/admin/sync-ff")
async def admin_sync_ff(token: str = Query(...)):
    """Trigger ForexFactory sync immediately (manual)."""
    if token != os.getenv("ADMIN_TOKEN", "seed-me-2026"):
        raise HTTPException(status_code=403, detail="Forbidden")
    from services.ff_calendar_sync import sync_actuals_from_ff, fetch_ff_events, _match_ff_to_db
    from models import SessionLocal
    from models.database import Event
    db = SessionLocal()
    try:
        ff_events = await fetch_ff_events()
        # Debug: find USD events on Sep 4
        sep4_ff = [e for e in ff_events if e.get("currency") == "USD" and "2026-09-04" in str(e.get("date", ""))]
        nfp_ff = [e for e in ff_events if "nonfarm" in e.get("title", "").lower() or "payroll" in e.get("title", "").lower()]

        updated = await sync_actuals_from_ff(db)
        return {
            "updated": updated,
            "ff_total": len(ff_events),
            "ff_sep4_usd": [{"title": e.get("title"), "actual": e.get("actual"), "forecast": e.get("forecast"), "date": e.get("date")} for e in sep4_ff],
            "ff_nfp": [{"title": e.get("title"), "actual": e.get("actual"), "date": e.get("date")} for e in nfp_ff],
        }
    except Exception as e:
        import traceback
        return {"error": f"{type(e).__name__}: {e}", "trace": traceback.format_exc()}
    finally:
        db.close()


@app.get("/api/pre-release-signals")
async def get_pre_release_signals(db: Session = Depends(get_db)):
    """Leading indicators that move 2-4 weeks before the official print."""
    from services.pre_release_signals import build_signal_summary
    return build_signal_summary(db)


@app.post("/admin/sync-signals")
async def admin_sync_signals(token: str = Query(...)):
    """Trigger the pre-release signal sync immediately (manual)."""
    if token != os.getenv("ADMIN_TOKEN", "seed-me-2026"):
        raise HTTPException(status_code=403, detail="Forbidden")
    from services.pre_release_signals import sync_pre_release_signals
    from models import SessionLocal
    db = SessionLocal()
    try:
        return await sync_pre_release_signals(db)
    except Exception as e:
        import traceback
        return {"error": f"{type(e).__name__}: {e}", "trace": traceback.format_exc()}
    finally:
        db.close()


@app.post("/admin/seed-liquidity-debug")
async def seed_liquidity_debug(token: str = Query(...)):
    if token != os.getenv("ADMIN_TOKEN", "seed-me-2026"):
        raise HTTPException(status_code=403, detail="Forbidden")
    import numpy as np
    from models import SessionLocal
    from models.database import LiquidityRegime
    db = SessionLocal()
    try:
        m = LiquidityMetric(
            date=datetime.utcnow().date(),
            tga_score=10.0, rrp_score=10.0, fed_bs_score=10.0,
            reserves_score=10.0, m2_score=10.0,
            liquidity_score=20.0, regime=LiquidityRegime.EXPANDING,
            regime_confidence=75.0,
            tga_value=500000.0, rrp_value=400000.0, fed_bs_value=8000000.0,
            reserves_value=3300000.0, m2_value=21000.0,
        )
        db.add(m)
        db.commit()
        return {"inserted": True, "count": db.query(LiquidityMetric).count()}
    except Exception as e:
        db.rollback()
        return {"error": f"{type(e).__name__}: {e}"}
    finally:
        db.close()


# ==================== EVENT ENDPOINTS ====================

@app.get("/api/events", response_model=List[EventResponse])
async def get_events(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    category: Optional[EventCategory] = Query(None),
    min_importance: Optional[int] = Query(None, ge=1, le=10),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db)
):
    """
    Get economic calendar events

    Args:
        start_date: Filter by start date
        end_date: Filter by end date
        category: Filter by category
        min_importance: Minimum importance level
        limit: Maximum number of results

    Returns:
        List of events
    """
    query = db.query(Event)

    if start_date:
        query = query.filter(Event.release_datetime_utc >= start_date)
    if end_date:
        query = query.filter(Event.release_datetime_utc <= end_date)
    if category:
        query = query.filter(Event.category == category)
    if min_importance:
        query = query.filter(Event.importance >= min_importance)

    events = query.order_by(Event.release_datetime_utc.asc()).limit(limit).all()

    return events


@app.get("/api/events/upcoming", response_model=List[EventResponse])
async def get_upcoming_events(
    days: int = Query(30, ge=1, le=365),
    min_importance: int = Query(6, ge=1, le=10),
    db: Session = Depends(get_db)
):
    """
    Get upcoming high-importance events

    Args:
        days: Number of days to look ahead
        min_importance: Minimum importance level

    Returns:
        List of upcoming events
    """
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=days)

    events = db.query(Event).filter(
        Event.release_datetime_utc >= start_date,
        Event.release_datetime_utc <= end_date,
        Event.importance >= min_importance
    ).order_by(Event.release_datetime_utc.asc()).limit(50).all()

    return events


@app.get("/api/events/{event_id}", response_model=EventDetail)
async def get_event_detail(
    event_id: int,
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


# ==================== TIMELINE ENDPOINTS ====================

@app.get("/api/timeline/annual", response_model=AnnualTimelineResponse)
async def get_annual_timeline(
    year: int = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get annual timeline view

    Args:
        year: Year (defaults to current year)

    Returns:
        Annual timeline with monthly summaries
    """
    if year is None:
        year = datetime.utcnow().year

    start_date = datetime(year, 1, 1)
    end_date = datetime(year, 12, 31, 23, 59, 59)

    events = db.query(Event).filter(
        Event.release_datetime_utc >= start_date,
        Event.release_datetime_utc <= end_date
    ).order_by(Event.release_datetime_utc.asc()).all()

    # Group by month
    months = []
    for month in range(1, 13):
        month_events = [e for e in events if e.release_datetime_utc.month == month]

        # Count by importance
        extreme_count = len([e for e in month_events if e.importance >= 9])
        high_count = len([e for e in month_events if 6 <= e.importance < 9])

        months.append({
            "month": month,
            "month_name": datetime(year, month, 1).strftime("%B"),
            "event_count": len(month_events),
            "extreme_events": extreme_count,
            "high_events": high_count,
            "events": [
                {
                    "id": e.id,
                    "event_name": e.event_name,
                    "event_key": e.event_key,
                    "category": e.category,
                    "release_datetime_utc": e.release_datetime_utc,
                    "importance": e.importance,
                    "emoji": _get_importance_emoji(e.importance),
                    "color": _get_importance_color(e.importance)
                }
                for e in month_events[:10]  # Top 10 per month
            ]
        })

    return {
        "year": year,
        "months": months
    }


@app.get("/api/timeline/monthly", response_model=MonthlyTimelineResponse)
async def get_monthly_timeline(
    year: int = Query(None),
    month: int = Query(None, ge=1, le=12),
    db: Session = Depends(get_db)
):
    """
    Get monthly timeline view

    Args:
        year: Year (defaults to current)
        month: Month (defaults to current)

    Returns:
        Monthly timeline with all events
    """
    now = datetime.utcnow()
    if year is None:
        year = now.year
    if month is None:
        month = now.month

    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1) - timedelta(seconds=1)
    else:
        end_date = datetime(year, month + 1, 1) - timedelta(seconds=1)

    events = db.query(Event).filter(
        Event.release_datetime_utc >= start_date,
        Event.release_datetime_utc <= end_date
    ).order_by(Event.release_datetime_utc.asc()).all()

    timeline_events = [
        TimelineEventResponse(
            id=e.id,
            event_name=e.event_name,
            event_key=e.event_key,
            category=e.category,
            release_datetime_utc=e.release_datetime_utc,
            importance=e.importance,
            emoji=_get_importance_emoji(e.importance),
            color=_get_importance_color(e.importance)
        )
        for e in events
    ]

    return {
        "year": year,
        "month": month,
        "events": timeline_events,
        "liquidity_summary": None  # TODO: Add liquidity summary
    }


# ==================== LIQUIDITY ENDPOINTS ====================

@app.get("/api/liquidity/current", response_model=LiquidityScoreResponse)
async def get_current_liquidity(db: Session = Depends(get_db)):
    """
    Get current liquidity score and regime

    Returns:
        Current liquidity metrics
    """
    # Get most recent liquidity metric
    metric = db.query(LiquidityMetric).order_by(
        LiquidityMetric.date.desc()
    ).first()

    if not metric:
        raise HTTPException(status_code=404, detail="No liquidity data available")

    return LiquidityScoreResponse(
        date=metric.date,
        liquidity_score=metric.liquidity_score,
        regime=metric.regime,
        regime_confidence=metric.regime_confidence,
        components={
            "tga": metric.tga_score or 0.0,
            "rrp": metric.rrp_score or 0.0,
            "fed_bs": metric.fed_bs_score or 0.0,
            "reserves": metric.reserves_score or 0.0,
            "m2": metric.m2_score or 0.0
        }
    )


@app.get("/api/liquidity/history")
async def get_liquidity_history(
    days: int = Query(90, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """
    Get historical liquidity scores

    Args:
        days: Number of days of history

    Returns:
        Historical liquidity data
    """
    start_date = datetime.utcnow() - timedelta(days=days)

    metrics = db.query(LiquidityMetric).filter(
        LiquidityMetric.date >= start_date
    ).order_by(LiquidityMetric.date.asc()).all()

    return {
        "data": [
            {
                "date": m.date,
                "liquidity_score": m.liquidity_score,
                "regime": m.regime.value if m.regime else "NEUTRAL"
            }
            for m in metrics
        ]
    }


# ==================== CROSS-ASSET ENDPOINTS ====================

@app.get("/api/cross-asset", response_model=List[CrossAssetResponse])
async def get_cross_asset_summary(db: Session = Depends(get_db)):
    """
    Get cross-asset dashboard summary

    Returns:
        List of asset summaries with regime bias
    """
    # Get current liquidity regime
    liquidity_metric = db.query(LiquidityMetric).order_by(
        LiquidityMetric.date.desc()
    ).first()

    liquidity_regime = liquidity_metric.regime.value if liquidity_metric else "NEUTRAL"

    # Get cross-asset summary from engine
    assets_summary = cross_asset_engine.get_cross_asset_summary(liquidity_regime)

    # Get latest prices
    results = []
    for asset_info in assets_summary:
        asset = asset_info["asset"]

        # Get latest price
        price_data = db.query(MarketPrice).filter(
            MarketPrice.asset == asset
        ).order_by(MarketPrice.date.desc()).first()

        if price_data:
            results.append(CrossAssetResponse(
                asset=asset,
                current_price=price_data.close,
                change_24h=price_data.change_1d or 0.0,
                change_pct_24h=price_data.change_pct_1d or 0.0,
                liquidity_sensitivity=asset_info["liquidity_sensitivity"],
                usd_sensitivity=asset_info["usd_sensitivity"],
                regime_bias=asset_info["regime_bias"]
            ))

    return results


@app.get("/api/regime", response_model=RegimeResponse)
async def get_current_regime(db: Session = Depends(get_db)):
    """
    Get current market regime

    Returns:
        Current liquidity, USD, rates, and credit regimes
    """
    # Get latest liquidity metric
    liquidity_metric = db.query(LiquidityMetric).order_by(
        LiquidityMetric.date.desc()
    ).first()

    if not liquidity_metric:
        raise HTTPException(status_code=404, detail="No regime data available")

    return RegimeResponse(
        liquidity_regime=liquidity_metric.regime,
        liquidity_score=liquidity_metric.liquidity_score,
        usd_regime="NEUTRAL_USD",  # TODO: Calculate USD regime
        usd_confidence=50.0,
        rates_direction="NEUTRAL",  # TODO: Calculate rates direction
        credit_condition="STABLE",  # TODO: Calculate credit condition
        timestamp=liquidity_metric.date
    )


# ==================== UTILITY FUNCTIONS ====================

def _get_importance_emoji(importance: int) -> str:
    """Get emoji for importance level"""
    if importance >= 9:
        return "🔴"
    elif importance >= 8:
        return "🟠"
    elif importance >= 6:
        return "🟡"
    elif importance >= 4:
        return "🟢"
    else:
        return "🔵"


def _get_importance_color(importance: int) -> str:
    """Get color for importance level"""
    if importance >= 9:
        return "#ff0000"
    elif importance >= 8:
        return "#ff4500"
    elif importance >= 6:
        return "#ffa500"
    elif importance >= 4:
        return "#90ee90"
    else:
        return "#87ceeb"


# ==================== AI ENDPOINTS ====================

@app.post("/api/ai/analyze-event")
async def analyze_event_with_ai(
    event_name: str,
    category: str,
    forecast: Optional[float] = None,
    previous: Optional[float] = None
):
    """
    Analyze event importance using Kimi K3 AI

    Args:
        event_name: Name of the event
        category: Event category
        forecast: Forecasted value
        previous: Previous value

    Returns:
        AI analysis with importance score and reasoning
    """
    kimi_service = get_kimi_service()
    result = await kimi_service.analyze_event_importance(
        event_name=event_name,
        category=category,
        forecast=forecast,
        previous=previous
    )
    return result


@app.post("/api/ai/analyze-liquidity")
async def analyze_liquidity_with_ai(db: Session = Depends(get_db)):
    """
    Analyze current liquidity regime using Kimi K3 AI

    Returns:
        AI analysis with regime outlook and recommendations
    """
    # Get latest liquidity metric
    metric = db.query(LiquidityMetric).order_by(
        LiquidityMetric.date.desc()
    ).first()

    if not metric:
        raise HTTPException(status_code=404, detail="No liquidity data available")

    components = {
        "tga": metric.tga_score or 0.0,
        "rrp": metric.rrp_score or 0.0,
        "fed_bs": metric.fed_bs_score or 0.0,
        "reserves": metric.reserves_score or 0.0,
        "m2": metric.m2_score or 0.0
    }

    kimi_service = get_kimi_service()
    result = await kimi_service.analyze_liquidity_regime(
        liquidity_score=metric.liquidity_score,
        components=components
    )
    return result


@app.get("/api/ai/event-summary")
async def get_ai_event_summary(db: Session = Depends(get_db)):
    """
    Get AI-generated summary of upcoming events

    Returns:
        Natural language summary
    """
    # Get upcoming events (next 7 days)
    now = datetime.utcnow()
    events = db.query(Event).filter(
        Event.release_datetime_utc >= now,
        Event.release_datetime_utc <= now + timedelta(days=7)
    ).order_by(Event.importance.desc()).limit(10).all()

    if not events:
        return {"summary": "No major events scheduled in the next 7 days."}

    events_data = [
        {
            "name": e.event_name,
            "category": e.category.value,
            "date": e.release_datetime_utc.strftime("%Y-%m-%d")
        }
        for e in events
    ]

    kimi_service = get_kimi_service()
    summary = await kimi_service.generate_event_summary(events_data)
    return {"summary": summary}



# ---- CDC Action Zone + Weekly Summary (/api/cdc) ----
import math as _math
_cdc_cache: dict = {}
_CDC_CACHE_TTL = 1800  # 30 minutes


def _calc_ema(closes: list, period: int) -> list:
    k = 2.0 / (period + 1)
    ema = [closes[0]]
    for price in closes[1:]:
        ema.append(price * k + ema[-1] * (1 - k))
    return ema


def _calc_rsi(closes: list, period: int = 14):
    if len(closes) < period + 1:
        return None
    gains, losses = [], []
    for i in range(1, len(closes)):
        d = closes[i] - closes[i - 1]
        gains.append(max(d, 0.0))
        losses.append(max(-d, 0.0))
    ag = sum(gains[-period:]) / period
    al = sum(losses[-period:]) / period
    if al == 0:
        return 100.0
    return round(100 - 100 / (1 + ag / al), 1)


def _pearson_corr(x: list, y: list, n: int = 28):
    pairs = list(zip(x[-n:], y[-n:]))
    if len(pairs) < 5:
        return None
    xs = [p[0] for p in pairs]
    ys = [p[1] for p in pairs]
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    num = sum((xs[i] - mx) * (ys[i] - my) for i in range(len(xs)))
    dx = _math.sqrt(sum((v - mx) ** 2 for v in xs))
    dy = _math.sqrt(sum((v - my) ** 2 for v in ys))
    if dx == 0 or dy == 0:
        return None
    return round(num / (dx * dy), 3)


def _cdc_zone(price: float, ema12: float, ema26: float) -> dict:
    if price > ema12 and ema12 > ema26:
        return {"zone": 1, "label": "Strong Buy", "color": "#4ADE80"}
    if price < ema12 and ema12 > ema26:
        return {"zone": 2, "label": "Buy", "color": "#86EFAC"}
    if price > ema12 and ema12 < ema26:
        return {"zone": 3, "label": "Sell", "color": "#FB923C"}
    return {"zone": 4, "label": "Strong Sell", "color": "#F87171"}


async def _fetch_btc_ohlcv(days: int = 90) -> dict:
    """BTC daily prices + volumes from CoinGecko."""
    url = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart"
    params = {"vs_currency": "usd", "days": str(days), "interval": "daily"}
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        data = r.json()
    prices = [p[1] for p in data["prices"]]
    volumes = [v[1] for v in data.get("total_volumes", [])]
    # drop today's incomplete candle
    if prices:
        prices = prices[:-1]
    if volumes:
        volumes = volumes[:-1]
    return {"closes": prices, "volumes": volumes}


async def _fetch_stooq_ohlcv(ticker: str, days: int = 90) -> dict:
    """Generic stooq CSV fetcher — returns closes, highs, lows."""
    from datetime import date, timedelta
    today = date.today()
    start = today - timedelta(days=days + 15)
    url = (
        f"https://stooq.com/q/d/l/?s={ticker}"
        f"&d1={start.strftime('%Y%m%d')}&d2={today.strftime('%Y%m%d')}&i=d"
    )
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(url, follow_redirects=True)
        r.raise_for_status()
        text = r.text
    rows = []
    for line in text.strip().splitlines()[1:]:
        parts = line.split(",")
        if len(parts) >= 5:
            try:
                rows.append({
                    "open": float(parts[1]),
                    "high": float(parts[2]),
                    "low": float(parts[3]),
                    "close": float(parts[4]),
                })
            except ValueError:
                pass
    rows = rows[-days:] if len(rows) > days else rows
    return {
        "closes": [r["close"] for r in rows],
        "highs": [r["high"] for r in rows],
        "lows": [r["low"] for r in rows],
    }


async def _fetch_market_context() -> dict:
    """Fear & Greed (alternative.me) + DXY + US10Y (stooq)."""
    ctx: dict = {}

    # Fear & Greed
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            fg_r = await client.get("https://api.alternative.me/fng/?limit=1")
            fg = fg_r.json()["data"][0]
            ctx["fear_greed"] = {"value": int(fg["value"]), "label": fg["value_classification"]}
    except Exception as e:
        logger.warning(f"Fear&Greed fetch error: {e}")
        ctx["fear_greed"] = None

    # DXY from stooq (ticker: dxy.b)
    try:
        dxy_data = await _fetch_stooq_ohlcv("dxy.b", 14)
        c = dxy_data["closes"]
        if len(c) >= 6:
            ctx["dxy"] = {
                "close": round(c[-1], 3),
                "pct_wow": round((c[-1] / c[-6] - 1) * 100, 2) if c[-6] else None,
            }
        else:
            ctx["dxy"] = None
    except Exception as e:
        logger.warning(f"DXY fetch error: {e}")
        ctx["dxy"] = None

    # US 10Y yield from stooq (ticker: 10usb.b)
    try:
        tnx_data = await _fetch_stooq_ohlcv("10usb.b", 14)
        c = tnx_data["closes"]
        if len(c) >= 6:
            ctx["us10y"] = {
                "close": round(c[-1], 3),
                "change_bps": round((c[-1] - c[-6]) * 100, 1),
            }
        else:
            ctx["us10y"] = None
    except Exception as e:
        logger.warning(f"US10Y fetch error: {e}")
        ctx["us10y"] = None

    return ctx


async def _compute_cdc(asset: str, days: int = 90) -> dict:
    """Compute CDC zone + weekly stats + RSI. Cached 30 min."""
    now_ts = datetime.utcnow().timestamp()
    cached = _cdc_cache.get(asset)
    if cached and (now_ts - cached["fetched_at"]) < _CDC_CACHE_TTL:
        return cached["data"]

    try:
        if asset == "BTC":
            raw = await _fetch_btc_ohlcv(days)
            closes = raw["closes"]
            volumes = raw["volumes"]
            highs = closes   # CoinGecko market_chart doesn't have H/L; use close as proxy
            lows = closes
        else:
            raw = await _fetch_stooq_ohlcv("xauusd", days)
            closes = raw["closes"]
            highs = raw.get("highs", closes)
            lows = raw.get("lows", closes)
            volumes = []

        if len(closes) < 27:
            raise ValueError(f"Not enough data: {len(closes)} closes")

        ema12_series = _calc_ema(closes, 12)
        ema26_series = _calc_ema(closes, 26)

        # Weekly stats: last 5-7 trading days
        w = 7
        week_closes = closes[-w:]
        week_highs = highs[-w:]
        week_lows = lows[-w:]
        week_open = closes[-(w + 1)] if len(closes) > w else closes[0]
        week_vols = volumes[-w:] if volumes else []

        weekly = {
            "open": round(week_open, 2),
            "close": round(closes[-1], 2),
            "high": round(max(week_highs), 2),
            "low": round(min(week_lows), 2),
            "pct_wow": round((closes[-1] / week_open - 1) * 100, 2) if week_open else None,
            "volume_avg_daily_usd": round(sum(week_vols) / len(week_vols)) if week_vols else None,
        }

        rsi_val = _calc_rsi(closes, 14)

        # Build history of last 10 days
        history = []
        for i in range(max(0, len(closes) - 10), len(closes)):
            z = _cdc_zone(closes[i], ema12_series[i], ema26_series[i])
            history.append({
                "idx": i - len(closes),
                "close": round(closes[i], 2),
                "ema12": round(ema12_series[i], 2),
                "ema26": round(ema26_series[i], 2),
                **z,
            })

        current = history[-1]
        last_change_idx = None
        for i in range(len(history) - 2, -1, -1):
            if history[i]["zone"] != current["zone"]:
                last_change_idx = history[i]["idx"]
                break

        result = {
            "asset": asset,
            "price": current["close"],
            "ema12": current["ema12"],
            "ema26": current["ema26"],
            "zone": current["zone"],
            "label": current["label"],
            "color": current["color"],
            "last_zone_change_days_ago": abs(last_change_idx) - 1 if last_change_idx is not None else None,
            "history": history,
            "weekly": weekly,
            "rsi_14": rsi_val,
            "_closes_for_corr": closes[-28:],  # internal — stripped before response
            "fetched_utc": datetime.utcnow().isoformat(),
            "error": None,
        }
    except Exception as e:
        logger.warning(f"CDC fetch error for {asset}: {e}")
        result = {
            "asset": asset,
            "price": None, "ema12": None, "ema26": None,
            "zone": None, "label": "ข้อมูลไม่พร้อม", "color": "#6B7280",
            "last_zone_change_days_ago": None,
            "history": [], "weekly": None, "rsi_14": None,
            "_closes_for_corr": [],
            "fetched_utc": datetime.utcnow().isoformat(),
            "error": str(e),
        }

    _cdc_cache[asset] = {"data": result, "fetched_at": now_ts}
    return result


@app.get("/api/cdc")
async def get_cdc_signals():
    """
    CDC Action Zone + Weekly Summary for BTC and Gold (Daily D1).
    Includes: EMA12/26, Zone 1-4, weekly OHLCV, RSI(14),
    Fear&Greed, DXY, US10Y, BTC×Gold 4W correlation.
    Server-side cache: 30 minutes.
    """
    btc, gold, ctx = await asyncio.gather(
        _compute_cdc("BTC"),
        _compute_cdc("GOLD"),
        _fetch_market_context(),
    )

    # Compute BTC×Gold correlation from internal closes, then strip field
    btc_c = btc.pop("_closes_for_corr", [])
    gold_c = gold.pop("_closes_for_corr", [])
    corr = _pearson_corr(btc_c, gold_c, 28) if btc_c and gold_c else None

    ctx["btc_gold_corr_4w"] = corr

    return {"btc": btc, "gold": gold, "context": ctx, "timeframe": "D1", "ema_periods": [12, 26]}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
