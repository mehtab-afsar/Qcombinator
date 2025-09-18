"""
Qcombinator Backend - Fast Scan MVP
AI-powered startup valuation platform
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from typing import List, Optional
import os
from datetime import datetime

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import api_router
from app.services.orchestrator import FastScanOrchestrator

# Create database tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Qcombinator Backend Starting...")
    print(f"Fast Scan Target: {settings.FAST_SCAN_TIME_LIMIT} seconds")
    yield
    # Shutdown
    print("Qcombinator Backend Shutting down...")

app = FastAPI(
    title="Qcombinator API",
    description="AI-powered startup valuation and Fast Scan analysis",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "name": "Qcombinator API",
        "version": "1.0.0",
        "status": "operational",
        "modules": {
            "fast_scan": "ready",
            "document_processing": "ready",
            "ai_evaluation": "ready",
            "benchmark_analysis": "ready"
        }
    }

@app.post("/api/v1/fast-scan")
async def fast_scan(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Fast Scan endpoint - Process startup deck in <3 minutes
    Returns GO/NO-GO decision with top reasons
    """
    
    # Validate file type
    allowed_types = ['.pdf', '.pptx', '.ppt']
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_types:
        raise HTTPException(400, f"File type {file_ext} not supported. Use: {allowed_types}")
    
    # Initialize Fast Scan Orchestrator
    orchestrator = FastScanOrchestrator()
    
    # Start Fast Scan process
    scan_id = await orchestrator.initiate_scan(
        file=file,
        filename=file.filename,
        background_tasks=background_tasks
    )
    
    return {
        "scan_id": scan_id,
        "status": "processing",
        "message": "Fast Scan initiated. Results will be ready in <3 minutes.",
        "check_status_url": f"/api/v1/fast-scan/{scan_id}/status"
    }

@app.get("/api/v1/fast-scan/{scan_id}/status")
async def get_scan_status(scan_id: str):
    """Get Fast Scan processing status"""
    orchestrator = FastScanOrchestrator()
    status = await orchestrator.get_scan_status(scan_id)
    
    if not status:
        raise HTTPException(404, "Scan not found")
    
    return status

@app.get("/api/v1/fast-scan/{scan_id}/report")
async def get_scan_report(scan_id: str):
    """Get Fast Scan one-pager report"""
    orchestrator = FastScanOrchestrator()
    report_path = await orchestrator.get_report_path(scan_id)
    
    if not report_path or not os.path.exists(report_path):
        raise HTTPException(404, "Report not found")
    
    return FileResponse(
        report_path,
        media_type='application/pdf',
        filename=f"fast_scan_{scan_id}.pdf"
    )

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": "connected",
            "redis": "connected",
            "ai_engine": "ready"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3000,
        reload=True
    )