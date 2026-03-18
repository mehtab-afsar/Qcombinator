'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, Download, Loader2, CheckCircle2, Rocket, Globe, Copy, Check, TrendingUp, Send, MessageSquare, Users } from 'lucide-react'
import { bg, surf, bdr, ink, muted, green, amber, red, blue } from '../../shared/constants/colors'
import { CopyBtn } from '../../shared/components/CopyBtn'

export function PMFSurveyRenderer({ data, artifactId, userId }: { data: Record<string, unknown>; artifactId?: string; userId?: string }) {
  const d = data as {
    targetSegment?: string;
    interviewScript?: { phase: string; duration: string; questions: string[] }[];
    ellisTest?: { primaryQuestion?: string; options?: string[]; benchmark?: string; followUps?: string[] };
    experiments?: { hypothesis: string; test: string; metric: string; successCriteria: string; timeframe?: string }[];
    segmentAnalysis?: { segment: string; painLevel: string; willingness: string; priority: number }[];
  };

  const [surveyStats, setSurveyStats] = useState<{
    total: number; pmfScore: number;
    distribution?: { very_disappointed: number; somewhat_disappointed: number; not_disappointed: number };
    textAnswers?: { qid: string; text: string }[];
  } | null>(null);
  const [showResponses, setShowResponses] = useState(false);
  const [linkCopied, setLinkCopied]       = useState(false);

  // Survey response auto-analysis state
  const [analyzing, setAnalyzing]                         = useState(false);
  const [analysisResult, setAnalysisResult]               = useState<{
    totalCount?: number; newCount?: number; pmfScore?: number;
    analysis?: {
      pmfSignal?: string; pmfScore?: number; trendNote?: string;
      topThemes?: string[]; topQuote?: string | null;
      earlyAdopterSegment?: string | null; actionableInsight?: string;
      alerts?: string[];
    } | null;
  } | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  async function handleAnalyzeSurvey() {
    if (!artifactId || analyzing) return;
    setAnalyzing(true); setAnalyzeError(null); setAnalysisResult(null);
    try {
      const res = await fetch('/api/survey/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyId: artifactId }),
      });
      const r = await res.json();
      if (res.ok) setAnalysisResult(r);
      else setAnalyzeError(r.error ?? 'Analysis failed');
    } catch { setAnalyzeError('Network error'); }
    finally { setAnalyzing(false); }
  }

  // Churn prediction state
  const [showChurnPanel, setShowChurnPanel]     = useState(false);
  const [churnManualData, setChurnManualData]   = useState("");
  const [analyzingChurn, setAnalyzingChurn]     = useState(false);
  const [churnResult, setChurnResult]           = useState<{
    churnScore?: number; riskLevel?: string;
    atRiskSegments?: { segment: string; signal: string; size: string }[];
    churnPredictors?: { predictor: string; severity: string; evidence: string }[];
    savePlaybook?: { action: string; timing: string; target: string; expectedImpact: string }[];
    immediateActions?: string[];
    earlyWarningMetrics?: string[];
    retentionInsight?: string;
  } | null>(null);
  const [churnError, setChurnError]             = useState<string | null>(null);

  async function handleAnalyzeChurn() {
    if (analyzingChurn) return;
    setAnalyzingChurn(true); setChurnError(null); setChurnResult(null);
    try {
      const res = await fetch('/api/agents/nova/churn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: artifactId || undefined,
          manualData: churnManualData.trim() || undefined,
        }),
      });
      const r = await res.json();
      if (res.ok && r.analysis) setChurnResult(r.analysis);
      else setChurnError(r.error ?? 'Analysis failed');
    } catch { setChurnError('Network error'); }
    finally { setAnalyzingChurn(false); }
  }

  // Cohort Analysis state
  const [showCohortPanel, setShowCohortPanel]     = useState(false);
  const [cohortSurveyId, setCohortSurveyId]       = useState("");
  const [cohortManualData, setCohortManualData]   = useState("");
  const [runningCohort, setRunningCohort]         = useState(false);
  const [cohortResult, setCohortResult]           = useState<{
    cohorts?: { name: string; size: string | number; nps: number | null; sentiment: string; keyCharacteristics: string[]; retentionSignal: string }[];
    bestCohort?: { description: string; whatWorksForThem: string; howToGetMore: string };
    worstCohort?: { description: string; rootCause: string; intervention: string };
    cohortTrend?: string;
    actionableFindings?: { finding: string; action: string; priority: string }[];
    productInsight?: string;
    bestFitProfile?: string;
  } | null>(null);
  const [cohortSummaries, setCohortSummaries]     = useState<{ week: string; count: number; avgNPS: number | null }[]>([]);
  const [cohortError, setCohortError]             = useState<string | null>(null);

  async function handleCohortAnalysis() {
    if (runningCohort) return;
    setRunningCohort(true); setCohortError(null); setCohortResult(null); setCohortSummaries([]);
    try {
      const res = await fetch('/api/agents/nova/cohort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: cohortSurveyId.trim() || undefined,
          manualResponses: cohortManualData.trim() || undefined,
        }),
      });
      const r = await res.json();
      if (res.ok && r.result) { setCohortResult(r.result); setCohortSummaries(r.cohortSummaries ?? []); }
      else setCohortError(r.error ?? 'Analysis failed');
    } catch { setCohortError('Network error'); }
    finally { setRunningCohort(false); }
  }

  // Feature request aggregation state
  const [showFeaturesPanel, setShowFeaturesPanel] = useState(false);
  const [featuresInput, setFeaturesInput]         = useState("");
  const [aggregatingFeatures, setAggregatingFeatures] = useState(false);
  const [featuresResult, setFeaturesResult]       = useState<{
    clusters?: { theme: string; category: string; frequency: number; requests: string[]; effort: string; impact: string; riceScore: number; priority: string; representativeQuote: string | null }[];
    totalFeedbackItems?: number;
    topInsight?: string;
    quickWins?: string[];
    strategicBets?: string[];
  } | null>(null);
  const [featuresError, setFeaturesError]         = useState<string | null>(null);

  async function handleAggregateFeatures() {
    if (aggregatingFeatures) return;
    setAggregatingFeatures(true); setFeaturesError(null); setFeaturesResult(null);
    try {
      const res = await fetch('/api/agents/nova/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          artifactId
            ? { surveyId: artifactId }
            : { manualFeedback: featuresInput }
        ),
      });
      const r = await res.json();
      if (res.ok && r.analysis) setFeaturesResult(r.analysis);
      else setFeaturesError(r.error ?? 'Aggregation failed');
    } catch { setFeaturesError('Network error'); }
    finally { setAggregatingFeatures(false); }
  }

  // Survey distribution state
  const [showDistributePanel, setShowDistributePanel] = useState(false);
  const [distributeEmails, setDistributeEmails]       = useState("");
  const [distributeSubject, setDistributeSubject]     = useState("");
  const [distributeMessage, setDistributeMessage]     = useState("");
  const [distributing, setDistributing]               = useState(false);
  const [distributeResult, setDistributeResult]       = useState<{ sent: number; failed: number; surveyUrl?: string; simulated?: boolean } | null>(null);
  const [distributeError, setDistributeError]         = useState<string | null>(null);

  // PMF Score state
  const [runningPMFScore, setRunningPMFScore]     = useState(false);
  const [pmfScoreResult, setPmfScoreResult]       = useState<{
    pmfScore?: number; grade?: string;
    dimensions?: { name: string; weight: number; score: number; status: string; insight: string }[];
    verdict?: string; topSignals?: string[]; risks?: string[]; nextStep?: string; trend?: string;
  } | null>(null);
  const [pmfScoreError, setPmfScoreError]         = useState<string | null>(null);

  async function handleRunPMFScore() {
    if (runningPMFScore) return;
    setRunningPMFScore(true); setPmfScoreError(null);
    try {
      const res = await fetch('/api/agents/nova/pmf-score', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.pmfScore != null) setPmfScoreResult(r);
      else setPmfScoreError(r.error ?? 'Failed to calculate PMF score');
    } catch { setPmfScoreError('Network error'); }
    finally { setRunningPMFScore(false); }
  }

  async function handleDistributeSurvey() {
    if (distributing) return;
    const emails = distributeEmails.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.includes('@') && e.includes('.'));
    if (!emails.length) { setDistributeError('No valid email addresses found'); return; }
    setDistributing(true); setDistributeError(null); setDistributeResult(null);
    try {
      const res = await fetch('/api/agents/nova/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails,
          subject: distributeSubject.trim() || undefined,
          customMessage: distributeMessage.trim() || undefined,
        }),
      });
      const r = await res.json();
      if (res.ok) setDistributeResult({ sent: r.sent, failed: r.failed, surveyUrl: r.surveyUrl, simulated: r.simulated });
      else setDistributeError(r.error ?? 'Failed to send');
    } catch { setDistributeError('Network error'); }
    finally { setDistributing(false); }
  }

  // Problem validation state
  const [showValidatePanel, setShowValidatePanel]           = useState(false);
  const [validateProblem, setValidateProblem]               = useState("");
  const [validateAudience, setValidateAudience]             = useState("");
  const [validating, setValidating]                         = useState(false);
  const [validateResult, setValidateResult]                 = useState<{
    validationSignal?: string; painLevel?: number;
    quotes?: { text: string; source: string; url?: string }[];
    themes?: string[]; earlyAdopterSignals?: string[];
    competitorMentions?: string[];
    messagingInsights?: string[]; nextSteps?: string[];
  } | null>(null);
  const [validateError, setValidateError]                   = useState<string | null>(null);

  async function handleValidateProblem() {
    if (validating || !validateProblem.trim()) return;
    setValidating(true); setValidateError(null); setValidateResult(null);
    try {
      const res = await fetch('/api/agents/nova/validate-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemStatement: validateProblem, targetAudience: validateAudience.trim() || undefined }),
      });
      const r = await res.json();
      if (res.ok) { setValidateResult(r.validation); setShowValidatePanel(true); }
      else setValidateError(r.error ?? 'Failed to validate');
    } catch { setValidateError('Network error'); }
    finally { setValidating(false); }
  }

  // Customer insight state
  const [runningInsight, setRunningInsight] = useState(false);
  const [insightReport, setInsightReport] = useState<{
    topThemes?: { theme: string; frequency: string; summary: string }[];
    painPoints?: { pain: string; severity: string; quote: string }[];
    delightMoments?: string[];
    churnRisks?: string[];
    retentionDrivers?: string[];
    productGaps?: string[];
    verbatims?: string[];
    segmentInsights?: { segment: string; insight: string; implication: string }[];
    recommendations?: { action: string; impact: string; effort: string; rationale: string }[];
    synthesisNote?: string;
  } | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [insightTab, setInsightTab] = useState<'themes' | 'pain' | 'recs'>('themes');

  async function handleRunInsight() {
    if (runningInsight) return;
    setRunningInsight(true); setInsightError(null);
    try {
      const res = await fetch('/api/agents/nova/customer-insight', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.report) setInsightReport(r.report);
      else setInsightError(r.error ?? 'Failed to generate customer insight report');
    } catch { setInsightError('Network error'); }
    finally { setRunningInsight(false); }
  }

  // User personas state
  const [generatingPersonas, setGeneratingPersonas] = useState(false);
  const [personasResult, setPersonasResult] = useState<{
    name?: string; avatar?: string; role?: string; demographics?: string;
    goals?: string[]; frustrations?: string[]; buyingTriggers?: string[];
    objections?: string[]; dayInLife?: string; quotableQuote?: string;
    channelsTheyUse?: string[]; willingness?: string; decisionProcess?: string;
  }[] | null>(null);
  const [personasError, setPersonasError] = useState<string | null>(null);
  const [activePersona, setActivePersona] = useState(0);

  async function handleGeneratePersonas() {
    if (generatingPersonas) return;
    setGeneratingPersonas(true); setPersonasError(null);
    try {
      const res = await fetch('/api/agents/nova/user-personas', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.personas) setPersonasResult(r.personas);
      else setPersonasError(r.error ?? 'Failed to generate user personas');
    } catch { setPersonasError('Network error'); }
    finally { setGeneratingPersonas(false); }
  }

  // Experiment Tracker state
  const [etHypothesis, setEtHypothesis]           = useState('');
  const [etMetric, setEtMetric]                   = useState('');
  const [generatingET, setGeneratingET]           = useState(false);
  const [etResult, setEtResult]                   = useState<Record<string, unknown> | null>(null);
  const [etError, setEtError]                     = useState<string | null>(null);

  async function handleRunExperiment() {
    if (!etHypothesis.trim() || generatingET) return;
    setGeneratingET(true); setEtError(null); setEtResult(null);
    try {
      const res = await fetch('/api/agents/nova/experiment-tracker', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hypothesis: etHypothesis, metric: etMetric || 'conversion rate' }),
      });
      const r = await res.json();
      if (res.ok && r.experiment) setEtResult(r.experiment);
      else setEtError(r.error ?? 'Failed to design experiment');
    } catch { setEtError('Network error'); }
    finally { setGeneratingET(false); }
  }

  // User Segmentation state
  const [generatingUserSeg, setGeneratingUserSeg]     = useState(false);
  const [userSegResult, setUserSegResult]             = useState<Record<string, unknown> | null>(null);
  const [userSegError, setUserSegError]               = useState<string | null>(null);
  const [userSegTab, setUserSegTab]                   = useState<'segments' | 'signals' | 'strategy' | 'monetization'>('segments');

  async function handleGenerateUserSegmentation() {
    if (generatingUserSeg) return;
    setGeneratingUserSeg(true); setUserSegError(null); setUserSegResult(null);
    try {
      const res = await fetch('/api/agents/nova/user-segmentation', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.segmentation) setUserSegResult(r.segmentation);
      else setUserSegError(r.error ?? 'Generation failed');
    } catch { setUserSegError('Network error'); }
    finally { setGeneratingUserSeg(false); }
  }

  // Feature Matrix state
  // Retention Analysis state
  // Engagement Loops state
  const [generatingEngLoops, setGeneratingEngLoops]   = useState(false);
  const [engLoopsResult, setEngLoopsResult]           = useState<Record<string, unknown> | null>(null);
  const [engLoopsError, setEngLoopsError]             = useState<string | null>(null);
  const [engLoopsTab, setEngLoopsTab]                 = useState<'coreloop' | 'loops' | 'triggers' | 'experiments'>('coreloop');

  async function handleGenerateEngagementLoops() {
    if (generatingEngLoops) return;
    setGeneratingEngLoops(true); setEngLoopsError(null); setEngLoopsResult(null);
    try {
      const res = await fetch('/api/agents/nova/engagement-loops', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.loops) setEngLoopsResult(r.loops);
      else setEngLoopsError(r.error ?? 'Generation failed');
    } catch { setEngLoopsError('Network error'); }
    finally { setGeneratingEngLoops(false); }
  }

  // Churn Analysis (deep) state
  const [generatingChurnAnalysis, setGeneratingChurnAnalysis] = useState(false);
  const [churnAnalysisResult, setChurnAnalysisResult]         = useState<Record<string, unknown> | null>(null);
  const [churnAnalysisError, setChurnAnalysisError]           = useState<string | null>(null);
  const [churnAnalysisTab, setChurnAnalysisTab]               = useState<'causes' | 'warnings' | 'playbook' | 'winback'>('causes');

  async function handleGenerateChurnAnalysis() {
    if (generatingChurnAnalysis) return;
    setGeneratingChurnAnalysis(true); setChurnAnalysisError(null); setChurnAnalysisResult(null);
    try {
      const res = await fetch('/api/agents/nova/churn-analysis', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.analysis) setChurnAnalysisResult(r.analysis);
      else setChurnAnalysisError(r.error ?? 'Generation failed');
    } catch { setChurnAnalysisError('Network error'); }
    finally { setGeneratingChurnAnalysis(false); }
  }

  // Onboarding Flow state
  const [generatingOnbFlow, setGeneratingOnbFlow]     = useState(false);
  const [onbFlowResult, setOnbFlowResult]             = useState<Record<string, unknown> | null>(null);
  const [onbFlowError, setOnbFlowError]               = useState<string | null>(null);
  const [onbFlowTab, setOnbFlowTab]                   = useState<'steps' | 'emails' | 'inapp' | 'failures'>('steps');

  async function handleGenerateOnboardingFlow() {
    if (generatingOnbFlow) return;
    setGeneratingOnbFlow(true); setOnbFlowError(null); setOnbFlowResult(null);
    try {
      const res = await fetch('/api/agents/nova/onboarding-flow', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.flow) setOnbFlowResult(r.flow);
      else setOnbFlowError(r.error ?? 'Generation failed');
    } catch { setOnbFlowError('Network error'); }
    finally { setGeneratingOnbFlow(false); }
  }

  // Growth Experiment state
  const [growthFocus, setGrowthFocus]                 = useState('acquisition');
  const [generatingGrowth, setGeneratingGrowth]       = useState(false);
  const [growthResult, setGrowthResult]               = useState<Record<string, unknown> | null>(null);
  const [growthError, setGrowthError]                 = useState<string | null>(null);
  const [growthExpIdx, setGrowthExpIdx]               = useState(0);

  async function handleGenerateGrowthExperiments() {
    if (generatingGrowth) return;
    setGeneratingGrowth(true); setGrowthError(null); setGrowthResult(null);
    try {
      const res = await fetch('/api/agents/nova/growth-experiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focus: growthFocus }),
      });
      const r = await res.json();
      if (res.ok && r.experiments) setGrowthResult(r.experiments);
      else setGrowthError(r.error ?? 'Generation failed');
    } catch { setGrowthError('Network error'); }
    finally { setGeneratingGrowth(false); }
  }

  // Activation Funnel state
  const [generatingFunnel, setGeneratingFunnel]       = useState(false);
  const [funnelResult, setFunnelResult]               = useState<Record<string, unknown> | null>(null);
  const [funnelError, setFunnelError]                 = useState<string | null>(null);
  const [funnelStageIdx, setFunnelStageIdx]           = useState(0);

  async function handleGenerateFunnel() {
    if (generatingFunnel) return;
    setGeneratingFunnel(true); setFunnelError(null); setFunnelResult(null);
    try {
      const res = await fetch('/api/agents/nova/activation-funnel', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.funnel) setFunnelResult(r.funnel);
      else setFunnelError(r.error ?? 'Analysis failed');
    } catch { setFunnelError('Network error'); }
    finally { setGeneratingFunnel(false); }
  }

  const [generatingRetention, setGeneratingRetention] = useState(false);
  const [retentionResult, setRetentionResult]         = useState<Record<string, unknown> | null>(null);
  const [retentionError, setRetentionError]           = useState<string | null>(null);
  const [retentionTab, setRetentionTab]               = useState<'cohorts' | 'churn' | 'actions' | 'experiments'>('cohorts');

  async function handleGenerateRetention() {
    if (generatingRetention) return;
    setGeneratingRetention(true); setRetentionError(null); setRetentionResult(null);
    try {
      const res = await fetch('/api/agents/nova/retention-analysis', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.retention) setRetentionResult(r.retention);
      else setRetentionError(r.error ?? 'Analysis failed');
    } catch { setRetentionError('Network error'); }
    finally { setGeneratingRetention(false); }
  }

  const [generatingFM, setGeneratingFM]           = useState(false);
  const [fmResult, setFmResult]                   = useState<Record<string, unknown> | null>(null);
  const [fmError, setFmError]                     = useState<string | null>(null);
  const [fmSort, setFmSort]                       = useState<'rice' | 'impact' | 'effort'>('rice');

  async function handleGenerateFeatureMatrix() {
    if (generatingFM) return;
    setGeneratingFM(true); setFmError(null); setFmResult(null);
    try {
      const res = await fetch('/api/agents/nova/feature-matrix', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.matrix) setFmResult(r.matrix);
      else setFmError(r.error ?? 'Failed to generate feature matrix');
    } catch { setFmError('Network error'); }
    finally { setGeneratingFM(false); }
  }

  // Interview scheduler state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleContacts, setScheduleContacts]   = useState("");
  const [scheduleCalendly, setScheduleCalendly]   = useState("");
  const [scheduling, setScheduling]               = useState(false);
  const [scheduleResult, setScheduleResult]       = useState<{ sent: number; failed: number } | null>(null);
  const [scheduleError, setScheduleError]         = useState<string | null>(null);

  function parseScheduleContacts(text: string) {
    return text.split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split(',').map(p => p.trim());
        return { name: parts[0] || '', email: parts[1] || parts[0] || '', company: parts[2] || undefined };
      })
      .filter(c => c.email.includes('@'));
  }

  async function handleScheduleInterviews() {
    if (scheduling) return;
    const contacts = parseScheduleContacts(scheduleContacts);
    if (!contacts.length) { setScheduleError('No valid contacts found'); return; }
    setScheduling(true); setScheduleError(null); setScheduleResult(null);
    try {
      const res = await fetch('/api/agents/nova/interview-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts,
          calendlyUrl: scheduleCalendly.trim() || undefined,
          artifactId,
        }),
      });
      const result = await res.json();
      if (res.ok) setScheduleResult({ sent: result.sent, failed: result.failed });
      else setScheduleError(result.error ?? 'Failed to send');
    } catch { setScheduleError('Network error'); }
    finally { setScheduling(false); }
  }

  const surveyLink = artifactId && userId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${artifactId}?uid=${userId}` : null;

  useEffect(() => {
    if (!artifactId) return;
    fetch(`/api/survey/results?surveyId=${artifactId}`)
      .then(r => r.json())
      .then(d => {
        if (d.total !== undefined) setSurveyStats({
          total: d.total,
          pmfScore: d.pmfScore,
          distribution: d.distribution,
          textAnswers: d.textAnswers,
        });
      })
      .catch(() => {});
  }, [artifactId]);

  const sectionHead: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, marginBottom: 10 };
  const painColor: Record<string, string> = { high: red, medium: amber, low: green };
  const purple = "#7C3AED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Survey share bar ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: surveyStats ? 10 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Share this survey</p>
            <p style={{ fontSize: 11, color: muted }}>Send to customers — responses tracked in real-time.</p>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {surveyLink && artifactId && (
              <button onClick={() => setShowDistributePanel(p => !p)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                📧 Send via Email
              </button>
            )}
            {surveyLink ? (
              <button onClick={() => { navigator.clipboard.writeText(surveyLink).catch(() => {}); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: linkCopied ? green : ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                {linkCopied ? "Copied!" : "Copy Link"}
              </button>
            ) : (
              <span style={{ fontSize: 11, color: muted }}>Generate this artifact first</span>
            )}
          </div>
        </div>

        {/* Distribution panel */}
        {showDistributePanel && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${bdr}`, display: "flex", flexDirection: "column", gap: 8 }}>
            {distributeResult ? (
              <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", border: "1px solid #BBF7D0" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: green, marginBottom: 2 }}>✓ Survey sent to {distributeResult.sent} customer{distributeResult.sent !== 1 ? "s" : ""}!</p>
                {distributeResult.failed > 0 && <p style={{ fontSize: 11, color: muted }}>{distributeResult.failed} failed to send</p>}
                <button onClick={() => { setDistributeResult(null); setDistributeEmails(""); }} style={{ marginTop: 6, padding: "4px 12px", borderRadius: 6, border: "none", background: green, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Send more</button>
              </div>
            ) : (
              <>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>Customer emails (one per line or comma-separated)</label>
                  <textarea
                    value={distributeEmails}
                    onChange={e => setDistributeEmails(e.target.value)}
                    placeholder={"alice@company.com\nbob@startup.io, carol@acme.com"}
                    rows={3}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid #DDD6FE`, background: bg, fontSize: 12, color: ink, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>Custom message (optional)</label>
                  <input
                    value={distributeMessage}
                    onChange={e => setDistributeMessage(e.target.value)}
                    placeholder="We'd love your feedback — it helps us improve..."
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid #DDD6FE`, background: bg, fontSize: 12, color: ink, boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                </div>
                {distributeError && <p style={{ fontSize: 11, color: red }}>{distributeError}</p>}
                <button onClick={handleDistributeSurvey} disabled={distributing || !distributeEmails.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: distributing || !distributeEmails.trim() ? bdr : purple, color: distributing || !distributeEmails.trim() ? muted : "#fff", fontSize: 12, fontWeight: 700, cursor: distributing ? "not-allowed" : "pointer" }}>
                  {distributing ? "Sending…" : "Send Survey Invites"}
                </button>
              </>
            )}
          </div>
        )}

        {surveyStats && (
          <div style={{ paddingTop: 8, borderTop: `1px solid #DDD6FE` }}>
            <div style={{ display: "flex", gap: 16, marginBottom: surveyStats.distribution ? 12 : 0 }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: purple }}>{surveyStats.total}</p>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Responses</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: surveyStats.pmfScore >= 40 ? green : surveyStats.pmfScore >= 25 ? amber : red }}>{Math.round(surveyStats.pmfScore)}%</p>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>PMF Score</p>
              </div>
              {surveyStats.pmfScore >= 40 && <div style={{ display: "flex", alignItems: "center", padding: "4px 10px", background: "#F0FDF4", border: `1px solid #BBF7D0`, borderRadius: 999 }}><p style={{ fontSize: 11, fontWeight: 700, color: green }}>✓ Above PMF threshold</p></div>}
              {surveyStats.total > 0 && (
                <button onClick={() => setShowResponses(p => !p)} style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 7, border: `1px solid #DDD6FE`, background: "transparent", fontSize: 11, fontWeight: 600, color: purple, cursor: "pointer" }}>
                  {showResponses ? "Hide breakdown" : "View breakdown"}
                </button>
              )}
            </div>
            {showResponses && surveyStats.distribution && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {([
                  { key: "very_disappointed",     label: "Very disappointed",     color: green },
                  { key: "somewhat_disappointed", label: "Somewhat disappointed", color: amber },
                  { key: "not_disappointed",      label: "Not disappointed",      color: red   },
                ] as { key: keyof typeof surveyStats.distribution; label: string; color: string }[]).map(row => {
                  const count = surveyStats.distribution![row.key] ?? 0;
                  const pct   = surveyStats.total > 0 ? Math.round((count / surveyStats.total) * 100) : 0;
                  return (
                    <div key={row.key}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: ink }}>{row.label}</p>
                        <p style={{ fontSize: 11, fontWeight: 700, color: row.color }}>{count} ({pct}%)</p>
                      </div>
                      <div style={{ height: 6, background: "#E9D5FF", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: row.color, borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })}
                {surveyStats.textAnswers && surveyStats.textAnswers.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Open-ended Responses</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {surveyStats.textAnswers.slice(0, 6).map((a, i) => (
                        <div key={i} style={{ background: "#F5F3FF", borderRadius: 8, padding: "8px 12px" }}>
                          <p style={{ fontSize: 10, fontWeight: 600, color: purple, marginBottom: 3, textTransform: "capitalize" }}>{a.qid.replace(/_/g, ' ')}</p>
                          <p style={{ fontSize: 12, color: ink, lineHeight: 1.5, fontStyle: "italic" }}>&quot;{a.text}&quot;</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {/* ── AI Response Analysis ── */}
      {artifactId && (
        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: analysisResult ? 14 : 0 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>AI Response Analysis</p>
              <p style={{ fontSize: 11, color: muted }}>Nova analyzes all survey responses — themes, PMF signal, top quotes, and what to do next.</p>
              {analyzeError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{analyzeError}</p>}
            </div>
            <button onClick={handleAnalyzeSurvey} disabled={analyzing} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: analyzing ? bdr : ink, color: analyzing ? muted : bg, fontSize: 12, fontWeight: 600, cursor: analyzing ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              {analyzing ? "Analyzing…" : analysisResult ? "Re-analyze" : "Analyze Responses"}
            </button>
          </div>
          {analysisResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Header stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: `1px solid #DDD6FE`, textAlign: "center" }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: "#7C3AED" }}>{analysisResult.totalCount ?? 0}</p>
                  <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total</p>
                </div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: `1px solid #DDD6FE`, textAlign: "center" }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: (analysisResult.newCount ?? 0) > 0 ? green : muted }}>{analysisResult.newCount ?? 0}</p>
                  <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>New (24h)</p>
                </div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: `1px solid #DDD6FE`, textAlign: "center" }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: (analysisResult.pmfScore ?? 0) >= 40 ? green : (analysisResult.pmfScore ?? 0) >= 25 ? amber : red }}>{analysisResult.pmfScore ?? 0}%</p>
                  <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>PMF Score</p>
                </div>
              </div>
              {analysisResult.analysis && (
                <>
                  {/* Signal + trend */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ background: "#EDE9FE", borderRadius: 8, padding: "10px 12px" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#7C3AED", marginBottom: 3 }}>PMF Signal</p>
                      <p style={{ fontSize: 14, fontWeight: 800, color: "#7C3AED", textTransform: "capitalize" }}>{analysisResult.analysis.pmfSignal ?? "—"}</p>
                    </div>
                    {analysisResult.analysis.trendNote && (
                      <div style={{ background: surf, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}` }}>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: muted, marginBottom: 3 }}>Trend</p>
                        <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{analysisResult.analysis.trendNote}</p>
                      </div>
                    )}
                  </div>
                  {/* Top themes */}
                  {analysisResult.analysis.topThemes && analysisResult.analysis.topThemes.length > 0 && (
                    <div style={{ background: "#fff", borderRadius: 8, padding: "12px 14px", border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: muted, marginBottom: 8 }}>Top Themes</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {analysisResult.analysis.topThemes.map((t, ti) => <span key={ti} style={{ fontSize: 12, background: "#F5F3FF", color: "#7C3AED", padding: "3px 10px", borderRadius: 999 }}>{t}</span>)}
                      </div>
                    </div>
                  )}
                  {/* Top quote */}
                  {analysisResult.analysis.topQuote && (
                    <div style={{ background: "#F5F3FF", borderRadius: 8, padding: "12px 14px", border: `1px solid #DDD6FE` }}>
                      <p style={{ fontSize: 12, color: ink, fontStyle: "italic", lineHeight: 1.7 }}>&quot;{analysisResult.analysis.topQuote}&quot;</p>
                    </div>
                  )}
                  {/* Action + alerts */}
                  {analysisResult.analysis.actionableInsight && (
                    <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: `1px solid #BFDBFE` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: blue, marginBottom: 4 }}>What to Do</p>
                      <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{analysisResult.analysis.actionableInsight}</p>
                    </div>
                  )}
                  {analysisResult.analysis.alerts && analysisResult.analysis.alerts.length > 0 && (
                    <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 14px", border: `1px solid #FECACA` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: red, marginBottom: 6 }}>Alerts</p>
                      {analysisResult.analysis.alerts.map((a, ai) => <p key={ai} style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>⚠ {a}</p>)}
                    </div>
                  )}
                </>
              )}
              {(analysisResult.totalCount ?? 0) < 3 && (
                <p style={{ fontSize: 11, color: muted, fontStyle: "italic" }}>Need at least 3 responses for AI theme analysis. Keep sharing your survey!</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Feature Request Aggregation ── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showFeaturesPanel ? 12 : 0 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Feature Request Aggregation</p>
            <p style={{ fontSize: 11, color: muted }}>{artifactId ? "Pull themes from your survey open-text responses — RICE scored and ranked." : "Paste customer feedback — Nova clusters into themes and ranks by impact."}</p>
          </div>
          <button onClick={() => { setShowFeaturesPanel(v => !v); setFeaturesResult(null); setFeaturesError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            {showFeaturesPanel ? "Close" : "Aggregate"}
          </button>
        </div>
        {showFeaturesPanel && !featuresResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {!artifactId && (
              <>
                <p style={{ fontSize: 11, color: muted }}>Paste customer feedback, support tickets, or interview notes — one item per line.</p>
                <textarea
                  value={featuresInput}
                  onChange={e => setFeaturesInput(e.target.value)}
                  placeholder={"I wish it had a Zapier integration\nThe export to CSV is broken and I need it for reporting\nWould love dark mode\nCan you add a bulk edit feature? Super annoying to do one by one\nIntegration with Slack would be huge for our team\nNeed better mobile app"}
                  rows={6}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </>
            )}
            {artifactId && <p style={{ fontSize: 12, color: muted }}>Will analyze open-text responses from your live survey ({(surveyStats?.total ?? 0)} responses).</p>}
            {featuresError && <p style={{ fontSize: 12, color: red }}>{featuresError}</p>}
            <button onClick={handleAggregateFeatures} disabled={aggregatingFeatures || (!artifactId && !featuresInput.trim())} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: aggregatingFeatures ? bdr : ink, color: aggregatingFeatures ? muted : bg, fontSize: 13, fontWeight: 600, cursor: aggregatingFeatures ? "not-allowed" : "pointer", alignSelf: "flex-start" }}>
              {aggregatingFeatures ? "Clustering…" : "Find Feature Themes"}
            </button>
          </div>
        )}
        {featuresResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Top insight */}
            {featuresResult.topInsight && (
              <div style={{ background: "#EDE9FE", borderRadius: 8, padding: "10px 14px" }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#7C3AED", marginBottom: 4 }}>Top Insight</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: ink, lineHeight: 1.6 }}>{featuresResult.topInsight}</p>
              </div>
            )}
            {/* Quick wins + strategic bets */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {featuresResult.quickWins && featuresResult.quickWins.length > 0 && (
                <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", border: "1px solid #BBF7D0" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 6 }}>⚡ Quick Wins</p>
                  {featuresResult.quickWins.map((w, wi) => <p key={wi} style={{ fontSize: 11, color: ink, lineHeight: 1.6 }}>• {w}</p>)}
                </div>
              )}
              {featuresResult.strategicBets && featuresResult.strategicBets.length > 0 && (
                <div style={{ background: "#FFFBEB", borderRadius: 8, padding: "10px 12px", border: "1px solid #FDE68A" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: amber, marginBottom: 6 }}>🎯 Strategic Bets</p>
                  {featuresResult.strategicBets.map((b, bi) => <p key={bi} style={{ fontSize: 11, color: ink, lineHeight: 1.6 }}>• {b}</p>)}
                </div>
              )}
            </div>
            {/* Clusters */}
            {featuresResult.clusters && featuresResult.clusters.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 8 }}>Feature Clusters (sorted by RICE score)</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {featuresResult.clusters
                    .sort((a, b) => (b.riceScore ?? 0) - (a.riceScore ?? 0))
                    .map((cluster, ci) => {
                      const prioColor = cluster.priority === "must_have" ? red : cluster.priority === "should_have" ? amber : cluster.priority === "nice_to_have" ? blue : muted;
                      const prioLabel = cluster.priority === "must_have" ? "Must Have" : cluster.priority === "should_have" ? "Should Have" : cluster.priority === "nice_to_have" ? "Nice to Have" : "Later";
                      return (
                        <div key={ci} style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", border: `1px solid ${cluster.priority === "must_have" ? "#FECACA" : bdr}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{cluster.theme}</p>
                              <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: prioColor + "1A", color: prioColor, fontWeight: 600 }}>{prioLabel}</span>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 10, color: muted }}>{cluster.frequency}× mentioned</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED" }}>RICE {cluster.riceScore}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                            <span style={{ fontSize: 10, color: muted }}>Effort: <strong style={{ color: ink }}>{cluster.effort}</strong></span>
                            <span style={{ fontSize: 10, color: muted }}>Impact: <strong style={{ color: ink }}>{cluster.impact}</strong></span>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: cluster.representativeQuote ? 8 : 0 }}>
                            {cluster.requests.map((req, ri) => (
                              <span key={ri} style={{ fontSize: 11, background: surf, padding: "3px 8px", borderRadius: 4, color: muted }}>{req}</span>
                            ))}
                          </div>
                          {cluster.representativeQuote && (
                            <p style={{ fontSize: 11, color: muted, fontStyle: "italic", lineHeight: 1.5, borderTop: `1px solid ${bdr}`, paddingTop: 8 }}>&ldquo;{cluster.representativeQuote}&rdquo;</p>
                          )}
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            )}
            <button onClick={() => { setFeaturesResult(null); setFeaturesInput(""); }} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>
              ← Analyze Different Feedback
            </button>
          </div>
        )}
      </div>

      {/* ── Customer Interview Scheduler ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          {scheduleResult ? (
            <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>
              Nova sent {scheduleResult.sent} interview invite{scheduleResult.sent !== 1 ? 's' : ''}
              {scheduleResult.failed > 0 ? ` · ${scheduleResult.failed} failed` : ' ✓'}
            </p>
          ) : (
            <>
              <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Schedule Customer Interviews</p>
              <p style={{ fontSize: 11, color: muted }}>Upload a contact list — Nova sends personalised 20-min interview invites with your Calendly link.</p>
            </>
          )}
        </div>
        <button
          onClick={() => { setShowScheduleModal(true); setScheduleResult(null); setScheduleError(null); }}
          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          {scheduleResult ? "Send More" : "Schedule Interviews"}
        </button>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget && !scheduling) setShowScheduleModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Schedule Customer Interviews</p>
              <button onClick={() => setShowScheduleModal(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: muted }}>✕</button>
            </div>
            {scheduleResult ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 28, marginBottom: 10 }}>✉️</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: green, marginBottom: 6 }}>{scheduleResult.sent} invite{scheduleResult.sent !== 1 ? 's' : ''} sent!</p>
                {scheduleResult.failed > 0 && <p style={{ fontSize: 12, color: amber, marginBottom: 10 }}>{scheduleResult.failed} failed to send.</p>}
                <button onClick={() => setShowScheduleModal(false)} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: ink, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 12 }}>Done</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>
                    Contact List * <span style={{ fontWeight: 400 }}>(CSV: name, email, company)</span>
                  </label>
                  <textarea
                    value={scheduleContacts}
                    onChange={e => setScheduleContacts(e.target.value)}
                    placeholder={"Alex Johnson, alex@acme.com, Acme Corp\nSarah Park, sarah@techflow.io, TechFlow\n..."}
                    rows={6}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "vertical", boxSizing: "border-box", fontFamily: "monospace" }}
                  />
                  {scheduleContacts.trim() && (
                    <p style={{ fontSize: 11, color: green, marginTop: 4 }}>
                      {parseScheduleContacts(scheduleContacts).length} contact{parseScheduleContacts(scheduleContacts).length !== 1 ? 's' : ''} detected
                    </p>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Calendly URL <span style={{ fontWeight: 400 }}>(optional — pulled from your profile if set)</span></label>
                  <input
                    value={scheduleCalendly}
                    onChange={e => setScheduleCalendly(e.target.value)}
                    placeholder="https://calendly.com/yourname/20min"
                    type="url"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }}
                  />
                </div>
                {scheduleError && <p style={{ fontSize: 12, color: red }}>{scheduleError}</p>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                  <button onClick={() => setShowScheduleModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button
                    onClick={handleScheduleInterviews}
                    disabled={scheduling || !scheduleContacts.trim()}
                    style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: scheduling ? bdr : green, color: scheduling ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: scheduling ? "not-allowed" : "pointer" }}
                  >
                    {scheduling ? `Sending…` : `Send ${parseScheduleContacts(scheduleContacts).length || ''} Invites`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {d.targetSegment && (
        <div style={{ background: surf, borderRadius: 10, padding: "12px 16px", border: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Target Segment</p>
          <p style={{ fontSize: 13, color: ink }}>{d.targetSegment}</p>
        </div>
      )}

      {d.ellisTest && (
        <div style={{ background: "#F5F3FF", borderRadius: 10, padding: "14px 16px", border: `1px solid #DDD6FE` }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", marginBottom: 8 }}>Sean Ellis PMF Test</p>
          {d.ellisTest.primaryQuestion && <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 8 }}>&quot;{d.ellisTest.primaryQuestion}&quot;</p>}
          {d.ellisTest.benchmark && <p style={{ fontSize: 11, color: "#7C3AED", fontWeight: 600 }}>→ {d.ellisTest.benchmark}</p>}
        </div>
      )}

      {d.interviewScript && d.interviewScript.length > 0 && (
        <div>
          <p style={sectionHead}>Interview Script</p>
          {d.interviewScript.map((phase, i) => (
            <div key={i} style={{ background: surf, borderRadius: 8, border: `1px solid ${bdr}`, marginBottom: 8, overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", background: "#F0EDE6", borderBottom: `1px solid ${bdr}`, display: "flex", justifyContent: "space-between" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{phase.phase}</p>
                <p style={{ fontSize: 11, color: muted }}>{phase.duration}</p>
              </div>
              <div style={{ padding: "10px 14px" }}>
                {phase.questions.map((q, qi) => (
                  <p key={qi} style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingLeft: 8, marginBottom: 4, borderLeft: `2px solid ${bdr}` }}>{q}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {d.experiments && d.experiments.length > 0 && (
        <div>
          <p style={sectionHead}>Experiments to Run</p>
          {d.experiments.map((exp, i) => (
            <div key={i} style={{ background: "#F0FDF4", borderRadius: 8, border: `1px solid #BBF7D0`, padding: "12px 14px", marginBottom: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: green, marginBottom: 6 }}>Hypothesis: {exp.hypothesis}</p>
              <p style={{ fontSize: 11, color: ink, marginBottom: 3 }}>Test: {exp.test}</p>
              <p style={{ fontSize: 11, color: ink, marginBottom: 3 }}>Metric: {exp.metric}</p>
              <p style={{ fontSize: 11, color: ink, marginBottom: exp.timeframe ? 3 : 0 }}>Success: {exp.successCriteria}</p>
              {exp.timeframe && <p style={{ fontSize: 11, color: muted }}>Timeframe: {exp.timeframe}</p>}
            </div>
          ))}
        </div>
      )}

      {d.segmentAnalysis && d.segmentAnalysis.length > 0 && (
        <div>
          <p style={sectionHead}>Segment Priorities</p>
          {d.segmentAnalysis.sort((a, b) => a.priority - b.priority).map((seg, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: ink }}>{seg.priority}</p>
              </div>
              <div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{seg.segment}</p>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: painColor[seg.painLevel] || muted }}>{seg.painLevel} pain</span>
                </div>
                <p style={{ fontSize: 11, color: muted }}>{seg.willingness}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Download survey HTML ────────────────────────────────────────── */}
      {(d.ellisTest || (d.interviewScript && d.interviewScript.length > 0)) && (
        <div style={{ background: surf, borderRadius: 12, padding: "14px 16px", border: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 4 }}>Deploy this survey to real customers</p>
          <p style={{ fontSize: 11, color: muted, marginBottom: 12 }}>Download a standalone HTML survey — host on Netlify Drop, Carrd, or email as a file.</p>
          <button
            onClick={() => {
              const questions: string[] = [];
              if (d.ellisTest?.primaryQuestion) questions.push(d.ellisTest.primaryQuestion);
              if (d.ellisTest?.followUps) questions.push(...d.ellisTest.followUps);
              // flatten interview script questions
              d.interviewScript?.forEach(phase => {
                phase.questions.forEach(q => questions.push(q));
              });

              const options = d.ellisTest?.options ?? ["Very disappointed", "Somewhat disappointed", "Not disappointed"];
              const optionHtml = options.map((o) => `
                <label class="option-label">
                  <input type="radio" name="q0" value="${o}" required />
                  <span>${o}</span>
                </label>`).join("");

              const followUpHtml = (d.ellisTest?.followUps ?? []).map((q, i) => `
                <div class="field">
                  <label>${q}</label>
                  <textarea name="fu${i}" rows="3" placeholder="Your answer…"></textarea>
                </div>`).join("");

              const surveyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PMF Survey</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F9F7F2; color: #18160F; padding: 40px 20px; }
    .card { max-width: 620px; margin: 0 auto; background: #fff; border: 1px solid #E2DDD5; border-radius: 20px; padding: 40px; }
    h1 { font-size: 24px; font-weight: 300; margin-bottom: 8px; }
    .sub { font-size: 14px; color: #8A867C; margin-bottom: 32px; }
    .field { margin-bottom: 24px; }
    label { display: block; font-size: 14px; font-weight: 600; color: #18160F; margin-bottom: 10px; }
    .option-label { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid #E2DDD5; border-radius: 8px; margin-bottom: 6px; cursor: pointer; font-size: 14px; font-weight: 400; transition: background .12s; }
    .option-label:hover { background: #F0EDE6; }
    .option-label input { width: 16px; height: 16px; flex-shrink: 0; }
    textarea { width: 100%; padding: 12px; border: 1px solid #E2DDD5; border-radius: 8px; font-family: inherit; font-size: 14px; color: #18160F; resize: vertical; min-height: 80px; }
    textarea:focus { outline: none; border-color: #7C3AED; }
    .divider { border: none; border-top: 1px solid #E2DDD5; margin: 28px 0; }
    .submit { width: 100%; padding: 14px; background: #18160F; color: #F9F7F2; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 8px; }
    .submit:hover { opacity: .85; }
    .thank-you { display: none; text-align: center; padding: 40px 0; }
    .thank-you h2 { font-size: 22px; font-weight: 300; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="card" id="form-card">
    <h1>Quick survey</h1>
    <p class="sub">Takes 2 minutes. Your feedback shapes the product.</p>
    <form id="survey-form" onsubmit="handleSubmit(event)">
      <div class="field">
        <label>${d.ellisTest?.primaryQuestion ?? "How would you feel if you could no longer use this product?"}</label>
        ${optionHtml}
      </div>
      <hr class="divider" />
      ${followUpHtml}
      <button type="submit" class="submit">Submit →</button>
    </form>
  </div>
  <div class="thank-you" id="thank-you">
    <h2>Thank you! 🙌</h2>
    <p style="color:#8A867C; font-size:15px">Your response has been recorded.</p>
  </div>
  <script>
    function handleSubmit(e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const stored = JSON.parse(localStorage.getItem('pmf_responses') || '[]');
      stored.push({ ...data, ts: new Date().toISOString() });
      localStorage.setItem('pmf_responses', JSON.stringify(stored));
      document.getElementById('form-card').style.display = 'none';
      document.getElementById('thank-you').style.display = 'block';
    }
  </script>
</body>
</html>`;
              const blob = new Blob([surveyHtml], { type: "text/html;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "pmf_survey.html"; a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 8, border: "none",
              background: "#7C3AED", color: "#fff", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <Download size={12} />
            Download Survey HTML
          </button>
        </div>
      )}

      {/* ── Problem Validation CTA ────────────────────────────────────────────── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: showValidatePanel ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Validate Your Problem</p>
            <p style={{ fontSize: 11, color: muted }}>Scans Reddit, HN, Quora & IndieHackers for real complaints matching your problem — confirm demand before you build.</p>
            {validateError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{validateError}</p>}
          </div>
          <button onClick={() => setShowValidatePanel(p => !p)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            {showValidatePanel ? "Hide" : "Validate Problem"}
          </button>
        </div>
        {showValidatePanel && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {!validateResult ? (
              <>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Problem Statement *</label>
                  <textarea value={validateProblem} onChange={e => setValidateProblem(e.target.value)} placeholder="e.g. Founders waste hours formatting pitch decks manually instead of building" rows={3} style={{ width: "100%", border: `1px solid ${bdr}`, borderRadius: 8, padding: "9px 12px", fontSize: 12, color: ink, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Target Audience (optional)</label>
                  <input value={validateAudience} onChange={e => setValidateAudience(e.target.value)} placeholder="e.g. early-stage B2B SaaS founders" style={{ width: "100%", border: `1px solid ${bdr}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: ink, outline: "none", boxSizing: "border-box" }} />
                </div>
                <button onClick={handleValidateProblem} disabled={validating || !validateProblem.trim()} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: validating ? bdr : amber, color: validating ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: validating || !validateProblem.trim() ? "not-allowed" : "pointer", alignSelf: "flex-start" }}>
                  {validating ? "Scanning…" : "Run Validation"}
                </button>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Signal + pain level */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ background: validateResult.validationSignal === "strong" ? "#F0FDF4" : validateResult.validationSignal === "moderate" ? "#FFFBEB" : "#FEF2F2", borderRadius: 8, padding: "12px 14px", border: `1px solid ${validateResult.validationSignal === "strong" ? "#BBF7D0" : validateResult.validationSignal === "moderate" ? "#FDE68A" : "#FECACA"}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: muted, marginBottom: 4 }}>Validation Signal</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: validateResult.validationSignal === "strong" ? green : validateResult.validationSignal === "moderate" ? amber : red, textTransform: "capitalize" }}>{validateResult.validationSignal ?? "—"}</p>
                  </div>
                  <div style={{ background: surf, borderRadius: 8, padding: "12px 14px", border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: muted, marginBottom: 4 }}>Pain Level</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: (validateResult.painLevel ?? 0) >= 7 ? red : (validateResult.painLevel ?? 0) >= 5 ? amber : green }}>{validateResult.painLevel ?? "—"}<span style={{ fontSize: 11, color: muted, fontWeight: 400 }}>/10</span></p>
                  </div>
                </div>
                {/* Quotes */}
                {validateResult.quotes && validateResult.quotes.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: muted, letterSpacing: "0.1em", marginBottom: 8 }}>Real Complaints Found</p>
                    {validateResult.quotes.slice(0, 4).map((q, qi) => (
                      <div key={qi} style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
                        <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, fontStyle: "italic", marginBottom: 4 }}>&quot;{q.text}&quot;</p>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: muted }}>{q.source}</span>
                          {q.url && <a href={q.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: blue, textDecoration: "underline" }}>View →</a>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Themes + early adopter signals */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {validateResult.themes && validateResult.themes.length > 0 && (
                    <div style={{ background: surf, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: muted, marginBottom: 6 }}>Themes</p>
                      {validateResult.themes.map((t, ti) => <p key={ti} style={{ fontSize: 11, color: ink, lineHeight: 1.6 }}>• {t}</p>)}
                    </div>
                  )}
                  {validateResult.earlyAdopterSignals && validateResult.earlyAdopterSignals.length > 0 && (
                    <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", border: `1px solid #BBF7D0` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: green, marginBottom: 6 }}>Early Adopter Signals</p>
                      {validateResult.earlyAdopterSignals.map((s, si) => <p key={si} style={{ fontSize: 11, color: ink, lineHeight: 1.6 }}>• {s}</p>)}
                    </div>
                  )}
                </div>
                {/* Messaging insights */}
                {validateResult.messagingInsights && validateResult.messagingInsights.length > 0 && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 12px", border: `1px solid #BFDBFE` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: blue, marginBottom: 6 }}>Messaging Insights</p>
                    {validateResult.messagingInsights.map((m, mi) => <p key={mi} style={{ fontSize: 11, color: ink, lineHeight: 1.6 }}>→ {m}</p>)}
                  </div>
                )}
                <button onClick={() => { setValidateResult(null); setValidateProblem(""); setValidateAudience(""); }} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>
                  ← New Validation
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Churn Prediction ─────────────────────────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>
              Churn Prediction Signals
              {churnResult?.riskLevel && <span style={{ marginLeft: 6, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: churnResult.riskLevel === "critical" ? "#FEF2F2" : churnResult.riskLevel === "high" ? "#FFFBEB" : "#F0FDF4", color: churnResult.riskLevel === "critical" ? red : churnResult.riskLevel === "high" ? amber : green, fontWeight: 700 }}>{churnResult.riskLevel.toUpperCase()}</span>}
            </p>
            <p style={{ fontSize: 11, color: muted }}>Identify at-risk customers before they churn. Connects with Stripe + survey data.</p>
          </div>
          <button onClick={() => { if (showChurnPanel && !analyzingChurn) { setShowChurnPanel(false); } else { setShowChurnPanel(true); if (!churnResult) handleAnalyzeChurn(); } }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: red, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            {showChurnPanel ? "Close" : "Analyze Risk"}
          </button>
        </div>
        {showChurnPanel && (
          <div style={{ marginTop: 14 }}>
            {analyzingChurn ? (
              <p style={{ fontSize: 12, color: muted, textAlign: "center", padding: "24px 0" }}>Analyzing churn signals…</p>
            ) : churnError ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 12, color: muted }}>{churnError}</p>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Paste customer feedback or usage notes</label>
                  <textarea value={churnManualData} onChange={e => setChurnManualData(e.target.value)} placeholder="Paste support tickets, customer complaints, usage drop observations, NPS comments..." rows={4} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <button onClick={handleAnalyzeChurn} disabled={!churnManualData.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: !churnManualData.trim() ? bdr : red, color: !churnManualData.trim() ? muted : "#fff", fontSize: 12, fontWeight: 700, cursor: !churnManualData.trim() ? "not-allowed" : "pointer", alignSelf: "flex-start" }}>
                  Analyze
                </button>
              </div>
            ) : churnResult ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Churn score gauge */}
                {churnResult.churnScore !== undefined && (
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", border: `4px solid ${(churnResult.churnScore ?? 0) >= 70 ? red : (churnResult.churnScore ?? 0) >= 40 ? amber : green}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <p style={{ fontSize: 18, fontWeight: 700, color: (churnResult.churnScore ?? 0) >= 70 ? red : (churnResult.churnScore ?? 0) >= 40 ? amber : green }}>{churnResult.churnScore}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: ink }}>Churn Risk Score</p>
                      <p style={{ fontSize: 12, color: muted }}>0 = low risk · 100 = critical</p>
                    </div>
                  </div>
                )}

                {/* Immediate actions */}
                {churnResult.immediateActions && churnResult.immediateActions.length > 0 && (
                  <div style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: red, marginBottom: 8 }}>Do This Now</p>
                    {churnResult.immediateActions.map((action, i) => (
                      <p key={i} style={{ fontSize: 12, color: ink, marginBottom: 4, lineHeight: 1.5 }}>• {action}</p>
                    ))}
                  </div>
                )}

                {/* Churn predictors */}
                {churnResult.churnPredictors && churnResult.churnPredictors.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: muted, marginBottom: 8 }}>Churn Predictors</p>
                    {churnResult.churnPredictors.map((p, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0", borderBottom: i < churnResult.churnPredictors!.length - 1 ? `1px solid ${bdr}` : "none" }}>
                        <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 999, background: p.severity === "high" ? "#FEF2F2" : p.severity === "medium" ? "#FFFBEB" : surf, color: p.severity === "high" ? red : p.severity === "medium" ? amber : muted, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{p.severity?.toUpperCase()}</span>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{p.predictor}</p>
                          <p style={{ fontSize: 11, color: muted }}>{p.evidence}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Save playbook */}
                {churnResult.savePlaybook && churnResult.savePlaybook.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: muted, marginBottom: 8 }}>Save Playbook</p>
                    {churnResult.savePlaybook.map((step, i) => (
                      <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}`, marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 999, background: step.timing === "immediate" ? "#FEF2F2" : step.timing === "this_week" ? "#FFFBEB" : bg, color: step.timing === "immediate" ? red : step.timing === "this_week" ? amber : muted, fontWeight: 700 }}>{step.timing?.toUpperCase().replace("_", " ")}</span>
                          <span style={{ fontSize: 10, color: muted }}>{step.target}</span>
                        </div>
                        <p style={{ fontSize: 12, color: ink, marginBottom: 2 }}>{step.action}</p>
                        <p style={{ fontSize: 11, color: green }}>{step.expectedImpact}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Early warning metrics */}
                {churnResult.earlyWarningMetrics && churnResult.earlyWarningMetrics.length > 0 && (
                  <div style={{ background: "#FFFBEB", borderRadius: 8, padding: "10px 14px", border: "1px solid #FDE68A" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: amber, marginBottom: 6 }}>Monitor Weekly</p>
                    {churnResult.earlyWarningMetrics.map((m, i) => (
                      <p key={i} style={{ fontSize: 12, color: ink, marginBottom: 3 }}>• {m}</p>
                    ))}
                  </div>
                )}

                {churnResult.retentionInsight && (
                  <p style={{ fontSize: 12, color: muted, fontStyle: "italic", lineHeight: 1.6 }}>💡 {churnResult.retentionInsight}</p>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Cohort Analysis ──────────────────────────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>
              Cohort Analysis
              {cohortResult?.cohortTrend && (
                <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: cohortResult.cohortTrend === "improving" ? "#F0FDF4" : cohortResult.cohortTrend === "declining" ? "#FEF2F2" : "#EFF6FF", color: cohortResult.cohortTrend === "improving" ? green : cohortResult.cohortTrend === "declining" ? red : blue, fontWeight: 700 }}>
                  {cohortResult.cohortTrend === "improving" ? "↗ Improving" : cohortResult.cohortTrend === "declining" ? "↘ Declining" : cohortResult.cohortTrend === "stable" ? "→ Stable" : "Insufficient data"}
                </span>
              )}
            </p>
            <p style={{ fontSize: 11, color: muted }}>Segment survey respondents by signup cohort. Identify which customers are happiest and why.</p>
          </div>
          <button onClick={() => { if (showCohortPanel && !runningCohort) setShowCohortPanel(false); else setShowCohortPanel(true); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {showCohortPanel ? "Close" : cohortResult ? "Refresh" : "Analyze Cohorts"}
          </button>
        </div>
        {showCohortPanel && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {!cohortResult && !runningCohort && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: ink, marginBottom: 4 }}>Survey ID (optional — from your hosted survey)</p>
                  <input value={cohortSurveyId} onChange={e => setCohortSurveyId(e.target.value)} placeholder="Paste survey ID or leave blank for manual data" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, fontFamily: "inherit", boxSizing: "border-box" as const }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: ink, marginBottom: 4 }}>Paste cohort data manually (optional)</p>
                  <textarea value={cohortManualData} onChange={e => setCohortManualData(e.target.value)} placeholder="e.g. Jan cohort: 42 users, NPS 45, mostly B2B. Feb cohort: 60 users, NPS 61..." rows={3} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "none", fontFamily: "inherit", boxSizing: "border-box" as const }} />
                </div>
                {cohortError && <p style={{ fontSize: 12, color: red }}>{cohortError}</p>}
                <button onClick={handleCohortAnalysis} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#7C3AED", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" }}>
                  Run Cohort Analysis
                </button>
              </div>
            )}
            {runningCohort && (
              <p style={{ fontSize: 12, color: muted, textAlign: "center", padding: "16px 0" }}>Segmenting cohorts and analyzing NPS differences…</p>
            )}
            {cohortResult && !runningCohort && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Cohort timeline bar */}
                {cohortSummaries.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 8 }}>Cohort Timeline</p>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {cohortSummaries.map((c, i) => (
                        <div key={i} style={{ background: surf, borderRadius: 6, padding: "6px 10px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                          <p style={{ fontSize: 9, color: muted, fontWeight: 600 }}>{c.week}</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{c.count}</p>
                          {c.avgNPS !== null && <p style={{ fontSize: 10, color: c.avgNPS >= 50 ? green : c.avgNPS >= 20 ? amber : red }}>NPS {c.avgNPS}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Best + Worst cohort */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {cohortResult.bestCohort && (
                    <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 4 }}>BEST COHORT</p>
                      <p style={{ fontSize: 12, color: ink, marginBottom: 4, lineHeight: 1.5 }}>{cohortResult.bestCohort.description}</p>
                      <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>Get more: {cohortResult.bestCohort.howToGetMore}</p>
                    </div>
                  )}
                  {cohortResult.worstCohort && (
                    <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 14px", border: "1px solid #FECACA" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: red, marginBottom: 4 }}>LOWEST SATISFACTION</p>
                      <p style={{ fontSize: 12, color: ink, marginBottom: 4, lineHeight: 1.5 }}>{cohortResult.worstCohort.description}</p>
                      <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>Root cause: {cohortResult.worstCohort.rootCause}</p>
                    </div>
                  )}
                </div>

                {/* Cohort list */}
                {cohortResult.cohorts && cohortResult.cohorts.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 8 }}>All Cohorts</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {cohortResult.cohorts.map((c, i) => (
                        <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{c.name}</p>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              {c.nps !== null && <span style={{ fontSize: 10, fontWeight: 700, color: (c.nps ?? 0) >= 50 ? green : (c.nps ?? 0) >= 20 ? amber : red }}>NPS {c.nps}</span>}
                              <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 999, background: c.sentiment === "strong" ? "#F0FDF4" : c.sentiment === "positive" ? "#ECFDF5" : c.sentiment === "negative" ? "#FEF2F2" : surf, color: c.sentiment === "strong" || c.sentiment === "positive" ? green : c.sentiment === "negative" ? red : muted, fontWeight: 600 }}>{c.sentiment}</span>
                            </div>
                          </div>
                          <p style={{ fontSize: 11, color: muted }}>{c.retentionSignal}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actionable findings */}
                {cohortResult.actionableFindings && cohortResult.actionableFindings.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 8 }}>Action Items</p>
                    {cohortResult.actionableFindings.map((f, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < cohortResult.actionableFindings!.length - 1 ? `1px solid ${bdr}` : "none" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: f.priority === "high" ? "#FEF2F2" : f.priority === "medium" ? "#FFFBEB" : surf, color: f.priority === "high" ? red : f.priority === "medium" ? amber : muted, flexShrink: 0, alignSelf: "flex-start", marginTop: 2 }}>{f.priority}</span>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 2 }}>{f.finding}</p>
                          <p style={{ fontSize: 11, color: muted }}>{f.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Product insight + best fit profile */}
                {cohortResult.productInsight && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: blue, marginBottom: 4 }}>KEY PRODUCT DECISION</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{cohortResult.productInsight}</p>
                  </div>
                )}
                {cohortResult.bestFitProfile && (
                  <p style={{ fontSize: 11, color: muted, fontStyle: "italic" }}>🎯 Best-fit customer: {cohortResult.bestFitProfile}</p>
                )}

                <button onClick={() => { setCohortResult(null); setCohortSummaries([]); }} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 12, cursor: "pointer", alignSelf: "flex-start" }}>
                  New Analysis
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Interview Notes Analyzer ─────────────────────────────────────────── */}
      <InterviewNotesAnalyzer artifactId={artifactId} />

      {/* ── Survey Distribution ───────────────────────────────────────────────── */}
      <div style={{ background: showDistributePanel && distributeResult ? "#F0FDF4" : surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${showDistributePanel && distributeResult ? "#BBF7D0" : bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: green, marginBottom: 2 }}>
              Distribute Survey
              {distributeResult && <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#F0FDF4", color: green, fontWeight: 700 }}>✓ {distributeResult.sent} sent</span>}
            </p>
            <p style={{ fontSize: 11, color: muted }}>Send your PMF survey to a customer list via email. Paste emails or pull from your pipeline.</p>
          </div>
          <button onClick={() => { if (showDistributePanel && !distributing) setShowDistributePanel(false); else setShowDistributePanel(true); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: green, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {showDistributePanel ? "Close" : "Send Survey"}
          </button>
        </div>
        {showDistributePanel && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {distributeResult ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "14px 16px", border: "1px solid #BBF7D0" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: green, marginBottom: 6 }}>
                    {distributeResult.simulated ? "📧 Simulated (add Resend key to send live)" : "✓ Survey distributed!"}
                  </p>
                  <div style={{ display: "flex", gap: 20 }}>
                    <div><p style={{ fontSize: 11, color: muted }}>Sent</p><p style={{ fontSize: 22, fontWeight: 800, color: green }}>{distributeResult.sent}</p></div>
                    {distributeResult.failed > 0 && <div><p style={{ fontSize: 11, color: muted }}>Failed</p><p style={{ fontSize: 22, fontWeight: 800, color: red }}>{distributeResult.failed}</p></div>}
                  </div>
                  {distributeResult.surveyUrl && (
                    <p style={{ fontSize: 11, color: muted, marginTop: 8 }}>Survey: <a href={distributeResult.surveyUrl} target="_blank" rel="noopener noreferrer" style={{ color: blue }}>{distributeResult.surveyUrl}</a></p>
                  )}
                </div>
                <button onClick={() => { setDistributeResult(null); setDistributeEmails(""); }} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 12, cursor: "pointer", alignSelf: "flex-start" }}>
                  Send to Another List
                </button>
              </div>
            ) : (
              <>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: ink, marginBottom: 4 }}>Customer emails * (one per line, or comma-separated)</p>
                  <textarea
                    value={distributeEmails}
                    onChange={e => setDistributeEmails(e.target.value)}
                    placeholder={"alice@company.com\nbob@startup.io\ncarol@acme.com"}
                    rows={4}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "vertical", fontFamily: "monospace", boxSizing: "border-box" as const }}
                  />
                  <p style={{ fontSize: 10, color: muted, marginTop: 4 }}>
                    {distributeEmails.split(/[\n,;]+/).filter(e => e.trim().includes('@')).length} valid emails detected
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: ink, marginBottom: 4 }}>Email subject (optional)</p>
                  <input value={distributeSubject} onChange={e => setDistributeSubject(e.target.value)} placeholder="Quick question from [your name] — 2 minutes max" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, fontFamily: "inherit", boxSizing: "border-box" as const }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: ink, marginBottom: 4 }}>Personal message (optional — replaces default body)</p>
                  <textarea value={distributeMessage} onChange={e => setDistributeMessage(e.target.value)} placeholder="Hi, I'm building [product] for [persona]. Your feedback would mean a lot..." rows={3} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "none", fontFamily: "inherit", boxSizing: "border-box" as const }} />
                </div>
                {distributeError && <p style={{ fontSize: 12, color: red }}>{distributeError}</p>}
                <button
                  onClick={handleDistributeSurvey}
                  disabled={distributing || distributeEmails.split(/[\n,;]+/).filter(e => e.trim().includes('@')).length === 0}
                  style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: distributing || distributeEmails.split(/[\n,;]+/).filter(e => e.trim().includes('@')).length === 0 ? bdr : green, color: distributing || distributeEmails.split(/[\n,;]+/).filter(e => e.trim().includes('@')).length === 0 ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" }}
                >
                  {distributing ? `Sending to ${distributeEmails.split(/[\n,;]+/).filter(e => e.trim().includes('@')).length} recipients…` : `Send Survey Email`}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── PMF Composite Score ─────────────────────────────────────────────── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: pmfScoreResult ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>PMF Composite Score</p>
            <p style={{ fontSize: 11, color: muted }}>Nova synthesizes survey NPS, churn signals, feature requests, and cohort data into a single PMF score across 5 dimensions.</p>
            {pmfScoreError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{pmfScoreError}</p>}
          </div>
          <button onClick={handleRunPMFScore} disabled={runningPMFScore} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: runningPMFScore ? bdr : ink, color: runningPMFScore ? muted : bg, fontSize: 12, fontWeight: 600, cursor: runningPMFScore ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {runningPMFScore ? "Calculating…" : "Calculate PMF Score"}
          </button>
        </div>
        {pmfScoreResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: 14, background: (pmfScoreResult.pmfScore ?? 0) >= 70 ? "#F0FDF4" : (pmfScoreResult.pmfScore ?? 0) >= 45 ? "#FFFBEB" : "#FEF2F2", border: `3px solid ${(pmfScoreResult.pmfScore ?? 0) >= 70 ? green : (pmfScoreResult.pmfScore ?? 0) >= 45 ? amber : red}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: (pmfScoreResult.pmfScore ?? 0) >= 70 ? green : (pmfScoreResult.pmfScore ?? 0) >= 45 ? amber : red, lineHeight: 1 }}>{pmfScoreResult.pmfScore}</p>
                <p style={{ fontSize: 9, color: muted, textTransform: "uppercase", marginTop: 2 }}>PMF Score</p>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: ink }}>{pmfScoreResult.grade}</span>
                  {pmfScoreResult.trend && (
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: pmfScoreResult.trend === 'improving' ? "#F0FDF4" : pmfScoreResult.trend === 'declining' ? "#FEF2F2" : surf, border: `1px solid ${pmfScoreResult.trend === 'improving' ? "#BBF7D0" : pmfScoreResult.trend === 'declining' ? "#FECACA" : bdr}`, color: pmfScoreResult.trend === 'improving' ? green : pmfScoreResult.trend === 'declining' ? red : muted, fontWeight: 600, textTransform: "capitalize" }}>{pmfScoreResult.trend}</span>
                  )}
                </div>
                {pmfScoreResult.verdict && <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{pmfScoreResult.verdict}</p>}
              </div>
            </div>
            {pmfScoreResult.dimensions && pmfScoreResult.dimensions.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pmfScoreResult.dimensions.map((dim, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, color: muted, width: 130, flexShrink: 0 }}>{dim.name} ({dim.weight}%)</span>
                    <div style={{ flex: 1, height: 6, background: bdr, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${dim.score}%`, height: "100%", background: dim.score >= 70 ? green : dim.score >= 45 ? amber : red, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: dim.score >= 70 ? green : dim.score >= 45 ? amber : red, width: 28, textAlign: "right", flexShrink: 0 }}>{dim.score}</span>
                    <span style={{ fontSize: 10, color: muted, flexShrink: 0, width: 60, textTransform: "capitalize" }}>{dim.status}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {pmfScoreResult.topSignals && pmfScoreResult.topSignals.length > 0 && (
                <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", border: "1px solid #BBF7D0" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 6 }}>Top Signals</p>
                  {pmfScoreResult.topSignals.map((s, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 2 }}>✓ {s}</p>)}
                </div>
              )}
              {pmfScoreResult.risks && pmfScoreResult.risks.length > 0 && (
                <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 12px", border: "1px solid #FECACA" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", marginBottom: 6 }}>Risks</p>
                  {pmfScoreResult.risks.map((r, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 2 }}>⚠ {r}</p>)}
                </div>
              )}
            </div>
            {pmfScoreResult.nextStep && (
              <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 12px", border: "1px solid #BFDBFE" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 4 }}>Next Step</p>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{pmfScoreResult.nextStep}</p>
              </div>
            )}
            <button onClick={() => setPmfScoreResult(null)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Recalculate</button>
          </div>
        )}
      </div>

      {/* ── User Segmentation ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: ink, margin: 0 }}>User Segmentation</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Behavioral user segments with tailored strategies, monetization plays, and in-product signals.</p>
          </div>
          <button onClick={handleGenerateUserSegmentation} disabled={generatingUserSeg} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingUserSeg ? bdr : blue, color: generatingUserSeg ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingUserSeg ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, marginLeft: 12 }}>
            {generatingUserSeg ? "Segmenting…" : "Segment Users"}
          </button>
        </div>
        {userSegError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{userSegError}</p>}
        {userSegResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            {!!userSegResult.verdict && <p style={{ fontSize: 12, color: muted, fontStyle: "italic", marginBottom: 8 }}>{String(userSegResult.verdict)}</p>}
            {!!userSegResult.segmentationModel && <span style={{ fontSize: 11, background: blue + "22", color: blue, borderRadius: 20, padding: "2px 10px", fontWeight: 700, display: "inline-block", marginBottom: 12 }}>Model: {String(userSegResult.segmentationModel)}</span>}
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" as const }}>
              {(["segments", "signals", "strategy", "monetization"] as const).map(t => (
                <button key={t} onClick={() => setUserSegTab(t)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${userSegTab === t ? blue : bdr}`, background: userSegTab === t ? blue : bg, color: userSegTab === t ? "#fff" : ink, fontSize: 11, fontWeight: userSegTab === t ? 700 : 400, cursor: "pointer" }}>
                  {t === "segments" ? "👥 Segments" : t === "signals" ? "📡 Signals" : t === "strategy" ? "🎯 Strategy" : "💰 Monetization"}
                </button>
              ))}
            </div>
            {userSegTab === "segments" && !!userSegResult.segments && (() => {
              const segs = userSegResult.segments as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  {segs.map((s, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{String(s.name ?? '')}</p>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                          {!!s.size && <span style={{ fontSize: 10, background: surf, border: `1px solid ${bdr}`, borderRadius: 20, padding: "2px 7px", color: muted }}>{String(s.size)}</span>}
                          {!!s.retentionRisk && <span style={{ fontSize: 10, fontWeight: 700, color: s.retentionRisk === 'high' ? red : s.retentionRisk === 'low' ? green : amber }}>{String(s.retentionRisk)} risk</span>}
                        </div>
                      </div>
                      {!!s.jobToBeDone && <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>{String(s.jobToBeDone)}</p>}
                      {!!s.keyTrigger && <p style={{ fontSize: 11, color: blue }}><b>Trigger:</b> {String(s.keyTrigger)}</p>}
                    </div>
                  ))}
                </div>
              );
            })()}
            {userSegTab === "signals" && !!userSegResult.behavioralSignals && (() => {
              const sigs = userSegResult.behavioralSignals as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {sigs.map((s, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 4 }}>{String(s.signal ?? '')}</p>
                      {!!s.meaning && <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}><b>Means:</b> {String(s.meaning)}</p>}
                      {!!s.action && <p style={{ fontSize: 11, color: blue }}><b>Action:</b> {String(s.action)}</p>}
                    </div>
                  ))}
                </div>
              );
            })()}
            {userSegTab === "strategy" && !!userSegResult.segmentStrategy && (() => {
              const strats = userSegResult.segmentStrategy as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {strats.map((s, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{String(s.segment ?? '')}</p>
                        {!!s.goal && <span style={{ fontSize: 10, background: surf, border: `1px solid ${bdr}`, borderRadius: 20, padding: "2px 7px", color: blue, fontWeight: 700 }}>{String(s.goal)}</span>}
                      </div>
                      {!!s.messaging && <p style={{ fontSize: 11, color: muted, marginBottom: 4, fontStyle: "italic" }}>{String(s.messaging)}</p>}
                      {!!s.tactics && <div>{(s.tactics as string[]).map((t, j) => <p key={j} style={{ fontSize: 11, color: ink }}>• {t}</p>)}</div>}
                    </div>
                  ))}
                </div>
              );
            })()}
            {userSegTab === "monetization" && !!userSegResult.monetizationBySegment && (() => {
              const items = userSegResult.monetizationBySegment as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {items.map((m, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 4 }}>{String(m.segment ?? '')}</p>
                      {!!m.expansionPlay && <p style={{ fontSize: 11, color: blue, marginBottom: 4 }}><b>Play:</b> {String(m.expansionPlay)}</p>}
                      {!!m.revenueOpportunity && <p style={{ fontSize: 11, color: green }}><b>Opportunity:</b> {String(m.revenueOpportunity)}</p>}
                    </div>
                  ))}
                </div>
              );
            })()}
            {!!userSegResult.priorityAction && (
              <div style={{ marginTop: 12, background: blue + "11", borderRadius: 8, padding: 10, borderLeft: `3px solid ${blue}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Priority Action</p>
                <p style={{ fontSize: 12, color: ink }}>{String(userSegResult.priorityAction)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Engagement Loops ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: ink, margin: 0 }}>Engagement Loops</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Design habit-forming product loops using the Hooked model to drive retention and virality</p>
          </div>
          <button onClick={handleGenerateEngagementLoops} disabled={generatingEngLoops} style={{ padding: "8px 16px", borderRadius: 8, background: generatingEngLoops ? surf : ink, color: generatingEngLoops ? muted : bg, fontSize: 12, fontWeight: 600, border: "none", cursor: generatingEngLoops ? "default" : "pointer" }}>
            {generatingEngLoops ? "Designing…" : "Design Loops"}
          </button>
        </div>
        {engLoopsError && <p style={{ color: "#DC2626", fontSize: 12 }}>{engLoopsError}</p>}
        {engLoopsResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!!engLoopsResult.verdict && <p style={{ fontSize: 13, color: ink, margin: 0, padding: "10px 14px", background: surf, borderRadius: 8 }}>{String(engLoopsResult.verdict)}</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["coreloop","loops","triggers","experiments"] as const).map(t => (
                <button key={t} onClick={() => setEngLoopsTab(t)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${engLoopsTab===t ? ink : bdr}`, background: engLoopsTab===t ? ink : bg, color: engLoopsTab===t ? bg : ink, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {t==="coreloop" ? "🔄 Core Loop" : t==="loops" ? "♾️ All Loops" : t==="triggers" ? "🔔 Triggers" : "🧪 Experiments"}
                </button>
              ))}
            </div>
            {engLoopsTab === "coreloop" && !!engLoopsResult.coreLoop && (() => {
              const cl = engLoopsResult.coreLoop as Record<string, unknown>;
              return (
                <div style={{ padding: "14px 16px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: "0 0 12px" }}>The Hooked Model</p>
                  {[["🎯 Trigger", cl.trigger], ["⚡ Action", cl.action], ["🎁 Variable Reward", cl.variableReward], ["💰 Investment", cl.investment]].map(([label, val]) => (
                    <div key={String(label)} style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: ink, minWidth: 130, flexShrink: 0 }}>{String(label)}</span>
                      <p style={{ fontSize: 12, color: muted, margin: 0 }}>{val ? String(val) : "—"}</p>
                    </div>
                  ))}
                  {!!cl.loopDuration && <p style={{ fontSize: 11, color: "#2563EB", margin: "8px 0 0" }}>Loop duration: {String(cl.loopDuration)}</p>}
                </div>
              );
            })()}
            {engLoopsTab === "loops" && !!(engLoopsResult.loops as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(engLoopsResult.loops as { loopName: string; type: string; description: string; buildDifficulty: string; impact: string }[]).map((l, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>{l.loopName}</p>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: "#EFF6FF", color: "#2563EB" }}>{l.type}</span>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: surf, color: muted }}>{l.buildDifficulty}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: muted, margin: "0 0 4px" }}>{l.description}</p>
                    <p style={{ fontSize: 11, color: "#16A34A", margin: 0 }}>Impact: {l.impact}</p>
                  </div>
                ))}
              </div>
            )}
            {engLoopsTab === "triggers" && !!(engLoopsResult.triggers as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(engLoopsResult.triggers as { trigger: string; channel: string; timing: string; copy: string }[]).map((t, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: "#FFFBEB", borderRadius: 8, borderLeft: "3px solid #D97706" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>{t.trigger}</p>
                      <span style={{ fontSize: 11, color: "#2563EB" }}>{t.channel}</span>
                    </div>
                    <p style={{ fontSize: 12, color: muted, margin: "0 0 4px" }}>When: {t.timing}</p>
                    <p style={{ fontSize: 12, color: ink, margin: 0, fontStyle: "italic" }}>&quot;{t.copy}&quot;</p>
                  </div>
                ))}
              </div>
            )}
            {engLoopsTab === "experiments" && !!(engLoopsResult.experiments as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(engLoopsResult.experiments as { experiment: string; hypothesis: string; duration: string; successCriteria: string }[]).map((e, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: "#EFF6FF", borderRadius: 8, borderLeft: "3px solid #2563EB" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 4px" }}>{e.experiment}</p>
                    <p style={{ fontSize: 12, color: muted, margin: "0 0 4px" }}>{e.hypothesis}</p>
                    <div style={{ display: "flex", gap: 12 }}>
                      <span style={{ fontSize: 11, color: "#2563EB" }}>Duration: {e.duration}</span>
                      <span style={{ fontSize: 11, color: "#16A34A" }}>Success: {e.successCriteria}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!!engLoopsResult.priorityBuild && <div style={{ padding: "10px 14px", background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid #16A34A" }}><p style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", margin: "0 0 4px" }}>Priority Build</p><p style={{ fontSize: 12, color: ink, margin: 0 }}>{String(engLoopsResult.priorityBuild)}</p></div>}
            <button onClick={() => setEngLoopsResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Re-run</button>
          </div>
        )}
      </div>

      {/* ── Churn Analysis ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: ink, margin: 0 }}>Churn Analysis</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Root causes, early warning signals, and retention playbook to stop churn before it happens</p>
          </div>
          <button onClick={handleGenerateChurnAnalysis} disabled={generatingChurnAnalysis} style={{ padding: "8px 16px", borderRadius: 8, background: generatingChurnAnalysis ? surf : ink, color: generatingChurnAnalysis ? muted : bg, fontSize: 12, fontWeight: 600, border: "none", cursor: generatingChurnAnalysis ? "default" : "pointer" }}>
            {generatingChurnAnalysis ? "Analyzing…" : "Analyze Churn"}
          </button>
        </div>
        {churnAnalysisError && <p style={{ color: "#DC2626", fontSize: 12 }}>{churnAnalysisError}</p>}
        {churnAnalysisResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!!churnAnalysisResult.verdict && <p style={{ fontSize: 13, color: ink, margin: 0, padding: "10px 14px", background: surf, borderRadius: 8 }}>{String(churnAnalysisResult.verdict)}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {!!churnAnalysisResult.churnRate && <div style={{ padding: "10px 12px", background: "#FEF2F2", borderRadius: 8 }}><p style={{ fontSize: 10, color: muted, margin: "0 0 2px" }}>Est. Monthly Churn</p><p style={{ fontSize: 16, fontWeight: 700, color: "#DC2626", margin: 0 }}>{String(churnAnalysisResult.churnRate)}</p></div>}
              {!!churnAnalysisResult.benchmarkChurn && <div style={{ padding: "10px 12px", background: surf, borderRadius: 8 }}><p style={{ fontSize: 10, color: muted, margin: "0 0 2px" }}>Benchmark</p><p style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0 }}>{String(churnAnalysisResult.benchmarkChurn)}</p></div>}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["causes","warnings","playbook","winback"] as const).map(t => (
                <button key={t} onClick={() => setChurnAnalysisTab(t)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${churnAnalysisTab===t ? ink : bdr}`, background: churnAnalysisTab===t ? ink : bg, color: churnAnalysisTab===t ? bg : ink, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {t==="causes" ? "🔍 Root Causes" : t==="warnings" ? "⚠️ Warnings" : t==="playbook" ? "📋 Playbook" : "↩️ Win-back"}
                </button>
              ))}
            </div>
            {churnAnalysisTab === "causes" && !!(churnAnalysisResult.rootCauses as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(churnAnalysisResult.rootCauses as { cause: string; frequency: string; impact: string; fix: string }[]).map((c, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 4px" }}>{c.cause}</p>
                    <div style={{ display: "flex", gap: 12, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: muted }}>Frequency: {c.frequency}</span>
                      <span style={{ fontSize: 11, color: "#DC2626" }}>Impact: {c.impact}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#16A34A", margin: 0 }}>Fix: {c.fix}</p>
                  </div>
                ))}
              </div>
            )}
            {churnAnalysisTab === "warnings" && !!(churnAnalysisResult.earlyWarnings as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(churnAnalysisResult.earlyWarnings as { signal: string; threshold: string; action: string; owner: string }[]).map((w, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: "#FFFBEB", borderRadius: 8, borderLeft: "3px solid #D97706" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 4px" }}>Signal: {w.signal}</p>
                    <p style={{ fontSize: 12, color: ink, margin: "0 0 4px" }}>Threshold: {w.threshold}</p>
                    <p style={{ fontSize: 12, color: "#16A34A", margin: "0 0 2px" }}>Action: {w.action}</p>
                    <p style={{ fontSize: 11, color: muted, margin: 0 }}>Owner: {w.owner}</p>
                  </div>
                ))}
              </div>
            )}
            {churnAnalysisTab === "playbook" && !!(churnAnalysisResult.retentionPlaybook as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(churnAnalysisResult.retentionPlaybook as { stage: string; tactic: string; timing: string; expectedLift: string }[]).map((p, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid #16A34A" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", textTransform: "uppercase" }}>{p.stage}</span>
                      <span style={{ fontSize: 11, color: muted }}>{p.timing}</span>
                    </div>
                    <p style={{ fontSize: 13, color: ink, margin: "0 0 4px" }}>{p.tactic}</p>
                    <p style={{ fontSize: 11, color: "#16A34A", margin: 0 }}>Expected lift: {p.expectedLift}</p>
                  </div>
                ))}
              </div>
            )}
            {churnAnalysisTab === "winback" && !!churnAnalysisResult.winbackCampaign && (() => {
              const wb = churnAnalysisResult.winbackCampaign as Record<string, unknown>;
              return (
                <div style={{ padding: "12px 14px", background: "#EFF6FF", borderRadius: 8, border: `1px solid #BFDBFE` }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 8px" }}>Win-back Campaign</p>
                  {!!wb.targetSegment && <p style={{ fontSize: 12, color: ink, margin: "0 0 4px" }}>Target: <strong>{String(wb.targetSegment)}</strong></p>}
                  {!!wb.message && <p style={{ fontSize: 12, color: ink, margin: "0 0 4px" }}>Message: {String(wb.message)}</p>}
                  {!!wb.offer && <p style={{ fontSize: 12, color: "#2563EB", margin: "0 0 4px" }}>Offer: {String(wb.offer)}</p>}
                  {!!wb.timing && <p style={{ fontSize: 11, color: muted, margin: 0 }}>Timing: {String(wb.timing)}</p>}
                </div>
              );
            })()}
            {!!churnAnalysisResult.priority && <div style={{ padding: "10px 14px", background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid #16A34A" }}><p style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", margin: "0 0 4px" }}>Priority Action</p><p style={{ fontSize: 12, color: ink, margin: 0 }}>{String(churnAnalysisResult.priority)}</p></div>}
            <button onClick={() => setChurnAnalysisResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Re-run</button>
          </div>
        )}
      </div>

      {/* ── Onboarding Flow ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 20, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Onboarding Flow</p>
            <p style={{ fontSize: 11, color: muted }}>Design the full user onboarding journey — steps, email sequence, in-app messages, and drop-off recovery.</p>
          </div>
          <button onClick={handleGenerateOnboardingFlow} disabled={generatingOnbFlow} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingOnbFlow ? bdr : green, color: generatingOnbFlow ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingOnbFlow ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, marginLeft: 12 }}>
            {generatingOnbFlow ? "Designing…" : "Design Onboarding"}
          </button>
        </div>
        {onbFlowError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{onbFlowError}</p>}
        {onbFlowResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            {/* Aha summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[["Aha Moment Goal", onbFlowResult.ahaGoal], ["Target Time to Aha", onbFlowResult.targetTimeToAha]].map(([l, v]) => (
                <div key={String(l)} style={{ background: bg, borderRadius: 8, padding: 10 }}>
                  <p style={{ fontSize: 11, color: muted, margin: "0 0 2px" }}>{String(l)}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>{String(v ?? "—")}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {(["steps", "emails", "inapp", "failures"] as const).map(t => (
                <button key={t} onClick={() => setOnbFlowTab(t)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${onbFlowTab === t ? green : bdr}`, background: onbFlowTab === t ? "#DCFCE7" : "transparent", color: onbFlowTab === t ? "#16A34A" : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {t === "steps" ? "Steps" : t === "emails" ? "Email Sequence" : t === "inapp" ? "In-App" : "Fail Points"}
                </button>
              ))}
            </div>
            {onbFlowTab === "steps" && !!(onbFlowResult.steps as unknown[])?.length && (
              <div>
                {(onbFlowResult.steps as { step: string; type: string; purpose: string; copy: string; successSignal: string; skipAllowed: boolean }[]).map((s, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}`, display: "flex", gap: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", background: "#DCFCE7", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap" as const, height: "fit-content" }}>{s.type}</span>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>{s.step}</p>
                      <p style={{ fontSize: 11, color: muted, margin: "2px 0" }}>{s.purpose}</p>
                      <p style={{ fontSize: 12, color: blue, fontStyle: "italic" }}>&quot;{s.copy}&quot;</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {onbFlowTab === "emails" && !!(onbFlowResult.emailSequence as unknown[])?.length && (
              <div>
                {(onbFlowResult.emailSequence as { email: string; sendTiming: string; subject: string; bodyOutline: string; cta: string }[]).map((e, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>{e.email}</p>
                      <span style={{ fontSize: 11, color: muted }}>{e.sendTiming}</span>
                    </div>
                    <p style={{ fontSize: 12, color: ink, marginBottom: 4 }}>Subject: <em>{e.subject}</em></p>
                    <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>{e.bodyOutline}</p>
                    <p style={{ fontSize: 11, color: blue }}>CTA: {e.cta}</p>
                  </div>
                ))}
              </div>
            )}
            {onbFlowTab === "inapp" && !!(onbFlowResult.inAppMessages as unknown[])?.length && (
              <div>
                {(onbFlowResult.inAppMessages as { trigger: string; message: string; cta: string }[]).map((m, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 11, color: muted, marginBottom: 2 }}>Trigger: {m.trigger}</p>
                    <p style={{ fontSize: 12, color: ink, marginBottom: 2 }}>&quot;{m.message}&quot;</p>
                    <p style={{ fontSize: 11, color: blue }}>Button: {m.cta}</p>
                  </div>
                ))}
              </div>
            )}
            {onbFlowTab === "failures" && !!(onbFlowResult.commonFailPoints as unknown[])?.length && (
              <div>
                {(onbFlowResult.commonFailPoints as { failPoint: string; percentage: number; cause: string; fix: string }[]).map((fp, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>{fp.failPoint}</p>
                      <span style={{ fontSize: 12, color: red, fontWeight: 700 }}>{fp.percentage}% drop</span>
                    </div>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 4 }}>Cause: {fp.cause}</p>
                    <p style={{ fontSize: 12, color: green }}>Fix: {fp.fix}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Growth Experiments ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 20, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Growth Experiment Program</p>
            <p style={{ fontSize: 11, color: muted }}>Design a prioritized backlog of growth experiments with hypotheses, metrics, and a running playbook.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={growthFocus} onChange={e => setGrowthFocus(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: bg }}>
              {["acquisition", "activation", "retention", "revenue", "referral", "all stages"].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <button onClick={handleGenerateGrowthExperiments} disabled={generatingGrowth} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingGrowth ? bdr : green, color: generatingGrowth ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingGrowth ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const, flexShrink: 0 }}>
              {generatingGrowth ? "Designing…" : "Design Experiments"}
            </button>
          </div>
        </div>
        {growthError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{growthError}</p>}
        {growthResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            {!!growthResult.overview && <p style={{ fontSize: 12, color: muted, fontStyle: "italic", marginBottom: 14 }}>{String(growthResult.overview)}</p>}
            {/* Priority matrix */}
            {!!growthResult.priorityMatrix && (() => {
              const pm = growthResult.priorityMatrix as { runNow?: string[]; runNext?: string[]; parkForLater?: string[] };
              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {[["Run Now", pm.runNow, red], ["Run Next", pm.runNext, amber], ["Park", pm.parkForLater, muted]].map(([l, items, c]) => (
                    <div key={String(l)} style={{ background: bg, borderRadius: 8, padding: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: String(c), marginBottom: 6 }}>{String(l)}</p>
                      {(items as string[] | undefined)?.map((exp, ei) => <p key={ei} style={{ fontSize: 11, color: ink, marginBottom: 2 }}>· {exp}</p>)}
                    </div>
                  ))}
                </div>
              );
            })()}
            {/* Experiments */}
            {!!(growthResult.experiments as unknown[])?.length && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Experiment Details</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 10 }}>
                  {(growthResult.experiments as { name: string }[]).map((e, i) => (
                    <button key={i} onClick={() => setGrowthExpIdx(i)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${growthExpIdx === i ? green : bdr}`, background: growthExpIdx === i ? "#DCFCE7" : "transparent", color: growthExpIdx === i ? "#16A34A" : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{e.name}</button>
                  ))}
                </div>
                {(() => {
                  const exp = (growthResult.experiments as { name: string; hypothesis: string; category: string; priority: string; effort: string; expectedImpact: string; duration: string; primaryMetric: string; minimumSuccessThreshold: string; failureSignal: string }[])[growthExpIdx];
                  if (!exp) return null;
                  return (
                    <div style={{ background: bg, borderRadius: 8, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <p style={{ fontWeight: 700, color: ink, margin: 0 }}>{exp.name}</p>
                        <div style={{ display: "flex", gap: 6 }}>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: exp.priority === "P0" ? "#FEE2E2" : exp.priority === "P1" ? "#FEF3C7" : "#F3F4F6", color: exp.priority === "P0" ? red : exp.priority === "P1" ? amber : muted, fontWeight: 700 }}>{exp.priority}</span>
                          <span style={{ fontSize: 11, color: muted, padding: "2px 8px" }}>{exp.category}</span>
                        </div>
                      </div>
                      <p style={{ fontSize: 12, color: muted, fontStyle: "italic", marginBottom: 8 }}>{exp.hypothesis}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <p style={{ fontSize: 12, color: ink, margin: 0 }}><strong>Metric:</strong> {exp.primaryMetric}</p>
                        <p style={{ fontSize: 12, color: ink, margin: 0 }}><strong>Duration:</strong> {exp.duration}</p>
                        <p style={{ fontSize: 12, color: green, margin: 0 }}>✓ Win: {exp.minimumSuccessThreshold}</p>
                        <p style={{ fontSize: 12, color: red, margin: 0 }}>✗ Fail: {exp.failureSignal}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Activation Funnel ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 20, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Activation Funnel</p>
            <p style={{ fontSize: 11, color: muted }}>Map your user activation journey, find the aha moment, and reduce time-to-value.</p>
          </div>
          <button onClick={handleGenerateFunnel} disabled={generatingFunnel} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingFunnel ? bdr : green, color: generatingFunnel ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingFunnel ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, marginLeft: 12 }}>
            {generatingFunnel ? "Analyzing…" : "Analyze Funnel"}
          </button>
        </div>
        {funnelError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{funnelError}</p>}
        {funnelResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
              <div style={{ textAlign: "center" as const }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: (funnelResult.activationRate as number) >= 50 ? green : (funnelResult.activationRate as number) >= 30 ? amber : red, margin: 0 }}>{funnelResult.activationRate as number}%</p>
                <p style={{ fontSize: 11, color: muted }}>Activation Rate</p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, color: muted, fontStyle: "italic", margin: "0 0 4px" }}>{String(funnelResult.overview ?? "")}</p>
                {!!funnelResult.activationMoment && <p style={{ fontSize: 12, color: ink }}><strong>Aha Moment:</strong> {String(funnelResult.activationMoment)}</p>}
                {!!funnelResult.ahaMetric && <p style={{ fontSize: 11, color: muted }}>Signal: {String(funnelResult.ahaMetric)}</p>}
              </div>
            </div>
            {/* Stage selector */}
            {!!(funnelResult.stages as unknown[])?.length && (
              <div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 10 }}>
                  {(funnelResult.stages as { stage: string }[]).map((s, i) => (
                    <button key={i} onClick={() => setFunnelStageIdx(i)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${funnelStageIdx === i ? green : bdr}`, background: funnelStageIdx === i ? "#DCFCE7" : "transparent", color: funnelStageIdx === i ? "#16A34A" : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{s.stage}</button>
                  ))}
                </div>
                {(() => {
                  const stg = (funnelResult.stages as { stage: string; conversionRate: number; benchmark: number; dropOff: number; timeToComplete: string; topFriction: string; fix: string }[])[funnelStageIdx];
                  if (!stg) return null;
                  return (
                    <div style={{ background: bg, borderRadius: 8, padding: 12, marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <p style={{ fontWeight: 700, color: ink, margin: 0 }}>{stg.stage}</p>
                        <div style={{ display: "flex", gap: 12 }}>
                          <span style={{ fontSize: 12, color: green, fontWeight: 700 }}>{stg.conversionRate}% converts</span>
                          <span style={{ fontSize: 12, color: muted }}>Benchmark: {stg.benchmark}%</span>
                        </div>
                      </div>
                      <p style={{ fontSize: 12, color: muted, marginBottom: 4 }}><strong>Time:</strong> {stg.timeToComplete} &nbsp;·&nbsp; <strong>Drop-off:</strong> {stg.dropOff}%</p>
                      <p style={{ fontSize: 12, color: muted, marginBottom: 4 }}><strong>Top Friction:</strong> {stg.topFriction}</p>
                      <p style={{ fontSize: 12, color: blue }}><strong>Fix:</strong> {stg.fix}</p>
                    </div>
                  );
                })()}
              </div>
            )}
            {!!funnelResult.quickWin && (
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 12px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: blue, margin: "0 0 2px" }}>Quick Win This Week</p>
                <p style={{ fontSize: 11, color: ink, margin: 0 }}>{String(funnelResult.quickWin)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Retention Analysis ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 20, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Retention Analysis</p>
            <p style={{ fontSize: 11, color: muted }}>Model cohort retention, identify churn drivers, and get a prioritized action plan to improve retention.</p>
          </div>
          <button onClick={handleGenerateRetention} disabled={generatingRetention}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingRetention ? bdr : green, color: generatingRetention ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingRetention ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {generatingRetention ? "Analyzing…" : "Run Retention Analysis"}
          </button>
        </div>
        {retentionError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{retentionError}</p>}
        {retentionResult && (() => {
          const cohorts = (retentionResult.cohortAnalysis as { cohort: string; retentionRate: number; benchmark: number; trend: string; keyDriver: string }[] | undefined) ?? [];
          const churnReasons = (retentionResult.churnReasons as { reason: string; frequency: string; segment: string; fix: string }[] | undefined) ?? [];
          const actions = (retentionResult.actionPlan as { action: string; timeline: string; impact: string; effort: string; metric: string }[] | undefined) ?? [];
          const experiments = (retentionResult.retentionExperiments as { experiment: string; hypothesis: string; metric: string; duration: string }[] | undefined) ?? [];
          const trendClr = (t: string) => t === 'improving' ? green : t === 'declining' ? red : amber;
          return (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 32, fontWeight: 800, color: (retentionResult.overallRetentionScore as number) >= 70 ? green : (retentionResult.overallRetentionScore as number) >= 50 ? amber : red, margin: 0, lineHeight: 1 }}>{retentionResult.overallRetentionScore as number}</p>
                  <p style={{ fontSize: 9, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1 }}>Retention Score</p>
                </div>
                {!!retentionResult.verdict && <p style={{ fontSize: 12, color: ink, flex: 1, fontStyle: "italic" }}>{retentionResult.verdict as string}</p>}
              </div>
              <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: `1px solid ${bdr}`, paddingBottom: 8 }}>
                {([{ key: 'cohorts' as const, label: 'Cohorts' }, { key: 'churn' as const, label: 'Churn' }, { key: 'actions' as const, label: 'Actions' }, { key: 'experiments' as const, label: 'Experiments' }]).map(t => (
                  <button key={t.key} onClick={() => setRetentionTab(t.key)}
                    style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: retentionTab === t.key ? ink : "transparent", color: retentionTab === t.key ? "#fff" : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    {t.label}
                  </button>
                ))}
              </div>
              {retentionTab === 'cohorts' && cohorts.length > 0 && (
                <div>
                  {cohorts.map((c, ci) => (
                    <div key={ci} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", background: surf, borderRadius: 8, border: `1px solid ${bdr}`, marginBottom: 6 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, width: 80, flexShrink: 0 }}>{c.cohort}</p>
                      <div style={{ flex: 1, background: bdr, borderRadius: 4, height: 8, overflow: "hidden" }}>
                        <div style={{ width: `${c.retentionRate}%`, height: "100%", background: c.retentionRate >= c.benchmark ? green : amber, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: c.retentionRate >= c.benchmark ? green : amber, width: 40 }}>{c.retentionRate}%</span>
                      <span style={{ fontSize: 10, color: trendClr(c.trend), fontWeight: 700, textTransform: "capitalize", width: 70 }}>{c.trend}</span>
                      <span style={{ fontSize: 10, color: muted, flex: 1 }}>{c.keyDriver}</span>
                    </div>
                  ))}
                  {!!(retentionResult.earlyWarningSignals as string[] | undefined)?.length && (
                    <div style={{ marginTop: 12, padding: "10px 12px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: amber, marginBottom: 6 }}>Early Warning Signals</p>
                      {(retentionResult.earlyWarningSignals as string[]).map((s, si) => (
                        <p key={si} style={{ fontSize: 11, color: ink, marginBottom: 2 }}>⚠ {s}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {retentionTab === 'churn' && churnReasons.length > 0 && (
                <div>
                  {churnReasons.map((cr, ci) => (
                    <div key={ci} style={{ padding: "10px 12px", background: surf, borderRadius: 8, border: `1px solid ${bdr}`, marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: red }}>{cr.reason}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, color: cr.frequency === 'high' ? red : cr.frequency === 'medium' ? amber : muted, textTransform: "uppercase" }}>{cr.frequency}</span>
                        <span style={{ fontSize: 10, color: muted }}>{cr.segment}</span>
                      </div>
                      <p style={{ fontSize: 11, color: green }}>Fix: {cr.fix}</p>
                    </div>
                  ))}
                </div>
              )}
              {retentionTab === 'actions' && actions.length > 0 && (
                <div>
                  {actions.map((a, ai) => (
                    <div key={ai} style={{ display: "flex", gap: 10, marginBottom: 8, padding: "10px 12px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 2 }}>{a.action}</p>
                        <p style={{ fontSize: 11, color: muted }}>Metric: {a.metric}</p>
                      </div>
                      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: a.impact === 'high' ? green : amber }}>{a.impact} impact</span>
                        <span style={{ fontSize: 10, color: muted }}>{a.timeline}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {retentionTab === 'experiments' && experiments.length > 0 && (
                <div>
                  {experiments.map((e, ei) => (
                    <div key={ei} style={{ padding: "10px 12px", background: surf, borderRadius: 8, border: `1px solid ${bdr}`, marginBottom: 8 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 4 }}>{e.experiment}</p>
                      <p style={{ fontSize: 11, color: muted, marginBottom: 2 }}>Hypothesis: {e.hypothesis}</p>
                      <div style={{ display: "flex", gap: 16 }}>
                        <span style={{ fontSize: 10, color: muted }}>Metric: {e.metric}</span>
                        <span style={{ fontSize: 10, color: muted }}>Duration: {e.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!!retentionResult.quickWin && (
                <div style={{ marginTop: 12, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Quick Win This Week</p>
                  <p style={{ fontSize: 11, color: ink }}>{retentionResult.quickWin as string}</p>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Fake Door Test ──────────────────────────────────────────────────── */}
      <FakeDoorSection artifactId={artifactId} userId={userId} data={data} />

      {/* ── Customer Insight Report ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: insightReport ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Customer Insight Report</p>
            <p style={{ fontSize: 11, color: muted }}>Nova synthesizes your PMF survey and interview data into themes, pain points, product gaps, and actionable recommendations.</p>
            {insightError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{insightError}</p>}
          </div>
          <button onClick={handleRunInsight} disabled={runningInsight}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: runningInsight ? bdr : blue, color: runningInsight ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: runningInsight ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {runningInsight ? "Analyzing…" : "Run Analysis"}
          </button>
        </div>
        {insightReport && (
          <div>
            {insightReport.synthesisNote && (
              <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE", marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: blue, fontWeight: 600 }}>💡 {insightReport.synthesisNote}</p>
              </div>
            )}
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {(['themes', 'pain', 'recs'] as const).map(t => (
                <button key={t} onClick={() => setInsightTab(t)}
                  style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${insightTab === t ? blue : bdr}`, background: insightTab === t ? blue : "transparent", color: insightTab === t ? "#fff" : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {t === 'themes' ? 'Themes' : t === 'pain' ? 'Pain Points' : 'Recommendations'}
                </button>
              ))}
            </div>
            {insightTab === 'themes' && (
              <div>
                {(insightReport.topThemes ?? []).map((t, i) => (
                  <div key={i} style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{t.theme}</p>
                      <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: t.frequency === 'high' ? "#DCFCE7" : "#FEF3C7", color: t.frequency === 'high' ? "#16A34A" : amber }}>{t.frequency}</span>
                    </div>
                    <p style={{ fontSize: 11, color: muted }}>{t.summary}</p>
                  </div>
                ))}
                {(insightReport.verbatims ?? []).length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 6 }}>Verbatims</p>
                    {(insightReport.verbatims ?? []).map((v, i) => (
                      <p key={i} style={{ fontSize: 12, color: ink, fontStyle: "italic", marginBottom: 4 }}>&quot;{v}&quot;</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {insightTab === 'pain' && (
              <div>
                {(insightReport.painPoints ?? []).map((p, i) => (
                  <div key={i} style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{p.pain}</p>
                      <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: p.severity === 'critical' ? "#FEE2E2" : "#FEF3C7", color: p.severity === 'critical' ? red : amber }}>{p.severity}</span>
                    </div>
                    {p.quote && <p style={{ fontSize: 11, color: muted, fontStyle: "italic" }}>&quot;{p.quote}&quot;</p>}
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                  {insightReport.churnRisks && insightReport.churnRisks.length > 0 && (
                    <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 14px", border: "1px solid #FECACA" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", marginBottom: 6 }}>Churn Risks</p>
                      {insightReport.churnRisks.map((r, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>→ {r}</p>)}
                    </div>
                  )}
                  {insightReport.productGaps && insightReport.productGaps.length > 0 && (
                    <div style={{ background: "#FFFBEB", borderRadius: 8, padding: "10px 14px", border: "1px solid #FDE68A" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: amber, textTransform: "uppercase", marginBottom: 6 }}>Product Gaps</p>
                      {insightReport.productGaps.map((g, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>→ {g}</p>)}
                    </div>
                  )}
                </div>
              </div>
            )}
            {insightTab === 'recs' && (
              <div>
                {(insightReport.recommendations ?? []).map((r, i) => (
                  <div key={i} style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{r.action}</p>
                      <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: r.impact === 'high' ? "#DCFCE7" : "#FEF3C7", color: r.impact === 'high' ? "#16A34A" : amber }}>impact: {r.impact}</span>
                      <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: r.effort === 'low' ? "#DCFCE7" : "#FEF3C7", color: r.effort === 'low' ? "#16A34A" : amber }}>effort: {r.effort}</span>
                    </div>
                    <p style={{ fontSize: 11, color: muted }}>{r.rationale}</p>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setInsightReport(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", marginTop: 8 }}>Re-analyze</button>
          </div>
        )}
      </div>

      {/* ── User Personas ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: personasResult ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", marginBottom: 2 }}>User Personas</p>
            <p style={{ fontSize: 11, color: muted }}>Nova builds 3 detailed personas from your ICP and research data — goals, frustrations, buying triggers, and a day-in-the-life for each.</p>
            {personasError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{personasError}</p>}
          </div>
          <button onClick={handleGeneratePersonas} disabled={generatingPersonas}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingPersonas ? bdr : "#7C3AED", color: generatingPersonas ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingPersonas ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {generatingPersonas ? "Building…" : "Build Personas"}
          </button>
        </div>
        {personasResult && personasResult.length > 0 && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {personasResult.map((p, i) => (
                <button key={i} onClick={() => setActivePersona(i)}
                  style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${activePersona === i ? "#7C3AED" : bdr}`, background: activePersona === i ? "#7C3AED" : "transparent", color: activePersona === i ? "#fff" : muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {p.avatar} {p.name}
                </button>
              ))}
            </div>
            {(() => {
              const p = personasResult[activePersona];
              if (!p) return null;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: "#F5F3FF", borderRadius: 10, padding: "14px 16px", border: "1px solid #DDD6FE" }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: "#7C3AED", marginBottom: 4 }}>{p.avatar} {p.name} — {p.role}</p>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 8 }}>{p.demographics}</p>
                    {p.quotableQuote && <p style={{ fontSize: 13, color: ink, fontStyle: "italic" }}>&quot;{p.quotableQuote}&quot;</p>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#16A34A", textTransform: "uppercase", marginBottom: 6 }}>Goals</p>
                      {(p.goals ?? []).map((g, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>→ {g}</p>)}
                    </div>
                    <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 14px", border: "1px solid #FECACA" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", marginBottom: 6 }}>Frustrations</p>
                      {(p.frustrations ?? []).map((f, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>→ {f}</p>)}
                    </div>
                    <div style={{ background: "#FFF7ED", borderRadius: 8, padding: "10px 14px", border: "1px solid #FED7AA" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: amber, textTransform: "uppercase", marginBottom: 6 }}>Buying Triggers</p>
                      {(p.buyingTriggers ?? []).map((t, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>→ {t}</p>)}
                    </div>
                    <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 6 }}>Objections</p>
                      {(p.objections ?? []).map((o, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>→ {o}</p>)}
                    </div>
                  </div>
                  {p.dayInLife && (
                    <div style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 8, padding: "10px 14px" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Day in the Life</p>
                      <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{p.dayInLife}</p>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 12, fontSize: 12, color: muted }}>
                    {p.willingness && <span>Willingness to pay: <strong style={{ color: ink }}>{p.willingness}</strong></span>}
                    {p.decisionProcess && <span>Decision: <strong style={{ color: ink }}>{p.decisionProcess}</strong></span>}
                  </div>
                </div>
              );
            })()}
            <button onClick={() => setPersonasResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", marginTop: 10 }}>Rebuild</button>
          </div>
        )}
      </div>

      {/* ── Experiment Tracker ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Experiment Designer</p>
        <p style={{ fontSize: 11, color: muted, marginBottom: 12 }}>Nova designs a rigorous A/B or hypothesis-driven experiment — sample size, success criteria, tracking plan, risk mitigations, and a readout template.</p>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 10 }}>
          <input value={etHypothesis} onChange={e => setEtHypothesis(e.target.value)} placeholder="Hypothesis (e.g. Adding social proof to pricing page increases sign-ups) *"
            style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${etHypothesis ? bdr : red}`, fontSize: 12, color: ink, background: "#fff", outline: "none" }} />
          <input value={etMetric} onChange={e => setEtMetric(e.target.value)} placeholder="Primary metric (e.g. sign-up rate)"
            style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: "#fff", outline: "none" }} />
        </div>
        {etError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{etError}</p>}
        <button onClick={handleRunExperiment} disabled={!etHypothesis.trim() || generatingET}
          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: (!etHypothesis.trim() || generatingET) ? bdr : ink, color: (!etHypothesis.trim() || generatingET) ? muted : bg, fontSize: 12, fontWeight: 600, cursor: (!etHypothesis.trim() || generatingET) ? "not-allowed" : "pointer" }}>
          {generatingET ? "Designing…" : "Design Experiment"}
        </button>
        {etResult && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: 0 }}>{etResult.experimentTitle as string}</p>
            <div style={{ background: "#ECFEFF", borderRadius: 8, padding: "10px 14px", border: "1px solid #A5F3FC" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#0891B2", textTransform: "uppercase", marginBottom: 4 }}>Refined Hypothesis</p>
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{etResult.hypothesis as string}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Sample Size Needed</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{etResult.sampleSizeNeeded as string}</p>
              </div>
              <div style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Statistical Power</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{etResult.statisticalPower as string}</p>
              </div>
              <div style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Runtime</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{(etResult.timeline as { runtime?: string } | undefined)?.runtime ?? 'TBD'}</p>
              </div>
            </div>
            {!!etResult.successCriteria && (
              <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 4 }}>Success Criteria</p>
                <p style={{ fontSize: 12, color: ink }}>{etResult.successCriteria as string}</p>
              </div>
            )}
            {(etResult.variants as { name: string; description: string }[] | undefined)?.length && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(etResult.variants as { name: string; description: string }[]).map((v, i) => (
                  <div key={i} style={{ background: i === 0 ? "#F9F7F2" : "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: `1px solid ${i === 0 ? bdr : "#BFDBFE"}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? muted : blue, textTransform: "uppercase", marginBottom: 4 }}>{v.name}</p>
                    <p style={{ fontSize: 11, color: ink }}>{v.description}</p>
                  </div>
                ))}
              </div>
            )}
            {(etResult.risksAndMitigations as { risk: string; mitigation: string }[] | undefined)?.length && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: amber, textTransform: "uppercase", marginBottom: 6 }}>Risks & Mitigations</p>
                {(etResult.risksAndMitigations as { risk: string; mitigation: string }[]).map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 11 }}>
                    <span style={{ color: red, flexShrink: 0 }}>⚠</span>
                    <span style={{ color: ink }}>{r.risk} <span style={{ color: green }}>→ {r.mitigation}</span></span>
                  </div>
                ))}
              </div>
            )}
            {!!etResult.readoutTemplate && (
              <div style={{ background: "#FFFBEB", borderRadius: 8, padding: "10px 14px", border: "1px solid #FDE68A" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: amber, textTransform: "uppercase", marginBottom: 4 }}>Readout Template</p>
                <p style={{ fontSize: 12, color: ink, fontStyle: "italic" }}>{etResult.readoutTemplate as string}</p>
              </div>
            )}
            <button onClick={() => setEtResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>New Experiment</button>
          </div>
        )}
      </div>

      {/* ── Feature Priority Matrix ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Feature Priority Matrix (RICE)</p>
        <p style={{ fontSize: 11, color: muted, marginBottom: 12 }}>Nova scores your roadmap using RICE (Reach × Impact × Confidence ÷ Effort) + MoSCoW + Kano categories. Generates 12 prioritized features with customer evidence and risk notes.</p>
        {fmError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{fmError}</p>}
        <button onClick={handleGenerateFeatureMatrix} disabled={generatingFM}
          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingFM ? bdr : ink, color: generatingFM ? muted : bg, fontSize: 12, fontWeight: 600, cursor: generatingFM ? "not-allowed" : "pointer" }}>
          {generatingFM ? "Scoring features…" : "Generate Feature Matrix"}
        </button>
        {fmResult && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {!!fmResult.recommendation && (
              <div style={{ background: "#F5F3FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #DDD6FE" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", marginBottom: 4 }}>Strategic Recommendation</p>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{fmResult.recommendation as string}</p>
              </div>
            )}
            {(fmResult.topPriorities as string[] | undefined)?.length && (
              <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 6 }}>Top Priorities</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(fmResult.topPriorities as string[]).map((p, i) => (
                    <span key={i} style={{ padding: "3px 8px", borderRadius: 10, background: green, color: "#fff", fontSize: 11, fontWeight: 600 }}>{p}</span>
                  ))}
                </div>
              </div>
            )}
            {/* Sort controls */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: muted }}>Sort by:</span>
              {(['rice', 'impact', 'effort'] as const).map(s => (
                <button key={s} onClick={() => setFmSort(s)}
                  style={{ padding: "3px 8px", borderRadius: 6, border: "none", background: fmSort === s ? ink : "transparent", color: fmSort === s ? "#fff" : muted, fontSize: 10, fontWeight: 600, cursor: "pointer", textTransform: "uppercase" }}>
                  {s}
                </button>
              ))}
            </div>
            {/* Feature table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${bdr}` }}>
                    <th style={{ padding: "6px 8px", textAlign: "left", color: muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Feature</th>
                    <th style={{ padding: "6px 8px", textAlign: "center", color: muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>RICE</th>
                    <th style={{ padding: "6px 8px", textAlign: "center", color: muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Tag</th>
                    <th style={{ padding: "6px 8px", textAlign: "center", color: muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>MoSCoW</th>
                    <th style={{ padding: "6px 8px", textAlign: "center", color: muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Kano</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(fmResult.features as { feature: string; riceScore: number; impact: number; effort: number; tag: string; moscoWCategory: string; kanoCategory: string; description: string }[] | undefined ?? [])]
                    .sort((a, b) => fmSort === 'rice' ? b.riceScore - a.riceScore : fmSort === 'impact' ? b.impact - a.impact : a.effort - b.effort)
                    .map((f, i) => {
                      const tagColor: Record<string, string> = { 'quick win': green, 'big bet': blue, 'table stakes': amber, 'nice to have': muted };
                      const kanoColor: Record<string, string> = { 'basic': red, 'performance': amber, 'delight': green };
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${bdr}`, background: i % 2 === 0 ? "#fff" : bg }}>
                          <td style={{ padding: "7px 8px" }}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: ink, margin: 0 }}>{f.feature}</p>
                            <p style={{ fontSize: 10, color: muted, margin: 0 }}>{f.description}</p>
                          </td>
                          <td style={{ padding: "7px 8px", textAlign: "center", fontWeight: 700, color: f.riceScore > 500 ? green : f.riceScore > 200 ? amber : muted }}>{f.riceScore}</td>
                          <td style={{ padding: "7px 8px", textAlign: "center" }}>
                            <span style={{ padding: "2px 6px", borderRadius: 10, background: tagColor[f.tag] ?? muted, color: "#fff", fontSize: 10, fontWeight: 600 }}>{f.tag}</span>
                          </td>
                          <td style={{ padding: "7px 8px", textAlign: "center", fontSize: 10, color: ink }}>{f.moscoWCategory}</td>
                          <td style={{ padding: "7px 8px", textAlign: "center" }}>
                            <span style={{ color: kanoColor[f.kanoCategory] ?? muted, fontWeight: 600, fontSize: 10 }}>{f.kanoCategory}</span>
                          </td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
            <button onClick={() => setFmResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Regenerate</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Interview Notes Analyzer (used inside PMFSurveyRenderer) ─────────────────
export function InterviewNotesAnalyzer({ artifactId }: { artifactId?: string }) {
  const [showModal, setShowModal]       = useState(false);
  const [intervieweeName, setName]      = useState("");
  const [intervieweeRole, setRole]      = useState("");
  const [notes, setNotes]               = useState("");
  const [analyzing, setAnalyzing]       = useState(false);
  const [analysis, setAnalysis]         = useState<{
    pmfSignal?: string; pmfSummary?: string;
    themes?: { theme: string; frequency: string; quotes: string[]; insight: string }[];
    painPoints?: { pain: string; severity: string; currentWorkaround: string; willingnessToPay: boolean }[];
    featureRequests?: { feature: string; mentions: number; context: string; priority: string }[];
    keyQuotes?: { quote: string; type: string }[];
    buyingSignals?: string[]; redFlags?: string[]; nextSteps?: string[];
  } | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // History of past analyses
  const [history, setHistory]           = useState<{ id: string; title: string; content: { pmfSignal?: string } }[]>([]);

  useEffect(() => {
    fetch('/api/agents/nova/interview-notes')
      .then(r => r.json())
      .then(d => { if (d.insights) setHistory(d.insights); })
      .catch(() => {});
  }, [analysis]);

  async function handleAnalyze() {
    if (!notes.trim() || analyzing) return;
    setAnalyzing(true); setAnalyzeError(null); setAnalysis(null);
    try {
      const res = await fetch('/api/agents/nova/interview-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, intervieweeName: intervieweeName.trim(), role: intervieweeRole.trim(), artifactId }),
      });
      const result = await res.json();
      if (res.ok) setAnalysis(result.analysis);
      else setAnalyzeError(result.error ?? 'Analysis failed');
    } catch { setAnalyzeError('Network error'); }
    finally { setAnalyzing(false); }
  }

  const pmfColors: Record<string, string> = { strong: green, moderate: amber, weak: "#D97706", negative: red };
  const pmfEmoji:  Record<string, string> = { strong: "🟢", moderate: "🟡", weak: "🟠", negative: "🔴" };
  const severityColor: Record<string, string> = { critical: red, significant: amber, minor: muted };
  const priorityColor: Record<string, string> = { "must-have": red, "nice-to-have": blue, delight: green };

  return (
    <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: history.length > 0 ? 10 : 0 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Interview Notes Analyzer</p>
          <p style={{ fontSize: 11, color: muted }}>Paste notes or a transcript — Nova extracts themes, pain points, feature requests, and PMF signal.</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setAnalysis(null); setAnalyzeError(null); }}
          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", marginLeft: 12, whiteSpace: "nowrap" }}
        >
          Analyze Interview
        </button>
      </div>
      {history.length > 0 && (
        <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {history.slice(0, 5).map((h, i) => {
            const signal = h.content?.pmfSignal as string | undefined;
            return (
              <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: surf, color: muted, border: `1px solid ${bdr}`, fontWeight: 600 }}>
                {pmfEmoji[signal ?? ''] ?? '⚪'} {h.title.replace('Interview: ', '')}
              </span>
            );
          })}
        </div>
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget && !analyzing) setShowModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 720, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Interview Notes Analyzer</p>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: muted }}>✕</button>
            </div>

            {!analysis ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Interviewee Name</label>
                    <input value={intervieweeName} onChange={e => setName(e.target.value)} placeholder="Sarah Chen" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Their Role / Company</label>
                    <input value={intervieweeRole} onChange={e => setRole(e.target.value)} placeholder="Head of Ops, Acme Corp" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>
                    Notes / Transcript * <span style={{ fontWeight: 400 }}>(raw notes, Otter.ai export, bullet points — anything works)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={"- Said current process takes 3 hours every week\n- Uses spreadsheets, hates manual data entry\n- Would pay $50-100/mo for automation\n- Mentioned their team of 5 all have the same problem\n- Not very disappointed if product went away..."}
                    rows={12}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }}
                  />
                </div>
                {analyzeError && <p style={{ fontSize: 12, color: red }}>{analyzeError}</p>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing || notes.trim().length < 30}
                    style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: analyzing ? bdr : green, color: analyzing ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: analyzing ? "not-allowed" : "pointer" }}
                  >
                    {analyzing ? "Analyzing…" : "Extract Insights"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* PMF Signal header */}
                <div style={{ background: `${pmfColors[analysis.pmfSignal ?? '']}14`, border: `1px solid ${pmfColors[analysis.pmfSignal ?? ''] ?? muted}40`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 22 }}>{pmfEmoji[analysis.pmfSignal ?? ''] ?? '⚪'}</span>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: pmfColors[analysis.pmfSignal ?? ''] ?? muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        PMF Signal — {analysis.pmfSignal?.toUpperCase()}
                      </p>
                      <p style={{ fontSize: 11, color: muted }}>{intervieweeName || 'Customer'}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{analysis.pmfSummary}</p>
                </div>

                {/* Themes */}
                {analysis.themes && analysis.themes.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, marginBottom: 8 }}>Themes ({analysis.themes.length})</p>
                    {analysis.themes.map((t, i) => (
                      <div key={i} style={{ background: surf, borderRadius: 8, padding: "12px 14px", border: `1px solid ${bdr}`, marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{t.theme}</p>
                          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: t.frequency === 'high' ? red : t.frequency === 'medium' ? amber : muted }}>{t.frequency} freq</span>
                        </div>
                        <p style={{ fontSize: 12, color: blue, marginBottom: 6 }}>→ {t.insight}</p>
                        {t.quotes.slice(0, 1).map((q, qi) => (
                          <p key={qi} style={{ fontSize: 11, color: muted, fontStyle: "italic" }}>&quot;{q}&quot;</p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Pain Points + Feature Requests side by side */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {analysis.painPoints && analysis.painPoints.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, marginBottom: 8 }}>Pain Points</p>
                      {analysis.painPoints.map((p, i) => (
                        <div key={i} style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 12px", border: `1px solid #FECACA`, marginBottom: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{p.pain}</p>
                            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: severityColor[p.severity] ?? muted }}>{p.severity}</span>
                          </div>
                          <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>Now: {p.currentWorkaround}</p>
                          {p.willingnessToPay && <p style={{ fontSize: 10, color: green, fontWeight: 600, marginTop: 3 }}>✓ Willing to pay</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {analysis.featureRequests && analysis.featureRequests.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, marginBottom: 8 }}>Feature Requests</p>
                      {analysis.featureRequests.map((f, i) => (
                        <div key={i} style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 12px", border: `1px solid #BFDBFE`, marginBottom: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{f.feature}</p>
                            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: priorityColor[f.priority] ?? muted }}>{f.priority}</span>
                          </div>
                          <p style={{ fontSize: 11, color: muted }}>{f.context}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Key Quotes */}
                {analysis.keyQuotes && analysis.keyQuotes.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, marginBottom: 8 }}>Key Quotes</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {analysis.keyQuotes.map((q, i) => {
                        const typeColor: Record<string, string> = { pain: red, praise: green, 'feature-request': blue, objection: amber };
                        return (
                          <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, borderLeft: `3px solid ${typeColor[q.type] ?? muted}` }}>
                            <p style={{ fontSize: 12, color: ink, fontStyle: "italic", lineHeight: 1.6 }}>&quot;{q.quote}&quot;</p>
                            <p style={{ fontSize: 10, color: typeColor[q.type] ?? muted, fontWeight: 600, marginTop: 4, textTransform: "capitalize" }}>{q.type.replace('-', ' ')}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                {analysis.nextSteps && analysis.nextSteps.length > 0 && (
                  <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "12px 14px", border: `1px solid #BBF7D0` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: green, marginBottom: 6 }}>Next Steps</p>
                    {analysis.nextSteps.map((s, i) => <p key={i} style={{ fontSize: 12, color: ink, marginBottom: 3 }}>• {s}</p>)}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => { setAnalysis(null); setNotes(""); setName(""); setRole(""); }} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Analyze Another</button>
                  <button onClick={() => setShowModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: ink, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Fake door sub-component (used inside PMFSurveyRenderer)
export function FakeDoorSection({ artifactId, userId: _userId, data }: { artifactId?: string; userId?: string; data: Record<string, unknown> }) {
  const [showModal, setShowModal]       = useState(false);
  const [featureName, setFeatureName]   = useState("");
  const [tagline, setTagline]           = useState("");
  const [ctaText, setCtaText]           = useState("Join the waitlist");
  const [deploying, setDeploying]       = useState(false);
  const [liveUrl, setLiveUrl]           = useState<string | null>(null);
  const [deployError, setDeployError]   = useState<string | null>(null);
  const [signupCount, setSignupCount]   = useState<number | null>(null);

  // Pre-fill from artifact data
  useEffect(() => {
    const d = data as { targetSegment?: string };
    if (d.targetSegment && !featureName) setFeatureName("");
  }, [data, featureName]);

  // Load existing deployment
  useEffect(() => {
    if (!artifactId) return;
    fetch(`/api/agents/nova/fake-door?artifactId=${artifactId}`)
      .then(r => r.json())
      .then(d => { if (d.site?.url) setLiveUrl(d.site.url); })
      .catch(() => {});
  }, [artifactId]);

  // Load signup count when we have a live URL
  useEffect(() => {
    if (!artifactId || !liveUrl) return;
    fetch(`/api/waitlist?testId=${artifactId}`)
      .then(r => r.json())
      .then(d => { if (d.count !== undefined) setSignupCount(d.count); })
      .catch(() => {});
  }, [artifactId, liveUrl]);

  async function handleDeploy() {
    if (!featureName.trim() || !tagline.trim() || deploying) return;
    setDeploying(true); setDeployError(null);
    try {
      const res = await fetch('/api/agents/nova/fake-door', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureName, tagline, ctaText, artifactId }),
      });
      const result = await res.json();
      if (res.ok) { setLiveUrl(result.url); setShowModal(false); }
      else setDeployError(result.error ?? 'Deploy failed — check NETLIFY_API_KEY');
    } catch { setDeployError('Network error'); }
    finally { setDeploying(false); }
  }

  const teal = "#0D9488";

  return (
    <div style={{ background: surf, borderRadius: 12, padding: "16px 18px", border: `1px solid ${bdr}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Fake Door Test</p>
          {liveUrl ? (
            <div>
              <a href={liveUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: muted, textDecoration: "underline", wordBreak: "break-all" }}>{liveUrl}</a>
              {signupCount !== null && (
                <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginTop: 6 }}>
                  <span style={{ fontSize: 18 }}>{signupCount}</span> <span style={{ color: muted, fontWeight: 400 }}>waitlist signup{signupCount !== 1 ? "s" : ""}</span>
                </p>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: muted }}>Deploy a landing page for an unbuilt feature — measure real demand before writing code.</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 12 }}>
          {liveUrl && <a href={liveUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>View</a>}
          <button onClick={() => setShowModal(true)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {liveUrl ? "Redeploy" : "Create Test"}
          </button>
        </div>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Create Fake Door Test</p>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: muted }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Feature Name *</label>
                <input value={featureName} onChange={e => setFeatureName(e.target.value)} placeholder="e.g. AI-powered analytics dashboard" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Tagline *</label>
                <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Know what's happening before your customers do" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>CTA Button Text</label>
                <input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="Join the waitlist" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
              {deployError && <p style={{ fontSize: 12, color: red }}>{deployError}</p>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setShowModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleDeploy} disabled={deploying || !featureName.trim() || !tagline.trim()} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: deploying ? bdr : teal, color: deploying ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: deploying ? "not-allowed" : "pointer" }}>
                  {deploying ? "Deploying…" : "Deploy Test Page"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPETITIVE MATRIX RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
