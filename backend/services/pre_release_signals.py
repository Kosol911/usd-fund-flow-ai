"""
Pre-release signals — leading indicators that lead official prints by 2-4 weeks.

Two feeds:
  1. DOL ETA-539 initial/continuing claims (free, no key). The week containing the
     12th is the BLS establishment-survey reference week, so that week's claims are
     the earliest hard read on the next NFP print.
  2. Truflation daily US inflation index (needs TRUFLATION_API_KEY; skipped without
     one). Leads BLS CPI by roughly 41 days, so it moves before any CPI nowcast does.
"""
import asyncio
import csv
import io
import json
import logging
import os
import tempfile
from datetime import datetime, date, timedelta

import httpx

logger = logging.getLogger(__name__)

DOL_CLAIMS_URL = "https://oui.doleta.gov/unemploy/csv/ar539.csv"
TRUFLATION_URL = "https://api.truflation.com/api/v1/feed/truflation/dashboard-data-us"

_CACHE_DIR = tempfile.gettempdir()
_CLAIMS_CACHE = os.path.join(_CACHE_DIR, "dol_claims_cache.json")
_CLAIMS_TTL = 43200  # 12h — DOL publishes weekly, no value in hammering a 13MB file

# ETA-539 column offsets
_COL_WEEK_ENDED = 3
_COL_INITIAL_CLAIMS = 4
_COL_CONTINUED_CLAIMS = 9

SERIES_INITIAL_CLAIMS = "claims_ic_nsa"
SERIES_CONTINUED_CLAIMS = "claims_cc_nsa"
SERIES_TRUFLATION = "truflation_us"


def survey_week_ending(year: int, month: int) -> date:
    """Reference week for the month's payroll survey — the Saturday on/after the 12th."""
    d = date(year, month, 12)
    return d + timedelta(days=(5 - d.weekday()) % 7)


def _next_nfp_reference_month(today: date) -> tuple[int, int]:
    """
    Reference month of the NFP print that has not been released yet. Payrolls for
    month M land on the first Friday of M+1, so before that Friday we are still
    waiting on M-1's print.
    """
    first = date(today.year, today.month, 1)
    first_friday = first + timedelta(days=(4 - first.weekday()) % 7)
    if today <= first_friday:
        prev = first - timedelta(days=1)
        return prev.year, prev.month
    return today.year, today.month


def _load_claims_cache() -> dict | None:
    try:
        if os.path.exists(_CLAIMS_CACHE):
            with open(_CLAIMS_CACHE) as f:
                cached = json.load(f)
            if datetime.utcnow().timestamp() - cached.get("ts", 0) < _CLAIMS_TTL:
                return cached
    except Exception as e:
        logger.warning(f"claims cache read failed: {e}")
    return None


def _save_claims_cache(weeks: dict):
    try:
        with open(_CLAIMS_CACHE, "w") as f:
            json.dump({"ts": datetime.utcnow().timestamp(), "weeks": weeks}, f)
    except Exception as e:
        logger.warning(f"claims cache write failed: {e}")


async def fetch_claims() -> dict[str, dict]:
    """
    National weekly claims keyed by week-ending date (YYYY-MM-DD).

    DOL publishes per-state rows only, so the national figure is the sum across
    states. That sum is NOT seasonally adjusted and will not match the headline
    SA number the wires report.
    """
    cached = _load_claims_cache()
    if cached:
        logger.info(f"claims cache hit ({len(cached['weeks'])} weeks)")
        return cached["weeks"]

    cutoff = (date.today() - timedelta(days=550)).isoformat()
    weeks: dict[str, dict] = {}

    try:
        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            r = await client.get(DOL_CLAIMS_URL, headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code != 200:
                logger.warning(f"DOL claims HTTP {r.status_code}")
                return {}

            for row in csv.reader(io.StringIO(r.text)):
                if len(row) <= _COL_CONTINUED_CLAIMS or row[0] == "st":
                    continue
                week_end = row[_COL_WEEK_ENDED]
                if week_end < cutoff:
                    continue
                try:
                    ic = int(row[_COL_INITIAL_CLAIMS])
                    cc = int(row[_COL_CONTINUED_CLAIMS])
                except ValueError:
                    continue
                slot = weeks.setdefault(week_end, {"initial": 0, "continued": 0})
                slot["initial"] += ic
                slot["continued"] += cc
    except Exception as e:
        logger.warning(f"DOL claims fetch failed: {e}")
        return {}

    logger.info(f"DOL claims fetched: {len(weeks)} weeks, latest {max(weeks) if weeks else 'none'}")
    _save_claims_cache(weeks)
    return weeks


async def fetch_truflation() -> dict | None:
    """Latest Truflation US index reading, or None when no key is configured."""
    api_key = os.getenv("TRUFLATION_API_KEY")
    if not api_key:
        logger.info("TRUFLATION_API_KEY not set — skipping Truflation feed")
        return None

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(TRUFLATION_URL, headers={"x-api-key": api_key})
            if r.status_code == 401:
                logger.warning("Truflation rejected the API key")
                return None
            if r.status_code != 200:
                logger.warning(f"Truflation HTTP {r.status_code}")
                return None
            payload = r.json()
    except Exception as e:
        logger.warning(f"Truflation fetch failed: {e}")
        return None

    rows = payload if isinstance(payload, list) else payload.get("data") or []
    points = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        raw_date, raw_value = row.get("date"), row.get("value")
        if raw_date is None or raw_value is None:
            continue
        try:
            points.append((str(raw_date)[:10], float(raw_value)))
        except (TypeError, ValueError):
            continue

    if not points:
        logger.warning("Truflation returned no usable points")
        return None

    points.sort()
    return {"points": points, "latest_date": points[-1][0], "latest_value": points[-1][1]}


def _upsert_series(db, series_key: str, series_id: str, name: str,
                   points: list[tuple[str, float]], unit: str, frequency: str, source: str):
    from models.database import EconomicSeries

    existing = {
        row.date.date().isoformat(): row
        for row in db.query(EconomicSeries).filter(EconomicSeries.series_key == series_key).all()
    }
    written = 0
    for day, value in points:
        row = existing.get(day)
        if row is not None:
            if row.value != value:
                row.value = value
                row.retrieved_at = datetime.utcnow()
                written += 1
            continue
        db.add(EconomicSeries(
            series_key=series_key,
            series_id=series_id,
            name=name,
            date=datetime.fromisoformat(day),
            value=value,
            unit=unit,
            frequency=frequency,
            source=source,
        ))
        written += 1
    return written


async def sync_pre_release_signals(db) -> dict:
    """Pull both feeds into economic_series. Returns per-feed row counts."""
    result = {"claims": 0, "truflation": 0}

    weeks = await fetch_claims()
    if weeks:
        result["claims"] = _upsert_series(
            db, SERIES_INITIAL_CLAIMS, "ETA539_IC", "Initial Claims (NSA, national)",
            [(d, float(v["initial"])) for d, v in weeks.items()],
            "claims", "Weekly", "DOL",
        )
        result["claims"] += _upsert_series(
            db, SERIES_CONTINUED_CLAIMS, "ETA539_CC", "Continued Claims (NSA, national)",
            [(d, float(v["continued"])) for d, v in weeks.items()],
            "claims", "Weekly", "DOL",
        )

    truflation = await fetch_truflation()
    if truflation:
        result["truflation"] = _upsert_series(
            db, SERIES_TRUFLATION, "TRUFLATION_US", "Truflation US Inflation Index",
            truflation["points"], "percent", "Daily", "Truflation",
        )

    if result["claims"] or result["truflation"]:
        db.commit()
    logger.info(f"pre-release sync: {result}")
    return result


def build_signal_summary(db) -> dict:
    """Shape the stored series into what the dashboard renders."""
    from models.database import EconomicSeries

    def series(key: str) -> list[tuple[date, float]]:
        rows = db.query(EconomicSeries).filter(
            EconomicSeries.series_key == key
        ).order_by(EconomicSeries.date.asc()).all()
        return [(r.date.date(), r.value) for r in rows]

    today = date.today()
    ref_year, ref_month = _next_nfp_reference_month(today)
    target_week = survey_week_ending(ref_year, ref_month)
    prior_week = survey_week_ending(
        ref_year - 1 if ref_month == 1 else ref_year,
        12 if ref_month == 1 else ref_month - 1,
    )

    initial = series(SERIES_INITIAL_CLAIMS)
    by_week = dict(initial)

    claims = {
        "available": bool(initial),
        "reference_month": f"{ref_year}-{ref_month:02d}",
        "survey_week_ending": target_week.isoformat(),
        "survey_week_claims": by_week.get(target_week),
        "prior_survey_week_ending": prior_week.isoformat(),
        "prior_survey_week_claims": by_week.get(prior_week),
        "latest_week_ending": initial[-1][0].isoformat() if initial else None,
        "latest_claims": initial[-1][1] if initial else None,
        "avg_4w": round(sum(v for _, v in initial[-4:]) / len(initial[-4:])) if initial else None,
        "note": "ผลรวมรายรัฐจาก DOL — ยังไม่ปรับฤดูกาล (NSA) จึงไม่ตรงกับตัวเลขพาดหัว",
    }

    if claims["survey_week_claims"] is not None and claims["prior_survey_week_claims"]:
        delta = claims["survey_week_claims"] - claims["prior_survey_week_claims"]
        claims["survey_week_change"] = delta
        claims["survey_week_direction"] = "worse" if delta > 0 else "better"
    else:
        claims["survey_week_change"] = None
        claims["survey_week_direction"] = None
        claims["pending_reason"] = (
            f"DOL ยังไม่เผยแพร่สัปดาห์ {target_week.isoformat()} "
            "(ข้อมูลรายรัฐตามหลังตัวเลขพาดหัวประมาณ 1 สัปดาห์)"
        )

    truflation_points = series(SERIES_TRUFLATION)
    if truflation_points:
        latest_date, latest_value = truflation_points[-1]
        month_ago = [v for d, v in truflation_points if d <= latest_date - timedelta(days=30)]
        change_30d = round(latest_value - month_ago[-1], 2) if month_ago else None
        truflation = {
            "configured": True,
            "available": True,
            "latest_date": latest_date.isoformat(),
            "latest_value": round(latest_value, 2),
            "change_30d": change_30d,
            "direction": None if change_30d is None else ("up" if change_30d > 0 else "down"),
            "lead_days": 41,
            "note": "ใช้ทิศทาง ไม่ใช่ระดับ — Truflation ใช้ค่าเช่าสด ส่วน CPI ใช้ shelter แบบหน่วงเวลา",
        }
    else:
        truflation = {
            "configured": bool(os.getenv("TRUFLATION_API_KEY")),
            "available": False,
            "note": "ตั้งค่า TRUFLATION_API_KEY เพื่อเปิดใช้ฟีดนี้ (Truflation Starter ~$7/เดือน)",
        }

    return {"claims": claims, "truflation": truflation, "generated_at": datetime.utcnow().isoformat()}


async def run_signals_loop(get_db_session, interval_seconds: int = 21600):
    """Refresh both feeds every 6 hours."""
    logger.info("pre-release signals loop started (interval: 6h)")
    await asyncio.sleep(10)
    while True:
        try:
            db = next(get_db_session())
            try:
                await sync_pre_release_signals(db)
            finally:
                db.close()
        except Exception as e:
            logger.error(f"pre-release signals loop error: {e}")
        await asyncio.sleep(interval_seconds)
