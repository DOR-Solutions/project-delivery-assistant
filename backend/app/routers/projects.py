from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import uuid
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/projects", tags=["projects"])

@router.get("", response_model=list[schemas.ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.query(models.Project).all()

@router.post("", response_model=schemas.ProjectOut)
def create_project(p: schemas.ProjectIn, db: Session = Depends(get_db)):
    obj = models.Project(id=uuid.uuid4().hex[:12], name=p.name, terminal=p.terminal)
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/by-terminal")
def by_terminal(db: Session = Depends(get_db)):
    out: dict[str, list] = {}
    for p in db.query(models.Project).all():
        out.setdefault(p.terminal or "Unassigned", []).append({"id": p.id, "name": p.name, "terminal": p.terminal})
    return out
