from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from .. import engine
from ..seed import T5_OPS, T5_DIRECTS, T5_MITIGATION

router = APIRouter(prefix="/api/ops", tags=["ops"])

def _ops_for(project_id: str, db: Session) -> dict:
    # In this scaffold T5 carries the rich operational dataset.
    risks = db.query(models.Risk).filter(models.Risk.project_id == project_id).all()
    ops = dict(T5_OPS)
    if risks:
        ops["risks"] = [{"id": r.id, "title": r.title, "area": r.area, "likelihood": r.likelihood,
                         "impact": r.impact, "mitigation": r.mitigation, "owner": r.owner} for r in risks]
    return ops

@router.get("/summary")
def summary(project_id: str, db: Session = Depends(get_db)):
    ops = _ops_for(project_id, db)
    comp = engine.compute_ops(ops)
    return {"kpis": {"bags": comp["last"]["actual"], "utilisation": comp["util_pct"],
                     "adherence": comp["adhere_pct"], "open_high": comp["open_high"], "critical": comp["critical"]},
            "tasks": engine.gen_daily_tasks(ops, comp),
            "risks": comp["risks"]}

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
