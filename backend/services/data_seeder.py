"""
Data seeding service
Populates database with initial/mock data
"""
import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import logging

from models import SessionLocal
from models.database import Event, EventCategory, EventStatus, LiquidityMetric, LiquidityRegime, MarketPrice
from providers import get_provider_factory

logger = logging.getLogger(__name__)


class DataSeeder:
    """Seeds database with initial data"""

    def __init__(self):
        self.provider_factory = get_provider_factory()

    async def seed_events(self, db: Session, days_ahead: int = 365):
        """
        Seed economic calendar events

        Args:
            db: Database session
            days_ahead: Number of days to generate events for
        """
        logger.info(f"Seeding events for next {days_ahead} days...")

        # Get events from provider
        provider = self.provider_factory.get_fred_provider()
        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=days_ahead)

        try:
            events_data = await provider.get_events(start_date, end_date)

            for event_data in events_data:
                # Check if event already exists
                existing = db.query(Event).filter(
                    Event.event_key == event_data.get('event_key'),
                    Event.release_datetime_utc == event_data.get('release_datetime_utc')
                ).first()

                if not existing:
                    event = Event(
                        event_name=event_data.get('event_name'),
                        event_key=event_data.get('event_key'),
                        category=EventCategory[event_data.get('category')],
                        country=event_data.get('country', 'US'),
                        currency=event_data.get('currency', 'USD'),
                        release_datetime_utc=event_data.get('release_datetime_utc'),
                        importance=event_data.get('importance'),
                        forecast=event_data.get('forecast'),
                        previous=event_data.get('previous'),
                        unit=event_data.get('unit'),
                        status=EventStatus.SCHEDULED
                    )
                    db.add(event)

            db.commit()
            event_count = db.query(Event).count()
            logger.info(f"Seeded events. Total events in DB: {event_count}")

        except Exception as e:
            logger.error(f"Error seeding events: {e}")
            db.rollback()

    async def seed_liquidity_metrics(self, db: Session, days_back: int = 365):
        """
        Seed liquidity metrics

        Args:
            db: Database session
            days_back: Number of days of historical data
        """
        logger.info(f"Seeding liquidity metrics for past {days_back} days...")

        fred_provider = self.provider_factory.get_fred_provider()
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days_back)

        try:
            # For mock data, generate sample liquidity scores
            import numpy as np
            np.random.seed(42)

            current_date = start_date
            while current_date <= end_date:
                # Check if metric exists
                existing = db.query(LiquidityMetric).filter(
                    LiquidityMetric.date == current_date.date()
                ).first()

                if not existing:
                    # Generate mock liquidity score
                    base_score = 20  # Slightly expanding
                    noise = np.random.normal(0, 15)
                    liquidity_score = np.clip(base_score + noise, -100, 100)

                    # Determine regime
                    if liquidity_score >= 60:
                        regime = LiquidityRegime.STRONGLY_EXPANDING
                    elif liquidity_score >= 20:
                        regime = LiquidityRegime.EXPANDING
                    elif liquidity_score >= -19:
                        regime = LiquidityRegime.NEUTRAL
                    elif liquidity_score >= -59:
                        regime = LiquidityRegime.CONTRACTING
                    else:
                        regime = LiquidityRegime.STRONGLY_CONTRACTING

                    metric = LiquidityMetric(
                        date=current_date.date(),
                        tga_score=np.random.uniform(-30, 30),
                        rrp_score=np.random.uniform(-30, 30),
                        fed_bs_score=np.random.uniform(-20, 20),
                        reserves_score=np.random.uniform(-15, 15),
                        m2_score=np.random.uniform(-10, 10),
                        liquidity_score=liquidity_score,
                        regime=regime,
                        regime_confidence=np.random.uniform(60, 90),
                        tga_value=500000 + np.random.normal(0, 50000),
                        rrp_value=400000 + np.random.normal(0, 50000),
                        fed_bs_value=8000000 + np.random.normal(0, 100000),
                        reserves_value=3300000 + np.random.normal(0, 50000),
                        m2_value=21000 + np.random.normal(0, 200)
                    )
                    db.add(metric)

                current_date += timedelta(days=1)

            db.commit()
            metric_count = db.query(LiquidityMetric).count()
            logger.info(f"Seeded liquidity metrics. Total metrics in DB: {metric_count}")

        except Exception as e:
            logger.error(f"Error seeding liquidity metrics: {e}")
            db.rollback()

    async def seed_market_prices(self, db: Session, days_back: int = 365):
        """
        Seed market price data

        Args:
            db: Database session
            days_back: Number of days of historical data
        """
        logger.info(f"Seeding market prices for past {days_back} days...")

        assets = ['BTC', 'GOLD', 'SPX', 'NASDAQ', 'DXY', 'US10Y']
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days_back)

        try:
            provider = self.provider_factory.get_fred_provider()

            for asset in assets:
                # Get market data
                df = await provider.get_market_data(asset, start_date, end_date)

                for _, row in df.iterrows():
                    # Check if price exists
                    existing = db.query(MarketPrice).filter(
                        MarketPrice.asset == asset,
                        MarketPrice.date == row['date']
                    ).first()

                    if not existing:
                        price = MarketPrice(
                            asset=asset,
                            date=row['date'],
                            open=row.get('open'),
                            high=row.get('high'),
                            low=row.get('low'),
                            close=row['close'],
                            volume=row.get('volume'),
                            change_1d=row.get('close', 0) * 0.01,  # Mock 1% change
                            change_pct_1d=1.0,
                            source='MOCK'
                        )
                        db.add(price)

            db.commit()
            price_count = db.query(MarketPrice).count()
            logger.info(f"Seeded market prices. Total prices in DB: {price_count}")

        except Exception as e:
            logger.error(f"Error seeding market prices: {e}")
            db.rollback()

    async def seed_all(self):
        """Seed all data"""
        db = SessionLocal()
        try:
            await self.seed_events(db, days_ahead=365)
            await self.seed_liquidity_metrics(db, days_back=90)
            await self.seed_market_prices(db, days_back=90)
            logger.info("All data seeded successfully")
        finally:
            db.close()
            await self.provider_factory.close_all()


async def main():
    """Run seeder"""
    seeder = DataSeeder()
    await seeder.seed_all()


if __name__ == "__main__":
    asyncio.run(main())
