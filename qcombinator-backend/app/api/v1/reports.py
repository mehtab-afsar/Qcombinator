"""
Reports API - Phase 4: Deep Dive & Phase 5: Tracking
Handles IC memos, comparables, scenarios, and performance tracking
"""

from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List, Optional, Literal
from datetime import datetime, timedelta
import uuid
import json

router = APIRouter()

# In-memory storage for MVP
reports_db = {}
comparables_db = {}
scenarios_db = {}
tracking_db = {}

@router.post("/deep-dive")
async def create_deep_dive_report(
    evaluation_id: str = Body(...),
    comparable_companies: List[Dict[str, Any]] = Body(...),
    valuation_guardrails: Dict[str, float] = Body(...)
):
    """
    Phase 4: Deep Dive - 30 min analysis when Fast Score isn't sufficient
    Generates IC memo, term sheet starter, and sensitivity analysis
    """
    
    report_id = str(uuid.uuid4())
    
    # Find similar exits and multiples
    comparables = analyze_comparables(comparable_companies)
    
    # Run scenario analysis (bear/base/bull)
    scenarios = run_scenario_analysis(evaluation_id, valuation_guardrails)
    
    # Generate sensitivity analysis
    sensitivity = calculate_sensitivity_analysis(scenarios, valuation_guardrails)
    
    # Create IC memo content
    ic_memo = generate_ic_memo(evaluation_id, comparables, scenarios, sensitivity)
    
    # Generate term sheet starter
    term_sheet = generate_term_sheet(valuation_guardrails, scenarios['base'])
    
    # Store report
    deep_dive_report = {
        'report_id': report_id,
        'evaluation_id': evaluation_id,
        'created_at': datetime.utcnow().isoformat(),
        'comparables': comparables,
        'scenarios': scenarios,
        'sensitivity_analysis': sensitivity,
        'ic_memo': ic_memo,
        'term_sheet': term_sheet,
        'investment_package_ready': True
    }
    
    reports_db[report_id] = deep_dive_report
    
    return deep_dive_report

@router.get("/{report_id}")
async def get_report(report_id: str):
    """Get deep dive report by ID"""
    if report_id not in reports_db:
        raise HTTPException(404, "Report not found")
    
    return reports_db[report_id]

@router.post("/track-performance")
async def track_performance(
    evaluation_id: str = Body(...),
    metrics_update: Dict[str, Any] = Body(...),
    source: Literal["manual", "api", "connected"] = Body("manual")
):
    """
    Phase 5: Track ongoing performance for portfolio companies
    Updates living deal record with performance data
    """
    
    tracking_id = str(uuid.uuid4())
    
    # Calculate performance vs initial evaluation
    performance_delta = calculate_performance_delta(evaluation_id, metrics_update)
    
    # Check against monitoring thresholds
    threshold_alerts = check_threshold_breaches(evaluation_id, metrics_update)
    
    # Update tracking record
    tracking_record = {
        'tracking_id': tracking_id,
        'evaluation_id': evaluation_id,
        'timestamp': datetime.utcnow().isoformat(),
        'metrics_update': metrics_update,
        'source': source,
        'performance_delta': performance_delta,
        'threshold_alerts': threshold_alerts,
        'state': 'MONITORING'
    }
    
    # Store tracking update
    if evaluation_id not in tracking_db:
        tracking_db[evaluation_id] = []
    tracking_db[evaluation_id].append(tracking_record)
    
    # Calibrate model with outcome data
    if metrics_update.get('exit_event') or metrics_update.get('shutdown'):
        calibrate_model(evaluation_id, metrics_update)
    
    return {
        'tracking_id': tracking_id,
        'performance_summary': performance_delta,
        'alerts': threshold_alerts,
        'tracking_count': len(tracking_db[evaluation_id])
    }

@router.get("/tracking/{evaluation_id}")
async def get_tracking_history(evaluation_id: str):
    """Get all tracking updates for an evaluation"""
    if evaluation_id not in tracking_db:
        return {'evaluation_id': evaluation_id, 'tracking_history': [], 'message': 'No tracking data'}
    
    return {
        'evaluation_id': evaluation_id,
        'tracking_history': tracking_db[evaluation_id],
        'latest_update': tracking_db[evaluation_id][-1] if tracking_db[evaluation_id] else None
    }

@router.post("/generate-ic-memo")
async def generate_standalone_ic_memo(
    evaluation_id: str = Body(...),
    custom_sections: Optional[Dict[str, str]] = Body(None)
):
    """Generate IC memo without full deep dive"""
    
    memo = generate_ic_memo(evaluation_id, {}, {}, {}, custom_sections)
    
    memo_id = str(uuid.uuid4())
    memo_record = {
        'memo_id': memo_id,
        'evaluation_id': evaluation_id,
        'created_at': datetime.utcnow().isoformat(),
        'content': memo,
        'type': 'ic_memo'
    }
    
    return memo_record

@router.get("/metrics-dashboard")
async def get_metrics_dashboard():
    """
    Get overall platform metrics for model calibration
    Track: Efficiency, Accuracy, Coverage, Engagement
    """
    
    # Calculate platform metrics
    total_evaluations = len(reports_db) + 100  # Mock data
    
    metrics = {
        'efficiency': {
            'deck_to_decision_avg_hours': 3.5,
            'target_hours': 4,
            'achievement': '87.5%'
        },
        'accuracy': {
            'score_outcome_correlation': 0.72,
            'false_positive_rate': 0.15,
            'false_negative_rate': 0.08
        },
        'coverage': {
            'high_confidence_signals': '68%',
            'data_completeness_avg': '74%',
            'enrichment_rate': '42%'
        },
        'engagement': {
            'founder_portal_completion': '38%',
            'data_corrections_rate': '22%',
            'monitoring_adoption': '85%'
        },
        'total_evaluations': total_evaluations,
        'active_monitoring': len(tracking_db),
        'model_last_calibrated': datetime.utcnow().isoformat()
    }
    
    return metrics

# Helper functions
def analyze_comparables(companies: List[Dict]) -> Dict:
    """Analyze comparable companies for valuation"""
    
    if not companies:
        return {'message': 'No comparables provided'}
    
    # Calculate valuation multiples
    revenue_multiples = []
    ebitda_multiples = []
    
    for company in companies:
        if company.get('exit_valuation') and company.get('revenue'):
            revenue_multiples.append(company['exit_valuation'] / company['revenue'])
        if company.get('exit_valuation') and company.get('ebitda'):
            ebitda_multiples.append(company['exit_valuation'] / company['ebitda'])
    
    return {
        'company_count': len(companies),
        'revenue_multiple_median': sum(revenue_multiples) / len(revenue_multiples) if revenue_multiples else 0,
        'revenue_multiple_range': [min(revenue_multiples), max(revenue_multiples)] if revenue_multiples else [0, 0],
        'ebitda_multiple_median': sum(ebitda_multiples) / len(ebitda_multiples) if ebitda_multiples else 0,
        'sample_companies': [c.get('name', 'Unknown') for c in companies[:3]]
    }

def run_scenario_analysis(evaluation_id: str, guardrails: Dict) -> Dict:
    """Run bear/base/bull scenarios"""
    
    # Mock scenario analysis
    base_valuation = guardrails.get('target_valuation', 10_000_000)
    
    scenarios = {
        'bear': {
            'valuation': base_valuation * 0.6,
            'revenue_growth': '10%',
            'exit_timeline': '7 years',
            'return_multiple': 2.5,
            'assumptions': [
                'Market downturn reduces multiples',
                'Slower customer acquisition',
                'Extended path to profitability'
            ]
        },
        'base': {
            'valuation': base_valuation,
            'revenue_growth': '25%',
            'exit_timeline': '5 years',
            'return_multiple': 5.0,
            'assumptions': [
                'Market conditions remain stable',
                'Execution per plan',
                'Normal competitive dynamics'
            ]
        },
        'bull': {
            'valuation': base_valuation * 1.8,
            'revenue_growth': '40%',
            'exit_timeline': '4 years',
            'return_multiple': 10.0,
            'assumptions': [
                'Market expansion accelerates',
                'Product-market fit achieved quickly',
                'Strategic acquisition interest'
            ]
        }
    }
    
    return scenarios

def calculate_sensitivity_analysis(scenarios: Dict, guardrails: Dict) -> Dict:
    """Calculate sensitivity to key variables"""
    
    base_valuation = guardrails.get('target_valuation', 10_000_000)
    
    sensitivity = {
        'revenue_growth_impact': {
            '+10%': base_valuation * 1.15,
            'base': base_valuation,
            '-10%': base_valuation * 0.85
        },
        'exit_timing_impact': {
            '3_years': base_valuation * 0.8,
            '5_years': base_valuation,
            '7_years': base_valuation * 1.3
        },
        'market_multiple_impact': {
            '3x': base_valuation * 0.6,
            '5x': base_valuation,
            '8x': base_valuation * 1.6
        },
        'key_drivers': [
            'Revenue growth rate',
            'Market multiples',
            'Time to exit'
        ]
    }
    
    return sensitivity

def generate_ic_memo(evaluation_id: str, comparables: Dict, scenarios: Dict, 
                     sensitivity: Dict, custom_sections: Dict = None) -> Dict:
    """Generate Investment Committee memo"""
    
    memo = {
        'executive_summary': {
            'recommendation': 'INVEST',
            'amount': '$2M',
            'valuation': '$10M post',
            'ownership': '20%',
            'key_thesis': 'Strong team with proven traction in growing market'
        },
        'company_overview': {
            'description': 'B2B SaaS platform for X',
            'founded': '2021',
            'headquarters': 'San Francisco, CA',
            'team_size': 12,
            'stage': 'Seed'
        },
        'investment_thesis': [
            'Experienced team with domain expertise',
            'Strong product-market fit indicators',
            'Favorable unit economics',
            'Large and growing addressable market'
        ],
        'key_metrics': {
            'arr': '$1.2M',
            'growth_rate': '15% MoM',
            'gross_margin': '78%',
            'cac_payback': '8 months',
            'ndr': '115%'
        },
        'risks': [
            'Competition from established players',
            'Dependency on key customer segment',
            'Regulatory uncertainty in target market'
        ],
        'mitigation_strategies': [
            'Differentiate through superior UX',
            'Diversify customer base',
            'Engage regulatory counsel'
        ],
        'comparables': comparables if comparables else {},
        'scenarios': scenarios if scenarios else {},
        'sensitivity': sensitivity if sensitivity else {},
        'recommendation_rationale': 'Strong founding team with clear vision and early traction. Favorable market dynamics and reasonable valuation support investment thesis.',
        'next_steps': [
            'Complete legal due diligence',
            'Customer reference checks',
            'Technical architecture review'
        ]
    }
    
    # Add custom sections if provided
    if custom_sections:
        memo.update(custom_sections)
    
    return memo

def generate_term_sheet(guardrails: Dict, base_scenario: Dict) -> Dict:
    """Generate term sheet starter"""
    
    term_sheet = {
        'security_type': 'Series Seed Preferred Stock',
        'investment_amount': guardrails.get('investment_amount', '$2M'),
        'pre_money_valuation': guardrails.get('pre_money', '$8M'),
        'post_money_valuation': guardrails.get('target_valuation', '$10M'),
        'ownership_percentage': '20%',
        'liquidation_preference': '1x non-participating',
        'dividend': 'None',
        'anti_dilution': 'Broad-based weighted average',
        'board_composition': '5 members (2 founders, 2 investors, 1 independent)',
        'voting_rights': 'Vote together with common on as-converted basis',
        'information_rights': 'Monthly financials, annual budget, quarterly board meetings',
        'pro_rata_rights': 'Major investors (>$500k)',
        'founder_vesting': '4 years with 1-year cliff',
        'key_person_insurance': '$2M on founders',
        'conditions_precedent': [
            'Satisfactory legal due diligence',
            'Employment agreements with key employees',
            'Board approval'
        ]
    }
    
    return term_sheet

def calculate_performance_delta(evaluation_id: str, metrics: Dict) -> Dict:
    """Calculate performance change vs initial evaluation"""
    
    # Mock calculation
    initial_arr = 1_200_000
    current_arr = metrics.get('arr', initial_arr)
    
    return {
        'arr_growth': f"{((current_arr - initial_arr) / initial_arr * 100):.1f}%",
        'metrics_improved': ['arr', 'customer_count'],
        'metrics_declined': ['runway'],
        'overall_trajectory': 'positive' if current_arr > initial_arr else 'neutral'
    }

def check_threshold_breaches(evaluation_id: str, metrics: Dict) -> List[Dict]:
    """Check if metrics breach monitoring thresholds"""
    
    alerts = []
    
    # Mock threshold checks
    if metrics.get('runway_months', 18) < 6:
        alerts.append({
            'type': 'critical',
            'metric': 'runway',
            'message': 'Runway below 6 months',
            'value': metrics.get('runway_months')
        })
    
    if metrics.get('monthly_burn', 0) > 200_000:
        alerts.append({
            'type': 'warning',
            'metric': 'burn_rate',
            'message': 'Burn rate exceeds threshold',
            'value': metrics.get('monthly_burn')
        })
    
    return alerts

def calibrate_model(evaluation_id: str, outcome: Dict):
    """Calibrate scoring model based on actual outcomes"""
    
    # In production, would update ML model weights
    calibration = {
        'evaluation_id': evaluation_id,
        'outcome': outcome.get('exit_event') or 'shutdown',
        'calibrated_at': datetime.utcnow().isoformat(),
        'adjustments': 'Model weights updated based on outcome'
    }
    
    # Store calibration record
    return calibration