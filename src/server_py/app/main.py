from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.models import Base
from sqlalchemy import create_engine

settings = get_settings()

app = FastAPI(title=settings.APP_NAME, version="4.0.0")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Init (Dev only - use Alembic in Prod)
engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {})
Base.metadata.create_all(bind=engine)

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "4.0.0", "backend": "python-fastapi"}

from fastapi.staticfiles import StaticFiles
from app.routes import analyze, photos
import os

# ... existing code ...

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(analyze.router, prefix="/api/analyze", tags=["analyze"])
app.include_router(photos.router, prefix="/api/photos", tags=["photos"])
