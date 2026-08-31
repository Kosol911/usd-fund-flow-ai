"""
FRED Data Provider
Federal Reserve Economic Data API
"""
import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import pandas as pd
import httpx
import logging
from providers.base import DataProvider

logger = logging.getLogger(__name__)


class FREDProvider(DataProvider):
    """
    FRED (Federal Reserve Economic Data) provider
    https://fred.stlouisfed.org/docs/api/
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("FRED_API_KEY")
        self.base_url = "https://api.stlouisfed.org/fred"
        self.client = httpx.AsyncClient(timeout=30.0)

    def is_available(self) -> bool:
        """Check if FRED API key is configured"""
        return self.api_key is not None and len(self.api_key) > 0

    def get_provider_name(self) -> str:
        return "FRED"

    async def get_series(
        self,
        series_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Fetch FRED time series data

        Args:
            series_id: FRED series ID (e.g., "FEDFUNDS", "DGS10")
            start_date: Start date for data
            end_date: End date for data

        Returns:
            DataFrame with columns: date, value
        """
        if not self.is_available():
            raise ValueError("FRED API key not configured")

        params = {
            "series_id": series_id,
            "api_key": self.api_key,
            "file_type": "json"
        }

        if start_date:
            params["observation_start"] = start_date.strftime("%Y-%m-%d")
        if end_date:
            params["observation_end"] = end_date.strftime("%Y-%m-%d")

        try:
            response = await self.client.get(
                f"{self.base_url}/series/observations",
                params=params
            )
            response.raise_for_status()

            data = response.json()
            observations = data.get("observations", [])

            if not observations:
                logger.warning(f"No data returned for series {series_id}")
                return pd.DataFrame(columns=["date", "value"])

            # Convert to DataFrame
            df = pd.DataFrame(observations)
            df["date"] = pd.to_datetime(df["date"])
            df["value"] = pd.to_numeric(df["value"], errors="coerce")

            # Filter out missing values (marked as ".")
            df = df[df["value"].notna()]

            return df[["date", "value"]].reset_index(drop=True)

        except httpx.HTTPError as e:
            logger.error(f"FRED API error for series {series_id}: {e}")
            raise

    async def get_series_info(self, series_id: str) -> Dict[str, Any]:
        """
        Get metadata about a FRED series

        Args:
            series_id: FRED series ID

        Returns:
            Dictionary with series metadata
        """
        if not self.is_available():
            raise ValueError("FRED API key not configured")

        params = {
            "series_id": series_id,
            "api_key": self.api_key,
            "file_type": "json"
        }

        try:
            response = await self.client.get(
                f"{self.base_url}/series",
                params=params
            )
            response.raise_for_status()

            data = response.json()
            series_list = data.get("seriess", [])

            if series_list:
                return series_list[0]
            else:
                return {}

        except httpx.HTTPError as e:
            logger.error(f"FRED API error for series info {series_id}: {e}")
            raise

    async def get_events(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        FRED doesn't provide event calendar data
        Returns empty list
        """
        return []

    async def get_market_data(
        self,
        symbol: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        FRED doesn't provide market price data
        Returns empty DataFrame
        """
        return pd.DataFrame(columns=["date", "open", "high", "low", "close", "volume"])

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
