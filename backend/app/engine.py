"""MAX deterministic engine — ported from the prototype JS.
Pure functions: risk scoring, utilisation, forecasting, impact, daily tasks.
No framework dependencies so it is unit-testable and reusable."""
from __future__ import annotations
import re
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

# ---------- gates ----------
GATES = ["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"]
GATE_LABELS = {
    "G0": "Strategic fit", "G1": "Feasibility", "G2": "Business case",
    "G3": "Design freeze", "G4": "Procurement", "G5": "Build / Install",
    "G6": "Commissioning", "G7": "Handover / SAT", "G8": "Benefits realised",
}

def gate_progress(current_gate: str, completion: int) -> dict:
    idx = GATES.index(current_gate) if current_gate in GATES else 0
    stages = []
    for i, g in enumerate(GATES):
        status = "done" if i < idx else "active" if i == idx else "todo"
        stages.append({"gate": g, "label": GATE_LABELS[g], "status": status})
    nxt = GATES[idx + 1] if idx + 1 < len(GATES) else GATES[idx]
    return {"current": current_gate, "next": nxt, "stages": stages,
            "next_label": GATE_LABELS.get(nxt, "")}

# ---------- portfolio health (RAG) ----------
def health_for(completion: int, critical: int, open_high: int) -> dict:
    """Deterministic RAG: completion-driven, with critical risk capping green→amber."""
    if completion < 45:
        rag = "red"
    elif completion >= 70 and critical == 0:
        rag = "green"
    else:
        rag = "amber"
    return {"rag": rag, "label": rag.upper()}

# ---------- what-if scenario simulator ----------
def whatif(comp: dict, meta: dict, bag_volume_pct: float, crew: int, extra_completion: int) -> dict:
    """Live model: bag volume × crew × extra completion -> utilisation,
    projected completion, risk index and SAT date shift (days)."""
    base_util = comp.get("util_pct") or 80
    crew_base = meta.get("crew_baseline") or crew or 1
    crew = max(int(crew), 1)
    util = round(base_util * (bag_volume_pct / 100.0) * (crew_base / crew))
    util = max(0, min(200, util))
    completion = min(100, int(meta.get("completion", 0)) + int(extra_completion))
    critical = comp.get("critical", 0)
    if util >= 92 or (critical > 0 and util >= 85):
        idx = "High"
    elif util >= 78:
        idx = "Medium"
    else:
        idx = "Low"
    gap = 100 - completion
    shift = round(max(0, util - 82) * 0.35 + gap * 0.12 - extra_completion * 0.2)
    return {"utilisation": util, "projected_completion": completion,
            "risk_index": idx, "sat_date_shift": shift}

# ---------- budget / earned-value ----------
def compute_budget(budget: dict, completion: int) -> dict:
    """Earned-value view: given the submitted cost (split by supplier) and the
    project's % complete, forecast the out-turn cost and whether the project
    finishes in budget or needs an uplift, based on the burn rate so far."""
    bac = budget.get("total", 0)                       # Budget At Completion (submitted cost)
    suppliers = budget.get("suppliers", [])
    ac = sum(s.get("spent", 0) for s in suppliers)     # Actual Cost to date
    allocated = sum(s.get("budget", 0) for s in suppliers)
    ev = bac * completion / 100.0                       # Earned Value (value of work done)
    cpi = (ev / ac) if ac else 0                        # Cost Performance Index
    eac = round(bac / cpi) if cpi else bac              # Estimate At Completion
    vac = bac - eac                                     # Variance At Completion (neg = overspend)
    overspend = max(0, eac - bac)
    pct_spent = round(ac / bac * 100) if bac else 0

    if cpi == 0:
        verdict, rag = "Not yet started", "amber"
    elif eac <= bac * 1.02:
        verdict, rag = "On budget", "green"
    elif eac <= bac * 1.10:
        verdict, rag = "Minor overspend — manageable", "amber"
    else:
        verdict, rag = "Uplift / overspend needed", "red"

    sup_out = []
    for s in suppliers:
        sb, ss = s.get("budget", 0), s.get("spent", 0)
        sp = round(ss / sb * 100) if sb else 0
        sup_out.append({"name": s.get("name", ""), "budget": sb, "spent": ss,
                        "remaining": sb - ss, "pct_spent": sp,
                        "status": "over" if ss > sb else "high" if sp >= 90 else "ok"})

    return {
        "currency": budget.get("currency", "£"),
        "bac": bac, "ac": ac, "allocated": allocated,
        "ev": round(ev), "cpi": round(cpi, 3), "eac": eac, "vac": vac,
        "overspend": overspend, "pct_spent": pct_spent, "completion": completion,
        "verdict": verdict, "rag": rag, "suppliers": sup_out,
    }

# ---------- strategy synthesis (deterministic) ----------
def generate_strategy(ops: dict, comp: dict, docs: list[dict], forecast: dict | None = None,
                      focus: str | None = None) -> dict:
    """Synthesise mitigation strategy, predicted risks and a PM to-do list from
    the risk register, bag-throughput signals and ingested documents
    (lessons learned, bag-volume data, schematics). Pure + deterministic so it
    runs with or without the LLM layer. ``focus`` narrows/prioritises results
    to a keyword or instruction typed by the PM."""
    meta = ops.get("meta", {})
    risks = comp["risks"]
    completion = int(meta.get("completion", 0))
    util = comp.get("util_pct", 0)

    # ---- predicted risks: live register + signals + document-derived ----
    predicted: list[dict] = []
    for r in risks[:6]:
        predicted.append({
            "title": r["title"], "likelihood": r["likelihood"], "impact": r["impact"],
            "score": r["score"], "band": r["band"], "source": "risk register",
            "rationale": f"Live register entry in {r.get('area', '—')} (L{r['likelihood']}×I{r['impact']}).",
        })
    if util >= 85:
        predicted.append({"title": "Peak-day throughput congestion", "likelihood": 4, "impact": 3,
                          "score": 12, "band": "high", "source": "bag-volume data",
                          "rationale": f"Throughput at {util}% of design capacity — spillover likely on Type-A days."})
    if completion < 60:
        predicted.append({"title": f"Slippage to gate {meta.get('current_gate', '')}", "likelihood": 4, "impact": 4,
                          "score": 16, "band": "critical", "source": "schedule",
                          "rationale": f"Only {completion}% complete — delivery confidence to the next gate is low."})
    for d in docs:
        for ins in (d.get("insights") or []):
            if ins.get("type") == "risk":
                predicted.append({"title": ins.get("title", "Document-flagged risk").rstrip("…"),
                                  "likelihood": 3, "impact": 3, "score": 9, "band": "high",
                                  "source": d.get("name", "document"),
                                  "rationale": ins.get("detail", "")[:160]})
    # de-dup by title, keep highest score, sort
    seen: dict[str, dict] = {}
    for p in predicted:
        key = p["title"].lower()
        if key not in seen or p["score"] > seen[key]["score"]:
            seen[key] = p
    predicted = sorted(seen.values(), key=lambda x: -x["score"])[:10]

    # ---- objective (Pilz mitigation-plan house style) ----
    name = meta.get("name", "this project")
    objective = (
        f"Protect the passenger experience and maintain missed-bag performance versus baseline while "
        f"delivering {name} ({completion}% complete, gate {meta.get('current_gate', '')}). Deliver the works "
        f"with minimal disruption to passenger flow, service levels and terminal operations throughout the "
        f"access window and recovery period."
    )

    # ---- mitigation actions (Area | Action | Mitigation | Responsibility) ----
    mitigation_actions: list[dict] = []
    for r in risks[:8]:
        if r["score"] >= 6:
            mitigation_actions.append({
                "area": r.get("area", "—"), "action": f"Mitigate: {r['title']}",
                "mitigation": r.get("mitigation") or "Assign an owner and a dated mitigation action.",
                "responsibility": r.get("owner", "PM"),
                "priority": "critical" if r["score"] >= 15 else "high" if r["score"] >= 9 else "medium",
            })
    if util >= 85:
        mitigation_actions.append({"area": "Throughput", "action": "Protect peak-day flow",
                                   "mitigation": "Stage contingency crews; pre-clear make-up laterals on Type-A (24k+) days; hold a 02:00 go/no-go.",
                                   "responsibility": "Operations", "priority": "high"})
    if completion < 60:
        mitigation_actions.append({"area": "Schedule", "action": "Recover to next gate",
                                   "mitigation": f"Re-baseline the critical path; ring-fence resource on the lowest workstream to lift {completion}% toward gate exit.",
                                   "responsibility": "Programme", "priority": "high"})
    for d in docs:
        for ins in (d.get("insights") or []):
            if ins.get("type") in ("action", "decision"):
                mitigation_actions.append({"area": "Lessons learned", "action": ins.get("title", "Apply lesson learned").rstrip("…"),
                                           "mitigation": f"{ins.get('detail', '')} (source: {d.get('name', 'document')})",
                                           "responsibility": "PM", "priority": "medium"})
    mitigation_actions = mitigation_actions[:12]

    # ---- FMEA (Process | Failure Mode | Effect | Severity | Controls) ----
    EFFECT = {"HBS12": "Screening delay / missed bags", "HBS3": "Commissioning delay / missed bags",
              "RECLAIM": "Reclaim back-to-service overrun", "MAKEUP": "Make-up dieback / missed flights",
              "OOG": "Out-of-gauge routing failure", "VSO": "Sortation delay"}
    fmea: list[dict] = []
    for r in risks[:8]:
        fmea.append({"process": r.get("area", "—"), "failure_mode": r["title"],
                     "effect": EFFECT.get(r.get("area", ""), "Delay / missed flight"),
                     "severity": min(10, int(r["impact"]) * 2),
                     "controls": r.get("mitigation") or "Project O&M to support; visual checks."})

    command_control = ("Central coordination via BCCR & Project FODM. Daily Go/No-Go calls Mon–Thu with "
                       "BCCR, FODM and BA; real-time status updates and decision-making.")
    contingency = ("BAU CSOPs to be followed; all contingency procedures align with Business-As-Usual "
                   "standard operating procedures.")

    # ---- access windows & schedule impact (indicative, from workstreams) ----
    access_windows: list[dict] = []
    base_day = date(2026, 6, 15)
    for i, w in enumerate(sorted(meta.get("workstreams", []), key=lambda x: x["pct"])[:4], 1):
        start = base_day + timedelta(days=7 * i)
        original = max(2, round((100 - w["pct"]) / 12))
        new = max(1, original - 2)
        access_windows.append({
            "item": i, "area": w["name"], "access": "24h (Sun 22:30 – Fri 03:30)",
            "start": start.isoformat(), "finish": (start + timedelta(weeks=new)).isoformat(),
            "original_duration": f"{original} wk", "new_duration": f"{new} wk",
        })

    approvals = [
        {"name": "", "company": "Vanderlande", "role": "Project Manager (Technical)"},
        {"name": "", "company": "HAL", "role": "T5 TBBM"},
        {"name": "", "company": "HAL", "role": "Project Manager"},
        {"name": "", "company": "HAL", "role": "Resilience Manager"},
        {"name": "", "company": "British Airways", "role": "BA Senior Manager"},
        {"name": "", "company": "ABC", "role": "Head of Operations"},
        {"name": "", "company": "DHL", "role": "ITO Manager"},
    ]

    # ---- PM to-do list ----
    todo = list(gen_daily_tasks(ops, comp))
    for i, d in enumerate(docs):
        for ins in (d.get("insights") or []):
            if ins.get("type") == "action":
                todo.append({"id": f"doc-{i}-{len(todo)}", "pri": "medium",
                             "text": ins.get("title", "Follow up on document action").rstrip("…"),
                             "detail": f"{ins.get('detail', '')} — from {d.get('name', 'document')}",
                             "owner": "PM", "tag": "Doc"})
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    todo.sort(key=lambda t: order.get(t.get("pri", "low"), 3))
    todo = todo[:12]

    # PM-typed focus: keep items matching any focus word first; only filter a
    # section if it still has matches, so we never blank the strategy out.
    if focus and focus.strip():
        toks = [w for w in re.split(r"\W+", focus.lower()) if len(w) > 2]

        def _matches(item: dict) -> bool:
            blob = " ".join(str(v) for v in item.values()).lower()
            return any(t in blob for t in toks)

        if toks:
            ma = [m for m in mitigation_actions if _matches(m)]
            ff = [f for f in fmea if _matches(f)]
            pp = [p for p in predicted if _matches(p)]
            tt = [t for t in todo if _matches(t)]
            mitigation_actions = ma or mitigation_actions
            fmea = ff or fmea
            predicted = pp or predicted
            todo = tt or todo

    return {
        "objective": objective,
        "mitigation_actions": mitigation_actions,
        "fmea": fmea,
        "access_windows": access_windows,
        "approvals": approvals,
        "command_control": command_control,
        "contingency": contingency,
        "predicted_risks": predicted,
        "todo": todo,
        "inputs": {
            "documents": len(docs),
            "risks": len(risks),
            "bag_days": len(ops.get("bag_daily") or []),
            "forecast_days": len((forecast or {}).get("directs", [])),
        },
    }
