"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MessageCircle,
  ArrowRight,
  Lock,
  Unlock,
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
  ChevronDown,
  ChevronUp,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { useQScore } from "@/features/qscore/hooks/useQScore";
import { bg, surf, bdr, ink, muted, blue, green, amber, red } from '@/lib/constants/colors'

// ─── types ────────────────────────────────────────────────────────────────────
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

interface DimensionDef {
  key: string;
  name: string;
  weight: number;
  agentId: string;
  agentName: string;
  recommendations: string[];
}

// ─── dimensions (P1–P6) ───────────────────────────────────────────────────────
const DIMENSIONS: DimensionDef[] = [
  {
    key: "p1", name: "Market Readiness", weight: 20,
    agentId: "patel", agentName: "Patel",
    recommendations: [
      "Upload LOIs, signed pilots, or customer contracts",
      "Document 25+ structured customer conversations",
      "Show retention and expansion signals from existing customers",
      "Add paying customer evidence with pricing details",
    ],
  },
  {
    key: "p2", name: "Market Potential", weight: 20,
    agentId: "atlas", agentName: "Atlas",
    recommendations: [
      "Refine SAM with a bottom-up calculation and real data sources",
      "Document market urgency — regulatory, tech, or social trigger",
      "Quantify the economic waste or inefficiency being solved",
      "Map adjacent markets and expansion paths with phasing",
    ],
  },
  {
    key: "p3", name: "IP / Defensibility", weight: 17,
    agentId: "leo", agentName: "Leo",
    recommendations: [
      "File or document patents, trade secrets, or proprietary methods",
      "Estimate replication cost and time for a funded competitor",
      "Describe technical depth — what makes this hard to replicate",
      "Document build complexity and key tacit knowledge held by team",
    ],
  },
  {
    key: "p4", name: "Founder / Team", weight: 18,
    agentId: "harper", agentName: "Harper",
    recommendations: [
      "Articulate specific domain years and why you're uniquely suited",
      "Document prior exits, companies built, or operator experience",
      "Ensure leadership coverage across tech, sales, and product",
      "Document how long the core team has worked together",
    ],
  },
  {
    key: "p5", name: "Structural Impact", weight: 8,
    agentId: "sage", agentName: "Sage",
    recommendations: [
      "Quantify climate or resource efficiency claims with concrete metrics",
      "Link revenue model directly to measurable impact outcomes",
      "Identify which UN SDGs your product materially addresses",
      "Document alignment with development priorities if applicable",
    ],
  },
  {
    key: "p6", name: "Financials", weight: 17,
    agentId: "felix", agentName: "Felix",
    recommendations: [
      "Connect Stripe or upload a financial spreadsheet to verify MRR",
      "Build a 12-month model with burn and runway projections",
      "Calculate LTV/CAC ratio and document unit economics",
      "Show gross margin trajectory and path to profitability",
    ],
  },
];

// ─── challenges (paramKey = p1…p6) ───────────────────────────────────────────
interface Challenge {
  type: string; label: string; icon: React.ElementType;
  paramKey: string; agentId: string; agentName: string; points: number; color: string;
}

const CHALLENGES: Challenge[] = [
  { type: "gtm_playbook",       label: "GTM Playbook",         icon: BookOpen,   paramKey: "p1", agentId: "patel",  agentName: "Patel",  points: 6, color: "#D97706" },
  { type: "financial_summary",  label: "Financial Summary",    icon: DollarSign, paramKey: "p6", agentId: "felix",  agentName: "Felix",  points: 6, color: green     },
  { type: "icp_document",       label: "ICP Document",         icon: FileText,   paramKey: "p2", agentId: "patel",  agentName: "Patel",  points: 5, color: blue      },
  { type: "competitive_matrix", label: "Competitive Analysis", icon: Search,     paramKey: "p2", agentId: "atlas",  agentName: "Atlas",  points: 5, color: "#DC2626" },
  { type: "pmf_survey",         label: "PMF Research Kit",     icon: BarChart3,  paramKey: "p1", agentId: "nova",   agentName: "Nova",   points: 5, color: "#7C3AED" },
  { type: "hiring_plan",        label: "Hiring Plan",          icon: Users,      paramKey: "p4", agentId: "harper", agentName: "Harper", points: 5, color: blue      },
  { type: "outreach_sequence",  label: "Outreach Sequence",    icon: Mail,       paramKey: "p1", agentId: "patel",  agentName: "Patel",  points: 4, color: green     },
  { type: "battle_card",        label: "Battle Card",          icon: Swords,     paramKey: "p2", agentId: "patel",  agentName: "Patel",  points: 4, color: "#DC2626" },
  { type: "sales_script",       label: "Sales Script",         icon: Zap,        paramKey: "p1", agentId: "susi",   agentName: "Susi",   points: 4, color: green     },
  { type: "brand_messaging",    label: "Brand Messaging",      icon: Sparkles,   paramKey: "p2", agentId: "maya",   agentName: "Maya",   points: 4, color: "#7C3AED" },
  { type: "strategic_plan",     label: "Strategic Plan",       icon: Compass,    paramKey: "p5", agentId: "sage",   agentName: "Sage",   points: 4, color: blue      },
  { type: "legal_checklist",    label: "Legal Checklist",      icon: Scale,      paramKey: "p3", agentId: "leo",    agentName: "Leo",    points: 3, color: "#D97706" },
];

// Evidence uses legacy DB keys — keep consistent with stored rows
const EVIDENCE_DIMS = [
  { key: "market",      label: "Market Readiness"   },
  { key: "financial",   label: "Financials"          },
  { key: "product",     label: "IP / Defensibility"  },
  { key: "goToMarket",  label: "Market Potential"    },
  { key: "team",        label: "Founder / Team"      },
  { key: "traction",    label: "Traction"            },
];

const LEGACY_DIM_LABEL: Record<string, string> = {
  market: "Market Readiness", financial: "Financials",
  product: "IP / Defensibility", goToMarket: "Market Potential",
  team: "Founder / Team", traction: "Traction",
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 70) return green; if (s >= 50) return amber; return red;
}
function barColor(s: number) {
  if (s >= 70) return green; if (s >= 50) return amber; return red;
}
function getDimLabel(key: string) {
  return DIMENSIONS.find(d => d.key === key)?.name ?? LEGACY_DIM_LABEL[key] ?? key;
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function ImproveQScorePage() {
  const { qScore } = useQScore();
  const [aiActions,            setAiActions]            = useState<AIAction[]>([]);
  const [loadingActions,       setLoadingActions]       = useState(true);
  const [regeneratingActions,  setRegeneratingActions]  = useState(false);
  const [completedTypes,       setCompletedTypes]       = useState<Set<string>>(new Set());
  const [toast,                setToast]                = useState<{ msg: string; ok: boolean } | null>(null);
  const [evidenceList,         setEvidenceList]         = useState<Array<{ id: string; dimension: string; evidence_type: string; title: string; data_value: string; status: string; points_awarded: number; created_at: string }>>([]);
  const [conflicts,            setConflicts]            = useState<Array<{ dimension: string; text: string; fix: string }>>([]);
  const [showEvidenceForm,     setShowEvidenceForm]     = useState(false);
  const [evidenceDim,          setEvidenceDim]          = useState("market");
  const [evidenceType,         setEvidenceType]         = useState("stripe_screenshot");
  const [evidenceTitle,        setEvidenceTitle]        = useState("");
  const [evidenceValue,        setEvidenceValue]        = useState("");
  const [submittingEvidence,   setSubmittingEvidence]   = useState(false);
  const [expandedDims,         setExpandedDims]         = useState<Set<string>>(new Set());

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

  const toggleDim = (key: string) =>
    setExpandedDims(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const submitEvidence = async () => {
    if (!evidenceTitle.trim()) return;
    setSubmittingEvidence(true);
    const pts = EVIDENCE_POINTS[evidenceType]?.[evidenceDim] ?? 3;
    try {
      const { submitEvidence: doSubmit } = await import("@/features/founder/services/improve-qscore.service");
      const row = await doSubmit({ dimension: evidenceDim, evidenceType, title: evidenceTitle, dataValue: evidenceValue, pointsAwarded: pts });
      setEvidenceList(prev => [row, ...prev]);
      setEvidenceTitle(""); setEvidenceValue(""); setShowEvidenceForm(false);
      showToast(`Evidence submitted — pending review (+${pts} pts on approval)`);
    } catch {
      showToast("Failed to submit evidence — please try again", false);
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
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(data => { if (Array.isArray(data.actions)) setAiActions(data.actions); })
      .catch(() => {})
      .finally(() => setLoadingActions(false));

    import("@/features/founder/services/improve-qscore.service")
      .then(({ fetchImproveQScoreData }) => fetchImproveQScoreData())
      .then(({ completedTypes, evidenceList, ragConflicts }) => {
        setCompletedTypes(completedTypes);
        setEvidenceList(evidenceList);
        if (ragConflicts.length) {
          setConflicts(ragConflicts.filter(c => c.dimension).map(c => ({
            dimension: c.dimension!,
            text: (c as { text?: string }).text ?? '',
            fix: (c as { fix?: string }).fix ?? 'Update your assessment data to match your evidence.',
          })));
        }
      })
      .catch(() => {});
  }, []);

  // ── derived values ────────────────────────────────────────────────────────
  const overall      = qScore?.overall ?? 0;
  const hasScore     = overall > 0;
  const isUnlocked   = overall >= 65;
  const targetScore  = isUnlocked ? 80 : 65;
  const pointsNeeded = Math.max(0, targetScore - overall);
  const progressPct  = Math.min((overall / targetScore) * 100, 100);

  type IQParam = { id: string; name: string; averageScore: number; weight: number }
  const iqBreakdown = (qScore?.iqBreakdown as IQParam[] | undefined) ?? [];
  const dimScores: Record<string, number> = Object.fromEntries(
    iqBreakdown.map(p => [p.id, Math.round(p.averageScore * 20)])
  );

  // Sort lowest score first (highest impact first)
  const sorted = [...DIMENSIONS].sort((a, b) => (dimScores[a.key] ?? 0) - (dimScores[b.key] ?? 0));

  // Only show challenges that map to a weak dimension (score < 70)
  const weakKeys = new Set(sorted.filter(d => (dimScores[d.key] ?? 0) < 70).map(d => d.key));
  const relevantChallenges = CHALLENGES
    .filter(c => weakKeys.has(c.paramKey))
    .sort((a, b) => b.points - a.points)
    .slice(0, 6);

  // ── shared styles ─────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: "#fff", border: `1px solid ${bdr}`, borderRadius: 14, overflow: "hidden",
  };
  const sectionLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.16em", color: muted,
  };

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, fontFamily: "inherit" }}>

      {/* toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "10px 18px", borderRadius: 10, background: toast.ok ? green : red, color: "#fff", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", pointerEvents: "none" }}>
          {toast.msg}
        </div>
      )}

      {/* ── header ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: "32px 40px 0", maxWidth: 1040, margin: "0 auto" }}>
        <Link href="/founder/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: muted, textDecoration: "none", marginBottom: 20 }}>
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 300, letterSpacing: "-0.03em", margin: "0 0 5px" }}>
              {isUnlocked ? "Improve Your Score" : "Unlock the Investor Marketplace"}
            </h1>
            <p style={{ fontSize: 13, color: muted, margin: 0, lineHeight: 1.5 }}>
              {!hasScore
                ? "Complete your profile assessment to get your IQ Score."
                : isUnlocked
                  ? "Marketplace unlocked. These actions will raise your score and improve investor matches."
                  : `${pointsNeeded} more points needed to access 500+ vetted investors.`}
            </p>
          </div>

          {/* Score ring */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>
                {isUnlocked ? "Target: 80" : "Target: 65"}
              </div>
              <div style={{ fontSize: 34, fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1, color: hasScore ? scoreColor(overall) : muted }}>
                {hasScore ? overall : "—"}<span style={{ fontSize: 14, color: muted, fontWeight: 400 }}>/100</span>
              </div>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: isUnlocked ? "#F0FDF4" : "#FFFBEB", border: `2px solid ${isUnlocked ? green : "#F5E6B8"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isUnlocked
                ? <Unlock size={20} style={{ color: green }} />
                : <Lock size={20} style={{ color: "#D97706" }} />}
            </div>
          </div>
        </div>

        {/* progress bar — only when locked */}
        {hasScore && !isUnlocked && (
          <div style={{ marginBottom: 0 }}>
            <div style={{ height: 5, background: "#FDE68A", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${progressPct}%`, height: "100%", borderRadius: 999, background: "#D97706", transition: "width .5s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: muted }}>Current: {overall}</span>
              <span style={{ fontSize: 10, color: muted }}>Goal: {targetScore}</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 40px 60px" }}>

        {/* conflicts */}
        {conflicts.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {conflicts.map((c, i) => (
              <div key={i} style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "12px 16px", marginBottom: 8, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: red, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>!</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: red, marginBottom: 2 }}>Data mismatch — {c.dimension}</div>
                  <div style={{ fontSize: 12, color: ink, marginBottom: 2 }}>{c.text}</div>
                  <div style={{ fontSize: 11, color: muted }}><strong>Fix:</strong> {c.fix}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SECTION 1: Action Plan (AI-generated from real assessment) ─────── */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Zap size={13} style={{ color: "#7C3AED" }} />
              <span style={{ ...sectionLabel, color: "#7C3AED" }}>Your Action Plan</span>
            </div>
            <button
              onClick={regenerateActions}
              disabled={loadingActions || regeneratingActions}
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: regeneratingActions ? muted : "#7C3AED", background: "none", border: `1px solid ${regeneratingActions ? bdr : "#DDD6FE"}`, borderRadius: 6, padding: "3px 9px", cursor: regeneratingActions ? "not-allowed" : "pointer" }}
            >
              <RefreshCw size={10} /> {regeneratingActions ? "Regenerating…" : "Regenerate"}
            </button>
          </div>
          <p style={{ fontSize: 13, color: muted, marginBottom: 14 }}>
            Generated from your specific assessment — ranked by score impact
          </p>

          {loadingActions ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ ...cardStyle, padding: "16px 20px" }}>
                  <div style={{ height: 13, background: surf, borderRadius: 6, width: "42%", marginBottom: 8 }} />
                  <div style={{ height: 10, background: surf, borderRadius: 6, width: "78%", marginBottom: 5 }} />
                  <div style={{ height: 10, background: surf, borderRadius: 6, width: "55%" }} />
                </div>
              ))}
            </div>
          ) : aiActions.length === 0 ? (
            <div style={{ ...cardStyle, padding: "22px", textAlign: "center" }}>
              <p style={{ fontSize: 13, color: muted, marginBottom: 10 }}>
                Complete your assessment to get personalised actions.
              </p>
              <Link href="/founder/profile-builder" style={{ display: "inline-block", fontSize: 13, fontWeight: 600, color: blue, textDecoration: "none" }}>
                Go to Profile Builder →
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {aiActions.slice(0, 3).map((action, i) => {
                const dim = DIMENSIONS.find(d => d.key === action.dimension);
                const dimScore = dimScores[action.dimension] ?? 0;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    style={{ ...cardStyle, padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start" }}
                  >
                    {/* rank bubble */}
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: surf, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 700, color: muted, marginTop: 1 }}>
                      {i + 1}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 5 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: ink, lineHeight: 1.3, margin: 0 }}>{action.title}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#EDE9FE", color: "#6D28D9", flexShrink: 0, whiteSpace: "nowrap" }}>
                          {action.impact}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: muted, lineHeight: 1.6, margin: "0 0 10px" }}>{action.description}</p>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: surf, border: `1px solid ${bdr}`, color: scoreColor(dimScore) }}>
                            {dim?.name ?? action.dimension}
                          </span>
                          <span style={{ fontSize: 11, color: muted }}>{action.timeframe}</span>
                        </div>
                        <Link
                          href={`/founder/agents/${action.agentId}${action.starterPrompt ? `?prompt=${encodeURIComponent(action.starterPrompt)}` : ''}`}
                          style={{ fontSize: 11, fontWeight: 600, color: blue, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <MessageCircle size={11} /> {action.agentName} →
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── SECTION 2: Score Breakdown (compact expandable rows) ──────────── */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
            <BarChart3 size={13} style={{ color: blue }} />
            <span style={sectionLabel}>Score Breakdown</span>
          </div>
          <p style={{ fontSize: 13, color: muted, marginBottom: 14 }}>
            Sorted lowest → highest — click a weak area to see what to fix
          </p>

          <div style={{ ...cardStyle }}>
            {sorted.map((dim, i) => {
              const score = dimScores[dim.key] ?? 0;
              const isWeak = score < 70;
              const isExpanded = expandedDims.has(dim.key);

              return (
                <div key={dim.key} style={{ borderBottom: i < sorted.length - 1 ? `1px solid ${bdr}` : "none" }}>
                  <div
                    style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, cursor: isWeak ? "pointer" : "default" }}
                    onClick={() => isWeak && toggleDim(dim.key)}
                  >
                    {/* name + weight */}
                    <div style={{ width: 150, flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>{dim.name}</div>
                      <div style={{ fontSize: 10, color: muted }}>{dim.weight}% of score</div>
                    </div>

                    {/* score bar */}
                    <div style={{ flex: 1, height: 5, background: surf, borderRadius: 999 }}>
                      <div style={{ width: `${score}%`, height: "100%", borderRadius: 999, background: barColor(score), transition: "width .4s ease" }} />
                    </div>

                    {/* score number */}
                    <div style={{ width: 46, textAlign: "right", fontSize: 13, fontWeight: 700, color: scoreColor(score), flexShrink: 0 }}>
                      {score}<span style={{ fontSize: 10, fontWeight: 400, color: muted }}>/100</span>
                    </div>

                    {/* agent link or done tick */}
                    <Link
                      href={`/founder/agents/${dim.agentId}`}
                      onClick={e => e.stopPropagation()}
                      style={{ fontSize: 11, fontWeight: 600, color: isWeak ? blue : muted, textDecoration: "none", display: "flex", alignItems: "center", gap: 3, flexShrink: 0, width: 76, justifyContent: "flex-end" }}
                    >
                      {isWeak
                        ? <><MessageCircle size={10} /> {dim.agentName}</>
                        : <><Check size={12} style={{ color: green }} /></>}
                    </Link>

                    {/* expand toggle */}
                    {isWeak && (
                      <div style={{ color: muted, flexShrink: 0 }}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    )}
                  </div>

                  {/* expanded recommendations */}
                  {isWeak && isExpanded && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ padding: "0 20px 16px 184px", background: surf }}
                    >
                      {dim.recommendations.map((rec, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 5 }}>
                          <span style={{ color: muted, fontSize: 11, lineHeight: "18px" }}>•</span>
                          <span style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>{rec}</span>
                        </div>
                      ))}
                      <Link
                        href={`/founder/agents/${dim.agentId}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 12, fontWeight: 600, color: blue, textDecoration: "none" }}
                      >
                        <MessageCircle size={11} /> Talk to {dim.agentName} →
                      </Link>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 3: Score Challenges (filtered to weak dimensions) ─────── */}
        {relevantChallenges.length > 0 && (() => {
          const unlockedCount = relevantChallenges.filter(c => completedTypes.has(c.type)).length;
          return (
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Trophy size={13} style={{ color: amber }} />
                  <span style={{ ...sectionLabel, color: amber }}>Score Challenges</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: unlockedCount === relevantChallenges.length && unlockedCount > 0 ? green : muted }}>
                  {unlockedCount}/{relevantChallenges.length} completed
                </span>
              </div>
              <p style={{ fontSize: 13, color: muted, marginBottom: 14 }}>
                Deliverables targeting your weakest areas — each permanently boosts your score
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {relevantChallenges.map(ch => {
                  const Icon = ch.icon;
                  const done = completedTypes.has(ch.type);
                  return (
                    <div key={ch.type} style={{ ...cardStyle, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ height: 32, width: 32, borderRadius: 8, flexShrink: 0, background: done ? `${ch.color}14` : "#E9E6E0", border: `1.5px solid ${done ? ch.color : bdr}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {done ? <Check size={14} style={{ color: ch.color }} /> : <Icon size={14} style={{ color: muted }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: done ? ink : muted, marginBottom: 4, lineHeight: 1.2 }}>{ch.label}</p>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 999, background: done ? `${green}18` : surf, color: done ? green : muted, border: `1px solid ${done ? "#BBF7D0" : bdr}` }}>
                          +{ch.points} pts
                        </span>
                        <div style={{ marginTop: 8 }}>
                          <Link href={`/founder/agents/${ch.agentId}`} style={{ textDecoration: "none" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 600, background: done ? surf : ink, color: done ? muted : "#fff", border: `1px solid ${done ? bdr : ink}`, cursor: "pointer" }}>
                              {done ? <><ArrowRight size={9} /> View</> : <><Zap size={9} /> Build</>}
                            </div>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── SECTION 4: Verified Evidence ──────────────────────────────────── */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Upload size={13} style={{ color: blue }} />
              <span style={{ ...sectionLabel, color: blue }}>Verified Evidence</span>
            </div>
            <button
              onClick={() => setShowEvidenceForm(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: showEvidenceForm ? ink : surf, color: showEvidenceForm ? bg : ink, border: `1px solid ${showEvidenceForm ? ink : bdr}`, cursor: "pointer", fontFamily: "inherit" }}
            >
              <PlusCircle size={10} /> Add proof
            </button>
          </div>
          <p style={{ fontSize: 13, color: muted, marginBottom: 14 }}>
            Submit signed contracts, Stripe screenshots, or LOIs to permanently boost your scores.
          </p>

          {showEvidenceForm && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ ...cardStyle, padding: "18px 22px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>Submit Evidence</p>
                <button onClick={() => setShowEvidenceForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted }}><X size={14} /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Dimension</label>
                  <select value={evidenceDim} onChange={e => setEvidenceDim(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, fontSize: 12, color: ink, fontFamily: "inherit" }}>
                    {EVIDENCE_DIMS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Evidence Type</label>
                  <select value={evidenceType} onChange={e => setEvidenceType(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, fontSize: 12, color: ink, fontFamily: "inherit" }}>
                    {Object.entries(EVIDENCE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Title / Description</label>
                <input value={evidenceTitle} onChange={e => setEvidenceTitle(e.target.value)} placeholder="e.g. Stripe dashboard showing $8,500 MRR" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, fontSize: 12, color: ink, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Metric / Value (optional)</label>
                <input value={evidenceValue} onChange={e => setEvidenceValue(e.target.value)} placeholder="e.g. MRR $8,500 · 3 signed LOIs" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, fontSize: 12, color: ink, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: 11, color: green, fontWeight: 600 }}>+{EVIDENCE_POINTS[evidenceType]?.[evidenceDim] ?? 3} pts on approval</p>
                <button onClick={submitEvidence} disabled={!evidenceTitle.trim() || submittingEvidence} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: evidenceTitle.trim() ? ink : surf, color: evidenceTitle.trim() ? bg : muted, border: "none", cursor: evidenceTitle.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                  {submittingEvidence ? "Submitting…" : "Submit Evidence"}
                </button>
              </div>
            </motion.div>
          )}

          {evidenceList.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {evidenceList.map(ev => {
                const isAgent = ev.evidence_type === "agent_artifact";
                const statusColors: Record<string, string> = { pending: amber, verified: green, rejected: red };
                const iconColor = isAgent ? blue : (statusColors[ev.status] ?? muted);
                return (
                  <div key={ev.id} style={{ ...cardStyle, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, background: isAgent ? "#EFF6FF" : bg, border: `1px solid ${isAgent ? "#BFDBFE" : bdr}` }}>
                    <div style={{ height: 34, width: 34, borderRadius: 8, flexShrink: 0, background: `${iconColor}18`, border: `1.5px solid ${iconColor}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isAgent ? <Zap size={13} style={{ color: blue }} /> : <Upload size={13} style={{ color: iconColor }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>{ev.title}</p>
                        {isAgent && <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", padding: "1px 5px", borderRadius: 999, background: "#DBEAFE", color: blue }}>AI</span>}
                      </div>
                      <span style={{ fontSize: 10, color: muted }}>{getDimLabel(ev.dimension)} · {EVIDENCE_TYPES[ev.evidence_type] ?? ev.evidence_type}</span>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", padding: "2px 7px", borderRadius: 999, background: `${statusColors[ev.status] ?? muted}18`, color: statusColors[ev.status] ?? muted }}>
                        {ev.status}
                      </span>
                      {ev.points_awarded > 0 && (
                        <p style={{ fontSize: 10, color: green, fontWeight: 600, marginTop: 1 }}>+{ev.points_awarded} pts{ev.status === "verified" ? " ✓" : " pending"}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !showEvidenceForm && (
            <div style={{ ...cardStyle, padding: "18px", textAlign: "center", opacity: 0.6 }}>
              <p style={{ fontSize: 13, color: muted }}>No evidence yet — add a Stripe screenshot or signed LOI to boost your score.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
