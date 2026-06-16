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


# Submitted project cost, broken down by supplier (budget vs spent-to-date).
BUDGETS: dict[str, dict] = {
    "t5-baggage-programme": {"total": 4_200_000, "currency": "£", "suppliers": [
        {"name": "Vanderlande", "budget": 2_000_000, "spent": 1_750_000},
        {"name": "Dalkia", "budget": 900_000, "spent": 820_000},
        {"name": "Honeywell", "budget": 500_000, "spent": 460_000},
        {"name": "VI Commissioning", "budget": 800_000, "spent": 570_000},
    ]},
    "t1-reclaim": {"total": 1_800_000, "currency": "£", "suppliers": [
        {"name": "Wise (main contractor)", "budget": 1_100_000, "spent": 520_000},
        {"name": "Dalkia (controls)", "budget": 700_000, "spent": 280_000},
    ]},
    "t2-reclaim-upgrade": {"total": 2_600_000, "currency": "£", "suppliers": [
        {"name": "Vanderlande", "budget": 1_600_000, "spent": 980_000},
        {"name": "Dalkia", "budget": 600_000, "spent": 420_000},
        {"name": "Wise", "budget": 400_000, "spent": 200_000},
    ]},
    "t3-hbs-refresh": {"total": 1_500_000, "currency": "£", "suppliers": [
        {"name": "Vanderlande", "budget": 1_000_000, "spent": 700_000},
        {"name": "DfT assurance lab", "budget": 300_000, "spent": 180_000},
        {"name": "Software (Std 3)", "budget": 200_000, "spent": 120_000},
    ]},
    "t4-ebs-resilience": {"total": 3_000_000, "currency": "£", "suppliers": [
        {"name": "Engineering (design)", "budget": 1_200_000, "spent": 450_000},
        {"name": "Feasibility consultant", "budget": 800_000, "spent": 330_000},
        {"name": "PMO / programme", "budget": 1_000_000, "spent": 0},
    ]},
}


def get_budget(pid: str) -> dict | None:
    return BUDGETS.get(pid)


# Indicative delivery windows (start, finish) used to find schedule cross-overs.
SCHEDULES: dict[str, tuple[str, str]] = {
    "t5-baggage-programme": ("2026-05-01", "2026-07-31"),
    "t1-reclaim": ("2026-06-15", "2026-10-30"),
    "t2-reclaim-upgrade": ("2026-05-15", "2026-08-29"),
    "t3-hbs-refresh": ("2026-06-01", "2026-08-15"),
    "t4-ebs-resilience": ("2026-09-01", "2027-03-31"),
}


def get_schedule(pid: str) -> tuple[str, str] | None:
    return SCHEDULES.get(pid)


# Preferred Supplier List — procurement-authorised suppliers by category.
PSL_CATEGORIES = [
    "Building & Construction", "Software & Application", "Mitigations & Business Change",
    "Training", "Equipment", "Consultation", "Signage", "DIY",
]

PSL = [
    {"name": "Wise", "category": "Building & Construction", "contact": "Account Manager", "email": "projects@wise.example", "phone": "020 7946 0011", "services": "Civils, fit-out & structural works", "framework": "HAL-CW-114", "rating": 4.6},
    {"name": "Mace", "category": "Building & Construction", "contact": "Framework Lead", "email": "hal.framework@mace.example", "phone": "020 7946 0024", "services": "Major construction & construction PM", "framework": "HAL-CW-021", "rating": 4.7},
    {"name": "ISG", "category": "Building & Construction", "contact": "Account Manager", "email": "aviation@isg.example", "phone": "020 7946 0033", "services": "Fit-out & refurbishment", "framework": "HAL-CW-088", "rating": 4.3},

    {"name": "Vanderlande Software", "category": "Software & Application", "contact": "CST Lead", "email": "controls@vanderlande.example", "phone": "020 7946 0052", "services": "BHS control software (SCADA/PLC), CST", "framework": "HAL-SW-201", "rating": 4.5},
    {"name": "BEUMER Group", "category": "Software & Application", "contact": "Software PM", "email": "software@beumer.example", "phone": "020 7946 0058", "services": "Sortation control & optimisation software", "framework": "HAL-SW-205", "rating": 4.4},
    {"name": "SITA", "category": "Software & Application", "contact": "Account Manager", "email": "baggage@sita.example", "phone": "020 7946 0061", "services": "Airport IT & baggage messaging (BagMessage)", "framework": "HAL-SW-210", "rating": 4.2},

    {"name": "ABC Operations", "category": "Mitigations & Business Change", "contact": "Head of Operations", "email": "ops@abc.example", "phone": "020 7946 0070", "services": "Baggage mitigation staffing & operational cover", "framework": "HAL-OPS-330", "rating": 4.6},
    {"name": "DHL Supply Chain", "category": "Mitigations & Business Change", "contact": "ITO Manager", "email": "esr@dhl.example", "phone": "020 7946 0074", "services": "ESR & integrated resource pool", "framework": "HAL-OPS-331", "rating": 4.5},
    {"name": "Aretian Consulting", "category": "Mitigations & Business Change", "contact": "Transition Lead", "email": "change@aretian.example", "phone": "020 7946 0079", "services": "Business change & transition management", "framework": "HAL-BC-340", "rating": 4.1},

    {"name": "Heathrow Academy", "category": "Training", "contact": "Training Coordinator", "email": "academy@hal.example", "phone": "020 7946 0081", "services": "Operational, safety & airside training", "framework": "HAL-TR-401", "rating": 4.8},
    {"name": "RTITB", "category": "Training", "contact": "Account Manager", "email": "mhe@rtitb.example", "phone": "020 7946 0085", "services": "MHE & licence-to-operate training", "framework": "HAL-TR-405", "rating": 4.3},
    {"name": "Babcock Training", "category": "Training", "contact": "Account Manager", "email": "skills@babcock.example", "phone": "020 7946 0089", "services": "Technical skills & competency", "framework": "HAL-TR-409", "rating": 4.2},

    {"name": "Honeywell", "category": "Equipment", "contact": "Account Manager", "email": "fire@honeywell.example", "phone": "020 7946 0091", "services": "Fire-alarm & building systems", "framework": "HAL-EQ-501", "rating": 4.4},
    {"name": "Smiths Detection", "category": "Equipment", "contact": "HBS Lead", "email": "hbs@smithsdetection.example", "phone": "020 7946 0095", "services": "HBS / EDS screening equipment (Std 3)", "framework": "HAL-EQ-505", "rating": 4.6},
    {"name": "Crisplant (BEUMER)", "category": "Equipment", "contact": "Account Manager", "email": "crisplant@beumer.example", "phone": "020 7946 0098", "services": "Carousels, tilt-tray & make-up equipment", "framework": "HAL-EQ-508", "rating": 4.3},

    {"name": "Arup", "category": "Consultation", "contact": "Project Director", "email": "aviation@arup.example", "phone": "020 7946 0101", "services": "Engineering & systems consultancy", "framework": "HAL-CON-601", "rating": 4.7},
    {"name": "Mott MacDonald", "category": "Consultation", "contact": "Programme Lead", "email": "assurance@mottmac.example", "phone": "020 7946 0105", "services": "Programme, cost & assurance advisory", "framework": "HAL-CON-605", "rating": 4.5},
    {"name": "Atkins", "category": "Consultation", "contact": "Account Manager", "email": "design@atkins.example", "phone": "020 7946 0109", "services": "Design & technical advisory", "framework": "HAL-CON-609", "rating": 4.4},

    {"name": "Pearce Signs", "category": "Signage", "contact": "Account Manager", "email": "wayfinding@pearcesigns.example", "phone": "020 7946 0112", "services": "Wayfinding & statutory signage", "framework": "HAL-SG-701", "rating": 4.2},
    {"name": "ASL Group", "category": "Signage", "contact": "Account Manager", "email": "signage@aslgroup.example", "phone": "020 7946 0116", "services": "Digital & static signage", "framework": "HAL-SG-705", "rating": 4.1},

    {"name": "RS Components", "category": "DIY", "contact": "Trade Account", "email": "trade@rs.example", "phone": "020 7946 0121", "services": "Electrical, fixings & components", "framework": "HAL-DIY-801", "rating": 4.3},
    {"name": "Screwfix Trade", "category": "DIY", "contact": "Trade Desk", "email": "trade@screwfix.example", "phone": "020 7946 0125", "services": "Tools & consumables", "framework": "HAL-DIY-805", "rating": 4.4},
    {"name": "Rexel", "category": "DIY", "contact": "Account Manager", "email": "wholesale@rexel.example", "phone": "020 7946 0129", "services": "Electrical wholesale", "framework": "HAL-DIY-809", "rating": 4.0},
]
