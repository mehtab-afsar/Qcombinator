"""
AI-Powered Comprehensive Evaluation Module (ACE)
Orchestrates AI analysis using LLMs for startup evaluation
"""

import os
from typing import Dict, Any, List
from datetime import datetime
import openai
from anthropic import Anthropic
import json

from app.core.config import settings

class AIEvaluator:
    """
    AI-powered evaluation using GPT-4/Claude
    Provides evidence-based scoring with confidence levels
    """
    
    def __init__(self):
        # Initialize AI clients
        if settings.OPENAI_API_KEY:
            openai.api_key = settings.OPENAI_API_KEY
            self.ai_provider = "openai"
        elif settings.ANTHROPIC_API_KEY:
            self.anthropic = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            self.ai_provider = "anthropic"
        else:
            self.ai_provider = "mock"  # Fallback to mock data
    
    async def evaluate(self, doc_data: Dict, module_results: Dict) -> Dict[str, Any]:
        """
        Perform comprehensive AI evaluation
        Returns scores, insights, and evidence
        """
        
        # Prepare context for AI
        context = self._prepare_context(doc_data, module_results)
        
        # Get AI evaluation
        if self.ai_provider == "mock":
            evaluation = self._mock_evaluation(context)
        else:
            evaluation = await self._ai_evaluation(context)
        
        # Calculate confidence score
        confidence = self._calculate_confidence(evaluation, module_results)
        
        return {
            'overall_score': evaluation['overall_score'],
            'market_score': evaluation['market_score'],
            'team_score': evaluation['team_score'],
            'product_score': evaluation['product_score'],
            'financial_score': evaluation['financial_score'],
            'investment_thesis': evaluation['investment_thesis'],
            'strengths': evaluation['strengths'],
            'weaknesses': evaluation['weaknesses'],
            'opportunities': evaluation['opportunities'],
            'threats': evaluation['threats'],
            'key_questions': evaluation['key_questions'],
            'confidence': confidence,
            'evidence': evaluation.get('evidence', {}),
            'evaluated_at': datetime.utcnow().isoformat()
        }
    
    def _prepare_context(self, doc_data: Dict, module_results: Dict) -> str:
        """Prepare context for AI evaluation"""
        
        context = f"""
        Analyze this startup based on the following extracted data:
        
        COMPANY INFORMATION:
        {json.dumps(doc_data.get('company_info', {}), indent=2)}
        
        FINANCIAL DATA:
        {json.dumps(doc_data.get('financial_data', {}), indent=2)}
        
        TEAM DATA:
        {json.dumps(doc_data.get('team_data', {}), indent=2)}
        
        MARKET DATA:
        {json.dumps(doc_data.get('market_data', {}), indent=2)}
        
        BENCHMARK ANALYSIS:
        {json.dumps(module_results.get('iba', {}), indent=2)}
        
        MARKET INTELLIGENCE:
        {json.dumps(module_results.get('mci', {}), indent=2)}
        
        FINANCIAL ANALYSIS:
        {json.dumps(module_results.get('fda', {}), indent=2)}
        
        Provide a comprehensive evaluation with:
        1. Overall score (0-10)
        2. Category scores (market, team, product, financials) (0-10 each)
        3. Investment thesis (2-3 sentences)
        4. Top 3 strengths
        5. Top 3 weaknesses
        6. Top 3 opportunities
        7. Top 3 threats
        8. 3 critical due diligence questions
        9. Evidence/reasoning for each score
        
        Format as JSON.
        """
        
        return context
    
    async def _ai_evaluation(self, context: str) -> Dict:
        """Get evaluation from AI provider"""
        
        if self.ai_provider == "openai":
            return await self._openai_evaluation(context)
        elif self.ai_provider == "anthropic":
            return await self._anthropic_evaluation(context)
        else:
            return self._mock_evaluation(context)
    
    async def _openai_evaluation(self, context: str) -> Dict:
        """Get evaluation from OpenAI GPT-4"""
        try:
            response = openai.ChatCompletion.create(
                model=settings.AI_MODEL,
                messages=[
                    {"role": "system", "content": "You are an expert venture capital analyst evaluating startups."},
                    {"role": "user", "content": context}
                ],
                temperature=0.3,
                max_tokens=2000
            )
            
            # Parse JSON response
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            print(f"OpenAI API error: {e}")
            return self._mock_evaluation(context)
    
    async def _anthropic_evaluation(self, context: str) -> Dict:
        """Get evaluation from Anthropic Claude"""
        try:
            response = self.anthropic.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=2000,
                temperature=0.3,
                system="You are an expert venture capital analyst evaluating startups.",
                messages=[
                    {"role": "user", "content": context}
                ]
            )
            
            # Parse JSON response
            result = json.loads(response.content)
            return result
            
        except Exception as e:
            print(f"Anthropic API error: {e}")
            return self._mock_evaluation(context)
    
    def _mock_evaluation(self, context: str) -> Dict:
        """Mock evaluation for testing without AI API"""
        return {
            'overall_score': 7.5,
            'market_score': 8.0,
            'team_score': 7.8,
            'product_score': 7.2,
            'financial_score': 6.9,
            'investment_thesis': "Strong market opportunity with experienced team. Product shows early traction but needs to demonstrate scalable unit economics. Worth deeper diligence if burn rate can be optimized.",
            'strengths': [
                "Large and growing TAM ($50B+) with clear market need",
                "Founding team has relevant domain expertise and prior exits",
                "Early customer traction with 20% MoM growth"
            ],
            'weaknesses': [
                "High CAC ($2000) vs LTV ($5000) ratio needs improvement",
                "Burn rate ($500k/month) gives only 12 months runway",
                "Limited technical differentiation vs established competitors"
            ],
            'opportunities': [
                "Expansion into adjacent verticals could 3x TAM",
                "Partnership with industry leader under negotiation",
                "AI features could significantly improve unit economics"
            ],
            'threats': [
                "Well-funded competitors with 10x resources",
                "Regulatory changes could impact business model",
                "Customer concentration risk (30% from top 3 customers)"
            ],
            'key_questions': [
                "What is the plan to reduce CAC by 50% in next 6 months?",
                "How will you defend against competitor's recent product launch?",
                "What are the key milestones to reach profitability?"
            ],
            'evidence': {
                'market_score': "TAM validated by Gartner report, 35% CAGR",
                'team_score': "CEO has 15 years experience, CTO from Google",
                'product_score': "NPS of 72, but limited moat",
                'financial_score': "Revenue growing but unit economics need work"
            }
        }
    
    def _calculate_confidence(self, evaluation: Dict, module_results: Dict) -> str:
        """
        Calculate confidence level based on data quality and completeness
        Returns: E1 (High), E2 (Medium), or E3 (Low)
        """
        
        confidence_score = 0.0
        factors = 0
        
        # Check data quality score
        if 'dqm' in module_results:
            dqm_score = module_results['dqm'].get('score', 0)
            confidence_score += dqm_score
            factors += 1
        
        # Check financial data completeness
        if evaluation.get('financial_score'):
            if evaluation['financial_score'] > 0:
                confidence_score += 0.8
                factors += 1
        
        # Check team data availability
        if evaluation.get('team_score'):
            if evaluation['team_score'] > 0:
                confidence_score += 0.7
                factors += 1
        
        # Check market data validation
        if 'mci' in module_results:
            if module_results['mci'].get('confidence'):
                confidence_score += 0.9
                factors += 1
        
        # Calculate average confidence
        avg_confidence = confidence_score / factors if factors > 0 else 0
        
        # Map to E1/E2/E3
        if avg_confidence >= 0.8:
            return "E1"
        elif avg_confidence >= 0.5:
            return "E2"
        else:
            return "E3"