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
_RATECARD = os.path.join(os.path.dirname(__file__), "data", "abc_rate_card.json")
_CACHE = None
_RATES = None


def ratecard():
    global _RATES
    if _RATES is None:
        with open(_RATECARD, encoding="utf-8") as f:
            _RATES = json.load(f)
    return _RATES


def _parse_time(t: str) -> float:
    """'02:00 PM' -> 14.0 (hours)."""
    try:
        hm, ap = t.strip().split(" ")
        h, m = hm.split(":")
        h = int(h) % 12 + (12 if ap.upper() == "PM" else 0)
        return h + int(m) / 60
    except Exception:
        return 0.0


def _day_night_split(start: str, end: str):
    """Clock hours of a shift falling in the day (08:00–20:00) vs night window."""
    s, e = _parse_time(start), _parse_time(end)
    if e <= s:
        e += 24
    step, day, t = 0.25, 0.0, s
    n = max(1, round((e - s) / step))
    for i in range(n):
        mid = (s + (i + 0.5) * step) % 24
        if 8 <= mid < 20:
            day += step
    clock = e - s
    day = min(day, clock)
    return day, clock - day


def _charge(shift: dict) -> float:
    """ABC charge for one shift: paid hours split day/night at the role's rate."""
    rc = ratecard()
    role = rc["role_map"].get(shift["role"], "Operative")
    rate = next((r for r in rc["labour"] if r["role"] == role), rc["labour"][0])
    day_c, night_c = _day_night_split(shift["start"], shift["end"])
    clock = (day_c + night_c) or 1
    paid = shift["hours"]
    day_paid = paid * day_c / clock
    night_paid = paid - day_paid
    return round(day_paid * rate["day"] + night_paid * rate["night"], 2)


def _load():
    global _CACHE
    if _CACHE is None:
        with open(_DATA, encoding="utf-8") as f:
            _CACHE = json.load(f)
        # enrich each shift with the ABC charge cost (rate-card based)
        for s in _CACHE["shifts"]:
            s["charge"] = _charge(s)
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
    total_charge = round(sum(s["charge"] for s in shifts), 2)
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
    daily_charge = total_charge / op_days if op_days else 0
    # project to full month by operating-day cadence (op_days observed over elapsed calendar days)
    proj_op_days = round(op_days / elapsed * days_in_month) if elapsed else op_days
    projected_month = round(daily_charge * proj_op_days, 2)

    return {
        "meta": meta,
        "rate_card": {"supplier": ratecard()["supplier"], "as_of": ratecard()["as_of"]},
        "date_from": dates[0], "date_to": dates[-1],
        "operating_days": op_days, "calendar_elapsed": elapsed, "days_in_month": days_in_month,
        "shifts": len(shifts), "headcount": len(staff),
        "total_hours": total_hours,
        "total_cost": total_cost,
        "total_charge": total_charge,
        "uplift_pct": round((total_charge / total_cost - 1) * 100, 1) if total_cost else 0,
        "avg_shift_hours": round(total_hours / len(shifts), 2) if shifts else 0,
        "avg_pay_rate": round(total_cost / total_hours, 2) if total_hours else 0,
        "avg_charge_rate": round(total_charge / total_hours, 2) if total_hours else 0,
        "avg_daily_charge": round(daily_charge, 2),
        "avg_daily_headcount": round(sum(1 for _ in shifts) / op_days, 1) if op_days else 0,
        "projected_op_days": proj_op_days,
        "projected_month_charge": projected_month,
        "annualised_charge": round(projected_month * 12, 2),
    }


def _agg(key):
    d = _load()
    g = defaultdict(lambda: {"shifts": 0, "hours": 0.0, "cost": 0.0, "charge": 0.0, "staff": set()})
    for s in d["shifts"]:
        k = key(s)
        g[k]["shifts"] += 1
        g[k]["hours"] += s["hours"]
        g[k]["cost"] += s["cost"]
        g[k]["charge"] += s["charge"]
        g[k]["staff"].add(s["employee"])
    total = sum(v["charge"] for v in g.values()) or 1
    out = [{
        "name": k, "shifts": v["shifts"], "hours": round(v["hours"], 1),
        "cost": round(v["cost"], 2), "charge": round(v["charge"], 2),
        "headcount": len(v["staff"]),
        "pct_cost": round(v["charge"] / total * 100, 1),
    } for k, v in g.items()]
    out.sort(key=lambda x: -x["charge"])
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
    g = defaultdict(lambda: {"shifts": 0, "hours": 0.0, "charge": 0.0, "day": "", "staff": set()})
    for s in d["shifts"]:
        e = g[s["date"]]
        e["shifts"] += 1
        e["hours"] += s["hours"]
        e["charge"] += s["charge"]
        e["day"] = s["day"]
        e["staff"].add(s["employee"])
    return [{
        "date": k, "day": v["day"], "headcount": len(v["staff"]),
        "shifts": v["shifts"], "hours": round(v["hours"], 1), "cost": round(v["charge"], 2),
    } for k, v in sorted(g.items())]


def top_staff(n=15):
    d = _load()
    g = defaultdict(lambda: {"shifts": 0, "hours": 0.0, "charge": 0.0, "zones": set()})
    for s in d["shifts"]:
        e = g[s["employee"]]
        e["shifts"] += 1
        e["hours"] += s["hours"]
        e["charge"] += s["charge"]
        e["zones"].add(s["zone"])
    out = [{
        "employee": k, "shifts": v["shifts"], "hours": round(v["hours"], 1),
        "charge": round(v["charge"], 2), "zones": len(v["zones"]),
        "rate": round(v["charge"] / v["hours"], 2) if v["hours"] else 0,
    } for k, v in g.items()]
    out.sort(key=lambda x: -x["charge"])
    return out[:n]


def report():
    return {
        "summary": summary(),
        "rate_card": ratecard(),
        "by_zone": by_zone(),
        "by_role": by_role(),
        "by_band": by_band(),
        "daily": daily(),
        "top_staff": top_staff(),
    }
