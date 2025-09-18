"""
Fast Scan Orchestrator - Core engine for <3 minute evaluation
Coordinates all modules to produce GO/NO-GO decision
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import uuid
import json
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from fastapi import UploadFile, BackgroundTasks

from app.core.config import settings
# Import simplified mock modules
from app.modules import (
    DataQualityManager,
    BenchmarkAnalyzer,
    MarketIntelligence,
    TeamAssessment,
    FinancialAnalyzer,
    RiskScorer,
    ReportGenerator
)

# Mock modules for MVP
class DocumentProcessor:
    async def process(self, file):
        return {
            'filename': file.filename,
            'company_info': {'name': 'Example Startup'},
            'financial_data': {'arr': 1200000},
            'team_data': {'team_size': 12},
            'market_data': {'tam': 10000000000}
        }

class AIEvaluator:
    async def evaluate(self, data, modules):
        return {
            'product_score': 7.5,
            'strengths': ['Strong team', 'Good traction'],
            'confidence': 'E2'
        }

class FastScanOrchestrator:
    """
    Orchestrates the Fast Scan process
    Target: Complete evaluation in <3 minutes
    """
    
    def __init__(self):
        # Use in-memory storage instead of Redis for MVP
        self.storage = {}
        self.executor = ThreadPoolExecutor(max_workers=10)
        self.modules = self._initialize_modules()
        
    def _initialize_modules(self):
        """Initialize all evaluation modules"""
        return {
            'dup': DocumentProcessor(),
            'dqm': DataQualityManager(),
            'iba': BenchmarkAnalyzer(),
            'mci': MarketIntelligence(),
            'tla': TeamAssessment(),
            'fda': FinancialAnalyzer(),
            'ras': RiskScorer(),
            'ace': AIEvaluator(),
            'erg': ReportGenerator()
        }
    
    async def initiate_scan(
        self, 
        file: UploadFile,
        filename: str,
        background_tasks: BackgroundTasks
    ) -> str:
        """
        Initiate Fast Scan process
        Returns scan_id for tracking
        """
        scan_id = str(uuid.uuid4())
        
        # Store initial status
        scan_data = {
            'id': scan_id,
            'filename': filename,
            'status': 'processing',
            'started_at': datetime.utcnow().isoformat(),
            'modules_completed': [],
            'progress': 0
        }
        
        # Store in memory instead of Redis
        self.storage[f"scan:{scan_id}"] = scan_data
        
        # Start async processing
        background_tasks.add_task(
            self._process_scan,
            scan_id,
            file,
            filename
        )
        
        return scan_id
    
    async def _process_scan(self, scan_id: str, file: UploadFile, filename: str):
        """
        Main Fast Scan processing pipeline
        Must complete in <3 minutes
        """
        start_time = datetime.utcnow()
        deadline = start_time + timedelta(seconds=settings.FAST_SCAN_TIME_LIMIT)
        
        results = {
            'scan_id': scan_id,
            'filename': filename,
            'started_at': start_time.isoformat(),
            'modules': {}
        }
        
        try:
            # Phase 1: Document Processing (30s)
            self._update_status(scan_id, 'Extracting document data...', 10)
            doc_data = await self._run_with_timeout(
                self.modules['dup'].process(file),
                timeout=30,
                module='dup'
            )
            results['modules']['dup'] = doc_data
            
            # Phase 2: Data Quality Check (10s)
            self._update_status(scan_id, 'Validating data quality...', 20)
            quality_score = await self._run_with_timeout(
                self.modules['dqm'].validate(doc_data),
                timeout=10,
                module='dqm'
            )
            results['modules']['dqm'] = quality_score
            
            # Phase 3: Parallel Analysis (60s total)
            self._update_status(scan_id, 'Running parallel analysis...', 30)
            
            # Run these modules in parallel
            parallel_tasks = {
                'iba': self.modules['iba'].analyze_benchmarks(doc_data),
                'mci': self.modules['mci'].analyze_market(doc_data),
                'tla': self.modules['tla'].assess_team(doc_data),
                'fda': self.modules['fda'].analyze_financials(doc_data)
            }
            
            parallel_results = await self._run_parallel_with_timeout(
                parallel_tasks,
                timeout=60
            )
            results['modules'].update(parallel_results)
            
            # Phase 4: Risk Assessment (20s)
            self._update_status(scan_id, 'Assessing risks...', 60)
            risk_assessment = await self._run_with_timeout(
                self.modules['ras'].calculate_risks(
                    doc_data,
                    parallel_results
                ),
                timeout=20,
                module='ras'
            )
            results['modules']['ras'] = risk_assessment
            
            # Phase 5: AI Evaluation (30s)
            self._update_status(scan_id, 'Running AI evaluation...', 75)
            ai_evaluation = await self._run_with_timeout(
                self.modules['ace'].evaluate(
                    doc_data,
                    results['modules']
                ),
                timeout=30,
                module='ace'
            )
            results['modules']['ace'] = ai_evaluation
            
            # Phase 6: Generate Report (20s)
            self._update_status(scan_id, 'Generating report...', 90)
            report_path = await self._run_with_timeout(
                self.modules['erg'].generate_one_pager(
                    results,
                    ai_evaluation
                ),
                timeout=20,
                module='erg'
            )
            results['report_path'] = report_path
            
            # Calculate final score and decision
            final_score = self._calculate_final_score(results['modules'])
            go_no_go = self._make_decision(final_score, results['modules'])
            
            # Final results
            end_time = datetime.utcnow()
            processing_time = (end_time - start_time).total_seconds()
            
            results.update({
                'status': 'completed',
                'completed_at': end_time.isoformat(),
                'processing_time': processing_time,
                'final_score': final_score,
                'decision': go_no_go['decision'],
                'top_reasons': go_no_go['reasons'],
                'confidence': go_no_go['confidence']
            })
            
            # Store final results
            self._update_status(scan_id, 'Completed', 100, results)
            
            print(f"✅ Fast Scan completed in {processing_time:.1f} seconds")
            
        except TimeoutError as e:
            results['status'] = 'timeout'
            results['error'] = 'Fast Scan exceeded 3-minute limit'
            self._update_status(scan_id, 'Timeout', 0, results)
            
        except Exception as e:
            results['status'] = 'error'
            results['error'] = str(e)
            self._update_status(scan_id, 'Error', 0, results)
    
    async def _run_with_timeout(self, coro, timeout: int, module: str):
        """Run coroutine with timeout"""
        try:
            return await asyncio.wait_for(coro, timeout=timeout)
        except asyncio.TimeoutError:
            print(f"⚠️ Module {module} timed out after {timeout}s")
            return {'status': 'timeout', 'module': module}
    
    async def _run_parallel_with_timeout(self, tasks: Dict, timeout: int):
        """Run multiple tasks in parallel with timeout"""
        results = {}
        
        async def run_task(name, coro):
            try:
                result = await asyncio.wait_for(coro, timeout=timeout/2)
                return name, result
            except asyncio.TimeoutError:
                return name, {'status': 'timeout', 'module': name}
        
        # Create all tasks
        async_tasks = [run_task(name, coro) for name, coro in tasks.items()]
        
        # Wait for all to complete
        completed = await asyncio.gather(*async_tasks)
        
        # Convert to dict
        for name, result in completed:
            results[name] = result
        
        return results
    
    def _calculate_final_score(self, modules: Dict) -> float:
        """Calculate weighted final score"""
        scores = {
            'market': modules.get('mci', {}).get('score', 0),
            'team': modules.get('tla', {}).get('score', 0),
            'product': modules.get('ace', {}).get('product_score', 0),
            'financials': modules.get('fda', {}).get('score', 0),
            'risk': modules.get('ras', {}).get('score', 0)
        }
        
        weights = settings.DEFAULT_WEIGHTS
        
        final_score = sum(
            scores[key] * weights[key] 
            for key in scores
        )
        
        return round(final_score, 2)
    
    def _make_decision(self, score: float, modules: Dict) -> Dict:
        """Make GO/NO-GO decision with reasons"""
        
        # Decision threshold
        GO_THRESHOLD = 7.0
        
        decision = "GO" if score >= GO_THRESHOLD else "NO-GO"
        
        # Extract top positive and negative factors
        reasons = []
        
        # Get strengths
        if modules.get('ace', {}).get('strengths'):
            reasons.extend([
                f"✅ {s}" for s in modules['ace']['strengths'][:2]
            ])
        
        # Get risks
        if modules.get('ras', {}).get('critical_risks'):
            reasons.extend([
                f"⚠️ {r}" for r in modules['ras']['critical_risks'][:2]
            ])
        
        # Calculate confidence
        data_quality = modules.get('dqm', {}).get('score', 0)
        confidence = "E1" if data_quality > 0.8 else "E2" if data_quality > 0.5 else "E3"
        
        return {
            'decision': decision,
            'reasons': reasons[:3],  # Top 3 reasons
            'confidence': confidence,
            'threshold': GO_THRESHOLD
        }
    
    def _update_status(self, scan_id: str, message: str, progress: int, data: Dict = None):
        """Update scan status in Redis"""
        status_data = {
            'status': message,
            'progress': progress,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        if data:
            status_data.update(data)
        
        # Update in-memory storage
        self.storage[f"scan:{scan_id}"] = status_data
    
    async def get_scan_status(self, scan_id: str) -> Optional[Dict]:
        """Get current scan status"""
        # Get from in-memory storage
        return self.storage.get(f"scan:{scan_id}", None)
    
    async def get_report_path(self, scan_id: str) -> Optional[str]:
        """Get report file path if available"""
        status = await self.get_scan_status(scan_id)
        if status and status.get('status') == 'completed':
            return status.get('report_path')
        return None