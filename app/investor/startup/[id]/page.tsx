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
  X,
} from "lucide-react";
import Link from "next/link";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";
const amber = "#D97706";
const red   = "#DC2626";

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
const STAGES = ['watching', 'interested', 'meeting', 'in_dd', 'portfolio', 'passed'] as const
type Stage = typeof STAGES[number]

const STAGE_CONFIG: Record<Stage, { label: string; color: string; bg: string; border: string }> = {
  watching:   { label: 'Watching',    color: muted,  bg: surf,      border: bdr     },
  interested: { label: 'Interested',  color: blue,   bg: '#EFF6FF', border: '#BFDBFE' },
  meeting:    { label: 'Meeting',     color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD' },
  in_dd:      { label: 'In DD',       color: amber,  bg: '#FFFBEB', border: '#FDE68A' },
  portfolio:  { label: 'Portfolio',   color: green,  bg: '#ECFDF5', border: '#86EFAC' },
  passed:     { label: 'Passed',      color: red,    bg: '#FEF2F2', border: '#FECACA' },
}

// ─── component ────────────────────────────────────────────────────────────────
export default function StartupDeepDive({ params }: { params: { id: string } }) {
  const [activeTab,    setActiveTab]    = useState<Tab>("overview");
  const [loading,      setLoading]      = useState(true);
  const [startup,      setStartup]      = useState<StartupData | null>(null);
  const [error,        setError]        = useState('');
  // Pipeline CRM
  const [pipelineStage, setPipelineStage] = useState<Stage | null>(null);
  const [pipelineOpen,  setPipelineOpen]  = useState(false);
  const [notesText,     setNotesText]     = useState('');
  const [showNotes,     setShowNotes]     = useState(false);
  const [savingNote,    setSavingNote]    = useState(false);
  // Investment memo
  const [memoLoading,   setMemoLoading]   = useState(false);
  const [memoHtml,      setMemoHtml]      = useState<string | null>(null);
  const [memoError,     setMemoError]     = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/investor/startup/${params.id}`).then(r => r.json()),
      fetch('/api/investor/pipeline').then(r => r.json()).catch(() => ({ pipelineMap: {} })),
    ]).then(([startupData, pipelineData]) => {
      if (startupData.error) setError(startupData.error);
      else setStartup(startupData.startup);
      const entry = (pipelineData.pipelineMap ?? {})[params.id];
      if (entry) {
        setPipelineStage(entry.stage as Stage);
        setNotesText(entry.notes ?? '');
      }
    }).catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function updateStage(stage: Stage) {
    setPipelineStage(stage);
    setPipelineOpen(false);
    await fetch('/api/investor/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ founderId: params.id, stage }),
    });
  }

  async function saveNotes() {
    setSavingNote(true);
    await fetch('/api/investor/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ founderId: params.id, stage: pipelineStage ?? 'watching', notes: notesText }),
    }).catch(() => {});
    setSavingNote(false);
  }

  async function handleGenerateMemo() {
    if (!startup || memoLoading) return;
    setMemoLoading(true);
    setMemoError('');
    try {
      const res = await fetch(`/api/investor/startup/${params.id}/memo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startup }),
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
        <Link href="/investor/dashboard" style={{ fontSize: 13, color: blue, textDecoration: 'none' }}>← Back to pipeline</Link>
      </div>
    );
  }

  const s       = startup;
  const initials = s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink }}>

      {/* ── sticky header ──────────────────────────────────────────── */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(249,247,242,0.94)", backdropFilter: "blur(14px)", borderBottom: `1px solid ${bdr}`, padding: "0 28px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/investor/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: muted, textDecoration: "none", fontWeight: 500 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = ink}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = muted}
            >
              <ArrowLeft style={{ height: 13, width: 13 }} /> Pipeline
            </Link>
            <div style={{ height: 16, width: 1, background: bdr }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ height: 32, width: 32, borderRadius: 8, background: ink, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: bg }}>{initials}</span>
              </div>
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

              {/* Generate Memo button */}
              <button
                onClick={handleGenerateMemo}
                disabled={memoLoading}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: memoLoading ? "not-allowed" : "pointer", background: "#7C3AED15", color: "#7C3AED", border: "1px solid #C4B5FD", transition: "all 0.15s", opacity: memoLoading ? 0.7 : 1 }}
              >
                {memoLoading
                  ? <Loader2 style={{ height: 12, width: 12, animation: "spin 1s linear infinite" }} />
                  : <Sparkles style={{ height: 12, width: 12 }} />
                }
                {memoLoading ? "Generating…" : "Generate Memo"}
              </button>

              {/* Notes button */}
              <button
                onClick={() => setShowNotes(v => !v)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: "pointer", background: showNotes ? `${blue}10` : surf, color: showNotes ? blue : muted, border: `1px solid ${showNotes ? blue : bdr}`, transition: "all 0.15s" }}
              >
                <FileText style={{ height: 12, width: 12 }} />
                Notes {notesText.trim() && !showNotes ? "✓" : ""}
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
                            onClick={async () => { setPipelineStage(null); setPipelineOpen(false); await fetch(`/api/investor/pipeline?founderId=${params.id}`, { method: 'DELETE' }); }}
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
      {showNotes && (
        <div style={{ borderBottom: `1px solid ${bdr}`, background: '#FFFBEB', padding: "14px 28px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <FileText style={{ height: 14, width: 14, color: amber, flexShrink: 0, marginTop: 3 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: amber, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Private Notes — visible only to you</p>
              <textarea
                value={notesText}
                onChange={e => setNotesText(e.target.value)}
                onBlur={saveNotes}
                placeholder="Add your private notes on this founder — thesis fit, meeting notes, concerns, questions to ask…"
                style={{
                  width: "100%", minHeight: 80, padding: "10px 12px",
                  border: `1px solid #FDE68A`, borderRadius: 8,
                  background: "#fff", fontSize: 13, color: ink, resize: "vertical",
                  fontFamily: "system-ui, -apple-system, sans-serif", lineHeight: 1.6,
                  outline: "none",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: 6, gap: 8 }}>
                {savingNote && <span style={{ fontSize: 11, color: muted }}>Saving…</span>}
                {!savingNote && notesText.trim() && <span style={{ fontSize: 11, color: green }}>✓ Auto-saved</span>}
                <button
                  onClick={saveNotes}
                  style={{ fontSize: 11, fontWeight: 600, color: amber, background: "none", border: `1px solid #FDE68A`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
                >
                  Save
                </button>
              </div>
            </div>
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
                      <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Q-Score Breakdown</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 20, fontWeight: 700, color: qColor(s.qScore) }}>{s.qScore || '—'}</span>
                        {s.qScoreGrade && s.qScoreGrade !== '—' && <span style={{ fontSize: 11, padding: "2px 8px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, color: muted }}>{s.qScoreGrade}</span>}
                      </div>
                    </div>
                    {s.qScoreBreakdown.length > 0 ? (
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
                {Object.values(s.financials).some(v => v !== '') ? (
                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Revenue & Unit Economics</p>
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
                          <p style={{ fontSize: 18, fontWeight: 300, color, letterSpacing: "-0.02em" }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "60px", textAlign: "center", background: surf, border: `1px solid ${bdr}`, borderRadius: 18 }}>
                    <TrendingUp size={24} color={muted} style={{ margin: "0 auto 12px" }} />
                    <p style={{ fontSize: 14, color: muted }}>Financial model not yet submitted</p>
                    <p style={{ fontSize: 12, color: muted, marginTop: 6 }}>The founder has not completed the Felix financial agent yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── TEAM ──────────────────────────────────────────────── */}
            {activeTab === "team" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: bg, border: `2px solid ${blue}`, borderRadius: 18, overflow: "hidden" }}>
                  <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ height: 6, width: 6, borderRadius: "50%", background: blue }} />
                    <p style={{ fontSize: 11, fontWeight: 600, color: blue, textTransform: "uppercase", letterSpacing: "0.14em" }}>Founder</p>
                  </div>
                  <div style={{ padding: "22px", display: "flex", gap: 16 }}>
                    <div style={{ height: 56, width: 56, borderRadius: 14, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, color: ink, flexShrink: 0 }}>
                      {s.founderName.split(' ').map(n => n[0]).join('')}
                    </div>
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
                        <div style={{ height: 44, width: 44, borderRadius: 12, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: ink, flexShrink: 0 }}>
                          {name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
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
                      <div style={{ height: 40, width: 40, borderRadius: 10, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: ink, flexShrink: 0 }}>
                        {advisor.trim()[0]}
                      </div>
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
                {(s.startupProfile?.tamSize || s.startupProfile?.marketGrowth || s.startupProfile?.differentiation) && (
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
            {activeTab === "analysis" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
                {[
                  { label: "Strengths",       items: s.aiAnalysis.strengths,       Icon: CheckCircle,   color: green, cardBg: "#ECFDF5", cardBorder: "#86EFAC" },
                  { label: "Risks",           items: s.aiAnalysis.risks,           Icon: AlertTriangle, color: amber, cardBg: "#FFFBEB", cardBorder: "#FDE68A" },
                  { label: "Recommendations", items: s.aiAnalysis.recommendations, Icon: Info,          color: blue,  cardBg: "#EFF6FF", cardBorder: "#93C5FD" },
                ].map(({ label, items, Icon, color, cardBg, cardBorder }, col) => (
                  <div key={label} style={{ background: cardBg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ height: 28, width: 28, borderRadius: 8, background: cardBg, border: `1px solid ${cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon style={{ height: 13, width: 13, color }} />
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: ink, textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</p>
                    </div>
                    <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                      {items.map((item, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: col * 0.1 + i * 0.06 }} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <div style={{ height: 6, width: 6, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 5 }} />
                          <p style={{ fontSize: 13, color: muted, lineHeight: 1.55 }}>{item}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

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
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              style={{
                position: "fixed", top: "5vh", left: "50%", transform: "translateX(-50%)",
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
                    <button
                      onClick={handleDownloadMemo}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, color: ink, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                    >
                      <Download style={{ height: 12, width: 12 }} />
                      Download HTML
                    </button>
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
                      onClick={handleGenerateMemo}
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
