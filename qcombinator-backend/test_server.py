"""
Simplified Test Server for Qcombinator Fast Scan
This version works without external dependencies like Redis/PostgreSQL
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
import uuid
import json
from datetime import datetime
import asyncio
import random
from typing import Dict, Any

app = FastAPI(title="Qcombinator Test API")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
scans_db = {}
startups_db = {}

@app.get("/")
async def root():
    return {
        "name": "Qcombinator Fast Scan API (Test Mode)",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "/api/v1/fast-scan": "POST - Upload pitch deck for evaluation",
            "/api/v1/fast-scan/{scan_id}/status": "GET - Check scan status",
            "/api/v1/fast-scan/{scan_id}/report": "GET - Get report",
            "/api/v1/test-scan": "POST - Test scan without file upload",
            "/docs": "Interactive API documentation"
        }
    }

@app.post("/api/v1/fast-scan")
async def fast_scan(file: UploadFile = File(...)):
    """
    Fast Scan endpoint - Process startup deck in <3 minutes
    """
    scan_id = str(uuid.uuid4())
    
    # Simulate async processing
    asyncio.create_task(process_scan(scan_id, file.filename))
    
    return {
        "scan_id": scan_id,
        "status": "processing",
        "message": "Fast Scan initiated. Results will be ready in <3 minutes.",
        "check_status_url": f"/api/v1/fast-scan/{scan_id}/status"
    }

@app.post("/api/v1/test-scan")
async def test_scan(company_name: str = "Test Startup"):
    """
    Test endpoint - Simulate scan without file upload
    """
    scan_id = str(uuid.uuid4())
    
    # Simulate async processing
    asyncio.create_task(process_scan(scan_id, f"{company_name}.pdf"))
    
    return {
        "scan_id": scan_id,
        "status": "processing",
        "message": "Test scan initiated. Check status in 5-10 seconds.",
        "check_status_url": f"/api/v1/fast-scan/{scan_id}/status"
    }

async def process_scan(scan_id: str, filename: str):
    """Simulate Fast Scan processing"""
    
    # Initial status
    scans_db[scan_id] = {
        "id": scan_id,
        "filename": filename,
        "status": "processing",
        "progress": 0,
        "started_at": datetime.utcnow().isoformat()
    }
    
    # Simulate processing stages
    stages = [
        ("Extracting document data...", 20, 2),
        ("Validating data quality...", 40, 1),
        ("Running market analysis...", 60, 2),
        ("Assessing team & financials...", 80, 2),
        ("Generating AI evaluation...", 90, 2),
        ("Creating report...", 100, 1)
    ]
    
    for message, progress, delay in stages:
        await asyncio.sleep(delay)
        scans_db[scan_id]["status"] = message
        scans_db[scan_id]["progress"] = progress
    
    # Generate final results
    scores = {
        "overall": round(random.uniform(6.0, 9.0), 1),
        "market": round(random.uniform(6.0, 9.5), 1),
        "team": round(random.uniform(5.5, 9.0), 1),
        "product": round(random.uniform(6.0, 8.5), 1),
        "financial": round(random.uniform(5.0, 8.0), 1),
        "risk": round(random.uniform(6.0, 8.5), 1)
    }
    
    decision = "GO" if scores["overall"] >= 7.0 else "NO-GO"
    
    strengths = [
        "Large and growing TAM ($50B+) with clear market need",
        "Experienced founding team with domain expertise",
        "Strong early traction with 30% MoM growth"
    ]
    
    risks = [
        "High customer acquisition cost needs optimization",
        "Limited runway (12 months) requires immediate fundraising",
        "Competitive market with well-funded players"
    ]
    
    # Final results
    scans_db[scan_id].update({
        "status": "completed",
        "progress": 100,
        "completed_at": datetime.utcnow().isoformat(),
        "decision": decision,
        "scores": scores,
        "confidence": random.choice(["E1", "E2", "E2"]),  # More likely E2
        "top_reasons": strengths[:2] if decision == "GO" else risks[:2],
        "strengths": strengths,
        "risks": risks,
        "key_questions": [
            "What is the plan to reduce CAC by 50% in next 6 months?",
            "How will you extend runway to 18+ months?",
            "What's your competitive moat against funded competitors?"
        ],
        "processing_time": round(random.uniform(45, 120), 1)
    })

@app.get("/api/v1/fast-scan/{scan_id}/status")
async def get_scan_status(scan_id: str):
    """Get Fast Scan status"""
    if scan_id not in scans_db:
        raise HTTPException(404, "Scan not found")
    
    return scans_db[scan_id]

@app.get("/api/v1/fast-scan/{scan_id}/report")
async def get_scan_report(scan_id: str):
    """Get Fast Scan report (text version for testing)"""
    if scan_id not in scans_db:
        raise HTTPException(404, "Scan not found")
    
    scan = scans_db[scan_id]
    
    if scan["status"] != "completed":
        raise HTTPException(400, "Scan not completed yet")
    
    # Generate text report
    report = f"""
QCOMBINATOR FAST SCAN REPORT
============================
Date: {scan['completed_at']}
File: {scan['filename']}
Processing Time: {scan['processing_time']}s

DECISION: {scan['decision']}
Confidence: {scan['confidence']}

SCORES:
-------
Overall:    {scan['scores']['overall']}/10
Market:     {scan['scores']['market']}/10
Team:       {scan['scores']['team']}/10
Product:    {scan['scores']['product']}/10
Financial:  {scan['scores']['financial']}/10
Risk:       {scan['scores']['risk']}/10

TOP REASONS:
------------
{chr(10).join(f"• {r}" for r in scan['top_reasons'])}

STRENGTHS:
----------
{chr(10).join(f"• {s}" for s in scan['strengths'])}

RISKS:
------
{chr(10).join(f"• {r}" for r in scan['risks'])}

KEY DILIGENCE QUESTIONS:
------------------------
{chr(10).join(f"{i+1}. {q}" for i, q in enumerate(scan['key_questions']))}

Generated by Qcombinator Fast Scan v1.0
"""
    
    return PlainTextResponse(report)

@app.get("/api/v1/startups")
async def get_startups():
    """Get all startups"""
    return list(startups_db.values())

@app.post("/api/v1/startups")
async def create_startup(startup: dict):
    """Create startup"""
    startup_id = str(uuid.uuid4())
    startup["id"] = startup_id
    startup["created_at"] = datetime.utcnow().isoformat()
    startups_db[startup_id] = startup
    return startup

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    print("\n>>> Starting Qcombinator Test Server...")
    print(">>> API: http://localhost:8000")
    print(">>> Docs: http://localhost:8000/docs")
    print("\n>>> Try the test endpoint first: POST /api/v1/test-scan")
    uvicorn.run(app, host="0.0.0.0", port=8000)