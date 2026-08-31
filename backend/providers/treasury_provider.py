"""
Treasury Data Provider
U.S. Department of the Treasury Fiscal Data API
"""
import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import pandas as pd
import httpx
import logging
from providers.base import DataProvider

logger = logging.getLogger(__name__)


class TreasuryProvider(DataProvider):
    """
    U.S. Treasury Fiscal Data provider
    https://fiscaldata.treasury.gov/api-documentation/
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("TREASURY_API_KEY")
        self.base_url = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service"
        self.client = httpx.AsyncClient(timeout=30.0)

    def is_available(self) -> bool:
        """
        Treasury API is publicly available without API key
        API key is optional for higher rate limits
        """
        return True

    def get_provider_name(self) -> str:
        return "TREASURY"

    async def get_tga_balance(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Fetch Treasury General Account balance

        Returns:
            DataFrame with columns: date, value
        """
        # Treasury Operating Cash Balance
        endpoint = "/v1/accounting/dts/deposits_withdrawals_operating_cash"

        params = {
            "fields": "record_date,account_type,close_today_bal",
            "filter": "account_type:eq:Treasury General Account (TGA)",
            "sort": "-record_date",
            "page[size]": "10000"
        }

        if start_date:
            params["filter"] += f",record_date:gte:{start_date.strftime('%Y-%m-%d')}"
        if end_date:
            params["filter"] += f",record_date:lte:{end_date.strftime('%Y-%m-%d')}"

        try:
            response = await self.client.get(
                f"{self.base_url}{endpoint}",
                params=params
            )
            response.raise_for_status()

            data = response.json()
            records = data.get("data", [])

            if not records:
                logger.warning("No TGA data returned")
                return pd.DataFrame(columns=["date", "value"])

            df = pd.DataFrame(records)
            df["date"] = pd.to_datetime(df["record_date"])
            df["value"] = pd.to_numeric(df["close_today_bal"], errors="coerce")

            return df[["date", "value"]].sort_values("date").reset_index(drop=True)

        except httpx.HTTPError as e:
            logger.error(f"Treasury API error for TGA: {e}")
            raise

    async def get_debt_outstanding(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Fetch U.S. debt outstanding

        Returns:
            DataFrame with columns: date, value
        """
        endpoint = "/v2/accounting/od/debt_outstanding"

        params = {
            "fields": "record_date,debt_held_public_amt,intragov_hold_amt,tot_pub_debt_out_amt",
            "sort": "-record_date",
            "page[size]": "10000"
        }

        if start_date:
            params["filter"] = f"record_date:gte:{start_date.strftime('%Y-%m-%d')}"
        if end_date:
            if "filter" in params:
                params["filter"] += ","
            else:
                params["filter"] = ""
            params["filter"] += f"record_date:lte:{end_date.strftime('%Y-%m-%d')}"

        try:
            response = await self.client.get(
                f"{self.base_url}{endpoint}",
                params=params
            )
            response.raise_for_status()

            data = response.json()
            records = data.get("data", [])

            if not records:
                logger.warning("No debt data returned")
                return pd.DataFrame(columns=["date", "value"])

            df = pd.DataFrame(records)
            df["date"] = pd.to_datetime(df["record_date"])
            df["value"] = pd.to_numeric(df["tot_pub_debt_out_amt"], errors="coerce")

            return df[["date", "value"]].sort_values("date").reset_index(drop=True)

        except httpx.HTTPError as e:
            logger.error(f"Treasury API error for debt: {e}")
            raise

    async def get_series(
        self,
        series_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Fetch Treasury series data

        Args:
            series_id: Series identifier ("tga", "debt", etc.)
            start_date: Start date
            end_date: End date

        Returns:
            DataFrame with columns: date, value
        """
        if series_id.lower() == "tga":
            return await self.get_tga_balance(start_date, end_date)
        elif series_id.lower() == "debt":
            return await self.get_debt_outstanding(start_date, end_date)
        else:
            logger.warning(f"Unknown Treasury series: {series_id}")
            return pd.DataFrame(columns=["date", "value"])

    async def get_events(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Treasury doesn't provide event calendar data directly
        Returns empty list (we'll need to scrape or use another source)
        """
        return []

    async def get_market_data(
        self,
        symbol: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Treasury doesn't provide market price data
        Returns empty DataFrame
        """
        return pd.DataFrame(columns=["date", "open", "high", "low", "close", "volume"])

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
