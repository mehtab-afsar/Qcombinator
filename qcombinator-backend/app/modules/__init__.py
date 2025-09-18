"""
Fast Scan Modules - Simplified implementations for MVP
Each module provides core functionality for <3 minute evaluation
"""

from typing import Dict, Any
import random
from datetime import datetime

# DQM - Data Quality Management
class DataQualityManager:
    async def validate(self, doc_data: Dict) -> Dict:
        """Validate data completeness and quality"""
        score = 0.0
        issues = []
        
        # Check required fields
        if doc_data.get('company_info', {}).get('name'):
            score += 0.2
        else:
            issues.append("Missing company name")
            
        if doc_data.get('financial_data', {}).get('revenue'):
            score += 0.3
        else:
            issues.append("Missing revenue data")
            
        if doc_data.get('team_data', {}).get('key_members'):
            score += 0.2
        else:
            issues.append("Missing team information")
            
        if doc_data.get('market_data', {}).get('tam'):
            score += 0.3
        else:
            issues.append("Missing market size data")
        
        return {
            'score': min(score, 1.0),
            'issues': issues,
            'status': 'complete' if score > 0.7 else 'incomplete'
        }

# IBA - Industry Benchmark Analysis  
class BenchmarkAnalyzer:
    async def analyze_benchmarks(self, doc_data: Dict) -> Dict:
        """Compare against industry benchmarks"""
        
        # Mock benchmark data
        benchmarks = {
            'revenue_growth': {'p25': 0.5, 'p50': 1.0, 'p75': 2.0},
            'gross_margin': {'p25': 0.4, 'p50': 0.6, 'p75': 0.8},
            'burn_multiple': {'p25': 3.0, 'p50': 2.0, 'p75': 1.0},
            'cac_payback': {'p25': 18, 'p50': 12, 'p75': 6}
        }
        
        percentile = random.choice(['p25', 'p50', 'p75'])
        
        return {
            'score': 7.0 if percentile == 'p75' else 5.0 if percentile == 'p50' else 3.0,
            'percentile': percentile,
            'benchmarks': benchmarks,
            'source': 'Industry Database Q4 2024'
        }

# MCI - Market & Competitive Intelligence
class MarketIntelligence:
    async def analyze_market(self, doc_data: Dict) -> Dict:
        """Analyze market size and competition"""
        
        market_data = doc_data.get('market_data', {})
        
        # Mock market analysis
        tam = 50000000000  # $50B
        sam = 5000000000   # $5B
        som = 500000000    # $500M
        
        competitors = [
            {'name': 'Competitor A', 'market_share': 0.3, 'funding': 100000000},
            {'name': 'Competitor B', 'market_share': 0.2, 'funding': 50000000},
            {'name': 'Competitor C', 'market_share': 0.1, 'funding': 20000000}
        ]
        
        return {
            'score': 7.5,
            'tam': tam,
            'sam': sam,
            'som': som,
            'competitors': competitors,
            'market_growth': 0.35,  # 35% CAGR
            'confidence': 'E2'
        }

# TLA - Team & Leadership Assessment
class TeamAssessment:
    async def assess_team(self, doc_data: Dict) -> Dict:
        """Assess team background and capabilities"""
        
        team_data = doc_data.get('team_data', {})
        
        # Mock team assessment
        return {
            'score': 7.8,
            'founder_score': 8.0,
            'team_completeness': 0.75,
            'relevant_experience': True,
            'prior_exits': 1,
            'red_flags': [],
            'strengths': ['Domain expertise', 'Technical background', 'Prior startup experience']
        }

# FDA - Financial Data Analysis
class FinancialAnalyzer:
    async def analyze_financials(self, doc_data: Dict) -> Dict:
        """Analyze financial metrics and health"""
        
        financial_data = doc_data.get('financial_data', {})
        
        # Mock financial analysis
        return {
            'score': 6.5,
            'revenue': 2500000,
            'growth_rate': 1.2,  # 120% YoY
            'burn_rate': 350000,
            'runway': 18,  # months
            'gross_margin': 0.65,
            'cac': 1500,
            'ltv': 4500,
            'ltv_cac_ratio': 3.0,
            'burn_multiple': 2.1
        }

# RAS - Risk Assessment & Scoring
class RiskScorer:
    async def calculate_risks(self, doc_data: Dict, analysis_results: Dict) -> Dict:
        """Calculate risk scores and identify key risks"""
        
        risks = []
        
        # Market risks
        if analysis_results.get('mci', {}).get('competitors', []):
            if len(analysis_results['mci']['competitors']) > 5:
                risks.append({
                    'category': 'market',
                    'risk': 'Highly competitive market',
                    'severity': 'high',
                    'mitigation': 'Strong differentiation needed'
                })
        
        # Financial risks
        if analysis_results.get('fda', {}).get('runway', 24) < 12:
            risks.append({
                'category': 'financial',
                'risk': 'Short runway (<12 months)',
                'severity': 'critical',
                'mitigation': 'Immediate fundraising required'
            })
        
        # Team risks
        if not analysis_results.get('tla', {}).get('relevant_experience'):
            risks.append({
                'category': 'team',
                'risk': 'Limited domain experience',
                'severity': 'medium',
                'mitigation': 'Hire domain experts or advisors'
            })
        
        critical_risks = [r['risk'] for r in risks if r['severity'] == 'critical']
        
        # Calculate risk score (inverse - lower is riskier)
        risk_score = 10.0 - (len(risks) * 1.5)
        risk_score = max(risk_score, 0.0)
        
        return {
            'score': risk_score,
            'risks': risks,
            'critical_risks': critical_risks,
            'risk_matrix': {
                'market': 'medium',
                'execution': 'low',
                'financial': 'high' if any(r['category'] == 'financial' for r in risks) else 'low'
            }
        }

# ERG - Evaluation Report Generation
class ReportGenerator:
    async def generate_one_pager(self, results: Dict, evaluation: Dict) -> str:
        """Generate one-page IC report"""
        
        # Create report path
        report_path = f"reports/fast_scan_{results['scan_id']}.pdf"
        
        # In production, would generate actual PDF
        # For now, create a mock report structure
        report_content = f"""
        FAST SCAN REPORT - {datetime.utcnow().strftime('%Y-%m-%d')}
        
        Company: {results.get('filename', 'Unknown')}
        Decision: {results.get('decision', 'PENDING')}
        Score: {results.get('final_score', 0)}/10
        Confidence: {evaluation.get('confidence', 'E3')}
        
        TOP REASONS:
        {chr(10).join(results.get('top_reasons', []))}
        
        SCORES:
        - Market: {evaluation.get('market_score', 0)}/10
        - Team: {evaluation.get('team_score', 0)}/10
        - Product: {evaluation.get('product_score', 0)}/10
        - Financials: {evaluation.get('financial_score', 0)}/10
        
        KEY DILIGENCE QUESTIONS:
        {chr(10).join(evaluation.get('key_questions', []))}
        
        Processing Time: {results.get('processing_time', 0)}s
        """
        
        # Save report (mock - would use reportlab in production)
        import os
        os.makedirs('reports', exist_ok=True)
        with open(report_path, 'w') as f:
            f.write(report_content)
        
        return report_path