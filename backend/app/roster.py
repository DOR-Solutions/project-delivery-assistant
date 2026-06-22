"""T5 PILZ Mitigation (UMP) roster analytics.

Loads the Deputy monthly roster export (parsed to JSON) and derives the
resource-deployment and cost picture for the T5 PILZ baggage mitigation
programme: cost/hours by zone and role, daily staffing & spend, shift-band
deployment, top resources and a full-month budget projection.
"""
import json
import os
from collections import defaultdict
from datetime import date

_DATA = os.path.join(os.path.dirname(__file__), "data", "roster_t5_pilz.json")
_CACHE = None


def _load():
    global _CACHE
    if _CACHE is None:
        with open(_DATA, encoding="utf-8") as f:
            _CACHE = json.load(f)
    return _CACHE


def _shift_band(start: str) -> str:
    """Group a shift by its start time into an operational band."""
    try:
        hm, ap = start.split(" ")
        h = int(hm.split(":")[0]) % 12 + (12 if ap.upper() == "PM" else 0)
    except Exception:
        return "Other"
    if h < 6:
        return "Night (00:00–06:00)"
    if h < 11:
        return "Early (06:00–11:00)"
    if h < 16:
        return "Late (11:00–16:00)"
    return "Evening (16:00+)"


def summary():
    d = _load()
    shifts = d["shifts"]
    meta = d["meta"]
    dates = sorted({s["date"] for s in shifts})
    total_cost = round(sum(s["cost"] for s in shifts), 2)
    total_hours = round(sum(s["hours"] for s in shifts), 1)
    staff = {s["employee"] for s in shifts}
    op_days = len(dates)
    d0, d1 = date.fromisoformat(dates[0]), date.fromisoformat(dates[-1])
    elapsed = (d1 - d0).days + 1
    # full calendar month the roster sits in
    if d1.month == 12:
        nxt = date(d1.year + 1, 1, 1)
    else:
        nxt = date(d1.year, d1.month + 1, 1)
    days_in_month = (nxt - date(d1.year, d1.month, 1)).days
    daily_cost = total_cost / op_days if op_days else 0
    # project to full month by operating-day cadence (op_days observed over elapsed calendar days)
    proj_op_days = round(op_days / elapsed * days_in_month) if elapsed else op_days
    projected_month = round(daily_cost * proj_op_days, 2)

    return {
        "meta": meta,
        "date_from": dates[0], "date_to": dates[-1],
        "operating_days": op_days, "calendar_elapsed": elapsed, "days_in_month": days_in_month,
        "shifts": len(shifts), "headcount": len(staff),
        "total_hours": total_hours, "total_cost": total_cost,
        "avg_shift_hours": round(total_hours / len(shifts), 2) if shifts else 0,
        "avg_hourly_rate": round(total_cost / total_hours, 2) if total_hours else 0,
        "avg_daily_cost": round(daily_cost, 2),
        "avg_daily_headcount": round(sum(1 for _ in shifts) / op_days, 1) if op_days else 0,
        "projected_op_days": proj_op_days,
        "projected_month_cost": projected_month,
        "annualised_cost": round(projected_month * 12, 2),
    }


def _agg(key):
    d = _load()
    g = defaultdict(lambda: {"shifts": 0, "hours": 0.0, "cost": 0.0, "staff": set()})
    for s in d["shifts"]:
        k = key(s)
        g[k]["shifts"] += 1
        g[k]["hours"] += s["hours"]
        g[k]["cost"] += s["cost"]
        g[k]["staff"].add(s["employee"])
    total = sum(v["cost"] for v in g.values()) or 1
    out = [{
        "name": k, "shifts": v["shifts"], "hours": round(v["hours"], 1),
        "cost": round(v["cost"], 2), "headcount": len(v["staff"]),
        "pct_cost": round(v["cost"] / total * 100, 1),
    } for k, v in g.items()]
    out.sort(key=lambda x: -x["cost"])
    return out


def by_zone():
    return _agg(lambda s: s["zone"])


def by_role():
    return _agg(lambda s: s["role"])


def by_band():
    rows = _agg(lambda s: _shift_band(s["start"]))
    order = {"Early (06:00–11:00)": 0, "Late (11:00–16:00)": 1, "Evening (16:00+)": 2, "Night (00:00–06:00)": 3, "Other": 4}
    rows.sort(key=lambda r: order.get(r["name"], 9))
    return rows


def daily():
    d = _load()
    g = defaultdict(lambda: {"shifts": 0, "hours": 0.0, "cost": 0.0, "day": "", "staff": set()})
    for s in d["shifts"]:
        e = g[s["date"]]
        e["shifts"] += 1
        e["hours"] += s["hours"]
        e["cost"] += s["cost"]
        e["day"] = s["day"]
        e["staff"].add(s["employee"])
    return [{
        "date": k, "day": v["day"], "headcount": len(v["staff"]),
        "shifts": v["shifts"], "hours": round(v["hours"], 1), "cost": round(v["cost"], 2),
    } for k, v in sorted(g.items())]


def top_staff(n=15):
    d = _load()
    g = defaultdict(lambda: {"shifts": 0, "hours": 0.0, "cost": 0.0, "zones": set()})
    for s in d["shifts"]:
        e = g[s["employee"]]
        e["shifts"] += 1
        e["hours"] += s["hours"]
        e["cost"] += s["cost"]
        e["zones"].add(s["zone"])
    out = [{
        "employee": k, "shifts": v["shifts"], "hours": round(v["hours"], 1),
        "cost": round(v["cost"], 2), "zones": len(v["zones"]),
        "rate": round(v["cost"] / v["hours"], 2) if v["hours"] else 0,
    } for k, v in g.items()]
    out.sort(key=lambda x: -x["cost"])
    return out[:n]


def report():
    return {
        "summary": summary(),
        "by_zone": by_zone(),
        "by_role": by_role(),
        "by_band": by_band(),
        "daily": daily(),
        "top_staff": top_staff(),
    }
