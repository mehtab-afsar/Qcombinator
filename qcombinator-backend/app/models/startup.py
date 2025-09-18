"""
Startup Profile Model (SPC - Phase 1)
Core entity with versioning and audit trail
"""

from sqlalchemy import Column, String, Integer, Float, DateTime, Text, JSON, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class Startup(Base):
    __tablename__ = "startups"
    
    # Primary fields
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    industry = Column(String(100), index=True)
    sub_industry = Column(String(100))
    stage = Column(String(50), index=True)  # Pre-seed, Seed, Series A, B, C+
    
    # Company details
    founded_date = Column(DateTime)
    website = Column(String(255))
    location = Column(String(255))
    team_size = Column(Integer)
    
    # Financial info
    valuation = Column(Float)
    funding_raised = Column(Float)
    last_funding_date = Column(DateTime)
    revenue = Column(Float)
    burn_rate = Column(Float)
    runway_months = Column(Float)
    
    # Version control
    version = Column(Integer, default=1)
    is_current = Column(Boolean, default=True)
    parent_version_id = Column(String, ForeignKey('startups.id'), nullable=True)
    
    # Audit trail
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String(100))
    updated_by = Column(String(100))
    
    # Quality scores (DQM)
    data_completeness_score = Column(Float, default=0.0)
    data_quality_score = Column(Float, default=0.0)
    validation_status = Column(String(50), default='pending')
    validation_issues = Column(JSON, default=list)
    
    # Relationships
    documents = relationship("Document", back_populates="startup")
    evaluations = relationship("Evaluation", back_populates="startup")
    team_members = relationship("TeamMember", back_populates="startup")
    financial_data = relationship("FinancialData", back_populates="startup")
    
    def __repr__(self):
        return f"<Startup {self.name} ({self.stage})>"

class StartupVersion(Base):
    """Track all changes to startup profiles"""
    __tablename__ = "startup_versions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    startup_id = Column(String, ForeignKey('startups.id'))
    version = Column(Integer)
    change_type = Column(String(50))  # create, update, merge, pivot
    changes = Column(JSON)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(String(100))
    notes = Column(Text)