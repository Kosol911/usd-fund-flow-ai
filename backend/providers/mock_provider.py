"""
Mock Data Provider
Provides sample data when real APIs are unavailable
"""
import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import logging
from providers.base import DataProvider

logger = logging.getLogger(__name__)


class MockProvider(DataProvider):
    """
    Mock provider for testing and demo purposes
    Generates realistic-looking sample data
    """

    def __init__(self):
        self.provider_name = "MOCK"
        logger.warning("Using MOCK data provider - data is for demonstration only")

    def is_available(self) -> bool:
        """Mock provider is always available"""
        return True

    def get_provider_name(self) -> str:
        return "MOCK"

    async def get_series(
        self,
        series_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Generate mock time series data

        Returns:
            DataFrame with columns: date, value
        """
        if start_date is None:
            start_date = datetime.now() - timedelta(days=365)
        if end_date is None:
            end_date = datetime.now()

        # Generate date range
        date_range = pd.date_range(start=start_date, end=end_date, freq='D')

        # Generate mock values based on series type
        values = self._generate_mock_values(series_id, len(date_range))

        df = pd.DataFrame({
            'date': date_range,
            'value': values
        })

        return df

    def _generate_mock_values(self, series_id: str, length: int) -> np.ndarray:
        """Generate realistic mock values based on series type"""
        np.random.seed(42)  # Reproducible mock data

        series_id_lower = series_id.lower()

        if 'fed_funds' in series_id_lower or 'fedfunds' in series_id_lower:
            # Fed funds rate: 4-5%
            base = 4.5
            noise = np.random.normal(0, 0.05, length)
            return np.clip(base + noise, 0, 10)

        elif 'tga' in series_id_lower or 'wtregen' in series_id_lower:
            # TGA: 300B - 700B
            base = 500000  # millions
            trend = np.linspace(-50000, 50000, length)
            noise = np.random.normal(0, 20000, length)
            return np.clip(base + trend + noise, 100000, 900000)

        elif 'rrp' in series_id_lower or 'rrpontsyd' in series_id_lower:
            # RRP: 200B - 600B
            base = 400000  # millions
            trend = np.linspace(100000, -100000, length)  # declining trend
            noise = np.random.normal(0, 30000, length)
            return np.clip(base + trend + noise, 0, 800000)

        elif 'walcl' in series_id_lower or 'balance_sheet' in series_id_lower:
            # Fed BS: 7T - 9T
            base = 8000000  # millions
            trend = np.linspace(-200000, 0, length)  # QT
            noise = np.random.normal(0, 50000, length)
            return np.clip(base + trend + noise, 6000000, 10000000)

        elif 'reserves' in series_id_lower or 'totresns' in series_id_lower:
            # Bank reserves: 3T - 3.5T
            base = 3300000  # millions
            noise = np.random.normal(0, 50000, length)
            return np.clip(base + noise, 2500000, 4000000)

        elif 'm2' in series_id_lower:
            # M2: 20T - 22T
            base = 21000  # billions
            trend = np.linspace(0, 500, length)
            noise = np.random.normal(0, 100, length)
            return np.clip(base + trend + noise, 19000, 23000)

        elif 'dgs2' in series_id_lower or '2y' in series_id_lower:
            # 2Y yield: 3.5-4.5%
            base = 4.0
            noise = np.random.normal(0, 0.1, length)
            return np.clip(base + noise, 2, 6)

        elif 'dgs10' in series_id_lower or '10y' in series_id_lower:
            # 10Y yield: 4.0-4.5%
            base = 4.2
            noise = np.random.normal(0, 0.1, length)
            return np.clip(base + noise, 2.5, 6)

        elif 'dgs30' in series_id_lower or '30y' in series_id_lower:
            # 30Y yield: 4.3-4.8%
            base = 4.5
            noise = np.random.normal(0, 0.1, length)
            return np.clip(base + noise, 3, 6.5)

        elif 'cpi' in series_id_lower:
            # CPI: growing from 310 to 315
            base = 312
            trend = np.linspace(0, 3, length)
            noise = np.random.normal(0, 0.2, length)
            return base + trend + noise

        elif 'pce' in series_id_lower:
            # PCE: similar to CPI
            base = 128
            trend = np.linspace(0, 2, length)
            noise = np.random.normal(0, 0.1, length)
            return base + trend + noise

        elif 'unrate' in series_id_lower or 'unemployment' in series_id_lower:
            # Unemployment: 3.5-4.5%
            base = 4.0
            noise = np.random.normal(0, 0.1, length)
            return np.clip(base + noise, 3, 5)

        elif 'payems' in series_id_lower or 'payroll' in series_id_lower:
            # Nonfarm payrolls: 155M-160M
            base = 157000  # thousands
            trend = np.linspace(0, 1000, length)
            noise = np.random.normal(0, 100, length)
            return base + trend + noise

        elif 'gdp' in series_id_lower:
            # GDP: 26T-28T
            base = 27000  # billions
            trend = np.linspace(0, 1000, length)
            noise = np.random.normal(0, 200, length)
            return base + trend + noise

        else:
            # Default: random walk
            return np.cumsum(np.random.normal(100, 10, length))

    async def get_events(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate mock economic calendar events

        Returns:
            List of event dictionaries
        """
        if start_date is None:
            start_date = datetime.now()
        if end_date is None:
            end_date = start_date + timedelta(days=365)

        events = []

        # Generate recurring monthly events
        current = start_date
        while current <= end_date:
            # CPI - around 13th of each month
            cpi_date = current.replace(day=13, hour=8, minute=30)
            if start_date <= cpi_date <= end_date:
                events.append({
                    'event_name': 'Consumer Price Index (CPI)',
                    'event_key': 'CPI',
                    'category': 'INFLATION',
                    'release_datetime_utc': cpi_date,
                    'importance': 10,
                    'forecast': 2.8,
                    'previous': 2.9,
                    'unit': '%'
                })

            # NFP - first Friday of each month
            nfp_date = self._get_first_friday(current).replace(hour=8, minute=30)
            if start_date <= nfp_date <= end_date:
                events.append({
                    'event_name': 'Nonfarm Payrolls',
                    'event_key': 'NFP',
                    'category': 'EMPLOYMENT',
                    'release_datetime_utc': nfp_date,
                    'importance': 9,
                    'forecast': 180000,
                    'previous': 175000,
                    'unit': 'jobs'
                })

            # PCE - around 29th of each month
            if current.month != 12:
                pce_date = current.replace(day=min(29, self._days_in_month(current)), hour=8, minute=30)
            else:
                pce_date = current.replace(day=29, hour=8, minute=30)

            if start_date <= pce_date <= end_date:
                events.append({
                    'event_name': 'Personal Consumption Expenditures (PCE)',
                    'event_key': 'PCE',
                    'category': 'INFLATION',
                    'release_datetime_utc': pce_date,
                    'importance': 9,
                    'forecast': 2.6,
                    'previous': 2.7,
                    'unit': '%'
                })

            current = (current.replace(day=1) + timedelta(days=32)).replace(day=1)

        # Add quarterly FOMC meetings
        fomc_months = [1, 3, 5, 6, 7, 9, 11, 12]
        for year in range(start_date.year, end_date.year + 1):
            for month in fomc_months:
                fomc_date = datetime(year, month, 15, hour=14, minute=0)
                if start_date <= fomc_date <= end_date:
                    events.append({
                        'event_name': 'FOMC Rate Decision',
                        'event_key': 'FOMC',
                        'category': 'FED',
                        'release_datetime_utc': fomc_date,
                        'importance': 10,
                        'forecast': 4.50,
                        'previous': 4.50,
                        'unit': '%'
                    })

        return sorted(events, key=lambda x: x['release_datetime_utc'])

    def _get_first_friday(self, date: datetime) -> datetime:
        """Get first Friday of the month"""
        first_day = date.replace(day=1)
        # 4 = Friday
        days_until_friday = (4 - first_day.weekday()) % 7
        if days_until_friday == 0:
            days_until_friday = 7
        return first_day + timedelta(days=days_until_friday)

    def _days_in_month(self, date: datetime) -> int:
        """Get number of days in month"""
        next_month = date.replace(day=28) + timedelta(days=4)
        return (next_month - timedelta(days=next_month.day)).day

    async def get_market_data(
        self,
        symbol: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Generate mock market price data

        Returns:
            DataFrame with columns: date, open, high, low, close, volume
        """
        if start_date is None:
            start_date = datetime.now() - timedelta(days=365)
        if end_date is None:
            end_date = datetime.now()

        date_range = pd.date_range(start=start_date, end=end_date, freq='D')

        # Generate prices based on asset
        base_price = self._get_base_price(symbol)
        prices = self._generate_price_series(base_price, len(date_range))

        df = pd.DataFrame({
            'date': date_range,
            'open': prices * np.random.uniform(0.995, 1.005, len(date_range)),
            'high': prices * np.random.uniform(1.005, 1.02, len(date_range)),
            'low': prices * np.random.uniform(0.98, 0.995, len(date_range)),
            'close': prices,
            'volume': np.random.uniform(1e9, 5e9, len(date_range))
        })

        return df

    def _get_base_price(self, symbol: str) -> float:
        """Get base price for symbol"""
        symbol_upper = symbol.upper()
        prices = {
            'BTC': 60000,
            'BTCUSD': 60000,
            'GOLD': 2400,
            'XAUUSD': 2400,
            'SPX': 5500,
            'NASDAQ': 19000,
            'NDX': 19000,
            'DXY': 103,
            'US10Y': 4.2
        }
        return prices.get(symbol_upper, 100)

    def _generate_price_series(self, base: float, length: int) -> np.ndarray:
        """Generate realistic price series"""
        np.random.seed(42)
        returns = np.random.normal(0.0001, 0.015, length)
        prices = base * np.cumprod(1 + returns)
        return prices

    async def close(self):
        """No resources to close for mock provider"""
        pass
