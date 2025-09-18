"""
Document Processing API - Phase 1: Intake
Handles pitch deck upload, parsing, and metric extraction
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid
import json

router = APIRouter()

# In-memory storage for MVP
documents_db = {}
extracted_data_db = {}

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    company_name: Optional[str] = Form(None),
    stage: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    sector: Optional[str] = Form(None),
    website: Optional[str] = Form(None)
):
    """
    Phase 1: Intake - Upload pitch deck and basic info
    Returns extracted metrics with page references
    """
    
    # Validate file type
    allowed_types = ['.pdf', '.pptx', '.ppt', '.docx']
    file_ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    if file_ext not in allowed_types:
        raise HTTPException(400, f"File type {file_ext} not supported. Use: {allowed_types}")
    
    # Generate document ID
    doc_id = str(uuid.uuid4())
    
    # Store document metadata
    doc_metadata = {
        'id': doc_id,
        'filename': file.filename,
        'company_name': company_name or 'Unknown',
        'stage': stage or 'Unknown',
        'location': location or 'Unknown', 
        'sector': sector or 'Unknown',
        'website': website,
        'uploaded_at': datetime.utcnow().isoformat(),
        'status': 'processing',
        'file_size': file.size if hasattr(file, 'size') else 0
    }
    
    documents_db[doc_id] = doc_metadata
    
    # Mock extraction process (in production, would use actual parsing)
    extracted_metrics = await extract_metrics_from_deck(file, doc_metadata)
    
    # Auto-classify domain
    domain = classify_domain(sector, extracted_metrics)
    
    # Create evidence records with page references
    evidence_records = create_evidence_records(extracted_metrics)
    
    # Store extracted data
    extraction_result = {
        'document_id': doc_id,
        'company_profile': {
            'name': company_name,
            'stage': stage,
            'location': location,
            'sector': sector,
            'domain': domain,
            'website': website
        },
        'extracted_metrics': extracted_metrics,
        'evidence_records': evidence_records,
        'extraction_confidence': calculate_extraction_confidence(extracted_metrics),
        'status': 'extracted',
        'extracted_at': datetime.utcnow().isoformat()
    }
    
    extracted_data_db[doc_id] = extraction_result
    documents_db[doc_id]['status'] = 'extracted'
    
    return extraction_result

@router.get("/{document_id}")
async def get_document(document_id: str):
    """Get document metadata and extraction results"""
    if document_id not in documents_db:
        raise HTTPException(404, "Document not found")
    
    doc = documents_db[document_id]
    extracted = extracted_data_db.get(document_id, {})
    
    return {
        'document': doc,
        'extraction': extracted
    }

@router.get("/{document_id}/metrics")
async def get_extracted_metrics(document_id: str):
    """Get just the extracted metrics for a document"""
    if document_id not in extracted_data_db:
        raise HTTPException(404, "Extracted data not found")
    
    return extracted_data_db[document_id]['extracted_metrics']

@router.post("/{document_id}/correct")
async def correct_metrics(document_id: str, corrections: Dict[str, Any]):
    """User can review/correct extracted metrics"""
    if document_id not in extracted_data_db:
        raise HTTPException(404, "Document not found")
    
    # Apply corrections
    extracted = extracted_data_db[document_id]
    for key, value in corrections.items():
        if key in extracted['extracted_metrics']:
            extracted['extracted_metrics'][key]['value'] = value
            extracted['extracted_metrics'][key]['corrected'] = True
            extracted['extracted_metrics'][key]['corrected_at'] = datetime.utcnow().isoformat()
    
    # Recalculate confidence
    extracted['extraction_confidence'] = calculate_extraction_confidence(extracted['extracted_metrics'])
    
    return {'status': 'corrected', 'metrics': extracted['extracted_metrics']}

# Helper functions
async def extract_metrics_from_deck(file: UploadFile, metadata: Dict) -> Dict[str, Any]:
    """Mock metric extraction from pitch deck"""
    
    # In production, would use actual document parsing
    # For now, return mock extracted data
    metrics = {
        'arr': {
            'value': 1200000,
            'unit': 'USD',
            'page_ref': 'slide_8',
            'confidence': 0.85,
            'extracted_text': 'ARR: $1.2M'
        },
        'monthly_burn': {
            'value': 150000,
            'unit': 'USD',
            'page_ref': 'slide_12', 
            'confidence': 0.75,
            'extracted_text': 'Monthly burn rate: $150k'
        },
        'team_size': {
            'value': 12,
            'unit': 'people',
            'page_ref': 'slide_4',
            'confidence': 0.95,
            'extracted_text': '12 full-time employees'
        },
        'funding_stage': {
            'value': 'Seed',
            'page_ref': 'slide_2',
            'confidence': 0.90,
            'extracted_text': 'Raising $3M Seed Round'
        },
        'runway_months': {
            'value': 18,
            'unit': 'months',
            'page_ref': 'slide_12',
            'confidence': 0.70,
            'extracted_text': '18 months runway'
        },
        'customer_count': {
            'value': 45,
            'unit': 'customers',
            'page_ref': 'slide_9',
            'confidence': 0.80,
            'extracted_text': '45 enterprise customers'
        },
        'growth_rate': {
            'value': 15,
            'unit': 'percent_monthly',
            'page_ref': 'slide_10',
            'confidence': 0.75,
            'extracted_text': '15% MoM growth'
        }
    }
    
    return metrics

def classify_domain(sector: str, metrics: Dict) -> str:
    """Auto-classify company domain based on sector and metrics"""
    
    sector_lower = (sector or '').lower()
    
    # Domain classification logic
    if 'saas' in sector_lower or 'software' in sector_lower:
        if metrics.get('arr', {}).get('value', 0) > 0:
            return 'B2B SaaS'
        return 'Software'
    elif 'consumer' in sector_lower or 'retail' in sector_lower:
        return 'Consumer'
    elif 'health' in sector_lower or 'medical' in sector_lower:
        return 'Healthcare'
    elif 'fintech' in sector_lower or 'finance' in sector_lower:
        return 'Fintech'
    elif 'food' in sector_lower or 'restaurant' in sector_lower:
        return 'Food/QSR'
    else:
        # Default classification based on metrics
        if metrics.get('arr', {}).get('value', 0) > 0:
            return 'B2B'
        elif metrics.get('customer_count', {}).get('value', 0) > 100:
            return 'B2C'
        else:
            return 'General Tech'

def create_evidence_records(metrics: Dict) -> List[Dict]:
    """Create evidence records with source references"""
    
    evidence = []
    
    for metric_name, metric_data in metrics.items():
        evidence.append({
            'metric': metric_name,
            'value': metric_data.get('value'),
            'source': 'pitch_deck',
            'page_reference': metric_data.get('page_ref'),
            'confidence': metric_data.get('confidence', 0.5),
            'extracted_text': metric_data.get('extracted_text'),
            'timestamp': datetime.utcnow().isoformat()
        })
    
    return evidence

def calculate_extraction_confidence(metrics: Dict) -> float:
    """Calculate overall extraction confidence"""
    
    if not metrics:
        return 0.0
    
    confidences = [m.get('confidence', 0.5) for m in metrics.values()]
    return sum(confidences) / len(confidences) if confidences else 0.0