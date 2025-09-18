"""
Evaluation API - Phase 2: Fast Score
Instant scoring across 5 dimensions with confidence levels
"""

from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List, Optional, Literal
from datetime import datetime
import uuid

router = APIRouter()

# In-memory storage for MVP
evaluations_db = {}
scores_db = {}

# State management
evaluation_states = {}

@router.post("/fast-score")
async def fast_score_evaluation(
    document_id: str = Body(...),
    corrected_metrics: Optional[Dict[str, Any]] = Body(None),
    connect_data_sources: Optional[Dict[str, str]] = Body(None)
):
    """
    Phase 2: Fast Score - Instant evaluation across 5 dimensions
    Returns GO/MAYBE/PASS recommendation with confidence scores
    """
    
    evaluation_id = str(uuid.uuid4())
    
    # Get document metrics (would fetch from documents service)
    metrics = corrected_metrics or get_document_metrics(document_id)
    
    # Score across 5 dimensions
    dimension_scores = score_five_dimensions(metrics)
    
    # Weight evidence by source quality & recency
    weighted_scores = apply_evidence_weighting(dimension_scores, metrics)
    
    # Compare to stage-appropriate benchmarks
    benchmark_comparison = compare_to_benchmarks(weighted_scores, metrics.get('stage', 'Seed'))
    
    # Flag conflicts & gaps
    data_quality = analyze_data_quality(metrics)
    
    # Calculate overall recommendation
    recommendation = calculate_recommendation(weighted_scores, data_quality)
    
    # Store evaluation
    evaluation_result = {
        'evaluation_id': evaluation_id,
        'document_id': document_id,
        'state': 'ANALYZED',
        'timestamp': datetime.utcnow().isoformat(),
        'dimension_scores': dimension_scores,
        'weighted_scores': weighted_scores,
        'benchmark_comparison': benchmark_comparison,
        'data_quality': data_quality,
        'recommendation': recommendation,
        'top_strengths': identify_top_strengths(weighted_scores, benchmark_comparison),
        'top_concerns': identify_top_concerns(weighted_scores, data_quality),
        'missing_data_impact': calculate_missing_data_impact(data_quality)
    }
    
    evaluations_db[evaluation_id] = evaluation_result
    evaluation_states[evaluation_id] = 'ANALYZED'
    
    return evaluation_result

@router.get("/{evaluation_id}")
async def get_evaluation(evaluation_id: str):
    """Get evaluation results by ID"""
    if evaluation_id not in evaluations_db:
        raise HTTPException(404, "Evaluation not found")
    
    return evaluations_db[evaluation_id]

@router.post("/{evaluation_id}/enrich")
async def enrich_evaluation(
    evaluation_id: str,
    additional_data: Dict[str, Any]
):
    """
    Phase 3 integration: Enrich evaluation with additional founder data
    Re-scores with higher confidence
    """
    
    if evaluation_id not in evaluations_db:
        raise HTTPException(404, "Evaluation not found")
    
    evaluation = evaluations_db[evaluation_id]
    
    # Merge additional data
    enriched_metrics = {**evaluation.get('metrics', {}), **additional_data}
    
    # Re-score with enriched data
    new_dimension_scores = score_five_dimensions(enriched_metrics)
    new_weighted_scores = apply_evidence_weighting(new_dimension_scores, enriched_metrics)
    
    # Create before/after view
    before_after = {
        'before': {
            'scores': evaluation['weighted_scores'],
            'confidence': evaluation['data_quality']['overall_confidence']
        },
        'after': {
            'scores': new_weighted_scores,
            'confidence': calculate_confidence(enriched_metrics)
        }
    }
    
    # Update evaluation
    evaluation['enriched_scores'] = new_weighted_scores
    evaluation['enrichment_comparison'] = before_after
    evaluation['state'] = 'ENRICHED'
    evaluation['enriched_at'] = datetime.utcnow().isoformat()
    
    evaluation_states[evaluation_id] = 'ENRICHED'
    
    return {
        'evaluation_id': evaluation_id,
        'before_after': before_after,
        'material_changes': identify_material_changes(before_after),
        'updated_recommendation': calculate_recommendation(new_weighted_scores, {'overall_confidence': before_after['after']['confidence']})
    }

@router.post("/{evaluation_id}/decision")
async def record_decision(
    evaluation_id: str,
    decision: Literal["INVEST", "PASS", "WATCH"],
    notes: Optional[str] = None,
    monitoring_thresholds: Optional[Dict[str, Any]] = None
):
    """
    Phase 5: Record investment decision and set up monitoring
    """
    
    if evaluation_id not in evaluations_db:
        raise HTTPException(404, "Evaluation not found")
    
    evaluation = evaluations_db[evaluation_id]
    
    # Record decision
    decision_record = {
        'decision': decision,
        'decided_at': datetime.utcnow().isoformat(),
        'decided_by': 'user',  # Would get from auth
        'notes': notes,
        'evaluation_snapshot': evaluation.copy()
    }
    
    # Set up monitoring if investing or watching
    if decision in ['INVEST', 'WATCH'] and monitoring_thresholds:
        monitoring_config = {
            'evaluation_id': evaluation_id,
            'thresholds': monitoring_thresholds,
            'check_frequency': 'monthly',
            'alerts_enabled': True
        }
        # Would store monitoring config
        decision_record['monitoring'] = monitoring_config
    
    # Update state
    evaluation['decision'] = decision_record
    evaluation['state'] = 'DECIDED'
    evaluation_states[evaluation_id] = 'MONITORING' if decision in ['INVEST', 'WATCH'] else 'DECIDED'
    
    return {
        'evaluation_id': evaluation_id,
        'decision': decision,
        'state': evaluation_states[evaluation_id],
        'monitoring_enabled': decision in ['INVEST', 'WATCH']
    }

# Helper functions
def score_five_dimensions(metrics: Dict) -> Dict[str, float]:
    """Score across 5 key dimensions"""
    
    scores = {
        'team': score_team_dimension(metrics),
        'market': score_market_dimension(metrics),
        'traction': score_traction_dimension(metrics),
        'product': score_product_dimension(metrics),
        'risk': score_risk_dimension(metrics)
    }
    
    return scores

def score_team_dimension(metrics: Dict) -> float:
    """Score team strength (0-10)"""
    
    score = 5.0  # Base score
    
    # Founder experience
    if metrics.get('founder_years_experience', 0) > 10:
        score += 2.0
    elif metrics.get('founder_years_experience', 0) > 5:
        score += 1.0
    
    # Team size appropriateness
    team_size = metrics.get('team_size', {}).get('value', 0)
    if 5 <= team_size <= 20:
        score += 1.0
    
    # Previous exits
    if metrics.get('founder_previous_exits', 0) > 0:
        score += 2.0
    
    return min(10.0, score)

def score_market_dimension(metrics: Dict) -> float:
    """Score market opportunity (0-10)"""
    
    score = 5.0
    
    # Market size (TAM)
    tam = metrics.get('tam', 0)
    if tam > 10_000_000_000:  # $10B+
        score += 3.0
    elif tam > 1_000_000_000:  # $1B+
        score += 2.0
    elif tam > 100_000_000:  # $100M+
        score += 1.0
    
    # Growth rate
    growth = metrics.get('growth_rate', {}).get('value', 0)
    if growth > 20:
        score += 2.0
    elif growth > 10:
        score += 1.0
    
    return min(10.0, score)

def score_traction_dimension(metrics: Dict) -> float:
    """Score business traction (0-10)"""
    
    score = 5.0
    
    # ARR
    arr = metrics.get('arr', {}).get('value', 0)
    if arr > 5_000_000:
        score += 3.0
    elif arr > 1_000_000:
        score += 2.0
    elif arr > 100_000:
        score += 1.0
    
    # Customer count
    customers = metrics.get('customer_count', {}).get('value', 0)
    if customers > 100:
        score += 2.0
    elif customers > 10:
        score += 1.0
    
    return min(10.0, score)

def score_product_dimension(metrics: Dict) -> float:
    """Score product strength (0-10)"""
    
    # Simplified scoring
    score = 6.0  # Default average score
    
    # NPS if available
    nps = metrics.get('nps', 0)
    if nps > 50:
        score += 2.0
    elif nps > 30:
        score += 1.0
    
    return min(10.0, score)

def score_risk_dimension(metrics: Dict) -> float:
    """Score risk factors (0-10, higher is better/lower risk)"""
    
    score = 8.0  # Start with low risk
    
    # Burn rate vs runway
    burn = metrics.get('monthly_burn', {}).get('value', 0)
    runway = metrics.get('runway_months', {}).get('value', 18)
    
    if runway < 6:
        score -= 3.0
    elif runway < 12:
        score -= 1.5
    
    # Regulatory risks
    if metrics.get('regulatory_complexity', 'low') == 'high':
        score -= 2.0
    
    return max(0.0, score)

def apply_evidence_weighting(scores: Dict, metrics: Dict) -> Dict:
    """Weight scores by evidence quality and recency"""
    
    weighted = {}
    for dimension, score in scores.items():
        # Get confidence from metrics
        confidence = 0.7  # Default confidence
        
        # Adjust based on data source
        if metrics.get('data_source') == 'verified':
            confidence = 0.95
        elif metrics.get('data_source') == 'self_reported':
            confidence = 0.7
        else:
            confidence = 0.5
        
        weighted[dimension] = {
            'score': score,
            'confidence': confidence,
            'weighted_score': score * confidence
        }
    
    return weighted

def compare_to_benchmarks(scores: Dict, stage: str) -> Dict:
    """Compare scores to stage-appropriate benchmarks"""
    
    # Simplified benchmark data
    benchmarks = {
        'Seed': {'team': 6, 'market': 7, 'traction': 3, 'product': 5, 'risk': 6},
        'Series A': {'team': 7, 'market': 8, 'traction': 6, 'product': 7, 'risk': 7},
        'Series B': {'team': 8, 'market': 8, 'traction': 8, 'product': 8, 'risk': 8}
    }
    
    stage_benchmarks = benchmarks.get(stage, benchmarks['Seed'])
    
    comparison = {}
    for dimension, score_data in scores.items():
        benchmark = stage_benchmarks.get(dimension, 5)
        actual = score_data['score'] if isinstance(score_data, dict) else score_data
        
        comparison[dimension] = {
            'score': actual,
            'benchmark': benchmark,
            'percentile': calculate_percentile(actual, benchmark),
            'vs_benchmark': 'above' if actual > benchmark else 'below' if actual < benchmark else 'at'
        }
    
    return comparison

def calculate_percentile(score: float, benchmark: float) -> int:
    """Calculate approximate percentile based on score vs benchmark"""
    
    if score >= benchmark * 1.2:
        return 90
    elif score >= benchmark:
        return 75
    elif score >= benchmark * 0.8:
        return 50
    elif score >= benchmark * 0.6:
        return 25
    else:
        return 10

def analyze_data_quality(metrics: Dict) -> Dict:
    """Analyze data completeness and quality"""
    
    required_fields = ['arr', 'monthly_burn', 'team_size', 'customer_count', 'growth_rate']
    available_fields = [f for f in required_fields if f in metrics and metrics[f]]
    
    completeness = len(available_fields) / len(required_fields)
    
    # Check confidence levels
    confidences = []
    for field in available_fields:
        if isinstance(metrics[field], dict) and 'confidence' in metrics[field]:
            confidences.append(metrics[field]['confidence'])
    
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0.5
    
    # Identify gaps
    gaps = [f for f in required_fields if f not in available_fields]
    
    # Identify conflicts (simplified)
    conflicts = []
    if metrics.get('arr', {}).get('value', 0) > 0 and metrics.get('customer_count', {}).get('value', 0) == 0:
        conflicts.append('ARR reported but no customers')
    
    return {
        'completeness_score': completeness,
        'overall_confidence': avg_confidence,
        'missing_fields': gaps,
        'conflicts': conflicts,
        'data_quality_grade': 'A' if completeness > 0.8 and avg_confidence > 0.8 else 'B' if completeness > 0.6 else 'C'
    }

def calculate_recommendation(scores: Dict, data_quality: Dict) -> Dict:
    """Calculate GO/MAYBE/PASS recommendation"""
    
    # Calculate weighted average score
    total_score = 0
    total_weight = 0
    
    for dimension, score_data in scores.items():
        if isinstance(score_data, dict):
            score = score_data.get('weighted_score', score_data.get('score', 0))
            confidence = score_data.get('confidence', 1.0)
        else:
            score = score_data
            confidence = 1.0
        
        total_score += score * confidence
        total_weight += confidence
    
    avg_score = total_score / total_weight if total_weight > 0 else 0
    
    # Adjust for data quality
    quality_multiplier = data_quality.get('overall_confidence', 0.7)
    adjusted_score = avg_score * quality_multiplier
    
    # Determine recommendation
    if adjusted_score >= 7.0:
        recommendation = 'GO'
    elif adjusted_score >= 5.0:
        recommendation = 'MAYBE'
    else:
        recommendation = 'PASS'
    
    return {
        'recommendation': recommendation,
        'score': round(adjusted_score, 2),
        'confidence': f"E{1 if quality_multiplier > 0.8 else 2 if quality_multiplier > 0.5 else 3}",
        'rationale': f"Score: {adjusted_score:.1f}/10 with {quality_multiplier:.0%} confidence"
    }

def identify_top_strengths(scores: Dict, benchmarks: Dict) -> List[str]:
    """Identify top 3 strengths"""
    
    strengths = []
    
    for dimension, comparison in benchmarks.items():
        if comparison['vs_benchmark'] == 'above':
            strengths.append(f"Strong {dimension} ({comparison['percentile']}th percentile)")
    
    return strengths[:3]

def identify_top_concerns(scores: Dict, data_quality: Dict) -> List[str]:
    """Identify top 3 concerns"""
    
    concerns = []
    
    # Low scores
    for dimension, score_data in scores.items():
        score = score_data.get('score', 0) if isinstance(score_data, dict) else score_data
        if score < 5:
            concerns.append(f"Weak {dimension} score ({score:.1f}/10)")
    
    # Data quality issues
    if data_quality['completeness_score'] < 0.6:
        concerns.append(f"Incomplete data ({data_quality['completeness_score']:.0%} complete)")
    
    # Conflicts
    if data_quality.get('conflicts'):
        concerns.append(f"Data conflicts: {', '.join(data_quality['conflicts'][:1])}")
    
    return concerns[:3]

def calculate_missing_data_impact(data_quality: Dict) -> Dict:
    """Calculate which missing data would most impact score"""
    
    missing = data_quality.get('missing_fields', [])
    
    # Priority of missing fields
    impact_priority = {
        'arr': 'High - Critical for traction assessment',
        'monthly_burn': 'High - Critical for runway calculation', 
        'customer_count': 'Medium - Important for market validation',
        'growth_rate': 'Medium - Important for momentum assessment',
        'team_size': 'Low - Helpful but not critical'
    }
    
    high_impact = [f for f in missing if f in impact_priority and 'High' in impact_priority[f]]
    
    return {
        'missing_count': len(missing),
        'high_impact_missing': high_impact,
        'recommendation': f"Collect {', '.join(high_impact[:2])} to improve confidence" if high_impact else "Data sufficient for initial assessment"
    }

def get_document_metrics(document_id: str) -> Dict:
    """Mock function to get document metrics"""
    # In production, would fetch from documents service
    return {
        'arr': {'value': 1200000, 'confidence': 0.85},
        'monthly_burn': {'value': 150000, 'confidence': 0.75},
        'team_size': {'value': 12, 'confidence': 0.95},
        'customer_count': {'value': 45, 'confidence': 0.80},
        'growth_rate': {'value': 15, 'confidence': 0.75},
        'stage': 'Seed'
    }

def calculate_confidence(metrics: Dict) -> float:
    """Calculate overall confidence from metrics"""
    confidences = []
    for key, value in metrics.items():
        if isinstance(value, dict) and 'confidence' in value:
            confidences.append(value['confidence'])
    
    return sum(confidences) / len(confidences) if confidences else 0.5

def identify_material_changes(before_after: Dict) -> List[str]:
    """Identify material changes between before and after scores"""
    
    changes = []
    
    before_scores = before_after['before']['scores']
    after_scores = before_after['after']['scores']
    
    for dimension in before_scores:
        before = before_scores[dimension].get('score', 0) if isinstance(before_scores[dimension], dict) else before_scores[dimension]
        after = after_scores[dimension].get('score', 0) if isinstance(after_scores[dimension], dict) else after_scores[dimension]
        
        change = after - before
        if abs(change) > 1.0:
            direction = 'improved' if change > 0 else 'decreased'
            changes.append(f"{dimension.capitalize()} {direction} by {abs(change):.1f} points")
    
    # Confidence change
    conf_change = before_after['after']['confidence'] - before_after['before']['confidence']
    if abs(conf_change) > 0.1:
        changes.append(f"Confidence {'increased' if conf_change > 0 else 'decreased'} by {abs(conf_change):.0%}")
    
    return changes[:3]