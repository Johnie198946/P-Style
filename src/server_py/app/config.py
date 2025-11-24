import os
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "PhotoScience API"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "YOUR_SECRET_KEY_PLEASE_CHANGE_IN_PROD"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    
    # Database
    DATABASE_URL: str = "sqlite:///./photostyle.db"

    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-pro-exp-02-05" # Or gemini-1.5-pro
    GEMINI_FLASH_MODEL: str = "gemini-2.0-flash-thinking-exp-01-21"
    GEMINI_TIMEOUT_MS: int = 120000
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3001", "http://127.0.0.1:3001"]

    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache()
def get_settings():
    return Settings()
