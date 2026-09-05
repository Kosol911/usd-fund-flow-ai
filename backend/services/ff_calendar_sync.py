"""
ForexFactory Calendar Sync — auto-updates actual/forecast/previous for economic events.
Polls FF JSON API every 10 minutes with caching and FRED fallback.
"""
import asyncio
import logging
import httpx
from datetime import datetime, timezone, timedelta
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)

import json
import os
import tempfile

# In-memory cache: {url: (fetched_at, data)}
_ff_cache: dict = {}
_FF_CACHE_TTL = 300  # 5 minutes

# Persistent file cache (survives restarts)
_FF_FILE_CACHE = os.path.join(tempfile.gettempdir(), "ff_cache.json")

FF_URLS = [
    "https://nfs.faireconomy.media/ff_calendar_thisweek.json?version=latest",
    "https://nfs.faireconomy.media/ff_calendar_nextweek.json?version=latest",
]

FF_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://www.forexfactory.com/",
}

# ForexFactory name → our event_key
FF_NAME_TO_KEY = {
    "nonfarm payrolls": "NFP",
    "non-farm payrolls": "NFP",
    "cpi m/m": "CPI",
    "cpi y/y": "CPI",
    "core cpi m/m": "CPI",
    "consumer price index": "CPI",
    "pce price index m/m": "PCE",
    "core pce price index m/m": "PCE",
    "pce price index": "PCE",
    "fed funds rate": "FOMC",
    "fomc statement": "FOMC",
    "gdp q/q": "GDP",
    "unemployment rate": "UNEMPLOYMENT",
    "jolts job openings": "JOLTS",
    "ism manufacturing pmi": "ISM_MFG",
    "ism services pmi": "ISM_SVC",
    "retail sales m/m": "RETAIL",
    "ppi m/m": "PPI",
}

# FRED series → event_key mapping (fallback for key indicators)
FRED_SERIES = {
    "NFP": "PAYEMS",  # Total Nonfarm Payrolls (thousands, monthly change)
    "UNEMPLOYMENT": "UNRATE",  # Unemployment Rate
}


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def _parse_value(v) -> float | None:
    if v is None or v == "" or v == "N/A":
        return None
    try:
        s = str(v).replace("%", "").replace(",", "").strip()
        # Handle K/M/B suffixes
        if s.endswith("K"):
            return float(s[:-1]) * 1000
        if s.endswith("M"):
            return float(s[:-1]) * 1_000_000
        if s.endswith("B"):
            return float(s[:-1]) * 1_000_000_000
        return float(s)
    except Exception:
        return None


def _load_file_cache() -> dict:
    """Load persistent cache from file."""
    try:
        if os.path.exists(_FF_FILE_CACHE):
            with open(_FF_FILE_CACHE, "r") as f:
                return json.load(f)
    except Exception:
        pass
    return {}


def _save_file_cache(cache: dict):
    """Save cache to file."""
    try:
        with open(_FF_FILE_CACHE, "w") as f:
            json.dump(cache, f)
    except Exception as e:
        logger.warning(f"FF file cache write error: {e}")


async def _fetch_url(client: httpx.AsyncClient, url: str) -> list:
    """Fetch one FF URL with in-memory + file caching."""
    now = datetime.utcnow().timestamp()

    # Check in-memory cache first
    if url in _ff_cache:
        fetched_at, data = _ff_cache[url]
        if now - fetched_at < _FF_CACHE_TTL:
            logger.debug(f"FF mem-cache hit: {url}")
            return data

    # Check file cache (survives restarts, TTL 30 min)
    file_cache = _load_file_cache()
    if url in file_cache:
        fc = file_cache[url]
        if now - fc["ts"] < 1800:  # 30 minute file cache
            data = fc["data"]
            _ff_cache[url] = (fc["ts"], data)
            logger.info(f"FF file-cache hit: {url} ({len(data)} events)")
            return data

    try:
        await asyncio.sleep(2.0)  # polite delay
        r = await client.get(url, headers=FF_HEADERS, timeout=20)
        if r.status_code == 200:
            data = r.json()
            _ff_cache[url] = (now, data)
            # Save to file cache
            file_cache[url] = {"ts": now, "data": data}
            _save_file_cache(file_cache)
            logger.info(f"FF fetched {len(data)} events from {url}")
            return data
        elif r.status_code == 429:
            logger.warning(f"FF rate limited: {url}")
            # Return file cache even if stale
            if url in file_cache:
                logger.info(f"FF using stale file cache ({len(file_cache[url]['data'])} events)")
                return file_cache[url]["data"]
        else:
            logger.warning(f"FF {r.status_code}: {url}")
    except Exception as e:
        logger.warning(f"FF fetch error {url}: {e}")
        if url in file_cache:
            return file_cache[url]["data"]

    # Last resort: in-memory stale cache
    if url in _ff_cache:
        return _ff_cache[url][1]
    return []


async def fetch_ff_events() -> list[dict]:
    """Fetch all ForexFactory events (this week + next week) with caching."""
    all_events = []
    async with httpx.AsyncClient() as client:
        for url in FF_URLS:
            events = await _fetch_url(client, url)
            all_events.extend(events)
    return all_events


async def fetch_fred_value(series_id: str, api_key: str = "DEMO") -> tuple[float | None, str | None]:
    """
    Fetch latest observation from FRED.
    Returns (value, date_str) or (None, None).
    Free access without API key via alternative endpoint.
    """
    # FRED public JSON endpoint (no auth needed for public series)
    url = f"https://fred.stlouisfed.org/graph/fredgraph.json?id={series_id}"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code == 200:
                data = r.json()
                obs = data.get("observations") or []
                # Sort by date descending, get latest non-null
                obs_sorted = sorted(obs, key=lambda x: x.get("date", ""), reverse=True)
                for o in obs_sorted:
                    val = o.get("value")
                    if val and val != ".":
                        return float(val), o.get("date")
    except Exception as e:
        logger.warning(f"FRED fetch error {series_id}: {e}")
    return None, None


def _match_ff_to_db(ff_events: list[dict], db_events) -> list[tuple]:
    """Match FF events to DB events by date + name similarity."""
    pairs = []
    used_ff = set()

    for db_evt in db_events:
        db_dt = db_evt.release_datetime_utc
        if db_dt.tzinfo is None:
            db_dt = db_dt.replace(tzinfo=timezone.utc)

        best_score = 0
        best_ff = None
        best_idx = None

        for idx, ff in enumerate(ff_events):
            if idx in used_ff:
                continue
            if ff.get("currency", "") not in ("USD", ""):
                continue

            try:
                ff_dt_str = ff.get("date", "")
                ff_dt = datetime.fromisoformat(ff_dt_str.replace("Z", "+00:00"))
            except Exception:
                continue

            # Same UTC day
            if ff_dt.date() != db_dt.date():
                continue

            ff_title = ff.get("title", "")
            score = _similarity(ff_title, db_evt.event_name)

            # Boost if event_key matches via name mapping
            ff_key = FF_NAME_TO_KEY.get(ff_title.lower())
            if ff_key and ff_key == db_evt.event_key:
                score += 0.4

            if score > best_score:
                best_score = score
                best_ff = ff
                best_idx = idx

        if best_ff and best_score > 0.30:
            pairs.append((db_evt, best_ff))
            if best_idx is not None:
                used_ff.add(best_idx)

    return pairs


async def sync_actuals_from_ff(db) -> int:
    """
    Main sync: fetch FF → match → update DB.
    Returns number of events updated.
    """
    from models.database import Event, EventStatus

    # Use naive UTC throughout to match DB (which stores naive datetimes)
    now_utc = datetime.utcnow()
    window_start = now_utc - timedelta(days=8)
    window_end = now_utc + timedelta(hours=2)

    db_events = db.query(Event).filter(
        Event.release_datetime_utc >= window_start,
        Event.release_datetime_utc <= window_end,
    ).all()

    if not db_events:
        logger.info("FF sync: no DB events in window")
        return 0

    ff_events = await fetch_ff_events()
    updated = 0

    if ff_events:
        pairs = _match_ff_to_db(ff_events, db_events)
        for db_evt, ff in pairs:
            actual = _parse_value(ff.get("actual"))
            forecast = _parse_value(ff.get("forecast"))
            previous = _parse_value(ff.get("previous"))
            changed = False

            if actual is not None and db_evt.actual != actual:
                db_evt.actual = actual
                db_evt.status = EventStatus.COMPLETED
                changed = True
                logger.info(f"FF→actual: {db_evt.event_name} {db_evt.release_datetime_utc.date()} = {actual}")

            if forecast is not None and db_evt.forecast != forecast:
                db_evt.forecast = forecast
                changed = True

            if previous is not None and db_evt.previous != previous:
                db_evt.previous = previous
                changed = True

            if changed:
                updated += 1
    else:
        logger.warning("FF: no events fetched (rate limited or unavailable)")

    if updated:
        db.commit()
        logger.info(f"FF sync complete: {updated} events updated")

    return updated


async def run_sync_loop(get_db_session):
    """Background loop: sync every 10 minutes."""
    logger.info("ForexFactory sync loop started (interval: 10 min)")
    # First run immediately on startup
    await asyncio.sleep(3)
    while True:
        try:
            db = next(get_db_session())
            try:
                n = await sync_actuals_from_ff(db)
                if n:
                    logger.info(f"FF loop: {n} events updated")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"FF sync loop error: {e}")
        await asyncio.sleep(600)  # 10 minutes
