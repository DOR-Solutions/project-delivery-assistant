from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
import uuid
from ..database import get_db
from .. import models, schemas
from ..parsing import parse_file
from ..ai import extract_insights

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.get("", response_model=list[schemas.DocumentOut])
def list_docs(project_id: str, db: Session = Depends(get_db)):
    return db.query(models.Document).filter(models.Document.project_id == project_id).all()

@router.post("/upload", response_model=schemas.DocumentOut)
async def upload(project_id: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db)):
    data = await file.read()
    try:
        text, kind = parse_file(file.filename, data)
    except Exception as e:
        raise HTTPException(400, f"Parse failed: {e}")
    ai = await extract_insights(file.filename, text)
    doc = models.Document(id=uuid.uuid4().hex[:12], project_id=project_id, name=file.filename,
                          kind=kind, text=text[:60000], summary=ai.get("summary", ""),
                          topics=ai.get("topics", []), insights=ai.get("insights", []), status="done")
    db.add(doc); db.commit(); db.refresh(doc)
    return doc
