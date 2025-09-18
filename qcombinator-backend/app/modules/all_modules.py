"""
Import all modules from single file to avoid circular imports
"""

from app.modules.dup import DocumentProcessor
from app.modules import (
    DataQualityManager,
    BenchmarkAnalyzer,
    MarketIntelligence,
    TeamAssessment,
    FinancialAnalyzer,
    RiskScorer,
    ReportGenerator
)
from app.modules.ace import AIEvaluator

__all__ = [
    'DocumentProcessor',
    'DataQualityManager', 
    'BenchmarkAnalyzer',
    'MarketIntelligence',
    'TeamAssessment',
    'FinancialAnalyzer',
    'RiskScorer',
    'AIEvaluator',
    'ReportGenerator'
]