from sqlalchemy import Column, String, Integer, Float, Text, JSON, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    terminal = Column(String, default="Unassigned")   # T1..T5 / Programme / Unassigned
    created_at = Column(DateTime, default=datetime.utcnow)
    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")
    risks = relationship("Risk", back_populates="project", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="project", cascade="all, delete-orphan")
    bag_days = relationship("BagDay", back_populates="project", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"))
    name = Column(String)
    kind = Column(String)
    text = Column(Text, default="")
    summary = Column(Text, default="")
    topics = Column(JSON, default=list)
    insights = Column(JSON, default=list)   # [{type,title,detail,...}]
    status = Column(String, default="done")
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="documents")

class Risk(Base):
    __tablename__ = "risks"
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"))
    title = Column(String)
    area = Column(String)
    likelihood = Column(Integer)
    impact = Column(Integer)
    mitigation = Column(Text)
    owner = Column(String)
    status = Column(String, default="open")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    source_ref = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="risks")

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id"))
    generated_at = Column(DateTime, default=datetime.utcnow)
    data = Column(JSON)   # full report snapshot
    project = relationship("Project", back_populates="reports")


class ReportSnapshot(Base):
    __tablename__ = "report_snapshots"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id"))
    date = Column(String)
    completion_pct = Column(Integer, default=0)
    rag = Column(String, default="amber")
    data = Column(JSON, default=dict)
    source_ref = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("project_id", "date", name="uq_report_snapshot_project_date"),)

class BagDay(Base):
    __tablename__ = "bag_days"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id"))
    date = Column(String)
    day = Column(String, default="")
    series = Column(String)   # 'direct' | 'mitigation' | 'throughput'
    planned = Column(Float, default=0)
    actual = Column(Float, default=0)
    capacity = Column(Float, default=0)
    day_type = Column(String, default="")
    breakdown = Column(JSON, default=dict)  # zone breakdown for mitigation
    source_ref = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="bag_days")
    __table_args__ = (UniqueConstraint("project_id", "date", "series", name="uq_bag_day_project_date_series"),)

class WorkLog(Base):
    __tablename__ = "work_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id"))
    date = Column(String)
    activity = Column(String, default="")
    area = Column(String, default="")
    pct = Column(Integer, default=0)
    contractor = Column(String, default="")
    source_ref = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("project_id", "date", "activity", name="uq_work_log_project_date_activity"),)


class Milestone(Base):
    __tablename__ = "milestones"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id"))
    date = Column(String)
    title = Column(String)
    status = Column(String, default="planned")
    detail = Column(Text, default="")
    on_track = Column(Integer, default=1)
    source_ref = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("project_id", "date", "title", name="uq_milestone_project_date_title"),)


class Meeting(Base):
    """A recorded project meeting / stakeholder session and its transcript.
    Structured minutes (attendees, decisions, actions) are auto-extracted so the
    record becomes searchable source material for Ask MAX."""
    __tablename__ = "meetings"
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"))
    title = Column(String)
    meeting_date = Column(String, default="")     # ISO date
    chair = Column(String, default="")
    attendees = Column(JSON, default=list)         # [name]
    transcript = Column(Text, default="")
    summary = Column(Text, default="")
    topics = Column(JSON, default=list)
    decisions = Column(JSON, default=list)         # [str]
    actions = Column(JSON, default=list)           # [{ref,text,owner,due,status}]
    source = Column(String, default="manual")      # manual | upload | seed
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="meetings")


class Task(Base):
    """An action item lifted from a meeting into a live, trackable project
    register — assigned to a PM or supplier, bucketed into a workstream, with a
    status that PMs update as work completes."""
    __tablename__ = "tasks"
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"))
    meeting_id = Column(String, nullable=True)        # most recent meeting it featured in
    ref = Column(String, default="")
    text = Column(Text, default="")
    owner = Column(String, default="")
    owner_type = Column(String, default="pm")          # pm | supplier | unassigned
    workstream = Column(String, default="General")
    due = Column(String, default="")
    status = Column(String, default="open")            # open | in-progress | closed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="tasks")


class IngestManifest(Base):
    """Tracks files auto-ingested from the watched drop-zone (change detection)."""
    __tablename__ = "ingest_manifest"
    id = Column(Integer, primary_key=True, autoincrement=True)
    path = Column(String, unique=True)        # path relative to the watch dir
    sha1 = Column(String)                     # content hash for dedup
    project_id = Column(String)
    document_id = Column(String, nullable=True)
    ingested_at = Column(DateTime, default=datetime.utcnow)
