"""
Domain Playlist Orchestrator
Handles domain classification, module selection, and stage-aware weighting
"""

from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
import re
from datetime import datetime

from .ontology import (
    Company, CompanyStage, EvaluationModule, DomainModule, 
    STAGE_WEIGHTS, DOMAIN_MODULES, MetricType
)

@dataclass
class DomainClassificationResult:
    """Result of domain classification"""
    primary_domain: str
    secondary_domains: List[str]
    confidence: float
    stage: CompanyStage
    keywords_found: List[str]
    naics_code: Optional[str] = None

class DomainClassifier:
    """Classifies companies by domain and stage"""
    
    def __init__(self):
        # Domain classification keywords
        self.domain_keywords = {
            "B2B SaaS": [
                "saas", "software as a service", "b2b", "enterprise",
                "api", "platform", "dashboard", "workflow", "automation",
                "crm", "erp", "integration", "subscription", "acv", "arr", "mrr"
            ],
            "D2C/E-commerce": [
                "d2c", "direct to consumer", "e-commerce", "ecommerce", "retail",
                "marketplace", "shopify", "amazon", "brand", "consumer goods",
                "fashion", "apparel", "beauty", "lifestyle"
            ],
            "Fintech": [
                "fintech", "financial", "banking", "payment", "lending",
                "crypto", "blockchain", "insurance", "wealth", "trading",
                "neobank", "embedded finance", "api", "compliance"
            ],
            "Healthcare": [
                "healthcare", "health", "medical", "telemedicine", "biotech",
                "pharma", "clinical", "therapy", "wellness", "mental health",
                "medical device", "diagnostics", "telehealth"
            ],
            "Food/QSR": [
                "food", "restaurant", "qsr", "quick service", "delivery",
                "ghost kitchen", "food tech", "catering", "beverage",
                "grocery", "meal", "dining", "franchise"
            ],
            "Logistics/Delivery": [
                "logistics", "delivery", "shipping", "supply chain",
                "last mile", "fulfillment", "warehouse", "freight",
                "transportation", "fleet", "routing", "tracking"
            ],
            "Real Estate/PropTech": [
                "real estate", "proptech", "property", "construction",
                "smart building", "iot", "facilities", "commercial real estate",
                "residential", "mortgage", "leasing", "property management"
            ],
            "Biotech/Deep Tech": [
                "biotech", "deep tech", "ai", "machine learning", "robotics",
                "quantum", "semiconductor", "materials", "energy",
                "cleantech", "research", "ip", "patent", "clinical trial"
            ],
            "Manufacturing/Industrial": [
                "manufacturing", "industrial", "factory", "production",
                "supply chain", "b2b", "hardware", "machinery",
                "automotive", "aerospace", "chemicals", "materials"
            ]
        }
        
        # Stage classification keywords
        self.stage_keywords = {
            CompanyStage.PRE_SEED: [
                "pre-seed", "idea", "prototype", "mvp", "concept",
                "founder", "co-founder", "early", "stealth"
            ],
            CompanyStage.SEED: [
                "seed", "early revenue", "pilot", "beta", "traction",
                "product-market fit", "validation", "customers"
            ],
            CompanyStage.SERIES_A: [
                "series a", "growth", "scaling", "expansion", "revenue",
                "go-to-market", "sales team", "established"
            ],
            CompanyStage.SERIES_B: [
                "series b", "scale", "profitability", "market leader",
                "international", "acquisition"
            ],
            CompanyStage.LATER: [
                "series c", "late stage", "ipo", "exit", "mature"
            ]
        }
        
        # NAICS code mapping (simplified)
        self.naics_mapping = {
            "54151": "B2B SaaS",  # Computer Systems Design
            "44-45": "D2C/E-commerce",  # Retail Trade
            "52": "Fintech",  # Finance and Insurance
            "62": "Healthcare",  # Health Care and Social Assistance
            "72": "Food/QSR",  # Accommodation and Food Services
            "48-49": "Logistics/Delivery",  # Transportation and Warehousing
            "53": "Real Estate/PropTech",  # Real Estate
            "54171": "Biotech/Deep Tech",  # Research and Development
            "31-33": "Manufacturing/Industrial"  # Manufacturing
        }
    
    def classify_domain(
        self, 
        company: Company, 
        description_text: str = "", 
        website_text: str = ""
    ) -> DomainClassificationResult:
        """Classify company domain based on available information"""
        
        # Combine all text sources
        text_sources = [
            company.description or "",
            company.name,
            description_text,
            website_text
        ]
        combined_text = " ".join(text_sources).lower()
        
        # Score each domain
        domain_scores = {}
        all_keywords_found = []
        
        for domain, keywords in self.domain_keywords.items():
            score = 0
            keywords_found = []
            
            for keyword in keywords:
                if keyword in combined_text:
                    # Weight longer keywords more heavily
                    weight = len(keyword.split())
                    score += weight
                    keywords_found.append(keyword)
                    all_keywords_found.append(keyword)
            
            if keywords_found:
                domain_scores[domain] = {
                    "score": score,
                    "keywords": keywords_found
                }
        
        # Sort by score
        if domain_scores:
            sorted_domains = sorted(
                domain_scores.items(), 
                key=lambda x: x[1]["score"], 
                reverse=True
            )
            
            primary_domain = sorted_domains[0][0]
            primary_score = sorted_domains[0][1]["score"]
            
            # Secondary domains (score >= 50% of primary)
            secondary_domains = [
                domain for domain, data in sorted_domains[1:]
                if data["score"] >= primary_score * 0.5
            ]
            
            # Calculate confidence
            total_score = sum(data["score"] for _, data in sorted_domains)
            confidence = primary_score / total_score if total_score > 0 else 0.0
            
        else:
            # Default classification
            primary_domain = "B2B SaaS"  # Most common
            secondary_domains = []
            confidence = 0.1
        
        # Classify stage
        stage = self._classify_stage(combined_text, company)
        
        return DomainClassificationResult(
            primary_domain=primary_domain,
            secondary_domains=secondary_domains,
            confidence=confidence,
            stage=stage,
            keywords_found=all_keywords_found
        )
    
    def _classify_stage(self, text: str, company: Company) -> CompanyStage:
        """Classify company stage"""
        
        # Check for explicit stage keywords
        stage_scores = {}
        for stage, keywords in self.stage_keywords.items():
            score = sum(1 for keyword in keywords if keyword in text)
            if score > 0:
                stage_scores[stage] = score
        
        if stage_scores:
            return max(stage_scores.items(), key=lambda x: x[1])[0]
        
        # Infer from company age and other signals
        if company.founded_date:
            days_old = (datetime.utcnow() - company.founded_date).days
            if days_old < 365:
                return CompanyStage.PRE_SEED
            elif days_old < 730:
                return CompanyStage.SEED
            else:
                return CompanyStage.SERIES_A
        
        # Default
        return CompanyStage.SEED

class ModuleOrchestrator:
    """Orchestrates evaluation module selection and weighting"""
    
    def __init__(self):
        # Core modules (always included)
        self.core_modules = [
            {
                "id": "team",
                "name": "Team Assessment",
                "description": "Founder and team evaluation",
                "type": "core",
                "metrics": ["founder_experience", "team_composition", "advisory_board"]
            },
            {
                "id": "market",
                "name": "Market Analysis", 
                "description": "Market size, competition, timing",
                "type": "core",
                "metrics": ["market_size", "competition", "market_timing", "go_to_market"]
            },
            {
                "id": "traction",
                "name": "Traction & Growth",
                "description": "Revenue, users, growth metrics",
                "type": "core", 
                "metrics": ["revenue", "user_growth", "retention", "unit_economics"]
            },
            {
                "id": "product",
                "name": "Product & Defensibility",
                "description": "Product quality, differentiation, moats",
                "type": "core",
                "metrics": ["product_quality", "differentiation", "ip_moats", "switching_costs"]
            },
            {
                "id": "finance",
                "name": "Financial Health",
                "description": "Burn rate, runway, unit economics",
                "type": "core",
                "metrics": ["burn_rate", "runway", "gross_margin", "capital_efficiency"]
            },
            {
                "id": "risk",
                "name": "Risk Assessment",
                "description": "Regulatory, market, execution risks",
                "type": "core",
                "metrics": ["regulatory_risk", "market_risk", "execution_risk", "competitive_risk"]
            }
        ]
        
        # Domain-specific modules
        self.domain_modules = {
            "B2B SaaS": [
                {
                    "id": "cac_payback",
                    "name": "CAC Payback Analysis",
                    "description": "Customer acquisition cost and payback period",
                    "metrics": ["cac", "ltv", "payback_months", "cac_ltv_ratio"]
                },
                {
                    "id": "ndr",
                    "name": "Net Dollar Retention",
                    "description": "Revenue expansion from existing customers",
                    "metrics": ["ndr", "expansion_revenue", "churn_rate", "upsell_rate"]
                },
                {
                    "id": "sales_efficiency",
                    "name": "Sales Efficiency",
                    "description": "Sales cycle, pipeline, conversion rates",
                    "metrics": ["sales_cycle", "pipeline_coverage", "conversion_rates", "acv"]
                }
            ],
            "D2C/E-commerce": [
                {
                    "id": "brand_sentiment", 
                    "name": "Brand & Sentiment Analysis",
                    "description": "Brand strength, customer sentiment, social presence",
                    "metrics": ["brand_awareness", "sentiment_score", "social_engagement", "nps"]
                },
                {
                    "id": "repeat_rate",
                    "name": "Repeat Purchase Analysis", 
                    "description": "Customer loyalty and repeat purchase behavior",
                    "metrics": ["repeat_rate", "customer_lifetime", "cohort_retention", "subscription_rate"]
                }
            ],
            "Food/QSR": [
                {
                    "id": "unit_economics",
                    "name": "Store Unit Economics",
                    "description": "Store-level profitability and payback",
                    "metrics": ["store_payback", "prime_cost_percent", "labor_cost_percent", "food_cost_percent"]
                },
                {
                    "id": "same_store_growth",
                    "name": "Same Store Sales Growth", 
                    "description": "SSSG and store maturation",
                    "metrics": ["sssg", "transaction_count", "average_ticket", "store_maturity"]
                }
            ],
            "Logistics/Delivery": [
                {
                    "id": "delivery_metrics",
                    "name": "Delivery Performance",
                    "description": "Cost per drop, density, SLA performance",
                    "metrics": ["cost_per_drop", "delivery_density", "sla_performance", "route_efficiency"]
                }
            ],
            "Healthcare": [
                {
                    "id": "regulatory_compliance",
                    "name": "Regulatory & Compliance",
                    "description": "FDA approvals, clinical trials, compliance",
                    "metrics": ["fda_status", "clinical_trials", "hipaa_compliance", "regulatory_pathway"]
                }
            ],
            "Biotech/Deep Tech": [
                {
                    "id": "ip_portfolio",
                    "name": "IP & Publications",
                    "description": "Patent portfolio, publications, research depth",
                    "metrics": ["patent_count", "publication_count", "citation_index", "ip_quality"]
                },
                {
                    "id": "technical_risk", 
                    "name": "Technical Risk Assessment",
                    "description": "Technical feasibility, development timeline",
                    "metrics": ["technical_feasibility", "development_timeline", "proof_of_concept", "scalability"]
                }
            ]
        }
    
    def create_evaluation_playlist(
        self, 
        classification: DomainClassificationResult,
        custom_weights: Optional[Dict[str, float]] = None
    ) -> List[EvaluationModule]:
        """Create evaluation module playlist for a company"""
        
        modules = []
        
        # Add core modules with stage-aware weights
        stage_weights = STAGE_WEIGHTS.get(classification.stage, STAGE_WEIGHTS[CompanyStage.SEED])
        
        for core_module in self.core_modules:
            weight = stage_weights.get(core_module["id"], 1.0) / 100.0  # Convert percentage
            
            # Apply custom weights if provided
            if custom_weights and core_module["id"] in custom_weights:
                weight = custom_weights[core_module["id"]]
            
            module = EvaluationModule(
                id=core_module["id"],
                name=core_module["name"],
                type="core",
                description=core_module["description"],
                weight=weight
            )
            modules.append(module)
        
        # Add domain-specific modules
        domain_modules = self.domain_modules.get(classification.primary_domain, [])
        domain_weight_per_module = 0.2 / len(domain_modules) if domain_modules else 0
        
        for domain_module in domain_modules:
            weight = domain_weight_per_module
            
            # Apply custom weights if provided
            if custom_weights and domain_module["id"] in custom_weights:
                weight = custom_weights[domain_module["id"]]
            
            module = EvaluationModule(
                id=domain_module["id"],
                name=domain_module["name"],
                type="domain",
                description=domain_module["description"],
                weight=weight
            )
            modules.append(module)
        
        # Normalize weights to sum to 1.0
        total_weight = sum(module.weight for module in modules)
        if total_weight > 0:
            for module in modules:
                module.weight = module.weight / total_weight
        
        return modules
    
    def get_module_rationale(
        self, 
        classification: DomainClassificationResult,
        modules: List[EvaluationModule]
    ) -> Dict[str, Any]:
        """Generate rationale for module selection and weights"""
        
        return {
            "domain_classification": {
                "primary": classification.primary_domain,
                "secondary": classification.secondary_domains,
                "confidence": classification.confidence,
                "keywords_found": classification.keywords_found
            },
            "stage_classification": {
                "stage": classification.stage.value,
                "rationale": f"Stage-aware weighting applied for {classification.stage.value}"
            },
            "module_selection": {
                "core_modules": [
                    {
                        "id": module.id,
                        "name": module.name,
                        "weight": module.weight,
                        "rationale": f"Core module always included, weight adjusted for {classification.stage.value} stage"
                    }
                    for module in modules if module.type == "core"
                ],
                "domain_modules": [
                    {
                        "id": module.id,
                        "name": module.name, 
                        "weight": module.weight,
                        "rationale": f"Selected for {classification.primary_domain} domain"
                    }
                    for module in modules if module.type == "domain"
                ]
            },
            "weight_explanation": f"Weights optimized for {classification.stage.value} stage companies in {classification.primary_domain}"
        }

# Factory function
def create_domain_orchestrator() -> Tuple[DomainClassifier, ModuleOrchestrator]:
    """Factory to create domain orchestration system"""
    classifier = DomainClassifier()
    orchestrator = ModuleOrchestrator()
    return classifier, orchestrator