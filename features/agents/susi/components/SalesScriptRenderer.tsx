'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Zap, CheckCircle2, Loader2, Copy, Check, TrendingUp, ChevronRight, Calendar, DollarSign, MessageSquare, BarChart3, Shield, BookOpen, Send, X, Mail, Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { bg, surf, bdr, ink, muted, green, amber, red, blue } from '../../shared/constants/colors'
import { CopyBtn } from '../../shared/components/CopyBtn'
import type { Deal } from '../../types/agent.types'

export function SalesScriptRenderer({ data, artifactId }: { data: Record<string, unknown>; artifactId?: string }) {
  const d = data as {
    targetPersona?: string;
    discoveryQuestions?: { question: string; purpose: string; probe?: string }[];
    pitchFramework?: { opener?: string; problemStatement?: string; solutionBridge?: string; valueProposition?: string; socialProof?: string; cta?: string };
    objections?: { objection: string; response: string; pivot?: string }[];
    closingLines?: string[];
    nextSteps?: string[];
  };

  // ── Proposal modal state ──
  const [showModal, setShowModal]         = useState(false);
  const [prospectName, setProspectName]   = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [prospectCompany, setProspectCompany] = useState("");
  const [dealValue, setDealValue]         = useState("");
  const [useCase, setUseCase]             = useState("");
  const [sending, setSending]             = useState(false);
  const [sendResult, setSendResult]       = useState<{ ok?: boolean; error?: string } | null>(null);

  // ── Pipeline state ──
  const [activeTab, setActiveTab]         = useState<"script" | "pipeline" | "webhook">("script");
  const [deals, setDeals]                 = useState<Record<string, Deal[]>>({ lead: [], qualified: [], proposal: [], negotiating: [], won: [], lost: [] });
  const [loadingDeals, setLoadingDeals]   = useState(false);
  const [movingDeal, setMovingDeal]       = useState<string | null>(null);
  const [webhookUserId, setWebhookUserId] = useState<string | null>(null);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [founderInfo, setFounderInfo]     = useState<{ name: string; email: string; company: string } | null>(null);

  // ── Win/Loss reason modal ──
  const [winLossPending, setWinLossPending] = useState<{ dealId: string; stage: "won" | "lost"; company: string } | null>(null);
  const [winLossReason, setWinLossReason]   = useState("");
  const [savingWinLoss, setSavingWinLoss]   = useState(false);

  // ── Follow-up email draft ──
  const [followUpDeal, setFollowUpDeal]     = useState<Deal | null>(null);
  const [draftingFollowUp, setDraftingFollowUp] = useState(false);
  const [followUpDraft, setFollowUpDraft]   = useState<{ subject: string; body: string; suggestedSendTime?: string; talkingPoints?: string[] } | null>(null);
  const [followUpError, setFollowUpError]   = useState<string | null>(null);
  const [followUpCopied, setFollowUpCopied] = useState(false);

  // ── AI Revenue Forecast ──
  const [showForecastPanel, setShowForecastPanel] = useState(false);
  const [runningForecast, setRunningForecast]     = useState(false);
  const [forecastResult, setForecastResult]       = useState<{
    thirtyDay?: { expected: string; optimistic: string; pessimistic: string; reasoning: string };
    sixtyDay?: { expected: string; optimistic: string; pessimistic: string; reasoning: string };
    ninetyDay?: { expected: string; optimistic: string; pessimistic: string; reasoning: string };
    closeRateEstimate?: string; pipelineHealth?: string;
    pipelineGaps?: string[]; riskDeals?: string[]; topDeals?: string[]; recommendation?: string;
  } | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);

  async function handleAIForecast() {
    if (runningForecast) return;
    setRunningForecast(true); setForecastError(null); setForecastResult(null);
    try {
      const res = await fetch('/api/agents/susi/forecast', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.forecast) setForecastResult(r.forecast);
      else setForecastError(r.error ?? 'Forecast failed');
    } catch { setForecastError('Network error'); }
    finally { setRunningForecast(false); }
  }

  // ── Meeting prep ──
  const [meetingPrepDeal, setMeetingPrepDeal] = useState<Deal | null>(null);
  const [loadingMeetingPrep, setLoadingMeetingPrep] = useState(false);
  const [meetingPrep, setMeetingPrep]         = useState<{
    companySnapshot?: string; contactInsight?: string; dealContext?: string;
    talkingPoints?: string[]; likelyObjections?: { objection: string; response: string }[];
    openingQuestion?: string; meetingGoal?: string; redFlags?: string[];
  } | null>(null);
  const [meetingPrepError, setMeetingPrepError] = useState<string | null>(null);

  // Pipeline analytics state
  const [pipelineAnalytics, setPipelineAnalytics] = useState<{
    totalDeals?: number; activeDeals?: number; activePipelineValue?: number; wonValue?: number;
    winRate?: number | null; avgDealSize?: number | null;
    stages?: { stage: string; count: number; totalValue: number; avgDaysInStage: number | null; conversionToNext: number | null }[];
    bottleneck?: string; velocityComment?: string; topRecommendation?: string; winRateComment?: string; quickWins?: string[];
  } | null>(null);
  const [loadingPipelineAnalytics, setLoadingPipelineAnalytics] = useState(false);
  const [pipelineAnalyticsError, setPipelineAnalyticsError] = useState<string | null>(null);

  // AI deal scoring state
  const [aiDealScores, setAIDealScores] = useState<{
    scores?: { dealId: string; company: string; stage: string; value?: string; score: number; grade: string; reasoning: string; nextAction: string; urgency: string; daysStale: number }[];
    avgScore?: number; topDeal?: Record<string, unknown>; atRiskDeals?: Record<string, unknown>[];
  } | null>(null);
  const [loadingAIDealScores, setLoadingAIDealScores] = useState(false);
  const [aiDealScoresError, setAIDealScoresError] = useState<string | null>(null);

  // Pricing strategy state
  const [generatingPricingStrategy, setGeneratingPricingStrategy] = useState(false);
  const [pricingStrategy, setPricingStrategy] = useState<{
    recommendedModel?: string; rationale?: string;
    tiers?: { name: string; price: string; billingOptions?: string[]; seats?: string; keyFeatures?: string[]; targetCustomer?: string; positioningNote?: string }[];
    freeTierAdvice?: string; enterpriseAdvice?: string; discountingPolicy?: string;
    trialStrategy?: string; anchoringTactic?: string; pricingPageAdvice?: string;
    competitorPositioning?: string; yourAdvantage?: string; keyInsight?: string;
  } | null>(null);
  const [pricingStrategyError, setPricingStrategyError] = useState<string | null>(null);

  // Qualification scorecard state
  const [runningQualification, setRunningQualification] = useState(false);
  const [qualificationResult, setQualificationResult] = useState<{
    scorecards?: {
      dealId: string; company: string; framework: string; score: number; grade: string;
      criteria?: { name: string; met: boolean; evidence: string; weight: number }[];
      keyRisk?: string; recommendation?: string; nextQuestion?: string;
    }[];
    dealsScored?: number;
  } | null>(null);
  const [qualificationError, setQualificationError] = useState<string | null>(null);

  async function handleRunQualification() {
    if (runningQualification) return;
    setRunningQualification(true); setQualificationError(null);
    try {
      const res = await fetch('/api/agents/susi/qualification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const r = await res.json();
      if (res.ok && r.scorecards) setQualificationResult(r);
      else setQualificationError(r.error ?? 'Failed to run qualification');
    } catch { setQualificationError('Network error'); }
    finally { setRunningQualification(false); }
  }

  // Pipeline Health state
  const [generatingPipeHealth, setGeneratingPipeHealth] = useState(false);
  const [pipeHealthResult, setPipeHealthResult]         = useState<Record<string, unknown> | null>(null);
  const [pipeHealthError, setPipeHealthError]           = useState<string | null>(null);
  const [pipeHealthStageIdx, setPipeHealthStageIdx]     = useState(0);

  async function handleGeneratePipelineHealth() {
    if (generatingPipeHealth) return;
    setGeneratingPipeHealth(true); setPipeHealthError(null); setPipeHealthResult(null);
    try {
      const res = await fetch('/api/agents/susi/pipeline-health', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.health) setPipeHealthResult(r.health);
      else setPipeHealthError(r.error ?? 'Analysis failed');
    } catch { setPipeHealthError('Network error'); }
    finally { setGeneratingPipeHealth(false); }
  }

  // Deal Coaching state
  const [dcDealName, setDcDealName]                   = useState('');
  const [dcStage, setDcStage]                         = useState('Negotiation');
  const [dcDealValue, setDcDealValue]                 = useState('');
  const [dcLastActivity, setDcLastActivity]           = useState('');
  const [dcNotes, setDcNotes]                         = useState('');
  const [generatingDC, setGeneratingDC]               = useState(false);
  const [dcResult, setDcResult]                       = useState<Record<string, unknown> | null>(null);
  const [dcError, setDcError]                         = useState<string | null>(null);
  const [dcTab, setDcTab]                             = useState<'diagnosis' | 'nextaction' | 'email' | 'close'>('diagnosis');

  async function handleGenerateDealCoaching() {
    if (generatingDC) return;
    setGeneratingDC(true); setDcError(null); setDcResult(null);
    try {
      const res = await fetch('/api/agents/susi/deal-coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealName: dcDealName, stage: dcStage, dealValue: dcDealValue, lastActivity: dcLastActivity, notes: dcNotes }),
      });
      const r = await res.json();
      if (res.ok && r.coaching) setDcResult(r.coaching);
      else setDcError(r.error ?? 'Generation failed');
    } catch { setDcError('Network error'); }
    finally { setGeneratingDC(false); }
  }

  // Objection Bank state
  const [generatingObjBank, setGeneratingObjBank]     = useState(false);
  const [objBankResult, setObjBankResult]             = useState<Record<string, unknown> | null>(null);
  const [objBankError, setObjBankError]               = useState<string | null>(null);
  const [objBankIdx, setObjBankIdx]                   = useState(0);
  const [objBankFilter, setObjBankFilter]             = useState<string>('all');

  async function handleGenerateObjBank() {
    if (generatingObjBank) return;
    setGeneratingObjBank(true); setObjBankError(null); setObjBankResult(null);
    try {
      const res = await fetch('/api/agents/susi/objection-bank', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.bank) setObjBankResult(r.bank);
      else setObjBankError(r.error ?? 'Generation failed');
    } catch { setObjBankError('Network error'); }
    finally { setGeneratingObjBank(false); }
  }

  // Deal Playbook state
  const [generatingPlaybook, setGeneratingPlaybook]   = useState(false);
  const [playbookResult, setPlaybookResult]           = useState<Record<string, unknown> | null>(null);
  const [playbookError, setPlaybookError]             = useState<string | null>(null);
  const [playbookDealId, setPlaybookDealId]           = useState('');
  const [availableDeals, setAvailableDeals]           = useState<{ id: string; company: string; stage: string }[]>([]);
  const [playbookSection, setPlaybookSection]         = useState<'actions' | 'stakeholders' | 'objections' | 'closing'>('actions');

  async function handleGenerateDealPlaybook() {
    if (generatingPlaybook) return;
    setGeneratingPlaybook(true); setPlaybookError(null); setPlaybookResult(null);
    try {
      const res = await fetch('/api/agents/susi/deal-playbook', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: playbookDealId || undefined }),
      });
      const r = await res.json();
      if (res.ok && r.playbook) {
        setPlaybookResult(r.playbook);
        if (r.availableDeals) setAvailableDeals(r.availableDeals);
      } else setPlaybookError(r.error ?? 'Generation failed');
    } catch { setPlaybookError('Network error'); }
    finally { setGeneratingPlaybook(false); }
  }

  // Proposal state
  // Reply Draft state
  const [replyMessage, setReplyMessage]             = useState('');
  const [replyContext, setReplyContext]             = useState('');
  const [generatingReply, setGeneratingReply]       = useState(false);
  const [replyResult, setReplyResult]               = useState<Record<string, unknown> | null>(null);
  const [replyError, setReplyError]                 = useState<string | null>(null);
  const [activeDraft, setActiveDraft]               = useState(0);

  async function handleGenerateReply() {
    if (!replyMessage.trim() || generatingReply) return;
    setGeneratingReply(true); setReplyError(null); setReplyResult(null);
    try {
      const res = await fetch('/api/agents/patel/reply-draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectMessage: replyMessage, context: replyContext || undefined }),
      });
      const r = await res.json();
      if (res.ok && r.drafts) { setReplyResult(r); setActiveDraft(0); }
      else setReplyError(r.error ?? 'Failed to generate reply drafts');
    } catch { setReplyError('Network error'); }
    finally { setGeneratingReply(false); }
  }

  const [proposalProspectName, setProposalProspectName] = useState('');
  const [proposalCompany, setProposalCompany]           = useState('');
  const [proposalValue, setProposalValue]               = useState('');
  const [generatingProposal, setGeneratingProposal]     = useState(false);
  const [proposalError, setProposalError]               = useState<string | null>(null);

  async function handleGenerateProposal() {
    if (generatingProposal) return;
    setGeneratingProposal(true); setProposalError(null);
    try {
      const res = await fetch('/api/agents/susi/proposal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectName: proposalProspectName || undefined, prospectCompany: proposalCompany || undefined, dealValue: proposalValue || undefined }),
      });
      const r = await res.json();
      if (res.ok && r.html) {
        const blob = new Blob([r.html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `proposal-${(proposalCompany || 'prospect').toLowerCase().replace(/\s+/g, '-')}.html`; a.click();
        URL.revokeObjectURL(url);
      } else { setProposalError(r.error ?? 'Failed to generate proposal'); }
    } catch { setProposalError('Network error'); }
    finally { setGeneratingProposal(false); }
  }

  async function handleGeneratePricingStrategy() {
    if (generatingPricingStrategy) return;
    setGeneratingPricingStrategy(true); setPricingStrategyError(null);
    try {
      const res = await fetch('/api/agents/susi/pricing', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.strategy) setPricingStrategy(r.strategy);
      else setPricingStrategyError(r.error ?? 'Failed to generate pricing strategy');
    } catch { setPricingStrategyError('Network error'); }
    finally { setGeneratingPricingStrategy(false); }
  }

  async function handleRunPipelineAnalytics() {
    if (loadingPipelineAnalytics) return;
    setLoadingPipelineAnalytics(true); setPipelineAnalyticsError(null);
    try {
      const res = await fetch('/api/agents/susi/pipeline', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.analytics) setPipelineAnalytics(r.analytics);
      else setPipelineAnalyticsError(r.error ?? 'Failed to run pipeline analytics');
    } catch { setPipelineAnalyticsError('Network error'); }
    finally { setLoadingPipelineAnalytics(false); }
  }

  async function handleRunAIScoring() {
    if (loadingAIDealScores) return;
    setLoadingAIDealScores(true); setAIDealScoresError(null);
    try {
      const res = await fetch('/api/agents/susi/score-deals', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.scores) setAIDealScores(r);
      else setAIDealScoresError(r.error ?? 'Failed to score deals');
    } catch { setAIDealScoresError('Network error'); }
    finally { setLoadingAIDealScores(false); }
  }

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      const sb = createClient();
      sb.auth.getUser().then(async ({ data }) => {
        if (!data?.user?.id) return;
        setWebhookUserId(data.user.id);
        const { data: fp } = await sb
          .from('founder_profiles')
          .select('full_name, startup_name')
          .eq('user_id', data.user.id)
          .single();
        setFounderInfo({
          name:    fp?.full_name    || data.user.user_metadata?.full_name || 'Founder',
          email:   data.user.email  || '',
          company: fp?.startup_name || 'My Startup',
        });
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const STAGES = ["lead", "qualified", "proposal", "negotiating", "won", "lost"] as const;
  const STAGE_LABELS: Record<string, string> = { lead: "Lead", qualified: "Qualified", proposal: "Proposal Sent", negotiating: "Negotiating", won: "Won", lost: "Lost" };
  const STAGE_COLORS: Record<string, string> = { lead: muted, qualified: blue, proposal: amber, negotiating: "#7C3AED", won: green, lost: red };

  const totalDeals = Object.values(deals).reduce((n, arr) => n + arr.length, 0);

  // Load deals when tab switches to pipeline or analytics
  useEffect(() => {
    if (activeTab !== "pipeline" && (activeTab as string) !== "analytics") return;
    setLoadingDeals(true);
    fetch("/api/agents/deals")
      .then(r => r.json())
      .then(d => { if (d.grouped) setDeals(d.grouped); })
      .catch(() => {})
      .finally(() => setLoadingDeals(false));
  }, [activeTab]);

  // Cross-agent: detect if Patel recently sent outreach (contacts to add to pipeline)
  const [patelUpdate, setPatelUpdate] = useState<{ description: string; created_at: string } | null>(null);
  useEffect(() => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    fetch(`/api/agents/context?agentId=susi&since=${since}&limit=5`)
      .then(r => r.json())
      .then(d => {
        const event = (d.events ?? []).find((e: { agent_id: string; action_type: string; metadata?: Record<string, unknown> }) =>
          e.agent_id === 'patel' && ['send_outreach', 'outreach_drafted'].includes(e.action_type)
        );
        if (event) setPatelUpdate(event);
      })
      .catch(() => {});
  }, []);

  async function handleSendProposal() {
    if (!prospectEmail || !prospectName || sending) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/agents/proposal/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectName, prospectEmail, prospectCompany, dealValue, useCase, salesScript: data, artifactId, yourName: founderInfo?.name ?? 'Founder', yourEmail: founderInfo?.email ?? '', yourCompany: founderInfo?.company ?? '' }),
      });
      const result = await res.json();
      if (res.ok) {
        setSendResult({ ok: true });
        // Refresh pipeline
        fetch("/api/agents/deals").then(r => r.json()).then(d => { if (d.grouped) setDeals(d.grouped); });
      } else {
        setSendResult({ error: result.error || "Failed to send" });
      }
    } catch {
      setSendResult({ error: "Network error" });
    } finally {
      setSending(false);
    }
  }

  async function handleMoveDeal(dealId: string, newStage: string, dealCompany?: string) {
    // For won/lost, show reason modal first
    if (newStage === "won" || newStage === "lost") {
      setWinLossReason("");
      setWinLossPending({ dealId, stage: newStage, company: dealCompany ?? "this deal" });
      return;
    }
    await _applyMoveDeal(dealId, newStage);
  }

  async function _applyMoveDeal(dealId: string, newStage: string, reason?: string) {
    setMovingDeal(dealId);
    try {
      await fetch("/api/agents/deals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: dealId,
          stage: newStage,
          ...(reason ? (newStage === "won" ? { win_reason: reason } : { loss_reason: reason }) : {}),
        }),
      });
      const r = await fetch("/api/agents/deals");
      const d = await r.json();
      if (d.grouped) setDeals(d.grouped);
    } catch {} finally {
      setMovingDeal(null);
    }
  }

  async function handleConfirmWinLoss() {
    if (!winLossPending || savingWinLoss) return;
    setSavingWinLoss(true);
    await _applyMoveDeal(winLossPending.dealId, winLossPending.stage, winLossReason || undefined);
    setSavingWinLoss(false);
    setWinLossPending(null);
    setWinLossReason("");
  }

  async function handleDraftFollowUp(deal: Deal) {
    setFollowUpDeal(deal);
    setFollowUpDraft(null);
    setFollowUpError(null);
    setFollowUpCopied(false);
    setDraftingFollowUp(true);
    try {
      const daysAgo = deal.updated_at
        ? Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / 86400000)
        : undefined;
      const res = await fetch('/api/agents/susi/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: deal.id, company: deal.company, contactName: deal.contact_name,
          contactTitle: deal.contact_title, stage: deal.stage, value: deal.value,
          notes: deal.notes, nextAction: deal.next_action, daysSinceContact: daysAgo,
          founderName: founderInfo?.name, founderCompany: founderInfo?.company,
        }),
      });
      const r = await res.json();
      if (res.ok && r.draft?.subject) setFollowUpDraft(r.draft);
      else setFollowUpError(r.error ?? 'Draft failed');
    } catch { setFollowUpError('Network error'); }
    finally { setDraftingFollowUp(false); }
  }

  async function handleMeetingPrep(deal: Deal) {
    setMeetingPrepDeal(deal);
    setMeetingPrep(null);
    setMeetingPrepError(null);
    setLoadingMeetingPrep(true);
    try {
      const res = await fetch('/api/agents/susi/meeting-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: deal.id, company: deal.company, contactName: deal.contact_name,
          contactTitle: deal.contact_title, contactEmail: deal.contact_email,
          stage: deal.stage, value: deal.value, notes: deal.notes,
          nextAction: deal.next_action, founderCompany: founderInfo?.company,
        }),
      });
      const r = await res.json();
      if (res.ok && r.prep) setMeetingPrep(r.prep);
      else setMeetingPrepError(r.error ?? 'Prep failed');
    } catch { setMeetingPrepError('Network error'); }
    finally { setLoadingMeetingPrep(false); }
  }

  const sectionHead: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, marginBottom: 10 };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Patel cross-agent context banner ── */}
      {patelUpdate && (
        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 16 }}>📬</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>Patel sent outreach — add contacts to your pipeline?</p>
            <p style={{ fontSize: 11, color: muted, margin: "2px 0 0" }}>{patelUpdate.description}</p>
          </div>
          <button onClick={() => setActiveTab("pipeline")} style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: ink, color: bg, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Open Pipeline</button>
          <button onClick={() => setPatelUpdate(null)} style={{ padding: "5px 8px", borderRadius: 7, border: "none", background: "transparent", color: muted, fontSize: 14, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* ── Send Proposal CTA bar ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Ready to close a deal?</p>
          <p style={{ fontSize: 11, color: muted }}>Send a branded proposal to a prospect — tracked automatically in your pipeline.</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setSendResult(null); }}
          style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          Send Proposal
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: `1px solid ${bdr}`, paddingBottom: 0 }}>
        {(["script", "pipeline", "analytics", "webhook"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "script" | "pipeline" | "webhook")}
            style={{
              padding: "7px 16px", borderRadius: "8px 8px 0 0", border: `1px solid ${activeTab === tab ? bdr : "transparent"}`,
              borderBottom: activeTab === tab ? `1px solid ${bg}` : "none",
              background: activeTab === tab ? bg : "transparent",
              fontSize: 12, fontWeight: 600, color: activeTab === tab ? ink : muted,
              cursor: "pointer", marginBottom: -1,
            }}
          >
            {tab === "script" ? "Sales Script" : tab === "pipeline" ? `Pipeline${totalDeals > 0 ? ` (${totalDeals})` : ""}` : tab === "analytics" ? "Analytics" : "Lead Webhook"}
          </button>
        ))}
      </div>

      {/* ── Sales Script tab ── */}
      {activeTab === "script" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {d.targetPersona && (
            <div style={{ background: surf, borderRadius: 10, padding: "12px 16px", border: `1px solid ${bdr}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Target Persona</p>
              <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.targetPersona}</p>
            </div>
          )}
          {d.pitchFramework && (
            <div>
              <p style={sectionHead}>Pitch Framework</p>
              {Object.entries(d.pitchFramework).map(([k, v]) => v ? (
                <div key={k} style={{ borderBottom: `1px solid ${bdr}`, padding: "10px 0" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{v}</p>
                </div>
              ) : null)}
            </div>
          )}
          {d.discoveryQuestions && d.discoveryQuestions.length > 0 && (
            <div>
              <p style={sectionHead}>Discovery Questions</p>
              {d.discoveryQuestions.map((q, i) => (
                <div key={i} style={{ background: surf, borderRadius: 8, padding: "12px 14px", border: `1px solid ${bdr}`, marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 4 }}>Q{i + 1}: {q.question}</p>
                  <p style={{ fontSize: 11, color: muted, marginBottom: q.probe ? 4 : 0 }}>Purpose: {q.purpose}</p>
                  {q.probe && <p style={{ fontSize: 11, color: blue }}>Probe: {q.probe}</p>}
                </div>
              ))}
            </div>
          )}
          {d.objections && d.objections.length > 0 && (
            <div>
              <p style={sectionHead}>Objection Handling</p>
              {d.objections.map((o, i) => (
                <div key={i} style={{ background: "#FFF7ED", border: `1px solid #FED7AA`, borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: amber, marginBottom: 4 }}>&quot;{o.objection}&quot;</p>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.55, marginBottom: o.pivot ? 4 : 0 }}>{o.response}</p>
                  {o.pivot && <p style={{ fontSize: 11, color: green }}>Pivot: {o.pivot}</p>}
                </div>
              ))}
            </div>
          )}
          {d.closingLines && d.closingLines.length > 0 && (
            <div>
              <p style={sectionHead}>Closing Lines</p>
              {d.closingLines.map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: green, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                  <p style={{ fontSize: 13, color: ink, lineHeight: 1.5, fontStyle: "italic" }}>&quot;{line}&quot;</p>
                </div>
              ))}
            </div>
          )}
          {d.nextSteps && d.nextSteps.length > 0 && (
            <div>
              <p style={sectionHead}>After the Call</p>
              {d.nextSteps.map((step, i) => (
                <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingLeft: 10, marginBottom: 4 }}>→ {step}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Pipeline CRM tab ── */}
      {activeTab === "pipeline" && (
        <div>
          {loadingDeals ? (
            <p style={{ fontSize: 13, color: muted, textAlign: "center", padding: "32px 0" }}>Loading pipeline…</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {STAGES.map(stage => {
                const stageDealList = deals[stage] ?? [];
                const stageColor = STAGE_COLORS[stage] ?? muted;
                return (
                  <div key={stage}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: stageColor, flexShrink: 0 }} />
                      <p style={{ fontSize: 11, fontWeight: 700, color: stageColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        {STAGE_LABELS[stage]}
                      </p>
                      <span style={{ fontSize: 10, color: muted }}>({stageDealList.length})</span>
                    </div>
                    {stageDealList.length === 0 ? (
                      <p style={{ fontSize: 12, color: muted, paddingLeft: 16, fontStyle: "italic" }}>No deals</p>
                    ) : (
                      stageDealList.map((deal) => (
                        <div key={deal.id} style={{ background: surf, borderRadius: 8, border: `1px solid ${bdr}`, padding: "10px 14px", marginBottom: 6, marginLeft: 16 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{deal.company}</p>
                              {deal.contact_name && <p style={{ fontSize: 11, color: muted }}>{deal.contact_name}{deal.contact_title ? ` · ${deal.contact_title}` : ""}</p>}
                            </div>
                            {deal.value && <span style={{ fontSize: 12, fontWeight: 700, color: green, flexShrink: 0 }}>{deal.value}</span>}
                          </div>
                          {deal.next_action && (
                            <p style={{ fontSize: 11, color: blue, marginBottom: 6 }}>→ {deal.next_action}</p>
                          )}
                          {/* Stage mover */}
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                            {/* Deal score badge */}
                            {/* Deal score badge + stale flag */}
                            {(() => {
                              const stagePts: Record<string, number> = { lead: 20, qualified: 40, proposal: 60, negotiating: 75, won: 100, lost: 0 };
                              const daysSinceUpdate = deal.updated_at ? Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / 86400000) : (deal.created_at ? Math.floor((Date.now() - new Date(deal.created_at).getTime()) / 86400000) : 0);
                              const daysOld = deal.created_at ? Math.floor((Date.now() - new Date(deal.created_at).getTime()) / 86400000) : 0;
                              const stalePenalty = Math.min(daysOld * 1.5, 25);
                              const score = Math.max(0, Math.round((stagePts[stage] ?? 20) - stalePenalty));
                              const sc = score >= 70 ? green : score >= 40 ? amber : red;
                              if (stage === "won" || stage === "lost") return null;
                              return (
                                <>
                                  <span title="Deal score — likelihood to close" style={{ fontSize: 10, fontWeight: 700, color: sc, background: sc + "1A", padding: "2px 7px", borderRadius: 999, border: `1px solid ${sc}40`, marginRight: 4 }}>
                                    {score}
                                  </span>
                                  {daysSinceUpdate >= 30 && (
                                    <span title="Stale — no activity in 30+ days" style={{ fontSize: 10, fontWeight: 700, color: red, background: "#FEF2F2", padding: "2px 7px", borderRadius: 999, border: "1px solid #FECACA", marginRight: 4 }}>
                                      ⚠ Stale {daysSinceUpdate}d
                                    </span>
                                  )}
                                  {daysSinceUpdate >= 14 && daysSinceUpdate < 30 && (
                                    <span title="At risk — no activity in 14+ days" style={{ fontSize: 10, fontWeight: 700, color: amber, background: "#FFFBEB", padding: "2px 7px", borderRadius: 999, border: "1px solid #FDE68A", marginRight: 4 }}>
                                      ⚡ {daysSinceUpdate}d stale
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                            {STAGES.filter(s => s !== stage).map(s => (
                              <button
                                key={s}
                                onClick={() => handleMoveDeal(deal.id, s, deal.company)}
                                disabled={movingDeal === deal.id}
                                style={{
                                  padding: "2px 8px", borderRadius: 4, border: `1px solid ${STAGE_COLORS[s]}`,
                                  background: "transparent", color: STAGE_COLORS[s], fontSize: 10, fontWeight: 600,
                                  cursor: "pointer", opacity: movingDeal === deal.id ? 0.5 : 1,
                                }}
                              >
                                → {STAGE_LABELS[s]}
                              </button>
                            ))}
                          </div>
                          {/* Action buttons */}
                          {stage !== "won" && stage !== "lost" && (
                            <div style={{ display: "flex", gap: 6, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${bdr}` }}>
                              <button
                                onClick={() => handleDraftFollowUp(deal)}
                                style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${blue}`, background: "transparent", color: blue, fontSize: 10, fontWeight: 600, cursor: "pointer" }}
                              >
                                Draft Follow-up
                              </button>
                              <button
                                onClick={() => handleMeetingPrep(deal)}
                                style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${"#7C3AED"}`, background: "transparent", color: "#7C3AED", fontSize: 10, fontWeight: 600, cursor: "pointer" }}
                              >
                                Meeting Prep
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
              {totalDeals === 0 && (
                <div style={{ textAlign: "center", padding: "32px 16px" }}>
                  <p style={{ fontSize: 13, color: muted, marginBottom: 8 }}>No deals in your pipeline yet.</p>
                  <p style={{ fontSize: 11, color: muted }}>Send a proposal — it automatically creates a deal here.</p>
                </div>
              )}

              {/* Revenue forecast */}
              {totalDeals > 0 && (() => {
                const CLOSE_RATES: Record<string, number> = { lead: 0.05, qualified: 0.15, proposal: 0.30, negotiating: 0.60, won: 1, lost: 0 };
                let weightedPipeline = 0;
                let totalPipeline    = 0;
                Object.entries(deals).forEach(([stage, dealList]) => {
                  dealList.forEach(d => {
                    const val = d.value ? parseFloat(String(d.value).replace(/[^0-9.]/g, "")) : 0;
                    if (val > 0) {
                      totalPipeline    += val;
                      weightedPipeline += val * (CLOSE_RATES[stage] ?? 0);
                    }
                  });
                });
                if (totalPipeline === 0) return null;
                const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${Math.round(n)}`;
                return (
                  <div style={{ marginTop: 16, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "12px 16px" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: green, marginBottom: 6 }}>📈 Revenue Forecast</p>
                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                      <div>
                        <p style={{ fontSize: 18, fontWeight: 700, color: ink }}>{fmt(totalPipeline)}</p>
                        <p style={{ fontSize: 10, color: muted }}>Total pipeline value</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 18, fontWeight: 700, color: green }}>{fmt(weightedPipeline)}</p>
                        <p style={{ fontSize: 10, color: muted }}>Expected revenue (probability-weighted)</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: muted, marginTop: 6 }}>Based on close rates: Lead 5% · Qualified 15% · Proposal 30% · Negotiating 60%</p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── Follow-up Draft Modal ── */}
      {followUpDeal && (
        <div onClick={() => { if (!draftingFollowUp) { setFollowUpDeal(null); setFollowUpDraft(null); } }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 540, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Follow-up Email — {followUpDeal.company}</p>
              <button onClick={() => { setFollowUpDeal(null); setFollowUpDraft(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            {draftingFollowUp ? (
              <p style={{ fontSize: 13, color: muted, textAlign: "center", padding: "32px 0" }}>Drafting follow-up…</p>
            ) : followUpError ? (
              <p style={{ fontSize: 13, color: red }}>{followUpError}</p>
            ) : followUpDraft ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Subject</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{followUpDraft.subject}</p>
                </div>
                <div style={{ background: surf, borderRadius: 8, padding: "12px 14px", border: `1px solid ${bdr}` }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 6 }}>Body</p>
                  <p style={{ fontSize: 13, color: ink, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{followUpDraft.body}</p>
                </div>
                {followUpDraft.suggestedSendTime && (
                  <p style={{ fontSize: 11, color: muted }}>Best time to send: <strong>{followUpDraft.suggestedSendTime}</strong></p>
                )}
                {followUpDraft.talkingPoints && followUpDraft.talkingPoints.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 6 }}>Key Points</p>
                    {followUpDraft.talkingPoints.map((pt, i) => <p key={i} style={{ fontSize: 12, color: ink, marginBottom: 3 }}>• {pt}</p>)}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  {followUpDraft.subject && followUpDraft.body && (
                    <a
                      href={`https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(followUpDraft.subject)}&body=${encodeURIComponent(followUpDraft.body)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}
                    >
                      Open in Gmail
                    </a>
                  )}
                  <button
                    onClick={() => { navigator.clipboard.writeText(`Subject: ${followUpDraft.subject}\n\n${followUpDraft.body}`); setFollowUpCopied(true); setTimeout(() => setFollowUpCopied(false), 2000); }}
                    style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    {followUpCopied ? "Copied ✓" : "Copy Text"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Meeting Prep Modal ── */}
      {meetingPrepDeal && (
        <div onClick={() => { if (!loadingMeetingPrep) { setMeetingPrepDeal(null); setMeetingPrep(null); } }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 580, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Meeting Prep — {meetingPrepDeal.company}</p>
                {meetingPrepDeal.contact_name && <p style={{ fontSize: 11, color: muted }}>{meetingPrepDeal.contact_name}{meetingPrepDeal.contact_title ? ` · ${meetingPrepDeal.contact_title}` : ""}</p>}
              </div>
              <button onClick={() => { setMeetingPrepDeal(null); setMeetingPrep(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            {loadingMeetingPrep ? (
              <p style={{ fontSize: 13, color: muted, textAlign: "center", padding: "32px 0" }}>Researching company and preparing brief…</p>
            ) : meetingPrepError ? (
              <p style={{ fontSize: 13, color: red }}>{meetingPrepError}</p>
            ) : meetingPrep ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {meetingPrep.meetingGoal && (
                  <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 4 }}>Meeting Goal</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{meetingPrep.meetingGoal}</p>
                  </div>
                )}
                {meetingPrep.companySnapshot && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Company Snapshot</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{meetingPrep.companySnapshot}</p>
                  </div>
                )}
                {meetingPrep.contactInsight && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Contact Intel</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{meetingPrep.contactInsight}</p>
                  </div>
                )}
                {meetingPrep.openingQuestion && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 4 }}>Open With</p>
                    <p style={{ fontSize: 13, fontStyle: "italic", color: ink }}>&ldquo;{meetingPrep.openingQuestion}&rdquo;</p>
                  </div>
                )}
                {meetingPrep.talkingPoints && meetingPrep.talkingPoints.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 6 }}>Talking Points</p>
                    {meetingPrep.talkingPoints.map((pt, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: blue, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                        <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{pt}</p>
                      </div>
                    ))}
                  </div>
                )}
                {meetingPrep.likelyObjections && meetingPrep.likelyObjections.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 6 }}>Likely Objections</p>
                    {meetingPrep.likelyObjections.map((obj, i) => (
                      <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}`, marginBottom: 6 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: amber, marginBottom: 4 }}>&quot;{obj.objection}&quot;</p>
                        <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>→ {obj.response}</p>
                      </div>
                    ))}
                  </div>
                )}
                {meetingPrep.redFlags && meetingPrep.redFlags.length > 0 && (
                  <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 12px", border: "1px solid #FECACA" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", marginBottom: 6 }}>Watch Out</p>
                    {meetingPrep.redFlags.map((flag, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>⚠ {flag}</p>)}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Win/Loss Reason Modal ── */}
      {winLossPending && (
        <div onClick={() => { if (!savingWinLoss) { setWinLossPending(null); setWinLossReason(""); } }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>
                {winLossPending.stage === "won" ? "🎉 Mark as Won" : "📝 Mark as Lost"}
              </p>
              <button onClick={() => { setWinLossPending(null); setWinLossReason(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            <p style={{ fontSize: 13, color: muted, marginBottom: 14, lineHeight: 1.5 }}>
              {winLossPending.stage === "won"
                ? `Congrats on closing ${winLossPending.company}! What was the key reason you won?`
                : `What was the reason ${winLossPending.company} didn't close? (helps Susi spot patterns)`}
            </p>
            <textarea
              value={winLossReason}
              onChange={e => setWinLossReason(e.target.value)}
              placeholder={winLossPending.stage === "won"
                ? "e.g. Strong ROI case, champion inside the company…"
                : "e.g. Budget freeze, chose competitor X, bad timing…"}
              rows={3}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, fontSize: 13, color: ink, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                onClick={() => { setWinLossPending(null); setWinLossReason(""); }}
                style={{ flex: 1, padding: "9px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, color: ink, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Skip
              </button>
              <button
                onClick={handleConfirmWinLoss}
                disabled={savingWinLoss}
                style={{
                  flex: 1, padding: "9px", borderRadius: 8, border: "none",
                  background: winLossPending.stage === "won" ? green : red,
                  color: "#fff", fontSize: 13, fontWeight: 700, cursor: savingWinLoss ? "not-allowed" : "pointer",
                  opacity: savingWinLoss ? 0.7 : 1,
                }}
              >
                {savingWinLoss ? "Saving…" : winLossPending.stage === "won" ? "Mark Won" : "Mark Lost"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Send Proposal Modal ── */}
      {showModal && (
        <div
          onClick={() => { if (!sending) setShowModal(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Send Sales Proposal</p>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>

            {sendResult?.ok ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontSize: 24, marginBottom: 12 }}>✅</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: green, marginBottom: 6 }}>Proposal sent!</p>
                <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Check your pipeline — a deal was created automatically.</p>
                <button
                  onClick={() => { setShowModal(false); setSendResult(null); setProspectName(""); setProspectEmail(""); setProspectCompany(""); setDealValue(""); setUseCase(""); setActiveTab("pipeline"); }}
                  style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: green, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  View Pipeline
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Prospect Name *</label>
                    <input value={prospectName} onChange={e => setProspectName(e.target.value)} placeholder="Jane Smith" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Email *</label>
                    <input value={prospectEmail} onChange={e => setProspectEmail(e.target.value)} placeholder="jane@company.com" type="email" style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Company</label>
                    <input value={prospectCompany} onChange={e => setProspectCompany(e.target.value)} placeholder="Acme Corp" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Deal Value</label>
                    <input value={dealValue} onChange={e => setDealValue(e.target.value)} placeholder="$5,000/mo" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Use Case / What they want to solve</label>
                  <textarea value={useCase} onChange={e => setUseCase(e.target.value)} placeholder="They're struggling with..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </div>
                {sendResult?.error && (
                  <p style={{ fontSize: 12, color: red }}>{sendResult.error}</p>
                )}
                <button
                  onClick={handleSendProposal}
                  disabled={!prospectEmail || !prospectName || sending}
                  style={{
                    padding: "10px 20px", borderRadius: 8, border: "none",
                    background: !prospectEmail || !prospectName ? bdr : green,
                    color: !prospectEmail || !prospectName ? muted : "#fff",
                    fontSize: 13, fontWeight: 700, cursor: !prospectEmail || !prospectName ? "not-allowed" : "pointer",
                    marginTop: 4,
                  }}
                >
                  {sending ? "Sending…" : "Send Proposal via Email"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Analytics tab ── */}
      {(activeTab as string) === "analytics" && (() => {
        const allDeals = Object.values(deals).flat();
        const activeDeals = allDeals.filter(d => d.stage !== "won" && d.stage !== "lost");
        const wonDeals    = deals.won  ?? [];
        const lostDeals   = deals.lost ?? [];

        // Funnel stage counts
        const funnelStages = ["lead", "qualified", "proposal", "negotiating"] as const;
        const funnelCounts = funnelStages.map(s => (deals[s] ?? []).length);

        // Conversion rates between consecutive funnel stages
        const convRates = funnelStages.slice(1).map((_, i) =>
          funnelCounts[i] > 0 ? Math.round((funnelCounts[i + 1] / funnelCounts[i]) * 100) : 0
        );

        // Total pipeline value
        const pipelineValue = activeDeals.reduce((sum, d) => {
          const v = parseFloat((d.value ?? "").replace(/[^0-9.]/g, ""));
          return sum + (isNaN(v) ? 0 : v);
        }, 0);

        // Stale deals (no update in 14+ days)
        const now = Date.now();
        const staleDeals = activeDeals.filter(d => {
          if (!d.updated_at && !d.created_at) return false;
          const ts = new Date(d.updated_at ?? d.created_at ?? "").getTime();
          return (now - ts) / 86400000 > 14;
        });

        // Win rate
        const closedCount = wonDeals.length + lostDeals.length;
        const winRate = closedCount > 0 ? Math.round((wonDeals.length / closedCount) * 100) : null;

        // Avg deal value (won deals)
        const wonValues = wonDeals
          .map(d => parseFloat((d.value ?? "").replace(/[^0-9.]/g, "")))
          .filter(v => !isNaN(v) && v > 0);
        const avgWonValue = wonValues.length > 0 ? Math.round(wonValues.reduce((a, b) => a + b, 0) / wonValues.length) : null;

        const statCard = (label: string, value: string, sub?: string, accent?: string) => (
          <div style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 12, padding: "18px 20px", flex: 1, minWidth: 120 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: accent ?? ink, lineHeight: 1 }}>{value}</p>
            {sub && <p style={{ fontSize: 11, color: muted, marginTop: 4 }}>{sub}</p>}
          </div>
        );

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* KPI row */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {statCard("Active Deals", String(activeDeals.length), `${wonDeals.length} won · ${lostDeals.length} lost`)}
              {statCard("Pipeline Value", pipelineValue > 0 ? `$${pipelineValue.toLocaleString()}` : "—", "active stages")}
              {statCard("Win Rate", winRate !== null ? `${winRate}%` : "—", `${closedCount} closed deals`, winRate !== null ? (winRate >= 50 ? green : red) : undefined)}
              {statCard("Avg Won Value", avgWonValue ? `$${avgWonValue.toLocaleString()}` : "—", wonValues.length > 0 ? `${wonValues.length} deals` : "no data")}
            </div>

            {/* Funnel */}
            <div style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 12, padding: "20px 22px" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 16 }}>Sales Funnel</p>
              {funnelStages.map((stage, i) => {
                const count = funnelCounts[i];
                const maxCount = Math.max(...funnelCounts, 1);
                const pct = Math.round((count / maxCount) * 100);
                const colors = [muted, blue, amber, "#7C3AED"];
                return (
                  <div key={stage} style={{ marginBottom: i < funnelStages.length - 1 ? 10 : 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: colors[i], textTransform: "capitalize" }}>{stage}</span>
                      <span style={{ fontSize: 12, color: muted }}>{count} deal{count !== 1 ? "s" : ""}{i > 0 && funnelCounts[i - 1] > 0 ? ` · ${convRates[i - 1]}% from prev` : ""}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: surf, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: colors[i], borderRadius: 4, transition: "width 0.4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stale deals alert */}
            {staleDeals.length > 0 && (
              <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 8 }}>⚠ {staleDeals.length} Stale Deal{staleDeals.length !== 1 ? "s" : ""} (14+ days inactive)</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {staleDeals.map(d => {
                    const ts = new Date(d.updated_at ?? d.created_at ?? "").getTime();
                    const days = Math.floor((now - ts) / 86400000);
                    return (
                      <span key={d.id} style={{ fontSize: 11, fontWeight: 600, background: bdr, borderRadius: 6, padding: "3px 10px", color: ink }}>
                        {d.company} · {days}d
                      </span>
                    );
                  })}
                </div>
                <p style={{ fontSize: 11, color: muted, marginTop: 10 }}>Use &quot;Draft Follow-up&quot; in the Pipeline tab to re-engage.</p>
              </div>
            )}

            {/* Stage breakdown table */}
            <div style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 12, padding: "20px 22px" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 14 }}>Stage Breakdown</p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${bdr}` }}>
                    {["Stage", "Deals", "Value", "% of Pipeline"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, color: muted, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(["lead", "qualified", "proposal", "negotiating", "won", "lost"] as const).map(stage => {
                    const stageDls = deals[stage] ?? [];
                    const stageVal = stageDls.reduce((sum, dl) => {
                      const v = parseFloat((dl.value ?? "").replace(/[^0-9.]/g, ""));
                      return sum + (isNaN(v) ? 0 : v);
                    }, 0);
                    const totalVal = allDeals.reduce((sum, dl) => {
                      const v = parseFloat((dl.value ?? "").replace(/[^0-9.]/g, ""));
                      return sum + (isNaN(v) ? 0 : v);
                    }, 0);
                    const stageColors: Record<string, string> = { lead: muted, qualified: blue, proposal: amber, negotiating: "#7C3AED", won: green, lost: red };
                    return (
                      <tr key={stage} style={{ borderBottom: `1px solid ${surf}` }}>
                        <td style={{ padding: "9px 8px" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: stageColors[stage], textTransform: "capitalize" }}>{stage}</span>
                        </td>
                        <td style={{ padding: "9px 8px", color: ink, fontWeight: 600 }}>{stageDls.length}</td>
                        <td style={{ padding: "9px 8px", color: muted }}>{stageVal > 0 ? `$${stageVal.toLocaleString()}` : "—"}</td>
                        <td style={{ padding: "9px 8px", color: muted }}>{totalVal > 0 && stageVal > 0 ? `${Math.round((stageVal / totalVal) * 100)}%` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Revenue Forecast ── */}
            {activeDeals.length > 0 && (() => {
              // Stage-based close probability weights
              const stageProbability: Record<string, number> = { lead: 0.10, qualified: 0.25, proposal: 0.45, negotiating: 0.75 };
              // Expected revenue = Σ (deal_value × close_probability)
              const expectedRevenue = activeDeals.reduce((sum, d) => {
                const v = parseFloat((d.value ?? "").replace(/[^0-9.]/g, ""));
                const prob = stageProbability[d.stage] ?? 0.10;
                return sum + (isNaN(v) ? 0 : v * prob);
              }, 0);
              // Historical win rate adjusted forecast
              const wrAdjusted = winRate !== null ? activeDeals.reduce((sum, d) => {
                const v = parseFloat((d.value ?? "").replace(/[^0-9.]/g, ""));
                return sum + (isNaN(v) ? 0 : v * winRate / 100);
              }, 0) : null;
              // Avg deal age in days
              const ages = activeDeals.map(d => {
                const ts = new Date(d.created_at ?? Date.now()).getTime();
                return Math.floor((Date.now() - ts) / 86400000);
              });
              const avgAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
              // Estimated close window (rough: most startups close in 30-90 days)
              const closeWindow = avgAge < 30 ? "30–60 days" : avgAge < 60 ? "60–90 days" : "90+ days";
              return (
                <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "20px 22px" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 4 }}>Revenue Forecast</p>
                  <p style={{ fontSize: 11, color: muted, marginBottom: 16 }}>Based on {activeDeals.length} active deal{activeDeals.length !== 1 ? "s" : ""} and stage close probabilities.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                    {[
                      { label: "Expected (weighted)", value: `$${Math.round(expectedRevenue).toLocaleString()}`, sub: "stage probability model", accent: blue },
                      { label: "Historical Rate", value: wrAdjusted !== null ? `$${Math.round(wrAdjusted).toLocaleString()}` : "—", sub: winRate !== null ? `${winRate}% win rate` : "no closed deals yet", accent: winRate !== null && winRate >= 50 ? green : red },
                      { label: "Likely Close Window", value: closeWindow, sub: `avg deal age: ${avgAge}d`, accent: ink },
                    ].map(({ label, value, sub, accent }) => (
                      <div key={label} style={{ background: "#fff", borderRadius: 8, padding: "14px 16px", border: `1px solid #BFDBFE` }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</p>
                        <p style={{ fontSize: 22, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</p>
                        <p style={{ fontSize: 10, color: muted, marginTop: 4 }}>{sub}</p>
                      </div>
                    ))}
                  </div>
                  {/* Per-stage forecast breakdown */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: muted, letterSpacing: "0.1em", marginBottom: 8 }}>Stage Contribution</p>
                    {(["lead", "qualified", "proposal", "negotiating"] as const).map(stage => {
                      const stageDls = (deals[stage] ?? []);
                      const stageExpected = stageDls.reduce((sum, d) => {
                        const v = parseFloat((d.value ?? "").replace(/[^0-9.]/g, ""));
                        const prob = stageProbability[stage];
                        return sum + (isNaN(v) ? 0 : v * prob);
                      }, 0);
                      const contrib = expectedRevenue > 0 ? Math.round((stageExpected / expectedRevenue) * 100) : 0;
                      const sc = { lead: muted, qualified: blue, proposal: amber, negotiating: "#7C3AED" }[stage];
                      if (stageDls.length === 0) return null;
                      return (
                        <div key={stage} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: sc, textTransform: "capitalize", width: 90 }}>{stage}</span>
                          <div style={{ flex: 1, height: 6, background: surf, borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ width: `${contrib}%`, height: "100%", background: sc, borderRadius: 999 }} />
                          </div>
                          <span style={{ fontSize: 11, color: muted, width: 80, textAlign: "right" }}>${Math.round(stageExpected).toLocaleString()} ({Math.round(stageProbability[stage] * 100)}%)</span>
                        </div>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: 10, color: muted, marginTop: 12, fontStyle: "italic" }}>Probabilities: Lead 10% · Qualified 25% · Proposal 45% · Negotiating 75%</p>
                </div>
              );
            })()}

            {/* ── AI Revenue Forecast ── */}
            <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>
                    AI Revenue Forecast
                    {forecastResult?.pipelineHealth && <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: forecastResult.pipelineHealth === 'strong' ? "#DCFCE7" : forecastResult.pipelineHealth === 'at_risk' ? "#FEE2E2" : "#FEF3C7", color: forecastResult.pipelineHealth === 'strong' ? green : forecastResult.pipelineHealth === 'at_risk' ? red : amber, fontWeight: 700, textTransform: "capitalize" }}>{forecastResult.pipelineHealth.replace('_', ' ')}</span>}
                  </p>
                  <p style={{ fontSize: 11, color: muted }}>AI-powered 30/60/90 day forecast from your pipeline using close rate modeling and deal stage weighting.</p>
                </div>
                <button onClick={() => { setShowForecastPanel(!showForecastPanel); if (!forecastResult && !showForecastPanel) handleAIForecast(); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, marginLeft: 12 }}>
                  {showForecastPanel ? "Hide" : "Run Forecast"}
                </button>
              </div>
              {showForecastPanel && (
                <div style={{ marginTop: 14 }}>
                  {runningForecast ? (
                    <p style={{ fontSize: 12, color: muted, textAlign: "center", padding: "24px 0" }}>Analyzing pipeline and modeling revenue…</p>
                  ) : forecastError ? (
                    <p style={{ fontSize: 12, color: red }}>{forecastError}</p>
                  ) : forecastResult ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {/* 30/60/90 grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                        {([["30-Day", forecastResult.thirtyDay], ["60-Day", forecastResult.sixtyDay], ["90-Day", forecastResult.ninetyDay]] as [string, typeof forecastResult.thirtyDay][]).map(([label, p]) => p ? (
                          <div key={label} style={{ background: bg, borderRadius: 10, padding: "12px 14px", border: `1px solid ${bdr}` }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 6 }}>{label}</p>
                            <p style={{ fontSize: 18, fontWeight: 800, color: blue }}>{p.expected}</p>
                            <p style={{ fontSize: 10, color: green, marginTop: 2 }}>↑ {p.optimistic}</p>
                            <p style={{ fontSize: 10, color: red }}>↓ {p.pessimistic}</p>
                            <p style={{ fontSize: 10, color: muted, marginTop: 4, lineHeight: 1.4 }}>{p.reasoning}</p>
                          </div>
                        ) : null)}
                      </div>
                      {forecastResult.closeRateEstimate && (
                        <p style={{ fontSize: 11, color: muted }}>Est. close rate: <strong style={{ color: ink }}>{forecastResult.closeRateEstimate}</strong></p>
                      )}
                      {forecastResult.topDeals && forecastResult.topDeals.length > 0 && (
                        <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", border: "1px solid #BBF7D0" }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 6 }}>Most Likely to Close</p>
                          {forecastResult.topDeals.map((d, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>✓ {d}</p>)}
                        </div>
                      )}
                      {forecastResult.riskDeals && forecastResult.riskDeals.length > 0 && (
                        <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 12px", border: "1px solid #FECACA" }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", marginBottom: 6 }}>At Risk</p>
                          {forecastResult.riskDeals.map((d, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>⚠ {d}</p>)}
                        </div>
                      )}
                      {forecastResult.recommendation && (
                        <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 12px", border: "1px solid #BFDBFE" }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 4 }}>Susi Recommends</p>
                          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{forecastResult.recommendation}</p>
                        </div>
                      )}
                      <button onClick={handleAIForecast} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Refresh Forecast</button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* ── Deal Scoring ── */}
            {activeDeals.length > 0 && (() => {
              // Score each deal 0-100 based on stage, idle time, and deal value
              const STAGE_BASE: Record<string, number> = { lead: 15, qualified: 35, proposal: 60, negotiating: 80 };
              type Deal = { company: string; stage: string; value?: string; updated_at?: string; created_at?: string; contact_name?: string };
              const scored = (activeDeals as Deal[]).map((d) => {
                const stageScore = STAGE_BASE[d.stage] ?? 10;
                const lastUpdate = d.updated_at ?? d.created_at ?? "";
                const idleDays = lastUpdate ? Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 86400000) : 0;
                const idlePenalty = Math.min(idleDays * 1.5, 30); // -1.5 per idle day, max -30
                const val = parseFloat((d.value ?? "").replace(/[^0-9.]/g, "")) || 0;
                const valueBump = val >= 10000 ? 5 : val >= 5000 ? 3 : val >= 1000 ? 1 : 0;
                const score = Math.max(5, Math.min(98, stageScore - idlePenalty + valueBump));
                return { company: d.company, stage: d.stage, score: Math.round(score), idleDays, value: d.value };
              }).sort((a, b) => b.score - a.score);

              return (
                <div style={{ background: surf, borderRadius: 12, padding: "16px 20px", border: `1px solid ${bdr}` }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 4 }}>Deal Scoring — Close Likelihood</p>
                  <p style={{ fontSize: 11, color: muted, marginBottom: 14 }}>Ranked by probability to close. Score = stage + recency + deal size. Idle deals lose score over time.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {scored.map((d, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: d.score >= 70 ? "#F0FDF4" : d.score >= 45 ? "#FFFBEB" : "#FEF2F2", border: `2px solid ${d.score >= 70 ? green : d.score >= 45 ? amber : red}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 800, color: d.score >= 70 ? green : d.score >= 45 ? amber : red }}>{d.score}</p>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{d.company}</p>
                            <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 999, background: surf, border: `1px solid ${bdr}`, color: muted, textTransform: "capitalize" }}>{d.stage}</span>
                            {d.value && <span style={{ fontSize: 10, color: green, fontWeight: 600 }}>{d.value}</span>}
                          </div>
                          <div style={{ marginTop: 4, height: 5, background: bdr, borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${d.score}%`, height: "100%", background: d.score >= 70 ? green : d.score >= 45 ? amber : red, borderRadius: 3 }} />
                          </div>
                        </div>
                        {d.idleDays > 7 && (
                          <span style={{ fontSize: 10, color: red, fontWeight: 600, flexShrink: 0 }}>⚠ {d.idleDays}d idle</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── Pipeline Funnel Analytics ── */}
            <div style={{ background: surf, borderRadius: 12, padding: "16px 20px", border: `1px solid ${bdr}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>Pipeline Funnel Analytics</p>
                  <p style={{ fontSize: 11, color: muted }}>Stage-by-stage funnel with conversion rates, velocity, and strategic insights.</p>
                  {pipelineAnalyticsError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{pipelineAnalyticsError}</p>}
                </div>
                <button onClick={handleRunPipelineAnalytics} disabled={loadingPipelineAnalytics} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: loadingPipelineAnalytics ? bdr : blue, color: loadingPipelineAnalytics ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: loadingPipelineAnalytics ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {loadingPipelineAnalytics ? "Analyzing…" : "Run Analysis"}
                </button>
              </div>
              {pipelineAnalytics && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {[
                      { label: "Total Deals", value: pipelineAnalytics.totalDeals ?? 0 },
                      { label: "Active Value", value: `$${((pipelineAnalytics.activePipelineValue ?? 0) / 1000).toFixed(1)}k` },
                      { label: "Win Rate", value: pipelineAnalytics.winRate != null ? `${pipelineAnalytics.winRate}%` : "N/A" },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                        <p style={{ fontSize: 16, fontWeight: 800, color: ink }}>{value}</p>
                        <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>{label}</p>
                      </div>
                    ))}
                  </div>
                  {pipelineAnalytics.stages && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {pipelineAnalytics.stages.filter(s => s.stage !== 'lost').map(s => (
                        <div key={s.stage} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 11, color: muted, width: 90, flexShrink: 0, textTransform: "capitalize" }}>{s.stage}</span>
                          <div style={{ flex: 1, height: 6, background: bdr, borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(100, (s.count / (pipelineAnalytics.totalDeals ?? 1)) * 100)}%`, height: "100%", background: s.stage === 'won' ? green : blue, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: ink, width: 22, textAlign: "right", flexShrink: 0 }}>{s.count}</span>
                          {s.conversionToNext != null && <span style={{ fontSize: 10, color: muted, flexShrink: 0 }}>→{s.conversionToNext}%</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {pipelineAnalytics.bottleneck && (
                    <div style={{ background: "#FFF7ED", borderRadius: 8, padding: "10px 12px", border: "1px solid #FED7AA" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: amber, textTransform: "uppercase", marginBottom: 4 }}>Bottleneck</p>
                      <p style={{ fontSize: 12, color: ink }}>{pipelineAnalytics.bottleneck} — {pipelineAnalytics.velocityComment}</p>
                    </div>
                  )}
                  {pipelineAnalytics.topRecommendation && (
                    <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 12px", border: "1px solid #BFDBFE" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 4 }}>Top Action</p>
                      <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{pipelineAnalytics.topRecommendation}</p>
                    </div>
                  )}
                  {pipelineAnalytics.quickWins && pipelineAnalytics.quickWins.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 6 }}>Quick Wins</p>
                      {pipelineAnalytics.quickWins.map((w, i) => <p key={i} style={{ fontSize: 12, color: ink, marginBottom: 4 }}>→ {w}</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── AI Deal Scoring ── */}
            <div style={{ background: surf, borderRadius: 12, padding: "16px 20px", border: `1px solid ${bdr}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>AI Deal Scoring</p>
                  <p style={{ fontSize: 11, color: muted }}>Susi scores each deal 0–100 with reasoning, urgency, and next-step advice.</p>
                  {aiDealScoresError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{aiDealScoresError}</p>}
                </div>
                <button onClick={handleRunAIScoring} disabled={loadingAIDealScores} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: loadingAIDealScores ? bdr : "#7C3AED", color: loadingAIDealScores ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: loadingAIDealScores ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {loadingAIDealScores ? "Scoring…" : "Score Deals"}
                </button>
              </div>
              {aiDealScores && aiDealScores.scores && aiDealScores.scores.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                    <div style={{ flex: 1, background: bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: ink }}>{aiDealScores.avgScore}</p>
                      <p style={{ fontSize: 10, color: muted }}>Avg Score</p>
                    </div>
                    {aiDealScores.topDeal && (
                      <div style={{ flex: 2, background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", border: "1px solid #BBF7D0" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 3 }}>Top Deal</p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{String(aiDealScores.topDeal.company ?? '')}</p>
                        <p style={{ fontSize: 11, color: muted }}>Score {String(aiDealScores.topDeal.score ?? '')} · {String(aiDealScores.topDeal.urgency ?? '')} urgency</p>
                      </div>
                    )}
                  </div>
                  {aiDealScores.scores.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", background: bg, borderRadius: 10, border: `1px solid ${bdr}` }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: s.score >= 70 ? "#F0FDF4" : s.score >= 50 ? "#FFFBEB" : "#FEF2F2", border: `2px solid ${s.score >= 70 ? green : s.score >= 50 ? amber : red}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color: s.score >= 70 ? green : s.score >= 50 ? amber : red, lineHeight: 1 }}>{s.score}</p>
                        <p style={{ fontSize: 9, fontWeight: 700, color: s.score >= 70 ? green : s.score >= 50 ? amber : red }}>{s.grade}</p>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{s.company}</p>
                          <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 999, background: s.urgency === 'high' ? "#FEF2F2" : s.urgency === 'medium' ? "#FFFBEB" : surf, border: `1px solid ${s.urgency === 'high' ? red : s.urgency === 'medium' ? amber : bdr}`, color: s.urgency === 'high' ? red : s.urgency === 'medium' ? amber : muted, textTransform: "uppercase", fontWeight: 700 }}>{s.urgency}</span>
                          {s.daysStale > 0 && <span style={{ fontSize: 10, color: muted }}>{s.daysStale}d idle</span>}
                        </div>
                        <p style={{ fontSize: 11, color: muted, marginBottom: 4, lineHeight: 1.5 }}>{s.reasoning}</p>
                        <p style={{ fontSize: 11, color: blue, fontWeight: 600 }}>→ {s.nextAction}</p>
                      </div>
                    </div>
                  ))}
                  {aiDealScores.atRiskDeals && aiDealScores.atRiskDeals.length > 0 && (
                    <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 12px", border: "1px solid #FECACA" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", marginBottom: 4 }}>At-Risk Deals ({aiDealScores.atRiskDeals.length})</p>
                      {aiDealScores.atRiskDeals.map((d, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 2 }}>⚠ {String(d.company ?? '')} — score {String(d.score ?? '')}</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Pricing Strategy ── */}
            <div
              style={{ background: bg, borderRadius: 14, border: `1px solid ${bdr}`, overflow: "hidden", transition: "border-color .18s, box-shadow .18s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C7D2FE"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(37,99,235,0.07)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
                <div style={{ height: 36, width: 36, borderRadius: 10, flexShrink: 0, background: `${green}12`, border: `1px solid ${green}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {generatingPricingStrategy
                    ? <motion.div style={{ height: 13, width: 13, borderRadius: "50%", border: `2px solid ${bdr}`, borderTopColor: green }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
                    : <DollarSign size={15} style={{ color: green }} />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Pricing Strategy</p>
                  <p style={{ fontSize: 11, color: muted, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Full pricing model — tiers, discounting, trial strategy, and anchoring.</p>
                </div>
                <button onClick={handleGeneratePricingStrategy} disabled={generatingPricingStrategy}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "none", color: generatingPricingStrategy ? muted : green, border: `1.5px solid ${generatingPricingStrategy ? bdr : green}40`, cursor: generatingPricingStrategy ? "wait" : "pointer", transition: "all .15s", flexShrink: 0, fontFamily: "inherit" }}
                  onMouseEnter={(e) => { if (!generatingPricingStrategy) { e.currentTarget.style.background = `${green}10`; e.currentTarget.style.borderColor = green; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = `${green}40`; }}
                >
                  {generatingPricingStrategy ? "Running…" : "Run"}{!generatingPricingStrategy && <ChevronRight size={11} />}
                </button>
              </div>
              {(pricingStrategy || pricingStrategyError) && (
                <div style={{ borderTop: `1px solid ${bdr}`, padding: "13px 14px" }}>
                  {pricingStrategyError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{pricingStrategyError}</p>}
              {pricingStrategy && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {pricingStrategy.recommendedModel && <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999, background: "#EDE9FE", color: "#7C3AED", border: "1px solid #C4B5FD" }}>{pricingStrategy.recommendedModel}</span>}
                    {pricingStrategy.rationale && <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, flex: 1 }}>{pricingStrategy.rationale}</p>}
                  </div>
                  {pricingStrategy.tiers && pricingStrategy.tiers.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase" }}>Pricing Tiers</p>
                      {pricingStrategy.tiers.map((tier, i) => (
                        <div key={i} style={{ background: bg, borderRadius: 10, padding: "12px 14px", border: `1px solid ${bdr}` }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{tier.name}</p>
                            <p style={{ fontSize: 14, fontWeight: 800, color: "#7C3AED" }}>{tier.price}</p>
                          </div>
                          {tier.targetCustomer && <p style={{ fontSize: 11, color: blue, marginBottom: 5 }}>{tier.targetCustomer}</p>}
                          {tier.keyFeatures && tier.keyFeatures.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {tier.keyFeatures.map((f, j) => <span key={j} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: surf, border: `1px solid ${bdr}`, color: ink }}>{f}</span>)}
                            </div>
                          )}
                          {tier.positioningNote && <p style={{ fontSize: 10, color: muted, marginTop: 5, lineHeight: 1.5 }}>{tier.positioningNote}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {pricingStrategy.trialStrategy && (
                      <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", border: "1px solid #BBF7D0" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 4 }}>Trial Strategy</p>
                        <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{pricingStrategy.trialStrategy}</p>
                      </div>
                    )}
                    {pricingStrategy.anchoringTactic && (
                      <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 12px", border: "1px solid #BFDBFE" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 4 }}>Anchoring Tactic</p>
                        <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{pricingStrategy.anchoringTactic}</p>
                      </div>
                    )}
                    {pricingStrategy.discountingPolicy && (
                      <div style={{ background: surf, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}` }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Discounting Policy</p>
                        <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{pricingStrategy.discountingPolicy}</p>
                      </div>
                    )}
                    {pricingStrategy.yourAdvantage && (
                      <div style={{ background: "#FFF7ED", borderRadius: 8, padding: "10px 12px", border: "1px solid #FED7AA" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: amber, textTransform: "uppercase", marginBottom: 4 }}>Your Advantage</p>
                        <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{pricingStrategy.yourAdvantage}</p>
                      </div>
                    )}
                  </div>
                  {pricingStrategy.keyInsight && (
                    <div style={{ background: "#EDE9FE", borderRadius: 8, padding: "10px 14px", border: "1px solid #C4B5FD" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", marginBottom: 4 }}>Key Insight</p>
                      <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{pricingStrategy.keyInsight}</p>
                    </div>
                  )}
                  <button onClick={() => setPricingStrategy(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Regenerate</button>
                </div>
              )}
                </div>
              )}
            </div>

            {/* ── BANT/MEDDIC Qualification Scorecard ── */}
            <div
              style={{ background: bg, borderRadius: 14, border: `1px solid ${bdr}`, overflow: "hidden", transition: "border-color .18s, box-shadow .18s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C7D2FE"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(37,99,235,0.07)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
                <div style={{ height: 36, width: 36, borderRadius: 10, flexShrink: 0, background: "#7C3AED12", border: "1px solid #7C3AED25", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {runningQualification
                    ? <motion.div style={{ height: 13, width: 13, borderRadius: "50%", border: `2px solid ${bdr}`, borderTopColor: "#7C3AED" }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
                    : <CheckCircle2 size={15} style={{ color: "#7C3AED" }} />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>BANT + MEDDIC Qualification</p>
                  <p style={{ fontSize: 11, color: muted, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Score each open deal against BANT and MEDDIC criteria.</p>
                </div>
                <button onClick={handleRunQualification} disabled={runningQualification}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "none", color: runningQualification ? muted : "#7C3AED", border: `1.5px solid ${runningQualification ? bdr : "#7C3AED40"}`, cursor: runningQualification ? "wait" : "pointer", transition: "all .15s", flexShrink: 0, fontFamily: "inherit" }}
                  onMouseEnter={(e) => { if (!runningQualification) { e.currentTarget.style.background = "#7C3AED10"; e.currentTarget.style.borderColor = "#7C3AED"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "#7C3AED40"; }}
                >
                  {runningQualification ? "Running…" : "Run"}{!runningQualification && <ChevronRight size={11} />}
                </button>
              </div>
              {(qualificationResult || qualificationError) && (
                <div style={{ borderTop: `1px solid ${bdr}`, padding: "13px 14px" }}>
                  {qualificationError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{qualificationError}</p>}
              {qualificationResult && qualificationResult.scorecards && qualificationResult.scorecards.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {qualificationResult.scorecards.map((sc, i) => (
                    <div key={i} style={{ background: bg, borderRadius: 10, padding: "14px 16px", border: `1px solid ${bdr}` }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                        <div style={{ width: 52, height: 52, borderRadius: 10, background: sc.score >= 70 ? "#F0FDF4" : sc.score >= 50 ? "#FFFBEB" : "#FEF2F2", border: `2px solid ${sc.score >= 70 ? green : sc.score >= 50 ? amber : red}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <p style={{ fontSize: 16, fontWeight: 800, color: sc.score >= 70 ? green : sc.score >= 50 ? amber : red, lineHeight: 1 }}>{sc.score}</p>
                          <p style={{ fontSize: 10, fontWeight: 700, color: sc.score >= 70 ? green : sc.score >= 50 ? amber : red }}>{sc.grade}</p>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{sc.company}</p>
                            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 999, background: sc.recommendation === 'advance' ? "#F0FDF4" : sc.recommendation === 'disqualify' ? "#FEF2F2" : "#FFFBEB", border: `1px solid ${sc.recommendation === 'advance' ? green : sc.recommendation === 'disqualify' ? red : amber}`, color: sc.recommendation === 'advance' ? green : sc.recommendation === 'disqualify' ? red : amber, fontWeight: 700, textTransform: "uppercase" }}>{sc.recommendation?.replace(/_/g, ' ')}</span>
                          </div>
                          {sc.criteria && sc.criteria.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                              {sc.criteria.slice(0, 8).map((c, ci) => (
                                <span key={ci} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: c.met ? "#F0FDF4" : "#FEF2F2", border: `1px solid ${c.met ? "#BBF7D0" : "#FECACA"}`, color: c.met ? green : red }}>{c.met ? "✓" : "✗"} {c.name}</span>
                              ))}
                            </div>
                          )}
                          {sc.keyRisk && <p style={{ fontSize: 11, color: red, marginBottom: 4 }}>⚠ {sc.keyRisk}</p>}
                        </div>
                      </div>
                      {sc.nextQuestion && (
                        <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "8px 12px", border: "1px solid #BFDBFE" }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 3 }}>Best Next Question</p>
                          <p style={{ fontSize: 12, color: ink, fontStyle: "italic" }}>&quot;{sc.nextQuestion}&quot;</p>
                        </div>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setQualificationResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Re-qualify</button>
                </div>
              )}
                </div>
              )}
            </div>

            {/* ── Reply Draft Generator ── */}
            <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px", marginTop: 4 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Reply Draft Generator</p>
              <p style={{ fontSize: 11, color: muted, marginBottom: 12 }}>Paste a prospect message and Patel drafts 3 reply options — consultative, direct, and curiosity-led — each with a ready-to-send body and clear next step.</p>
              <textarea value={replyMessage} onChange={e => setReplyMessage(e.target.value)} placeholder="Paste the prospect's message here…"
                rows={3} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${replyMessage ? bdr : '#D97706'}`, fontSize: 12, color: ink, background: "#fff", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8 }} />
              <input value={replyContext} onChange={e => setReplyContext(e.target.value)} placeholder="Optional context (e.g. we met at SaaStr, they're mid-evaluation)"
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: "#fff", outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
              {replyError && <p style={{ fontSize: 11, color: '#DC2626', marginBottom: 8 }}>{replyError}</p>}
              <button onClick={handleGenerateReply} disabled={!replyMessage.trim() || generatingReply}
                style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: (!replyMessage.trim() || generatingReply) ? '#E2DDD5' : green, color: (!replyMessage.trim() || generatingReply) ? '#8A867C' : "#fff", fontSize: 12, fontWeight: 600, cursor: (!replyMessage.trim() || generatingReply) ? "not-allowed" : "pointer" }}>
                {generatingReply ? "Drafting…" : "Draft 3 Replies"}
              </button>
              {replyResult && (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  {!!replyResult.prospectSignal && (
                    <div style={{ background: "#FFFBEB", borderRadius: 8, padding: "8px 12px", border: "1px solid #FDE68A" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#D97706', textTransform: "uppercase", marginBottom: 2 }}>Prospect Signal</p>
                      <p style={{ fontSize: 11, color: '#18160F' }}>{replyResult.prospectSignal as string}</p>
                    </div>
                  )}
                  {/* Draft tabs */}
                  <div style={{ display: "flex", gap: 6 }}>
                    {(replyResult.drafts as { toneLabel: string }[] | undefined)?.map((d, i) => (
                      <button key={i} onClick={() => setActiveDraft(i)}
                        style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: activeDraft === i ? '#18160F' : "transparent", color: activeDraft === i ? "#fff" : '#8A867C', fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        {d.toneLabel}
                      </button>
                    ))}
                  </div>
                  {!!(replyResult.drafts as { body: string; callToAction: string; followUpLine: string; wordCount: number; why: string }[] | undefined)?.[activeDraft] && (
                    <div style={{ background: "#fff", borderRadius: 8, padding: "14px 16px", border: `1px solid #E2DDD5` }}>
                      {(({ body, callToAction, followUpLine, wordCount, why }) => (<>
                        <p style={{ fontSize: 12, color: '#18160F', lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 10 }}>{body}</p>
                        <div style={{ borderTop: `1px solid #E2DDD5`, paddingTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                          <p style={{ fontSize: 11, color: '#2563EB', fontWeight: 600, margin: 0 }}>CTA: {callToAction}</p>
                          {followUpLine && <p style={{ fontSize: 11, color: '#8A867C', fontStyle: "italic", margin: 0 }}>{followUpLine}</p>}
                        </div>
                        <p style={{ fontSize: 10, color: '#8A867C', marginTop: 6, margin: 0 }}>{wordCount} words · {why}</p>
                        <button onClick={() => { navigator.clipboard.writeText(body + (callToAction ? '\n\n' + callToAction : '') + (followUpLine ? '\n' + followUpLine : '')); }}
                          style={{ marginTop: 8, padding: "4px 10px", borderRadius: 6, border: `1px solid #E2DDD5`, background: '#F9F7F2', color: '#8A867C', fontSize: 11, cursor: "pointer" }}>
                          Copy Reply
                        </button>
                      </>))((replyResult.drafts as { body: string; callToAction: string; followUpLine: string; wordCount: number; why: string }[])[activeDraft])}
                    </div>
                  )}
                  {!!replyResult.nextBestAction && (
                    <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "8px 12px", border: "1px solid #BFDBFE" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', textTransform: "uppercase", marginBottom: 2 }}>Next Best Action</p>
                      <p style={{ fontSize: 11, color: '#18160F' }}>{replyResult.nextBestAction as string}</p>
                    </div>
                  )}
                  <button onClick={() => { setReplyResult(null); setReplyMessage(''); }}
                    style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid #E2DDD5`, background: '#F9F7F2', color: '#8A867C', fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>
                    New Reply
                  </button>
                </div>
              )}
            </div>

            {/* ── Proposal Generator ── */}
            <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px", marginTop: 4 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Proposal Generator</p>
              <p style={{ fontSize: 11, color: muted, marginBottom: 12 }}>Susi drafts a complete, polished sales proposal — exec summary, deliverables, timeline, pricing box, and signature block — ready to download and send.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                <input value={proposalProspectName} onChange={e => setProposalProspectName(e.target.value)} placeholder="Contact name"
                  style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: "#fff", outline: "none" }} />
                <input value={proposalCompany} onChange={e => setProposalCompany(e.target.value)} placeholder="Prospect company"
                  style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: "#fff", outline: "none" }} />
                <input value={proposalValue} onChange={e => setProposalValue(e.target.value)} placeholder="Deal value (e.g. $5,000/mo)"
                  style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: "#fff", outline: "none" }} />
              </div>
              {proposalError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{proposalError}</p>}
              <button onClick={handleGenerateProposal} disabled={generatingProposal}
                style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingProposal ? bdr : blue, color: generatingProposal ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingProposal ? "not-allowed" : "pointer" }}>
                {generatingProposal ? "Generating…" : "Download Proposal HTML"}
              </button>
            </div>

            {allDeals.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: muted }}>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No pipeline data yet</p>
                <p style={{ fontSize: 12 }}>Add deals in the Pipeline tab to see analytics.</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Webhook tab ── */}
      {activeTab === "webhook" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: surf, borderRadius: 12, padding: "20px 22px", border: `1px solid ${bdr}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 6 }}>Inbound Lead Webhook</p>
            <p style={{ fontSize: 12, color: muted, lineHeight: 1.6, marginBottom: 16 }}>
              Add this URL to any form tool (Typeform, Tally, Webflow, etc.). When a lead submits, <strong>Susi auto-responds within 60 seconds</strong> with a personalized email and adds the lead to your pipeline.
            </p>
            {webhookUserId ? (
              <>
                <div style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: `1px solid #BFDBFE`, fontFamily: "monospace", fontSize: 13, color: ink, wordBreak: "break-all", marginBottom: 10 }}>
                  {typeof window !== 'undefined' ? window.location.origin : 'https://yourapp.com'}/api/webhook/lead?uid={webhookUserId}
                </div>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/api/webhook/lead?uid=${webhookUserId}`;
                    navigator.clipboard.writeText(url).catch(() => {});
                    setWebhookCopied(true);
                    setTimeout(() => setWebhookCopied(false), 2000);
                  }}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: webhookCopied ? green : blue, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  {webhookCopied ? "✓ Copied!" : "Copy Webhook URL"}
                </button>
              </>
            ) : (
              <p style={{ fontSize: 12, color: muted }}>Loading your webhook URL…</p>
            )}
          </div>
          <div style={{ background: surf, borderRadius: 10, padding: "16px 18px", border: `1px solid ${bdr}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Expected POST Body</p>
            <pre style={{ fontSize: 12, color: ink, lineHeight: 1.7, background: "#fff", borderRadius: 8, padding: "12px 14px", border: `1px solid ${bdr}`, overflowX: "auto" }}>{`{
  "name":    "Alex Johnson",        // required
  "email":   "alex@acme.com",       // required
  "company": "Acme Corp",           // optional
  "message": "Interested in demo",  // optional
  "phone":   "+1 555-0100",         // optional
  "source":  "typeform"             // optional
}`}</pre>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              ["Susi responds", "Auto-sends a personalized reply to the lead within 60s"],
              ["You're notified", "You receive an email with the full lead details + Susi's response"],
              ["Pipeline updated", "Lead is auto-added to the Lead stage in your pipeline"],
            ].map(([title, desc]) => (
              <div key={title} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: green, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                <p style={{ fontSize: 12, color: ink }}><strong>{title}</strong> — {desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Deal Coaching ── */}
      <div
        style={{ background: bg, borderRadius: 14, border: `1px solid ${bdr}`, overflow: "hidden", transition: "border-color .18s, box-shadow .18s" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C7D2FE"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(37,99,235,0.07)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.boxShadow = "none"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
          <div style={{ height: 36, width: 36, borderRadius: 10, flexShrink: 0, background: `${blue}12`, border: `1px solid ${blue}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {generatingDC
              ? <motion.div style={{ height: 13, width: 13, borderRadius: "50%", border: `2px solid ${bdr}`, borderTopColor: blue }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
              : <MessageSquare size={15} style={{ color: blue }} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Deal Coaching</p>
            <p style={{ fontSize: 11, color: muted, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Personalized playbook to close any deal — diagnosis, email, close strategy.</p>
          </div>
          <button onClick={handleGenerateDealCoaching} disabled={generatingDC}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "none", color: generatingDC ? muted : blue, border: `1.5px solid ${generatingDC ? bdr : blue}40`, cursor: generatingDC ? "wait" : "pointer", transition: "all .15s", flexShrink: 0, fontFamily: "inherit" }}
            onMouseEnter={(e) => { if (!generatingDC) { e.currentTarget.style.background = `${blue}10`; e.currentTarget.style.borderColor = blue; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = `${blue}40`; }}
          >
            {generatingDC ? "Running…" : "Run"}{!generatingDC && <ChevronRight size={11} />}
          </button>
        </div>
        <div style={{ borderTop: `1px solid ${bdr}`, padding: "13px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <input value={dcDealName} onChange={e => setDcDealName(e.target.value)} placeholder="Deal name (e.g. Acme Corp)" style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: bg }} />
          <select value={dcStage} onChange={e => setDcStage(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: bg }}>
            {["Discovery", "Qualification", "Demo", "Proposal", "Negotiation", "Closed Won", "Closed Lost"].map(s => <option key={s}>{s}</option>)}
          </select>
          <input value={dcDealValue} onChange={e => setDcDealValue(e.target.value)} placeholder="Deal value (e.g. $24,000 ACV)" style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: bg }} />
          <input value={dcLastActivity} onChange={e => setDcLastActivity(e.target.value)} placeholder="Last activity (e.g. demo 5 days ago)" style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: bg }} />
        </div>
        <textarea value={dcNotes} onChange={e => setDcNotes(e.target.value)} placeholder="Deal notes — what you know about the prospect, blockers, key stakeholders…" rows={2} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: bg, resize: "none" as const, boxSizing: "border-box" as const, marginBottom: 8 }} />
        {dcError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{dcError}</p>}
        {dcResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              {!!dcResult.verdict && (
                <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: String(dcResult.verdict).includes('on track') ? green + "22" : String(dcResult.verdict).includes('dead') ? red + "22" : amber + "22", color: String(dcResult.verdict).includes('on track') ? green : String(dcResult.verdict).includes('dead') ? red : amber }}>
                  {String(dcResult.verdict)}
                </span>
              )}
              {!!dcResult.riskScore && <span style={{ fontSize: 13, fontWeight: 800, color: Number(dcResult.riskScore) >= 70 ? red : Number(dcResult.riskScore) >= 40 ? amber : green }}>Risk: {String(dcResult.riskScore)}/100</span>}
            </div>
            {!!dcResult.diagnosis && <p style={{ fontSize: 12, color: ink, marginBottom: 12, lineHeight: 1.5 }}>{String(dcResult.diagnosis)}</p>}
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" as const }}>
              {(["diagnosis", "nextaction", "email", "close"] as const).map(t => (
                <button key={t} onClick={() => setDcTab(t)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${dcTab === t ? blue : bdr}`, background: dcTab === t ? blue : bg, color: dcTab === t ? "#fff" : ink, fontSize: 11, fontWeight: dcTab === t ? 700 : 400, cursor: "pointer" }}>
                  {t === "diagnosis" ? "🔍 Risk Factors" : t === "nextaction" ? "⚡ Next Action" : t === "email" ? "✉️ Email" : "🏁 Close Strategy"}
                </button>
              ))}
            </div>
            {dcTab === "diagnosis" && (
              <div>
                {!!dcResult.riskFactors && (() => {
                  const factors = dcResult.riskFactors as Record<string, unknown>[];
                  return (
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginBottom: 10 }}>
                      {factors.map((f, i) => (
                        <div key={i} style={{ background: bg, borderRadius: 8, padding: 10, border: `1px solid ${f.severity === 'high' ? red : f.severity === 'medium' ? amber : bdr}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{String(f.factor ?? '')}</p>
                            <span style={{ fontSize: 10, fontWeight: 700, color: f.severity === 'high' ? red : f.severity === 'medium' ? amber : green }}>{String(f.severity ?? '').toUpperCase()}</span>
                          </div>
                          {!!f.mitigation && <p style={{ fontSize: 11, color: blue }}><b>Fix:</b> {String(f.mitigation)}</p>}
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {!!dcResult.dealStrengths && (
                  <div style={{ background: green + "11", borderRadius: 8, padding: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: green, marginBottom: 6 }}>Deal Strengths</p>
                    {(dcResult.dealStrengths as string[]).map((s, i) => <p key={i} style={{ fontSize: 11, color: ink }}>✓ {s}</p>)}
                  </div>
                )}
              </div>
            )}
            {dcTab === "nextaction" && !!dcResult.nextAction && (() => {
              const na = dcResult.nextAction as Record<string, unknown>;
              return (
                <div style={{ background: bg, borderRadius: 8, padding: 14, border: `1px solid ${blue}` }}>
                  {!!na.action && <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 8 }}>{String(na.action)}</p>}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const, marginBottom: 8 }}>
                    {!!na.timing && <span style={{ fontSize: 11, color: amber }}><b>⏱</b> {String(na.timing)}</span>}
                    {!!na.owner && <span style={{ fontSize: 11, color: muted }}><b>Owner:</b> {String(na.owner)}</span>}
                  </div>
                  {!!na.successCriteria && <p style={{ fontSize: 11, color: green }}><b>Success:</b> {String(na.successCriteria)}</p>}
                </div>
              );
            })()}
            {dcTab === "email" && !!dcResult.emailTemplate && (() => {
              const et = dcResult.emailTemplate as Record<string, unknown>;
              return (
                <div style={{ background: bg, borderRadius: 8, padding: 14, border: `1px solid ${bdr}` }}>
                  {!!et.subject && <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 4 }}>Subject: {String(et.subject)}</p>}
                  {!!et.sendTime && <p style={{ fontSize: 11, color: muted, marginBottom: 8 }}>Send: {String(et.sendTime)}</p>}
                  {!!et.body && <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, whiteSpace: "pre-wrap" as const }}>{String(et.body)}</p>}
                </div>
              );
            })()}
            {dcTab === "close" && (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                {!!dcResult.closeStrategy && (() => {
                  const cs = dcResult.closeStrategy as Record<string, unknown>;
                  return (
                    <div style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 6 }}>Close Strategy</p>
                      {!!cs.closingMove && <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}><b>Move:</b> {String(cs.closingMove)}</p>}
                      {!!cs.urgencyCreator && <p style={{ fontSize: 11, color: amber, marginBottom: 4 }}><b>Urgency:</b> {String(cs.urgencyCreator)}</p>}
                      {!!cs.concessionStrategy && <p style={{ fontSize: 11, color: muted }}><b>Concessions:</b> {String(cs.concessionStrategy)}</p>}
                    </div>
                  );
                })()}
                {!!dcResult.objectionResponse && (() => {
                  const ob = dcResult.objectionResponse as Record<string, unknown>;
                  return (
                    <div style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 6 }}>Objection Response</p>
                      {!!ob.likelyObjection && <p style={{ fontSize: 11, color: red, marginBottom: 4, fontStyle: "italic" }}>&quot;{String(ob.likelyObjection)}&quot;</p>}
                      {!!ob.response && <p style={{ fontSize: 11, color: ink, marginBottom: 4 }}><b>Response:</b> {String(ob.response)}</p>}
                      {!!ob.reframe && <p style={{ fontSize: 11, color: blue }}><b>Reframe:</b> {String(ob.reframe)}</p>}
                    </div>
                  );
                })()}
                {!!dcResult.timeline && (() => {
                  const tl = dcResult.timeline as Record<string, unknown>;
                  return (
                    <div style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 6 }}>Timeline</p>
                      {!!tl.expectedClose && <p style={{ fontSize: 11, color: green, marginBottom: 2 }}><b>Expected Close:</b> {String(tl.expectedClose)}</p>}
                      {!!tl.criticalPath && <p style={{ fontSize: 11, color: muted, marginBottom: 2 }}><b>Critical Path:</b> {String(tl.criticalPath)}</p>}
                      {!!tl.dropDeadDate && <p style={{ fontSize: 11, color: red }}><b>Drop Dead:</b> {String(tl.dropDeadDate)}</p>}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* ── Pipeline Health ── */}
      <div
        style={{ background: bg, borderRadius: 14, border: `1px solid ${bdr}`, overflow: "hidden", transition: "border-color .18s, box-shadow .18s" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C7D2FE"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(37,99,235,0.07)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.boxShadow = "none"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
          <div style={{ height: 36, width: 36, borderRadius: 10, flexShrink: 0, background: `${green}12`, border: `1px solid ${green}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {generatingPipeHealth
              ? <motion.div style={{ height: 13, width: 13, borderRadius: "50%", border: `2px solid ${bdr}`, borderTopColor: green }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
              : <BarChart3 size={15} style={{ color: green }} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Pipeline Health</p>
            <p style={{ fontSize: 11, color: muted, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Stage-by-stage diagnostic, velocity analysis, and forecast accuracy.</p>
          </div>
          <button onClick={handleGeneratePipelineHealth} disabled={generatingPipeHealth}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "none", color: generatingPipeHealth ? muted : green, border: `1.5px solid ${generatingPipeHealth ? bdr : green}40`, cursor: generatingPipeHealth ? "wait" : "pointer", transition: "all .15s", flexShrink: 0, fontFamily: "inherit" }}
            onMouseEnter={(e) => { if (!generatingPipeHealth) { e.currentTarget.style.background = `${green}10`; e.currentTarget.style.borderColor = green; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = `${green}40`; }}
          >
            {generatingPipeHealth ? "Running…" : "Run"}{!generatingPipeHealth && <ChevronRight size={11} />}
          </button>
        </div>
        {(pipeHealthResult || pipeHealthError) && (
          <div style={{ borderTop: `1px solid ${bdr}`, padding: "13px 14px" }}>
            {pipeHealthError && <p style={{ color: "#DC2626", fontSize: 12, marginBottom: 8 }}>{pipeHealthError}</p>}
        {pipeHealthResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!!pipeHealthResult.verdict && <p style={{ fontSize: 13, color: ink, margin: 0, padding: "10px 14px", background: surf, borderRadius: 8 }}>{String(pipeHealthResult.verdict)}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {!!pipeHealthResult.pipelineCoverage && <div style={{ padding: "10px 12px", background: "#EFF6FF", borderRadius: 8 }}><p style={{ fontSize: 10, color: muted, margin: "0 0 2px" }}>Pipeline Coverage</p><p style={{ fontSize: 16, fontWeight: 700, color: "#2563EB", margin: 0 }}>{String(pipeHealthResult.pipelineCoverage)}</p></div>}
              {!!pipeHealthResult.pipelineHealth && <div style={{ padding: "10px 12px", background: pipeHealthResult.pipelineHealth==="strong" ? "#F0FDF4" : pipeHealthResult.pipelineHealth==="on track" ? "#FFFBEB" : "#FEF2F2", borderRadius: 8 }}><p style={{ fontSize: 10, color: muted, margin: "0 0 2px" }}>Status</p><p style={{ fontSize: 16, fontWeight: 700, color: pipeHealthResult.pipelineHealth==="strong" ? "#16A34A" : pipeHealthResult.pipelineHealth==="on track" ? "#D97706" : "#DC2626", margin: 0, textTransform: "capitalize" }}>{String(pipeHealthResult.pipelineHealth)}</p></div>}
            </div>
            {!!(pipeHealthResult.stageBreakdown as unknown[])?.length && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: "0 0 8px" }}>Stage Breakdown</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {(pipeHealthResult.stageBreakdown as { stage: string }[]).map((s, i) => (
                    <button key={i} onClick={() => setPipeHealthStageIdx(i)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${pipeHealthStageIdx===i ? ink : bdr}`, background: pipeHealthStageIdx===i ? ink : bg, color: pipeHealthStageIdx===i ? bg : ink, fontSize: 11, cursor: "pointer" }}>{s.stage}</button>
                  ))}
                </div>
                {(() => {
                  const s = (pipeHealthResult.stageBreakdown as Record<string, unknown>[])[pipeHealthStageIdx];
                  if (!s) return null;
                  return (
                    <div style={{ padding: "12px 14px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: ink, margin: 0 }}>{String(s.stage)}</p>
                        <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 12, background: s.stuckRisk==="high" ? "#FEE2E2" : s.stuckRisk==="medium" ? "#FEF3C7" : "#D1FAE5", color: s.stuckRisk==="high" ? "#DC2626" : s.stuckRisk==="medium" ? "#D97706" : "#16A34A", fontWeight: 700 }}>{String(s.stuckRisk ?? "low")} risk</span>
                      </div>
                      {!!s.dealCount && <p style={{ fontSize: 12, color: ink, margin: "0 0 4px" }}>Deals: <strong>{String(s.dealCount)}</strong></p>}
                      {!!s.conversionRate && <p style={{ fontSize: 12, color: ink, margin: "0 0 4px" }}>Conversion: <strong>{String(s.conversionRate)}</strong></p>}
                      {!!s.avgTimeInStage && <p style={{ fontSize: 12, color: muted, margin: "0 0 4px" }}>Avg time here: {String(s.avgTimeInStage)}</p>}
                      {!!s.action && <p style={{ fontSize: 12, color: "#2563EB", margin: 0 }}>Action: {String(s.action)}</p>}
                    </div>
                  );
                })()}
              </div>
            )}
            {!!pipeHealthResult.velocityAnalysis && (() => {
              const v = pipeHealthResult.velocityAnalysis as Record<string, unknown>;
              return (
                <div style={{ padding: "12px 14px", background: "#EFF6FF", borderRadius: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: "0 0 8px" }}>Velocity Analysis</p>
                  {!!v.currentVelocity && <p style={{ fontSize: 12, color: ink, margin: "0 0 4px" }}>Current: <strong>{String(v.currentVelocity)}</strong></p>}
                  {!!v.targetVelocity && <p style={{ fontSize: 12, color: ink, margin: "0 0 4px" }}>Target: <strong>{String(v.targetVelocity)}</strong></p>}
                  {!!v.bottleneck && <p style={{ fontSize: 12, color: "#DC2626", margin: "0 0 4px" }}>Bottleneck: {String(v.bottleneck)}</p>}
                  {!!v.speedUpTactic && <p style={{ fontSize: 12, color: "#16A34A", margin: 0 }}>Speed-up: {String(v.speedUpTactic)}</p>}
                </div>
              );
            })()}
            {!!(pipeHealthResult.fixes as unknown[])?.length && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: "0 0 8px" }}>Pipeline Fixes</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(pipeHealthResult.fixes as { issue: string; impact: string; fix: string; timeframe: string }[]).map((f, i) => (
                    <div key={i} style={{ padding: "10px 14px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 4px" }}>{f.issue}</p>
                      <p style={{ fontSize: 12, color: "#DC2626", margin: "0 0 4px" }}>At risk: {f.impact}</p>
                      <p style={{ fontSize: 12, color: "#16A34A", margin: "0 0 2px" }}>Fix: {f.fix}</p>
                      <p style={{ fontSize: 11, color: muted, margin: 0 }}>Timeframe: {f.timeframe}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!!pipeHealthResult.priorityAction && <div style={{ padding: "10px 14px", background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid #16A34A" }}><p style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", margin: "0 0 4px" }}>Priority Action</p><p style={{ fontSize: 12, color: ink, margin: 0 }}>{String(pipeHealthResult.priorityAction)}</p></div>}
            <button onClick={() => setPipeHealthResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Re-run</button>
          </div>
        )}
          </div>
        )}
      </div>

      {/* ── Objection Bank ── */}
      <div
        style={{ background: bg, borderRadius: 14, border: `1px solid ${bdr}`, overflow: "hidden", transition: "border-color .18s, box-shadow .18s" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C7D2FE"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(37,99,235,0.07)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.boxShadow = "none"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
          <div style={{ height: 36, width: 36, borderRadius: 10, flexShrink: 0, background: `${amber}12`, border: `1px solid ${amber}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {generatingObjBank
              ? <motion.div style={{ height: 13, width: 13, borderRadius: "50%", border: `2px solid ${bdr}`, borderTopColor: amber }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
              : <Shield size={15} style={{ color: amber }} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Objection Bank</p>
            <p style={{ fontSize: 11, color: muted, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Every buyer objection with response scripts, real meaning, and follow-ups.</p>
          </div>
          <button onClick={handleGenerateObjBank} disabled={generatingObjBank}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "none", color: generatingObjBank ? muted : amber, border: `1.5px solid ${generatingObjBank ? bdr : amber}40`, cursor: generatingObjBank ? "wait" : "pointer", transition: "all .15s", flexShrink: 0, fontFamily: "inherit" }}
            onMouseEnter={(e) => { if (!generatingObjBank) { e.currentTarget.style.background = `${amber}10`; e.currentTarget.style.borderColor = amber; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = `${amber}40`; }}
          >
            {generatingObjBank ? "Running…" : "Run"}{!generatingObjBank && <ChevronRight size={11} />}
          </button>
        </div>
        {(objBankResult || objBankError) && (
          <div style={{ borderTop: `1px solid ${bdr}`, padding: "13px 14px" }}>
            {objBankError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{objBankError}</p>}
        {objBankResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            {!!objBankResult.overview && <p style={{ fontSize: 12, color: muted, fontStyle: "italic", marginBottom: 14 }}>{String(objBankResult.overview)}</p>}
            {/* Category filter */}
            {!!(objBankResult.objections as unknown[])?.length && (
              <div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 10 }}>
                  {["all", ...Array.from(new Set((objBankResult.objections as { category: string }[]).map(o => o.category)))].map(cat => (
                    <button key={cat} onClick={() => { setObjBankFilter(cat); setObjBankIdx(0); }} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${objBankFilter === cat ? blue : bdr}`, background: objBankFilter === cat ? "#EFF6FF" : "transparent", color: objBankFilter === cat ? blue : muted, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{cat}</button>
                  ))}
                </div>
                {(() => {
                  const filtered = (objBankResult.objections as { objection: string; category: string; frequency: string; realMeaning: string; response: string; followUp: string; doNotSay: string }[]).filter(o => objBankFilter === "all" || o.category === objBankFilter);
                  const obj = filtered[objBankIdx];
                  return (
                    <div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 10 }}>
                        {filtered.map((o, i) => (
                          <button key={i} onClick={() => setObjBankIdx(i)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${objBankIdx === i ? blue : bdr}`, background: objBankIdx === i ? "#EFF6FF" : bg, color: objBankIdx === i ? blue : muted, fontSize: 11, cursor: "pointer", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{o.objection}</button>
                        ))}
                      </div>
                      {obj && (
                        <div style={{ background: bg, borderRadius: 8, padding: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0, maxWidth: "70%" }}>{obj.objection}</p>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: obj.frequency === "high" ? "#FEE2E2" : obj.frequency === "medium" ? "#FEF3C7" : "#F3F4F6", color: obj.frequency === "high" ? red : obj.frequency === "medium" ? amber : muted, fontWeight: 600 }}>{obj.frequency}</span>
                          </div>
                          <p style={{ fontSize: 12, color: muted, marginBottom: 10 }}><strong>Real meaning:</strong> {obj.realMeaning}</p>
                          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 12, marginBottom: 10 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 4 }}>Your Response</p>
                            <p style={{ fontSize: 12, color: ink }}>{obj.response}</p>
                          </div>
                          <p style={{ fontSize: 12, color: ink, marginBottom: 6 }}><strong>Follow up with:</strong> {obj.followUp}</p>
                          <p style={{ fontSize: 11, color: red }}>✗ Don&apos;t say: {obj.doNotSay}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
            {!!objBankResult.priceAnchoringTactic && (
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 10, marginTop: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Price Anchoring Tactic</p>
                <p style={{ fontSize: 12, color: ink }}>{String(objBankResult.priceAnchoringTactic)}</p>
              </div>
            )}
          </div>
        )}
          </div>
        )}
      </div>

      {/* ── Deal Playbook ── */}
      <div
        style={{ background: bg, borderRadius: 14, border: `1px solid ${bdr}`, overflow: "hidden", transition: "border-color .18s, box-shadow .18s" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C7D2FE"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(37,99,235,0.07)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.boxShadow = "none"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
          <div style={{ height: 36, width: 36, borderRadius: 10, flexShrink: 0, background: `${blue}12`, border: `1px solid ${blue}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {generatingPlaybook
              ? <motion.div style={{ height: 13, width: 13, borderRadius: "50%", border: `2px solid ${bdr}`, borderTopColor: blue }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
              : <BookOpen size={15} style={{ color: blue }} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Deal Playbook</p>
            <p style={{ fontSize: 11, color: muted, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Next actions, stakeholder map, objection handlers, and closing strategy.</p>
          </div>
          <button onClick={handleGenerateDealPlaybook} disabled={generatingPlaybook}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "none", color: generatingPlaybook ? muted : blue, border: `1.5px solid ${generatingPlaybook ? bdr : blue}40`, cursor: generatingPlaybook ? "wait" : "pointer", transition: "all .15s", flexShrink: 0, fontFamily: "inherit" }}
            onMouseEnter={(e) => { if (!generatingPlaybook) { e.currentTarget.style.background = `${blue}10`; e.currentTarget.style.borderColor = blue; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = `${blue}40`; }}
          >
            {generatingPlaybook ? "Running…" : "Run"}{!generatingPlaybook && <ChevronRight size={11} />}
          </button>
        </div>
        <div style={{ borderTop: `1px solid ${bdr}`, padding: "13px 14px" }}>
        {availableDeals.length > 0 && !playbookResult && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: muted, marginBottom: 6 }}>Select deal (optional):</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => setPlaybookDealId('')}
                style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${!playbookDealId ? blue : bdr}`, background: !playbookDealId ? "#EFF6FF" : bg, color: !playbookDealId ? blue : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                Best deal
              </button>
              {availableDeals.map(d => (
                <button key={d.id} onClick={() => setPlaybookDealId(d.id)}
                  style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${playbookDealId === d.id ? blue : bdr}`, background: playbookDealId === d.id ? "#EFF6FF" : bg, color: playbookDealId === d.id ? blue : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {d.company} ({d.stage})
                </button>
              ))}
            </div>
          </div>
        )}
        {playbookError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{playbookError}</p>}
        {playbookResult && (() => {
          const sectionTabs: { key: typeof playbookSection; label: string }[] = [
            { key: 'actions', label: 'Next Actions' },
            { key: 'stakeholders', label: 'Stakeholders' },
            { key: 'objections', label: 'Objections' },
            { key: 'closing', label: 'Closing' },
          ];
          return (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>{playbookResult.dealName as string}</p>
                {!!playbookResult.currentStage && <span style={{ fontSize: 10, fontWeight: 700, color: blue, background: "#EFF6FF", borderRadius: 6, padding: "3px 8px" }}>{playbookResult.currentStage as string}</span>}
                {!!playbookResult.dealSize && <span style={{ fontSize: 10, fontWeight: 700, color: green, background: "#F0FDF4", borderRadius: 6, padding: "3px 8px" }}>{playbookResult.dealSize as string}</span>}
                {!!playbookResult.estimatedCloseDate && <span style={{ fontSize: 10, color: muted }}>Close: {playbookResult.estimatedCloseDate as string}</span>}
              </div>
              {!!playbookResult.executiveSummary && (
                <p style={{ fontSize: 11, color: muted, fontStyle: "italic", marginBottom: 12 }}>{playbookResult.executiveSummary as string}</p>
              )}
              <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: `1px solid ${bdr}`, paddingBottom: 8 }}>
                {sectionTabs.map(t => (
                  <button key={t.key} onClick={() => setPlaybookSection(t.key)}
                    style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: playbookSection === t.key ? ink : "transparent", color: playbookSection === t.key ? "#fff" : muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    {t.label}
                  </button>
                ))}
              </div>
              {playbookSection === 'actions' && (
                <div>
                  {(playbookResult.nextActions as { priority: string; action: string; rationale: string; owner: string; deadline: string }[] | undefined)?.map((a, ai) => (
                    <div key={ai} style={{ display: "flex", gap: 10, marginBottom: 10, padding: "10px 12px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: a.priority === 'critical' ? red : a.priority === 'high' ? amber : muted, flexShrink: 0, marginTop: 2, textTransform: "uppercase" }}>{a.priority}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 2 }}>{a.action}</p>
                        <p style={{ fontSize: 11, color: muted, marginBottom: 2 }}>{a.rationale}</p>
                        <div style={{ display: "flex", gap: 12 }}>
                          <span style={{ fontSize: 10, color: muted }}>Owner: {a.owner}</span>
                          <span style={{ fontSize: 10, color: muted }}>By: {a.deadline}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!!(playbookResult.talkingPoints as string[] | undefined)?.length && (
                    <div style={{ marginTop: 10 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Talking Points</p>
                      {(playbookResult.talkingPoints as string[]).map((tp, ti) => (
                        <p key={ti} style={{ fontSize: 11, color: ink, marginBottom: 4 }}>• {tp}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {playbookSection === 'stakeholders' && (
                <div>
                  {(playbookResult.stakeholderMap as { name: string; role: string; influence: string; sentiment: string; concerns: string; engagementStrategy: string }[] | undefined)?.map((s, si) => (
                    <div key={si} style={{ padding: "10px 12px", background: surf, borderRadius: 8, border: `1px solid ${bdr}`, marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: 0 }}>{s.name}</p>
                        <span style={{ fontSize: 10, color: muted }}>{s.role}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: s.influence === 'high' ? red : s.influence === 'medium' ? amber : muted, textTransform: "uppercase" }}>{s.influence} influence</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: s.sentiment === 'champion' ? green : s.sentiment === 'skeptic' ? red : muted, textTransform: "capitalize" }}>{s.sentiment}</span>
                      </div>
                      <p style={{ fontSize: 11, color: muted, marginBottom: 2 }}>Concerns: {s.concerns}</p>
                      <p style={{ fontSize: 11, color: ink }}>Strategy: {s.engagementStrategy}</p>
                    </div>
                  ))}
                </div>
              )}
              {playbookSection === 'objections' && (
                <div>
                  {(playbookResult.objectionHandlers as { objection: string; reframe: string; response: string; proof: string }[] | undefined)?.map((o, oi) => (
                    <div key={oi} style={{ padding: "10px 12px", background: surf, borderRadius: 8, border: `1px solid ${bdr}`, marginBottom: 8 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: red, marginBottom: 4 }}>&quot;{o.objection}&quot;</p>
                      <p style={{ fontSize: 11, color: amber, marginBottom: 4, fontWeight: 600 }}>Reframe: {o.reframe}</p>
                      <p style={{ fontSize: 11, color: ink, marginBottom: 4 }}>{o.response}</p>
                      {!!o.proof && <p style={{ fontSize: 11, color: muted }}>Proof: {o.proof}</p>}
                    </div>
                  ))}
                </div>
              )}
              {playbookSection === 'closing' && (
                <div>
                  {!!playbookResult.closingStrategy && (
                    <div style={{ padding: "10px 12px", background: "#F0FDF4", borderRadius: 8, border: "1px solid #BBF7D0", marginBottom: 12 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: green, marginBottom: 2 }}>Closing Strategy</p>
                      <p style={{ fontSize: 11, color: ink }}>{playbookResult.closingStrategy as string}</p>
                    </div>
                  )}
                  {!!playbookResult.negotiationGuide && (
                    <div style={{ padding: "10px 12px", background: surf, borderRadius: 8, border: `1px solid ${bdr}`, marginBottom: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Negotiation Guide</p>
                      <p style={{ fontSize: 11, color: muted }}>{playbookResult.negotiationGuide as string}</p>
                    </div>
                  )}
                  {!!(playbookResult.dealRisks as string[] | undefined)?.length && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Deal Risks</p>
                      {(playbookResult.dealRisks as string[]).map((r, ri) => (
                        <p key={ri} style={{ fontSize: 11, color: red, marginBottom: 3 }}>⚠ {r}</p>
                      ))}
                    </div>
                  )}
                  {!!playbookResult.competitivePosition && (
                    <div style={{ marginTop: 10, padding: "10px 12px", background: "#EFF6FF", borderRadius: 8, border: "1px solid #BFDBFE" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Competitive Position</p>
                      <p style={{ fontSize: 11, color: ink }}>{playbookResult.competitivePosition as string}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
        </div>
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRAND MESSAGING RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
