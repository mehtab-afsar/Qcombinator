"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Info,
  BarChart3,
  FileText,
  Loader2,
  ExternalLink,
  Users,
  Calendar,
  TrendingUp,
  Sparkles,
  Download,
  RefreshCw,
  X,
  MessageSquare,
  Send,
  Share2,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { bg, surf, bdr, ink, muted, blue, green, amber, red } from '@/lib/constants/colors'
import { Avatar } from '@/features/shared/components/Avatar'

// ─── types ────────────────────────────────────────────────────────────────────
const TABS = ["overview", "financials", "team", "market", "documents", "analysis"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  overview:   "Overview",
  financials: "Financials",
  team:       "Team",
  market:     "Market",
  documents:  "Materials",
  analysis:   "AI Analysis",
};

interface QBreakdown { category: string; score: number; weight: string }

interface StartupProfile {
  solution: string; whyNow: string; moat: string; uniquePosition: string;
  tamSize: string; marketGrowth: string; customerType: string;
  businessModel: string; differentiation: string;
  equitySplit: string; teamSizeLabel: string;
  advisors: string[]; keyHires: string[];
  raisingAmount: string; useOfFunds: string; previousFunding: string;
  runwayRemaining: string; targetCloseDate: string;
}

interface StartupData {
  founderId: string
  name: string
  founderName: string
  tagline: string
  description: string
  website: string
  founded: string
  location: string
  stage: string
  sector: string
  fundingGoal: string
  teamSize: number
  qScore: number
  rawQScore?: number
  qScoreDaysSince?: number | null
  qScorePercentile: number
  qScoreGrade: string
  qScoreBreakdown: QBreakdown[]
  lastAssessed: string | null
  financials: Record<string, string>
  teamMembers: Array<Record<string, string>>
  competitors: Array<Record<string, string>>
  aiAnalysis: { strengths: string[]; risks: string[]; recommendations: string[] }
  startupProfile: StartupProfile
  artifactCoverage: Record<string, boolean>
  agentStats?: {
    activeAgents: number
    actionsThisWeek: number
    totalDeliverables: number
    lastActiveAt: string | null
    lastActiveDays: number | null
  }
  iqBreakdown?: Array<{ id: string; name: string; weight: number; averageScore: number }> | null
  scoreVersion?: string
  avatarUrl?: string | null
  companyLogoUrl?: string | null
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 70) return blue;
  if (s >= 50) return amber;
  return red;
}
function qColor(s: number) {
  if (s >= 80) return green;
  if (s >= 65) return blue;
  return muted;
}
function fmt(val: string | undefined, pre = '', suf = '') {
  return val && val !== '' ? `${pre}${val}${suf}` : '—';
}

// ─── pipeline stage config ────────────────────────────────────────────────────
const STAGES = ['watching', 'meeting', 'in_dd', 'portfolio', 'passed'] as const
type Stage = typeof STAGES[number]

const STAGE_CONFIG: Record<Stage, { label: string; color: string; bg: string; border: string }> = {
  watching:   { label: 'Watching / Interested', color: blue,      bg: '#EFF6FF', border: '#BFDBFE' },
  meeting:    { label: 'Meeting',               color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD' },
  in_dd:      { label: 'In DD',                 color: amber,     bg: '#FFFBEB', border: '#FDE68A' },
  portfolio:  { label: 'Portfolio',             color: green,     bg: '#ECFDF5', border: '#86EFAC' },
  passed:     { label: 'Passed',                color: red,       bg: '#FEF2F2', border: '#FECACA' },
}

// ─── component ────────────────────────────────────────────────────────────────
export default function StartupDeepDive() {
  const { id } = useParams<{ id: string }>();
  const [activeTab,    setActiveTab]    = useState<Tab>("overview");
  const [loading,      setLoading]      = useState(true);
  const [startup,      setStartup]      = useState<StartupData | null>(null);
  const [error,        setError]        = useState('');
  // Pipeline CRM
  const [pipelineStage, setPipelineStage] = useState<Stage | null>(null);
  const [pipelineOpen,  setPipelineOpen]  = useState(false);
  // Investment memo
  const [memoLoading,   setMemoLoading]   = useState(false);
  const [memoHtml,      setMemoHtml]      = useState<string | null>(null);
  const [memoError,     setMemoError]     = useState('');
  // Investor outreach
  const [showOutreach,  setShowOutreach]  = useState(false);
  const [outreachMsg,   setOutreachMsg]   = useState('');
  const [outreachSending, setOutreachSending] = useState(false);
  const [outreachDone,  setOutreachDone]  = useState(false);
  // AI chatbot
  const [chatMessages, setChatMessages]   = useState<Array<{ role: 'bot' | 'user'; text: string }>>([]);
  const [chatInput,    setChatInput]      = useState('');
  const [chatLoading,  setChatLoading]    = useState(false);
  // Investor sharing
  const [showShare,    setShowShare]      = useState(false);
  const [shareSearch,  setShareSearch]    = useState('');
  const [shareTarget,  setShareTarget]    = useState<{ user_id: string; full_name: string; firm_name: string | null } | null>(null);
  const [shareNote,    setShareNote]      = useState('');
  const [shareSending, setShareSending]   = useState(false);
  const [shareDone,    setShareDone]      = useState(false);
  const [investors,    setInvestors]      = useState<Array<{ user_id: string; full_name: string; firm_name: string | null }>>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/investor/startup/${id}`).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() }),
      fetch('/api/investor/pipeline').then(r => r.ok ? r.json() : { pipelineMap: {} }).catch(() => ({ pipelineMap: {} })),
    ]).then(([startupData, pipelineData]) => {
      if (startupData.error) setError(startupData.error);
      else setStartup(startupData.startup);
      const entry = (pipelineData.pipelineMap ?? {})[id];
      if (entry) {
        const raw = entry.stage === 'interested' ? 'watching' : entry.stage;
        setPipelineStage(STAGES.includes(raw as Stage) ? (raw as Stage) : 'watching');
      }
    }).catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [id]);

  async function updateStage(stage: Stage) {
    setPipelineStage(stage);
    setPipelineOpen(false);
    await fetch('/api/investor/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ founderId: id, stage }),
    });
  }


  async function handleGenerateMemo(regenerate = false) {
    if (!startup || memoLoading) return;
    setMemoLoading(true);
    setMemoError('');
    try {
      const res = await fetch(`/api/investor/startup/${id}/memo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startup, regenerate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      setMemoHtml(data.memoHtml);
    } catch (e) {
      setMemoError(e instanceof Error ? e.message : 'Failed to generate memo');
    } finally {
      setMemoLoading(false);
    }
  }

  async function handleSendOutreach() {
    if (!startup || !outreachMsg.trim() || outreachSending) return
    setOutreachSending(true)
    try {
      const res = await fetch('/api/investor/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ founderId: startup.founderId, message: outreachMsg.trim() }),
      })
      if (res.ok) { setOutreachDone(true); setOutreachMsg('') }
    } finally {
      setOutreachSending(false)
    }
  }

  async function handleOpenShare() {
    setShowShare(true)
    setShareDone(false)
    setShareTarget(null)
    setShareSearch('')
    setShareNote('')
    if (investors.length === 0) {
      const res = await fetch(`/api/investor/startup/${id}/share`)
      if (res.ok) { const d = await res.json(); setInvestors(d.investors ?? []) }
    }
  }

  async function handleSendShare() {
    if (!shareTarget || shareSending) return
    setShareSending(true)
    try {
      const res = await fetch(`/api/investor/startup/${id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetInvestorId: shareTarget.user_id, note: shareNote.trim() || undefined }),
      })
      if (res.ok) setShareDone(true)
    } finally { setShareSending(false) }
  }

  function handleDownloadMemo() {
    if (!memoHtml || !startup) return;
    const blob = new Blob([memoHtml], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `memo-${startup.name.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <Loader2 size={20} color={muted} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: 13, color: muted }}>Loading profile…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error || !startup) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 15, color: ink }}>{error || 'Not found'}</p>
        <Link href="/investor/deal-flow" style={{ fontSize: 13, color: blue, textDecoration: 'none' }}>← Back to pipeline</Link>
      </div>
    );
  }

  const s       = startup;
  const _initials = s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink }}>

      {/* ── sticky header ──────────────────────────────────────────── */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(249,247,242,0.94)", backdropFilter: "blur(14px)", borderBottom: `1px solid ${bdr}`, padding: "0 28px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/investor/deal-flow" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: muted, textDecoration: "none", fontWeight: 500 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = ink}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = muted}
            >
              <ArrowLeft style={{ height: 13, width: 13 }} /> Pipeline
            </Link>
            <div style={{ height: 16, width: 1, background: bdr }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar url={s.companyLogoUrl ?? null} name={s.name} size={32} radius={8} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: ink, lineHeight: 1.1 }}>{s.name}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 10, padding: "1px 7px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, color: muted }}>{s.stage}</span>
                  <span style={{ fontSize: 10, padding: "1px 7px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, color: muted }}>{s.sector}</span>
                  {s.location && <span style={{ fontSize: 10, color: muted, display: "flex", alignItems: "center", gap: 3 }}><MapPin style={{ height: 9, width: 9 }} />{s.location}</span>}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 20, fontWeight: 600, color: qColor(s.qScore), lineHeight: 1 }}>{s.qScore || '—'}</p>
              <p style={{ fontSize: 9, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>Q-Score</p>
            </div>
            {s.qScorePercentile > 0 && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 20, fontWeight: 600, color: ink, lineHeight: 1 }}>{s.qScorePercentile}th</p>
                <p style={{ fontSize: 9, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>Percentile</p>
              </div>
            )}
            <div style={{ height: 28, width: 1, background: bdr }} />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>

              {/* Generate Memo button — rainbow gradient border */}
              <div
                onClick={memoLoading ? undefined : () => handleGenerateMemo(false)}
                style={{
                  display: "inline-flex", padding: "1.5px", borderRadius: 10,
                  background: memoLoading ? bdr : 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899, #f59e0b)',
                  cursor: memoLoading ? "not-allowed" : "pointer",
                  opacity: memoLoading ? 0.7 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 9, background: bg, fontSize: 12, fontWeight: 600, color: ink, whiteSpace: "nowrap" }}>
                  {memoLoading
                    ? <Loader2 style={{ height: 12, width: 12, animation: "spin 1s linear infinite" }} />
                    : <FileText style={{ height: 12, width: 12 }} />
                  }
                  {memoLoading ? "Generating…" : "Generate Memo"}
                </div>
              </div>

              {/* Message Founder button */}
              <button
                onClick={() => { setShowOutreach(true); setOutreachDone(false) }}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: "pointer", background: outreachDone ? `${green}14` : surf, color: outreachDone ? green : muted, border: `1px solid ${outreachDone ? green : bdr}`, transition: "all 0.15s" }}
              >
                <MessageSquare style={{ height: 12, width: 12 }} />
                {outreachDone ? "Sent ✓" : "Message Founder"}
              </button>

              {/* Share with Investor button */}
              <button
                onClick={handleOpenShare}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: "pointer", background: surf, color: muted, border: `1px solid ${bdr}`, transition: "all 0.15s" }}
              >
                <Share2 style={{ height: 12, width: 12 }} />
                Share
              </button>

              {/* Pipeline stage selector */}
              <div style={{ position: "relative" }}>
                {(() => {
                  const cfg = pipelineStage ? STAGE_CONFIG[pipelineStage] : null;
                  return (
                    <button
                      onClick={() => setPipelineOpen(o => !o)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", background: cfg ? cfg.bg : ink, color: cfg ? cfg.color : bg, border: `1.5px solid ${cfg ? cfg.border : ink}`, transition: "all 0.15s" }}
                    >
                      {pipelineStage ? STAGE_CONFIG[pipelineStage].label : "Add to Pipeline"}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                  );
                })()}
                {pipelineOpen && (
                  <>
                    <div onClick={() => setPipelineOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 50, background: bg, border: `1px solid ${bdr}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", padding: "6px 0", minWidth: 160 }}>
                      {STAGES.map(stage => {
                        const cfg = STAGE_CONFIG[stage];
                        return (
                          <button
                            key={stage}
                            onClick={() => updateStage(stage)}
                            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", background: "transparent", border: "none", cursor: "pointer", fontSize: 12, fontWeight: pipelineStage === stage ? 700 : 400, color: cfg.color, textAlign: "left" }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = cfg.bg}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                          >
                            {pipelineStage === stage && <span>✓ </span>}
                            {cfg.label}
                          </button>
                        );
                      })}
                      {pipelineStage && (
                        <>
                          <div style={{ height: 1, background: bdr, margin: "4px 0" }} />
                          <button
                            onClick={async () => { setPipelineStage(null); setPipelineOpen(false); await fetch(`/api/investor/pipeline?founderId=${id}`, { method: 'DELETE' }); }}
                            style={{ display: "flex", width: "100%", padding: "8px 14px", background: "transparent", border: "none", cursor: "pointer", fontSize: 12, color: red, textAlign: "left" }}
                          >
                            Remove from pipeline
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── private notes panel ────────────────────────────────────── */}
      {/* Outreach modal */}
      {showOutreach && (
        <div
          onClick={() => setShowOutreach(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: bg, borderRadius: 16, border: `1px solid ${bdr}`, padding: "28px 28px 24px", boxShadow: "0 24px 64px rgba(0,0,0,0.12)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MessageSquare style={{ height: 16, width: 16, color: blue }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: ink }}>Message {startup?.founderName}</p>
              </div>
              <button onClick={() => setShowOutreach(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, padding: 4 }}>
                <X style={{ height: 16, width: 16 }} />
              </button>
            </div>
            {outreachDone ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 22 }}>✓</p>
                <p style={{ fontSize: 14, color: green, fontWeight: 600, marginTop: 8 }}>Message sent!</p>
                <p style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                  {startup?.founderName} will see your message in their inbox.
                </p>
                <button onClick={() => setShowOutreach(false)} style={{ marginTop: 18, padding: "9px 22px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, fontSize: 13, color: ink, cursor: "pointer", fontFamily: "inherit" }}>
                  Close
                </button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: muted, marginBottom: 14, lineHeight: 1.55 }}>
                  Introduce yourself and explain why you&apos;re interested in {startup?.name}. This goes directly to the founder.
                </p>
                <textarea
                  value={outreachMsg}
                  onChange={e => setOutreachMsg(e.target.value)}
                  placeholder={`Hi ${startup?.founderName?.split(' ')[0] ?? 'there'}, I came across ${startup?.name} and would love to learn more…`}
                  rows={5}
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: `1.5px solid ${bdr}`, background: surf, fontSize: 13, color: ink, fontFamily: "inherit", outline: "none", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }}
                  onFocus={e => (e.currentTarget.style.borderColor = blue)}
                  onBlur={e => (e.currentTarget.style.borderColor = bdr)}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                  <button onClick={() => setShowOutreach(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", fontSize: 13, color: muted, cursor: "pointer", fontFamily: "inherit" }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleSendOutreach}
                    disabled={!outreachMsg.trim() || outreachSending}
                    style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 8, border: "none", background: outreachMsg.trim() ? blue : bdr, color: "#fff", fontSize: 13, fontWeight: 600, cursor: outreachMsg.trim() ? "pointer" : "not-allowed", opacity: outreachSending ? 0.6 : 1, fontFamily: "inherit" }}
                  >
                    {outreachSending ? <Loader2 style={{ height: 13, width: 13, animation: "spin 1s linear infinite" }} /> : <Send style={{ height: 13, width: 13 }} />}
                    {outreachSending ? "Sending…" : "Send Message"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Share with Investor modal ──────────────────────────── */}
      {showShare && (
        <div
          onClick={() => { setShowShare(false) }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: bg, borderRadius: 16, border: `1px solid ${bdr}`, padding: "24px 24px 20px", boxShadow: "0 24px 64px rgba(0,0,0,0.12)" }}>
            {/* header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Share2 style={{ height: 15, width: 15, color: blue }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>Share {s.name}</p>
              </div>
              <button onClick={() => setShowShare(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted }}>
                <X style={{ height: 15, width: 15 }} />
              </button>
            </div>

            {shareDone ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 22 }}>✓</p>
                <p style={{ fontSize: 14, color: green, fontWeight: 600, marginTop: 8 }}>Shared!</p>
                <p style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                  {shareTarget?.full_name} has been notified about {s.name}.
                </p>
                <button onClick={() => setShowShare(false)} style={{ marginTop: 16, padding: "8px 20px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, fontSize: 13, color: ink, cursor: "pointer", fontFamily: "inherit" }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 12, color: muted, marginBottom: 12, lineHeight: 1.5 }}>
                  Share this startup with a fellow investor on Edge Alpha. They'll receive a notification.
                </p>

                {/* investor search */}
                {!shareTarget ? (
                  <div>
                    <div style={{ position: "relative", marginBottom: 10 }}>
                      <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", height: 13, width: 13, color: muted }} />
                      <input
                        value={shareSearch}
                        onChange={e => setShareSearch(e.target.value)}
                        placeholder="Search investors by name…"
                        autoFocus
                        style={{ width: "100%", padding: "9px 12px 9px 30px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, fontSize: 13, color: ink, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                      />
                    </div>
                    <div style={{ maxHeight: 180, overflowY: "auto", borderRadius: 8, border: `1px solid ${bdr}`, background: bg }}>
                      {investors
                        .filter(inv => !shareSearch || inv.full_name.toLowerCase().includes(shareSearch.toLowerCase()) || (inv.firm_name ?? '').toLowerCase().includes(shareSearch.toLowerCase()))
                        .slice(0, 12)
                        .map(inv => (
                          <button
                            key={inv.user_id}
                            onClick={() => setShareTarget(inv)}
                            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", borderBottom: `1px solid ${bdr}` }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = surf}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                          >
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${blue}14`, border: `1px solid ${blue}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: blue, flexShrink: 0 }}>
                              {inv.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 500, color: ink, lineHeight: 1.2 }}>{inv.full_name}</p>
                              {inv.firm_name && <p style={{ fontSize: 11, color: muted }}>{inv.firm_name}</p>}
                            </div>
                          </button>
                        ))}
                      {investors.length === 0 && (
                        <p style={{ fontSize: 12, color: muted, textAlign: "center", padding: "20px" }}>No other investors found</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* selected investor */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: `${blue}08`, border: `1px solid ${blue}20`, borderRadius: 8, marginBottom: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${blue}14`, border: `1px solid ${blue}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: blue, flexShrink: 0 }}>
                        {shareTarget.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: ink }}>{shareTarget.full_name}</p>
                        {shareTarget.firm_name && <p style={{ fontSize: 11, color: muted }}>{shareTarget.firm_name}</p>}
                      </div>
                      <button onClick={() => setShareTarget(null)} style={{ background: "none", border: "none", cursor: "pointer", color: muted }}>
                        <X style={{ height: 13, width: 13 }} />
                      </button>
                    </div>
                    {/* optional note */}
                    <textarea
                      value={shareNote}
                      onChange={e => setShareNote(e.target.value)}
                      placeholder={`Add a note for ${shareTarget.full_name}… (optional)`}
                      rows={3}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, fontSize: 13, color: ink, fontFamily: "inherit", outline: "none", resize: "none", lineHeight: 1.5, boxSizing: "border-box" }}
                      onFocus={e => (e.currentTarget.style.borderColor = blue)}
                      onBlur={e => (e.currentTarget.style.borderColor = bdr)}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                      <button onClick={() => setShareTarget(null)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", fontSize: 12, color: muted, cursor: "pointer", fontFamily: "inherit" }}>
                        Back
                      </button>
                      <button
                        onClick={handleSendShare}
                        disabled={shareSending}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 13, fontWeight: 600, cursor: shareSending ? "not-allowed" : "pointer", opacity: shareSending ? 0.6 : 1, fontFamily: "inherit" }}
                      >
                        {shareSending ? <Loader2 style={{ height: 13, width: 13, animation: "spin 1s linear infinite" }} /> : <Share2 style={{ height: 13, width: 13 }} />}
                        {shareSending ? "Sharing…" : "Share"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── content ───────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 28px 72px" }}>

        {s.tagline && <p style={{ fontSize: 14, color: muted, marginBottom: 24, fontWeight: 300, lineHeight: 1.5 }}>{s.tagline}</p>}

        {/* tab bar */}
        <div style={{ display: "flex", gap: 2, padding: "4px", background: surf, border: `1px solid ${bdr}`, borderRadius: 12, marginBottom: 28, width: "fit-content", flexWrap: "wrap" }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "8px 16px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.15s", background: activeTab === tab ? bg : "transparent", color: activeTab === tab ? ink : muted, boxShadow: activeTab === tab ? "0 1px 4px rgba(24,22,15,0.08)" : "none" }}>
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>

            {/* ── OVERVIEW ──────────────────────────────────────── */}
            {activeTab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* ── Agent Activity Strip ── */}
              {s.agentStats && (
                <div style={{ background: "#EFF6FF", border: `1px solid #BFDBFE`, borderRadius: 14, padding: "14px 22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Founder Activity</p>
                      <p style={{ fontSize: 11, color: muted }}>
                        {s.agentStats.lastActiveDays !== null
                          ? s.agentStats.lastActiveDays === 0
                            ? "Active today"
                            : s.agentStats.lastActiveDays === 1
                              ? "Active yesterday"
                              : `Last active ${s.agentStats.lastActiveDays}d ago`
                          : "No recent activity"}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 20 }}>
                      {[
                        { label: "Active Agents", value: `${s.agentStats.activeAgents}/9` },
                        { label: "Actions (7d)", value: String(s.agentStats.actionsThisWeek) },
                        { label: "Deliverables", value: `${s.agentStats.totalDeliverables}/12` },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ textAlign: "center" }}>
                          <p style={{ fontSize: 18, fontWeight: 800, color: blue, lineHeight: 1 }}>{value}</p>
                          <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 3 }}>{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                  {/* description */}
                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Company Overview</p>
                    </div>
                    <div style={{ padding: "20px 22px" }}>
                      <p style={{ fontSize: 14, color: ink, lineHeight: 1.7, marginBottom: 20 }}>{s.description}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {[
                          { label: "Founder",        value: s.founderName },
                          { label: "Stage",          value: s.stage },
                          { label: "Team size",      value: s.startupProfile?.teamSizeLabel || (s.teamSize ? `${s.teamSize} people` : '—') },
                          { label: "Founded",        value: s.founded || '—' },
                          { label: "Location",       value: s.location || '—' },
                          { label: "Raising",        value: s.startupProfile?.raisingAmount || s.fundingGoal || '—' },
                          { label: "Business model", value: s.startupProfile?.businessModel || '—' },
                          { label: "Customer type",  value: s.startupProfile?.customerType || '—' },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, fontWeight: 600, marginBottom: 3 }}>{label}</p>
                            <p style={{ fontSize: 13, color: ink, fontWeight: 500 }}>{value}</p>
                          </div>
                        ))}
                      </div>
                      {s.website && (
                        <a href={s.website.startsWith('http') ? s.website : `https://${s.website}`} target="_blank" rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 16, fontSize: 12, color: blue, textDecoration: "none" }}>
                          <ExternalLink size={11} /> {s.website}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* problem & solution (from startup profile form) */}
                  {(s.startupProfile?.solution || s.startupProfile?.moat) && (
                    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                      <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}` }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Problem & Solution</p>
                      </div>
                      <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
                        {s.startupProfile.solution && (
                          <div>
                            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, fontWeight: 600, marginBottom: 6 }}>Solution</p>
                            <p style={{ fontSize: 13, color: ink, lineHeight: 1.7 }}>{s.startupProfile.solution}</p>
                          </div>
                        )}
                        {s.startupProfile.whyNow && (
                          <div>
                            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, fontWeight: 600, marginBottom: 6 }}>Why Now</p>
                            <p style={{ fontSize: 13, color: ink, lineHeight: 1.7 }}>{s.startupProfile.whyNow}</p>
                          </div>
                        )}
                        {s.startupProfile.moat && (
                          <div>
                            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, fontWeight: 600, marginBottom: 6 }}>Competitive Moat</p>
                            <p style={{ fontSize: 13, color: ink, lineHeight: 1.7 }}>{s.startupProfile.moat}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* fundraising (from startup profile) */}
                  {s.startupProfile?.useOfFunds && (
                    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                      <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}` }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Fundraising</p>
                      </div>
                      <div style={{ padding: "20px 22px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                          {[
                            { label: "Raising",          value: s.startupProfile.raisingAmount || '—' },
                            { label: "Previous funding",  value: s.startupProfile.previousFunding || '—' },
                            { label: "Runway remaining",  value: s.startupProfile.runwayRemaining || '—' },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, fontWeight: 600, marginBottom: 3 }}>{label}</p>
                              <p style={{ fontSize: 13, color: ink, fontWeight: 500 }}>{value}</p>
                            </div>
                          ))}
                        </div>
                        {s.startupProfile.useOfFunds && (
                          <div>
                            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, fontWeight: 600, marginBottom: 6 }}>Use of funds</p>
                            <pre style={{ fontSize: 12, color: ink, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>{s.startupProfile.useOfFunds}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* key metrics */}
                  {(s.financials.mrr || s.financials.arr || s.financials.customers || s.financials.runway) && (
                    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                      <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}` }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Key Metrics</p>
                      </div>
                      <div style={{ padding: "20px 22px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                        {[
                          { label: "MRR",       value: fmt(s.financials.mrr, '$'),        color: blue  },
                          { label: "Growth",    value: fmt(s.financials.growth, '', '%'), color: green },
                          { label: "Customers", value: fmt(s.financials.customers),       color: ink   },
                          { label: "Runway",    value: fmt(s.financials.runway, '', 'mo'),color: amber },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ textAlign: "center", padding: "16px 12px", background: surf, border: `1px solid ${bdr}`, borderRadius: 14 }}>
                            <p style={{ fontSize: 20, fontWeight: 300, color, letterSpacing: "-0.02em", marginBottom: 4 }}>{value}</p>
                            <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* materials */}
                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Due Diligence Materials</p>
                    </div>
                    <div style={{ padding: "16px 22px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      {[
                        { key: 'hasFinancialModel', label: 'Financial Model' },
                        { key: 'hasGTMPlaybook',    label: 'GTM Playbook'   },
                        { key: 'hasHiringPlan',     label: 'Hiring Plan'    },
                        { key: 'hasCompMatrix',     label: 'Competitive Map'},
                        { key: 'hasBrandAssets',    label: 'Brand Assets'   },
                        { key: 'hasStrategicPlan',  label: 'Strategy Plan'  },
                      ].map(({ key, label }) => {
                        const has = s.artifactCoverage[key];
                        return (
                          <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: has ? "#F0FDF4" : surf, border: `1px solid ${has ? "#86EFAC" : bdr}`, borderRadius: 10 }}>
                            {has ? <CheckCircle size={12} color={green} /> : <div style={{ height: 12, width: 12, borderRadius: "50%", border: `1.5px solid ${bdr}` }} />}
                            <span style={{ fontSize: 12, color: has ? ink : muted }}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* right sidebar */}
                <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "sticky", top: 88 }}>
                  {/* Q-Score breakdown */}
                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Q-Score Breakdown</p>
                        {s.qScoreDaysSince !== null && s.qScoreDaysSince !== undefined && (
                          <p style={{ fontSize: 10, color: s.qScoreDaysSince < 30 ? green : s.qScoreDaysSince < 90 ? amber : red, marginTop: 2 }}>
                            {s.qScoreDaysSince < 30 ? `Updated ${s.qScoreDaysSince}d ago` : s.qScoreDaysSince < 90 ? `${s.qScoreDaysSince}d ago` : `Stale — ${s.qScoreDaysSince}d ago`}
                            {s.qScoreDaysSince >= 90 && s.rawQScore && s.qScore !== s.rawQScore && ` (raw ${s.rawQScore})`}
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 20, fontWeight: 700, color: qColor(s.qScore) }}>{s.qScore || '—'}</span>
                        {s.scoreVersion === 'v2_iq' && <span style={{ fontSize: 9, padding: "2px 7px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 999, color: blue, fontWeight: 600 }}>v2</span>}
                        {s.qScoreGrade && s.qScoreGrade !== '—' && <span style={{ fontSize: 11, padding: "2px 8px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, color: muted }}>{s.qScoreGrade}</span>}
                      </div>
                    </div>
                    {s.iqBreakdown && s.iqBreakdown.length > 0 ? (
                      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 13 }}>
                        {s.iqBreakdown.map((p, i) => {
                          const s100 = Math.round(p.averageScore * 20)
                          return (
                            <motion.div key={p.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                <span style={{ fontSize: 12, color: ink, fontWeight: 500 }}>{p.name}</span>
                                <span style={{ fontSize: 11, color: muted }}>{s100}/100</span>
                              </div>
                              <div style={{ height: 4, background: surf, border: `1px solid ${bdr}`, borderRadius: 999, overflow: "hidden" }}>
                                <motion.div style={{ height: "100%", borderRadius: 999, background: scoreColor(s100) }} initial={{ width: 0 }} animate={{ width: `${s100}%` }} transition={{ delay: 0.2 + i * 0.06, duration: 0.6, ease: "easeOut" }} />
                              </div>
                              <p style={{ fontSize: 9, color: muted, marginTop: 2 }}>Weight: {Math.round(p.weight * 100)}%</p>
                            </motion.div>
                          )
                        })}
                        {s.lastAssessed && (
                          <p style={{ fontSize: 10, color: muted, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                            <Calendar size={9} /> Assessed {new Date(s.lastAssessed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    ) : s.qScoreBreakdown.length > 0 ? (
                      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 13 }}>
                        {s.qScoreBreakdown.map((item, i) => (
                          <motion.div key={item.category} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                              <span style={{ fontSize: 12, color: ink, fontWeight: 500 }}>{item.category}</span>
                              <span style={{ fontSize: 11, color: muted }}>{item.score}/100</span>
                            </div>
                            <div style={{ height: 4, background: surf, border: `1px solid ${bdr}`, borderRadius: 999, overflow: "hidden" }}>
                              <motion.div style={{ height: "100%", borderRadius: 999, background: scoreColor(item.score) }} initial={{ width: 0 }} animate={{ width: `${item.score}%` }} transition={{ delay: 0.2 + i * 0.06, duration: 0.6, ease: "easeOut" }} />
                            </div>
                            <p style={{ fontSize: 9, color: muted, marginTop: 2 }}>Weight: {item.weight}</p>
                          </motion.div>
                        ))}
                        {s.lastAssessed && (
                          <p style={{ fontSize: 10, color: muted, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                            <Calendar size={9} /> Assessed {new Date(s.lastAssessed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: "20px", textAlign: "center" }}>
                        <p style={{ fontSize: 12, color: muted }}>Assessment not yet completed</p>
                      </div>
                    )}
                  </div>

                  {s.qScorePercentile > 0 && (
                    <div style={{ padding: "18px 20px", background: bg, border: `1px solid ${bdr}`, borderRadius: 18, textAlign: "center" }}>
                      <p style={{ fontSize: 32, fontWeight: 300, color: ink, letterSpacing: "-0.04em" }}>{s.qScorePercentile}th</p>
                      <p style={{ fontSize: 11, color: muted }}>percentile among assessed founders</p>
                      <div style={{ marginTop: 14, height: 6, background: surf, border: `1px solid ${bdr}`, borderRadius: 999, overflow: "hidden" }}>
                        <motion.div style={{ height: "100%", borderRadius: 999, background: qColor(s.qScore) }} initial={{ width: 0 }} animate={{ width: `${s.qScorePercentile}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
                      </div>
                    </div>
                  )}

                </div>
              </div>
              </div>
            )}

            {/* ── FINANCIALS ────────────────────────────────────────── */}
            {activeTab === "financials" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                  <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Revenue & Unit Economics</p>
                    {!(s as unknown as Record<string, unknown>).financialsFromArtifact && (
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#FFFBEB", border: "1px solid #FDE68A", color: amber, fontWeight: 500 }}>Self-reported</span>
                    )}
                  </div>
                  <div style={{ padding: "22px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
                    {[
                      { label: "MRR",          value: fmt(s.financials.mrr, '$'),             color: blue  },
                      { label: "ARR",          value: fmt(s.financials.arr, '$'),             color: blue  },
                      { label: "Growth Rate",  value: fmt(s.financials.growth, '', '%'),     color: green },
                      { label: "Customers",    value: fmt(s.financials.customers),            color: ink   },
                      { label: "CAC",          value: fmt(s.financials.cac, '$'),             color: amber },
                      { label: "LTV",          value: fmt(s.financials.ltv, '$'),             color: green },
                      { label: "Gross Margin", value: fmt(s.financials.grossMargin, '', '%'),color: green },
                      { label: "Burn Rate",    value: fmt(s.financials.burnRate, '$', '/mo'), color: red   },
                      { label: "Runway",       value: fmt(s.financials.runway, '', ' mo'),    color: amber },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ padding: "16px", background: surf, border: `1px solid ${bdr}`, borderRadius: 12 }}>
                        <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</p>
                        <p style={{ fontSize: 18, fontWeight: 300, color: value === '—' ? muted : color, letterSpacing: "-0.02em" }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TEAM ──────────────────────────────────────────────── */}
            {activeTab === "team" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {!(s as unknown as Record<string, unknown>).teamFromArtifact && (s.teamMembers?.length > 0 || s.startupProfile?.advisors?.length > 0 || s.startupProfile?.keyHires?.length > 0) && (
                  <div style={{ padding: "8px 14px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#FFFBEB", border: "1px solid #FDE68A", color: amber, fontWeight: 500 }}>Self-reported</span>
                    <p style={{ fontSize: 11, color: amber }}>Team data sourced from profile builder — not yet verified via hiring plan artifact.</p>
                  </div>
                )}
                <div style={{ background: bg, border: `2px solid ${blue}`, borderRadius: 18, overflow: "hidden" }}>
                  <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ height: 6, width: 6, borderRadius: "50%", background: blue }} />
                    <p style={{ fontSize: 11, fontWeight: 600, color: blue, textTransform: "uppercase", letterSpacing: "0.14em" }}>Founder</p>
                  </div>
                  <div style={{ padding: "22px", display: "flex", gap: 16 }}>
                    <Avatar url={s.avatarUrl ?? null} name={s.founderName} size={56} radius={14} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: ink }}>{s.founderName}</p>
                      <p style={{ fontSize: 12, color: blue, fontWeight: 500, marginTop: 2 }}>Founder & CEO</p>
                      <p style={{ fontSize: 12, color: muted, marginTop: 4 }}>{s.sector} · {s.stage}</p>
                    </div>
                  </div>
                </div>
                {s.teamMembers.length > 0 ? (
                  s.teamMembers.map((member, i) => {
                    const name = member.name || member.title || `Team Member ${i + 1}`;
                    const role = member.role || member.position || '';
                    const background = member.background || member.requirements || '';
                    return (
                      <div key={i} style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, padding: "18px 22px", display: "flex", gap: 14 }}>
                        <Avatar url={null} name={name} size={44} radius={12} />
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 500, color: ink }}>{name}</p>
                          {role && <p style={{ fontSize: 12, color: muted, marginTop: 2 }}>{role}</p>}
                          {background && <p style={{ fontSize: 11, color: muted, marginTop: 3 }}>{background.slice(0, 120)}{background.length > 120 ? '…' : ''}</p>}
                        </div>
                      </div>
                    );
                  })
                ) : s.startupProfile?.advisors?.length > 0 ? (
                  s.startupProfile.advisors.map((advisor, i) => (
                    <div key={i} style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, padding: "16px 22px", display: "flex", gap: 14, alignItems: "center" }}>
                      <Avatar url={null} name={advisor.trim()} size={40} radius={10} />
                      <p style={{ fontSize: 13, color: ink }}>{advisor}</p>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "40px", textAlign: "center", background: surf, border: `1px solid ${bdr}`, borderRadius: 18 }}>
                    <Users size={24} color={muted} style={{ margin: "0 auto 12px" }} />
                    <p style={{ fontSize: 14, color: muted }}>Hiring plan not yet submitted</p>
                  </div>
                )}

                {/* Key hires planned */}
                {s.startupProfile?.keyHires?.length > 0 && (
                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ padding: "14px 22px", borderBottom: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Key Hires Planned</p>
                    </div>
                    <div style={{ padding: "14px 22px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {s.startupProfile.keyHires.map((hire, i) => (
                        <span key={i} style={{ padding: "5px 12px", borderRadius: 20, background: surf, border: `1px solid ${bdr}`, fontSize: 12, color: ink }}>{hire}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── MARKET ────────────────────────────────────────────── */}
            {activeTab === "market" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* market size summary from startup profile */}
                {(s.startupProfile?.tamSize || s.startupProfile?.marketGrowth || s.startupProfile?.differentiation) ? (
                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
                      <TrendingUp size={14} color={muted} />
                      <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Market Opportunity</p>
                    </div>
                    <div style={{ padding: "20px 22px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: s.startupProfile.differentiation ? 20 : 0 }}>
                        {[
                          { label: "TAM",          value: s.startupProfile.tamSize     || '—' },
                          { label: "Growth rate",  value: s.startupProfile.marketGrowth|| '—' },
                          { label: "Customer type",value: s.startupProfile.customerType || '—' },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ textAlign: "center", padding: "16px 12px", background: surf, border: `1px solid ${bdr}`, borderRadius: 14 }}>
                            <p style={{ fontSize: 16, fontWeight: 500, color: ink, marginBottom: 4 }}>{value}</p>
                            <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</p>
                          </div>
                        ))}
                      </div>
                      {s.startupProfile.differentiation && (
                        <div style={{ marginTop: 16 }}>
                          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, fontWeight: 600, marginBottom: 6 }}>Differentiation</p>
                          <p style={{ fontSize: 13, color: ink, lineHeight: 1.7 }}>{s.startupProfile.differentiation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "32px", textAlign: "center", background: surf, border: `1px solid ${bdr}`, borderRadius: 18 }}>
                    <TrendingUp size={24} color={muted} style={{ margin: "0 auto 12px" }} />
                    <p style={{ fontSize: 13, color: muted }}>No market data submitted yet</p>
                    <p style={{ fontSize: 11, color: muted, marginTop: 4 }}>Ask the founder to complete their profile builder to surface market opportunity data.</p>
                  </div>
                )}

                {/* competitive landscape from Atlas artifact or startup profile */}
                {s.competitors.length > 0 ? (
                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
                      <BarChart3 size={14} color={muted} />
                      <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Competitive Landscape</p>
                    </div>
                    <div style={{ padding: "18px 22px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {s.competitors.map((comp, i) => {
                        const name = comp.name || comp.company || `Competitor ${i + 1}`;
                        const desc = comp.description || comp.positioning || '';
                        const funding = comp.funding || comp.revenue || '';
                        return (
                          <div key={i} style={{ padding: "16px", background: surf, border: `1px solid ${bdr}`, borderRadius: 12 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 4 }}>{name}</p>
                            {desc && <p style={{ fontSize: 12, color: muted, marginBottom: 4, lineHeight: 1.5 }}>{desc.slice(0, 120)}{desc.length > 120 ? '…' : ''}</p>}
                            {funding && <p style={{ fontSize: 10, color: muted }}>{funding}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "40px", textAlign: "center", background: surf, border: `1px solid ${bdr}`, borderRadius: 18 }}>
                    <BarChart3 size={24} color={muted} style={{ margin: "0 auto 12px" }} />
                    <p style={{ fontSize: 13, color: muted }}>No competitive analysis submitted yet</p>
                    <p style={{ fontSize: 11, color: muted, marginTop: 4 }}>Ask the founder to complete Atlas for a detailed competitor breakdown.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── DOCUMENTS ─────────────────────────────────────────── */}
            {activeTab === "documents" && (
              <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}` }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Available Materials</p>
                </div>
                <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { key: 'hasFinancialModel', label: 'Financial Model (Felix)',   type: 'CSV',  desc: 'MRR projections, burn, unit economics' },
                    { key: 'hasGTMPlaybook',    label: 'GTM Playbook (Patel)',      type: 'DOC',  desc: 'Go-to-market strategy, ICP, channels' },
                    { key: 'hasHiringPlan',     label: 'Hiring Plan (Harper)',      type: 'DOC',  desc: 'Team structure, open roles' },
                    { key: 'hasCompMatrix',     label: 'Competitive Map (Atlas)',   type: 'DOC',  desc: 'Competitor analysis, differentiation' },
                    { key: 'hasBrandAssets',    label: 'Brand Assets (Maya)',       type: 'HTML', desc: 'Social templates, messaging framework' },
                    { key: 'hasStrategicPlan',  label: 'Strategic Plan (Sage)',     type: 'DOC',  desc: 'OKRs, milestones, 12-month roadmap' },
                  ].map(({ key, label, type, desc }) => {
                    const has = s.artifactCoverage[key];
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: has ? surf : "#FAFAF8", border: `1px solid ${has ? bdr : "#EDE9E1"}`, borderRadius: 12, opacity: has ? 1 : 0.55 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ height: 36, width: 36, borderRadius: 9, background: bg, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <FileText size={14} color={has ? blue : muted} />
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: ink }}>{label}</p>
                            <p style={{ fontSize: 11, color: muted }}>{type} · {desc}</p>
                          </div>
                        </div>
                        {has
                          ? <span style={{ fontSize: 11, padding: "3px 10px", background: "#ECFDF5", border: "1px solid #86EFAC", borderRadius: 999, color: green, fontWeight: 500 }}>Available</span>
                          : <span style={{ fontSize: 11, color: muted }}>Not submitted</span>
                        }
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── AI ANALYSIS ───────────────────────────────────────── */}
            {activeTab === "analysis" && (() => {
              const handleChatAsk = async () => {
                const q = chatInput.trim()
                if (!q || chatLoading) return
                setChatInput('')
                setChatMessages(prev => [...prev, { role: 'user', text: q }])
                setChatLoading(true)
                try {
                  const res = await fetch(`/api/investor/startup/${s.founderId}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: q }),
                  })
                  const data = await res.json()
                  if (data.unanswerable) {
                    setChatMessages(prev => [...prev, {
                      role: 'bot',
                      text: `That information hasn't been submitted yet. Would you like to send a message to ${data.founderName ?? 'the founder'} asking for it?`,
                    }])
                  } else {
                    setChatMessages(prev => [...prev, { role: 'bot', text: data.answer ?? 'No answer found.' }])
                  }
                } catch {
                  setChatMessages(prev => [...prev, { role: 'bot', text: 'Sorry, something went wrong. Please try again.' }])
                } finally {
                  setChatLoading(false)
                }
              }

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {/* Signals row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div style={{ background: "#ECFDF5", border: "1px solid #86EFAC", borderRadius: 16, padding: "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                        <CheckCircle style={{ height: 13, width: 13, color: green }} />
                        <p style={{ fontSize: 11, fontWeight: 600, color: green, textTransform: "uppercase", letterSpacing: "0.1em" }}>Strengths</p>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {s.aiAnalysis.strengths.slice(0, 4).map((item, i) => (
                          <span key={i} style={{ padding: "4px 10px", borderRadius: 999, background: "#fff", border: "1px solid #86EFAC", fontSize: 11, color: "#166534", fontWeight: 500 }}>
                            {item.split(' — ')[0].replace(/\s\(.*\)$/, '')}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 16, padding: "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                        <AlertTriangle style={{ height: 13, width: 13, color: amber }} />
                        <p style={{ fontSize: 11, fontWeight: 600, color: amber, textTransform: "uppercase", letterSpacing: "0.1em" }}>Risks</p>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {s.aiAnalysis.risks.slice(0, 4).map((item, i) => (
                          <span key={i} style={{ padding: "4px 10px", borderRadius: 999, background: "#fff", border: "1px solid #FDE68A", fontSize: 11, color: "#92400E", fontWeight: 500 }}>
                            {item.split(' — ')[0].replace(/\s\(.*\)$/, '')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, padding: "18px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                      <Info style={{ height: 13, width: 13, color: blue }} />
                      <p style={{ fontSize: 11, fontWeight: 600, color: blue, textTransform: "uppercase", letterSpacing: "0.1em" }}>Recommendations</p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {s.aiAnalysis.recommendations.map((rec, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: muted, width: 18, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                          <p style={{ fontSize: 13, color: ink, lineHeight: 1.55 }}>{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chatbot */}
                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: "14px 18px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ height: 26, width: 26, borderRadius: 7, background: "#F5F3FF", border: "1px solid #C4B5FD", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Sparkles style={{ height: 12, width: 12, color: "#7C3AED" }} />
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Ask about {s.name}</p>
                      <span style={{ marginLeft: "auto", fontSize: 10, color: muted }}>Answers based on submitted data only</span>
                    </div>

                    {/* Messages */}
                    <div style={{ minHeight: 160, maxHeight: 320, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
                      {chatMessages.length === 0 && (
                        <div style={{ color: muted, fontSize: 13, lineHeight: 1.6 }}>
                          <p style={{ fontStyle: "italic", marginBottom: 10 }}>
                            I can answer questions about {s.name} based on their submitted data. Ask me about financials, team, market, or strategy.
                          </p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {["What is their MRR?", "How large is their team?", "What is their TAM?", "What's their burn rate?"].map(q => (
                              <button key={q} onClick={() => { setChatInput(q); }} style={{ padding: "4px 12px", borderRadius: 999, border: `1px solid ${bdr}`, background: surf, fontSize: 11, color: muted, cursor: "pointer", fontFamily: "inherit" }}>
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {chatMessages.map((msg, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                          <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px", background: msg.role === "user" ? blue : surf, border: msg.role === "bot" ? `1px solid ${bdr}` : "none", fontSize: 13, color: msg.role === "user" ? "#fff" : ink, lineHeight: 1.55 }}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div style={{ display: "flex", gap: 5, padding: "10px 14px", width: 56, background: surf, border: `1px solid ${bdr}`, borderRadius: "4px 14px 14px 14px" }}>
                          {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: muted, animation: `bounce 0.6s ${i * 0.15}s infinite` }} />)}
                        </div>
                      )}
                    </div>

                    {/* Input */}
                    <div style={{ borderTop: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
                      <input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatAsk(); } }}
                        placeholder="Ask about financials, team, market…"
                        disabled={chatLoading}
                        style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, fontSize: 13, color: ink, outline: "none", fontFamily: "inherit" }}
                      />
                      <button
                        onClick={handleChatAsk}
                        disabled={!chatInput.trim() || chatLoading}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: chatInput.trim() && !chatLoading ? blue : bdr, color: "#fff", fontSize: 12, fontWeight: 600, cursor: chatInput.trim() && !chatLoading ? "pointer" : "not-allowed", fontFamily: "inherit" }}
                      >
                        Ask
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Investment Memo Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {(memoHtml || memoError) && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setMemoHtml(null); setMemoError(''); }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 16, x: "-50%" }}
              animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, scale: 0.97, y: 8, x: "-50%" }}
              style={{
                position: "fixed", top: "5vh", left: "50%",
                width: "min(860px, 94vw)", maxHeight: "90vh", zIndex: 101,
                background: bg, borderRadius: 20, boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
                display: "flex", flexDirection: "column", overflow: "hidden",
              }}
            >
              {/* Modal header */}
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ height: 28, width: 28, borderRadius: 8, background: "#F5F3FF", border: "1px solid #C4B5FD", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Sparkles style={{ height: 13, width: 13, color: "#7C3AED" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Investment Memo</p>
                    <p style={{ fontSize: 11, color: muted }}>AI-generated · {startup?.name}</p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {memoHtml && (
                    <>
                      <button
                        onClick={() => handleGenerateMemo(true)}
                        disabled={memoLoading}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, color: muted, fontSize: 12, fontWeight: 500, cursor: memoLoading ? "not-allowed" : "pointer", opacity: memoLoading ? 0.5 : 1 }}
                      >
                        <RefreshCw style={{ height: 11, width: 11 }} />
                        Regenerate
                      </button>
                      <button
                        onClick={handleDownloadMemo}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, color: ink, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                      >
                        <Download style={{ height: 12, width: 12 }} />
                        Download HTML
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { setMemoHtml(null); setMemoError(''); }}
                    style={{ height: 32, width: 32, borderRadius: 8, border: `1px solid ${bdr}`, background: surf, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <X style={{ height: 14, width: 14, color: muted }} />
                  </button>
                </div>
              </div>

              {/* Modal body */}
              <div style={{ flex: 1, overflowY: "auto", padding: "0" }}>
                {memoError ? (
                  <div style={{ padding: 32, textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: red }}>{memoError}</p>
                    <button
                      onClick={() => handleGenerateMemo(false)}
                      style={{ marginTop: 16, padding: "8px 20px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 13, cursor: "pointer" }}
                    >
                      Retry
                    </button>
                  </div>
                ) : memoHtml ? (
                  <iframe
                    srcDoc={memoHtml}
                    style={{ width: "100%", height: "70vh", border: "none" }}
                    title="Investment Memo"
                  />
                ) : null}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
