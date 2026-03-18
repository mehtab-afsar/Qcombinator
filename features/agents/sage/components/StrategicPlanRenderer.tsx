'use client'

import { useState, useEffect } from 'react'
import { bg, surf, bdr, ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

export function StrategicPlanRenderer({ data, artifactId }: { data: Record<string, unknown>; artifactId?: string }) {
  const d = data as {
    vision?: string;
    currentPosition?: string;
    coreBets?: string[];
    okrs?: { objective: string; keyResults: { kr: string; target: string; metric: string }[] }[];
    roadmap?: { now: { initiative: string; rationale: string }[]; next: { initiative: string; rationale: string }[]; later: { initiative: string; rationale: string }[] };
    risks?: { risk: string; probability: string; impact: string; mitigation: string }[];
    fundraisingMilestones?: string[];
  };

  const [showSageModal, setShowSageModal]       = useState(false);
  const [sageRecipients, setSageRecipients]     = useState("");
  const [sageSending, setSageSending]           = useState(false);
  const [sageSent, setSageSent]                 = useState(false);
  const [sageError, setSageError]               = useState<string | null>(null);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [briefingResult, setBriefingResult]     = useState<Record<string, unknown> | null>(null);
  const [briefingError, setBriefingError]       = useState<string | null>(null);

  // Strategic contradiction detection state
  const [detectingContradictions, setDetectingContradictions] = useState(false);
  const [contradictionResult, setContradictionResult]         = useState<{
    contradictions?: { area: string; description: string; artifactA: string; artifactB: string; severity: string; recommendation: string }[];
    alignmentScore?: number;
    summary?: string;
    strongestAlignments?: string[];
  } | null>(null);
  const [contradictionError, setContradictionError]           = useState<string | null>(null);

  async function handleDetectContradictions() {
    if (detectingContradictions) return;
    setDetectingContradictions(true); setContradictionError(null); setContradictionResult(null);
    try {
      const res = await fetch('/api/agents/sage/contradictions', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.analysis) setContradictionResult(r.analysis);
      else setContradictionError(r.error ?? 'Detection failed');
    } catch { setContradictionError('Network error'); }
    finally { setDetectingContradictions(false); }
  }

  // Weekly standup state
  const [standupSent, setStandupSent]           = useState(false);
  const [sendingStandup, setSendingStandup]     = useState(false);
  const [standupError, setStandupError]         = useState<string | null>(null);

  async function handleSendStandup() {
    if (sendingStandup || standupSent) return;
    setSendingStandup(true); setStandupError(null);
    try {
      const res = await fetch('/api/agents/sage/standup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifactId }),
      });
      if (res.ok) setStandupSent(true);
      else { const r = await res.json(); setStandupError(r.error ?? 'Failed to send'); }
    } catch { setStandupError('Network error'); }
    finally { setSendingStandup(false); }
  }

  // Goal check-in state
  const [showCheckinPanel, setShowCheckinPanel] = useState(false);
  const [checkinProgress, setCheckinProgress]  = useState<Record<string, number>>({});
  const [checkinBlockers, setCheckinBlockers]  = useState<Record<string, string>>({});
  const [checkinNote, setCheckinNote]          = useState("");
  const [submittingCheckin, setSubmittingCheckin] = useState(false);
  const [checkinResult, setCheckinResult]      = useState<{
    avgProgress?: number;
    feedback?: { headline?: string; momentum?: string; wins?: string[]; risks?: string[]; focusNext?: string; blockerAdvice?: string | null; motivationalNote?: string };
  } | null>(null);
  const [checkinError, setCheckinError]        = useState<string | null>(null);
  const [checkinHistory, setCheckinHistory]    = useState<{ description: string; created_at: string; metadata: Record<string, unknown> }[]>([]);

  // Decision journal state
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionText, setDecisionText]           = useState("");
  const [decisionReasoning, setDecisionReasoning] = useState("");
  const [decisionAlternatives, setDecisionAlternatives] = useState("");
  const [decisionOutcome, setDecisionOutcome]     = useState("");
  const [decisionCategory, setDecisionCategory]   = useState("product");
  const [loggingDecision, setLoggingDecision]     = useState(false);
  const [decisionResult, setDecisionResult]       = useState<{
    assessment?: string; confidence?: string; reversibility?: string; watchFor?: string; reminderDate?: string;
  } | null>(null);
  const [decisionError, setDecisionError]         = useState<string | null>(null);
  const [decisions, setDecisions]                 = useState<{ id: string; description: string; created_at: string; metadata: Record<string, unknown> }[]>([]);

  // Focus Today state
  const [loadingFocus, setLoadingFocus]   = useState(false);
  const [focusResult, setFocusResult]     = useState<{
    topPriority?: { action?: string; whyNow?: string; urgency?: string; estimatedImpact?: string; agent?: string };
    context?: string;
    secondaryPriorities?: { action: string; reason: string; urgency: string }[];
    avoidToday?: string;
  } | null>(null);
  const [focusError, setFocusError]       = useState<string | null>(null);

  // Pivot Signal Monitoring state
  const [showPivotPanel, setShowPivotPanel]       = useState(false);
  const [runningPivot, setRunningPivot]           = useState(false);
  const [pivotResult, setPivotResult]             = useState<{
    pivotScore?: number;
    recommendation?: string;
    verdict?: string;
    redFlags?: string[];
    greenLights?: string[];
    pivotOptions?: { type: string; description: string; rationale: string; risk: string }[];
    persevereCase?: string;
    nextCheckpoint?: string;
    urgency?: string;
  } | null>(null);
  const [pivotSignals, setPivotSignals]           = useState<Record<string, unknown> | null>(null);
  const [pivotError, setPivotError]               = useState<string | null>(null);

  async function handlePivotEval() {
    if (runningPivot) return;
    setRunningPivot(true); setPivotError(null); setPivotResult(null); setPivotSignals(null);
    try {
      const res = await fetch('/api/agents/sage/pivot', { method: 'POST' });
      const r = await res.json();
      if (res.ok) { setPivotResult(r.evaluation ?? null); setPivotSignals(r.signals ?? null); }
      else setPivotError(r.error ?? 'Evaluation failed');
    } catch { setPivotError('Network error'); }
    finally { setRunningPivot(false); }
  }

  // Board Meeting Prep state
  const [showBoardPrepPanel, setShowBoardPrepPanel] = useState(false);
  const [generatingBoardPrep, setGeneratingBoardPrep] = useState(false);
  const [boardPrepResult, setBoardPrepResult]         = useState<{
    executiveSummary?: { headline: string; keyWin: string; keyChallenge: string; askFromBoard: string };
    financials?: { snapshot: string; trend: string; highlights: string[]; concerns: string[]; guidance: string };
    salesPipeline?: { snapshot: string; highlights: string[]; forecast: string; blockers: string[] };
    product?: { pmfStatus: string; npsComment: string; recentMilestones: string[]; roadmapPriorities: string[] };
    team?: { currentTeam: string; keyHires: string[]; teamRisks: string[]; culture: string };
    competitive?: { landscapeShift: string; ourAdvantage: string; threats: string[]; opportunities: string[] };
    strategy?: { currentBets: string[]; pivotSignals: string; fundraisingStatus: string; milestones: string[] };
    riskRegister?: { risk: string; likelihood: string; impact: string; mitigation: string }[];
    boardQuestions?: string[];
    appendixNotes?: string;
  } | null>(null);
  const [boardPrepError, setBoardPrepError]           = useState<string | null>(null);
  const [boardPrepSection, setBoardPrepSection]       = useState<"summary" | "financials" | "sales" | "product" | "team" | "competitive" | "strategy" | "risks">("summary");

  // Exit Strategy state
  const [generatingExitStrat, setGeneratingExitStrat] = useState(false);
  const [exitStratResult, setExitStratResult]         = useState<Record<string, unknown> | null>(null);
  const [exitStratError, setExitStratError]           = useState<string | null>(null);
  const [exitStratTab, setExitStratTab]               = useState<'paths' | 'acquirers' | 'readiness' | 'milestones'>('paths');

  async function handleGenerateExitStrategy() {
    if (generatingExitStrat) return;
    setGeneratingExitStrat(true); setExitStratError(null); setExitStratResult(null);
    try {
      const res = await fetch('/api/agents/sage/exit-strategy', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.strategy) setExitStratResult(r.strategy);
      else setExitStratError(r.error ?? 'Generation failed');
    } catch { setExitStratError('Network error'); }
    finally { setGeneratingExitStrat(false); }
  }

  // Board Communication state
  const [generatingBoardComm, setGeneratingBoardComm] = useState(false);
  const [boardCommResult, setBoardCommResult]         = useState<Record<string, unknown> | null>(null);
  const [boardCommError, setBoardCommError]           = useState<string | null>(null);
  const [boardCommTab, setBoardCommTab]               = useState<'update' | 'calendar' | 'asks' | 'redlines'>('update');

  async function handleGenerateBoardCommunication() {
    if (generatingBoardComm) return;
    setGeneratingBoardComm(true); setBoardCommError(null); setBoardCommResult(null);
    try {
      const res = await fetch('/api/agents/sage/board-communication', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.framework) setBoardCommResult(r.framework);
      else setBoardCommError(r.error ?? 'Generation failed');
    } catch { setBoardCommError('Network error'); }
    finally { setGeneratingBoardComm(false); }
  }

  // Investor Q&A Prep state
  const [generatingInvQA, setGeneratingInvQA]         = useState(false);
  const [invQAResult, setInvQAResult]                 = useState<Record<string, unknown> | null>(null);
  const [invQAError, setInvQAError]                   = useState<string | null>(null);
  const [invQASection, setInvQASection]               = useState<'tough' | 'financial' | 'vision' | 'founder'>('tough');

  async function handleGenerateInvestorQA() {
    if (generatingInvQA) return;
    setGeneratingInvQA(true); setInvQAError(null); setInvQAResult(null);
    try {
      const res = await fetch('/api/agents/sage/investor-qa-prep', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.prep) setInvQAResult(r.prep);
      else setInvQAError(r.error ?? 'Generation failed');
    } catch { setInvQAError('Network error'); }
    finally { setGeneratingInvQA(false); }
  }

  // Crisis Playbook state
  const [crisisType, setCrisisType]                   = useState('funding / cash crisis');
  const [generatingCrisis, setGeneratingCrisis]       = useState(false);
  const [crisisResult, setCrisisResult]               = useState<Record<string, unknown> | null>(null);
  const [crisisError, setCrisisError]                 = useState<string | null>(null);
  const [crisisSection, setCrisisSection]             = useState<'immediate' | 'stabilization' | 'comms' | 'recovery'>('immediate');

  async function handleGenerateCrisisPlaybook() {
    if (generatingCrisis) return;
    setGeneratingCrisis(true); setCrisisError(null); setCrisisResult(null);
    try {
      const res = await fetch('/api/agents/sage/crisis-playbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crisisType }),
      });
      const r = await res.json();
      if (res.ok && r.playbook) setCrisisResult(r.playbook);
      else setCrisisError(r.error ?? 'Generation failed');
    } catch { setCrisisError('Network error'); }
    finally { setGeneratingCrisis(false); }
  }

  // Team Alignment state
  const [generatingTA, setGeneratingTA]               = useState(false);
  const [taResult, setTaResult]                       = useState<Record<string, unknown> | null>(null);
  const [taError, setTaError]                         = useState<string | null>(null);
  const [taDimIdx, setTaDimIdx]                       = useState(0);

  async function handleGenerateTeamAlignment() {
    if (generatingTA) return;
    setGeneratingTA(true); setTaError(null); setTaResult(null);
    try {
      const res = await fetch('/api/agents/sage/team-alignment', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.assessment) setTaResult(r.assessment);
      else setTaError(r.error ?? 'Generation failed');
    } catch { setTaError('Network error'); }
    finally { setGeneratingTA(false); }
  }

  // OKR Tracker state
  const [generatingOKR, setGeneratingOKR]             = useState(false);
  const [okrResult, setOkrResult]                     = useState<Record<string, unknown> | null>(null);
  const [okrError, setOkrError]                       = useState<string | null>(null);
  const [okrObjIdx, setOkrObjIdx]                     = useState(0);

  async function handleGenerateOKRs() {
    if (generatingOKR) return;
    setGeneratingOKR(true); setOkrError(null); setOkrResult(null);
    try {
      const res = await fetch('/api/agents/sage/okr-tracker', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.okrs) setOkrResult(r.okrs);
      else setOkrError(r.error ?? 'Generation failed');
    } catch { setOkrError('Network error'); }
    finally { setGeneratingOKR(false); }
  }

  async function handleGenerateBoardPrep() {
    if (generatingBoardPrep) return;
    setGeneratingBoardPrep(true); setBoardPrepError(null); setBoardPrepResult(null);
    try {
      const res = await fetch('/api/agents/sage/board-prep', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.boardPacket) setBoardPrepResult(r.boardPacket);
      else setBoardPrepError(r.error ?? 'Generation failed');
    } catch { setBoardPrepError('Network error'); }
    finally { setGeneratingBoardPrep(false); }
  }

  useEffect(() => {
    // Fetch check-in history + decision journal
    fetch('/api/agents/sage/goals')
      .then(r => r.json())
      .then(data => {
        if (data.checkins) setCheckinHistory(data.checkins);
      })
      .catch(() => {});
    fetch('/api/agents/sage/decisions')
      .then(r => r.json())
      .then(data => {
        if (data.decisions) setDecisions(data.decisions);
      })
      .catch(() => {});
  }, []);

  async function handleLogDecision() {
    if (loggingDecision || !decisionText.trim()) return;
    setLoggingDecision(true); setDecisionError(null); setDecisionResult(null);
    try {
      const res = await fetch('/api/agents/sage/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: decisionText.trim(),
          reasoning: decisionReasoning.trim() || undefined,
          alternatives: decisionAlternatives.trim() || undefined,
          expectedOutcome: decisionOutcome.trim() || undefined,
          category: decisionCategory,
        }),
      });
      const r = await res.json();
      if (res.ok) {
        setDecisionResult(r.assessment);
        setDecisions(prev => [{ id: String(Date.now()), description: `Decision: "${decisionText.slice(0, 60)}"`, created_at: new Date().toISOString(), metadata: { decision: decisionText, assessment: r.assessment } }, ...prev]);
        setDecisionText(""); setDecisionReasoning(""); setDecisionAlternatives(""); setDecisionOutcome("");
      } else setDecisionError(r.error ?? 'Failed to log decision');
    } catch { setDecisionError('Network error'); }
    finally { setLoggingDecision(false); }
  }

  async function handleFocusToday() {
    if (loadingFocus) return;
    setLoadingFocus(true); setFocusError(null); setFocusResult(null);
    try {
      const res = await fetch('/api/agents/sage/focus', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.focus) setFocusResult(r.focus);
      else setFocusError(r.error ?? 'Failed to generate focus');
    } catch { setFocusError('Network error'); }
    finally { setLoadingFocus(false); }
  }

  async function handleSubmitCheckin() {
    if (submittingCheckin || !d.okrs || d.okrs.length === 0) return;
    const goals = d.okrs.map((okr, i) => ({
      id: `okr_${i}`,
      objective: okr.objective,
      progress: checkinProgress[`okr_${i}`] ?? 0,
      blocker: checkinBlockers[`okr_${i}`] || undefined,
    }));
    setSubmittingCheckin(true); setCheckinError(null); setCheckinResult(null);
    try {
      const res = await fetch('/api/agents/sage/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals, weekNote: checkinNote || undefined }),
      });
      const result = await res.json();
      if (res.ok) setCheckinResult(result);
      else setCheckinError(result.error ?? 'Check-in failed');
    } catch { setCheckinError('Network error'); }
    finally { setSubmittingCheckin(false); }
  }

  // Milestone countdown state
  const [milestones, setMilestones]         = useState<{ index: number; text: string; completed: boolean }[]>([]);
  const [milestoneTarget, setMilestoneTarget] = useState("");
  const [savingMilestone, setSavingMilestone] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/agents/sage/milestone')
      .then(r => r.json())
      .then(data => {
        if (data.milestones?.length) setMilestones(data.milestones);
      })
      .catch(() => {});
  }, []);

  async function handleToggleMilestone(ms: { index: number; text: string; completed: boolean }) {
    if (ms.completed || savingMilestone === ms.index) return;
    setSavingMilestone(ms.index);
    try {
      await fetch('/api/agents/sage/milestone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneIndex: ms.index, milestoneText: ms.text }),
      });
      setMilestones(prev => prev.map(m => m.index === ms.index ? { ...m, completed: true } : m));
    } catch { /* non-critical */ }
    finally { setSavingMilestone(null); }
  }

  // Linear OKR sync state
  const [showLinearModal, setShowLinearModal]   = useState(false);
  const [linearApiKey, setLinearApiKey]         = useState("");
  const [syncingLinear, setSyncingLinear]       = useState(false);
  const [linearResult, setLinearResult]         = useState<{ team: string; issues: { title: string; id: string; url: string }[]; count: number } | null>(null);
  const [linearError, setLinearError]           = useState<string | null>(null);

  // Cross-agent: detect if Felix recently updated metrics
  const [felixUpdate, setFelixUpdate]           = useState<{ description: string; created_at: string } | null>(null);

  useEffect(() => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // last 7 days
    fetch(`/api/agents/context?agentId=sage&since=${since}&limit=5`)
      .then(r => r.json())
      .then(d => {
        const felixEvent = (d.events ?? []).find((e: { agent_id: string; action_type: string }) =>
          e.agent_id === 'felix' && ['stripe_sync', 'mrr_updated', 'invoice_created'].includes(e.action_type)
        );
        if (felixEvent) setFelixUpdate(felixEvent);
      })
      .catch(() => {});
  }, []);

  async function handleSageUpdate() {
    const emails = sageRecipients.split(/[\n,]+/).map(r => r.trim()).filter(r => r.includes('@'));
    if (!emails.length || sageSending) return;
    setSageSending(true); setSageError(null);
    try {
      // First ensure investor contacts exist
      const creates = await Promise.all(emails.map(email =>
        fetch('/api/agents/investor/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: email.split('@')[0], email }),
        }).then(r => r.json())
      ));
      const contactIds = creates.map((c: Record<string, unknown>) => (c.contact as Record<string, unknown>)?.id).filter(Boolean) as string[];
      const res = await fetch('/api/agents/sage/investor-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds }),
      });
      if (res.ok) setSageSent(true);
      else { const r = await res.json(); setSageError(r.error ?? 'Failed'); }
    } catch { setSageError('Network error'); }
    finally { setSageSending(false); }
  }

  function handleBoardDeck() {
    // Generate a minimal HTML board deck (6 slides) from artifact data
    const slides = [
      {
        title: "Vision",
        content: d.vision || "Define your company vision",
        accent: "#2563EB",
      },
      {
        title: "Where We Are Today",
        content: d.currentPosition || "Current position in the market",
        accent: "#7C3AED",
      },
      {
        title: "Strategic Bets",
        content: (d.coreBets || []).map((b, i) => `${i + 1}. ${b}`).join("\n") || "Core strategic bets",
        accent: "#EA580C",
      },
      {
        title: "OKRs — This Quarter",
        content: (d.okrs || []).map((okr, i) => `O${i + 1}: ${okr.objective}\n${okr.keyResults.map(kr => `  • ${kr.kr} → ${kr.target}`).join("\n")}`).join("\n\n") || "Objectives and key results",
        accent: "#16A34A",
      },
      {
        title: "Risks & Mitigations",
        content: (d.risks || []).map(r => `[${r.probability?.toUpperCase() || "MED"}] ${r.risk}\n  → ${r.mitigation}`).join("\n\n") || "Key risks and mitigations",
        accent: "#DC2626",
      },
      {
        title: "Fundraising Milestones",
        content: (d.fundraisingMilestones || []).map(m => `→ ${m}`).join("\n") || "Key fundraising milestones",
        accent: "#0891B2",
      },
    ];

    const deckHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Board Deck</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, system-ui, sans-serif; background: #111; color: #fff; }
.deck { width: 100%; }
.slide { width: 100vw; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; padding: 80px; position: relative; page-break-after: always; }
.slide:nth-child(odd) { background: #0D0D0D; }
.slide:nth-child(even) { background: #111827; }
.accent-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 6px; }
.slide-num { font-size: 11px; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.14em; margin-bottom: 20px; }
h2 { font-size: 42px; font-weight: 800; line-height: 1.1; margin-bottom: 32px; max-width: 600px; }
pre { font-family: inherit; font-size: 18px; line-height: 1.8; color: rgba(255,255,255,0.8); white-space: pre-wrap; max-width: 740px; }
.nav { position: fixed; bottom: 32px; right: 40px; display: flex; gap: 10px; z-index: 100; }
.nav button { padding: 8px 20px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); color: #fff; font-size: 14px; cursor: pointer; backdrop-filter: blur(8px); }
.nav button:hover { background: rgba(255,255,255,0.16); }
.print-hint { position: fixed; top: 20px; right: 24px; font-size: 11px; color: rgba(255,255,255,0.3); }
@media print { .nav, .print-hint { display: none; } .slide { min-height: 100vh; } }
</style>
</head>
<body>
<p class="print-hint">Press Ctrl/Cmd+P to export as PDF</p>
<div class="deck" id="deck">
${slides.map((s, i) => `<section class="slide" id="slide-${i}">
  <div class="accent-bar" style="background:${s.accent}"></div>
  <div class="slide-num">Slide ${i + 1} / ${slides.length}</div>
  <h2 style="color:${s.accent}">${s.title}</h2>
  <pre>${s.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</section>`).join('\n')}
</div>
<div class="nav">
  <button onclick="scrollBy(-1)">← Prev</button>
  <button onclick="scrollBy(1)">Next →</button>
</div>
<script>
let cur = 0;
const slides = document.querySelectorAll('.slide');
function scrollBy(d) {
  cur = Math.max(0, Math.min(slides.length - 1, cur + d));
  slides[cur].scrollIntoView({ behavior: 'smooth' });
}
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') scrollBy(1);
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') scrollBy(-1);
});
</script>
</body>
</html>`;

    const blob = new Blob([deckHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'board-deck.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleGenerateBriefing() {
    if (generatingBriefing) return;
    setGeneratingBriefing(true); setBriefingError(null); setBriefingResult(null);
    try {
      const res = await fetch('/api/agents/sage/briefing', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.briefing) setBriefingResult(r.briefing.content as Record<string, unknown>);
      else setBriefingError(r.error ?? 'Failed to generate briefing');
    } catch { setBriefingError('Network error'); }
    finally { setGeneratingBriefing(false); }
  }

  async function handleLinearSync() {
    if (!linearApiKey.trim() || syncingLinear) return;
    setSyncingLinear(true); setLinearError(null); setLinearResult(null);
    try {
      const res = await fetch('/api/agents/sage/linear-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linearApiKey: linearApiKey.trim(), artifactId }),
      });
      const r = await res.json();
      if (res.ok) setLinearResult(r);
      else setLinearError(r.error ?? 'Sync failed');
    } catch { setLinearError('Network error'); }
    finally { setSyncingLinear(false); }
  }

  const sectionHead: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, marginBottom: 10 };
  const riskColor = (lvl: string) => lvl === "high" ? red : lvl === "medium" ? amber : green;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Focus Today ─────────────────────────────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: focusResult ? blue : ink, marginBottom: 2 }}>What should I work on right now?</p>
            <p style={{ fontSize: 11, color: muted }}>Sage pulls from all agents and tells you the single most important action today.</p>
          </div>
          <button onClick={handleFocusToday} disabled={loadingFocus} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: loadingFocus ? bdr : blue, color: loadingFocus ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: loadingFocus ? "not-allowed" : "pointer", flexShrink: 0 }}>
            {loadingFocus ? "Thinking…" : focusResult ? "Refresh" : "Ask Sage"}
          </button>
        </div>
        {focusError && <p style={{ fontSize: 12, color: red, marginTop: 8 }}>{focusError}</p>}
        {focusResult && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Top priority */}
            {focusResult.topPriority && (
              <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", border: `2px solid ${blue}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: focusResult.topPriority.urgency === "today" ? "#FEF2F2" : focusResult.topPriority.urgency === "this_week" ? "#FFFBEB" : surf, color: focusResult.topPriority.urgency === "today" ? red : focusResult.topPriority.urgency === "this_week" ? amber : muted }}>
                    {focusResult.topPriority.urgency === "today" ? "⚡ DO TODAY" : focusResult.topPriority.urgency === "this_week" ? "📅 THIS WEEK" : "NEXT WEEK"}
                  </span>
                  {focusResult.topPriority.agent && (
                    <span style={{ fontSize: 10, color: muted, fontWeight: 600 }}>→ {focusResult.topPriority.agent}</span>
                  )}
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: ink, marginBottom: 6, lineHeight: 1.4 }}>{focusResult.topPriority.action}</p>
                {focusResult.topPriority.whyNow && (
                  <p style={{ fontSize: 12, color: muted, lineHeight: 1.6, marginBottom: 6 }}>{focusResult.topPriority.whyNow}</p>
                )}
                {focusResult.topPriority.estimatedImpact && (
                  <p style={{ fontSize: 11, color: green, fontWeight: 600 }}>Expected: {focusResult.topPriority.estimatedImpact}</p>
                )}
              </div>
            )}
            {/* Context */}
            {focusResult.context && (
              <p style={{ fontSize: 12, color: muted, lineHeight: 1.6, fontStyle: "italic" }}>{focusResult.context}</p>
            )}
            {/* Secondary priorities */}
            {focusResult.secondaryPriorities && focusResult.secondaryPriorities.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: muted, marginBottom: 6 }}>Also on the radar</p>
                {focusResult.secondaryPriorities.map((sp, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0", borderBottom: i < focusResult.secondaryPriorities!.length - 1 ? `1px solid ${bdr}` : "none" }}>
                    <span style={{ fontSize: 10, color: muted, flexShrink: 0, marginTop: 2 }}>{sp.urgency === "this_week" ? "→" : "···"}</span>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{sp.action}</p>
                      <p style={{ fontSize: 11, color: muted }}>{sp.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Avoid today */}
            {focusResult.avoidToday && (
              <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "8px 12px", border: "1px solid #FECACA" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: red, marginBottom: 3 }}>SKIP TODAY</p>
                <p style={{ fontSize: 12, color: red }}>{focusResult.avoidToday}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Decision Journal ─────────────────────────────────────────────────── */}
      <div style={{ borderRadius: 12, border: `1px solid ${bdr}`, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: surf }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Decision Journal</p>
            <p style={{ fontSize: 11, color: muted }}>
              {decisions.length > 0 ? `${decisions.length} decision${decisions.length !== 1 ? 's' : ''} logged` : "Log key strategic decisions — Sage tracks outcomes and spots patterns"}
            </p>
          </div>
          <button onClick={() => { setShowDecisionModal(true); setDecisionResult(null); setDecisionError(null); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            Log Decision
          </button>
        </div>
        {decisions.length > 0 && (
          <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
            {decisions.slice(0, 4).map((dec, i) => {
              const meta = dec.metadata as Record<string, unknown>;
              const category = meta?.category as string | undefined;
              return (
                <div key={i} style={{ padding: "8px 0", borderBottom: i < Math.min(decisions.length, 4) - 1 ? `1px solid ${bdr}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    {category && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 999, background: surf, border: `1px solid ${bdr}`, color: muted, textTransform: "uppercase" }}>{category}</span>}
                    <span style={{ fontSize: 10, color: muted }}>{new Date(dec.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.4 }}>{(meta?.decision as string)?.slice(0, 100) ?? dec.description}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Decision Log Modal */}
      {showDecisionModal && (
        <div onClick={() => { if (!loggingDecision) { setShowDecisionModal(false); setDecisionResult(null); } }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Log a Strategic Decision</p>
              <button onClick={() => { setShowDecisionModal(false); setDecisionResult(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            {!decisionResult ? (
              <>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Category</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {["product", "hiring", "pricing", "fundraising", "strategy", "partnerships", "technology"].map(cat => (
                      <button key={cat} onClick={() => setDecisionCategory(cat)} style={{ padding: "4px 12px", borderRadius: 999, border: `1px solid ${decisionCategory === cat ? blue : bdr}`, background: decisionCategory === cat ? "#EFF6FF" : bg, color: decisionCategory === cat ? blue : muted, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Decision *</label>
                  <textarea value={decisionText} onChange={e => setDecisionText(e.target.value)} placeholder="e.g. We decided to pivot from B2C to B2B targeting mid-market SaaS companies" rows={3} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Why this decision? (reasoning)</label>
                  <textarea value={decisionReasoning} onChange={e => setDecisionReasoning(e.target.value)} placeholder="What data or insight drove this?" rows={2} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Alternatives considered</label>
                    <input value={decisionAlternatives} onChange={e => setDecisionAlternatives(e.target.value)} placeholder="What else did you consider?" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Expected outcome</label>
                    <input value={decisionOutcome} onChange={e => setDecisionOutcome(e.target.value)} placeholder="What should happen in 60d?" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                </div>
                {decisionError && <p style={{ fontSize: 12, color: red }}>{decisionError}</p>}
                <button onClick={handleLogDecision} disabled={loggingDecision || !decisionText.trim()} style={{ padding: "10px", borderRadius: 8, border: "none", background: loggingDecision || !decisionText.trim() ? bdr : blue, color: loggingDecision || !decisionText.trim() ? muted : "#fff", fontSize: 13, fontWeight: 700, cursor: loggingDecision || !decisionText.trim() ? "not-allowed" : "pointer" }}>
                  {loggingDecision ? "Logging…" : "Log & Get Sage Assessment"}
                </button>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: green }}>✓ Decision logged</p>
                {decisionResult.confidence && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 999, background: decisionResult.confidence === "high" ? "#F0FDF4" : decisionResult.confidence === "medium" ? "#FFFBEB" : "#FEF2F2", color: decisionResult.confidence === "high" ? green : decisionResult.confidence === "medium" ? amber : red, fontWeight: 700 }}>
                      Confidence: {decisionResult.confidence}
                    </span>
                    {decisionResult.reversibility && (
                      <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 999, background: surf, color: muted, fontWeight: 600 }}>
                        {decisionResult.reversibility === "easily_reversible" ? "↩ Reversible" : decisionResult.reversibility === "partially_reversible" ? "~ Partially reversible" : "⚠ Hard to reverse"}
                      </span>
                    )}
                  </div>
                )}
                {decisionResult.assessment && (
                  <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{decisionResult.assessment}</p>
                )}
                {decisionResult.watchFor && (
                  <div style={{ background: "#FFFBEB", borderRadius: 8, padding: "10px 14px", border: "1px solid #FDE68A" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: amber, marginBottom: 4 }}>WATCH FOR (next 30 days)</p>
                    <p style={{ fontSize: 12, color: ink }}>{decisionResult.watchFor}</p>
                  </div>
                )}
                {decisionResult.reminderDate && (
                  <p style={{ fontSize: 11, color: muted }}>📅 Review this decision: <strong>{decisionResult.reminderDate}</strong></p>
                )}
                <button onClick={() => { setShowDecisionModal(false); setDecisionResult(null); }} style={{ padding: "9px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Pivot Signal Monitoring ──────────────────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: pivotResult?.recommendation === "pivot_now" ? red : pivotResult?.recommendation === "explore" ? amber : ink, marginBottom: 2 }}>
              Pivot Signal Monitor
              {pivotResult?.recommendation && (
                <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: pivotResult.recommendation === "pivot_now" ? "#FEF2F2" : pivotResult.recommendation === "explore" ? "#FFFBEB" : "#F0FDF4", color: pivotResult.recommendation === "pivot_now" ? red : pivotResult.recommendation === "explore" ? amber : green, fontWeight: 700 }}>
                  {pivotResult.recommendation === "pivot_now" ? "⚠ PIVOT NOW" : pivotResult.recommendation === "explore" ? "🔍 EXPLORE" : "✓ PERSEVERE"}
                </span>
              )}
            </p>
            <p style={{ fontSize: 11, color: muted }}>Cross-signal analysis: Q-Score trend, pipeline health, PMF, financials — is your trajectory working?</p>
          </div>
          <button onClick={() => { if (showPivotPanel && !runningPivot) setShowPivotPanel(false); else { setShowPivotPanel(true); if (!pivotResult) handlePivotEval(); } }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: runningPivot ? bdr : (pivotResult?.recommendation === "pivot_now" ? red : pivotResult?.recommendation === "explore" ? amber : blue), color: runningPivot ? muted : "#fff", fontSize: 11, fontWeight: 600, cursor: runningPivot ? "not-allowed" : "pointer", flexShrink: 0 }}>
            {runningPivot ? "Analyzing…" : showPivotPanel ? "Close" : pivotResult ? "Refresh" : "Run Analysis"}
          </button>
        </div>
        {showPivotPanel && (
          <div style={{ marginTop: 14 }}>
            {runningPivot ? (
              <p style={{ fontSize: 12, color: muted, textAlign: "center", padding: "16px 0" }}>Pulling signals across Q-Score, pipeline, PMF, and financials…</p>
            ) : pivotError ? (
              <p style={{ fontSize: 12, color: red }}>{pivotError}</p>
            ) : pivotResult ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Pivot score + verdict */}
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  {typeof pivotResult.pivotScore === "number" && (
                    <div style={{ textAlign: "center", flexShrink: 0 }}>
                      <div style={{ width: 64, height: 64, borderRadius: "50%", background: pivotResult.pivotScore >= 76 ? "#FEF2F2" : pivotResult.pivotScore >= 51 ? "#FFFBEB" : pivotResult.pivotScore >= 26 ? "#EFF6FF" : "#F0FDF4", border: `3px solid ${pivotResult.pivotScore >= 76 ? red : pivotResult.pivotScore >= 51 ? amber : pivotResult.pivotScore >= 26 ? blue : green}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: pivotResult.pivotScore >= 76 ? red : pivotResult.pivotScore >= 51 ? amber : pivotResult.pivotScore >= 26 ? blue : green }}>{pivotResult.pivotScore}</span>
                        <span style={{ fontSize: 8, color: muted, fontWeight: 600 }}>PIVOT SCORE</span>
                      </div>
                      <p style={{ fontSize: 10, color: muted, marginTop: 4 }}>0=stay, 100=pivot</p>
                    </div>
                  )}
                  {pivotResult.verdict && (
                    <p style={{ fontSize: 13, color: ink, lineHeight: 1.7, flex: 1 }}>{pivotResult.verdict}</p>
                  )}
                </div>

                {/* Signals summary */}
                {pivotSignals && (
                  <div style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {typeof (pivotSignals as Record<string, unknown>).currentScore === "number" && (
                      <div><p style={{ fontSize: 9, fontWeight: 700, color: muted, textTransform: "uppercase" }}>Q-Score</p><p style={{ fontSize: 14, fontWeight: 700, color: ink }}>{String((pivotSignals as Record<string, unknown>).currentScore)}<span style={{ fontSize: 10, color: muted }}>/100</span></p></div>
                    )}
                    {(pivotSignals as Record<string, unknown>).winRate !== null && (pivotSignals as Record<string, unknown>).winRate !== undefined && (
                      <div><p style={{ fontSize: 9, fontWeight: 700, color: muted, textTransform: "uppercase" }}>Win Rate</p><p style={{ fontSize: 14, fontWeight: 700, color: ink }}>{String((pivotSignals as Record<string, unknown>).winRate)}%</p></div>
                    )}
                    {(pivotSignals as Record<string, unknown>).nps !== undefined && (
                      <div><p style={{ fontSize: 9, fontWeight: 700, color: muted, textTransform: "uppercase" }}>NPS</p><p style={{ fontSize: 14, fontWeight: 700, color: ink }}>{String((pivotSignals as Record<string, unknown>).nps)}</p></div>
                    )}
                    {(pivotSignals as Record<string, unknown>).mrr !== undefined && (
                      <div><p style={{ fontSize: 9, fontWeight: 700, color: muted, textTransform: "uppercase" }}>MRR</p><p style={{ fontSize: 14, fontWeight: 700, color: ink }}>${Number((pivotSignals as Record<string, unknown>).mrr).toLocaleString()}</p></div>
                    )}
                    {!!(pivotSignals as Record<string, unknown>).runway && (
                      <div><p style={{ fontSize: 9, fontWeight: 700, color: muted, textTransform: "uppercase" }}>Runway</p><p style={{ fontSize: 14, fontWeight: 700, color: ink }}>{String((pivotSignals as Record<string, unknown>).runway)}</p></div>
                    )}
                    {!!(pivotSignals as Record<string, unknown>).scoreDeclining && (
                      <div><p style={{ fontSize: 9, fontWeight: 700, color: red, textTransform: "uppercase" }}>Q-Score</p><p style={{ fontSize: 11, fontWeight: 700, color: red }}>↘ Declining</p></div>
                    )}
                  </div>
                )}

                {/* Red flags */}
                {pivotResult.redFlags && pivotResult.redFlags.length > 0 && (
                  <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 14px", border: "1px solid #FECACA" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: red, marginBottom: 6 }}>RED FLAGS</p>
                    {pivotResult.redFlags.map((f, i) => (
                      <p key={i} style={{ fontSize: 12, color: ink, marginBottom: 3 }}>⚠ {f}</p>
                    ))}
                  </div>
                )}

                {/* Green lights */}
                {pivotResult.greenLights && pivotResult.greenLights.length > 0 && (
                  <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 6 }}>GREEN LIGHTS</p>
                    {pivotResult.greenLights.map((g, i) => (
                      <p key={i} style={{ fontSize: 12, color: ink, marginBottom: 3 }}>✓ {g}</p>
                    ))}
                  </div>
                )}

                {/* Pivot options */}
                {pivotResult.pivotOptions && pivotResult.pivotOptions.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 8 }}>Pivot Options to Consider</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {pivotResult.pivotOptions.map((opt, i) => (
                        <div key={i} style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: blue }}>{opt.description}</p>
                            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 999, background: surf, color: muted, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{(opt.type ?? "").replace(/_/g, " ")}</span>
                          </div>
                          <p style={{ fontSize: 11, color: ink, marginBottom: 4, lineHeight: 1.5 }}>{opt.rationale}</p>
                          <p style={{ fontSize: 10, color: amber }}>Trade-off: {opt.risk}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Persevere case */}
                {pivotResult.persevereCase && (
                  <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 4 }}>STRONGEST CASE FOR STAYING THE COURSE</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{pivotResult.persevereCase}</p>
                  </div>
                )}

                {/* Next checkpoint */}
                {pivotResult.nextCheckpoint && (
                  <p style={{ fontSize: 11, color: muted }}>📅 Next review trigger: <strong style={{ color: ink }}>{pivotResult.nextCheckpoint}</strong></p>
                )}

                <button onClick={() => { setPivotResult(null); setPivotSignals(null); handlePivotEval(); }} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 12, cursor: "pointer", alignSelf: "flex-start" }}>
                  Re-evaluate Signals
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Board Meeting Prep ────────────────────────────────────────────────── */}
      <div style={{ background: showBoardPrepPanel && boardPrepResult ? "#0F172A" : surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${showBoardPrepPanel && boardPrepResult ? "#334155" : bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: showBoardPrepPanel && boardPrepResult ? "#94A3B8" : ink, marginBottom: 2 }}>Board Meeting Prep</p>
            <p style={{ fontSize: 11, color: muted }}>Full board packet — pulls from all agents: Felix financials, Susi pipeline, Atlas competitive, Harper team, Nova PMF, Q-Score.</p>
          </div>
          <button onClick={() => { if (showBoardPrepPanel && !generatingBoardPrep) setShowBoardPrepPanel(false); else { setShowBoardPrepPanel(true); if (!boardPrepResult) handleGenerateBoardPrep(); } }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: generatingBoardPrep ? bdr : "#1E293B", color: generatingBoardPrep ? muted : "#94A3B8", fontSize: 11, fontWeight: 600, cursor: generatingBoardPrep ? "not-allowed" : "pointer" }}>
            {generatingBoardPrep ? "Preparing…" : showBoardPrepPanel ? "Close" : boardPrepResult ? "View Packet" : "Prepare Board Pack"}
          </button>
        </div>
        {showBoardPrepPanel && (
          <div style={{ marginTop: 14 }}>
            {generatingBoardPrep && (
              <p style={{ fontSize: 12, color: muted, textAlign: "center", padding: "16px 0" }}>Pulling data from all agents to build your board packet…</p>
            )}
            {boardPrepError && <p style={{ fontSize: 12, color: red }}>{boardPrepError}</p>}
            {boardPrepResult && !generatingBoardPrep && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Section nav */}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {([
                    ["summary", "Executive Summary"],
                    ["financials", "Financials"],
                    ["sales", "Pipeline"],
                    ["product", "Product"],
                    ["team", "Team"],
                    ["competitive", "Competitive"],
                    ["strategy", "Strategy"],
                    ["risks", "Risk Register"],
                  ] as const).map(([key, label]) => (
                    <button key={key} onClick={() => setBoardPrepSection(key)} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: boardPrepSection === key ? "#3B82F6" : "#1E293B", color: boardPrepSection === key ? "#fff" : "#94A3B8", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Executive Summary */}
                {boardPrepSection === "summary" && boardPrepResult.executiveSummary && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ background: "#1E293B", borderRadius: 10, padding: "16px 18px", border: "1px solid #334155" }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: "#F8FAFC", lineHeight: 1.3 }}>{boardPrepResult.executiveSummary.headline}</p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div style={{ background: "#1E293B", borderRadius: 8, padding: "12px 14px", border: "1px solid #334155" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#22C55E", textTransform: "uppercase", marginBottom: 6 }}>KEY WIN</p>
                        <p style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.6 }}>{boardPrepResult.executiveSummary.keyWin}</p>
                      </div>
                      <div style={{ background: "#1E293B", borderRadius: 8, padding: "12px 14px", border: "1px solid #334155" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#EF4444", textTransform: "uppercase", marginBottom: 6 }}>KEY CHALLENGE</p>
                        <p style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.6 }}>{boardPrepResult.executiveSummary.keyChallenge}</p>
                      </div>
                    </div>
                    <div style={{ background: "#1E293B", borderRadius: 8, padding: "12px 14px", border: "1px solid #3B82F6" }}>
                      <p style={{ fontSize: 9, fontWeight: 700, color: "#3B82F6", textTransform: "uppercase", marginBottom: 6 }}>ASK FROM BOARD</p>
                      <p style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.6 }}>{boardPrepResult.executiveSummary.askFromBoard}</p>
                    </div>
                    {boardPrepResult.boardQuestions && boardPrepResult.boardQuestions.length > 0 && (
                      <div style={{ background: "#1E293B", borderRadius: 8, padding: "12px 14px", border: "1px solid #334155" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 8 }}>BOARD QUESTIONS TO DRIVE</p>
                        {boardPrepResult.boardQuestions.map((q, i) => <p key={i} style={{ fontSize: 12, color: "#CBD5E1", marginBottom: 6, lineHeight: 1.5 }}>Q{i + 1}: {q}</p>)}
                      </div>
                    )}
                  </div>
                )}

                {/* Financials section */}
                {boardPrepSection === "financials" && boardPrepResult.financials && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ background: "#1E293B", borderRadius: 10, padding: "14px 16px", border: "1px solid #334155" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>Snapshot</p>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: boardPrepResult.financials.trend === "improving" ? "#064E3B" : boardPrepResult.financials.trend === "declining" ? "#7F1D1D" : "#1E3A5F", color: boardPrepResult.financials.trend === "improving" ? "#22C55E" : boardPrepResult.financials.trend === "declining" ? "#EF4444" : "#60A5FA", fontWeight: 700 }}>
                          {boardPrepResult.financials.trend}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.7 }}>{boardPrepResult.financials.snapshot}</p>
                    </div>
                    {boardPrepResult.financials.highlights && boardPrepResult.financials.highlights.length > 0 && (
                      <div style={{ background: "#064E3B", borderRadius: 8, padding: "10px 14px", border: "1px solid #065F46" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#22C55E", textTransform: "uppercase", marginBottom: 6 }}>HIGHLIGHTS</p>
                        {boardPrepResult.financials.highlights.map((h, i) => <p key={i} style={{ fontSize: 12, color: "#D1FAE5", marginBottom: 3 }}>✓ {h}</p>)}
                      </div>
                    )}
                    {boardPrepResult.financials.concerns && boardPrepResult.financials.concerns.length > 0 && (
                      <div style={{ background: "#7F1D1D", borderRadius: 8, padding: "10px 14px", border: "1px solid #991B1B" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#EF4444", textTransform: "uppercase", marginBottom: 6 }}>CONCERNS</p>
                        {boardPrepResult.financials.concerns.map((c, i) => <p key={i} style={{ fontSize: 12, color: "#FECACA", marginBottom: 3 }}>⚠ {c}</p>)}
                      </div>
                    )}
                    {boardPrepResult.financials.guidance && (
                      <div style={{ background: "#1E293B", borderRadius: 8, padding: "10px 14px", border: "1px solid #334155" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4 }}>QUARTERLY GUIDANCE</p>
                        <p style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.6, fontStyle: "italic" }}>{boardPrepResult.financials.guidance}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Sales Pipeline section */}
                {boardPrepSection === "sales" && boardPrepResult.salesPipeline && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ background: "#1E293B", borderRadius: 10, padding: "14px 16px", border: "1px solid #334155" }}>
                      <p style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.7 }}>{boardPrepResult.salesPipeline.snapshot}</p>
                    </div>
                    {boardPrepResult.salesPipeline.highlights && boardPrepResult.salesPipeline.highlights.length > 0 && (
                      <div style={{ background: "#1E293B", borderRadius: 8, padding: "10px 14px", border: "1px solid #334155" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 6 }}>KEY DEALS</p>
                        {boardPrepResult.salesPipeline.highlights.map((h, i) => <p key={i} style={{ fontSize: 12, color: "#CBD5E1", marginBottom: 4 }}>• {h}</p>)}
                      </div>
                    )}
                    {boardPrepResult.salesPipeline.forecast && (
                      <div style={{ background: "#1E3A5F", borderRadius: 8, padding: "10px 14px", border: "1px solid #1D4ED8" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#60A5FA", textTransform: "uppercase", marginBottom: 4 }}>FORECAST</p>
                        <p style={{ fontSize: 12, color: "#BFDBFE", lineHeight: 1.6 }}>{boardPrepResult.salesPipeline.forecast}</p>
                      </div>
                    )}
                    {boardPrepResult.salesPipeline.blockers && boardPrepResult.salesPipeline.blockers.length > 0 && (
                      <div style={{ background: "#7F1D1D", borderRadius: 8, padding: "10px 14px", border: "1px solid #991B1B" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#EF4444", textTransform: "uppercase", marginBottom: 6 }}>BLOCKERS</p>
                        {boardPrepResult.salesPipeline.blockers.map((b, i) => <p key={i} style={{ fontSize: 12, color: "#FECACA", marginBottom: 3 }}>⚠ {b}</p>)}
                      </div>
                    )}
                  </div>
                )}

                {/* Product section */}
                {boardPrepSection === "product" && boardPrepResult.product && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 999, fontWeight: 700, background: boardPrepResult.product.pmfStatus === "strong" ? "#064E3B" : boardPrepResult.product.pmfStatus === "emerging" ? "#1E3A5F" : "#7F1D1D", color: boardPrepResult.product.pmfStatus === "strong" ? "#22C55E" : boardPrepResult.product.pmfStatus === "emerging" ? "#60A5FA" : "#EF4444" }}>
                        PMF: {boardPrepResult.product.pmfStatus}
                      </span>
                      <p style={{ fontSize: 12, color: "#94A3B8" }}>{boardPrepResult.product.npsComment}</p>
                    </div>
                    {boardPrepResult.product.recentMilestones && boardPrepResult.product.recentMilestones.length > 0 && (
                      <div style={{ background: "#1E293B", borderRadius: 8, padding: "10px 14px", border: "1px solid #334155" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 6 }}>SHIPPED</p>
                        {boardPrepResult.product.recentMilestones.map((m, i) => <p key={i} style={{ fontSize: 12, color: "#CBD5E1", marginBottom: 3 }}>✓ {m}</p>)}
                      </div>
                    )}
                    {boardPrepResult.product.roadmapPriorities && boardPrepResult.product.roadmapPriorities.length > 0 && (
                      <div style={{ background: "#1E293B", borderRadius: 8, padding: "10px 14px", border: "1px solid #334155" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 6 }}>NEXT QUARTER</p>
                        {boardPrepResult.product.roadmapPriorities.map((r, i) => <p key={i} style={{ fontSize: 12, color: "#CBD5E1", marginBottom: 3 }}>→ {r}</p>)}
                      </div>
                    )}
                  </div>
                )}

                {/* Team section */}
                {boardPrepSection === "team" && boardPrepResult.team && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <p style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.7, background: "#1E293B", borderRadius: 10, padding: "14px 16px", border: "1px solid #334155" }}>{boardPrepResult.team.currentTeam}</p>
                    {boardPrepResult.team.keyHires && boardPrepResult.team.keyHires.length > 0 && (
                      <div style={{ background: "#1E3A5F", borderRadius: 8, padding: "10px 14px", border: "1px solid #1D4ED8" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#60A5FA", textTransform: "uppercase", marginBottom: 6 }}>CRITICAL HIRES</p>
                        {boardPrepResult.team.keyHires.map((h, i) => <p key={i} style={{ fontSize: 12, color: "#BFDBFE", marginBottom: 3 }}>• {h}</p>)}
                      </div>
                    )}
                    {boardPrepResult.team.teamRisks && boardPrepResult.team.teamRisks.length > 0 && (
                      <div style={{ background: "#7F1D1D", borderRadius: 8, padding: "10px 14px", border: "1px solid #991B1B" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#EF4444", textTransform: "uppercase", marginBottom: 6 }}>TEAM RISKS</p>
                        {boardPrepResult.team.teamRisks.map((r, i) => <p key={i} style={{ fontSize: 12, color: "#FECACA", marginBottom: 3 }}>⚠ {r}</p>)}
                      </div>
                    )}
                  </div>
                )}

                {/* Competitive section */}
                {boardPrepSection === "competitive" && boardPrepResult.competitive && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {boardPrepResult.competitive.landscapeShift && <p style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.7, background: "#1E293B", borderRadius: 10, padding: "14px 16px", border: "1px solid #334155" }}>{boardPrepResult.competitive.landscapeShift}</p>}
                    {boardPrepResult.competitive.ourAdvantage && (
                      <div style={{ background: "#064E3B", borderRadius: 8, padding: "10px 14px", border: "1px solid #065F46" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#22C55E", textTransform: "uppercase", marginBottom: 4 }}>WHERE WE WIN</p>
                        <p style={{ fontSize: 12, color: "#D1FAE5", lineHeight: 1.6 }}>{boardPrepResult.competitive.ourAdvantage}</p>
                      </div>
                    )}
                    {boardPrepResult.competitive.threats && boardPrepResult.competitive.threats.length > 0 && (
                      <div style={{ background: "#7F1D1D", borderRadius: 8, padding: "10px 14px", border: "1px solid #991B1B" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#EF4444", textTransform: "uppercase", marginBottom: 6 }}>THREATS</p>
                        {boardPrepResult.competitive.threats.map((t, i) => <p key={i} style={{ fontSize: 12, color: "#FECACA", marginBottom: 3 }}>⚠ {t}</p>)}
                      </div>
                    )}
                    {boardPrepResult.competitive.opportunities && boardPrepResult.competitive.opportunities.length > 0 && (
                      <div style={{ background: "#1E3A5F", borderRadius: 8, padding: "10px 14px", border: "1px solid #1D4ED8" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#60A5FA", textTransform: "uppercase", marginBottom: 6 }}>OPPORTUNITIES</p>
                        {boardPrepResult.competitive.opportunities.map((o, i) => <p key={i} style={{ fontSize: 12, color: "#BFDBFE", marginBottom: 3 }}>→ {o}</p>)}
                      </div>
                    )}
                  </div>
                )}

                {/* Strategy section */}
                {boardPrepSection === "strategy" && boardPrepResult.strategy && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {boardPrepResult.strategy.currentBets && boardPrepResult.strategy.currentBets.length > 0 && (
                      <div style={{ background: "#1E293B", borderRadius: 10, padding: "14px 16px", border: "1px solid #334155" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 8 }}>CURRENT BETS</p>
                        {boardPrepResult.strategy.currentBets.map((b, i) => <p key={i} style={{ fontSize: 13, color: "#F8FAFC", fontWeight: 600, marginBottom: 6 }}>{i + 1}. {b}</p>)}
                      </div>
                    )}
                    {boardPrepResult.strategy.pivotSignals && (
                      <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.6, padding: "0 4px" }}>Pivot signals: {boardPrepResult.strategy.pivotSignals}</p>
                    )}
                    {boardPrepResult.strategy.fundraisingStatus && (
                      <div style={{ background: "#1E3A5F", borderRadius: 8, padding: "10px 14px", border: "1px solid #1D4ED8" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#60A5FA", textTransform: "uppercase", marginBottom: 4 }}>FUNDRAISING</p>
                        <p style={{ fontSize: 12, color: "#BFDBFE", lineHeight: 1.6 }}>{boardPrepResult.strategy.fundraisingStatus}</p>
                      </div>
                    )}
                    {boardPrepResult.strategy.milestones && boardPrepResult.strategy.milestones.length > 0 && (
                      <div style={{ background: "#1E293B", borderRadius: 8, padding: "10px 14px", border: "1px solid #334155" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 6 }}>BEFORE NEXT BOARD MEETING</p>
                        {boardPrepResult.strategy.milestones.map((m, i) => <p key={i} style={{ fontSize: 12, color: "#CBD5E1", marginBottom: 3 }}>□ {m}</p>)}
                      </div>
                    )}
                  </div>
                )}

                {/* Risk Register section */}
                {boardPrepSection === "risks" && boardPrepResult.riskRegister && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {boardPrepResult.riskRegister.map((risk, i) => (
                      <div key={i} style={{ background: "#1E293B", borderRadius: 8, padding: "12px 14px", border: `1px solid ${risk.likelihood === "high" && risk.impact === "high" ? "#EF4444" : risk.likelihood === "high" || risk.impact === "high" ? "#F59E0B" : "#334155"}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: "#F8FAFC" }}>{risk.risk}</p>
                          <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 8 }}>
                            <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 999, background: "#0F172A", color: risk.likelihood === "high" ? "#EF4444" : risk.likelihood === "medium" ? "#F59E0B" : "#94A3B8", fontWeight: 700 }}>{risk.likelihood}</span>
                            <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 999, background: "#0F172A", color: risk.impact === "high" ? "#EF4444" : risk.impact === "medium" ? "#F59E0B" : "#94A3B8", fontWeight: 700 }}>{risk.impact} impact</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.5 }}>Mitigation: {risk.mitigation}</p>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => { setBoardPrepResult(null); setBoardPrepSection("summary"); handleGenerateBoardPrep(); }} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #334155", background: "#1E293B", color: "#94A3B8", fontSize: 12, cursor: "pointer", alignSelf: "flex-start" }}>
                  Refresh Board Pack
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Goal Check-in Panel ── */}
      {d.okrs && d.okrs.length > 0 && (
        <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Weekly Goal Check-in</p>
              <p style={{ fontSize: 11, color: muted }}>Update your OKR progress — Sage gives you accountability feedback and flags blockers.</p>
            </div>
            <button onClick={() => { setShowCheckinPanel(v => !v); setCheckinResult(null); setCheckinError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
              {showCheckinPanel ? "Close" : "Check In"}
            </button>
          </div>
          {/* History pills */}
          {checkinHistory.length > 0 && !showCheckinPanel && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {checkinHistory.slice(0, 3).map((c, ci) => {
                const pct = (c.metadata as Record<string, unknown>)?.avgProgress as number | undefined;
                return (
                  <span key={ci} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 999, background: bg, color: muted, border: `1px solid ${bdr}`, fontWeight: 600 }}>
                    {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{pct !== undefined ? ` · ${pct}%` : ''}
                  </span>
                );
              })}
            </div>
          )}
          {showCheckinPanel && !checkinResult && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              {d.okrs.map((okr, oi) => {
                const key = `okr_${oi}`;
                const prog = checkinProgress[key] ?? 0;
                return (
                  <div key={oi} style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 8 }}>O{oi + 1}: {okr.objective}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <input
                        type="range" min="0" max="100" step="5"
                        value={prog}
                        onChange={e => setCheckinProgress(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                        style={{ flex: 1, accentColor: green }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 700, color: prog >= 70 ? green : prog >= 40 ? amber : red, minWidth: 36, textAlign: "right" }}>{prog}%</span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 4, background: bdr, borderRadius: 2, marginBottom: 8 }}>
                      <div style={{ height: "100%", borderRadius: 2, width: `${prog}%`, background: prog >= 70 ? green : prog >= 40 ? amber : red, transition: "width 0.2s" }} />
                    </div>
                    <input
                      value={checkinBlockers[key] ?? ""}
                      onChange={e => setCheckinBlockers(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder="Any blockers? (optional)"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 11, color: ink, boxSizing: "border-box" }}
                    />
                  </div>
                );
              })}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>This week&apos;s note (optional)</label>
                <textarea
                  value={checkinNote}
                  onChange={e => setCheckinNote(e.target.value)}
                  placeholder="Anything you want Sage to know about this week…"
                  rows={2}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
              {checkinError && <p style={{ fontSize: 12, color: red }}>{checkinError}</p>}
              <button onClick={handleSubmitCheckin} disabled={submittingCheckin} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: submittingCheckin ? bdr : ink, color: submittingCheckin ? muted : bg, fontSize: 13, fontWeight: 600, cursor: submittingCheckin ? "not-allowed" : "pointer" }}>
                {submittingCheckin ? "Getting feedback…" : "Submit Check-in"}
              </button>
            </div>
          )}
          {checkinResult && checkinResult.feedback && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Momentum badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: checkinResult.feedback.momentum === "strong" ? "#F0FDF4" : checkinResult.feedback.momentum === "building" ? "#EFF6FF" : checkinResult.feedback.momentum === "stalled" ? "#FFFBEB" : "#FEF2F2", color: checkinResult.feedback.momentum === "strong" ? green : checkinResult.feedback.momentum === "building" ? blue : checkinResult.feedback.momentum === "stalled" ? amber : red, border: "1px solid transparent" }}>
                  {checkinResult.feedback.momentum === "strong" ? "🚀 Strong momentum" : checkinResult.feedback.momentum === "building" ? "📈 Building" : checkinResult.feedback.momentum === "stalled" ? "⚠ Stalled" : "🔴 Concerning"}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: ink }}>{checkinResult.avgProgress}% avg progress</span>
              </div>
              {checkinResult.feedback.headline && (
                <p style={{ fontSize: 13, fontWeight: 600, color: ink, lineHeight: 1.5 }}>{checkinResult.feedback.headline}</p>
              )}
              {/* Wins */}
              {checkinResult.feedback.wins && checkinResult.feedback.wins.length > 0 && (
                <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 6 }}>WINS</p>
                  {checkinResult.feedback.wins.map((w, wi) => <p key={wi} style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>✓ {w}</p>)}
                </div>
              )}
              {/* Risks */}
              {checkinResult.feedback.risks && checkinResult.feedback.risks.length > 0 && (
                <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 14px", border: "1px solid #FECACA" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: red, marginBottom: 6 }}>RISKS</p>
                  {checkinResult.feedback.risks.map((r, ri) => <p key={ri} style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>⚠ {r}</p>)}
                </div>
              )}
              {/* Focus next */}
              {checkinResult.feedback.focusNext && (
                <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: blue, marginBottom: 4 }}>FOCUS NEXT WEEK</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{checkinResult.feedback.focusNext}</p>
                </div>
              )}
              {checkinResult.feedback.blockerAdvice && (
                <p style={{ fontSize: 12, color: muted, fontStyle: "italic", lineHeight: 1.6 }}>💡 {checkinResult.feedback.blockerAdvice}</p>
              )}
              {checkinResult.feedback.motivationalNote && (
                <p style={{ fontSize: 12, color: muted, lineHeight: 1.6 }}>{checkinResult.feedback.motivationalNote}</p>
              )}
              <button onClick={() => { setCheckinResult(null); setCheckinProgress({}); setCheckinBlockers({}); setCheckinNote(""); }} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>
                ← New Check-in
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Weekly Standup CTA ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Send Weekly OKR Check-in</p>
          <p style={{ fontSize: 11, color: muted }}>Sage emails you a structured check-in with your OKRs — reply with progress %, blockers, and top wins.</p>
          {standupError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{standupError}</p>}
        </div>
        {standupSent ? (
          <span style={{ fontSize: 12, color: green, fontWeight: 600, flexShrink: 0 }}>✓ Check-in sent!</span>
        ) : (
          <button onClick={handleSendStandup} disabled={sendingStandup} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: sendingStandup ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: sendingStandup ? 0.7 : 1 }}>
            {sendingStandup ? "Sending…" : "Send Check-in"}
          </button>
        )}
      </div>

      {/* ── Felix cross-agent context banner ── */}
      {felixUpdate && (
        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>Felix updated your metrics — refresh investor update with real numbers?</p>
            <p style={{ fontSize: 11, color: muted, margin: "2px 0 0" }}>{felixUpdate.description}</p>
          </div>
          <button onClick={() => setShowSageModal(true)} style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: ink, color: bg, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Refresh Update</button>
          <button onClick={() => setFelixUpdate(null)} style={{ padding: "5px 8px", borderRadius: 7, border: "none", background: "transparent", color: muted, fontSize: 14, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* ── Investor Update CTA (Sage) ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Send Monthly Investor Update</p>
          <p style={{ fontSize: 11, color: muted }}>Sage pulls your Q-Score, metrics + OKRs and sends a YC-style update to investors.</p>
        </div>
        <button onClick={() => setShowSageModal(true)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          Send Update
        </button>
      </div>

      {/* ── Linear OKR Sync CTA ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Sync OKRs to Linear</p>
          <p style={{ fontSize: 11, color: muted }}>Create Linear Issues from your OKRs — one issue per objective with sub-issues for each key result.</p>
        </div>
        <button onClick={() => { setShowLinearModal(true); setLinearResult(null); setLinearError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          Sync to Linear
        </button>
      </div>

      {/* ── Board Deck CTA ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Build Board Deck</p>
          <p style={{ fontSize: 11, color: muted }}>Generate a 6-slide HTML board deck from your vision, OKRs, risks, and milestones. Export to PDF for sharing.</p>
        </div>
        <button onClick={handleBoardDeck} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          Download Deck
        </button>
      </div>

      {/* ── Weekly Briefing CTA ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 12, flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Generate Weekly Briefing</p>
            <p style={{ fontSize: 11, color: muted }}>Sage pulls data from all 9 agents — pipeline, outreach, Q-Score, hiring — and synthesises your week into a strategic briefing.</p>
            {briefingError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{briefingError}</p>}
          </div>
          <button onClick={handleGenerateBriefing} disabled={generatingBriefing} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingBriefing ? bdr : ink, color: generatingBriefing ? muted : bg, fontSize: 12, fontWeight: 600, cursor: generatingBriefing ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            {generatingBriefing ? "Generating…" : "Generate Briefing"}
          </button>
        </div>
        {briefingResult && (
          <div style={{ width: "100%", background: bg, border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {!!briefingResult.headline && (
              <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{String(briefingResult.headline)}</p>
            )}
            {!!briefingResult.scoreSummary && (
              <p style={{ fontSize: 12, color: muted, lineHeight: 1.6 }}>{String(briefingResult.scoreSummary)}</p>
            )}
            {Array.isArray(briefingResult.wins) && (briefingResult.wins as string[]).length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: green, marginBottom: 4 }}>Wins this week</p>
                {(briefingResult.wins as string[]).map((w, i) => (
                  <p key={i} style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>✓ {w}</p>
                ))}
              </div>
            )}
            {Array.isArray(briefingResult.risks) && (briefingResult.risks as string[]).length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: red, marginBottom: 4 }}>Watch out for</p>
                {(briefingResult.risks as string[]).map((r, i) => (
                  <p key={i} style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>⚠ {r}</p>
                ))}
              </div>
            )}
            {Array.isArray(briefingResult.nextWeekFocus) && (briefingResult.nextWeekFocus as string[]).length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: blue, marginBottom: 4 }}>Next week&apos;s focus</p>
                {(briefingResult.nextWeekFocus as string[]).map((f, i) => (
                  <p key={i} style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>→ {f}</p>
                ))}
              </div>
            )}
            {!!briefingResult.motivationalClose && (
              <p style={{ fontSize: 12, color: muted, fontStyle: "italic", borderTop: `1px solid ${bdr}`, paddingTop: 8, lineHeight: 1.6 }}>{String(briefingResult.motivationalClose)}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Strategic Contradiction Detection CTA ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Check for Strategic Contradictions</p>
            <p style={{ fontSize: 11, color: muted }}>Sage reads all your agent deliverables and flags misalignments — e.g. GTM targets SMBs but hiring plan has enterprise reps.</p>
            {contradictionError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{contradictionError}</p>}
          </div>
          <button
            onClick={handleDetectContradictions}
            disabled={detectingContradictions}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: detectingContradictions ? bdr : ink, color: detectingContradictions ? muted : bg, fontSize: 12, fontWeight: 600, cursor: detectingContradictions ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {detectingContradictions ? "Analysing…" : "Run Check"}
          </button>
        </div>
        {contradictionResult && (() => {
          const cr = contradictionResult;
          const sev = (s: string) => s === "high" ? red : s === "medium" ? amber : muted;
          const sevBg = (s: string) => s === "high" ? "#FEF2F2" : s === "medium" ? "#FFFBEB" : surf;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Alignment score */}
              {cr.alignmentScore !== undefined && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: surf, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${cr.alignmentScore}%`, background: (cr.alignmentScore ?? 0) >= 70 ? green : (cr.alignmentScore ?? 0) >= 50 ? amber : red, borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: (cr.alignmentScore ?? 0) >= 70 ? green : (cr.alignmentScore ?? 0) >= 50 ? amber : red }}>
                    {cr.alignmentScore}/100 alignment
                  </span>
                </div>
              )}
              {cr.summary && <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{cr.summary}</p>}

              {/* Contradictions */}
              {(cr.contradictions ?? []).length === 0 ? (
                <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: green }}>✓ No significant contradictions found — your strategy is well-aligned!</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(cr.contradictions ?? []).map((c, i) => (
                    <div key={i} style={{ background: sevBg(c.severity), borderRadius: 9, padding: "12px 14px", border: `1px solid ${sev(c.severity)}30` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: sev(c.severity) }}>{c.area}</p>
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: sev(c.severity), background: "#fff", padding: "2px 7px", borderRadius: 4, marginLeft: 8, flexShrink: 0 }}>{c.severity}</span>
                      </div>
                      <p style={{ fontSize: 12, color: ink, lineHeight: 1.5, marginBottom: 6 }}>{c.description}</p>
                      <p style={{ fontSize: 10, color: muted }}>↔ {c.artifactA} vs {c.artifactB}</p>
                      <p style={{ fontSize: 11, color: blue, marginTop: 6 }}>Fix: {c.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Strengths */}
              {(cr.strongestAlignments ?? []).length > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Well-aligned areas</p>
                  {(cr.strongestAlignments ?? []).map((s, i) => (
                    <p key={i} style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>✓ {s}</p>
                  ))}
                </div>
              )}

              <button onClick={() => setContradictionResult(null)} style={{ fontSize: 11, color: muted, background: "none", border: "none", cursor: "pointer", alignSelf: "flex-start", padding: 0 }}>Dismiss ✕</button>
            </div>
          );
        })()}
      </div>

      {/* ── Linear Modal ── */}
      {showLinearModal && (
        <div onClick={() => { if (!syncingLinear) setShowLinearModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Sync OKRs to Linear</p>
              <button onClick={() => setShowLinearModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            {linearResult ? (
              <div>
                <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "14px 16px", border: `1px solid #BBF7D0`, marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: green, marginBottom: 4 }}>✓ Synced {linearResult.count} OKR{linearResult.count !== 1 ? 's' : ''} to {linearResult.team}</p>
                  <p style={{ fontSize: 11, color: muted }}>Issues created with key results as sub-issues.</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto", marginBottom: 16 }}>
                  {linearResult.issues.map((issue) => (
                    <a key={issue.id} href={issue.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "8px 12px", background: surf, borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: "#7C3AED", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      ↗ {issue.title}
                    </a>
                  ))}
                </div>
                <button onClick={() => { setShowLinearModal(false); setLinearResult(null); setLinearApiKey(""); }} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "#7C3AED", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Done
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Linear Personal API Key *</label>
                  <input
                    type="password"
                    value={linearApiKey}
                    onChange={e => setLinearApiKey(e.target.value)}
                    placeholder="lin_api_xxxxxxxxxxxxxxxx"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }}
                  />
                  <p style={{ fontSize: 10, color: muted, marginTop: 4 }}>Settings → Security → Personal API keys (read+write). Never stored long-term.</p>
                </div>
                {linearError && <p style={{ fontSize: 12, color: red }}>{linearError}</p>}
                <button onClick={handleLinearSync} disabled={!linearApiKey.trim() || syncingLinear} style={{ padding: "10px", borderRadius: 8, border: "none", background: !linearApiKey.trim() ? bdr : "#7C3AED", color: !linearApiKey.trim() ? muted : "#fff", fontSize: 13, fontWeight: 700, cursor: !linearApiKey.trim() ? "not-allowed" : "pointer" }}>
                  {syncingLinear ? "Syncing…" : `Sync ${d.okrs?.length ?? 0} OKR${(d.okrs?.length ?? 0) !== 1 ? 's' : ''} to Linear`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sage Modal ── */}
      {showSageModal && (
        <div onClick={() => { if (!sageSending) setShowSageModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Send Investor Update</p>
              <button onClick={() => setShowSageModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            {sageSent ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 22, marginBottom: 10 }}>📨</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: green, marginBottom: 6 }}>Updates sent!</p>
                <button onClick={() => { setShowSageModal(false); setSageSent(false); setSageRecipients(""); }} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Done</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Investor Emails *</label>
                  <textarea value={sageRecipients} onChange={e => setSageRecipients(e.target.value)} placeholder="investor@vc.com&#10;partner@fund.com" rows={4} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, resize: "vertical", boxSizing: "border-box" }} />
                </div>
                {sageError && <p style={{ fontSize: 12, color: red }}>{sageError}</p>}
                <button onClick={handleSageUpdate} disabled={!sageRecipients || sageSending} style={{ padding: "10px", borderRadius: 8, border: "none", background: !sageRecipients ? bdr : blue, color: !sageRecipients ? muted : "#fff", fontSize: 13, fontWeight: 700, cursor: !sageRecipients ? "not-allowed" : "pointer" }}>
                  {sageSending ? "Sending…" : "Send Update"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {d.vision && (
        <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "14px 16px", border: `1px solid #BFDBFE` }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: blue, marginBottom: 6 }}>Vision</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: ink, lineHeight: 1.5 }}>{d.vision}</p>
        </div>
      )}

      {d.currentPosition && (
        <div style={{ background: surf, borderRadius: 10, padding: "12px 16px", border: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: muted, marginBottom: 6 }}>Current Position</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.currentPosition}</p>
        </div>
      )}

      {d.coreBets && d.coreBets.length > 0 && (
        <div>
          <p style={sectionHead}>Core Bets</p>
          {d.coreBets.map((bet, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: blue, flexShrink: 0 }}>Bet {i + 1}</span>
              <p style={{ fontSize: 13, color: ink, lineHeight: 1.5 }}>{bet}</p>
            </div>
          ))}
        </div>
      )}

      {d.okrs && d.okrs.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={sectionHead}>OKRs — This Quarter</p>
            <a
              href="https://linear.app/new"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                // Copy all OKRs as markdown for pasting into Linear/Notion
                const md = d.okrs!.map((okr, i) =>
                  `## O${i + 1}: ${okr.objective}\n${okr.keyResults.map(kr => `- **KR:** ${kr.kr} → ${kr.target} (${kr.metric})`).join("\n")}`
                ).join("\n\n");
                navigator.clipboard.writeText(md).catch(() => {});
              }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: "#EFF6FF", color: blue, textDecoration: "none",
                border: `1px solid #BFDBFE`, transition: "background .12s",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#DBEAFE")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#EFF6FF")}
              title="OKRs copied to clipboard — paste into Linear or Notion"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Export to Linear / Notion
            </a>
          </div>
          {d.okrs.map((okr, i) => (
            <div key={i} style={{ background: surf, borderRadius: 10, border: `1px solid ${bdr}`, padding: "14px 16px", marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 10 }}>O{i + 1}: {okr.objective}</p>
              {okr.keyResults.map((kr, ki) => (
                <div key={ki} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: 8, padding: "6px 0", borderTop: `1px solid ${bdr}` }}>
                  <p style={{ fontSize: 12, color: ink }}>{kr.kr}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: blue, textAlign: "right" }}>{kr.target}</p>
                  <p style={{ fontSize: 11, color: muted, textAlign: "right" }}>{kr.metric}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {d.roadmap && (
        <div>
          <p style={sectionHead}>Roadmap</p>
          {[
            { key: "now", label: "Now", color: green },
            { key: "next", label: "Next", color: amber },
            { key: "later", label: "Later", color: muted },
          ].map(({ key, label, color }) => {
            const items = d.roadmap![key as keyof typeof d.roadmap] as { initiative: string; rationale: string }[] || [];
            if (!items.length) return null;
            return (
              <div key={key} style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", marginBottom: 6 }}>{label}</p>
                {items.map((item, i) => (
                  <div key={i} style={{ padding: "8px 12px", background: "#fff", border: `1px solid ${bdr}`, borderRadius: 8, marginBottom: 6, borderLeft: `3px solid ${color}` }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 2 }}>{item.initiative}</p>
                    <p style={{ fontSize: 11, color: muted }}>{item.rationale}</p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {d.risks && d.risks.length > 0 && (
        <div>
          <p style={sectionHead}>Risk Register</p>
          {d.risks.map((r, i) => (
            <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{r.risk}</p>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ fontSize: 9, color: riskColor(r.probability), fontWeight: 700 }}>P:{r.probability}</span>
                  <span style={{ fontSize: 9, color: riskColor(r.impact), fontWeight: 700 }}>I:{r.impact}</span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: muted }}>Mitigation: {r.mitigation}</p>
            </div>
          ))}
        </div>
      )}

      {d.fundraisingMilestones && d.fundraisingMilestones.length > 0 && (() => {
        // Parse a rough target date from milestone text (Q1/Q2/Q3/Q4 or month name)
        function parseMilestoneDate(text: string): Date | null {
          const qMatch = text.match(/Q([1-4])\s+(\d{4})/i);
          if (qMatch) {
            const q = parseInt(qMatch[1]);
            const yr = parseInt(qMatch[2]);
            const endMonth = q * 3 - 1; // Q1→Feb(2), Q2→May(5), Q3→Aug(8), Q4→Nov(11)
            const d = new Date(yr, endMonth + 1, 0); // last day of that quarter
            return d;
          }
          const months = ["january","february","march","april","may","june","july","august","september","october","november","december"];
          const mMatch = text.match(new RegExp(`(${months.join("|")})\\s+(\\d{4})`, "i"));
          if (mMatch) {
            const mIdx = months.findIndex(m => m === mMatch[1].toLowerCase());
            return new Date(parseInt(mMatch[2]), mIdx + 1, 0);
          }
          const yearMatch = text.match(/\b(202[5-9]|203\d)\b/);
          if (yearMatch) return new Date(parseInt(yearMatch[1]), 11, 31);
          return null;
        }

        const now = new Date();
        const msItems = d.fundraisingMilestones!.map((m, mi) => {
          const target = parseMilestoneDate(m);
          const daysLeft = target ? Math.ceil((target.getTime() - now.getTime()) / 86400000) : null;
          return { idx: mi, text: m, target, daysLeft };
        });

        const hasAnyDate = msItems.some(m => m.target !== null);

        return (
          <div style={{ background: surf, borderRadius: 12, padding: "16px 18px", border: `1px solid ${bdr}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: ink, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Fundraising Milestones{hasAnyDate ? " · Countdown" : ""}
              </p>
              {milestones.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: muted }}>
                  {milestones.filter(m => m.completed).length}/{milestones.length} complete
                </span>
              )}
            </div>
            {/* Target date input */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
              <label style={{ fontSize: 11, color: muted, flexShrink: 0 }}>Target raise date:</label>
              <input type="date" value={milestoneTarget} onChange={e => setMilestoneTarget(e.target.value)} style={{ padding: "5px 8px", borderRadius: 6, border: `1px solid ${bdr}`, fontSize: 11, color: ink, background: "#fff" }} />
              {milestoneTarget && (() => {
                const days = Math.ceil((new Date(milestoneTarget).getTime() - Date.now()) / 86400000);
                return <span style={{ fontSize: 11, fontWeight: 700, color: days < 30 ? red : days < 90 ? amber : green }}>{days > 0 ? `${days} days` : "Today"}</span>;
              })()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {msItems.map((m, i) => {
                const overdue  = m.daysLeft !== null && m.daysLeft < 0;
                const urgent   = m.daysLeft !== null && m.daysLeft >= 0 && m.daysLeft <= 30;
                const upcoming = m.daysLeft !== null && m.daysLeft > 30 && m.daysLeft <= 90;
                const badgeColor = overdue ? red : urgent ? amber : upcoming ? "#0891B2" : green;
                const badgeBg   = overdue ? "#FEF2F2" : urgent ? "#FFFBEB" : upcoming ? "#F0F9FF" : "#F0FDF4";

                const formatDays = (n: number) => {
                  if (n < 0)   return `${Math.abs(n)}d overdue`;
                  if (n === 0) return "Today";
                  if (n < 7)   return `${n}d left`;
                  if (n < 30)  return `${Math.ceil(n / 7)}w left`;
                  return `${Math.ceil(n / 30)}mo left`;
                };

                // Check if this milestone is marked complete in DB state
                const dbMs = milestones.find(dbm => dbm.index === m.idx);
                const isComplete = dbMs?.completed ?? false;

                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: isComplete ? "#F0FDF4" : "#fff", borderRadius: 9, padding: "10px 12px", border: `1px solid ${isComplete ? "#BBF7D0" : "#D1FAE5"}` }}>
                    <button
                      onClick={() => dbMs && !isComplete ? handleToggleMilestone(dbMs) : (!isComplete ? handleToggleMilestone({ index: m.idx, text: m.text, completed: false }) : undefined)}
                      disabled={isComplete || savingMilestone === m.idx}
                      title={isComplete ? "Completed" : "Mark as complete"}
                      style={{ width: 20, height: 20, borderRadius: 999, border: `2px solid ${isComplete ? green : bdr}`, background: isComplete ? green : "transparent", cursor: isComplete ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontSize: 11 }}
                    >
                      {isComplete ? "✓" : savingMilestone === m.idx ? "…" : ""}
                    </button>
                    <p style={{ fontSize: 12, color: isComplete ? muted : ink, lineHeight: 1.55, flex: 1, margin: 0, textDecoration: isComplete ? "line-through" : "none" }}>{m.text}</p>
                    {m.daysLeft !== null && !isComplete && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: badgeColor, background: badgeBg,
                        borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap", flexShrink: 0,
                        border: `1px solid ${badgeColor}22`,
                      }}>
                        {formatDays(m.daysLeft)}
                      </span>
                    )}
                    {isComplete && <span style={{ fontSize: 10, fontWeight: 700, color: green, flexShrink: 0 }}>Done</span>}
                  </div>
                );
              })}
            </div>
            {!hasAnyDate && (
              <p style={{ fontSize: 11, color: muted, marginTop: 10, fontStyle: "italic" }}>
                Tip: include dates like &quot;Q2 2026&quot; or &quot;by June 2026&quot; in milestones to see countdowns.
              </p>
            )}
          </div>
        );
      })()}

      {/* ── OKR Tracker ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 20, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>OKR Framework</p>
            <p style={{ fontSize: 11, color: muted }}>Generate a full OKR framework aligned to your strategic plan for the current quarter.</p>
          </div>
          <button onClick={handleGenerateOKRs} disabled={generatingOKR}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingOKR ? bdr : blue, color: generatingOKR ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingOKR ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {generatingOKR ? "Building…" : "Build OKR Framework"}
          </button>
        </div>
        {okrError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{okrError}</p>}
        {okrResult && (() => {
          const objectives = (okrResult.companyObjectives as { objective: string; theme: string; keyResults: { kr: string; target: string; owner: string; confidence: number }[]; initiatives: string[] }[] | undefined) ?? [];
          const teamOKRs = (okrResult.teamOKRs as { team: string; objective: string; keyResults: { kr: string; target: string; owner: string }[] }[] | undefined) ?? [];
          const obj = objectives[okrObjIdx];
          return (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: blue, background: "#EFF6FF", borderRadius: 6, padding: "3px 8px" }}>{okrResult.quarter as string}</span>
                {!!okrResult.successDefinition && <p style={{ fontSize: 11, color: muted, fontStyle: "italic", margin: 0 }}>{okrResult.successDefinition as string}</p>}
              </div>
              {objectives.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Company Objectives</p>
                  <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                    {objectives.map((o, i) => (
                      <button key={i} onClick={() => setOkrObjIdx(i)}
                        style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${okrObjIdx === i ? blue : bdr}`, background: okrObjIdx === i ? "#EFF6FF" : bg, color: okrObjIdx === i ? blue : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        O{i + 1}: {o.theme}
                      </button>
                    ))}
                  </div>
                  {obj && (
                    <div style={{ background: surf, borderRadius: 10, padding: 14, border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 10 }}>{obj.objective}</p>
                      {obj.keyResults?.map((kr, ki) => (
                        <div key={ki} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8, padding: "8px 10px", background: bg, borderRadius: 8, border: `1px solid ${bdr}` }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: blue, flexShrink: 0, marginTop: 1 }}>KR{ki + 1}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 12, color: ink, marginBottom: 2 }}>{kr.kr}</p>
                            <div style={{ display: "flex", gap: 12 }}>
                              <span style={{ fontSize: 10, color: muted }}>Target: <strong style={{ color: green }}>{kr.target}</strong></span>
                              <span style={{ fontSize: 10, color: muted }}>Owner: {kr.owner}</span>
                              <span style={{ fontSize: 10, color: muted }}>Confidence: <strong style={{ color: kr.confidence >= 70 ? green : amber }}>{kr.confidence}%</strong></span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {!!(obj.initiatives as string[] | undefined)?.length && (
                        <div style={{ marginTop: 8 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Initiatives</p>
                          {(obj.initiatives as string[]).map((init, ii) => (
                            <p key={ii} style={{ fontSize: 11, color: ink, marginBottom: 2 }}>→ {init}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {teamOKRs.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Team OKRs</p>
                  {teamOKRs.map((t, ti) => (
                    <div key={ti} style={{ background: surf, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}`, marginBottom: 8 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 4 }}>{t.team}: {t.objective}</p>
                      {t.keyResults?.map((kr, ki) => (
                        <p key={ki} style={{ fontSize: 11, color: muted, marginBottom: 2 }}>• {kr.kr} → <strong>{kr.target}</strong></p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {!!okrResult.scoringGuide && (
                <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: green, marginBottom: 2 }}>Scoring Guide</p>
                  <p style={{ fontSize: 11, color: ink }}>{okrResult.scoringGuide as string}</p>
                </div>
              )}
              {!!(okrResult.commonPitfalls as string[] | undefined)?.length && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Common Pitfalls to Avoid</p>
                  {(okrResult.commonPitfalls as string[]).map((p, pi) => (
                    <p key={pi} style={{ fontSize: 11, color: muted, marginBottom: 2 }}>⚠ {p}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Exit Strategy ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: ink, margin: 0 }}>Exit Strategy</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Map your exit paths, target acquirers, valuation range, and readiness milestones.</p>
          </div>
          <button onClick={handleGenerateExitStrategy} disabled={generatingExitStrat} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingExitStrat ? bdr : blue, color: generatingExitStrat ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingExitStrat ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, marginLeft: 12 }}>
            {generatingExitStrat ? "Planning…" : "Plan Exit"}
          </button>
        </div>
        {exitStratError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{exitStratError}</p>}
        {exitStratResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              {!!exitStratResult.exitScore && (
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: blue + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: blue }}>{String(exitStratResult.exitScore)}</span>
                </div>
              )}
              {!!exitStratResult.verdict && <p style={{ fontSize: 12, color: muted, fontStyle: "italic" }}>{String(exitStratResult.verdict)}</p>}
            </div>
            {!!exitStratResult.valuationRange && (() => {
              const vr = exitStratResult.valuationRange as Record<string, unknown>;
              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {[["conservative", "Conservative", red], ["realistic", "Realistic", amber], ["optimistic", "Optimistic", green]].map(([key, label, color]) => (
                    !!vr[key] && (
                      <div key={key} style={{ textAlign: "center" as const, background: bg, borderRadius: 8, padding: 10, border: `1px solid ${bdr}` }}>
                        <p style={{ fontSize: 10, color: muted, marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: 13, fontWeight: 800, color: color as string }}>{String(vr[key])}</p>
                      </div>
                    )
                  ))}
                </div>
              );
            })()}
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" as const }}>
              {(["paths", "acquirers", "readiness", "milestones"] as const).map(t => (
                <button key={t} onClick={() => setExitStratTab(t)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${exitStratTab === t ? blue : bdr}`, background: exitStratTab === t ? blue : bg, color: exitStratTab === t ? "#fff" : ink, fontSize: 11, fontWeight: exitStratTab === t ? 700 : 400, cursor: "pointer" }}>
                  {t === "paths" ? "🛤 Exit Paths" : t === "acquirers" ? "🏢 Acquirers" : t === "readiness" ? "⚠️ Readiness Gaps" : "🎯 Milestones"}
                </button>
              ))}
            </div>
            {exitStratTab === "paths" && !!exitStratResult.exitPaths && (() => {
              const paths = exitStratResult.exitPaths as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  {paths.map((p, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{String(p.path ?? '')}</p>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                          {!!p.probability && <span style={{ fontSize: 10, background: green + "22", color: green, borderRadius: 20, padding: "2px 7px", fontWeight: 700 }}>{String(p.probability)}</span>}
                          {!!p.timeHorizon && <span style={{ fontSize: 10, color: muted }}>{String(p.timeHorizon)}</span>}
                        </div>
                      </div>
                      {!!p.targetValuation && <p style={{ fontSize: 11, color: blue, marginBottom: 4 }}><b>Valuation:</b> {String(p.targetValuation)}</p>}
                      {!!p.bestFor && <p style={{ fontSize: 11, color: muted }}>{String(p.bestFor)}</p>}
                    </div>
                  ))}
                </div>
              );
            })()}
            {exitStratTab === "acquirers" && !!exitStratResult.acquirerProfiles && (() => {
              const acqs = exitStratResult.acquirerProfiles as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  {acqs.map((a, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 4 }}>{String(a.acquirerType ?? '')}</p>
                      {!!a.examples && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 6 }}>{(a.examples as string[]).map((e, j) => <span key={j} style={{ fontSize: 10, background: surf, border: `1px solid ${bdr}`, borderRadius: 20, padding: "2px 8px", color: muted }}>{e}</span>)}</div>}
                      {!!a.acquisitionThesis && <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>{String(a.acquisitionThesis)}</p>}
                      {!!a.outreachTiming && <p style={{ fontSize: 11, color: amber }}><b>Reach out:</b> {String(a.outreachTiming)}</p>}
                    </div>
                  ))}
                </div>
              );
            })()}
            {exitStratTab === "readiness" && !!exitStratResult.readinessGaps && (() => {
              const gaps = exitStratResult.readinessGaps as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {gaps.map((g, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 4 }}>{String(g.gap ?? '')}</p>
                      {!!g.impact && <p style={{ fontSize: 11, color: red, marginBottom: 4 }}><b>Impact:</b> {String(g.impact)}</p>}
                      {!!g.fix && <p style={{ fontSize: 11, color: blue, marginBottom: 2 }}><b>Fix:</b> {String(g.fix)}</p>}
                      {!!g.timeToFix && <p style={{ fontSize: 10, color: muted }}>{String(g.timeToFix)}</p>}
                    </div>
                  ))}
                </div>
              );
            })()}
            {exitStratTab === "milestones" && !!exitStratResult.milestones && (() => {
              const mils = exitStratResult.milestones as Record<string, unknown>[];
              return (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                  {mils.map((m, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 4 }}>{String(m.milestone ?? '')}</p>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
                        {!!m.metric && <span style={{ fontSize: 11, color: blue }}>{String(m.metric)}</span>}
                        {!!m.deadline && <span style={{ fontSize: 11, color: amber }}>{String(m.deadline)}</span>}
                      </div>
                      {!!m.impact && <p style={{ fontSize: 11, color: green, marginTop: 4 }}>{String(m.impact)}</p>}
                    </div>
                  ))}
                </div>
              );
            })()}
            {!!exitStratResult.priorityAction && (
              <div style={{ marginTop: 12, background: blue + "11", borderRadius: 8, padding: 10, borderLeft: `3px solid ${blue}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Priority Action</p>
                <p style={{ fontSize: 12, color: ink }}>{String(exitStratResult.priorityAction)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Board Communication ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: ink, margin: 0 }}>Board Communication</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Update templates, communication calendar, ask formulas, and board relationship best practices</p>
          </div>
          <button onClick={handleGenerateBoardCommunication} disabled={generatingBoardComm} style={{ padding: "8px 16px", borderRadius: 8, background: generatingBoardComm ? surf : ink, color: generatingBoardComm ? muted : bg, fontSize: 12, fontWeight: 600, border: "none", cursor: generatingBoardComm ? "default" : "pointer" }}>
            {generatingBoardComm ? "Building…" : "Build Framework"}
          </button>
        </div>
        {boardCommError && <p style={{ color: "#DC2626", fontSize: 12 }}>{boardCommError}</p>}
        {boardCommResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!!boardCommResult.verdict && <p style={{ fontSize: 13, color: ink, margin: 0, padding: "10px 14px", background: surf, borderRadius: 8 }}>{String(boardCommResult.verdict)}</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["update","calendar","asks","redlines"] as const).map(t => (
                <button key={t} onClick={() => setBoardCommTab(t)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${boardCommTab===t ? ink : bdr}`, background: boardCommTab===t ? ink : bg, color: boardCommTab===t ? bg : ink, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {t==="update" ? "📝 Update Template" : t==="calendar" ? "📅 Calendar" : t==="asks" ? "🤝 Ask Formulas" : "🚫 Red Lines"}
                </button>
              ))}
            </div>
            {boardCommTab === "update" && !!boardCommResult.updateTemplate && (() => {
              const tmpl = boardCommResult.updateTemplate as Record<string, unknown>;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {!!tmpl.frequency && <p style={{ fontSize: 12, color: muted, margin: 0 }}>Send: <strong>{String(tmpl.frequency)}</strong></p>}
                  {!!tmpl.sampleOpening && <div style={{ padding: "10px 14px", background: "#EFF6FF", borderRadius: 8 }}><p style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", margin: "0 0 4px" }}>Sample opening</p><p style={{ fontSize: 12, color: ink, margin: 0, fontStyle: "italic" }}>{String(tmpl.sampleOpening)}</p></div>}
                  {!!(tmpl.sections as unknown[])?.length && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {(tmpl.sections as { section: string; content: string; length: string; priority: string }[]).map((s, i) => (
                        <div key={i} style={{ padding: "8px 12px", background: surf, borderRadius: 8, borderLeft: `3px solid ${s.priority==="always" ? ink : bdr}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: 0 }}>{s.section}</p>
                            <span style={{ fontSize: 10, color: muted }}>{s.length}</span>
                          </div>
                          <p style={{ fontSize: 11, color: muted, margin: "2px 0 0" }}>{s.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            {boardCommTab === "calendar" && !!(boardCommResult.communicationCalendar as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(boardCommResult.communicationCalendar as { touchpoint: string; frequency: string; format: string; purpose: string; preparationTime: string }[]).map((c, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>{c.touchpoint}</p>
                      <span style={{ fontSize: 11, color: "#2563EB" }}>{c.frequency}</span>
                    </div>
                    <p style={{ fontSize: 12, color: muted, margin: "0 0 2px" }}>{c.format} · {c.preparationTime} prep</p>
                    <p style={{ fontSize: 11, color: muted, margin: 0 }}>{c.purpose}</p>
                  </div>
                ))}
              </div>
            )}
            {boardCommTab === "asks" && !!(boardCommResult.askFormulas as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(boardCommResult.askFormulas as { askType: string; timing: string; howToFrame: string; followUp: string }[]).map((a, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid #16A34A" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 4px" }}>{a.askType}</p>
                    <p style={{ fontSize: 12, color: muted, margin: "0 0 4px" }}>Timing: {a.timing}</p>
                    <p style={{ fontSize: 12, color: ink, margin: "0 0 4px" }}>{a.howToFrame}</p>
                    <p style={{ fontSize: 11, color: "#16A34A", margin: 0 }}>Follow-up: {a.followUp}</p>
                  </div>
                ))}
              </div>
            )}
            {boardCommTab === "redlines" && !!(boardCommResult.redLines as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(boardCommResult.redLines as string[]).map((r, i) => (
                  <div key={i} style={{ padding: "8px 12px", background: "#FEF2F2", borderRadius: 8, borderLeft: "3px solid #DC2626", display: "flex", gap: 10 }}>
                    <span style={{ fontSize: 14 }}>🚫</span>
                    <p style={{ fontSize: 12, color: ink, margin: 0 }}>{r}</p>
                  </div>
                ))}
              </div>
            )}
            {!!boardCommResult.priorityAction && <div style={{ padding: "10px 14px", background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid #16A34A" }}><p style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", margin: "0 0 4px" }}>Priority Action</p><p style={{ fontSize: 12, color: ink, margin: 0 }}>{String(boardCommResult.priorityAction)}</p></div>}
            <button onClick={() => setBoardCommResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Re-run</button>
          </div>
        )}
      </div>

      {/* ── Investor Q&A Prep ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: ink, margin: 0 }}>Investor Q&A Prep</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Master the toughest investor questions with rehearsed, confident answers</p>
          </div>
          <button onClick={handleGenerateInvestorQA} disabled={generatingInvQA} style={{ padding: "8px 16px", borderRadius: 8, background: generatingInvQA ? surf : ink, color: generatingInvQA ? muted : bg, fontSize: 12, fontWeight: 600, border: "none", cursor: generatingInvQA ? "default" : "pointer" }}>
            {generatingInvQA ? "Preparing…" : "Prep Q&A"}
          </button>
        </div>
        {invQAError && <p style={{ color: "#DC2626", fontSize: 12 }}>{invQAError}</p>}
        {invQAResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["tough","financial","vision","founder"] as const).map(s => (
                <button key={s} onClick={() => setInvQASection(s)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${invQASection===s ? ink : bdr}`, background: invQASection===s ? ink : bg, color: invQASection===s ? bg : ink, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {s==="tough" ? "🔥 Toughest" : s==="financial" ? "📊 Financials" : s==="vision" ? "🚀 Vision" : "🧑 Founder Test"}
                </button>
              ))}
            </div>
            {invQASection === "tough" && !!(invQAResult.toughestQuestions as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(invQAResult.toughestQuestions as { question: string; why: string; answer: string; avoid: string }[]).map((q, i) => (
                  <div key={i} style={{ padding: "12px 14px", background: "#FEF2F2", borderRadius: 8, borderLeft: "3px solid #DC2626" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 4px" }}>Q: {q.question}</p>
                    <p style={{ fontSize: 11, color: muted, margin: "0 0 6px" }}>Why they ask: {q.why}</p>
                    <p style={{ fontSize: 12, color: ink, margin: "0 0 6px" }}><strong>Answer:</strong> {q.answer}</p>
                    {q.avoid && <p style={{ fontSize: 11, color: "#DC2626", margin: 0 }}>Avoid: {q.avoid}</p>}
                  </div>
                ))}
              </div>
            )}
            {invQASection === "financial" && !!(invQAResult.financialQuestions as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(invQAResult.financialQuestions as { question: string; answer: string; dataPoint: string }[]).map((q, i) => (
                  <div key={i} style={{ padding: "12px 14px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 4px" }}>Q: {q.question}</p>
                    <p style={{ fontSize: 12, color: ink, margin: "0 0 4px" }}>{q.answer}</p>
                    {q.dataPoint && <p style={{ fontSize: 11, color: "#2563EB", margin: 0 }}>Key data point: {q.dataPoint}</p>}
                  </div>
                ))}
              </div>
            )}
            {invQASection === "vision" && !!(invQAResult.visionQuestions as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(invQAResult.visionQuestions as { question: string; answer: string }[]).map((q, i) => (
                  <div key={i} style={{ padding: "12px 14px", background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid #16A34A" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 4px" }}>Q: {q.question}</p>
                    <p style={{ fontSize: 12, color: ink, margin: 0 }}>{q.answer}</p>
                  </div>
                ))}
              </div>
            )}
            {invQASection === "founder" && !!(invQAResult.founderTestQuestions as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(invQAResult.founderTestQuestions as { question: string; answer: string; signal: string }[]).map((q, i) => (
                  <div key={i} style={{ padding: "12px 14px", background: "#EFF6FF", borderRadius: 8, borderLeft: "3px solid #2563EB" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 4px" }}>Q: {q.question}</p>
                    <p style={{ fontSize: 12, color: ink, margin: "0 0 4px" }}>{q.answer}</p>
                    {q.signal && <p style={{ fontSize: 11, color: "#2563EB", margin: 0 }}>Signal: {q.signal}</p>}
                  </div>
                ))}
              </div>
            )}
            {!!(invQAResult.doNotSay as unknown[])?.length && (
              <div style={{ padding: "10px 14px", background: "#FEF2F2", borderRadius: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#DC2626", margin: "0 0 6px" }}>Never say these:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(invQAResult.doNotSay as string[]).map((s, i) => <span key={i} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: "#FEE2E2", color: "#DC2626" }}>{s}</span>)}
                </div>
              </div>
            )}
            {!!invQAResult.warmingTactic && <div style={{ padding: "10px 14px", background: surf, borderRadius: 8 }}><p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: "0 0 4px" }}>Warming tactic</p><p style={{ fontSize: 12, color: muted, margin: 0 }}>{String(invQAResult.warmingTactic)}</p></div>}
            <button onClick={() => setInvQAResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Re-run</button>
          </div>
        )}
      </div>

      {/* ── Crisis Playbook ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: ink, margin: 0 }}>Crisis Playbook</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Immediate actions, communication templates, and recovery plan for your biggest risks</p>
          </div>
          <button onClick={handleGenerateCrisisPlaybook} disabled={generatingCrisis} style={{ padding: "8px 16px", borderRadius: 8, background: generatingCrisis ? muted : red, color: "#fff", fontSize: 12, fontWeight: 600, border: "none", cursor: generatingCrisis ? "not-allowed" : "pointer" }}>
            {generatingCrisis ? "Building…" : "Build Playbook"}
          </button>
        </div>
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, color: muted, marginBottom: 6 }}>Crisis Type</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            {["funding / cash crisis", "major churn event", "PR / reputation", "co-founder conflict", "technical outage", "legal threat"].map(ct => (
              <button key={ct} onClick={() => setCrisisType(ct)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${crisisType === ct ? red : bdr}`, background: crisisType === ct ? "#FEE2E2" : "transparent", color: crisisType === ct ? red : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{ct}</button>
            ))}
          </div>
        </div>
        {crisisError && <p style={{ fontSize: 12, color: red }}>{crisisError}</p>}
        {crisisResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            {/* Severity */}
            {!!crisisResult.severityAssessment && (() => {
              const sv = crisisResult.severityAssessment as { level?: string; timeToAct?: string; primaryRisk?: string };
              const svColor = sv.level === "critical" ? red : sv.level === "high" ? amber : "#16A34A";
              return (
                <div style={{ background: "#FEE2E2", borderRadius: 8, padding: 12, marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: svColor, background: "#fff", padding: "2px 10px", borderRadius: 999 }}>{(sv.level ?? "").toUpperCase()}</span>
                    <p style={{ fontSize: 12, color: red, margin: 0 }}>Act within: {sv.timeToAct}</p>
                  </div>
                  <p style={{ fontSize: 12, color: ink, margin: 0 }}>{sv.primaryRisk}</p>
                </div>
              );
            })()}
            {/* Section tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {(["immediate", "stabilization", "comms", "recovery"] as const).map(s => (
                <button key={s} onClick={() => setCrisisSection(s)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${crisisSection === s ? red : bdr}`, background: crisisSection === s ? "#FEE2E2" : "transparent", color: crisisSection === s ? red : muted, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                  {s === "comms" ? "Comms" : s}
                </button>
              ))}
            </div>
            {crisisSection === "immediate" && !!(crisisResult.immediateActions as unknown[])?.length && (
              <div>
                {(crisisResult.immediateActions as { action: string; when: string; owner: string; why: string }[]).map((a, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>{a.action}</p>
                      <span style={{ fontSize: 11, color: red, fontWeight: 700 }}>{a.when}</span>
                    </div>
                    <p style={{ fontSize: 11, color: muted }}>Owner: {a.owner} · {a.why}</p>
                  </div>
                ))}
                {!!crisisResult.decisionFramework && <p style={{ fontSize: 12, color: muted, fontStyle: "italic", marginTop: 10 }}><strong>Decision Framework:</strong> {String(crisisResult.decisionFramework)}</p>}
              </div>
            )}
            {crisisSection === "stabilization" && !!(crisisResult.stabilizationPlan as unknown[])?.length && (
              <div>
                {(crisisResult.stabilizationPlan as { phase: string; objective: string; actions: string[]; successSignal: string }[]).map((p, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: red, marginBottom: 4 }}>{p.phase}</p>
                    <p style={{ fontSize: 12, color: ink, marginBottom: 6 }}>{p.objective}</p>
                    {p.actions?.map((a, ai) => <p key={ai} style={{ fontSize: 11, color: muted, marginBottom: 2 }}>→ {a}</p>)}
                    <p style={{ fontSize: 11, color: green, marginTop: 4 }}>✓ {p.successSignal}</p>
                  </div>
                ))}
              </div>
            )}
            {crisisSection === "comms" && !!(crisisResult.communicationTemplates as unknown[])?.length && (
              <div>
                {(crisisResult.communicationTemplates as { audience: string; when: string; tone: string; template: string }[]).map((ct, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: 0 }}>To: {ct.audience}</p>
                      <span style={{ fontSize: 11, color: muted }}>{ct.when}</span>
                    </div>
                    <p style={{ fontSize: 11, color: muted, marginBottom: 6 }}>Tone: {ct.tone}</p>
                    <div style={{ background: bg, borderRadius: 6, padding: 10, fontSize: 12, color: ink, whiteSpace: "pre-wrap" as const, fontFamily: "monospace" }}>{ct.template}</div>
                  </div>
                ))}
              </div>
            )}
            {crisisSection === "recovery" && !!(crisisResult.recoveryMilestones as unknown[])?.length && (
              <div>
                {(crisisResult.recoveryMilestones as { milestone: string; timeframe: string; indicator: string }[]).map((m, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>{m.milestone}</p>
                      <span style={{ fontSize: 11, color: muted }}>{m.timeframe}</span>
                    </div>
                    <p style={{ fontSize: 11, color: green, margin: "2px 0 0" }}>Signal: {m.indicator}</p>
                  </div>
                ))}
                {!!crisisResult.worstCaseContingency && (
                  <div style={{ background: "#FEE2E2", borderRadius: 8, padding: 12, marginTop: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: red, marginBottom: 4 }}>Worst Case Contingency</p>
                    <p style={{ fontSize: 12, color: ink, margin: 0 }}>{String(crisisResult.worstCaseContingency)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Team Alignment ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: ink, margin: 0 }}>Team Alignment Assessment</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Diagnose cross-functional gaps, communication breakdowns, and decision-making clarity</p>
          </div>
          <button onClick={handleGenerateTeamAlignment} disabled={generatingTA} style={{ padding: "8px 16px", borderRadius: 8, background: generatingTA ? muted : blue, color: "#fff", fontSize: 12, fontWeight: 600, border: "none", cursor: generatingTA ? "not-allowed" : "pointer" }}>
            {generatingTA ? "Assessing…" : "Run Assessment"}
          </button>
        </div>
        {taError && <p style={{ fontSize: 12, color: red }}>{taError}</p>}
        {taResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 28, fontWeight: 800, color: ink, margin: 0 }}>{String(taResult.alignmentScore ?? "—")}<span style={{ fontSize: 14, color: muted }}>/100</span></p>
                <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>{String(taResult.verdict ?? "")}</p>
              </div>
              {!!taResult.priorityAction && (
                <div style={{ background: "#FEF3C7", borderRadius: 8, padding: "8px 12px", maxWidth: 240 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: amber, margin: "0 0 2px" }}>Priority Action</p>
                  <p style={{ fontSize: 12, color: ink, margin: 0 }}>{String(taResult.priorityAction)}</p>
                </div>
              )}
            </div>
            {/* Dimensions */}
            {!!(taResult.dimensions as unknown[])?.length && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" as const }}>
                  {(taResult.dimensions as { dimension: string }[]).map((d, i) => (
                    <button key={i} onClick={() => setTaDimIdx(i)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${taDimIdx === i ? blue : bdr}`, background: taDimIdx === i ? "#EFF6FF" : "transparent", color: taDimIdx === i ? blue : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{d.dimension}</button>
                  ))}
                </div>
                {(() => {
                  const dim = (taResult.dimensions as { dimension: string; score: number; status: string; finding: string; gap: string; recommendation: string }[])[taDimIdx];
                  if (!dim) return null;
                  const dimColor = dim.status === "strong" ? "#16A34A" : dim.status === "good" ? blue : dim.status === "needs work" ? amber : red;
                  return (
                    <div style={{ background: bg, borderRadius: 8, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <p style={{ fontWeight: 700, color: ink, margin: 0 }}>{dim.dimension}</p>
                        <span style={{ fontSize: 12, fontWeight: 700, color: dimColor }}>{dim.score}/100 · {dim.status}</span>
                      </div>
                      <p style={{ fontSize: 12, color: muted, marginBottom: 6 }}><strong>Finding:</strong> {dim.finding}</p>
                      <p style={{ fontSize: 12, color: muted, marginBottom: 6 }}><strong>Gap:</strong> {dim.gap}</p>
                      <p style={{ fontSize: 12, color: ink }}><strong>Recommendation:</strong> {dim.recommendation}</p>
                    </div>
                  );
                })()}
              </div>
            )}
            {/* Action Plan */}
            {!!(taResult.actionPlan as unknown[])?.length && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 8 }}>Action Plan</p>
                {(taResult.actionPlan as { action: string; owner: string; timeline: string; successMetric: string }[]).map((a, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${bdr}`, display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>{a.action}</p>
                      <p style={{ fontSize: 11, color: muted, margin: "2px 0 0" }}>Owner: {a.owner} · {a.timeline}</p>
                    </div>
                    <p style={{ fontSize: 11, color: muted, margin: 0, maxWidth: 160, textAlign: "right" as const }}>{a.successMetric}</p>
                  </div>
                ))}
              </div>
            )}
            {/* Meeting Cadence */}
            {!!taResult.meetingCadence && (
              <p style={{ fontSize: 12, color: muted, fontStyle: "italic" }}><strong>Meeting Cadence:</strong> {String(taResult.meetingCadence)}</p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERABLE PANEL
// ═══════════════════════════════════════════════════════════════════════════════
// ─── deliverable quality score ────────────────────────────────────────────────
