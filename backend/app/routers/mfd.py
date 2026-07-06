from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from .. import portfolio
from ..mfd_routing import MODEL, assess_outage, impact_table

router = APIRouter(prefix="/api/mfd", tags=["mfd"])


class WhatIfPayload(BaseModel):
    node_id: str
    day_type: str = "A"
    total: int | None = None
    availability: float = 0.0


@router.get("/model")
def model():
    return MODEL


def _degraded_nodes(project_id: str | None, db: Session) -> list[tuple[str, float]]:
    if not project_id:
        return []
    degraded: list[tuple[str, float]] = []
    snapshots = db.query(models.ReportSnapshot).filter(models.ReportSnapshot.project_id == project_id).all()
    for snapshot in snapshots:
        data = snapshot.data or {}
        if isinstance(data, dict):
            for key in ["degraded_nodes", "degraded_node", "degraded_lines", "degraded_line", "line_degraded"]:
                value = data.get(key)
                if isinstance(value, list):
                    for item in value:
                        if isinstance(item, dict) and item.get("node_id"):
                            degraded.append((item["node_id"], float(item.get("availability", 0.0))))
                elif isinstance(value, dict) and value.get("node_id"):
                    degraded.append((value["node_id"], float(value.get("availability", 0.0))))
            if isinstance(data.get("availability"), (int, float)) and data.get("node_id"):
                degraded.append((data["node_id"], float(data["availability"])))
    work_logs = db.query(models.WorkLog).filter(models.WorkLog.project_id == project_id).all()
    for item in work_logs:
        activity = (item.activity or "").lower()
        if "degrad" in activity or "outage" in activity:
            degraded.append((item.area or "", 0.0))
    return degraded


@router.get("/impact")
def impact(day_type: str = Query("A"), project_id: str | None = None, db: Session = Depends(get_db)):
    total = None
    if project_id:
        ops = portfolio.get_ops(project_id)
        if ops is None:
            raise HTTPException(404, "Unknown project")
        bag_days = db.query(models.BagDay).filter(models.BagDay.project_id == project_id).order_by(models.BagDay.date).all()
        if bag_days:
            today = max((d for d in bag_days if d.date), key=lambda d: d.date, default=None)
            if today is not None:
                total = int(today.actual or today.planned or 0)
    rows = impact_table(day_type, total)
    for node_id, availability in _degraded_nodes(project_id, db):
        row = next((r for r in rows if r["node_id"] == node_id), None)
        if row is not None:
            row.update(assess_outage(node_id, day_type, total, availability=availability))
            row["degraded"] = True
            row["availability"] = availability
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    rows.sort(key=lambda r: (order.get(r["band"], 99), -r["risk_score"]))
    return rows


@router.post("/whatif")
def whatif(payload: WhatIfPayload):
    return assess_outage(payload.node_id, day_type=payload.day_type, total=payload.total, availability=payload.availability)
