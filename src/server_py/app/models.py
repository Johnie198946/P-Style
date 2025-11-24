from sqlalchemy import Boolean, Column, Integer, String, DateTime, Text, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String)
    display_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    role = Column(String, default="user") # 'user', 'admin'
    status = Column(String, default="active") # 'active', 'disabled'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    tasks = relationship("AnalysisTask", back_populates="owner")

class AnalysisTask(Base):
    __tablename__ = "analysis_tasks"

    id = Column(String, primary_key=True, index=True) # UUID
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Status tracking
    status = Column(String, default="pending") # pending, part1_completed, processing, completed, failed
    stage = Column(String, default="upload") 
    part2_completed = Column(Boolean, default=False)
    
    # Image References (URLs or Base64 for MVP)
    source_image_url = Column(Text, nullable=True) # Reference Image
    target_image_url = Column(Text, nullable=True) # User Image
    preview_image_url = Column(Text, nullable=True) # Part 3 Result
    
    # Analysis Results (JSON)
    # Using Text for SQLite compatibility, JSON for Postgres/MySQL
    structured_result = Column(JSON, nullable=True) # The massive JSON object
    gemini_raw_response = Column(Text, nullable=True) # Original LLM output for debugging
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="tasks")
