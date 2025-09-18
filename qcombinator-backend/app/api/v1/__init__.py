"""
API v1 Router
Combines all API endpoints
"""

from fastapi import APIRouter
from app.api.v1 import startups, evaluations, documents, reports

api_router = APIRouter()

# Include all routers
api_router.include_router(startups.router, prefix="/startups", tags=["startups"])
api_router.include_router(evaluations.router, prefix="/evaluations", tags=["evaluations"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])