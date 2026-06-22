"""Action register driven by meeting minutes.

Turns the action items extracted from meeting transcripts into a live project
task register: assigns each to a PM or supplier, buckets it into a workstream,
tracks status/progress, and generates a progress update and the draft agenda for
the next meeting (carrying forward open actions). Deterministic so it runs with
or without the LLM layer.
"""
from __future__ import annotations
import re
import uuid
from datetime import datetime, date

from . import models

SUPPLIER_KW = ["vi ", "vi/", "vi,", "dalkia", "vanderlande", "honeywell", "icts",
               "dhl", "abc", "supplier", "pratik", "fiona", "gurpreet", "siemens"]

WORKSTREAM_RULES = [
    ("Comms & Stakeholders", ["comms", "stakeholder", "ba ops", "language", "sensitiv", "signage"]),
    ("Commissioning & Safety", ["commission", "rtg", "sat", "sign-off", "sign off", "go-live", "go live", "safety", "deployment readiness", "o&m"]),
    ("HBS & Screening", ["screening", "hbs", "l2", "l3", "capacity", "die-back", "dieback"]),
    ("Reclaim & Resourcing", ["reclaim", "staffing", "logistics", "crew", "resource"]),
    ("Trials & ICTS", ["icts", "trial"]),
    ("Delivery & Isolations", ["isolat", "area", "264", "265", "install", "strip-out", "strip out"]),
    ("Governance", ["governance", "investigat", "unauthor", "breakdown", "accountab"]),
]

_OPEN, _PROG, _CLOSED = "open", "in-progress", "closed"


def classify_owner(owner: str) -> str:
    o = (owner or "").lower()
    if not o.strip():
        return "unassigned"
    if any(k in o + " " for k in SUPPLIER_KW):
        return "supplier"
    return "pm"


def classify_workstream(text: str) -> str:
    t = (text or "").lower()
    for name, kws in WORKSTREAM_RULES:
        if any(k in t for k in kws):
            return name
    return "General"


def norm_status(s: str | None) -> str:
    s = (s or "").lower()
    if any(k in s for k in ("clos", "complete", "done", "delivered")):
        return _CLOSED
    if any(k in s for k in ("progress", "wip", "underway", "ongoing")):
        return _PROG
    return _OPEN


def _key(text: str) -> str:
    """Normalised text key so the same action recurring across meetings collapses
    to one tracked item (and its latest status wins)."""
    return re.sub(r"[^a-z0-9]", "", (text or "").lower())[:48]


def sync_meeting_tasks(db, meeting) -> None:
    """Upsert a meeting's action items into the project task register. A later
    meeting reporting the same action updates its status/owner/due."""
    existing = db.query(models.Task).filter(models.Task.project_id == meeting.project_id).all()
    by_key = {_key(t.text): t for t in existing}
    for a in (meeting.actions or []):
        text = (a.get("text") or "").strip()
        if not text:
            continue
        st = norm_status(a.get("status"))
        owner = (a.get("owner") or "").strip()
        t = by_key.get(_key(text))
        if t:
            t.status = st if st != _OPEN else t.status if t.status == _CLOSED else st
            if owner:
                t.owner, t.owner_type = owner, classify_owner(owner)
            if a.get("due"):
                t.due = a["due"]
            if a.get("ref"):
                t.ref = a["ref"]
            t.meeting_id = meeting.id
            t.updated_at = datetime.utcnow()
        else:
            t = models.Task(
                id=uuid.uuid4().hex[:12], project_id=meeting.project_id, meeting_id=meeting.id,
                ref=a.get("ref", "") or "", text=text, owner=owner,
                owner_type=classify_owner(owner), workstream=classify_workstream(text),
                due=a.get("due", "") or "", status=st)
            db.add(t)
            by_key[_key(text)] = t
    db.commit()


def _overdue(t) -> bool:
    if t.status == _CLOSED or not t.due:
        return False
    try:
        return date.fromisoformat(t.due[:10]) < date.today()
    except Exception:
        return False


def _task_dict(t) -> dict:
    return {"id": t.id, "ref": t.ref, "text": t.text, "owner": t.owner or "Unassigned",
            "owner_type": t.owner_type, "workstream": t.workstream, "due": t.due,
            "status": t.status, "overdue": _overdue(t), "meeting_id": t.meeting_id}


def register(db, pid: str) -> dict:
    tasks = db.query(models.Task).filter(models.Task.project_id == pid).all()
    total = len(tasks)
    closed = sum(1 for t in tasks if t.status == _CLOSED)
    inprog = sum(1 for t in tasks if t.status == _PROG)
    openc = total - closed
    overdue = sum(1 for t in tasks if _overdue(t))
    pct = round(closed / total * 100) if total else 0

    def group(attr):
        g: dict[str, dict] = {}
        for t in tasks:
            k = getattr(t, attr) or "—"
            e = g.setdefault(k, {"name": k, "total": 0, "closed": 0, "open": 0})
            e["total"] += 1
            e["closed"] += 1 if t.status == _CLOSED else 0
            e["open"] += 0 if t.status == _CLOSED else 1
        return sorted(g.values(), key=lambda x: -x["total"])

    order = {_OPEN: 0, _PROG: 1, _CLOSED: 2}
    items = sorted((_task_dict(t) for t in tasks),
                   key=lambda d: (order.get(d["status"], 9), not d["overdue"]))
    return {
        "progress_pct": pct, "total": total, "open": openc, "in_progress": inprog,
        "closed": closed, "overdue": overdue,
        "by_owner_type": group("owner_type"), "by_workstream": group("workstream"),
        "by_owner": group("owner"), "tasks": items,
    }


def progress_update(db, pid: str, meta: dict | None = None) -> dict:
    reg = register(db, pid)
    name = (meta or {}).get("name", "Project")
    closed = [t for t in reg["tasks"] if t["status"] == _CLOSED]
    open_overdue = [t for t in reg["tasks"] if t["status"] != _CLOSED]
    headline = (f"{name} action register is {reg['progress_pct']}% complete — "
                f"{reg['closed']} of {reg['total']} actions closed, {reg['open']} open"
                + (f", {reg['overdue']} overdue." if reg["overdue"] else "."))
    lines = [f"Progress update — {name} (as of {date.today().isoformat()})", "", headline, ""]
    if closed:
        lines.append("Completed:")
        lines += [f"  ✓ {t['ref'] + ' ' if t['ref'] else ''}{t['text']} ({t['owner']})" for t in closed[:12]]
        lines.append("")
    if open_overdue:
        lines.append("Outstanding:")
        lines += [f"  • {t['ref'] + ' ' if t['ref'] else ''}{t['text']} — {t['owner']}"
                  + (f", due {t['due']}" if t['due'] else "") + (" [OVERDUE]" if t["overdue"] else "")
                  for t in open_overdue[:14]]
    return {"text": "\n".join(lines), "progress_pct": reg["progress_pct"],
            "closed": reg["closed"], "open": reg["open"], "overdue": reg["overdue"],
            "by_workstream": reg["by_workstream"]}


STANDING_AGENDA = [
    "Delivery performance & schedule review",
    "Transfers & bag handling",
    "HBS & screening performance",
    "Risks, mitigations & forward actions",
]


def next_agenda(db, pid: str, meta: dict | None = None) -> dict:
    reg = register(db, pid)
    name = (meta or {}).get("name", "Project")
    last = (db.query(models.Meeting).filter(models.Meeting.project_id == pid)
            .order_by(models.Meeting.meeting_date.desc()).first())
    carry = [t for t in reg["tasks"] if t["status"] != _CLOSED]
    # group carried-forward actions by workstream for the review section
    ws: dict[str, list] = {}
    for t in carry:
        ws.setdefault(t["workstream"], []).append(t)
    closed_recent = [t for t in reg["tasks"] if t["status"] == _CLOSED]
    title = f"Draft agenda — {name} Stakeholder Session"
    return {
        "title": title,
        "based_on": (last.title if last else None),
        "standing": STANDING_AGENDA,
        "carry_forward": carry,
        "carry_forward_by_workstream": [{"workstream": k, "items": v} for k, v in ws.items()],
        "for_noting_closed": closed_recent,
        "progress_pct": reg["progress_pct"],
        "generated_at": datetime.utcnow().isoformat(timespec="minutes"),
    }
