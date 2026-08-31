"""
Liquidity Score Engine
Calculates USD liquidity score from multiple components
"""
import os
import yaml
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class LiquidityEngine:
    """
    USD Liquidity Score calculation engine

    Combines multiple liquidity indicators into a single score (-100 to +100)
    """

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize liquidity engine with configuration

        Args:
            config_path: Path to liquidity_weights.yaml config file
        """
        if config_path is None:
            config_path = os.path.join("config", "liquidity_weights.yaml")

        self.config = self._load_config(config_path)
        self.components = self.config.get("components", {})
        self.normalization = self.config.get("normalization", {})
        self.regimes = self.config.get("regimes", {})

    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from YAML file"""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            logger.warning(f"Config file not found: {config_path}, using defaults")
            return self._get_default_config()

    def _get_default_config(self) -> Dict:
        """Get default configuration if file not found"""
        return {
            "components": {
                "tga_change": {"weight": 0.20, "direction": "inverse", "lookback_days": 30},
                "rrp_change": {"weight": 0.25, "direction": "inverse", "lookback_days": 30},
                "fed_balance_sheet_change": {"weight": 0.30, "direction": "direct", "lookback_days": 90},
                "reserves_change": {"weight": 0.15, "direction": "direct", "lookback_days": 30},
                "m2_trend": {"weight": 0.10, "direction": "direct", "lookback_days": 90}
            },
            "normalization": {
                "method": "z_score",
                "rolling_window": 252,
                "clip_std": 3.0
            },
            "regimes": {
                "strongly_expanding": {"min": 60, "max": 100, "label": "STRONGLY EXPANDING"},
                "expanding": {"min": 20, "max": 59, "label": "EXPANDING"},
                "neutral": {"min": -19, "max": 19, "label": "NEUTRAL"},
                "contracting": {"min": -59, "max": -20, "label": "CONTRACTING"},
                "strongly_contracting": {"min": -100, "max": -60, "label": "STRONGLY CONTRACTING"}
            }
        }

    def calculate_component_score(
        self,
        series: pd.DataFrame,
        component_key: str
    ) -> float:
        """
        Calculate score for a single component

        Args:
            series: DataFrame with 'date' and 'value' columns
            component_key: Key for component config

        Returns:
            Component score (normalized)
        """
        if series.empty:
            logger.warning(f"Empty series for component {component_key}")
            return 0.0

        component_config = self.components.get(component_key, {})
        lookback_days = component_config.get("lookback_days", 30)
        direction = component_config.get("direction", "direct")

        # Calculate change over lookback period
        series = series.sort_values('date')
        if len(series) < 2:
            return 0.0

        # Get most recent value and lookback value
        current_date = series['date'].iloc[-1]
        lookback_date = current_date - timedelta(days=lookback_days)

        # Find closest date to lookback
        series['date_diff'] = abs((series['date'] - lookback_date).dt.days)
        lookback_row = series.loc[series['date_diff'].idxmin()]

        current_value = series['value'].iloc[-1]
        lookback_value = lookback_row['value']

        # Calculate percentage change
        if lookback_value == 0:
            pct_change = 0.0
        else:
            pct_change = (current_value - lookback_value) / abs(lookback_value) * 100

        # Apply direction
        if direction == "inverse":
            pct_change = -pct_change

        # Normalize using z-score
        window = self.normalization.get("rolling_window", 252)
        clip_std = self.normalization.get("clip_std", 3.0)

        if len(series) > window:
            historical_changes = []
            for i in range(window, len(series)):
                hist_current = series['value'].iloc[i]
                hist_lookback = series['value'].iloc[max(0, i - lookback_days)]
                if hist_lookback != 0:
                    hist_pct = (hist_current - hist_lookback) / abs(hist_lookback) * 100
                    if direction == "inverse":
                        hist_pct = -hist_pct
                    historical_changes.append(hist_pct)

            if historical_changes:
                mean = np.mean(historical_changes)
                std = np.std(historical_changes)
                if std > 0:
                    z_score = (pct_change - mean) / std
                    z_score = np.clip(z_score, -clip_std, clip_std)
                    # Scale to -100 to +100
                    normalized_score = (z_score / clip_std) * 100
                    return normalized_score

        # If not enough history, return simple scaled value
        return np.clip(pct_change, -100, 100)

    def calculate_liquidity_score(
        self,
        tga_series: pd.DataFrame,
        rrp_series: pd.DataFrame,
        fed_bs_series: pd.DataFrame,
        reserves_series: pd.DataFrame,
        m2_series: pd.DataFrame
    ) -> Tuple[float, Dict[str, float]]:
        """
        Calculate composite liquidity score

        Args:
            tga_series: TGA balance series
            rrp_series: RRP series
            fed_bs_series: Fed balance sheet series
            reserves_series: Bank reserves series
            m2_series: M2 money supply series

        Returns:
            Tuple of (composite_score, component_scores_dict)
        """
        component_scores = {}

        # Calculate individual component scores
        component_scores['tga_score'] = self.calculate_component_score(
            tga_series, 'tga_change'
        )
        component_scores['rrp_score'] = self.calculate_component_score(
            rrp_series, 'rrp_change'
        )
        component_scores['fed_bs_score'] = self.calculate_component_score(
            fed_bs_series, 'fed_balance_sheet_change'
        )
        component_scores['reserves_score'] = self.calculate_component_score(
            reserves_series, 'reserves_change'
        )
        component_scores['m2_score'] = self.calculate_component_score(
            m2_series, 'm2_trend'
        )

        # Calculate weighted composite score
        composite_score = 0.0
        total_weight = 0.0

        for component_key, config in self.components.items():
            score_key = component_key.replace('_change', '_score').replace('_trend', '_score')
            if score_key in component_scores:
                weight = config.get('weight', 0.0)
                composite_score += component_scores[score_key] * weight
                total_weight += weight

        # Normalize by total weight
        if total_weight > 0:
            composite_score = composite_score / total_weight * 100  # Already normalized to -100 to +100

        # Clip to valid range
        composite_score = np.clip(composite_score, -100, 100)

        return composite_score, component_scores

    def get_regime(self, liquidity_score: float) -> Tuple[str, str]:
        """
        Determine liquidity regime from score

        Args:
            liquidity_score: Score from -100 to +100

        Returns:
            Tuple of (regime_key, regime_label)
        """
        for regime_key, regime_config in self.regimes.items():
            min_val = regime_config.get('min', -100)
            max_val = regime_config.get('max', 100)

            if min_val <= liquidity_score <= max_val:
                label = regime_config.get('label', regime_key.upper())
                return regime_key, label

        # Default to neutral if no match
        return 'neutral', 'NEUTRAL'

    def calculate_regime_confidence(
        self,
        liquidity_score: float,
        historical_scores: pd.Series
    ) -> float:
        """
        Calculate confidence in current regime

        Args:
            liquidity_score: Current score
            historical_scores: Historical scores for context

        Returns:
            Confidence score (0-100)
        """
        if historical_scores.empty or len(historical_scores) < 10:
            return 50.0  # Default medium confidence

        # Calculate volatility
        volatility = historical_scores.tail(30).std()
        if volatility == 0:
            return 100.0

        # Lower volatility = higher confidence
        # Normalize volatility to confidence
        max_volatility = 50.0  # Max expected volatility
        normalized_volatility = min(volatility / max_volatility, 1.0)
        confidence = (1.0 - normalized_volatility) * 100

        return np.clip(confidence, 0, 100)
