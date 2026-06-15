from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from .. import engine
from .. import portfolio
from .. import ai
from ..seed import T5_DIRECTS, T5_MITIGATION

router = APIRouter(prefix="/api/ops", tags=["ops"])


def _ops_for(project_id: str, db: Session) -> dict:
    """Unified ops payload for a project. DB risks (if any) override the
    seeded register so edits persist; otherwise we fall back to portfolio data."""
    ops = portfolio.get_ops(project_id)
    if ops is None:
        raise HTTPException(404, "Unknown project")
    risks = db.query(models.Risk).filter(models.Risk.project_id == project_id).all()
    if risks:
        ops = dict(ops)
        ops["risks"] = [{"id": r.id, "title": r.title, "area": r.area, "likelihood": r.likelihood,
                         "impact": r.impact, "mitigation": r.mitigation, "owner": r.owner} for r in risks]
    return ops


def _project_summary(project_id: str, ops: dict) -> dict:
    meta = ops.get("meta", {})
    comp = engine.compute_ops(ops)
    completion = int(meta.get("completion", 0))
    health = engine.health_for(completion, comp["critical"], comp["open_high"])
    gates = engine.gate_progress(meta.get("current_gate", "G0"), completion)
    milestones = meta.get("milestones", [])
    on_track = len([m for m in milestones if m.get("on_track")])
    tasks = engine.gen_daily_tasks(ops, comp)
    return {
        "project_id": project_id,
        "name": meta.get("name", project_id),
        "terminal": meta.get("terminal", ""),
        "completion": completion,
        "health": health,
        "kpis": {
            "completion": completion,
            "bags": comp["last"]["actual"],
            "utilisation": comp["util_pct"],
            "adherence": comp["adhere_pct"],
            "open_risks": comp["open_high"],
            "critical": comp["critical"],
            "tasks_today": len(tasks),
            "next_gate": gates["next"],
        },
        "milestones": {"on_track": on_track, "total": len(milestones), "items": milestones},
        "workstreams": meta.get("workstreams", []),
        "gates": gates,
        "throughput": [{"date": d["date"], "planned": d.get("planned", 0), "actual": d.get("actual", 0)}
                       for d in (ops.get("bag_daily") or [])],
        "tasks": tasks,
        "risks": comp["risks"],
        "crew_baseline": meta.get("crew_baseline", 0),
        "crew_on_shift": meta.get("crew_on_shift", 0),
    }


@router.get("/summary")
def summary(project_id: str, db: Session = Depends(get_db)):
    ops = _ops_for(project_id, db)
    return _project_summary(project_id, ops)


@router.get("/portfolio")
def portfolio_overview(db: Session = Depends(get_db)):
    """Roll-up across every project for the Portfolio view + Dashboard."""
    out = []
    for pid in portfolio.PROJECTS_META:
        ops = _ops_for(pid, db)
        s = _project_summary(pid, ops)
        out.append({
            "project_id": pid, "name": s["name"], "terminal": s["terminal"],
            "completion": s["completion"], "health": s["health"],
            "open_risks": s["kpis"]["open_risks"], "critical": s["kpis"]["critical"],
            "next_gate": s["kpis"]["next_gate"],
            "risk_count": len(s["risks"]),
        })
    rag_counts = {"green": 0, "amber": 0, "red": 0}
    for p in out:
        rag_counts[p["health"]["rag"]] += 1
    avg_completion = round(sum(p["completion"] for p in out) / (len(out) or 1))
    return {"projects": out, "rag_counts": rag_counts,
            "avg_completion": avg_completion,
            "total_open_risks": sum(p["open_risks"] for p in out),
            "total_critical": sum(p["critical"] for p in out)}


class WhatIfIn(BaseModel):
    project_id: str
    bag_volume_pct: float = 100
    crew_on_shift: int = 0
    extra_completion: int = 0


@router.post("/whatif")
def whatif(body: WhatIfIn, db: Session = Depends(get_db)):
    ops = _ops_for(body.project_id, db)
    meta = ops.get("meta", {})
    comp = engine.compute_ops(ops)
    crew = body.crew_on_shift or meta.get("crew_on_shift") or meta.get("crew_baseline") or 1
    return engine.whatif(comp, meta, body.bag_volume_pct, crew, body.extra_completion)


@router.get("/foresight")
def foresight(db: Session = Depends(get_db)):
    """Cross-portfolio look-ahead: predicted pressure points and synergies."""
    summaries = {pid: _project_summary(pid, _ops_for(pid, db)) for pid in portfolio.PROJECTS_META}
    predictions, synergies = [], []
    for pid, s in summaries.items():
        crits = [r for r in s["risks"] if r["band"] == "critical"]
        for r in crits:
            predictions.append({
                "project": s["name"], "terminal": s["terminal"],
                "title": r["title"], "score": r["score"],
                "forecast": f"Critical exposure (L{r['likelihood']}×I{r['impact']}) — model projects slippage without mitigation.",
                "owner": r.get("owner", ""),
            })
        if s["kpis"]["utilisation"] >= 85:
            predictions.append({
                "project": s["name"], "terminal": s["terminal"],
                "title": "Throughput approaching design capacity",
                "score": s["kpis"]["utilisation"],
                "forecast": f"Utilisation {s['kpis']['utilisation']}% — congestion risk on peak days.",
                "owner": "Operations",
            })
    # Synergy detection: projects sharing a risk area / contractor and gate window
    by_area: dict[str, list] = {}
    for pid, s in summaries.items():
        for r in s["risks"]:
            by_area.setdefault(r["area"], []).append((s["terminal"], s["name"]))
    for area, members in by_area.items():
        names = sorted({n for _, n in members})
        if len(names) >= 2:
            synergies.append({
                "area": area, "projects": names,
                "opportunity": f"{len(names)} projects carry {area} risk — pool resources / share a single mitigation crew and SAT window.",
            })
    predictions.sort(key=lambda p: -p["score"])
    return {"predictions": predictions[:12], "synergies": synergies[:8]}


def _docs_for(project_id: str, db: Session) -> list[dict]:
    rows = db.query(models.Document).filter(models.Document.project_id == project_id).all()
    return [{"name": d.name, "kind": d.kind, "summary": d.summary or "",
             "insights": d.insights or [], "text": (d.text or "")[:1500]} for d in rows]


def _strategy_context(s: dict, docs: list[dict]) -> str:
    """Compact, grounded context string for the LLM."""
    lines = [f"PROJECT: {s['name']} ({s['terminal']}) — {s['completion']}% complete, health {s['health']['label']}.",
             f"Gate {s['gates']['current']} (next {s['gates']['next']}: {s['gates']['next_label']}).",
             f"KPIs: utilisation {s['kpis']['utilisation']}%, plan adherence {s['kpis']['adherence']}%, "
             f"open high risks {s['kpis']['open_risks']}, critical {s['kpis']['critical']}, bags/day {s['kpis']['bags']}.",
             "WORKSTREAMS: " + ", ".join(f"{w['name']} {w['pct']}%" for w in s["workstreams"]),
             "RISK REGISTER:"]
    for r in s["risks"]:
        lines.append(f"  - [{r['band']} {r['score']}] {r['title']} (area {r.get('area','')}, owner {r.get('owner','')}) "
                     f"mitigation: {r.get('mitigation','')}")
    if docs:
        lines.append("INGESTED DOCUMENTS:")
        for d in docs:
            lines.append(f"  • {d['name']} ({d['kind']}): {d['summary']}")
            for ins in d["insights"][:4]:
                lines.append(f"      - {ins.get('type','note')}: {ins.get('title','')} — {ins.get('detail','')}")
    else:
        lines.append("INGESTED DOCUMENTS: none yet (upload lessons learned, bag-volume data, schematics in Ingest).")
    return "\n".join(lines)


@router.get("/strategy")
async def strategy(project_id: str, focus: str = "", db: Session = Depends(get_db)):
    """Synthesise mitigation strategy, predicted risks and a PM to-do list,
    grounded in the project's risk register, bag data and ingested documents.
    ``focus`` is an optional PM instruction to steer/narrow the strategy.
    Uses Claude when available; falls back to the deterministic engine."""
    ops = _ops_for(project_id, db)
    comp = engine.compute_ops(ops)
    docs = _docs_for(project_id, db)
    forecast = {"directs": engine.forecast_directs(T5_DIRECTS)} if project_id == "t5-baggage-programme" else {}
    base = engine.generate_strategy(ops, comp, docs, forecast, focus=focus)

    s = _project_summary(project_id, ops)
    enhanced = await ai.ai_strategy(_strategy_context(s, docs), instruction=focus)
    if enhanced:
        return {
            "ai": True,
            "narrative": enhanced.get("narrative", ""),
            "mitigation": enhanced.get("mitigation") or base["mitigation"],
            "predicted_risks": enhanced.get("predicted_risks") or base["predicted_risks"],
            "todo": enhanced.get("todo") or base["todo"],
            "inputs": base["inputs"],
        }
    return {"ai": False, "narrative": "", **base}


@router.get("/impact")
def impact(project_id: str, area: str, db: Session = Depends(get_db)):
    ops = _ops_for(project_id, db)
    comp = engine.compute_ops(ops)
    res = engine.impact_of(ops, comp, area)
    if not res:
        raise HTTPException(404, "Unknown area")
    return res


@router.get("/forecast")
def forecast(project_id: str):
    return {"directs": engine.forecast_directs(T5_DIRECTS),
            "mitigation": engine.forecast_mitigation(T5_MITIGATION)}
