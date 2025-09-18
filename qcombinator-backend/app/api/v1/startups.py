"""
Startup API endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
import uuid

router = APIRouter()

# Mock database (in-memory for MVP)
startups_db = {}

@router.get("/")
async def get_startups():
    """Get all startups"""
    return list(startups_db.values())

@router.post("/")
async def create_startup(startup: dict):
    """Create new startup profile"""
    startup_id = str(uuid.uuid4())
    startup['id'] = startup_id
    startup['created_at'] = datetime.utcnow().isoformat()
    startup['data_completeness_score'] = 0.0
    startup['validation_status'] = 'pending'
    
    startups_db[startup_id] = startup
    return startup

@router.get("/{startup_id}")
async def get_startup(startup_id: str):
    """Get startup by ID"""
    if startup_id not in startups_db:
        raise HTTPException(404, "Startup not found")
    return startups_db[startup_id]