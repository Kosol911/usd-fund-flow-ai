"""
Simple test for providers
"""
import pytest
import asyncio
from backend.providers import get_provider_factory


@pytest.mark.asyncio
async def test_fred_provider_availability():
    """Test FRED provider initialization"""
    factory = get_provider_factory()
    provider = factory.get_fred_provider()

    # Should always return a provider (real or mock)
    assert provider is not None
    assert provider.get_provider_name() in ["FRED", "MOCK"]

    await factory.close_all()


@pytest.mark.asyncio
async def test_treasury_provider_availability():
    """Test Treasury provider initialization"""
    factory = get_provider_factory()
    provider = factory.get_treasury_provider()

    # Should always return a provider (real or mock)
    assert provider is not None
    assert provider.get_provider_name() in ["TREASURY", "MOCK"]

    await factory.close_all()


@pytest.mark.asyncio
async def test_mock_provider_events():
    """Test mock provider can generate events"""
    factory = get_provider_factory()
    provider = factory._get_mock_provider()

    from datetime import datetime, timedelta
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=90)

    events = await provider.get_events(start_date, end_date)

    assert len(events) > 0
    assert all('event_name' in e for e in events)
    assert all('importance' in e for e in events)

    await factory.close_all()


@pytest.mark.asyncio
async def test_mock_provider_series():
    """Test mock provider can generate series data"""
    factory = get_provider_factory()
    provider = factory._get_mock_provider()

    from datetime import datetime, timedelta
    start_date = datetime.utcnow() - timedelta(days=30)
    end_date = datetime.utcnow()

    df = await provider.get_series("FEDFUNDS", start_date, end_date)

    assert not df.empty
    assert 'date' in df.columns
    assert 'value' in df.columns
    assert len(df) > 0

    await factory.close_all()


def test_liquidity_engine_init():
    """Test liquidity engine initialization"""
    from backend.engines import LiquidityEngine

    engine = LiquidityEngine()
    assert engine is not None
    assert engine.components is not None
    assert engine.regimes is not None


def test_cross_asset_engine_init():
    """Test cross-asset engine initialization"""
    from backend.engines import CrossAssetEngine

    engine = CrossAssetEngine()
    assert engine is not None
    assert engine.assets is not None


def test_cross_asset_engine_sensitivity():
    """Test asset sensitivity retrieval"""
    from backend.engines import CrossAssetEngine

    engine = CrossAssetEngine()

    btc_sensitivity = engine.get_asset_sensitivity("BTC")
    assert btc_sensitivity is not None
    assert btc_sensitivity["asset"] == "BTC"
    assert "liquidity_sensitivity" in btc_sensitivity


def test_cross_asset_engine_regime_bias():
    """Test regime bias calculation"""
    from backend.engines import CrossAssetEngine

    engine = CrossAssetEngine()

    bias = engine.get_regime_bias("BTC", "EXPANDING")
    assert bias in ["BULLISH", "BEARISH", "NEUTRAL", "VERY_BULLISH", "VERY_BEARISH"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
