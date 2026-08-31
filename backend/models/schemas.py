"""
Pydantic schemas for API requests and responses
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class EventCategoryEnum(str, Enum):
    FED = "FED"
    INFLATION = "INFLATION"
    EMPLOYMENT = "EMPLOYMENT"
    TREASURY = "TREASURY"
    GDP = "GDP"
    LIQUIDITY = "LIQUIDITY"
    CREDIT = "CREDIT"
    OTHER = "OTHER"


class EventStatusEnum(str, Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class LiquidityRegimeEnum(str, Enum):
    STRONGLY_EXPANDING = "STRONGLY_EXPANDING"
    EXPANDING = "EXPANDING"
    NEUTRAL = "NEUTRAL"
    CONTRACTING = "CONTRACTING"
    STRONGLY_CONTRACTING = "STRONGLY_CONTRACTING"


class USDRegimeEnum(str, Enum):
    STRONG_USD = "STRONG_USD"
    NEUTRAL_USD = "NEUTRAL_USD"
    WEAK_USD = "WEAK_USD"


class EventBase(BaseModel):
    event_name: str
    event_key: Optional[str] = None
    category: EventCategoryEnum
    country: str = "US"
    currency: str = "USD"
    release_datetime_utc: datetime
    importance: int = Field(..., ge=1, le=10)
    forecast: Optional[float] = None
    previous: Optional[float] = None
    actual: Optional[float] = None
    unit: Optional[str] = None


class EventCreate(EventBase):
    pass


class EventResponse(EventBase):
    id: int
    status: EventStatusEnum
    historical_volatility_24h: Optional[float] = None
    btc_impact_score: Optional[float] = None
    gold_impact_score: Optional[float] = None
    spx_impact_score: Optional[float] = None
    nasdaq_impact_score: Optional[float] = None
    ai_summary: Optional[str] = None
    ai_bias: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EventDetail(EventResponse):
    releases: List[Any] = []
    impacts: List[Any] = []
    ai_metadata: Optional[Dict[str, Any]] = None


class LiquidityScoreResponse(BaseModel):
    date: datetime
    liquidity_score: float
    regime: LiquidityRegimeEnum
    regime_confidence: Optional[float] = None
    components: Dict[str, float]


class CrossAssetResponse(BaseModel):
    asset: str
    current_price: float
    change_24h: float
    change_pct_24h: float
    liquidity_sensitivity: str
    usd_sensitivity: str
    regime_bias: str


class TimelineEventResponse(BaseModel):
    id: int
    event_name: str
    event_key: Optional[str]
    category: EventCategoryEnum
    release_datetime_utc: datetime
    importance: int
    emoji: str
    color: str


class AnnualTimelineResponse(BaseModel):
    year: int
    months: List[Dict[str, Any]]


class MonthlyTimelineResponse(BaseModel):
    year: int
    month: int
    events: List[TimelineEventResponse]
    liquidity_summary: Optional[Dict[str, Any]] = None


class RegimeResponse(BaseModel):
    liquidity_regime: LiquidityRegimeEnum
    liquidity_score: float
    usd_regime: USDRegimeEnum
    usd_confidence: float
    rates_direction: str
    credit_condition: str
    timestamp: datetime


class EventImpactResponse(BaseModel):
    asset: str
    impact_24h: Optional[float]
    impact_48h: Optional[float]
    impact_5d: Optional[float]
    impact_10d: Optional[float]
    direction: Optional[str]
    magnitude: Optional[str]


class HistoricalAnalogueResponse(BaseModel):
    date: datetime
    event_name: str
    similarity_score: float
    market_reaction: Dict[str, float]
    liquidity_regime: str
    notes: Optional[str]


class PreEventBriefResponse(BaseModel):
    event: EventResponse
    market_expectation: Optional[float]
    liquidity_regime: LiquidityRegimeEnum
    usd_regime: USDRegimeEnum
    historical_reactions: List[EventImpactResponse]
    scenarios: List[Dict[str, Any]]
    ai_analysis: Optional[str]


class AlertResponse(BaseModel):
    id: int
    alert_type: str
    severity: str
    title: str
    message: str
    triggered_at: datetime
    is_resolved: bool

    class Config:
        from_attributes = True
