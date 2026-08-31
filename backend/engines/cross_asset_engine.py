"""
Cross-Asset Engine
Analyzes cross-asset relationships and sensitivities
"""
import os
import yaml
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class CrossAssetEngine:
    """
    Cross-Asset Analysis Engine

    Determines asset behavior based on liquidity and market regimes
    """

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize cross-asset engine

        Args:
            config_path: Path to asset_sensitivity.yaml config file
        """
        if config_path is None:
            config_path = os.path.join(
                os.path.dirname(__file__), '..', '..', 'config', 'asset_sensitivity.yaml'
            )

        self.config = self._load_config(config_path)
        self.assets = self.config.get("assets", {})
        self.regime_behaviors = self.config.get("regime_behaviors", {})

    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from YAML file"""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            logger.warning(f"Config file not found: {config_path}, using defaults")
            return self._get_default_config()

    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        return {
            "assets": {
                "BTC": {
                    "name": "Bitcoin",
                    "sensitivities": {
                        "liquidity": "VERY_HIGH",
                        "usd": "HIGH",
                        "rates": "MEDIUM"
                    }
                },
                "GOLD": {
                    "name": "Gold",
                    "sensitivities": {
                        "liquidity": "HIGH",
                        "usd": "VERY_HIGH",
                        "real_yields": "VERY_HIGH"
                    }
                },
                "SPX": {
                    "name": "S&P 500",
                    "sensitivities": {
                        "liquidity": "HIGH",
                        "rates": "HIGH",
                        "risk_appetite": "VERY_HIGH"
                    }
                },
                "NASDAQ": {
                    "name": "Nasdaq",
                    "sensitivities": {
                        "liquidity": "VERY_HIGH",
                        "rates": "VERY_HIGH",
                        "risk_appetite": "VERY_HIGH"
                    }
                }
            },
            "regime_behaviors": {
                "EXPANDING_LIQUIDITY": {
                    "BTC": "BULLISH",
                    "GOLD": "BULLISH",
                    "SPX": "BULLISH",
                    "NASDAQ": "VERY_BULLISH"
                },
                "CONTRACTING_LIQUIDITY": {
                    "BTC": "BEARISH",
                    "GOLD": "NEUTRAL",
                    "SPX": "BEARISH",
                    "NASDAQ": "VERY_BEARISH"
                }
            }
        }

    def get_asset_sensitivity(self, asset: str) -> Dict:
        """
        Get sensitivity profile for an asset

        Args:
            asset: Asset symbol (BTC, GOLD, SPX, etc.)

        Returns:
            Dictionary with sensitivity information
        """
        asset_upper = asset.upper()
        asset_config = self.assets.get(asset_upper, {})

        if not asset_config:
            logger.warning(f"Unknown asset: {asset}")
            return {
                "name": asset,
                "sensitivities": {},
                "description": "Unknown asset"
            }

        return {
            "asset": asset_upper,
            "name": asset_config.get("name", asset),
            "liquidity_sensitivity": asset_config.get("sensitivities", {}).get("liquidity", "MEDIUM"),
            "usd_sensitivity": asset_config.get("sensitivities", {}).get("usd", "MEDIUM"),
            "rates_sensitivity": asset_config.get("sensitivities", {}).get("rates", "MEDIUM"),
            "description": asset_config.get("description", "")
        }

    def get_regime_bias(
        self,
        asset: str,
        liquidity_regime: str,
        usd_regime: Optional[str] = None,
        rates_regime: Optional[str] = None
    ) -> str:
        """
        Get asset bias for given regime(s)

        Args:
            asset: Asset symbol
            liquidity_regime: Liquidity regime (EXPANDING, CONTRACTING, etc.)
            usd_regime: USD regime (optional)
            rates_regime: Rates regime (optional)

        Returns:
            Bias string (BULLISH, BEARISH, NEUTRAL, VERY_BULLISH, VERY_BEARISH)
        """
        asset_upper = asset.upper()

        # Map regime to behavior key
        regime_key = self._map_regime_to_key(liquidity_regime)

        behaviors = self.regime_behaviors.get(regime_key, {})
        bias = behaviors.get(asset_upper, "NEUTRAL")

        return bias

    def _map_regime_to_key(self, regime: str) -> str:
        """Map regime enum to behavior key"""
        regime_upper = regime.upper()

        if "EXPANDING" in regime_upper:
            return "EXPANDING_LIQUIDITY"
        elif "CONTRACTING" in regime_upper:
            return "CONTRACTING_LIQUIDITY"
        else:
            return "NEUTRAL_LIQUIDITY"

    def get_cross_asset_summary(
        self,
        liquidity_regime: str,
        usd_regime: Optional[str] = None
    ) -> List[Dict]:
        """
        Get summary of all assets for given regimes

        Args:
            liquidity_regime: Current liquidity regime
            usd_regime: Current USD regime (optional)

        Returns:
            List of dictionaries with asset summaries
        """
        summary = []

        for asset_key in self.assets.keys():
            sensitivity = self.get_asset_sensitivity(asset_key)
            bias = self.get_regime_bias(asset_key, liquidity_regime, usd_regime)

            summary.append({
                "asset": asset_key,
                "name": sensitivity["name"],
                "liquidity_sensitivity": sensitivity["liquidity_sensitivity"],
                "usd_sensitivity": sensitivity["usd_sensitivity"],
                "regime_bias": bias
            })

        return summary
