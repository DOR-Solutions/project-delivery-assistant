"""Project meeting transcripts — record/paste or upload a meeting, auto-extract
structured minutes (attendees, decisions, actions), and make it searchable
source material for Ask MAX."""
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, ai, actions, portfolio
from ..parsing import parse_file
from pydantic import BaseModel

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


class TaskPatch(BaseModel):
    status: str | None = None
    owner: str | None = None
    due: str | None = None
    workstream: str | None = None


def _apply_extract(m: models.Meeting, ex: dict, keep_attendees: bool):
    m.summary = ex.get("summary", "")
    m.topics = ex.get("topics", [])
    m.decisions = ex.get("decisions", [])
    m.actions = ex.get("actions", [])
    if not keep_attendees:
        m.attendees = ex.get("attendees", []) or m.attendees
    if not m.chair:
        m.chair = ex.get("chair", "")


@router.get("", response_model=list[schemas.MeetingOut])
def list_meetings(project_id: str, db: Session = Depends(get_db)):
    return (db.query(models.Meeting)
            .filter(models.Meeting.project_id == project_id)
            .order_by(models.Meeting.meeting_date.desc()).all())


@router.get("/{mid}", response_model=schemas.MeetingDetailOut)
def get_meeting(mid: str, db: Session = Depends(get_db)):
    m = db.get(models.Meeting, mid)
    if not m:
        raise HTTPException(404, "Unknown meeting")
    return m


@router.post("", response_model=schemas.MeetingDetailOut)
async def create_meeting(body: schemas.MeetingIn, db: Session = Depends(get_db)):
    if not (body.transcript or "").strip():
        raise HTTPException(400, "Transcript is required")
    m = models.Meeting(id=uuid.uuid4().hex[:12], project_id=body.project_id,
                        title=body.title, meeting_date=body.meeting_date,
                        chair=body.chair, attendees=body.attendees,
                        transcript=body.transcript[:120000], source="manual")
    ex = await ai.extract_meeting(body.title, body.transcript)
    _apply_extract(m, ex, keep_attendees=bool(body.attendees))
    db.add(m); db.commit(); db.refresh(m)
    actions.sync_meeting_tasks(db, m)
    return m


@router.post("/upload", response_model=schemas.MeetingDetailOut)
async def upload_meeting(project_id: str = Form(...), title: str = Form(""),
                         meeting_date: str = Form(""), file: UploadFile = File(...),
                         db: Session = Depends(get_db)):
    data = await file.read()
    try:
        text, _ = parse_file(file.filename, data)
    except Exception as e:
        raise HTTPException(400, f"Parse failed: {e}")
    title = title or file.filename.rsplit(".", 1)[0]
    m = models.Meeting(id=uuid.uuid4().hex[:12], project_id=project_id, title=title,
                       meeting_date=meeting_date, transcript=text[:120000], source="upload")
    ex = await ai.extract_meeting(title, text)
    _apply_extract(m, ex, keep_attendees=False)
    db.add(m); db.commit(); db.refresh(m)
    actions.sync_meeting_tasks(db, m)
    return m


@router.delete("/{mid}")
def delete_meeting(mid: str, db: Session = Depends(get_db)):
    m = db.get(models.Meeting, mid)
    if not m:
        raise HTTPException(404, "Unknown meeting")
    db.delete(m); db.commit()
    return {"ok": True}


# ---------- action register / progress / agenda (meeting-driven PM workflow) ----------
@router.get("/register/{project_id}")
def action_register(project_id: str, db: Session = Depends(get_db)):
    """Live task register lifted from meeting minutes: progress, assignment
    (PM/supplier) and workstream rollups, plus every action item."""
    return actions.register(db, project_id)


@router.patch("/action/{task_id}")
def update_task(task_id: str, patch: TaskPatch, db: Session = Depends(get_db)):
    """PM updates an action — status (open/in-progress/closed), owner, due,
    workstream — as work progresses."""
    t = db.get(models.Task, task_id)
    if not t:
        raise HTTPException(404, "Unknown task")
    if patch.status:
        t.status = actions.norm_status(patch.status)
    if patch.owner is not None:
        t.owner = patch.owner; t.owner_type = actions.classify_owner(patch.owner)
    if patch.due is not None:
        t.due = patch.due
    if patch.workstream:
        t.workstream = patch.workstream
    from datetime import datetime as _dt
    t.updated_at = _dt.utcnow()
    db.commit()
    return actions._task_dict(t)


@router.get("/update/{project_id}")
def progress_update(project_id: str, db: Session = Depends(get_db)):
    """Generate a project progress update from action completion."""
    return actions.progress_update(db, project_id, portfolio.PROJECTS_META.get(project_id, {}))


@router.get("/agenda/{project_id}")
def next_agenda(project_id: str, db: Session = Depends(get_db)):
    """Generate the draft agenda for the next meeting (standing items + carried-
    forward open actions, grouped by workstream)."""
    return actions.next_agenda(db, project_id, portfolio.PROJECTS_META.get(project_id, {}))
