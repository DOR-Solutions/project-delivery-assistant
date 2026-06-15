from sqlalchemy import Column, String, Integer, Float, Text, JSON, ForeignKey, DateTime
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
    project = relationship("Project", back_populates="risks")

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id"))
    generated_at = Column(DateTime, default=datetime.utcnow)
    data = Column(JSON)   # full report snapshot
    project = relationship("Project", back_populates="reports")

class BagDay(Base):
    __tablename__ = "bag_days"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id"))
    date = Column(String)
    day = Column(String)
    series = Column(String)   # 'direct' | 'mitigation' | 'throughput'
    planned = Column(Float, default=0)
    actual = Column(Float, default=0)
    capacity = Column(Float, default=0)
    day_type = Column(String, default="")
    breakdown = Column(JSON, default=dict)  # zone breakdown for mitigation
    project = relationship("Project", back_populates="bag_days")
