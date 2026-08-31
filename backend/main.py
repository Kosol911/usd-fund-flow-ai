"""
FastAPI Application - USD Fund Flow AI
"""
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import logging
import os

from models import get_db, init_db
from models.database import Event, EventCategory, LiquidityMetric, MarketPrice
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
            await seeder.seed_events(db, days_ahead=365)
            result["events"] = db.query(Event).count()
        except Exception as e:
            result["events_error"] = str(e)
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
    finally:
        db.close()
    return result


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


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
