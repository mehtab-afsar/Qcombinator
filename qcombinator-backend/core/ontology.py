"""
Core Data Ontology for Glass-Box Evaluation Engine
Shared data models across all evaluation modules
"""

from enum import Enum
from typing import Dict, List, Optional, Union, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class EvidenceGrade(str, Enum):
    """Evidence quality grades"""
    E1 = "E1"  # Self-reported (deck, founder docs)
    E2 = "E2"  # Public/third-party (news, patents, app stores)
    E3 = "E3"  # Verified (OAuth APIs, licensed DBs)

class CompanyStage(str, Enum):
    """Company development stages"""
    PRE_SEED = "pre_seed"
    SEED = "seed"
    SERIES_A = "series_a"
    SERIES_B = "series_b"
    LATER = "later"

class MetricType(str, Enum):
    """Types of evaluation metrics"""
    FINANCIAL = "financial"
    MARKET = "market"
    TEAM = "team"
    PRODUCT = "product"
    RISK = "risk"
    TRACTION = "traction"
    DOMAIN_SPECIFIC = "domain_specific"

class EvidenceItem(BaseModel):
    """Individual piece of evidence supporting a metric"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_ref: str  # Reference to source document/API
    grade: EvidenceGrade
    source_quality: float = Field(ge=0.0, le=1.0)  # Source Quality Score (SQS)
    timestamp: datetime
    license: Optional[str] = None  # Usage rights
    extraction_confidence: float = Field(ge=0.0, le=1.0)
    snippet: Optional[str] = None  # Text excerpt or page reference
    page_ref: Optional[str] = None
    
    # SQS Components
    authority: float = Field(ge=0.0, le=1.0, default=0.5)
    freshness: float = Field(ge=0.0, le=1.0, default=1.0)
    independence: float = Field(ge=0.0, le=1.0, default=0.5)
    directness: float = Field(ge=0.0, le=1.0, default=0.5)
    consistency: float = Field(ge=0.0, le=1.0, default=0.5)
    legal_score: float = Field(ge=0.0, le=1.0, default=1.0)
    
    def calculate_source_quality(self) -> float:
        """Calculate Source Quality Score (SQS)"""
        sqs = (
            0.25 * self.authority +
            0.20 * self.freshness +
            0.15 * self.independence +
            0.15 * self.directness +
            0.15 * self.consistency +
            0.10 * self.legal_score
        )
        self.source_quality = sqs
        return sqs
    
    def calculate_evidence_weight(self, coverage: float = 1.0, recency_factor: float = 1.0) -> float:
        """Calculate evidence weight (w^e)"""
        grade_weights = {
            EvidenceGrade.E1: 0.25,
            EvidenceGrade.E2: 0.6,
            EvidenceGrade.E3: 0.9
        }
        
        return (
            grade_weights[self.grade] * 
            self.source_quality * 
            coverage * 
            recency_factor
        )

class Metric(BaseModel):
    """Core evaluation metric with evidence links"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: MetricType
    value: Optional[Union[float, str, bool]] = None
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    evidence_items: List[EvidenceItem] = []
    weight: float = Field(ge=0.0, le=1.0, default=1.0)
    contested: bool = False  # If evidence conflicts
    human_override: Optional[Union[float, str, bool]] = None
    override_reason: Optional[str] = None
    
    def add_evidence(self, evidence: EvidenceItem) -> None:
        """Add evidence item and recalculate confidence"""
        self.evidence_items.append(evidence)
        self.calculate_confidence()
    
    def calculate_confidence(self) -> float:
        """Calculate metric confidence based on evidence quality"""
        if not self.evidence_items:
            self.confidence = 0.0
            return 0.0
        
        # Weighted average of evidence confidence
        total_weight = 0.0
        weighted_confidence = 0.0
        
        for evidence in self.evidence_items:
            weight = evidence.calculate_evidence_weight()
            total_weight += weight
            weighted_confidence += weight * evidence.extraction_confidence
        
        if total_weight > 0:
            self.confidence = weighted_confidence / total_weight
        else:
            self.confidence = 0.0
        
        return self.confidence

class Risk(BaseModel):
    """Risk assessment item"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str  # regulatory, market, technical, team, financial
    description: str
    severity: float = Field(ge=0.0, le=1.0)  # 0 = low, 1 = high
    likelihood: float = Field(ge=0.0, le=1.0)
    mitigation: Optional[str] = None
    evidence_items: List[EvidenceItem] = []

class Benchmark(BaseModel):
    """Industry/stage benchmark data"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    metric_name: str
    industry: str
    stage: CompanyStage
    percentile_25: Optional[float] = None
    percentile_50: Optional[float] = None
    percentile_75: Optional[float] = None
    percentile_90: Optional[float] = None
    sample_size: Optional[int] = None
    data_source: str
    updated_at: datetime

class Person(BaseModel):
    """Person (founder, team member, etc.)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    role: str
    linkedin_url: Optional[str] = None
    email: Optional[str] = None
    background: Optional[str] = None
    experience_years: Optional[float] = None
    previous_exits: Optional[int] = 0
    education: Optional[str] = None
    metrics: List[Metric] = []  # Team-related metrics

class Document(BaseModel):
    """Source document"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str  # pitch_deck, financial_statement, business_plan, etc.
    url: Optional[str] = None
    uploaded_at: datetime
    processed_at: Optional[datetime] = None
    size: int = 0
    status: str = "pending"  # pending, processing, processed, failed
    extracted_data: Dict[str, Any] = {}

class Company(BaseModel):
    """Startup company being evaluated"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    stage: CompanyStage = CompanyStage.SEED
    founded_date: Optional[datetime] = None
    location: Optional[str] = None
    team: List[Person] = []
    documents: List[Document] = []
    domain_labels: List[str] = []  # ["B2B SaaS", "Manufacturing"]
    
class DomainModule(BaseModel):
    """Domain-specific evaluation module"""
    id: str
    name: str
    description: str
    applicable_domains: List[str]
    metrics: List[str]  # Metric names this module evaluates
    weight: float = Field(ge=0.0, le=1.0, default=1.0)

class EvaluationModule(BaseModel):
    """Individual evaluation module (Core or Domain-specific)"""
    id: str
    name: str
    type: str  # "core" or "domain"
    description: str
    metrics: List[Metric] = []
    weight: float = Field(ge=0.0, le=1.0)
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    score: Optional[float] = None
    
    def calculate_score(self) -> float:
        """Calculate module score from weighted metrics"""
        if not self.metrics:
            return 0.0
        
        total_weight = 0.0
        weighted_score = 0.0
        
        for metric in self.metrics:
            if metric.value is not None and isinstance(metric.value, (int, float)):
                total_weight += metric.weight
                weighted_score += metric.weight * float(metric.value)
        
        if total_weight > 0:
            self.score = weighted_score / total_weight
        else:
            self.score = 0.0
        
        return self.score

class Scenario(BaseModel):
    """Scenario analysis"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # "Conservative", "Base", "Optimistic"
    assumptions: Dict[str, Any]
    projected_metrics: List[Metric]

class BiasReport(BaseModel):
    """Bias analysis report"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    identity_blind_score: float
    full_score: float
    bias_delta: float  # Difference between scores
    contributing_factors: List[str]
    flagged_features: List[str]
    confidence: float = Field(ge=0.0, le=1.0)

class Decision(BaseModel):
    """Investment decision with rationale"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    recommendation: str  # "invest", "pass", "monitor"
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: str
    key_strengths: List[str]
    key_concerns: List[str]
    follow_up_items: List[str]
    analyst: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Evaluation(BaseModel):
    """Complete evaluation of a company"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company: Company
    modules: List[EvaluationModule] = []
    overall_score: float = 0.0
    overall_confidence: float = 0.0
    risks: List[Risk] = []
    scenarios: List[Scenario] = []
    bias_report: Optional[BiasReport] = None
    decision: Optional[Decision] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    status: str = "pending"  # pending, processing, completed, failed
    analyst: Optional[str] = None
    
    # Audit trail
    audit_log: List[Dict[str, Any]] = []
    
    def add_audit_entry(self, action: str, details: Dict[str, Any], user: str) -> None:
        """Add entry to audit log"""
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "action": action,
            "details": details,
            "user": user
        }
        self.audit_log.append(entry)
    
    def calculate_overall_score(self) -> float:
        """Calculate weighted overall score from modules"""
        if not self.modules:
            return 0.0
        
        total_weight = sum(module.weight for module in self.modules)
        if total_weight == 0:
            return 0.0
        
        weighted_score = sum(
            module.score * module.weight 
            for module in self.modules 
            if module.score is not None
        )
        
        self.overall_score = weighted_score / total_weight
        return self.overall_score
    
    def calculate_overall_confidence(self) -> float:
        """Calculate overall confidence from module confidences"""
        if not self.modules:
            return 0.0
        
        total_weight = sum(module.weight for module in self.modules)
        if total_weight == 0:
            return 0.0
        
        weighted_confidence = sum(
            module.confidence * module.weight 
            for module in self.modules
        )
        
        self.overall_confidence = weighted_confidence / total_weight
        return self.overall_confidence

# Evidence Graph - bipartite graph structure
class EvidenceGraph(BaseModel):
    """Bipartite graph linking metrics to evidence with lineage"""
    metrics: List[Metric] = []
    evidence_items: List[EvidenceItem] = []
    lineage_edges: List[Dict[str, str]] = []  # Links between evidence items
    conflicts: List[Dict[str, Any]] = []  # Detected conflicts between sources
    
    def add_metric_evidence_link(self, metric_id: str, evidence_id: str) -> None:
        """Link a metric to an evidence item"""
        # Implementation would maintain the bipartite graph structure
        pass
    
    def detect_conflicts(self) -> List[Dict[str, Any]]:
        """Detect conflicts between evidence items for same metrics"""
        # Implementation would analyze evidence consistency
        pass

# Stage-aware default weights
STAGE_WEIGHTS = {
    CompanyStage.PRE_SEED: {
        "team": 35,
        "market": 30,
        "product": 20,
        "traction": 10,
        "finance": 5
    },
    CompanyStage.SEED: {
        "traction": 30,
        "market": 25,
        "team": 20,
        "product": 15,
        "finance": 10
    },
    CompanyStage.SERIES_A: {
        "traction": 35,
        "finance": 20,
        "product": 15,
        "market": 15,
        "team": 15
    }
}

# Domain-specific modules mapping
DOMAIN_MODULES = {
    "Fashion/D2C": ["sentiment_brand_moat", "creator_graph", "repeat_rate_proxies"],
    "Food/QSR": ["real_estate_store_payback", "prime_cost_percent", "sssg"],
    "Logistics/Delivery": ["cost_per_drop", "density", "sla_penalties"],
    "Real Estate/Infra": ["zoning_entitlements", "capital_stack", "dscr"],
    "Biotech/Deep Tech": ["publications_trials", "ip_landscape", "regulatory_path"],
    "B2B SaaS": ["cac_payback", "ndr", "pipeline_coverage", "sales_cycle"]
}