"""Project meeting transcripts — record/paste or upload a meeting, auto-extract
structured minutes (attendees, decisions, actions), and make it searchable
source material for Ask MAX."""
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, ai
from ..parsing import parse_file

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


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
    return m


@router.delete("/{mid}")
def delete_meeting(mid: str, db: Session = Depends(get_db)):
    m = db.get(models.Meeting, mid)
    if not m:
        raise HTTPException(404, "Unknown meeting")
    db.delete(m); db.commit()
    return {"ok": True}
