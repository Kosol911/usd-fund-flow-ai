"""
Database models for USD Fund Flow AI
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Index, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import enum

Base = declarative_base()


class EventCategory(str, enum.Enum):
    FED = "FED"
    INFLATION = "INFLATION"
    EMPLOYMENT = "EMPLOYMENT"
    TREASURY = "TREASURY"
    GDP = "GDP"
    LIQUIDITY = "LIQUIDITY"
    CREDIT = "CREDIT"
    OTHER = "OTHER"


class EventStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class LiquidityRegime(str, enum.Enum):
    STRONGLY_EXPANDING = "STRONGLY_EXPANDING"
    EXPANDING = "EXPANDING"
    NEUTRAL = "NEUTRAL"
    CONTRACTING = "CONTRACTING"
    STRONGLY_CONTRACTING = "STRONGLY_CONTRACTING"


class USDRegime(str, enum.Enum):
    STRONG_USD = "STRONG_USD"
    NEUTRAL_USD = "NEUTRAL_USD"
    WEAK_USD = "WEAK_USD"


class Event(Base):
    """Economic calendar events"""
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    event_name = Column(String(255), nullable=False, index=True)
    event_key = Column(String(100), index=True)  # e.g., "CPI", "FOMC", "NFP"
    category = Column(SQLEnum(EventCategory), nullable=False, index=True)
    country = Column(String(10), default="US")
    currency = Column(String(10), default="USD")

    # Timing
    release_datetime_utc = Column(DateTime, nullable=False, index=True)
    release_datetime_local = Column(DateTime)

    # Importance
    importance = Column(Integer, nullable=False, index=True)  # 1-10
    raw_importance_score = Column(Float)
    ai_importance_score = Column(Float)

    # Data
    forecast = Column(Float)
    previous = Column(Float)
    actual = Column(Float)
    unit = Column(String(50))

    # Source
    source = Column(String(100))
    source_url = Column(Text)
    status = Column(SQLEnum(EventStatus), default=EventStatus.SCHEDULED, index=True)

    # Historical impact scores
    historical_volatility_24h = Column(Float)
    historical_volatility_48h = Column(Float)

    # Cross-asset impact scores
    btc_impact_score = Column(Float)
    gold_impact_score = Column(Float)
    spx_impact_score = Column(Float)
    nasdaq_impact_score = Column(Float)
    bond_impact_score = Column(Float)
    dxy_impact_score = Column(Float)

    # AI Analysis
    ai_summary = Column(Text)
    ai_bias = Column(String(50))  # BULLISH, BEARISH, NEUTRAL
    ai_confidence = Column(Float)  # 0-100
    ai_metadata = Column(JSONB)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    releases = relationship("EventRelease", back_populates="event", cascade="all, delete-orphan")
    impacts = relationship("EventImpact", back_populates="event", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_events_datetime_importance', 'release_datetime_utc', 'importance'),
        Index('ix_events_category_datetime', 'category', 'release_datetime_utc'),
    )


class EventRelease(Base):
    """Actual event releases with revisions"""
    __tablename__ = "event_releases"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False, index=True)

    release_datetime = Column(DateTime, nullable=False)
    actual = Column(Float)
    forecast = Column(Float)
    previous = Column(Float)
    revised_previous = Column(Float)

    surprise_magnitude = Column(Float)  # (actual - forecast) / std_dev
    surprise_direction = Column(String(20))  # ABOVE, BELOW, INLINE

    is_revision = Column(Boolean, default=False)
    revision_note = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    event = relationship("Event", back_populates="releases")


class EconomicSeries(Base):
    """Time series data from FRED and other sources"""
    __tablename__ = "economic_series"

    id = Column(Integer, primary_key=True, index=True)
    series_key = Column(String(100), nullable=False, index=True)  # e.g., "fed_funds", "tga"
    series_id = Column(String(100), nullable=False)  # e.g., FRED series ID
    name = Column(String(255), nullable=False)

    # Data point
    date = Column(DateTime, nullable=False, index=True)
    value = Column(Float, nullable=False)

    # Metadata
    unit = Column(String(50))
    frequency = Column(String(20))  # Daily, Weekly, Monthly
    source = Column(String(50))  # FRED, TREASURY, etc.

    # Change metrics
    change_1d = Column(Float)
    change_1w = Column(Float)
    change_1m = Column(Float)
    change_pct_1d = Column(Float)
    change_pct_1w = Column(Float)
    change_pct_1m = Column(Float)

    # Timestamps
    retrieved_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_series_key_date', 'series_key', 'date'),
    )


class LiquidityMetric(Base):
    """USD Liquidity calculations"""
    __tablename__ = "liquidity_metrics"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False, index=True, unique=True)

    # Component scores
    tga_score = Column(Float)
    rrp_score = Column(Float)
    fed_bs_score = Column(Float)
    reserves_score = Column(Float)
    m2_score = Column(Float)

    # Composite score
    liquidity_score = Column(Float, nullable=False)  # -100 to +100
    regime = Column(SQLEnum(LiquidityRegime), nullable=False, index=True)
    regime_confidence = Column(Float)

    # Raw component values
    tga_value = Column(Float)
    rrp_value = Column(Float)
    fed_bs_value = Column(Float)
    reserves_value = Column(Float)
    m2_value = Column(Float)

    # Metadata
    calculation_metadata = Column(JSONB)

    created_at = Column(DateTime, default=datetime.utcnow)


class TreasuryFlow(Base):
    """Treasury operations and flows"""
    __tablename__ = "treasury_flows"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False)

    # Treasury operations
    issuance = Column(Float)  # New debt issued
    redemption = Column(Float)  # Debt redeemed
    net_issuance = Column(Float)  # issuance - redemption

    # TGA
    tga_balance = Column(Float)
    tga_change = Column(Float)

    # Auctions
    auction_date = Column(DateTime)
    auction_type = Column(String(50))  # 2Y, 5Y, 10Y, 30Y, TIPS
    auction_amount = Column(Float)
    auction_demand = Column(Float)  # bid-to-cover ratio

    # Tax dates
    is_tax_date = Column(Boolean, default=False)
    tax_receipts = Column(Float)

    # Quarterly refunding
    is_refunding_week = Column(Boolean, default=False)

    source = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_treasury_flows_date', 'date'),
    )


class MarketPrice(Base):
    """Cross-asset market prices"""
    __tablename__ = "market_prices"

    id = Column(Integer, primary_key=True, index=True)
    asset = Column(String(20), nullable=False, index=True)  # BTC, GOLD, SPX, NASDAQ, DXY, US10Y
    date = Column(DateTime, nullable=False, index=True)

    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float, nullable=False)
    volume = Column(Float)

    # Change metrics
    change_1d = Column(Float)
    change_pct_1d = Column(Float)

    source = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_market_prices_asset_date', 'asset', 'date'),
    )


class EventImpact(Base):
    """Historical event impact on assets"""
    __tablename__ = "event_impacts"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False, index=True)
    asset = Column(String(20), nullable=False, index=True)

    # Impact windows
    impact_24h = Column(Float)
    impact_48h = Column(Float)
    impact_5d = Column(Float)
    impact_10d = Column(Float)

    # Volatility
    volatility_24h = Column(Float)
    volatility_48h = Column(Float)

    # Direction
    direction = Column(String(20))  # UP, DOWN, NEUTRAL
    magnitude = Column(String(20))  # EXTREME, HIGH, MEDIUM, LOW

    calculated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    event = relationship("Event", back_populates="impacts")


class RegimeSnapshot(Base):
    """Historical regime snapshots"""
    __tablename__ = "regime_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False, index=True)

    # Liquidity regime
    liquidity_score = Column(Float)
    liquidity_regime = Column(SQLEnum(LiquidityRegime))

    # USD regime
    usd_regime = Column(SQLEnum(USDRegime))
    usd_confidence = Column(Float)

    # Rates
    fed_funds = Column(Float)
    us_2y = Column(Float)
    us_10y = Column(Float)
    us_30y = Column(Float)
    yield_curve_2_10 = Column(Float)

    # DXY
    dxy = Column(Float)

    # Cross-asset state
    cross_asset_state = Column(JSONB)

    created_at = Column(DateTime, default=datetime.utcnow)


class Alert(Base):
    """System alerts"""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(String(50), nullable=False, index=True)
    severity = Column(String(20))  # INFO, WARNING, CRITICAL

    title = Column(String(255))
    message = Column(Text)
    alert_metadata = Column(JSONB)

    triggered_at = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime)
    is_resolved = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
