from pydantic import BaseModel
from typing import Any, Optional

class ProjectIn(BaseModel):
    name: str
    terminal: str = "Unassigned"

class ProjectOut(BaseModel):
    id: str
    name: str
    terminal: str
    class Config: from_attributes = True

class DocumentOut(BaseModel):
    id: str
    name: str
    kind: str
    summary: str = ""
    topics: list = []
    insights: list = []
    status: str = "done"
    class Config: from_attributes = True

class ChatIn(BaseModel):
    project_id: str
    message: str
    history: list[dict] = []

class MeetingIn(BaseModel):
    project_id: str
    title: str
    meeting_date: str = ""
    attendees: list[str] = []
    chair: str = ""
    transcript: str

class MeetingOut(BaseModel):
    id: str
    project_id: str
    title: str
    meeting_date: str = ""
    chair: str = ""
    attendees: list = []
    summary: str = ""
    topics: list = []
    decisions: list = []
    actions: list = []
    source: str = "manual"
    class Config: from_attributes = True

class MeetingDetailOut(MeetingOut):
    transcript: str = ""
