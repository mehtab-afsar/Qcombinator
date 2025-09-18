"""
Glass-Box Evaluation API
FastAPI endpoints for the glass-box evaluation engine
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from datetime import datetime
import uvicorn

from core.glass_box_engine import create_glass_box_engine
from core.ontology import Company, Document, CompanyStage

# Initialize the glass-box engine
glass_box_engine = create_glass_box_engine()

app = FastAPI(title="QCombinator Glass-Box Evaluation Engine", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class CompanyCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    founded_date: Optional[str] = None
    location: Optional[str] = None

class EvaluationRequest(BaseModel):
    company_id: Optional[str] = None
    company_data: Optional[CompanyCreateRequest] = None
    evaluation_type: str = "fast_scan"
    custom_weights: Optional[Dict[str, float]] = None
    analyst: str = "user"

class EvaluationResponse(BaseModel):
    evaluation_id: str
    status: str
    message: str

class StatusResponse(BaseModel):
    id: str
    status: str
    company_name: str
    overall_score: float
    overall_confidence: float
    modules_completed: int
    total_modules: int
    created_at: str
    completed_at: Optional[str] = None

@app.get("/")
async def root():
    return {
        "message": "QCombinator Glass-Box Evaluation Engine",
        "version": "1.0.0",
        "features": [
            "Evidence Graph with E1/E2/E3 grading",
            "Domain Playlist Orchestrator", 
            "Hybrid Scoring (Deterministic + ML)",
            "Bias-aware evaluation",
            "Glass-box explainability",
            "Confidence scoring"
        ]
    }

@app.post("/api/v1/evaluations", response_model=EvaluationResponse)
async def start_evaluation(request: EvaluationRequest):
    """Start a new glass-box evaluation"""
    
    try:
        # Create or get company
        if request.company_data:
            # Create new company from provided data
            company_data = request.company_data
            
            founded_date = None
            if company_data.founded_date:
                try:
                    founded_date = datetime.fromisoformat(company_data.founded_date.replace('Z', '+00:00'))
                except:
                    founded_date = None
            
            company = Company(
                name=company_data.name,
                description=company_data.description,
                website=company_data.website,
                industry=company_data.industry,
                founded_date=founded_date,
                location=company_data.location,
                stage=CompanyStage.SEED  # Default
            )
        else:
            # Would retrieve existing company from database
            raise HTTPException(status_code=400, detail="Company data required")
        
        # Start evaluation
        evaluation_id = await glass_box_engine.start_evaluation(
            company=company,
            evaluation_type=request.evaluation_type,
            custom_weights=request.custom_weights,
            analyst=request.analyst
        )
        
        return EvaluationResponse(
            evaluation_id=evaluation_id,
            status="processing",
            message="Evaluation started successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start evaluation: {str(e)}")

@app.get("/api/v1/evaluations/{evaluation_id}/status", response_model=StatusResponse)
async def get_evaluation_status(evaluation_id: str):
    """Get the current status of an evaluation"""
    
    try:
        status_data = glass_box_engine.get_evaluation_status(evaluation_id)
        
        if "error" in status_data:
            raise HTTPException(status_code=404, detail=status_data["error"])
        
        return StatusResponse(**status_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

@app.get("/api/v1/evaluations/{evaluation_id}/explainability")
async def get_evaluation_explainability(evaluation_id: str):
    """Get full explainability report for an evaluation"""
    
    try:
        explainability = glass_box_engine.get_evaluation_explainability(evaluation_id)
        
        if "error" in explainability:
            raise HTTPException(status_code=404, detail=explainability["error"])
        
        return explainability
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get explainability: {str(e)}")

@app.get("/api/v1/evaluations/{evaluation_id}/evidence-graph")
async def get_evidence_graph(evaluation_id: str):
    """Get evidence graph for visualization"""
    
    try:
        explainability = glass_box_engine.get_evaluation_explainability(evaluation_id)
        
        if "error" in explainability:
            raise HTTPException(status_code=404, detail=explainability["error"])
        
        # Return evidence graph data for visualization
        return {
            "evaluation_id": evaluation_id,
            "evidence_graph": explainability["evidence_graph"],
            "module_evidence_links": [
                {
                    "module_id": module["id"],
                    "module_name": module["name"],
                    "metrics": [
                        {
                            "metric_name": metric["name"],
                            "evidence_sources": metric["evidence_sources"],
                            "evidence_count": metric["evidence_count"]
                        }
                        for metric in module["metrics"]
                    ]
                }
                for module in explainability["module_breakdown"]
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get evidence graph: {str(e)}")

@app.get("/api/v1/evaluations/{evaluation_id}/bias-report")
async def get_bias_report(evaluation_id: str):
    """Get bias analysis report"""
    
    try:
        explainability = glass_box_engine.get_evaluation_explainability(evaluation_id)
        
        if "error" in explainability:
            raise HTTPException(status_code=404, detail=explainability["error"])
        
        bias_analysis = explainability.get("bias_analysis")
        if not bias_analysis:
            raise HTTPException(status_code=404, detail="Bias analysis not available")
        
        return {
            "evaluation_id": evaluation_id,
            "bias_analysis": bias_analysis,
            "interpretation": {
                "bias_magnitude": "Low" if abs(bias_analysis["bias_delta"]) < 0.5 else 
                                "Medium" if abs(bias_analysis["bias_delta"]) < 1.0 else "High",
                "direction": "Positive" if bias_analysis["bias_delta"] > 0 else "Negative",
                "recommendations": [
                    "Review flagged features for potential bias sources",
                    "Consider additional identity-blind validation",
                    "Monitor bias trends across evaluations"
                ]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get bias report: {str(e)}")

@app.get("/api/v1/evaluations/{evaluation_id}/score-breakdown")
async def get_score_breakdown(evaluation_id: str):
    """Get detailed score breakdown with formulas used"""
    
    try:
        explainability = glass_box_engine.get_evaluation_explainability(evaluation_id)
        
        if "error" in explainability:
            raise HTTPException(status_code=404, detail=explainability["error"])
        
        return {
            "evaluation_id": evaluation_id,
            "overall_score": explainability["overall_results"]["score"],
            "overall_confidence": explainability["overall_results"]["confidence"],
            "module_breakdown": explainability["module_breakdown"],
            "scoring_methodology": {
                "deterministic_formulas": [
                    "CAC Payback Period: Score based on months to payback CAC",
                    "LTV:CAC Ratio: Lifetime value to acquisition cost ratio",
                    "Burn Multiple: Capital efficiency metric",
                    "Rule of 40: Growth rate + profit margin",
                    "Gross Margin: Industry-adjusted profitability"
                ],
                "ml_signals": [
                    "Team Credibility: Experience, exits, network analysis",
                    "Market Sentiment: News, trends, funding climate",
                    "Product Differentiation: Uniqueness and complexity"
                ]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get score breakdown: {str(e)}")

@app.get("/api/v1/domain-classifier/analyze")
async def analyze_company_domain(
    description: str,
    website_text: Optional[str] = None,
    industry_hint: Optional[str] = None
):
    """Analyze company domain classification"""
    
    try:
        # Create temporary company for classification
        company = Company(
            name="Analysis Target",
            description=description,
            industry=industry_hint
        )
        
        # Classify domain
        classification = glass_box_engine.domain_classifier.classify_domain(
            company, description, website_text or ""
        )
        
        # Get module recommendations
        modules = glass_box_engine.module_orchestrator.create_evaluation_playlist(classification)
        rationale = glass_box_engine.module_orchestrator.get_module_rationale(classification, modules)
        
        return {
            "classification": {
                "primary_domain": classification.primary_domain,
                "secondary_domains": classification.secondary_domains,
                "confidence": classification.confidence,
                "stage": classification.stage.value,
                "keywords_found": classification.keywords_found
            },
            "recommended_modules": [
                {
                    "id": module.id,
                    "name": module.name,
                    "type": module.type,
                    "weight": module.weight,
                    "description": module.description
                }
                for module in modules
            ],
            "rationale": rationale
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze domain: {str(e)}")

@app.get("/api/v1/benchmarks")
async def get_benchmarks(domain: Optional[str] = None, stage: Optional[str] = None):
    """Get industry and stage benchmarks"""
    
    # Mock benchmark data - in reality would come from database
    benchmarks = {
        "B2B SaaS": {
            "seed": {
                "cac_payback_months": {"p25": 8, "p50": 12, "p75": 18},
                "ltv_cac_ratio": {"p25": 2.5, "p50": 3.2, "p75": 4.8},
                "gross_margin": {"p25": 65, "p50": 75, "p75": 85},
                "burn_multiple": {"p25": 1.5, "p50": 2.2, "p75": 3.5}
            },
            "series_a": {
                "cac_payback_months": {"p25": 6, "p50": 9, "p75": 14},
                "ltv_cac_ratio": {"p25": 3.0, "p50": 4.2, "p75": 6.5},
                "gross_margin": {"p25": 70, "p50": 80, "p75": 90},
                "burn_multiple": {"p25": 1.0, "p50": 1.5, "p75": 2.5}
            }
        },
        "D2C/E-commerce": {
            "seed": {
                "gross_margin": {"p25": 30, "p50": 45, "p75": 60},
                "repeat_purchase_rate": {"p25": 15, "p50": 25, "p75": 40}
            }
        }
    }
    
    if domain and stage:
        return benchmarks.get(domain, {}).get(stage, {})
    elif domain:
        return benchmarks.get(domain, {})
    else:
        return benchmarks

# Test endpoint for integration
@app.post("/api/v1/test-glass-box-scan")
async def test_glass_box_scan(company_name: str = "Test Startup"):
    """Test endpoint for glass-box evaluation (matches existing test server)"""
    
    try:
        # Create test company
        company = Company(
            name=company_name,
            description="AI-powered SaaS platform for enterprise automation",
            website="https://example.com",
            industry="B2B SaaS",
            stage=CompanyStage.SEED,
            location="San Francisco, CA"
        )
        
        # Add mock document
        test_doc = Document(
            name=f"{company_name}_pitch_deck.pdf",
            type="pitch_deck",
            uploaded_at=datetime.utcnow(),
            size=2048000,
            status="processed",
            extracted_data={
                "description": "AI-powered automation platform",
                "revenue": "1.2M ARR",
                "market_size": "$50B TAM"
            }
        )
        company.documents = [test_doc]
        
        # Start evaluation
        evaluation_id = await glass_box_engine.start_evaluation(
            company=company,
            evaluation_type="fast_scan",
            analyst="test_user"
        )
        
        return {
            "evaluation_id": evaluation_id,
            "status": "processing",
            "message": "Glass-box evaluation started",
            "company": company_name,
            "features_enabled": [
                "Evidence grading (E1/E2/E3)",
                "Domain classification", 
                "Hybrid scoring",
                "Bias analysis",
                "Full explainability"
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test scan failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)