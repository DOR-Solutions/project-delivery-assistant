"""MAX deterministic engine — ported from the prototype JS.
Pure functions: risk scoring, utilisation, forecasting, impact, daily tasks.
No framework dependencies so it is unit-testable and reusable."""
from __future__ import annotations
from datetime import date, timedelta
from typing import Any

DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

# ---------- risk ----------
def risk_band(score: int) -> str:
    if score >= 15: return "critical"
    if score >= 9:  return "high"
    if score >= 4:  return "medium"
    return "low"

def score_risks(risks: list[dict]) -> list[dict]:
    out = []
    for r in risks:
        score = int(r.get("likelihood", 0)) * int(r.get("impact", 0))
        out.append({**r, "score": score, "band": risk_band(score)})
    out.sort(key=lambda x: -x["score"])
    return out

# ---------- bag throughput ----------
def compute_ops(ops: dict) -> dict:
    bd = ops.get("bag_daily") or []
    last = bd[-1] if bd else {"planned": 0, "actual": 0, "capacity": 1, "mishandled": 0, "oog": 0}
    cap = last.get("capacity") or 1
    util = round(last["actual"] / cap * 100)
    adhere = round(last["actual"] / (last.get("planned") or 1) * 100)
    mish = round(last.get("mishandled", 0) / (last.get("actual") or 1) * 1000, 1)
    last7 = bd[-7:]
    avg7 = round(sum(d["actual"] for d in last7) / (len(last7) or 1)) if last7 else 0
    risks = score_risks(ops.get("risks") or [])
    return {
        "last": last, "util_pct": util, "adhere_pct": adhere, "mish_rate": mish, "avg7": avg7,
        "risks": risks,
        "open_high": len([r for r in risks if r["score"] >= 9]),
        "critical": len([r for r in risks if r["score"] >= 15]),
    }

# ---------- impact assessment ----------
DOWNSTREAM = {"HBS12": ["MAKEUP", "RECLAIM"], "HBS3": ["MAKEUP"], "VSO": ["MAKEUP"],
              "OOG": ["MAKEUP"], "MAKEUP": ["RECLAIM"], "RECLAIM": []}

def impact_of(ops: dict, comp: dict, area_id: str) -> dict | None:
    areas = ops.get("areas") or []
    area = next((a for a in areas if a["id"] == area_id), None)
    if not area:
        return None
    total = sum(a["capacity"] for a in areas) or 1
    share = round(area["capacity"] / total * 100)
    bags = round(comp["last"]["actual"] * area["capacity"] / total)
    downstream = [next((a["name"] for a in areas if a["id"] == d), d) for d in DOWNSTREAM.get(area_id, [])]
    sev = "critical" if share >= 25 else "high" if share >= 15 else "medium" if share >= 8 else "low"
    return {"area": area, "share_pct": share, "bags_affected": bags, "downstream": downstream, "severity": sev}

# ---------- daily task generation ----------
def gen_daily_tasks(ops: dict, comp: dict) -> list[dict]:
    tasks: list[dict] = []
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    for r in comp["risks"]:
        if r["score"] >= 9:
            tasks.append({"id": f"risk-{r.get('id')}", "pri": "critical" if r["score"] >= 15 else "high",
                          "text": f"Mitigate: {r['title']}", "detail": r.get("mitigation", ""),
                          "owner": r.get("owner", ""), "tag": f"Risk {r['score']}"})
    for i, w in enumerate([w for w in (ops.get("work_log") or []) if w.get("pct", 100) < 60][:4]):
        tasks.append({"id": f"work-{i}", "pri": "high", "text": f"Progress {w['activity']} ({w['area']})",
                      "detail": f"Currently {w['pct']}% — {w['contractor']}", "owner": w["contractor"], "tag": f"{w['pct']}%"})
    if comp["util_pct"] >= 85:
        tasks.append({"id": "util", "pri": "medium", "text": "Manage congestion risk",
                      "detail": f"Throughput at {comp['util_pct']}% of design capacity", "owner": "Operations", "tag": f"{comp['util_pct']}%"})
    tasks.sort(key=lambda t: order[t["pri"]])
    return tasks[:9]

# ---------- forecasting ----------
def _dow_avg(series: list[dict], key: str) -> dict:
    buckets: dict[str, list] = {}
    for r in series:
        buckets.setdefault(r["day"], []).append(r[key])
    return {d: round(sum(v) / len(v)) for d, v in buckets.items()}

def day_type(bags: int) -> str:
    return "A" if bags >= 24000 else "B" if bags >= 21000 else "C"

def forecast_directs(directs: dict) -> list[dict]:
    actual = directs.get("actual") or []
    plan = directs.get("plan") or []
    avg = _dow_avg(actual[-14:], "bags")
    out = []
    for p in plan:
        out.append({"date": p["date"], "day": p["day"], "type": p.get("type") or day_type(p["bags"]),
                    "plan": p["bags"], "max": avg.get(p["day"], p["bags"])})
    return out

def forecast_mitigation(mitigation: list[dict], start: str = "2026-06-09", horizon: int = 5) -> dict:
    recent = [r for r in mitigation if r.get("total", 0) > 0][-6:]
    if not recent:
        return {"fc": [], "avg_total": 0}
    avg_total = round(sum(r["total"] for r in recent) / len(recent))
    sums = {k: sum(r.get(k, 0) for r in recent) for k in ("foh", "cdf", "mip")}
    tot = sum(sums.values()) or 1
    d0 = date.fromisoformat(start)
    fc = []
    i = 0
    while len(fc) < horizon and i < 14:
        d = d0 + timedelta(days=i); i += 1
        if d.weekday() >= 5:  # skip weekends
            continue
        fc.append({"date": d.isoformat(), "day": DAY_NAMES[d.weekday()], "total": avg_total,
                   "foh": round(avg_total * sums["foh"] / tot), "cdf": round(avg_total * sums["cdf"] / tot),
                   "mip": round(avg_total * sums["mip"] / tot)})
    return {"fc": fc, "avg_total": avg_total}
