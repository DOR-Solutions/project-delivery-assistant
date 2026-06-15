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
