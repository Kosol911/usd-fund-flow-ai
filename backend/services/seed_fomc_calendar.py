"""
Seed official FOMC meeting / press conference / Jackson Hole calendar for 2026-2027.
Dates sourced from federalreserve.gov official press release (monetary20250905a.htm).
Times are approximate Thai-local announcement windows converted to UTC.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from models import SessionLocal
from models.database import Event, EventCategory, EventStatus

# (year, month, day, is_dot_plot, label_suffix)
FOMC_2026 = [
    (2026, 1, 29, False, ""),
    (2026, 3, 19, True, ""),
    (2026, 4, 30, False, ""),
    (2026, 6, 18, True, ""),
    (2026, 7, 30, False, ""),
    (2026, 9, 17, True, ""),
    (2026, 10, 29, False, ""),
    (2026, 12, 10, True, ""),
]
JACKSON_HOLE_2026 = (2026, 8, 28)

FOMC_2027 = [
    (2027, 1, 28, False, ""),
    (2027, 3, 18, True, ""),
    (2027, 4, 29, False, ""),
    (2027, 6, 17, True, ""),
    (2027, 7, 29, False, ""),
    (2027, 9, 16, True, ""),
    (2027, 10, 28, False, ""),
    (2027, 12, 9, True, ""),
]
JACKSON_HOLE_2027 = (2027, 8, 27)


def thai_to_utc(year, month, day, hour=1, minute=30):
    """Thai announcement date/time -> UTC datetime (Thai = UTC+7)."""
    thai_dt = datetime(year, month, day, hour, minute)
    return thai_dt - timedelta(hours=7)


def build_fomc_events(meetings):
    events = []
    for year, month, day, is_dot_plot, _ in meetings:
        release_utc = thai_to_utc(year, month, day)
        name = "FOMC Rate Decision"
        if is_dot_plot:
            name += " + Dot Plot & Economic Projections"
        events.append({
            "event_name": name,
            "event_key": f"FOMC_{year}_{month:02d}",
            "category": EventCategory.FED,
            "release_datetime_utc": release_utc,
            "importance": 10,
        })
    return events


def build_jackson_hole(year, month, day):
    release_utc = thai_to_utc(year, month, day, hour=23, minute=0)  # Fri morning MT -> late evening Thai time
    return {
        "event_name": "Jackson Hole Economic Symposium (Fed Chair Speech)",
        "event_key": f"JACKSON_HOLE_{year}",
        "category": EventCategory.FED,
        "release_datetime_utc": release_utc,
        "importance": 10,
    }


def seed():
    db = SessionLocal()
    now = datetime.utcnow()

    all_events = (
        build_fomc_events(FOMC_2026)
        + [build_jackson_hole(*JACKSON_HOLE_2026)]
        + build_fomc_events(FOMC_2027)
        + [build_jackson_hole(*JACKSON_HOLE_2027)]
    )

    added = 0
    for ev in all_events:
        existing = db.query(Event).filter(Event.event_key == ev["event_key"]).first()
        status = EventStatus.COMPLETED if ev["release_datetime_utc"] < now else EventStatus.SCHEDULED
        if existing:
            existing.event_name = ev["event_name"]
            existing.release_datetime_utc = ev["release_datetime_utc"]
            existing.importance = ev["importance"]
            existing.status = status
        else:
            db.add(Event(
                event_name=ev["event_name"],
                event_key=ev["event_key"],
                category=ev["category"],
                country="US",
                currency="USD",
                release_datetime_utc=ev["release_datetime_utc"],
                importance=ev["importance"],
                status=status,
            ))
            added += 1

    db.commit()
    total = db.query(Event).filter(Event.event_key.like("FOMC_%") | Event.event_key.like("JACKSON_HOLE_%")).count()
    print(f"FOMC/Jackson Hole calendar seeded. Added {added} new, total FOMC-family events: {total}")
    db.close()


if __name__ == "__main__":
    seed()
