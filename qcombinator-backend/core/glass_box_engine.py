"""
Glass-Box Evaluation Engine
Main orchestrator that combines all components for transparent, explainable evaluations
"""

from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
import json
import asyncio

from .ontology import (
    Company, Evaluation, EvaluationModule, Metric, Risk, Decision,
    BiasReport, EvidenceGraph, Document
)
from .evidence_engine import (
    EvidenceProcessor, DocumentProcessor, APIDataIngestion, create_evidence_system
)
from .domain_orchestrator import (
    DomainClassifier, ModuleOrchestrator, create_domain_orchestrator
)
from .scoring_engine import HybridScoringEngine, create_scoring_engine, ScoreBreakdown

class GlassBoxEngine:
    """Main evaluation engine with full transparency and explainability"""
    
    def __init__(self):
        # Initialize all subsystems
        self.evidence_processor, self.document_processor, self.api_ingestion = create_evidence_system()
        self.domain_classifier, self.module_orchestrator = create_domain_orchestrator()
        self.scoring_engine = create_scoring_engine()
        
        # Evidence graph for tracking all relationships
        self.evidence_graph = EvidenceGraph()
        
        # Active evaluations
        self.active_evaluations: Dict[str, Evaluation] = {}
    
    async def start_evaluation(
        self,
        company: Company,
        evaluation_type: str = "fast_scan",
        custom_weights: Optional[Dict[str, float]] = None,
        analyst: str = "system"
    ) -> str:
        """Start a new evaluation process"""
        
        # Create new evaluation
        evaluation = Evaluation(
            company=company,
            status="processing",
            analyst=analyst
        )
        
        evaluation.add_audit_entry(
            action="evaluation_started",
            details={
                "evaluation_type": evaluation_type,
                "company_id": company.id,
                "company_name": company.name
            },
            user=analyst
        )
        
        # Store active evaluation
        self.active_evaluations[evaluation.id] = evaluation
        
        # Start async processing
        asyncio.create_task(self._process_evaluation(evaluation.id, evaluation_type, custom_weights))
        
        return evaluation.id
    
    async def _process_evaluation(
        self,
        evaluation_id: str,
        evaluation_type: str,
        custom_weights: Optional[Dict[str, float]]
    ):
        """Main evaluation processing pipeline"""
        
        evaluation = self.active_evaluations[evaluation_id]
        
        try:
            # Step 1: Domain Classification
            classification_result = await self._classify_domain(evaluation)
            
            # Step 2: Module Selection & Weighting  
            modules = await self._select_modules(evaluation, classification_result, custom_weights)
            
            # Step 3: Evidence Collection
            await self._collect_evidence(evaluation)
            
            # Step 4: Metric Scoring
            await self._score_metrics(evaluation, modules)
            
            # Step 5: Risk Assessment
            await self._assess_risks(evaluation)
            
            # Step 6: Bias Analysis
            await self._analyze_bias(evaluation)
            
            # Step 7: Generate Decision
            await self._generate_decision(evaluation)
            
            # Step 8: Finalize
            evaluation.status = "completed"
            evaluation.completed_at = datetime.utcnow()
            evaluation.calculate_overall_score()
            evaluation.calculate_overall_confidence()
            
            evaluation.add_audit_entry(
                action="evaluation_completed",
                details={
                    "overall_score": evaluation.overall_score,
                    "overall_confidence": evaluation.overall_confidence,
                    "modules_count": len(evaluation.modules)
                },
                user="system"
            )
            
        except Exception as e:
            evaluation.status = "failed"
            evaluation.add_audit_entry(
                action="evaluation_failed",
                details={"error": str(e)},
                user="system"
            )
    
    async def _classify_domain(self, evaluation: Evaluation):
        """Classify company domain and stage"""
        
        company = evaluation.company
        
        # Gather text for classification
        description_text = ""
        website_text = ""
        
        # Extract text from documents
        for doc in company.documents:
            if hasattr(doc, 'extracted_data') and doc.extracted_data:
                if doc.type == "pitch_deck":
                    description_text += " " + str(doc.extracted_data.get("description", ""))
        
        # Classify domain
        classification = self.domain_classifier.classify_domain(
            company, description_text, website_text
        )
        
        # Update company with classification results
        company.domain_labels = [classification.primary_domain] + classification.secondary_domains
        company.stage = classification.stage
        
        evaluation.add_audit_entry(
            action="domain_classified",
            details={
                "primary_domain": classification.primary_domain,
                "secondary_domains": classification.secondary_domains,
                "confidence": classification.confidence,
                "stage": classification.stage.value,
                "keywords": classification.keywords_found
            },
            user="system"
        )
        
        return classification
    
    async def _select_modules(self, evaluation: Evaluation, classification, custom_weights):
        """Select and weight evaluation modules"""
        
        # Create module playlist
        modules = self.module_orchestrator.create_evaluation_playlist(
            classification, custom_weights
        )
        
        # Get rationale for selection
        rationale = self.module_orchestrator.get_module_rationale(
            classification, modules
        )
        
        evaluation.modules = modules
        evaluation.add_audit_entry(
            action="modules_selected",
            details={
                "modules": [{"id": m.id, "name": m.name, "weight": m.weight} for m in modules],
                "rationale": rationale
            },
            user="system"
        )
        
        return modules
    
    async def _collect_evidence(self, evaluation: Evaluation):
        """Collect evidence from all available sources"""
        
        company = evaluation.company
        all_evidence = []
        
        # Process documents
        for document in company.documents:
            if document.type == "pitch_deck":
                evidence_items = self.document_processor.process_pitch_deck(document)
                all_evidence.extend(evidence_items)
            elif document.type == "financial_statement":
                evidence_items = self.document_processor.process_financial_statement(document)
                all_evidence.extend(evidence_items)
        
        # Ingest API data (mock for now)
        try:
            # Stripe data
            stripe_evidence = self.api_ingestion.ingest_stripe_data(company, {})
            all_evidence.extend(stripe_evidence)
            
            # Crunchbase data  
            crunchbase_evidence = self.api_ingestion.ingest_crunchbase_data(company)
            all_evidence.extend(crunchbase_evidence)
        except Exception as e:
            evaluation.add_audit_entry(
                action="api_ingestion_failed",
                details={"error": str(e)},
                user="system"
            )
        
        # Store evidence in graph
        self.evidence_graph.evidence_items.extend(all_evidence)
        
        # Link evidence to metrics
        await self._link_evidence_to_metrics(evaluation, all_evidence)
        
        evaluation.add_audit_entry(
            action="evidence_collected",
            details={
                "evidence_count": len(all_evidence),
                "sources": list(set(e.source_ref.split('_')[0] for e in all_evidence))
            },
            user="system"
        )
    
    async def _link_evidence_to_metrics(self, evaluation: Evaluation, evidence_items):
        """Link evidence items to appropriate metrics"""
        
        # Create metrics for each module and link evidence
        for module in evaluation.modules:
            module_metrics = []
            
            # Define metrics for this module (simplified)
            metric_definitions = self._get_metric_definitions(module.id)
            
            for metric_name, metric_config in metric_definitions.items():
                metric = Metric(
                    name=metric_name,
                    type=metric_config["type"],
                    weight=metric_config["weight"]
                )
                
                # Find relevant evidence
                relevant_evidence = [
                    e for e in evidence_items 
                    if any(keyword in e.snippet.lower() if e.snippet else "" 
                          for keyword in metric_config.get("keywords", []))
                ]
                
                for evidence in relevant_evidence:
                    metric.add_evidence(evidence)
                
                module_metrics.append(metric)
            
            module.metrics = module_metrics
    
    def _get_metric_definitions(self, module_id: str) -> Dict[str, Any]:
        """Get metric definitions for a module"""
        
        metric_definitions = {
            "team": {
                "founder_experience": {
                    "type": "TEAM",
                    "weight": 0.4,
                    "keywords": ["founder", "experience", "background", "previous"]
                },
                "team_composition": {
                    "type": "TEAM", 
                    "weight": 0.3,
                    "keywords": ["team", "employee", "hire", "talent"]
                },
                "advisory_board": {
                    "type": "TEAM",
                    "weight": 0.3,
                    "keywords": ["advisor", "board", "mentor", "guidance"]
                }
            },
            "traction": {
                "revenue": {
                    "type": "FINANCIAL",
                    "weight": 0.4,
                    "keywords": ["revenue", "arr", "mrr", "sales", "income"]
                },
                "user_growth": {
                    "type": "TRACTION",
                    "weight": 0.3,
                    "keywords": ["user", "customer", "growth", "acquisition"]
                },
                "retention": {
                    "type": "TRACTION",
                    "weight": 0.3,
                    "keywords": ["retention", "churn", "cohort", "repeat"]
                }
            },
            "finance": {
                "burn_rate": {
                    "type": "FINANCIAL",
                    "weight": 0.4,
                    "keywords": ["burn", "cash", "runway", "expenses"]
                },
                "gross_margin": {
                    "type": "FINANCIAL", 
                    "weight": 0.3,
                    "keywords": ["margin", "gross", "profit", "cost"]
                },
                "capital_efficiency": {
                    "type": "FINANCIAL",
                    "weight": 0.3,
                    "keywords": ["efficiency", "capital", "roi", "multiple"]
                }
            }
        }
        
        return metric_definitions.get(module_id, {})
    
    async def _score_metrics(self, evaluation: Evaluation, modules):
        """Score all metrics using hybrid scoring engine"""
        
        company_data = self._extract_company_data(evaluation.company)
        
        for module in modules:
            # Score the module
            breakdown = self.scoring_engine.score_module(
                module, company_data
            )
            
            # Store results
            module.score = breakdown.final_score
            module.confidence = breakdown.confidence
            
            evaluation.add_audit_entry(
                action="module_scored",
                details={
                    "module_id": module.id,
                    "score": breakdown.final_score,
                    "confidence": breakdown.confidence,
                    "formulas_used": breakdown.formulas_used,
                    "evidence_count": len(breakdown.evidence_summary)
                },
                user="system"
            )
    
    def _extract_company_data(self, company: Company) -> Dict[str, Any]:
        """Extract structured data from company for scoring"""
        
        # Mock data extraction - in reality would parse from evidence
        return {
            "cac": {"cac": 500, "monthly_revenue_per_customer": 100},
            "ltv": {"ltv": 2400, "cac": 500},
            "burn_rate": {"net_burn": 150000, "net_new_arr": 100000},
            "team_experience": {
                "previous_exits": 1,
                "experience_years": 8,
                "education_tier": 2,
                "linkedin_connections": 800
            }
        }
    
    async def _assess_risks(self, evaluation: Evaluation):
        """Assess various risk factors"""
        
        # Mock risk assessment
        risks = [
            Risk(
                category="market",
                description="Highly competitive market with low barriers to entry",
                severity=0.7,
                likelihood=0.8,
                mitigation="Focus on defensible moats and rapid scaling"
            ),
            Risk(
                category="regulatory",
                description="Potential data privacy regulations",
                severity=0.5,
                likelihood=0.6,
                mitigation="Implement GDPR compliance early"
            )
        ]
        
        evaluation.risks = risks
        
        evaluation.add_audit_entry(
            action="risks_assessed",
            details={
                "risk_count": len(risks),
                "high_severity_risks": len([r for r in risks if r.severity > 0.7])
            },
            user="system"
        )
    
    async def _analyze_bias(self, evaluation: Evaluation):
        """Perform bias analysis"""
        
        # Mock bias analysis - would implement identity-blind scoring
        identity_blind_score = evaluation.calculate_overall_score()
        
        # Simulate adding PII and re-scoring
        full_score = identity_blind_score * 0.95  # Slight bias detected
        
        bias_report = BiasReport(
            identity_blind_score=identity_blind_score,
            full_score=full_score,
            bias_delta=full_score - identity_blind_score,
            contributing_factors=["Gender inference from names", "University prestige"],
            flagged_features=["founder_education", "team_composition"],
            confidence=0.8
        )
        
        evaluation.bias_report = bias_report
        
        evaluation.add_audit_entry(
            action="bias_analyzed",
            details={
                "bias_delta": bias_report.bias_delta,
                "flagged_features": bias_report.flagged_features
            },
            user="system"
        )
    
    async def _generate_decision(self, evaluation: Evaluation):
        """Generate investment decision with rationale"""
        
        overall_score = evaluation.calculate_overall_score()
        confidence = evaluation.calculate_overall_confidence()
        
        # Decision logic
        if overall_score >= 7.5 and confidence >= 0.8:
            recommendation = "invest"
        elif overall_score >= 6.0 and confidence >= 0.7:
            recommendation = "monitor"
        else:
            recommendation = "pass"
        
        # Generate rationale
        strengths = []
        concerns = []
        
        for module in evaluation.modules:
            if module.score and module.score > 7:
                strengths.append(f"Strong {module.name.lower()} (Score: {module.score:.1f})")
            elif module.score and module.score < 5:
                concerns.append(f"Weak {module.name.lower()} (Score: {module.score:.1f})")
        
        decision = Decision(
            recommendation=recommendation,
            confidence=confidence,
            rationale=f"Overall score: {overall_score:.1f}/10 with {confidence:.1%} confidence",
            key_strengths=strengths,
            key_concerns=concerns,
            follow_up_items=[
                "Request detailed financial projections",
                "Schedule technical deep dive",
                "Check references from previous employers"
            ],
            analyst="Glass-Box Engine"
        )
        
        evaluation.decision = decision
        
        evaluation.add_audit_entry(
            action="decision_generated",
            details={
                "recommendation": recommendation,
                "overall_score": overall_score,
                "confidence": confidence
            },
            user="system"
        )
    
    def get_evaluation_status(self, evaluation_id: str) -> Dict[str, Any]:
        """Get current status of an evaluation"""
        
        if evaluation_id not in self.active_evaluations:
            return {"error": "Evaluation not found"}
        
        evaluation = self.active_evaluations[evaluation_id]
        
        return {
            "id": evaluation.id,
            "status": evaluation.status,
            "company_name": evaluation.company.name,
            "overall_score": evaluation.overall_score,
            "overall_confidence": evaluation.overall_confidence,
            "modules_completed": len([m for m in evaluation.modules if m.score is not None]),
            "total_modules": len(evaluation.modules),
            "created_at": evaluation.created_at.isoformat(),
            "completed_at": evaluation.completed_at.isoformat() if evaluation.completed_at else None
        }
    
    def get_evaluation_explainability(self, evaluation_id: str) -> Dict[str, Any]:
        """Get full explainability report for an evaluation"""
        
        if evaluation_id not in self.active_evaluations:
            return {"error": "Evaluation not found"}
        
        evaluation = self.active_evaluations[evaluation_id]
        
        # Build comprehensive explainability report
        explainability = {
            "evaluation_id": evaluation.id,
            "company": {
                "name": evaluation.company.name,
                "domain": evaluation.company.domain_labels,
                "stage": evaluation.company.stage.value if evaluation.company.stage else None
            },
            "overall_results": {
                "score": evaluation.overall_score,
                "confidence": evaluation.overall_confidence,
                "recommendation": evaluation.decision.recommendation if evaluation.decision else None
            },
            "module_breakdown": [
                {
                    "id": module.id,
                    "name": module.name,
                    "type": module.type,
                    "weight": module.weight,
                    "score": module.score,
                    "confidence": module.confidence,
                    "metrics": [
                        {
                            "name": metric.name,
                            "value": metric.value,
                            "confidence": metric.confidence,
                            "evidence_count": len(metric.evidence_items),
                            "evidence_sources": [e.source_ref for e in metric.evidence_items]
                        }
                        for metric in module.metrics
                    ]
                }
                for module in evaluation.modules
            ],
            "evidence_graph": {
                "total_evidence_items": len(self.evidence_graph.evidence_items),
                "evidence_by_grade": {
                    "E1": len([e for e in self.evidence_graph.evidence_items if e.grade == "E1"]),
                    "E2": len([e for e in self.evidence_graph.evidence_items if e.grade == "E2"]),
                    "E3": len([e for e in self.evidence_graph.evidence_items if e.grade == "E3"])
                },
                "source_breakdown": {}
            },
            "risk_assessment": [
                {
                    "category": risk.category,
                    "description": risk.description,
                    "severity": risk.severity,
                    "likelihood": risk.likelihood,
                    "mitigation": risk.mitigation
                }
                for risk in evaluation.risks
            ] if evaluation.risks else [],
            "bias_analysis": {
                "identity_blind_score": evaluation.bias_report.identity_blind_score,
                "full_score": evaluation.bias_report.full_score,
                "bias_delta": evaluation.bias_report.bias_delta,
                "flagged_features": evaluation.bias_report.flagged_features
            } if evaluation.bias_report else None,
            "audit_trail": evaluation.audit_log
        }
        
        return explainability

# Factory function
def create_glass_box_engine() -> GlassBoxEngine:
    """Factory to create configured glass-box engine"""
    return GlassBoxEngine()