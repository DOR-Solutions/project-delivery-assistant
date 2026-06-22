"""Seed data + DB seeding (T5 PILZ / Baggage Programme demo)."""
from datetime import datetime
import uuid
from . import models
from .database import SessionLocal

T5_DIRECTS = {
    "actual": [
        {"date": "2026-05-26", "day": "Tue", "type": "A", "bags": 24981},
        {"date": "2026-05-27", "day": "Wed", "type": "B", "bags": 21454},
        {"date": "2026-05-28", "day": "Thu", "type": "B", "bags": 21559},
        {"date": "2026-05-29", "day": "Fri", "type": "B", "bags": 23027},
        {"date": "2026-05-30", "day": "Sat", "type": "B", "bags": 23464},
        {"date": "2026-05-31", "day": "Sun", "type": "B", "bags": 23789},
        {"date": "2026-06-01", "day": "Mon", "type": "B", "bags": 23783},
        {"date": "2026-06-02", "day": "Tue", "type": "B", "bags": 21141},
        {"date": "2026-06-03", "day": "Wed", "type": "B", "bags": 21445},
        {"date": "2026-06-04", "day": "Thu", "type": "B", "bags": 23287},
        {"date": "2026-06-05", "day": "Fri", "type": "A", "bags": 24975},
        {"date": "2026-06-06", "day": "Sat", "type": "A", "bags": 26688},
        {"date": "2026-06-07", "day": "Sun", "type": "A", "bags": 25297},
        {"date": "2026-06-08", "day": "Mon", "type": "A", "bags": 25227},
    ],
    "plan": [
        {"date": "2026-06-09", "day": "Tue", "type": "B", "bags": 21448},
        {"date": "2026-06-10", "day": "Wed", "type": "B", "bags": 21497},
        {"date": "2026-06-11", "day": "Thu", "type": "B", "bags": 23023},
        {"date": "2026-06-12", "day": "Fri", "type": "A", "bags": 24428},
        {"date": "2026-06-13", "day": "Sat", "type": "A", "bags": 24065},
        {"date": "2026-06-14", "day": "Sun", "type": "B", "bags": 23906},
        {"date": "2026-06-15", "day": "Mon", "type": "A", "bags": 25262},
        {"date": "2026-06-16", "day": "Tue", "type": "B", "bags": 22516},
        {"date": "2026-06-17", "day": "Wed", "type": "B", "bags": 22004},
        {"date": "2026-06-18", "day": "Thu", "type": "B", "bags": 23848},
        {"date": "2026-06-19", "day": "Fri", "type": "A", "bags": 25042},
        {"date": "2026-06-20", "day": "Sat", "type": "A", "bags": 25400},
    ],
}

T5_MITIGATION = [
    {"date": "2026-05-05", "day": "Tue", "foh": 1087, "cdf": 0, "mip": 903, "l7": 0, "b1": 0, "total": 1990},
    {"date": "2026-05-06", "day": "Wed", "foh": 885, "cdf": 185, "mip": 801, "l7": 1, "b1": 0, "total": 1872},
    {"date": "2026-05-07", "day": "Thu", "foh": 1048, "cdf": 0, "mip": 1083, "l7": 0, "b1": 0, "total": 2131},
    {"date": "2026-05-11", "day": "Mon", "foh": 984, "cdf": 0, "mip": 853, "l7": 0, "b1": 0, "total": 1837},
    {"date": "2026-05-12", "day": "Tue", "foh": 959, "cdf": 0, "mip": 763, "l7": 0, "b1": 0, "total": 1722},
    {"date": "2026-05-13", "day": "Wed", "foh": 1063, "cdf": 0, "mip": 961, "l7": 0, "b1": 0, "total": 2024},
    {"date": "2026-05-14", "day": "Thu", "foh": 1123, "cdf": 0, "mip": 1103, "l7": 0, "b1": 0, "total": 2226},
    {"date": "2026-05-28", "day": "Thu", "foh": 1177, "cdf": 319, "mip": 975, "l7": 0, "b1": 0, "total": 2471},
    {"date": "2026-06-01", "day": "Mon", "foh": 1023, "cdf": 243, "mip": 1194, "l7": 0, "b1": 0, "total": 2460},
    {"date": "2026-06-02", "day": "Tue", "foh": 1119, "cdf": 598, "mip": 1179, "l7": 0, "b1": 0, "total": 2896},
    {"date": "2026-06-03", "day": "Wed", "foh": 1148, "cdf": 416, "mip": 1014, "l7": 0, "b1": 43, "total": 2621},
    {"date": "2026-06-04", "day": "Thu", "foh": 907, "cdf": 0, "mip": 956, "l7": 164, "b1": 0, "total": 2027},
    {"date": "2026-06-08", "day": "Mon", "foh": 415, "cdf": 0, "mip": 391, "l7": 0, "b1": 0, "total": 806},
]

T5_OPS = {
    "areas": [
        {"id": "HBS12", "name": "HBS 1/2 Screening", "capacity": 1800, "status": "in-service",
         "parallel": ["HBS3", "VSO"], "recovery_min": 90,
         "mitigation": [
             "Cross-feed hold baggage to HBS 3 and VSO via the inter-machine sorter",
             "Open manual search positions (MIP) to clear the screening backlog",
             "Throttle check-in acceptance and hold latest-bag flights to protect dieback",
             "Deploy porters to hand-carry cleared bags to make-up laterals"],
         "resources": [
             {"item": "Baggage operatives (porters)", "qty": 8, "type": "people"},
             {"item": "MIP search agents", "qty": 4, "type": "people"},
             {"item": "Vanderlande maintenance engineer", "qty": 2, "type": "engineer"},
             {"item": "Tugs + dollies", "qty": 6, "type": "equipment"}]},
        {"id": "HBS3", "name": "HBS 3 Screening", "capacity": 1200, "status": "commissioning",
         "parallel": ["HBS12", "VSO"], "recovery_min": 75,
         "mitigation": [
             "Re-route South pier flow to HBS 1/2 via cross-feed",
             "Bring forward HBS 3 commissioning crews to restore lines",
             "Open MIP positions for manual clearance"],
         "resources": [
             {"item": "Baggage operatives (porters)", "qty": 6, "type": "people"},
             {"item": "MIP search agents", "qty": 3, "type": "people"},
             {"item": "Dalkia/VI commissioning engineer", "qty": 2, "type": "engineer"},
             {"item": "Tugs + dollies", "qty": 4, "type": "equipment"}]},
        {"id": "VSO", "name": "Vertical Sortation (T5B)", "capacity": 900, "status": "commissioning",
         "parallel": ["HBS12", "HBS3"], "recovery_min": 60,
         "mitigation": [
             "Divert T5B transfer flow to HBS 1/2 early-bag store routing",
             "Use track-transit system buffer to hold bags pending restore",
             "Manual offload at T5B for connecting bags at risk"],
         "resources": [
             {"item": "Baggage operatives (porters)", "qty": 5, "type": "people"},
             {"item": "TTS controller", "qty": 1, "type": "people"},
             {"item": "Vanderlande maintenance engineer", "qty": 2, "type": "engineer"},
             {"item": "Tugs + dollies", "qty": 4, "type": "equipment"}]},
        {"id": "OOG", "name": "Out-of-gauge", "capacity": 300, "status": "in-service",
         "parallel": [], "recovery_min": 45,
         "mitigation": [
             "Switch to full manual out-of-gauge handling at the OOG dock",
             "Porter oversize bags directly to make-up / aircraft stands",
             "Brief load control on OOG bags travelling late"],
         "resources": [
             {"item": "Baggage operatives (porters)", "qty": 4, "type": "people"},
             {"item": "Flatbed trolleys", "qty": 4, "type": "equipment"},
             {"item": "Maintenance engineer", "qty": 1, "type": "engineer"}]},
        {"id": "MAKEUP", "name": "Make-up Laterals", "capacity": 1600, "status": "in-service",
         "parallel": [], "recovery_min": 120,
         "mitigation": [
             "Open remote/standby make-up laterals and re-allocate flights",
             "Manual bag build at carousel heads with extra ground crew",
             "Porter time-critical bags directly to aircraft stands",
             "Coordinate with airlines to re-sequence make-up by departure time"],
         "resources": [
             {"item": "Make-up ground crew", "qty": 12, "type": "people"},
             {"item": "Dispatch coordinator", "qty": 2, "type": "people"},
             {"item": "Vanderlande maintenance engineer", "qty": 3, "type": "engineer"},
             {"item": "Tugs + dollies", "qty": 10, "type": "equipment"}]},
        {"id": "RECLAIM", "name": "Reclaim", "capacity": 2000, "status": "in-service",
         "parallel": [], "recovery_min": 60,
         "mitigation": [
             "Open alternate reclaim belts and re-assign arriving flights",
             "Manual offload to belt heads for affected carousels",
             "Passenger comms / FIDS update on reclaim belt changes"],
         "resources": [
             {"item": "Arrivals baggage crew", "qty": 8, "type": "people"},
             {"item": "Customer service / comms agent", "qty": 2, "type": "people"},
             {"item": "Maintenance engineer", "qty": 2, "type": "engineer"},
             {"item": "Tugs + dollies", "qty": 4, "type": "equipment"}]},
    ],
    "bag_daily": [
        {"date": "2026-05-29", "planned": 45000, "actual": 43650, "capacity": 52000, "mishandled": 196, "oog": 917},
        {"date": "2026-05-30", "planned": 38000, "actual": 37240, "capacity": 52000, "mishandled": 190, "oog": 782},
        {"date": "2026-05-31", "planned": 38000, "actual": 37620, "capacity": 52000, "mishandled": 188, "oog": 790},
        {"date": "2026-06-01", "planned": 45000, "actual": 44100, "capacity": 52000, "mishandled": 198, "oog": 926},
        {"date": "2026-06-02", "planned": 45000, "actual": 43200, "capacity": 52000, "mishandled": 216, "oog": 907},
        {"date": "2026-06-03", "planned": 45000, "actual": 44550, "capacity": 52000, "mishandled": 200, "oog": 935},
        {"date": "2026-06-04", "planned": 45000, "actual": 44100, "capacity": 52000, "mishandled": 198, "oog": 926},
    ],
    "work_log": [
        {"date": "2026-06-04", "area": "0021", "activity": "IO testing of main cabinet", "pct": 20, "contractor": "VI commissioning"},
        {"date": "2026-06-04", "area": "0074", "activity": "LAC mods", "pct": 20, "contractor": "Dalkia"},
        {"date": "2026-05-28", "area": "0021", "activity": "Field cabinet install", "pct": 35, "contractor": "Dalkia"},
    ],
    "risks": [
        {"id": "R1", "title": "E-stop / ProfiNet works lagging in 0021/0040/0074", "area": "HBS3",
         "likelihood": 5, "impact": 4, "mitigation": "Concentrate Dalkia + VI crews; per-area checklist.", "owner": "VI commissioning"},
        {"id": "R2", "title": "Fire-alarm interface unresourced (Honeywell)", "area": "HBS12",
         "likelihood": 4, "impact": 4, "mitigation": "Confirm Honeywell mobilisation this week.", "owner": "Heathrow PM"},
        {"id": "R3", "title": "Nightly back-to-service window overrun", "area": "RECLAIM",
         "likelihood": 3, "impact": 5, "mitigation": "Pre-stage isolations; 02:00 go/no-go.", "owner": "VI Supervisors"},
        {"id": "R4", "title": "Snagging backlog blocks as-built / SAT", "area": "HBS3",
         "likelihood": 4, "impact": 3, "mitigation": "Ring-fence snagging crew.", "owner": "Wise/Dalkia"},
        {"id": "R5", "title": "Out-of-gauge routing reliability", "area": "OOG",
         "likelihood": 3, "impact": 3, "mitigation": "OOG capacity test before live.", "owner": "Vanderlande"},
    ],
}


PROJECTS = [
    ("t5-baggage-programme", "T5 PILZ / Baggage Programme", "T5"),
    ("t1-reclaim", "T1 Reclaim Hall Refurbishment", "T1"),
    ("t2-reclaim-upgrade", "T2 Baggage Reclaim Upgrade", "T2"),
    ("t3-hbs-refresh", "T3 HBS Screening Refresh", "T3"),
    ("t4-ebs-resilience", "T4 EBS Resilience Programme", "T4"),
    ("ump-reference", "UMP Reference", "Programme"),
]

def seed_db():
    db = SessionLocal()
    try:
        if db.query(models.Project).count() > 0:
            return
        from .portfolio import PROJECTS_META  # lazy import avoids circular dependency
        for pid, name, term in PROJECTS:
            db.add(models.Project(id=pid, name=name, terminal=term))
        # Risk register for every project across the portfolio
        for pid, meta in PROJECTS_META.items():
            for r in meta.get("risks", []):
                db.add(models.Risk(id=f"{pid}-{r['id']}", project_id=pid,
                       title=r["title"], area=r["area"], likelihood=r["likelihood"],
                       impact=r["impact"], mitigation=r["mitigation"], owner=r["owner"]))
        # a seed document
        db.add(models.Document(id="t5-seed-brief", project_id="t5-baggage-programme",
               name="T5 PILZ Programme Brief.txt", kind="text",
               summary="T5A PILZ safety-controls implementation in active commissioning under BC216; ~80% complete, amber.",
               topics=["PILZ", "Commissioning", "SAT"],
               insights=[{"type": "risk", "title": "E-stop/ProfiNet tail", "detail": "Areas 0021/0040/0074 lagging.", "source": "T5 PILZ Programme Brief.txt"},
                         {"type": "metric", "title": "~80% complete", "detail": "Delivery gate G6 active.", "source": "T5 PILZ Programme Brief.txt"}],
               status="done"))
        # bag days
        for d in T5_OPS["bag_daily"]:
            db.add(models.BagDay(project_id="t5-baggage-programme", date=d["date"], day="", series="throughput",
                   planned=d["planned"], actual=d["actual"], capacity=d["capacity"]))
        db.commit()
        _seed_documents(db)
    finally:
        db.close()


def _seed_documents(db):
    """Parse and ingest the bundled project documents (backend/seed_docs/) so
    MAX has real source material to answer from out of the box."""
    import os
    from .parsing import parse_file
    from . import ai
    docs_dir = os.path.join(os.path.dirname(__file__), "..", "seed_docs")
    if not os.path.isdir(docs_dir):
        return
    for fn in sorted(os.listdir(docs_dir)):
        path = os.path.join(docs_dir, fn)
        if not os.path.isfile(path) or fn.startswith("."):
            continue
        if db.query(models.Document).filter(models.Document.name == fn).first():
            continue
        try:
            with open(path, "rb") as f:
                text, kind = parse_file(fn, f.read())
            ins = ai.heuristic_extract(fn, text)
            db.add(models.Document(id=uuid.uuid4().hex[:12], project_id="t5-baggage-programme",
                   name=fn, kind=kind, text=text[:120000], summary=ins.get("summary", ""),
                   topics=ins.get("topics", []), insights=ins.get("insights", []), status="done"))
            db.commit()
        except Exception:
            db.rollback()  # never let one bad file block startup
