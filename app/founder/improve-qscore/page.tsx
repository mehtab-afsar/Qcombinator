"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  Target,
  MessageCircle,
  BookOpen,
  ArrowRight,
  Lock,
  Unlock,
  Lightbulb,
  Check,
  Zap,
  Trophy,
  FileText,
  Mail,
  Swords,
  Sparkles,
  DollarSign,
  Scale,
  Users,
  Search,
  Compass,
  BarChart3,
  Upload,
  PlusCircle,
  X,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useQScore } from "@/features/qscore/hooks/useQScore";
import { SECTOR_CONFIGS, Sector, applyWeights } from "@/features/qscore/utils/sector-weights";

// ─── AI action type ────────────────────────────────────────────────────────────
interface AIAction {
  title: string;
  description: string;
  dimension: string;
  impact: string;
  agentId: string;
  agentName: string;
  timeframe: string;
  starterPrompt?: string;
}

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";
const red   = "#DC2626";
const amber = "#D97706";

// ─── dimension config ─────────────────────────────────────────────────────────
interface DimensionDef {
  key: string;
  name: string;
  weight: number;
  agentId: string;
  agentName: string;
  recommendations: string[];
}

const DIMENSIONS: DimensionDef[] = [
  {
    key: "market",
    name: "Market",
    weight: 20,
    agentId: "atlas",
    agentName: "Atlas",
    recommendations: [
      "Refine your TAM/SAM/SOM calculations with real data sources",
      "Research and document market growth trends and timing",
      "Identify key competitors and map your differentiators",
      "Validate market timing — why now?",
    ],
  },
  {
    key: "product",
    name: "Product",
    weight: 18,
    agentId: "nova",
    agentName: "Nova",
    recommendations: [
      "Get more customer validation and testimonials",
      "Increase iteration speed — ship weekly",
      "Document customer feedback loops and learnings",
      "Show clear product-market fit signals (retention, NPS)",
    ],
  },
  {
    key: "financial",
    name: "Financial",
    weight: 18,
    agentId: "felix",
    agentName: "Felix",
    recommendations: [
      "Build a 12-month financial model with clear assumptions",
      "Calculate unit economics (LTV, CAC, margins)",
      "Track monthly burn rate and runway",
      "Document revenue model and pricing strategy",
    ],
  },
  {
    key: "goToMarket",
    name: "Go-to-Market",
    weight: 17,
    agentId: "patel",
    agentName: "Patel",
    recommendations: [
      "Define your ICP (Ideal Customer Profile) clearly",
      "Test at least 2–3 acquisition channels",
      "Document messaging and value proposition",
      "Calculate and optimise Customer Acquisition Cost",
    ],
  },
  {
    key: "team",
    name: "Team",
    weight: 15,
    agentId: "harper",
    agentName: "Harper",
    recommendations: [
      "Demonstrate deep domain expertise",
      "Show complementary skills across the team",
      "Document resilience — hardest moments and how you adapted",
      "Highlight key advisor or mentor relationships",
    ],
  },
  {
    key: "traction",
    name: "Traction",
    weight: 12,
    agentId: "susi",
    agentName: "Susi",
    recommendations: [
      "Increase volume of customer conversations",
      "Get more paying customers or letters of intent",
      "Show consistent month-over-month growth",
      "Document key traction milestones on a timeline",
    ],
  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 70) return green;
  if (s >= 50) return amber;
  return red;
}

function barColor(s: number) {
  if (s >= 70) return green;
  if (s >= 50) return amber;
  return red;
}

// ─── score unlock challenges ──────────────────────────────────────────────────
interface Challenge {
  type:      string;
  label:     string;
  icon:      React.ElementType;
  dimension: string;
  agentId:   string;
  agentName: string;
  points:    number;
  color:     string;
}

const CHALLENGES: Challenge[] = [
  { type: "gtm_playbook",       label: "GTM Playbook",         icon: BookOpen,   dimension: "Go-to-Market", agentId: "patel",  agentName: "Patel",  points: 6, color: "#D97706" },
  { type: "financial_summary",  label: "Financial Summary",    icon: DollarSign, dimension: "Financial",    agentId: "felix",  agentName: "Felix",  points: 6, color: green     },
  { type: "icp_document",       label: "ICP Document",         icon: FileText,   dimension: "Go-to-Market", agentId: "patel",  agentName: "Patel",  points: 5, color: blue      },
  { type: "competitive_matrix", label: "Competitive Analysis", icon: Search,     dimension: "Market",       agentId: "atlas",  agentName: "Atlas",  points: 5, color: "#DC2626" },
  { type: "pmf_survey",         label: "PMF Research Kit",     icon: BarChart3,  dimension: "Product",      agentId: "nova",   agentName: "Nova",   points: 5, color: "#7C3AED" },
  { type: "hiring_plan",        label: "Hiring Plan",          icon: Users,      dimension: "Team",         agentId: "harper", agentName: "Harper", points: 5, color: blue      },
  { type: "outreach_sequence",  label: "Outreach Sequence",    icon: Mail,       dimension: "Traction",     agentId: "patel",  agentName: "Patel",  points: 4, color: green     },
  { type: "battle_card",        label: "Battle Card",          icon: Swords,     dimension: "Market",       agentId: "patel",  agentName: "Patel",  points: 4, color: "#DC2626" },
  { type: "sales_script",       label: "Sales Script",         icon: Zap,        dimension: "Traction",     agentId: "susi",   agentName: "Susi",   points: 4, color: green     },
  { type: "brand_messaging",    label: "Brand Messaging",      icon: Sparkles,   dimension: "Go-to-Market", agentId: "maya",   agentName: "Maya",   points: 4, color: "#7C3AED" },
  { type: "strategic_plan",     label: "Strategic Plan",       icon: Compass,    dimension: "Product",      agentId: "sage",   agentName: "Sage",   points: 4, color: blue      },
  { type: "legal_checklist",    label: "Legal Checklist",      icon: Scale,      dimension: "Financial",    agentId: "leo",    agentName: "Leo",    points: 3, color: "#D97706" },
];

// ─── component ────────────────────────────────────────────────────────────────
const SIM_WEIGHTS: Record<string, number> = {
  market: 0.20, product: 0.18, goToMarket: 0.17,
  financial: 0.18, team: 0.15, traction: 0.12,
};

export default function ImproveQScorePage() {
  const { qScore } = useQScore();
  const [aiActions, setAiActions] = useState<AIAction[]>([]);
  const [loadingActions, setLoadingActions] = useState(true);
  const [regeneratingActions, setRegeneratingActions] = useState(false);
  const [simScores, setSimScores] = useState<Record<string, number> | null>(null);
  const [benchmarks, setBenchmarks] = useState<Record<string, number> | null>(null);
  const [completedTypes, setCompletedTypes] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [evidenceList, setEvidenceList] = useState<Array<{ id: string; dimension: string; evidence_type: string; title: string; data_value: string; status: string; points_awarded: number; created_at: string }>>([]);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceDim,  setEvidenceDim]  = useState("traction");
  const [evidenceType, setEvidenceType] = useState("stripe_screenshot");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceValue, setEvidenceValue] = useState("");
  const [submittingEvidence, setSubmittingEvidence] = useState(false);

  const EVIDENCE_TYPES: Record<string, string> = {
    stripe_screenshot: "Stripe / Revenue Screenshot",
    loi:              "Letter of Intent",
    contract:         "Signed Contract",
    analytics:        "Analytics Screenshot",
    customer_email:   "Customer Testimonial / Email",
    agent_artifact:   "AI Advisor Deliverable",
    other:            "Other Proof",
  };

  const EVIDENCE_POINTS: Record<string, Record<string, number>> = {
    stripe_screenshot: { traction: 8, financial: 6 },
    loi:              { traction: 7, market: 5 },
    contract:         { traction: 9, financial: 7 },
    analytics:        { product: 5, traction: 5, market: 4 },
    customer_email:   { product: 5, market: 4, traction: 4 },
    other:            { traction: 3, market: 3, product: 3, financial: 3, team: 3, goToMarket: 3 },
  };

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const submitEvidence = async () => {
    if (!evidenceTitle.trim()) return;
    setSubmittingEvidence(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { showToast("Please sign in to submit evidence", false); return; }
      const pts = EVIDENCE_POINTS[evidenceType]?.[evidenceDim] ?? 3;
      const { data, error } = await supabase.from("score_evidence").insert({
        user_id: user.id,
        dimension: evidenceDim,
        evidence_type: evidenceType,
        title: evidenceTitle,
        data_value: evidenceValue,
        status: "pending",
        points_awarded: pts,
      }).select().single();
      if (error) {
        showToast("Failed to submit evidence — please try again", false);
      } else if (data) {
        setEvidenceList(prev => [data, ...prev]);
        setEvidenceTitle("");
        setEvidenceValue("");
        setShowEvidenceForm(false);
        showToast(`Evidence submitted — pending review (+${pts} pts on approval)`);
      }
    } catch {
      showToast("Something went wrong — please try again", false);
    } finally { setSubmittingEvidence(false); }
  };

  const regenerateActions = async () => {
    setRegeneratingActions(true);
    try {
      const res = await fetch("/api/qscore/actions", { method: "POST" });
      const data = await res.json();
      if (Array.isArray(data.actions)) setAiActions(data.actions);
    } catch { /* silent */ }
    finally { setRegeneratingActions(false); }
  };

  useEffect(() => {
    fetch("/api/qscore/actions")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.actions)) setAiActions(data.actions); })
      .catch(() => {})
      .finally(() => setLoadingActions(false));

    fetch("/api/qscore/benchmarks")
      .then(r => r.json())
      .then(data => { if (data.benchmarks) setBenchmarks(data.benchmarks); })
      .catch(() => {});

    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("agent_artifacts")
          .select("artifact_type")
          .eq("user_id", user.id);
        if (data) setCompletedTypes(new Set(data.map((r: { artifact_type: string }) => r.artifact_type)));

        // Fetch existing evidence
        const { data: evData } = await supabase
          .from("score_evidence")
          .select("id, dimension, evidence_type, title, data_value, status, points_awarded, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (evData) setEvidenceList(evData);
      } catch { /* anonymous */ }
    })();
  }, []);

  const overall = qScore?.overall ?? 58;
  const targetScore = 65;
  const pointsNeeded = Math.max(0, targetScore - overall);
  const progressPct = Math.min((overall / targetScore) * 100, 100);

  // Build dimension scores from qScore breakdown or fallback
  const dimScores: Record<string, number> = {
    market:     qScore?.breakdown?.market?.score ?? 54,
    product:    qScore?.breakdown?.product?.score ?? 58,
    financial:  qScore?.breakdown?.financial?.score ?? 42,
    goToMarket: qScore?.breakdown?.goToMarket?.score ?? 35,
    team:       qScore?.breakdown?.team?.score ?? 72,
    traction:   qScore?.breakdown?.traction?.score ?? 48,
  };

  // Sort dimensions by lowest score first
  const sorted = [...DIMENSIONS].sort((a, b) => (dimScores[a.key] ?? 0) - (dimScores[b.key] ?? 0));
  const topThree = sorted.slice(0, 3);

  const potentialGain = (dim: DimensionDef) => {
    const current = dimScores[dim.key] ?? 0;
    return Math.round((80 - current) * (dim.weight / 100));
  };

  // Sector rubric state (for the simulator)
  const [activeSector, setActiveSector] = React.useState<Sector>("saas_b2b");

  // Initialise sim scores once real scores load
  const sim = simScores ?? dimScores;
  const sectorWeights = SECTOR_CONFIGS[activeSector].weights;
  const simOverall = applyWeights({
    market:     sim.market ?? 0,
    product:    sim.product ?? 0,
    goToMarket: sim.goToMarket ?? 0,
    financial:  sim.financial ?? 0,
    team:       sim.team ?? 0,
    traction:   sim.traction ?? 0,
  }, activeSector);
  const simDelta = simOverall - overall;
  const anyChanged = Object.keys(dimScores).some(k => (sim[k] ?? 0) !== (dimScores[k] ?? 0));

  // ── pillar label style (matches dashboard) ──
  const pillarLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    color: muted,
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: `1px solid ${bdr}`,
    borderRadius: 14,
    overflow: "hidden",
  };

  const unlocks = [
    "Access to 500+ vetted investors",
    "AI-powered investor matching",
    "Direct connection requests",
    "Priority workshop access",
    "Investor profile visibility",
  ];

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, fontFamily: "inherit" }}>

      {/* ── toast ─────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          padding: "10px 18px", borderRadius: 10,
          background: toast.ok ? green : red,
          color: "#fff", fontSize: 13, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          pointerEvents: "none",
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── header ────────────────────────────────────────────── */}
      <div style={{
        padding: "32px 40px 0",
        maxWidth: 1160,
        margin: "0 auto",
      }}>
        <Link
          href="/founder/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: muted,
            textDecoration: "none",
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.03em", margin: 0 }}>
          Improve Your Q-Score
        </h1>
        <p style={{ fontSize: 14, color: muted, marginTop: 6 }}>
          Unlock the investor marketplace by reaching Q-Score 65+
        </p>
      </div>

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 40px 60px" }}>

        {/* ── what gets me to 80 ──────────────────────────────── */}
        {(loadingActions || aiActions.length > 0) && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Zap size={16} style={{ color: "#7C3AED" }} />
                <span style={{ ...pillarLabel, color: "#7C3AED" }}>What Gets Me to 80?</span>
              </div>
              <button
                onClick={regenerateActions}
                disabled={loadingActions || regeneratingActions}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: 11, fontWeight: 600, color: regeneratingActions ? muted : "#7C3AED",
                  background: "none", border: `1px solid ${regeneratingActions ? bdr : "#DDD6FE"}`,
                  borderRadius: 6, padding: "4px 10px", cursor: regeneratingActions ? "not-allowed" : "pointer",
                }}
              >
                <RefreshCw size={10} style={{ opacity: regeneratingActions ? 0.5 : 1 }} />
                {regeneratingActions ? "Regenerating…" : "Regenerate"}
              </button>
            </div>
            <p style={{ fontSize: 13, color: muted, marginBottom: 16 }}>
              5 personalised actions generated from your assessment — not generic advice
            </p>

            {loadingActions ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      ...cardStyle,
                      padding: "18px 20px",
                      gridColumn: i === 4 ? "1 / -1" : undefined,
                    }}
                  >
                    <div style={{ height: 13, background: surf, borderRadius: 6, width: "55%", marginBottom: 10 }} />
                    <div style={{ height: 10, background: surf, borderRadius: 6, width: "90%", marginBottom: 6 }} />
                    <div style={{ height: 10, background: surf, borderRadius: 6, width: "70%", marginBottom: 16 }} />
                    <div style={{ height: 10, background: surf, borderRadius: 6, width: "40%" }} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {aiActions.map((action, i) => {
                  const dim = DIMENSIONS.find(d => d.key === action.dimension);
                  const dimScore = dimScores[action.dimension] ?? 0;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      style={{
                        ...cardStyle,
                        gridColumn: i === 4 ? "1 / -1" : undefined,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div style={{ padding: "16px 18px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
                        {/* title + impact */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: ink, lineHeight: 1.3, flex: 1, margin: 0 }}>
                            {action.title}
                          </p>
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            padding: "3px 8px", borderRadius: 999, flexShrink: 0,
                            background: "#EDE9FE", color: "#6D28D9",
                            whiteSpace: "nowrap",
                          }}>
                            {action.impact}
                          </span>
                        </div>

                        {/* description */}
                        <p style={{ fontSize: 12, color: muted, lineHeight: 1.6, marginBottom: 14, flex: 1 }}>
                          {action.description}
                        </p>

                        {/* footer: dimension badge + timeframe + agent CTA */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 600,
                              padding: "2px 8px", borderRadius: 999,
                              background: surf, border: `1px solid ${bdr}`,
                              color: scoreColor(dimScore),
                            }}>
                              {dim?.name ?? action.dimension}
                            </span>
                            <span style={{ fontSize: 11, color: muted }}>{action.timeframe}</span>
                          </div>
                          <Link
                            href={`/founder/agents/${action.agentId}${action.starterPrompt ? `?prompt=${encodeURIComponent(action.starterPrompt)}` : ''}`}
                            style={{
                              fontSize: 11, fontWeight: 600, color: blue,
                              textDecoration: "none",
                              display: "flex", alignItems: "center", gap: 4,
                            }}
                          >
                            <MessageCircle size={11} />
                            {action.agentName} →
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── marketplace locked banner ────────────────────────── */}
        {overall < targetScore && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              ...cardStyle,
              background: "#FFFBEB",
              borderColor: "#F5E6B8",
              padding: "24px 28px",
              marginBottom: 28,
              display: "flex",
              alignItems: "flex-start",
              gap: 16,
            }}
          >
            <div style={{
              height: 44, width: 44, borderRadius: 10, flexShrink: 0,
              background: "#FEF3C7",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Lock size={20} style={{ color: "#92400E" }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#92400E", marginBottom: 6 }}>
                Marketplace Access Locked
              </p>
              <p style={{ fontSize: 13, color: "#A16207", lineHeight: 1.6, marginBottom: 14 }}>
                Your current Q-Score is <strong>{overall}/100</strong>.
                You need <strong>{pointsNeeded} more points</strong> to reach the minimum
                score of 65 and access the investor marketplace.
              </p>
              {/* progress bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  flex: 1, height: 8, borderRadius: 999,
                  background: "#FDE68A",
                }}>
                  <div style={{
                    width: `${progressPct}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: "#D97706",
                    transition: "width .5s ease",
                  }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#92400E", flexShrink: 0 }}>
                  {overall} / 65
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── top 3 priority actions ──────────────────────────── */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Target size={16} style={{ color: blue }} />
            <span style={pillarLabel}>Top 3 Priority Actions</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {topThree.map((dim, i) => {
              const score = dimScores[dim.key] ?? 0;
              const gain = potentialGain(dim);
              return (
                <motion.div
                  key={dim.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    ...cardStyle,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* card header */}
                  <div style={{
                    padding: "18px 20px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: `1px solid ${bdr}`,
                  }}>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{dim.name}</span>
                      {benchmarks && benchmarks[dim.key] !== undefined && (() => {
                        const pctVal = benchmarks[dim.key];
                        const pctColor = pctVal >= 70 ? green : pctVal >= 40 ? amber : red;
                        return (
                          <p style={{ fontSize: 10, color: pctColor, fontWeight: 600, marginTop: 2 }}>
                            Top {100 - pctVal}% of founders
                          </p>
                        );
                      })()}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 999,
                      background: surf,
                      color: muted,
                    }}>
                      #{i + 1}
                    </span>
                  </div>

                  <div style={{ padding: "16px 20px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* score bar */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: muted }}>Current Score</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(score) }}>{score}/100</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: surf }}>
                        <div style={{
                          width: `${score}%`, height: "100%",
                          borderRadius: 999, background: barColor(score),
                          transition: "width .4s ease",
                        }} />
                      </div>
                    </div>

                    {/* potential impact */}
                    <div style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: surf,
                      border: `1px solid ${bdr}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <TrendingUp size={13} style={{ color: green }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>Potential Impact</span>
                      </div>
                      <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, margin: 0 }}>
                        Improving this could add <strong style={{ color: ink }}>+{gain} points</strong> to your overall score
                      </p>
                    </div>

                    {/* quick wins */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                        <Lightbulb size={12} style={{ color: amber }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Quick Wins</span>
                      </div>
                      {dim.recommendations.slice(0, 2).map((rec, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 5 }}>
                          <Check size={11} style={{ color: green, flexShrink: 0, marginTop: 2 }} />
                          <span style={{ fontSize: 12, color: muted, lineHeight: 1.4 }}>{rec}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <Link href={`/founder/agents/${dim.agentId}`} style={{ textDecoration: "none", marginTop: "auto" }}>
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        padding: "10px 0",
                        borderRadius: 10,
                        background: ink,
                        color: bg,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "opacity .15s",
                      }}>
                        <MessageCircle size={14} />
                        Talk to {dim.agentName}
                      </div>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── score simulator ─────────────────────────────────── */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <TrendingUp size={16} style={{ color: blue }} />
            <span style={pillarLabel}>Score Simulator</span>
          </div>
          <p style={{ fontSize: 13, color: muted, marginBottom: 16 }}>
            Drag a dimension · switch sector to see how weights change your score
          </p>
          <div style={{ ...cardStyle, padding: "20px 24px" }}>
            {/* sector selector */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, marginBottom: 8 }}>
                Scoring rubric
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(Object.entries(SECTOR_CONFIGS) as [Sector, typeof SECTOR_CONFIGS[Sector]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setActiveSector(key)}
                    style={{
                      padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: activeSector === key ? ink : surf,
                      color: activeSector === key ? bg : muted,
                      border: `1px solid ${activeSector === key ? ink : bdr}`,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: muted, marginTop: 6, lineHeight: 1.4 }}>
                {SECTOR_CONFIGS[activeSector].description}
              </p>
            </div>

            {/* weight badges for active sector */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${bdr}` }}>
              {Object.entries(sectorWeights).map(([k, w]) => {
                const dim = DIMENSIONS.find(d => d.key === k);
                const stdW = SIM_WEIGHTS[k] ?? 0;
                const delta = Math.round((w - stdW) * 100);
                return (
                  <div key={k} style={{
                    padding: "3px 9px", borderRadius: 999, fontSize: 10,
                    background: surf, border: `1px solid ${bdr}`,
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <span style={{ color: muted }}>{dim?.name ?? k}</span>
                    <span style={{ fontWeight: 700, color: ink }}>{Math.round(w * 100)}%</span>
                    {delta !== 0 && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: delta > 0 ? green : red }}>
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {DIMENSIONS.map((dim) => {
                const actual  = dimScores[dim.key] ?? 0;
                const current = sim[dim.key] ?? actual;
                const w = sectorWeights[dim.key as keyof typeof sectorWeights] ?? SIM_WEIGHTS[dim.key] ?? 0;
                const gained  = parseFloat(((current - actual) * w).toFixed(1));
                return (
                  <div key={dim.key}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ width: 80, fontSize: 12, fontWeight: 600, color: ink, flexShrink: 0 }}>
                        {dim.name}
                      </span>
                      <span style={{ fontSize: 10, color: muted, width: 32, textAlign: "right", flexShrink: 0 }}>
                        {actual}
                      </span>
                      <input
                        type="range"
                        min={actual}
                        max={100}
                        value={current}
                        onChange={(e) => setSimScores({ ...sim, [dim.key]: Number(e.target.value) })}
                        style={{ flex: 1, accentColor: gained > 0 ? green : blue, cursor: "pointer" }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 700, color: ink, width: 28, textAlign: "right", flexShrink: 0 }}>
                        {current}
                      </span>
                      {gained > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: green, width: 48, flexShrink: 0 }}>
                          +{gained} pts
                        </span>
                      )}
                      {gained === 0 && <span style={{ width: 48, flexShrink: 0 }} />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* result bar */}
            <div style={{
              marginTop: 20, paddingTop: 16, borderTop: `1px solid ${bdr}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Current</p>
                  <p style={{ fontSize: 28, fontWeight: 300, color: muted, letterSpacing: "-0.03em", lineHeight: 1 }}>{overall}</p>
                </div>
                <span style={{ fontSize: 20, color: bdr }}>→</span>
                <div>
                  <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Simulated</p>
                  <p style={{ fontSize: 28, fontWeight: 600, color: simDelta > 0 ? green : ink, letterSpacing: "-0.03em", lineHeight: 1 }}>
                    {simOverall}
                    {simDelta > 0 && <span style={{ fontSize: 14, fontWeight: 600, color: green, marginLeft: 6 }}>+{simDelta}</span>}
                  </p>
                </div>
                {simOverall >= 65 && overall < 65 && (
                  <div style={{ padding: "4px 12px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 999, fontSize: 11, fontWeight: 600, color: "#166534" }}>
                    Marketplace unlocked!
                  </div>
                )}
                {simOverall >= 80 && overall < 80 && (
                  <div style={{ padding: "4px 12px", background: "#EDE9FE", border: "1px solid #C4B5FD", borderRadius: 999, fontSize: 11, fontWeight: 600, color: "#5B21B6" }}>
                    Target reached!
                  </div>
                )}
              </div>
              {anyChanged && (
                <button
                  onClick={() => setSimScores(null)}
                  style={{
                    fontSize: 11, color: muted, background: "none",
                    border: `1px solid ${bdr}`, borderRadius: 999,
                    padding: "4px 12px", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── score unlock challenges ─────────────────────────── */}
        {(() => {
          const unlockedCount = CHALLENGES.filter(c => completedTypes.has(c.type)).length;
          const ptsEarned     = CHALLENGES.filter(c => completedTypes.has(c.type)).reduce((s, c) => s + c.points, 0);
          return (
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Trophy size={16} style={{ color: amber }} />
                <span style={{ ...pillarLabel, color: amber }}>Score Unlock Challenges</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: muted }}>
                  Complete deliverables with your AI advisers to permanently boost your Q-Score
                </p>
                <p style={{ fontSize: 12, fontWeight: 600, color: unlockedCount === 12 ? green : ink, whiteSpace: "nowrap", marginLeft: 16 }}>
                  {unlockedCount}/12 unlocked
                  {ptsEarned > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 400, color: green, marginLeft: 6 }}>· +{ptsEarned} pts earned</span>
                  )}
                </p>
              </div>

              {/* progress bar */}
              <div style={{ height: 5, background: bdr, borderRadius: 999, marginBottom: 18, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(unlockedCount / 12) * 100}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  style={{ height: "100%", borderRadius: 999, background: unlockedCount === 12 ? green : amber }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {CHALLENGES.map((ch) => {
                  const Icon  = ch.icon;
                  const done  = completedTypes.has(ch.type);
                  return (
                    <motion.div
                      key={ch.type}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        background: done ? "#fff" : surf,
                        border: `1px solid ${done ? bdr : bdr}`,
                        borderRadius: 12,
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        opacity: done ? 1 : 0.75,
                      }}
                    >
                      {/* icon */}
                      <div style={{
                        height: 32, width: 32, borderRadius: 8, flexShrink: 0,
                        background: done ? `${ch.color}14` : "#E9E6E0",
                        border: `1.5px solid ${done ? ch.color : bdr}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {done
                          ? <Check size={14} style={{ color: ch.color }} />
                          : <Icon size={14} style={{ color: muted }} />
                        }
                      </div>

                      {/* content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: done ? ink : muted, marginBottom: 3, lineHeight: 1.2 }}>
                          {ch.label}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <span style={{ fontSize: 10, color: muted }}>{ch.dimension}</span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: "1px 6px",
                            borderRadius: 999,
                            background: done ? `${green}18` : surf,
                            color: done ? green : muted,
                            border: `1px solid ${done ? "#BBF7D0" : bdr}`,
                          }}>
                            +{ch.points} pts
                          </span>
                        </div>
                        <Link
                          href={`/founder/agents/${ch.agentId}`}
                          style={{ textDecoration: "none" }}
                        >
                          <div style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "3px 10px", borderRadius: 999,
                            fontSize: 10, fontWeight: 600,
                            background: done ? surf : ink,
                            color: done ? muted : "#fff",
                            border: `1px solid ${done ? bdr : ink}`,
                            cursor: "pointer",
                          }}>
                            {done ? (
                              <><ArrowRight size={9} /> View</>
                            ) : (
                              <><Zap size={9} /> Build</>
                            )}
                          </div>
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── all dimensions breakdown ────────────────────────── */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={pillarLabel}>All Q-Score Dimensions</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {sorted.map((dim, i) => {
              const score = dimScores[dim.key] ?? 0;
              return (
                <motion.div
                  key={dim.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  style={cardStyle}
                >
                  {/* header */}
                  <div style={{
                    padding: "16px 20px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: `1px solid ${bdr}`,
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{dim.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {benchmarks && benchmarks[dim.key] !== undefined && (() => {
                        const pctVal = benchmarks[dim.key];
                        const pctColor = pctVal >= 70 ? green : pctVal >= 40 ? amber : red;
                        return (
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            padding: "2px 8px", borderRadius: 999,
                            background: `${pctColor}18`, color: pctColor,
                          }}>
                            Top {100 - pctVal}%
                          </span>
                        );
                      })()}
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        padding: "2px 8px", borderRadius: 999,
                        border: `1px solid ${bdr}`, color: muted,
                      }}>
                        {dim.weight}% weight
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: "14px 20px 18px" }}>
                    {/* score bar */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: muted }}>Score</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(score) }}>{score}/100</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 999, background: surf }}>
                        <div style={{
                          width: `${score}%`, height: "100%",
                          borderRadius: 999, background: barColor(score),
                        }} />
                      </div>
                    </div>

                    {/* recommendations */}
                    <div style={{ marginBottom: 14 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>
                        How to Improve
                      </span>
                      {dim.recommendations.map((rec, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 5 }}>
                          <span style={{ color: muted, fontSize: 11, lineHeight: "18px" }}>•</span>
                          <span style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>{rec}</span>
                        </div>
                      ))}
                    </div>

                    {/* agent CTA */}
                    <Link href={`/founder/agents/${dim.agentId}`} style={{ textDecoration: "none" }}>
                      <div
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          padding: "9px 0",
                          borderRadius: 10,
                          border: `1px solid ${bdr}`,
                          background: "transparent",
                          color: ink,
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                          transition: "background .15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = surf)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        Get Help from {dim.agentName}
                        <ArrowRight size={13} />
                      </div>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── score evidence ──────────────────────────────────── */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Upload size={16} style={{ color: blue }} />
              <span style={{ ...pillarLabel, color: blue }}>Attach Evidence</span>
            </div>
            <button
              onClick={() => setShowEvidenceForm(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
                borderRadius: 999, fontSize: 11, fontWeight: 600,
                background: showEvidenceForm ? ink : surf,
                color: showEvidenceForm ? bg : ink,
                border: `1px solid ${showEvidenceForm ? ink : bdr}`,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <PlusCircle size={11} /> Add proof
            </button>
          </div>
          <p style={{ fontSize: 13, color: muted, marginBottom: 16 }}>
            Submit verified evidence — signed contracts, Stripe screenshots, LOIs — to permanently boost your dimension scores.
          </p>

          {/* add evidence form */}
          {showEvidenceForm && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ ...cardStyle, padding: "20px 24px", marginBottom: 14 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>Submit Evidence</p>
                <button onClick={() => setShowEvidenceForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted }}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 5 }}>Dimension</label>
                  <select
                    value={evidenceDim}
                    onChange={e => setEvidenceDim(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, fontSize: 12, color: ink, fontFamily: "inherit" }}
                  >
                    {["market","product","financial","goToMarket","team","traction"].map(d => (
                      <option key={d} value={d}>{DIMENSIONS.find(x => x.key === d)?.name ?? d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 5 }}>Evidence Type</label>
                  <select
                    value={evidenceType}
                    onChange={e => setEvidenceType(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, fontSize: 12, color: ink, fontFamily: "inherit" }}
                  >
                    {Object.entries(EVIDENCE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 5 }}>Title / Description</label>
                <input
                  value={evidenceTitle}
                  onChange={e => setEvidenceTitle(e.target.value)}
                  placeholder="e.g. Stripe dashboard showing $8,500 MRR"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, fontSize: 12, color: ink, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 5 }}>Metric / Value (optional)</label>
                <input
                  value={evidenceValue}
                  onChange={e => setEvidenceValue(e.target.value)}
                  placeholder="e.g. MRR $8,500 · 3 signed LOIs · 87 NPS"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, fontSize: 12, color: ink, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: 11, color: green, fontWeight: 600 }}>
                  +{EVIDENCE_POINTS[evidenceType]?.[evidenceDim] ?? 3} pts on approval
                </p>
                <button
                  onClick={submitEvidence}
                  disabled={!evidenceTitle.trim() || submittingEvidence}
                  style={{
                    padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: evidenceTitle.trim() ? ink : surf,
                    color: evidenceTitle.trim() ? bg : muted,
                    border: "none", cursor: evidenceTitle.trim() ? "pointer" : "not-allowed",
                    fontFamily: "inherit",
                  }}
                >
                  {submittingEvidence ? "Submitting…" : "Submit Evidence"}
                </button>
              </div>
            </motion.div>
          )}

          {/* evidence list */}
          {evidenceList.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {evidenceList.map((ev) => {
                const isAgentArtifact = ev.evidence_type === "agent_artifact";
                const statusColors: Record<string, string> = { pending: amber, verified: green, rejected: red };
                const iconColor = isAgentArtifact ? blue : (statusColors[ev.status] ?? muted);
                const dim = DIMENSIONS.find(d => d.key === ev.dimension);
                return (
                  <div key={ev.id} style={{
                    ...cardStyle, padding: "14px 18px",
                    display: "flex", alignItems: "center", gap: 12,
                    background: isAgentArtifact ? "#EFF6FF" : bg,
                    border: `1px solid ${isAgentArtifact ? "#BFDBFE" : bdr}`,
                  }}>
                    <div style={{
                      height: 36, width: 36, borderRadius: 9, flexShrink: 0,
                      background: `${iconColor}18`,
                      border: `1.5px solid ${iconColor}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isAgentArtifact
                        ? <Zap size={14} style={{ color: blue }} />
                        : <Upload size={14} style={{ color: iconColor }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{ev.title}</p>
                        {isAgentArtifact && (
                          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "1px 6px", borderRadius: 999, background: "#DBEAFE", color: blue }}>
                            AI
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10, color: muted }}>{dim?.name ?? ev.dimension}</span>
                        <span style={{ fontSize: 10, color: muted }}>· {EVIDENCE_TYPES[ev.evidence_type] ?? ev.evidence_type}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                        padding: "2px 8px", borderRadius: 999,
                        background: `${statusColors[ev.status] ?? muted}18`,
                        color: statusColors[ev.status] ?? muted,
                      }}>
                        {ev.status}
                      </span>
                      {ev.points_awarded > 0 && (
                        <p style={{ fontSize: 10, color: green, fontWeight: 600, marginTop: 2 }}>
                          +{ev.points_awarded} pts{ev.status === "verified" ? " ✓" : " pending"}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !showEvidenceForm && (
            <div style={{ ...cardStyle, padding: "20px 24px", textAlign: "center", opacity: 0.6 }}>
              <p style={{ fontSize: 13, color: muted }}>No evidence submitted yet</p>
              <p style={{ fontSize: 12, color: muted, marginTop: 4 }}>Add proof to unlock score boosts</p>
            </div>
          )}
        </div>

        {/* ── additional resources ────────────────────────────── */}
        <div style={{ ...cardStyle, padding: "22px 24px", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <BookOpen size={15} style={{ color: muted }} />
            <span style={pillarLabel}>Additional Resources</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {[
              { href: "/founder/academy",    label: "Attend Academy Workshops", icon: "🎓" },
              { href: "/founder/agents",     label: "Chat with AI Agents",      icon: "🤖" },
              { href: "/founder/assessment", label: "Retake Assessment",        icon: "📋" },
              { href: "/founder/dashboard",  label: "View Full Dashboard",      icon: "📊" },
            ].map(item => (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 16px",
                    borderRadius: 10,
                    border: `1px solid ${bdr}`,
                    fontSize: 13,
                    fontWeight: 500,
                    color: ink,
                    cursor: "pointer",
                    transition: "background .15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = surf)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── unlock preview ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            ...cardStyle,
            background: "#F0FDF4",
            borderColor: "#BBF7D0",
            padding: "24px 28px",
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div style={{
            height: 44, width: 44, borderRadius: 10, flexShrink: 0,
            background: "#DCFCE7",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Unlock size={20} style={{ color: "#166534" }} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#166534", marginBottom: 10 }}>
              What You&apos;ll Unlock at Q-Score 65+
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {unlocks.map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} style={{ color: green, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#15803D" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
