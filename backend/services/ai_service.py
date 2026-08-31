"""
AI Service - Kimi K3 Integration
Provides AI-powered analysis using Kimi K3 API
"""
import os
import httpx
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class KimiK3Service:
    """
    Kimi K3 AI Service

    Provides AI analysis for:
    - Event importance scoring
    - Market sentiment analysis
    - Cross-asset impact prediction
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Kimi K3 service

        Args:
            api_key: Kimi API key (defaults to env var)
        """
        self.api_key = api_key or os.getenv("KIMI_API_KEY")
        self.base_url = os.getenv("KIMI_API_URL", "https://api.knplabai.com/v1")
        self.model = os.getenv("KIMI_MODEL", "kimi-k3")
        self.client = httpx.AsyncClient(timeout=30.0)

        if not self.api_key:
            logger.warning("KIMI_API_KEY not set - AI features will be disabled")

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()

    async def _call_api(self, messages: List[Dict[str, str]],
                       temperature: float = 0.7,
                       max_tokens: int = 1000) -> Optional[str]:
        """
        Call Kimi K3 API

        Args:
            messages: Conversation messages
            temperature: Response randomness (0.0-1.0)
            max_tokens: Maximum response length

        Returns:
            AI response text or None if error
        """
        if not self.api_key:
            logger.warning("Kimi API key not configured")
            return None

        try:
            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                }
            )

            response.raise_for_status()
            data = response.json()

            return data["choices"][0]["message"]["content"]

        except httpx.HTTPError as e:
            logger.error(f"Kimi API error: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error calling Kimi API: {e}")
            return None

    async def analyze_event_importance(self,
                                      event_name: str,
                                      category: str,
                                      forecast: Optional[float] = None,
                                      previous: Optional[float] = None) -> Dict[str, Any]:
        """
        Analyze economic event importance using AI

        Args:
            event_name: Name of the event (e.g., "CPI", "FOMC")
            category: Event category (e.g., "INFLATION", "FED")
            forecast: Forecasted value
            previous: Previous value

        Returns:
            Dict with importance_score (0-10), reasoning, and market_impact
        """
        if not self.api_key:
            # Fallback to rule-based scoring
            return self._fallback_importance(event_name, category)

        prompt = f"""Analyze the importance of this economic event for USD liquidity and market impact:

Event: {event_name}
Category: {category}
Forecast: {forecast if forecast else 'N/A'}
Previous: {previous if previous else 'N/A'}

Rate importance on scale 1-10 (10 = extremely important like FOMC/CPI, 1 = minimal impact).
Provide response in JSON format:
{{
    "importance_score": <number 1-10>,
    "reasoning": "<brief explanation>",
    "market_impact": "<expected market reaction>"
}}"""

        messages = [
            {"role": "system", "content": "You are a financial analyst specializing in USD liquidity and macroeconomic events."},
            {"role": "user", "content": prompt}
        ]

        response = await self._call_api(messages, temperature=0.3, max_tokens=500)

        if response:
            try:
                import json
                # Extract JSON from response
                start = response.find("{")
                end = response.rfind("}") + 1
                if start >= 0 and end > start:
                    result = json.loads(response[start:end])
                    return result
            except Exception as e:
                logger.error(f"Failed to parse AI response: {e}")

        # Fallback
        return self._fallback_importance(event_name, category)

    def _fallback_importance(self, event_name: str, category: str) -> Dict[str, Any]:
        """
        Fallback rule-based importance scoring

        Args:
            event_name: Event name
            category: Event category

        Returns:
            Dict with importance score and reasoning
        """
        # Rule-based scoring
        high_impact_events = {
            "FOMC": 10, "CPI": 10, "NFP": 9, "PCE": 9,
            "FOMC Minutes": 8, "Powell Speech": 9,
            "GDP": 7, "Retail Sales": 6, "PPI": 7
        }

        importance = high_impact_events.get(event_name, 5)

        return {
            "importance_score": importance,
            "reasoning": f"Rule-based scoring for {event_name}",
            "market_impact": "Standard market reaction expected"
        }

    async def analyze_liquidity_regime(self,
                                      liquidity_score: float,
                                      components: Dict[str, float]) -> Dict[str, Any]:
        """
        Analyze liquidity regime using AI

        Args:
            liquidity_score: Current liquidity score (-100 to +100)
            components: Component scores (TGA, RRP, Fed BS, etc.)

        Returns:
            Dict with regime analysis and outlook
        """
        if not self.api_key:
            return {
                "regime": self._get_regime_from_score(liquidity_score),
                "outlook": "Rule-based analysis",
                "recommendation": "Monitor liquidity components"
            }

        prompt = f"""Analyze current USD liquidity conditions:

Liquidity Score: {liquidity_score} (range: -100 to +100)
Components:
- TGA: {components.get('tga', 0):.1f}
- RRP: {components.get('rrp', 0):.1f}
- Fed Balance Sheet: {components.get('fed_bs', 0):.1f}
- Reserves: {components.get('reserves', 0):.1f}
- M2: {components.get('m2', 0):.1f}

Provide analysis in JSON format:
{{
    "regime": "<EXPANDING|NEUTRAL|CONTRACTING>",
    "outlook": "<market outlook>",
    "recommendation": "<trading recommendation>",
    "key_drivers": "<main factors>"
}}"""

        messages = [
            {"role": "system", "content": "You are a USD liquidity expert analyzing Federal Reserve and Treasury operations."},
            {"role": "user", "content": prompt}
        ]

        response = await self._call_api(messages, temperature=0.4, max_tokens=600)

        if response:
            try:
                import json
                start = response.find("{")
                end = response.rfind("}") + 1
                if start >= 0 and end > start:
                    return json.loads(response[start:end])
            except Exception as e:
                logger.error(f"Failed to parse AI response: {e}")

        # Fallback
        return {
            "regime": self._get_regime_from_score(liquidity_score),
            "outlook": "Mixed signals in liquidity conditions",
            "recommendation": "Monitor Fed operations and TGA movements"
        }

    def _get_regime_from_score(self, score: float) -> str:
        """Get regime from liquidity score"""
        if score >= 20:
            return "EXPANDING"
        elif score <= -20:
            return "CONTRACTING"
        else:
            return "NEUTRAL"

    async def generate_event_summary(self, events: List[Dict[str, Any]]) -> str:
        """
        Generate AI summary of upcoming events

        Args:
            events: List of upcoming events

        Returns:
            Natural language summary
        """
        if not self.api_key or not events:
            return "Multiple economic events scheduled this week."

        events_text = "\n".join([
            f"- {e['name']} ({e['category']}): {e['date']}"
            for e in events[:10]  # Limit to 10 events
        ])

        prompt = f"""Summarize these upcoming economic events and their potential market impact:

{events_text}

Provide a brief 2-3 sentence summary highlighting the most important events."""

        messages = [
            {"role": "system", "content": "You are a financial news analyst providing concise market summaries."},
            {"role": "user", "content": prompt}
        ]

        response = await self._call_api(messages, temperature=0.6, max_tokens=300)

        return response or "Key economic events scheduled this week including monetary policy updates."


# Global instance
_kimi_service: Optional[KimiK3Service] = None


def get_kimi_service() -> KimiK3Service:
    """
    Get global Kimi K3 service instance

    Returns:
        KimiK3Service instance
    """
    global _kimi_service
    if _kimi_service is None:
        _kimi_service = KimiK3Service()
    return _kimi_service


async def shutdown_kimi_service():
    """Shutdown Kimi service"""
    global _kimi_service
    if _kimi_service:
        await _kimi_service.close()
        _kimi_service = None
