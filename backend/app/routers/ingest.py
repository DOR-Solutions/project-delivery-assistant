from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, ingest_watch

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


@router.get("/status")
def status(db: Session = Depends(get_db)):
    return ingest_watch.status(db)


@router.post("/scan")
def scan():
    """Scan the watched drop-zone now and ingest new/changed files."""
    return ingest_watch.scan()


@router.get("/trend")
def trend(project_id: str, db: Session = Depends(get_db)):
    """Timestamped KPI snapshots for a project (change over time)."""
    rows = (db.query(models.Report)
            .filter(models.Report.project_id == project_id)
            .order_by(models.Report.generated_at).all())
    return [{"t": r.generated_at.isoformat(), **(r.data or {})} for r in rows]
