"""
Provider Factory
Manages data provider instances and fallback logic
"""
import os
import logging
from typing import Optional
from providers.base import DataProvider
from providers.fred_provider import FREDProvider
from providers.treasury_provider import TreasuryProvider
from providers.mock_provider import MockProvider

logger = logging.getLogger(__name__)


class ProviderFactory:
    """
    Factory for creating and managing data providers
    Implements fallback to mock provider when real APIs unavailable
    """

    def __init__(self, force_mock: bool = False):
        """
        Args:
            force_mock: Force use of mock provider regardless of API keys
        """
        self.force_mock = force_mock or os.getenv("MOCK_MODE", "false").lower() == "true"
        self._fred_provider: Optional[FREDProvider] = None
        self._treasury_provider: Optional[TreasuryProvider] = None
        self._mock_provider: Optional[MockProvider] = None

    def get_fred_provider(self) -> DataProvider:
        """
        Get FRED provider or fallback to mock

        Returns:
            DataProvider instance
        """
        if self.force_mock:
            logger.info("MOCK_MODE enabled - using mock FRED data")
            return self._get_mock_provider()

        if self._fred_provider is None:
            self._fred_provider = FREDProvider()

        if not self._fred_provider.is_available():
            logger.warning("FRED API key not configured - falling back to mock data")
            return self._get_mock_provider()

        return self._fred_provider

    def get_treasury_provider(self) -> DataProvider:
        """
        Get Treasury provider or fallback to mock

        Returns:
            DataProvider instance
        """
        if self.force_mock:
            logger.info("MOCK_MODE enabled - using mock Treasury data")
            return self._get_mock_provider()

        if self._treasury_provider is None:
            self._treasury_provider = TreasuryProvider()

        if not self._treasury_provider.is_available():
            logger.warning("Treasury API unavailable - falling back to mock data")
            return self._get_mock_provider()

        return self._treasury_provider

    def _get_mock_provider(self) -> MockProvider:
        """Get or create mock provider singleton"""
        if self._mock_provider is None:
            self._mock_provider = MockProvider()
        return self._mock_provider

    async def close_all(self):
        """Close all provider HTTP clients"""
        if self._fred_provider:
            await self._fred_provider.close()
        if self._treasury_provider:
            await self._treasury_provider.close()
        if self._mock_provider:
            await self._mock_provider.close()


# Global provider factory instance
_provider_factory: Optional[ProviderFactory] = None


def get_provider_factory() -> ProviderFactory:
    """
    Get global provider factory singleton

    Returns:
        ProviderFactory instance
    """
    global _provider_factory
    if _provider_factory is None:
        _provider_factory = ProviderFactory()
    return _provider_factory


async def shutdown_providers():
    """Shutdown all providers - call on application shutdown"""
    global _provider_factory
    if _provider_factory:
        await _provider_factory.close_all()
        _provider_factory = None
