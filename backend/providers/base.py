"""
Base provider interface
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from datetime import datetime
import pandas as pd


class DataProvider(ABC):
    """
    Abstract base class for all data providers
    """

    @abstractmethod
    async def get_series(
        self,
        series_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Fetch time series data

        Returns DataFrame with columns: date, value
        """
        pass

    @abstractmethod
    async def get_events(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch economic calendar events

        Returns list of event dictionaries
        """
        pass

    @abstractmethod
    async def get_market_data(
        self,
        symbol: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Fetch market price data

        Returns DataFrame with columns: date, open, high, low, close, volume
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if provider is available (has API key, etc.)
        """
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """
        Get provider name for logging
        """
        pass
