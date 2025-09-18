"""
Core configuration for Qcombinator backend
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Qcombinator"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost/qcombinator"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Fast Scan Settings
    FAST_SCAN_TIME_LIMIT: int = 180  # 3 minutes in seconds
    
    # AI/LLM Settings
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    AI_MODEL: str = "gpt-4-turbo-preview"
    
    # File Storage
    UPLOAD_DIR: str = "uploads"
    REPORTS_DIR: str = "reports"
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Benchmark Data
    BENCHMARK_UPDATE_INTERVAL: int = 86400  # 24 hours
    
    # Confidence Levels
    CONFIDENCE_LEVELS: dict = {
        "E1": {"min": 0.8, "label": "High Confidence", "color": "green"},
        "E2": {"min": 0.5, "label": "Medium Confidence", "color": "yellow"},
        "E3": {"min": 0.0, "label": "Low Confidence", "color": "red"}
    }
    
    # Scoring Weights (Default)
    DEFAULT_WEIGHTS: dict = {
        "market": 0.25,
        "team": 0.25,
        "product": 0.20,
        "financials": 0.20,
        "risk": 0.10
    }
    
    # Module Settings
    MODULES: dict = {
        "SPC": {"enabled": True, "timeout": 30},
        "DUP": {"enabled": True, "timeout": 60},
        "DQM": {"enabled": True, "timeout": 20},
        "CEC": {"enabled": True, "timeout": 10},
        "EWM": {"enabled": True, "timeout": 20},
        "IBA": {"enabled": True, "timeout": 30},
        "MCI": {"enabled": True, "timeout": 40},
        "TLA": {"enabled": True, "timeout": 30},
        "FDA": {"enabled": True, "timeout": 30},
        "RAS": {"enabled": True, "timeout": 30},
        "ACE": {"enabled": True, "timeout": 60},
        "ERG": {"enabled": True, "timeout": 30}
    }
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()