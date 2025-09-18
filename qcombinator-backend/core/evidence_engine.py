"""
Source Ingestion & Trust Scoring System
Implements evidence grading, source quality scoring, and conflict resolution
"""

import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import numpy as np

from .ontology import (
    EvidenceItem, EvidenceGrade, Metric, Company, Document
)

@dataclass
class SourceConfig:
    """Configuration for source quality assessment"""
    authority_scores: Dict[str, float]
    recency_decay_tau: Dict[str, int]  # Days for different metric types
    conflict_threshold: float = 0.3

class EvidenceProcessor:
    """Processes and scores evidence from various sources"""
    
    def __init__(self, config: SourceConfig):
        self.config = config
        
        # Authority scores for different source types
        self.default_authorities = {
            # E3 - Verified sources
            "stripe_api": 0.95,
            "chargebee_api": 0.95,
            "salesforce_api": 0.90,
            "hubspot_api": 0.90,
            "mixpanel_api": 0.90,
            "amplitude_api": 0.90,
            "github_api": 0.85,
            "licensed_db": 0.90,
            
            # E2 - Public/third-party
            "crunchbase": 0.75,
            "pitchbook": 0.80,
            "techcrunch": 0.70,
            "bloomberg": 0.85,
            "reuters": 0.85,
            "wsj": 0.80,
            "patent_office": 0.90,
            "app_store": 0.75,
            "google_play": 0.75,
            "linkedin": 0.65,
            "glassdoor": 0.60,
            
            # E1 - Self-reported
            "pitch_deck": 0.40,
            "founder_interview": 0.35,
            "company_website": 0.45,
            "press_release": 0.30,
            "investor_update": 0.50,
        }
        
        # Recency decay tau (days) for different metrics
        self.default_recency_tau = {
            "revenue": 90,
            "mrr": 30,
            "arr": 90,
            "burn_rate": 30,
            "cash_balance": 14,
            "headcount": 60,
            "market_size": 180,
            "competition": 120,
            "regulatory": 30,
            "delivery_sla": 7,
            "churn_rate": 30,
            "cac": 60,
            "ltv": 90,
        }
    
    def grade_source(self, source_type: str, source_details: Dict[str, Any]) -> EvidenceGrade:
        """Determine evidence grade based on source type and verification"""
        
        # E3 - Verified sources (OAuth APIs, licensed databases)
        verified_sources = [
            "stripe_api", "chargebee_api", "salesforce_api", "hubspot_api",
            "mixpanel_api", "amplitude_api", "github_api", "licensed_db"
        ]
        
        # E2 - Public/third-party sources
        public_sources = [
            "crunchbase", "pitchbook", "techcrunch", "bloomberg", "reuters",
            "wsj", "patent_office", "app_store", "google_play", "linkedin",
            "glassdoor", "news_api", "social_media"
        ]
        
        if source_type in verified_sources:
            return EvidenceGrade.E3
        elif source_type in public_sources:
            return EvidenceGrade.E2
        else:
            return EvidenceGrade.E1
    
    def calculate_source_quality_score(
        self, 
        source_type: str,
        timestamp: datetime,
        metric_type: str = "general",
        cross_references: int = 0,
        is_primary: bool = True,
        license_valid: bool = True
    ) -> Tuple[float, Dict[str, float]]:
        """Calculate Source Quality Score (SQS) with component breakdown"""
        
        # Authority (25%)
        authority = self.config.authority_scores.get(
            source_type, 
            self.default_authorities.get(source_type, 0.5)
        )
        
        # Freshness (20%) - exponential decay
        days_old = (datetime.utcnow() - timestamp).days
        tau = self.config.recency_decay_tau.get(
            metric_type,
            self.default_recency_tau.get(metric_type, 90)
        )
        freshness = math.exp(-days_old / tau)
        
        # Independence (15%) - based on cross-references
        independence = min(1.0, 0.3 + 0.7 * (cross_references / 5.0))
        
        # Directness (15%) - primary vs derivative source
        directness = 1.0 if is_primary else 0.6
        
        # Consistency (15%) - will be calculated when comparing sources
        consistency = 0.8  # Default, updated during conflict resolution
        
        # Legal/License (10%)
        legal_score = 1.0 if license_valid else 0.3
        
        # Calculate weighted SQS
        sqs = (
            0.25 * authority +
            0.20 * freshness +
            0.15 * independence +
            0.15 * directness +
            0.15 * consistency +
            0.10 * legal_score
        )
        
        components = {
            "authority": authority,
            "freshness": freshness,
            "independence": independence,
            "directness": directness,
            "consistency": consistency,
            "legal_score": legal_score
        }
        
        return sqs, components
    
    def create_evidence_item(
        self,
        source_ref: str,
        source_type: str,
        data: Any,
        extraction_confidence: float,
        snippet: Optional[str] = None,
        page_ref: Optional[str] = None,
        timestamp: Optional[datetime] = None,
        metric_type: str = "general"
    ) -> EvidenceItem:
        """Create evidence item with automatic grading and scoring"""
        
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        grade = self.grade_source(source_type, {})
        sqs, components = self.calculate_source_quality_score(
            source_type, timestamp, metric_type
        )
        
        evidence = EvidenceItem(
            source_ref=source_ref,
            grade=grade,
            source_quality=sqs,
            timestamp=timestamp,
            extraction_confidence=extraction_confidence,
            snippet=snippet,
            page_ref=page_ref,
            authority=components["authority"],
            freshness=components["freshness"],
            independence=components["independence"],
            directness=components["directness"],
            consistency=components["consistency"],
            legal_score=components["legal_score"]
        )
        
        return evidence
    
    def resolve_conflicts(self, metric: Metric) -> Tuple[Any, float, bool]:
        """Resolve conflicts between evidence items for a metric"""
        
        if not metric.evidence_items:
            return None, 0.0, False
        
        if len(metric.evidence_items) == 1:
            evidence = metric.evidence_items[0]
            weight = evidence.calculate_evidence_weight()
            return evidence.snippet, evidence.extraction_confidence, False
        
        # Group evidence by value/claim
        value_groups = {}
        for evidence in metric.evidence_items:
            value_key = str(evidence.snippet)  # Simplified - would need better value extraction
            if value_key not in value_groups:
                value_groups[value_key] = []
            value_groups[value_key].append(evidence)
        
        # Calculate weighted consensus
        weighted_values = []
        for value_key, evidence_list in value_groups.items():
            total_weight = sum(
                evidence.calculate_evidence_weight() 
                for evidence in evidence_list
            )
            weighted_values.append((value_key, total_weight, evidence_list))
        
        # Sort by weight
        weighted_values.sort(key=lambda x: x[1], reverse=True)
        
        if len(weighted_values) == 1:
            # No conflict
            return weighted_values[0][0], weighted_values[0][1], False
        
        # Check for conflicts
        top_weight = weighted_values[0][1]
        second_weight = weighted_values[1][1] if len(weighted_values) > 1 else 0
        
        # If weights are similar and above threshold, mark as contested
        weight_ratio = second_weight / top_weight if top_weight > 0 else 0
        is_contested = weight_ratio > self.config.conflict_threshold
        
        # Update consistency scores for conflicting evidence
        if is_contested:
            for _, _, evidence_list in weighted_values:
                for evidence in evidence_list:
                    evidence.consistency = max(0.1, evidence.consistency - 0.3)
                    evidence.calculate_source_quality()
        
        return weighted_values[0][0], top_weight, is_contested

class DocumentProcessor:
    """Processes documents and extracts evidence items"""
    
    def __init__(self, evidence_processor: EvidenceProcessor):
        self.evidence_processor = evidence_processor
    
    def process_pitch_deck(self, document: Document) -> List[EvidenceItem]:
        """Extract evidence from pitch deck"""
        evidence_items = []
        
        # Mock extraction - in reality would use OCR/NLP
        mock_extractions = [
            {
                "metric": "revenue",
                "value": "1.2M ARR",
                "page": "slide 8",
                "confidence": 0.8
            },
            {
                "metric": "market_size",
                "value": "$50B TAM",
                "page": "slide 3", 
                "confidence": 0.7
            },
            {
                "metric": "team_size",
                "value": "15 employees",
                "page": "slide 12",
                "confidence": 0.9
            }
        ]
        
        for extraction in mock_extractions:
            evidence = self.evidence_processor.create_evidence_item(
                source_ref=f"{document.id}#{extraction['page']}",
                source_type="pitch_deck",
                data=extraction["value"],
                extraction_confidence=extraction["confidence"],
                snippet=extraction["value"],
                page_ref=extraction["page"],
                timestamp=document.uploaded_at,
                metric_type=extraction["metric"]
            )
            evidence_items.append(evidence)
        
        return evidence_items
    
    def process_financial_statement(self, document: Document) -> List[EvidenceItem]:
        """Extract evidence from financial statements"""
        evidence_items = []
        
        # Mock financial data extraction
        mock_extractions = [
            {
                "metric": "revenue",
                "value": "1.15M",
                "section": "Income Statement",
                "confidence": 0.95
            },
            {
                "metric": "burn_rate", 
                "value": "180K/month",
                "section": "Cash Flow",
                "confidence": 0.90
            },
            {
                "metric": "cash_balance",
                "value": "2.1M",
                "section": "Balance Sheet",
                "confidence": 0.95
            }
        ]
        
        for extraction in mock_extractions:
            evidence = self.evidence_processor.create_evidence_item(
                source_ref=f"{document.id}#{extraction['section']}",
                source_type="financial_statement",
                data=extraction["value"],
                extraction_confidence=extraction["confidence"],
                snippet=extraction["value"],
                page_ref=extraction["section"],
                timestamp=document.uploaded_at,
                metric_type=extraction["metric"]
            )
            evidence_items.append(evidence)
        
        return evidence_items

class APIDataIngestion:
    """Handles ingestion from external APIs (E3 sources)"""
    
    def __init__(self, evidence_processor: EvidenceProcessor):
        self.evidence_processor = evidence_processor
    
    def ingest_stripe_data(self, company: Company, api_credentials: Dict) -> List[EvidenceItem]:
        """Ingest revenue data from Stripe API"""
        evidence_items = []
        
        # Mock Stripe API call
        # In reality: stripe_data = stripe.PaymentIntent.list(...)
        mock_stripe_data = {
            "total_revenue_12m": 1180000,
            "mrr": 98333,
            "customer_count": 1250,
            "avg_transaction_value": 944
        }
        
        for metric, value in mock_stripe_data.items():
            evidence = self.evidence_processor.create_evidence_item(
                source_ref=f"stripe_api_{company.id}",
                source_type="stripe_api",
                data=value,
                extraction_confidence=0.98,
                snippet=str(value),
                timestamp=datetime.utcnow(),
                metric_type=metric
            )
            evidence_items.append(evidence)
        
        return evidence_items
    
    def ingest_crunchbase_data(self, company: Company) -> List[EvidenceItem]:
        """Ingest company data from Crunchbase API"""
        evidence_items = []
        
        # Mock Crunchbase API call
        mock_crunchbase_data = {
            "funding_total": 5200000,
            "employee_count": 18,
            "last_funding_date": "2024-01-15",
            "competitors": ["CompetitorA", "CompetitorB"]
        }
        
        for metric, value in mock_crunchbase_data.items():
            evidence = self.evidence_processor.create_evidence_item(
                source_ref=f"crunchbase_{company.id}",
                source_type="crunchbase",
                data=value,
                extraction_confidence=0.85,
                snippet=str(value),
                timestamp=datetime.utcnow(),
                metric_type=metric
            )
            evidence_items.append(evidence)
        
        return evidence_items

# Example usage and factory
def create_evidence_system() -> Tuple[EvidenceProcessor, DocumentProcessor, APIDataIngestion]:
    """Factory to create configured evidence system"""
    
    config = SourceConfig(
        authority_scores={},  # Use defaults
        recency_decay_tau={}, # Use defaults
        conflict_threshold=0.3
    )
    
    evidence_processor = EvidenceProcessor(config)
    document_processor = DocumentProcessor(evidence_processor)
    api_ingestion = APIDataIngestion(evidence_processor)
    
    return evidence_processor, document_processor, api_ingestion