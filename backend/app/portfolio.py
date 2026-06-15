"""Rich per-project intelligence data for MAX.ai — UMP Project Intelligence.

This is what lifts MAX from a single-project demo to a portfolio platform:
every project carries a completion %, workstreams, gate position, milestones
and its own risk register. T5 keeps the detailed live operational dataset
(seed.T5_OPS); the others are modelled deterministically so the engine,
dashboards, What-if simulator and Foresight all work across the whole portfolio.
"""
from __future__ import annotations
import hashlib
from datetime import date, timedelta

from .seed import T5_OPS

# Project metadata keyed by project id (mirrors seed.PROJECTS).
PROJECTS_META: dict[str, dict] = {
    "t5-baggage-programme": {
        "name": "T5 PILZ / Baggage Programme", "terminal": "T5",
        "completion": 80, "current_gate": "G6",
        "crew_baseline": 38, "crew_on_shift": 41,
        "base_bags": 24000, "capacity": 27000,
        "workstreams": [
            {"name": "HBS Screening", "pct": 88},
            {"name": "PLC / PILZ Controls", "pct": 72},
            {"name": "Commissioning / SAT", "pct": 61},
            {"name": "Reclaim", "pct": 90},
        ],
        "milestones": [
            {"name": "HBS 1/2 in service", "on_track": True},
            {"name": "HBS 3 commissioning", "on_track": False},
            {"name": "VSO T5B live", "on_track": False},
            {"name": "Nightly back-to-service", "on_track": True},
            {"name": "SAT sign-off", "on_track": False},
        ],
        "risks": T5_OPS["risks"],
    },
    "t1-reclaim": {
        "name": "T1 Reclaim Hall Refurbishment", "terminal": "T1",
        "completion": 46, "current_gate": "G4",
        "crew_baseline": 18, "crew_on_shift": 16,
        "base_bags": 9000, "capacity": 12000,
        "workstreams": [
            {"name": "Civils", "pct": 70},
            {"name": "Carousel replacement", "pct": 40},
            {"name": "Controls", "pct": 28},
        ],
        "milestones": [
            {"name": "Strip-out complete", "on_track": True},
            {"name": "Carousel delivery", "on_track": False},
            {"name": "Controls FAT", "on_track": False},
        ],
        "risks": [
            {"id": "T1R1", "title": "Carousel long-lead delivery slip", "area": "RECLAIM",
             "likelihood": 4, "impact": 4, "mitigation": "Escalate PO; qualify alternate supplier.", "owner": "Procurement"},
            {"id": "T1R2", "title": "Asbestos survey in reclaim void", "area": "RECLAIM",
             "likelihood": 3, "impact": 4, "mitigation": "Book intrusive survey before strip-out.", "owner": "Heathrow PM"},
            {"id": "T1R3", "title": "Night possession clashes with cleaning", "area": "RECLAIM",
             "likelihood": 3, "impact": 2, "mitigation": "Coordinate shared access calendar.", "owner": "Operations"},
        ],
    },
    "t2-reclaim-upgrade": {
        "name": "T2 Baggage Reclaim Upgrade", "terminal": "T2",
        "completion": 58, "current_gate": "G5",
        "crew_baseline": 22, "crew_on_shift": 20,
        "base_bags": 14000, "capacity": 18000,
        "workstreams": [
            {"name": "Conveyors", "pct": 82},
            {"name": "PLC Controls", "pct": 54},
            {"name": "Commissioning", "pct": 38},
        ],
        "milestones": [
            {"name": "Conveyor install", "on_track": True},
            {"name": "Controls integration", "on_track": False},
            {"name": "Dynamic commissioning", "on_track": False},
        ],
        "risks": [
            {"id": "T2R1", "title": "PLC controls integration behind plan", "area": "MAKEUP",
             "likelihood": 4, "impact": 4, "mitigation": "Add controls engineer; daily burndown.", "owner": "Vanderlande"},
            {"id": "T2R2", "title": "Conveyor belt tensioning rework", "area": "MAKEUP",
             "likelihood": 3, "impact": 3, "mitigation": "Re-survey tensioning; vendor attend.", "owner": "Wise/Dalkia"},
            {"id": "T2R3", "title": "SAT window contention with T5", "area": "RECLAIM",
             "likelihood": 3, "impact": 4, "mitigation": "Sequence SATs; book lab slot early.", "owner": "Heathrow PM"},
        ],
    },
    "t3-hbs-refresh": {
        "name": "T3 HBS Screening Refresh", "terminal": "T3",
        "completion": 72, "current_gate": "G6",
        "crew_baseline": 20, "crew_on_shift": 21,
        "base_bags": 12000, "capacity": 15000,
        "workstreams": [
            {"name": "Equipment", "pct": 90},
            {"name": "Software", "pct": 76},
            {"name": "Assurance", "pct": 50},
        ],
        "milestones": [
            {"name": "EDS units installed", "on_track": True},
            {"name": "Std 3 software load", "on_track": True},
            {"name": "Assurance sign-off", "on_track": False},
        ],
        "risks": [
            {"id": "T3R1", "title": "Standard 3 EDS image-quality assurance", "area": "HBS12",
             "likelihood": 3, "impact": 4, "mitigation": "Run image-quality test campaign with DfT.", "owner": "Assurance"},
            {"id": "T3R2", "title": "Software regression on Level 3 alarms", "area": "HBS12",
             "likelihood": 3, "impact": 3, "mitigation": "Regression suite before go-live.", "owner": "Vanderlande"},
        ],
    },
    "t4-ebs-resilience": {
        "name": "T4 EBS Resilience Programme", "terminal": "T4",
        "completion": 20, "current_gate": "G2",
        "crew_baseline": 14, "crew_on_shift": 12,
        "base_bags": 7000, "capacity": 11000,
        "workstreams": [
            {"name": "Feasibility", "pct": 60},
            {"name": "Business case", "pct": 22},
            {"name": "Design", "pct": 8},
        ],
        "milestones": [
            {"name": "Feasibility report", "on_track": True},
            {"name": "OBC approval", "on_track": False},
            {"name": "Concept design", "on_track": False},
        ],
        "risks": [
            {"id": "T4R1", "title": "EBS single-point-of-failure unresolved", "area": "MAKEUP",
             "likelihood": 5, "impact": 5, "mitigation": "Resilience study; identify redundancy path.", "owner": "Engineering"},
            {"id": "T4R2", "title": "OBC funding approval delayed", "area": "MAKEUP",
             "likelihood": 4, "impact": 4, "mitigation": "Escalate to investment board.", "owner": "Programme"},
            {"id": "T4R3", "title": "Resilience spec not baselined", "area": "MAKEUP",
             "likelihood": 4, "impact": 3, "mitigation": "Freeze spec at G2 gate.", "owner": "Heathrow PM"},
        ],
    },
    "ump-reference": {
        "name": "UMP Reference", "terminal": "Programme",
        "completion": 100, "current_gate": "G8",
        "crew_baseline": 0, "crew_on_shift": 0,
        "base_bags": 0, "capacity": 1,
        "workstreams": [
            {"name": "Centralised Governance", "pct": 100},
            {"name": "Integrated Resource Pool", "pct": 100},
            {"name": "Automated Intelligence", "pct": 100},
        ],
        "milestones": [],
        "risks": [],
    },
}


def _bag_series(meta: dict, days: int = 21) -> list[dict]:
    """Deterministic synthetic throughput series for non-T5 projects."""
    base, cap = meta["base_bags"], meta["capacity"]
    if base == 0:
        return []
    seed = int(hashlib.md5(meta["name"].encode()).hexdigest(), 16)
    start = date(2026, 5, 26)
    out = []
    for i in range(days):
        d = start + timedelta(days=i)
        wobble = ((seed >> (i % 24)) & 0xFF) / 255.0  # 0..1 deterministic
        weekend = d.weekday() >= 5
        planned = round(base * (0.85 if weekend else 1.0))
        actual = min(round(planned * (0.88 + 0.16 * wobble)), cap)
        out.append({"date": d.isoformat(), "planned": planned, "actual": actual,
                    "capacity": cap, "mishandled": round(actual * 0.004), "oog": round(actual * 0.02)})
    return out


def get_ops(pid: str) -> dict | None:
    """Unified ops payload (engine-compatible) for any project + its metadata."""
    meta = PROJECTS_META.get(pid)
    if not meta:
        return None
    if pid == "t5-baggage-programme":
        ops = dict(T5_OPS)
    else:
        ops = {
            "areas": T5_OPS["areas"],
            "work_log": [],
            "risks": meta["risks"],
            "bag_daily": _bag_series(meta),
        }
    ops["meta"] = meta
    return ops
