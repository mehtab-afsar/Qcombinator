"""
Hybrid Scoring Engine
Combines deterministic business formulas with ML-based signals
Calibrated against benchmarks with full explainability
"""

import math
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, field
from enum import Enum
import numpy as np

from .ontology import (
    Metric, EvaluationModule, Company, CompanyStage, 
    Benchmark, EvidenceItem, Risk, Scenario
)

class FormulaType(str, Enum):
    """Types of scoring formulas"""
    DETERMINISTIC = "deterministic"  # Hard business formulas
    ML_SIGNAL = "ml_signal"  # Model-based scoring
    HYBRID = "hybrid"  # Combination of both

@dataclass
class ScoringFormula:
    """Definition of a scoring formula"""
    id: str
    name: str
    type: FormulaType
    description: str
    formula: str  # Human-readable formula
    implementation: callable  # Actual scoring function
    weight: float = 1.0
    min_score: float = 0.0
    max_score: float = 10.0

@dataclass 
class ScoreBreakdown:
    """Detailed breakdown of how a score was calculated"""
    final_score: float
    confidence: float
    components: Dict[str, float]  # Component scores
    formulas_used: List[str]  # Which formulas contributed
    benchmark_comparison: Optional[Dict[str, Any]] = None
    evidence_summary: List[str] = field(default_factory=list)
    risk_adjustments: List[str] = field(default_factory=list)

class BusinessFormulas:
    """Hard business formulas for deterministic scoring"""
    
    @staticmethod
    def cac_payback_score(cac: float, monthly_revenue_per_customer: float) -> Tuple[float, str]:
        """CAC Payback Period scoring (lower months = higher score)"""
        if monthly_revenue_per_customer <= 0:
            return 0.0, "Invalid monthly revenue per customer"
        
        payback_months = cac / monthly_revenue_per_customer
        
        # Scoring: <6 months = 10, 6-12 months = 8, 12-24 months = 6, >24 months = 2
        if payback_months < 6:
            score = 10.0
        elif payback_months < 12:
            score = 8.0 + (2.0 * (12 - payback_months) / 6)
        elif payback_months < 24:
            score = 6.0 + (2.0 * (24 - payback_months) / 12)
        elif payback_months < 36:
            score = 2.0 + (4.0 * (36 - payback_months) / 12)
        else:
            score = 1.0
        
        explanation = f"CAC payback: {payback_months:.1f} months → Score: {score:.1f}/10"
        return min(10.0, max(0.0, score)), explanation
    
    @staticmethod
    def ltv_cac_ratio_score(ltv: float, cac: float) -> Tuple[float, str]:
        """LTV:CAC Ratio scoring"""
        if cac <= 0:
            return 0.0, "Invalid CAC value"
        
        ratio = ltv / cac
        
        # Scoring: >5 = 10, 3-5 = 8, 2-3 = 6, 1-2 = 4, <1 = 2
        if ratio > 5:
            score = 10.0
        elif ratio > 3:
            score = 8.0 + (2.0 * (ratio - 3) / 2)
        elif ratio > 2:
            score = 6.0 + (2.0 * (ratio - 2) / 1)
        elif ratio > 1:
            score = 4.0 + (2.0 * (ratio - 1) / 1)
        else:
            score = 2.0 * ratio
        
        explanation = f"LTV:CAC ratio: {ratio:.1f}x → Score: {score:.1f}/10"
        return min(10.0, max(0.0, score)), explanation
    
    @staticmethod
    def burn_multiple_score(net_burn: float, net_new_arr: float) -> Tuple[float, str]:
        """Burn Multiple (efficiency) scoring"""
        if net_new_arr <= 0:
            if net_burn <= 0:  # Profitable growth
                return 10.0, "Profitable growth (no burn) → Score: 10.0/10"
            else:
                return 1.0, "Burning cash with no ARR growth → Score: 1.0/10"
        
        burn_multiple = net_burn / net_new_arr
        
        # Scoring: <1 = 10, 1-2 = 8, 2-3 = 6, 3-5 = 4, >5 = 2
        if burn_multiple < 1:
            score = 10.0
        elif burn_multiple < 2:
            score = 8.0 + (2.0 * (2 - burn_multiple) / 1)
        elif burn_multiple < 3:
            score = 6.0 + (2.0 * (3 - burn_multiple) / 1)
        elif burn_multiple < 5:
            score = 4.0 + (2.0 * (5 - burn_multiple) / 2)
        else:
            score = 2.0
        
        explanation = f"Burn Multiple: {burn_multiple:.1f}x → Score: {score:.1f}/10"
        return min(10.0, max(0.0, score)), explanation
    
    @staticmethod
    def rule_of_40_score(growth_rate: float, profit_margin: float) -> Tuple[float, str]:
        """Rule of 40 scoring (Growth Rate + Profit Margin)"""
        rule_of_40 = growth_rate + profit_margin
        
        # Scoring: >50 = 10, 40-50 = 8, 30-40 = 6, 20-30 = 4, <20 = 2
        if rule_of_40 > 50:
            score = 10.0
        elif rule_of_40 > 40:
            score = 8.0 + (2.0 * (rule_of_40 - 40) / 10)
        elif rule_of_40 > 30:
            score = 6.0 + (2.0 * (rule_of_40 - 30) / 10)
        elif rule_of_40 > 20:
            score = 4.0 + (2.0 * (rule_of_40 - 20) / 10)
        else:
            score = 2.0 * (rule_of_40 / 20) if rule_of_40 > 0 else 0.0
        
        explanation = f"Rule of 40: {rule_of_40:.1f}% → Score: {score:.1f}/10"
        return min(10.0, max(0.0, score)), explanation
    
    @staticmethod
    def gross_margin_score(gross_margin: float, industry: str) -> Tuple[float, str]:
        """Gross margin scoring (industry-adjusted)"""
        
        # Industry benchmarks for "good" gross margin
        industry_benchmarks = {
            "B2B SaaS": 80.0,
            "D2C/E-commerce": 45.0,
            "Food/QSR": 65.0,
            "Healthcare": 70.0,
            "Manufacturing": 35.0,
            "default": 60.0
        }
        
        benchmark = industry_benchmarks.get(industry, industry_benchmarks["default"])
        
        # Score relative to industry benchmark
        if gross_margin >= benchmark:
            score = 8.0 + (2.0 * min((gross_margin - benchmark) / 20, 1.0))
        elif gross_margin >= benchmark * 0.8:
            score = 6.0 + (2.0 * (gross_margin - benchmark * 0.8) / (benchmark * 0.2))
        elif gross_margin >= benchmark * 0.6:
            score = 4.0 + (2.0 * (gross_margin - benchmark * 0.6) / (benchmark * 0.2))
        else:
            score = 4.0 * (gross_margin / (benchmark * 0.6)) if gross_margin > 0 else 0.0
        
        explanation = f"Gross Margin: {gross_margin:.1f}% (vs {benchmark:.1f}% industry) → Score: {score:.1f}/10"
        return min(10.0, max(0.0, score)), explanation

class MLSignals:
    """ML-based scoring signals"""
    
    @staticmethod
    def team_credibility_signal(founder_data: Dict[str, Any]) -> Tuple[float, str]:
        """ML-based team credibility scoring"""
        
        # Mock ML model - in reality would use trained model
        score_components = {
            "previous_exits": min(founder_data.get("previous_exits", 0) * 2, 4),
            "experience_years": min(founder_data.get("experience_years", 0) / 5, 3),
            "education_tier": founder_data.get("education_tier", 1) * 1.5,
            "linkedin_connections": min(founder_data.get("linkedin_connections", 0) / 1000, 2),
        }
        
        total_score = sum(score_components.values())
        normalized_score = min(total_score, 10.0)
        
        explanation = f"Team credibility (ML): {normalized_score:.1f}/10 based on experience, exits, network"
        return normalized_score, explanation
    
    @staticmethod
    def market_sentiment_signal(market_data: Dict[str, Any]) -> Tuple[float, str]:
        """ML-based market sentiment scoring"""
        
        # Mock sentiment analysis
        sentiment_factors = {
            "news_sentiment": market_data.get("news_sentiment", 0.5),  # -1 to 1
            "search_trends": market_data.get("search_trends", 50),  # 0-100
            "funding_activity": market_data.get("funding_activity", 0.5),  # 0-1
            "regulatory_sentiment": market_data.get("regulatory_sentiment", 0.5)  # 0-1
        }
        
        # Normalize and weight
        score = (
            (sentiment_factors["news_sentiment"] + 1) * 2.5 +  # Convert -1,1 to 0,5
            sentiment_factors["search_trends"] / 20 +  # Convert 0,100 to 0,5
            sentiment_factors["funding_activity"] * 2.5 +
            sentiment_factors["regulatory_sentiment"] * 2.5
        ) / 2  # Normalize to 0-10
        
        explanation = f"Market sentiment (ML): {score:.1f}/10 based on news, trends, funding climate"
        return min(10.0, max(0.0, score)), explanation
    
    @staticmethod
    def product_differentiation_signal(product_data: Dict[str, Any]) -> Tuple[float, str]:
        """ML-based product differentiation scoring"""
        
        # Mock NLP analysis of product descriptions
        differentiation_score = (
            product_data.get("uniqueness_score", 0.5) * 4 +  # 0-1 → 0-4
            product_data.get("complexity_score", 0.5) * 3 +  # 0-1 → 0-3
            product_data.get("patent_strength", 0.5) * 3     # 0-1 → 0-3
        )
        
        explanation = f"Product differentiation (ML): {differentiation_score:.1f}/10 based on uniqueness, complexity, IP"
        return min(10.0, max(0.0, differentiation_score)), explanation

class HybridScoringEngine:
    """Main hybrid scoring engine combining deterministic and ML approaches"""
    
    def __init__(self):
        self.business_formulas = BusinessFormulas()
        self.ml_signals = MLSignals()
        
        # Define scoring formulas for different metrics
        self.formulas = {
            # Financial Metrics (Deterministic)
            "cac_payback": ScoringFormula(
                id="cac_payback",
                name="CAC Payback Period",
                type=FormulaType.DETERMINISTIC,
                description="Customer acquisition cost payback period",
                formula="Score based on months to payback CAC from monthly revenue",
                implementation=self.business_formulas.cac_payback_score,
                weight=1.0
            ),
            "ltv_cac_ratio": ScoringFormula(
                id="ltv_cac_ratio",
                name="LTV:CAC Ratio",
                type=FormulaType.DETERMINISTIC,
                description="Lifetime value to customer acquisition cost ratio",
                formula="LTV ÷ CAC with industry benchmarks",
                implementation=self.business_formulas.ltv_cac_ratio_score,
                weight=1.0
            ),
            "burn_multiple": ScoringFormula(
                id="burn_multiple",
                name="Burn Multiple",
                type=FormulaType.DETERMINISTIC,
                description="Capital efficiency: burn ÷ net new ARR",
                formula="Net Burn ÷ Net New ARR (lower is better)",
                implementation=self.business_formulas.burn_multiple_score,
                weight=1.0
            ),
            
            # ML-based Signals
            "team_credibility": ScoringFormula(
                id="team_credibility",
                name="Team Credibility",
                type=FormulaType.ML_SIGNAL,
                description="ML-based assessment of team strength",
                formula="Weighted model considering experience, exits, network",
                implementation=self.ml_signals.team_credibility_signal,
                weight=0.8  # Slightly lower weight for ML signals
            ),
            "market_sentiment": ScoringFormula(
                id="market_sentiment",
                name="Market Sentiment",
                type=FormulaType.ML_SIGNAL,
                description="ML-based market timing and sentiment",
                formula="News sentiment, search trends, funding climate analysis",
                implementation=self.ml_signals.market_sentiment_signal,
                weight=0.7
            )
        }
    
    def score_metric(
        self,
        metric: Metric,
        formula_id: str,
        input_data: Dict[str, Any],
        benchmark_data: Optional[Benchmark] = None
    ) -> ScoreBreakdown:
        """Score a single metric using specified formula"""
        
        if formula_id not in self.formulas:
            raise ValueError(f"Unknown formula: {formula_id}")
        
        formula = self.formulas[formula_id]
        
        try:
            # Apply the formula
            if formula.type == FormulaType.DETERMINISTIC:
                score, explanation = formula.implementation(**input_data)
            else:  # ML_SIGNAL
                score, explanation = formula.implementation(input_data)
            
            # Adjust for benchmark if available
            benchmark_adjustment = 0.0
            benchmark_comparison = None
            
            if benchmark_data and score > 0:
                benchmark_comparison = self._compare_to_benchmark(score, benchmark_data)
                benchmark_adjustment = benchmark_comparison.get("adjustment", 0.0)
                score = max(0.0, min(10.0, score + benchmark_adjustment))
            
            # Calculate confidence based on evidence quality
            confidence = metric.confidence if metric.confidence > 0 else 0.5
            
            # Reduce confidence for ML signals
            if formula.type == FormulaType.ML_SIGNAL:
                confidence *= 0.8
            
            return ScoreBreakdown(
                final_score=score,
                confidence=confidence,
                components={formula_id: score},
                formulas_used=[formula_id],
                benchmark_comparison=benchmark_comparison,
                evidence_summary=[explanation],
                risk_adjustments=[]
            )
            
        except Exception as e:
            # Return low-confidence zero score on error
            return ScoreBreakdown(
                final_score=0.0,
                confidence=0.1,
                components={formula_id: 0.0},
                formulas_used=[formula_id],
                evidence_summary=[f"Error in {formula_id}: {str(e)}"]
            )
    
    def score_module(
        self,
        module: EvaluationModule,
        company_data: Dict[str, Any],
        benchmarks: Dict[str, Benchmark] = None
    ) -> ScoreBreakdown:
        """Score an entire evaluation module"""
        
        if not module.metrics:
            return ScoreBreakdown(
                final_score=0.0,
                confidence=0.0,
                components={},
                formulas_used=[],
                evidence_summary=["No metrics to evaluate"]
            )
        
        total_weight = 0.0
        weighted_score = 0.0
        weighted_confidence = 0.0
        all_components = {}
        all_formulas = []
        all_evidence = []
        
        for metric in module.metrics:
            # Determine which formula to use based on metric name/type
            formula_id = self._select_formula_for_metric(metric, module)
            
            if formula_id:
                # Get input data for this metric
                metric_data = company_data.get(metric.name, {})
                benchmark = benchmarks.get(metric.name) if benchmarks else None
                
                # Score the metric
                breakdown = self.score_metric(metric, formula_id, metric_data, benchmark)
                
                # Aggregate results
                weight = metric.weight
                total_weight += weight
                weighted_score += weight * breakdown.final_score
                weighted_confidence += weight * breakdown.confidence
                
                all_components.update(breakdown.components)
                all_formulas.extend(breakdown.formulas_used)
                all_evidence.extend(breakdown.evidence_summary)
        
        # Calculate final module score
        if total_weight > 0:
            final_score = weighted_score / total_weight
            final_confidence = weighted_confidence / total_weight
        else:
            final_score = 0.0
            final_confidence = 0.0
        
        return ScoreBreakdown(
            final_score=final_score,
            confidence=final_confidence,
            components=all_components,
            formulas_used=list(set(all_formulas)),
            evidence_summary=all_evidence
        )
    
    def _select_formula_for_metric(self, metric: Metric, module: EvaluationModule) -> Optional[str]:
        """Select appropriate scoring formula for a metric"""
        
        # Simple mapping - in reality would be more sophisticated
        formula_mapping = {
            "cac": "cac_payback",
            "ltv": "ltv_cac_ratio", 
            "burn_rate": "burn_multiple",
            "team_experience": "team_credibility",
            "market_timing": "market_sentiment",
            "founder_background": "team_credibility"
        }
        
        return formula_mapping.get(metric.name)
    
    def _compare_to_benchmark(self, score: float, benchmark: Benchmark) -> Dict[str, Any]:
        """Compare score to industry benchmark and adjust"""
        
        # Simple percentile-based adjustment
        if benchmark.percentile_50:
            if score >= benchmark.percentile_75:
                adjustment = 0.5  # Boost top quartile
                percentile = "top 25%"
            elif score >= benchmark.percentile_50:
                adjustment = 0.2  # Slight boost above median
                percentile = "top 50%"
            elif score >= benchmark.percentile_25:
                adjustment = -0.2  # Slight penalty below median
                percentile = "bottom 50%"
            else:
                adjustment = -0.5  # Penalty for bottom quartile
                percentile = "bottom 25%"
        else:
            adjustment = 0.0
            percentile = "no benchmark"
        
        return {
            "adjustment": adjustment,
            "percentile": percentile,
            "benchmark_median": benchmark.percentile_50,
            "sample_size": benchmark.sample_size
        }

# Risk adjustment functions
class RiskAdjustment:
    """Apply risk adjustments to scores"""
    
    @staticmethod
    def apply_regulatory_risk(score: float, risks: List[Risk]) -> Tuple[float, List[str]]:
        """Apply regulatory risk adjustments"""
        adjustments = []
        adjusted_score = score
        
        for risk in risks:
            if risk.category == "regulatory":
                penalty = risk.severity * risk.likelihood * 2.0  # Max 2 point penalty
                adjusted_score = max(0.0, adjusted_score - penalty)
                adjustments.append(f"Regulatory risk penalty: -{penalty:.1f} ({risk.description})")
        
        return adjusted_score, adjustments
    
    @staticmethod
    def apply_market_risk(score: float, risks: List[Risk]) -> Tuple[float, List[str]]:
        """Apply market risk adjustments"""
        adjustments = []
        adjusted_score = score
        
        for risk in risks:
            if risk.category == "market":
                penalty = risk.severity * risk.likelihood * 1.5  # Max 1.5 point penalty
                adjusted_score = max(0.0, adjusted_score - penalty)
                adjustments.append(f"Market risk penalty: -{penalty:.1f} ({risk.description})")
        
        return adjusted_score, adjustments

# Factory function
def create_scoring_engine() -> HybridScoringEngine:
    """Factory to create configured scoring engine"""
    return HybridScoringEngine()