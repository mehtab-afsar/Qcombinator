"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  Lock,
  TrendingUp,
  TrendingDown,
  Minus,
  Bot,
  GraduationCap,
  ChevronRight,
  RefreshCw,
  Users,
  BarChart3,
  Zap,
  Briefcase,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useQScore } from "@/features/qscore/hooks/useQScore";
import { useMetrics } from "@/features/founder/hooks/useFounderData";
import { agents } from "@/features/agents/data/agents";
import { getUpcomingWorkshops } from "@/features/academy/data/workshops";

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

// ─── demo data ────────────────────────────────────────────────────────────────
const DEMO_QSCORE = {
  overall: 62,
  percentile: 41,
  breakdown: {
    market:     { score: 54, change: 2,  trend: "up"      as const },
    product:    { score: 71, change: 5,  trend: "up"      as const },
    goToMarket: { score: 38, change: -1, trend: "down"    as const },
    financial:  { score: 45, change: 0,  trend: "neutral" as const },
    team:       { score: 78, change: 3,  trend: "up"      as const },
    traction:   { score: 49, change: 1,  trend: "up"      as const },
  },
};

const DIMENSION_META: Record<string, { label: string; weight: number }> = {
  market:     { label: "Market",    weight: 20 },
  product:    { label: "Product",   weight: 18 },
  goToMarket: { label: "GTM",       weight: 17 },
  financial:  { label: "Financial", weight: 18 },
  team:       { label: "Team",      weight: 15 },
  traction:   { label: "Traction",  weight: 12 },
};

// Maps each Q-Score dimension to the best agent to challenge it
const DIMENSION_AGENT: Record<string, { agentId: string; agentName: string; label: string }> = {
  market:     { agentId: "atlas",  agentName: "Atlas",  label: "Competitive Analysis" },
  product:    { agentId: "nova",   agentName: "Nova",   label: "PMF Research Kit"     },
  goToMarket: { agentId: "patel",  agentName: "Patel",  label: "GTM Playbook"         },
  financial:  { agentId: "felix",  agentName: "Felix",  label: "Financial Summary"    },
  team:       { agentId: "harper", agentName: "Harper", label: "Hiring Plan"          },
  traction:   { agentId: "susi",   agentName: "Susi",   label: "Sales Script"         },
};

const MOCK_AGENT_SESSIONS = [
  { agentId: "patel",  preview: "Let's tighten your ICP — you said B2B SaaS, but which segment?",  ago: "2h ago" },
  { agentId: "felix",  preview: "Your LTV:CAC is 2.1x. Target is 3x minimum for Series A.",          ago: "Yesterday" },
  { agentId: "nova",   preview: "How many users reach your core value event in the first 7 days?",    ago: "3 days ago" },
];

// Pick the next upcoming workshop by date (relative to today)
const today = new Date().toISOString().slice(0, 10);
const NEXT_WORKSHOP = getUpcomingWorkshops()
  .filter(w => w.date >= today)
  .sort((a, b) => a.date.localeCompare(b.date))[0]
  ?? getUpcomingWorkshops().sort((a, b) => a.date.localeCompare(b.date))[0];

// ─── helpers ──────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 70) return blue;
  if (s >= 50) return amber;
  return red;
}
function gradeLabel(s: number) {
  if (s >= 80) return "Strong";
  if (s >= 65) return "Good";
  if (s >= 50) return "Developing";
  return "Early Stage";
}

const pillarAccent: Record<string, string> = {
  "sales-marketing":    blue,
  "operations-finance": green,
  "product-strategy":   "#7C3AED",
};

// ─── score history types ──────────────────────────────────────────────────────
interface ScorePoint {
  overall: number;
  market: number;
  product: number;
  gtm: number;
  financial: number;
  team: number;
  traction: number;
  date: string;
  source: string;
}

// ─── score chart ──────────────────────────────────────────────────────────────
const DIM_COLORS: Record<string, string> = {
  market:    "#2563EB",
  product:   "#7C3AED",
  gtm:       "#16A34A",
  financial: "#D97706",
  team:      "#DC2626",
  traction:  "#0891B2",
};
const DIM_LABELS: Record<string, string> = {
  market: "Market", product: "Product", gtm: "GTM",
  financial: "Financial", team: "Team", traction: "Traction",
};

function ScoreChart({ points }: { points: ScorePoint[] }) {
  const [showDims, setShowDims] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <div style={{ paddingTop: 8 }}>
        <p style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>
          Complete your assessment to start tracking your score over time.
        </p>
        <Link href="/founder/assessment" style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          marginTop: 14, padding: "7px 16px", background: ink, color: bg,
          fontSize: 12, fontWeight: 500, borderRadius: 999, textDecoration: "none",
        }}>
          Take assessment <ArrowRight style={{ height: 11, width: 11 }} />
        </Link>
      </div>
    );
  }

  // SVG layout
  const W = 560, H = 160;
  const ml = 30, mr = 72, mt = 14, mb = 28;
  const pw = W - ml - mr;
  const ph = H - mt - mb;

  const xPos = (i: number) => ml + (points.length > 1 ? (i / (points.length - 1)) * pw : pw / 2);
  const yPos = (v: number) => mt + (1 - v / 100) * ph;

  const linePath = (acc: (p: ScorePoint) => number) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${xPos(i).toFixed(1)},${yPos(acc(p)).toFixed(1)}`).join(" ");

  const lastScore = points[points.length - 1].overall;
  const diff = lastScore - points[0].overall;
  const diffColor = diff > 0 ? green : diff < 0 ? red : muted;
  const agentBoosts = points.filter(p => p.source === "agent_completion").length;

  // Date labels: first, middle, last (deduplicated)
  const dateIdxs = Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]));

  return (
    <div>
      {/* toggle pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
        {[["Overall", false], ["Dimensions", true]].map(([label, val]) => (
          <button
            key={label as string}
            onClick={() => setShowDims(val as boolean)}
            style={{
              padding: "3px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: showDims === val ? ink : surf,
              color: showDims === val ? bg : muted,
              border: `1px solid ${showDims === val ? ink : bdr}`,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {label as string}
          </button>
        ))}
        {agentBoosts > 0 && (
          <span style={{ fontSize: 10, color: blue, marginLeft: 6, fontWeight: 600 }}>
            ⚡ {agentBoosts} agent boost{agentBoosts > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* SVG chart */}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: "visible", display: "block" }}>
        {/* Reference gridlines */}
        {[40, 65, 80].map(v => (
          <g key={v}>
            <line
              x1={ml} y1={yPos(v)} x2={W - mr} y2={yPos(v)}
              stroke={v === 80 ? "#EDE9FE" : v === 65 ? "#FEF3C7" : bdr}
              strokeWidth={v === 65 || v === 80 ? 1.5 : 0.5}
              strokeDasharray={v === 65 || v === 80 ? "4,3" : undefined}
            />
            <text x={ml - 5} y={yPos(v) + 3.5} fill={muted} fontSize={8.5} textAnchor="end">{v}</text>
            {v === 65 && (
              <text x={W - mr + 6} y={yPos(v) + 3.5} fill="#B45309" fontSize={9} fontWeight="600">Marketplace</text>
            )}
            {v === 80 && (
              <text x={W - mr + 6} y={yPos(v) + 3.5} fill="#6D28D9" fontSize={9} fontWeight="600">Target</text>
            )}
          </g>
        ))}

        {/* Dimension lines */}
        {showDims && Object.entries(DIM_COLORS).map(([key, col]) => (
          <path
            key={key}
            d={linePath((p) => (p as unknown as Record<string, number>)[key === "gtm" ? "gtm" : key])}
            fill="none"
            stroke={col}
            strokeWidth={1.5}
            strokeOpacity={0.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Overall line */}
        <path
          d={linePath(p => p.overall)}
          fill="none"
          stroke={scoreColor(lastScore)}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points + tooltips */}
        {points.map((p, i) => {
          const x = xPos(i);
          const y = yPos(p.overall);
          const isAgent = p.source === "agent_completion";
          const isHov = hovered === i;
          return (
            <g
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "default" }}
            >
              {/* Event label under dot */}
              <text x={x} y={yPos(0) + 16} fill={isAgent ? blue : muted} fontSize={9} textAnchor="middle">
                {isAgent ? "⚡" : "A"}
              </text>
              {/* Dot */}
              <circle cx={x} cy={y} r={isHov ? 5 : 3.5} fill={scoreColor(p.overall)} />
              {/* Score tooltip */}
              {isHov && (
                <g>
                  <rect x={x - 16} y={y - 28} width={32} height={17} rx={4} fill={ink} />
                  <text x={x} y={y - 16} fill={bg} fontSize={10} textAnchor="middle" fontWeight="600">
                    {p.overall}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* X-axis date labels */}
        {dateIdxs.map(i => (
          <text key={i} x={xPos(i)} y={H - 2} fill={muted} fontSize={8.5} textAnchor="middle">
            {new Date(points[i].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
        ))}
      </svg>

      {/* Dimension legend */}
      {showDims && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
          {Object.entries(DIM_LABELS).map(([key, label]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 14, height: 2.5, background: DIM_COLORS[key], borderRadius: 2 }} />
              <span style={{ fontSize: 10, color: muted }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
        <span style={{ fontSize: 24, fontWeight: 300, color: ink, letterSpacing: "-0.03em" }}>{lastScore}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: diffColor }}>
          {diff > 0 ? "+" : ""}{diff} since start
        </span>
      </div>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function getGreeting(name?: string) {
  const h = new Date().getHours();
  const salutation = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const first = name?.split(" ")[0];
  return first ? `${salutation}, ${first}.` : `${salutation}.`;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function FounderDashboard() {
  const { loading: authLoading, user } = useAuth();
  const { qScore: realQScore, loading: qScoreLoading } = useQScore();
  const { metrics: dashMetrics } = useMetrics();
  const [scoreHistory,  setScoreHistory]  = useState<ScorePoint[]>([]);
  const [usedAgentIds, setUsedAgentIds]  = useState<Set<string>>(new Set());

  type ActivityRow = { id: string; agent_id: string; action_type: string; description: string; created_at: string };
  type PendingRow  = { id: string; agent_id: string; action_type: string; title: string; summary: string | null; created_at: string };
  const [agentActivity,    setAgentActivity]    = useState<ActivityRow[]>([]);
  const [pendingActions,   setPendingActions]   = useState<PendingRow[]>([]);
  const [weeklyActivity,   setWeeklyActivity]   = useState<number | null>(null);
  const [investorMatches,  setInvestorMatches]  = useState<number | null>(null);
  const [portfolioViews,   setPortfolioViews]   = useState<{ total: number; last7: number } | null>(null);
  const [approvingId,    setApprovingId]    = useState<string | null>(null);

  async function handleDecision(actionId: string, decision: "approved" | "rejected") {
    setApprovingId(actionId);
    try {
      await fetch("/api/agents/pending", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, decision }),
      });
      setPendingActions(prev => prev.filter(a => a.id !== actionId));
    } finally {
      setApprovingId(null);
    }
  }

  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;

        // Fetch completed agent deliverables
        supabase
          .from("agent_artifacts")
          .select("agent_id")
          .eq("user_id", user.id)
          .then(({ data }) => {
            if (data) setUsedAgentIds(new Set(data.map((r: { agent_id: string }) => r.agent_id)));
          });

        supabase
          .from("qscore_history")
          .select("overall_score, market_score, product_score, gtm_score, financial_score, team_score, traction_score, calculated_at, data_source")
          .eq("user_id", user.id)
          .order("calculated_at", { ascending: true })
          .limit(20)
          .then(({ data }) => {
            if (data && data.length > 0) {
              setScoreHistory(data.map((r: {
                overall_score: number; market_score: number; product_score: number;
                gtm_score: number; financial_score: number; team_score: number;
                traction_score: number; calculated_at: string; data_source: string;
              }) => ({
                overall:   r.overall_score   ?? 0,
                market:    r.market_score    ?? 0,
                product:   r.product_score   ?? 0,
                gtm:       r.gtm_score       ?? 0,
                financial: r.financial_score ?? 0,
                team:      r.team_score      ?? 0,
                traction:  r.traction_score  ?? 0,
                date:      r.calculated_at,
                source:    r.data_source ?? "assessment",
              })));
            }
          });

        // Live agent activity feed (last 5 actions)
        supabase
          .from("agent_activity")
          .select("id, agent_id, action_type, description, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5)
          .then(({ data }) => { if (data) setAgentActivity(data as ActivityRow[]); });

        // Sessions this week (agent_activity count in last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        supabase
          .from("agent_activity")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", weekAgo)
          .then(({ count }) => { if (count !== null) setWeeklyActivity(count); });

        // Investor matches (unique investors with any connection status)
        supabase
          .from("connection_requests")
          .select("demo_investor_id", { count: "exact", head: true })
          .eq("founder_id", user.id)
          .then(({ count }) => { if (count !== null) setInvestorMatches(count); });

        // Portfolio view analytics (fire-and-forget, non-critical)
        fetch(`/api/p/${user.id}/analytics`)
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (d && typeof d.totalViews === "number") {
              setPortfolioViews({ total: d.totalViews, last7: d.last7Days ?? 0 });
            }
          })
          .catch(() => {});

        // Pending approval queue
        supabase
          .from("pending_actions")
          .select("id, agent_id, action_type, title, summary, created_at")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(10)
          .then(({ data }) => { if (data) setPendingActions(data as PendingRow[]); });
      });
    });
  }, []);

  if (authLoading || qScoreLoading) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <RefreshCw style={{ height: 24, width: 24, color: muted, margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: 13, color: muted }}>Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const qs = realQScore
    ? {
        overall:    realQScore.overall,
        percentile: realQScore.percentile ?? 41,
        breakdown: {
          market:     { score: realQScore.breakdown.market.score,     change: realQScore.breakdown.market.change ?? 0,     trend: realQScore.breakdown.market.trend ?? "neutral"     as const },
          product:    { score: realQScore.breakdown.product.score,    change: realQScore.breakdown.product.change ?? 0,    trend: realQScore.breakdown.product.trend ?? "neutral"    as const },
          goToMarket: { score: realQScore.breakdown.goToMarket.score, change: realQScore.breakdown.goToMarket.change ?? 0, trend: realQScore.breakdown.goToMarket.trend ?? "neutral" as const },
          financial:  { score: realQScore.breakdown.financial.score,  change: realQScore.breakdown.financial.change ?? 0,  trend: realQScore.breakdown.financial.trend ?? "neutral"  as const },
          team:       { score: realQScore.breakdown.team.score,       change: realQScore.breakdown.team.change ?? 0,       trend: realQScore.breakdown.team.trend ?? "neutral"       as const },
          traction:   { score: realQScore.breakdown.traction.score,   change: realQScore.breakdown.traction.change ?? 0,   trend: realQScore.breakdown.traction.trend ?? "neutral"   as const },
        },
      }
    : DEMO_QSCORE;

  const isDemo = !realQScore;
  const sortedDims = Object.entries(qs.breakdown).sort(([, a], [, b]) => a.score - b.score);

  // Score freshness
  const lastScoreDate = scoreHistory.length > 0 ? new Date(scoreHistory[scoreHistory.length - 1].date) : null;
  const daysSinceScore = lastScoreDate ? Math.floor((Date.now() - lastScoreDate.getTime()) / 86400000) : null;
  const isStale    = !isDemo && daysSinceScore !== null && daysSinceScore >= 90;
  const isMaturing = !isDemo && daysSinceScore !== null && daysSinceScore >= 60 && daysSinceScore < 90;

  // Runway warning
  const runwayMonths = dashMetrics?.runway ?? null;
  const runwayLow    = runwayMonths !== null && runwayMonths < 6;
  const runwayCritical = runwayMonths !== null && runwayMonths <= 2;
  const topActions = sortedDims.slice(0, 3);
  const circumference = 2 * Math.PI * 52;
  const dash = circumference * (1 - qs.overall / 100);

  const quickStats = [
    {
      label: "Sessions this week",
      value: weeklyActivity !== null ? String(weeklyActivity) : "—",
      sub: weeklyActivity !== null ? (weeklyActivity > 0 ? "agent actions logged" : "start a session") : "loading…",
      icon: Bot, positive: true,
    },
    {
      label: "Investor outreach",
      value: investorMatches !== null ? String(investorMatches) : "—",
      sub: investorMatches !== null ? (investorMatches === 0 ? "connect at 65+ Q-Score" : `connection${investorMatches !== 1 ? "s" : ""} sent`) : "loading…",
      icon: Users, positive: true,
    },
    { label: "Score percentile",   value: `${qs.percentile}th`, sub: "of all founders", icon: BarChart3, positive: null  },
    { label: "Next milestone",     value: isDemo ? "65" : String(Math.max(65, Math.ceil(qs.overall / 10) * 10)), sub: "target Q-Score", icon: Zap, positive: null },
  ];

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, padding: "36px 28px 72px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>

        {/* ── page header ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 32 }}
        >
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: muted, fontWeight: 600, marginBottom: 5 }}>
            Founder Dashboard
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <h1 style={{ fontSize: "clamp(1.5rem,3.5vw,2.1rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink }}>
              {getGreeting((user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split("@")[0])}
            </h1>
            {isDemo && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 11, color: muted }}>
                <span style={{ height: 6, width: 6, background: amber, borderRadius: "50%", display: "inline-block", flexShrink: 0 }} />
                Demo data — complete assessment for a real score
              </div>
            )}
          </div>
        </motion.div>

        {/* ── runway warning banner ─────────────────────────────────── */}
        {runwayLow && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 20px", borderRadius: 12, marginBottom: 16,
              background: runwayCritical ? "#FEF2F2" : "#FFFBEB",
              border: `1px solid ${runwayCritical ? "#FECACA" : "#FDE68A"}`,
            }}
          >
            <div style={{
              height: 36, width: 36, borderRadius: 9, flexShrink: 0,
              background: runwayCritical ? "#FEE2E2" : "#FEF3C7",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>
              {runwayCritical ? "🚨" : "⚠️"}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: runwayCritical ? "#991B1B" : "#92400E", marginBottom: 2 }}>
                {runwayCritical
                  ? `Critical: only ${runwayMonths} months of runway left`
                  : `Runway alert: ${runwayMonths} months left — Felix identified cuts to extend it`}
              </p>
              <p style={{ fontSize: 12, color: runwayCritical ? "#B91C1C" : "#A16207" }}>
                {runwayCritical
                  ? "Immediate action required. Open Felix to analyze burn and generate investor update."
                  : "Under 6 months runway. Open Felix to see cost-cutting options and send an investor update."}
              </p>
            </div>
            <Link
              href="/founder/agents/felix"
              style={{
                flexShrink: 0, padding: "7px 16px",
                background: runwayCritical ? "#991B1B" : "#92400E",
                color: "#fff", borderRadius: 999,
                fontSize: 12, fontWeight: 600, textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Open Felix
            </Link>
          </motion.div>
        )}

        {/* ── score staleness banner ────────────────────────────────── */}
        {(isStale || isMaturing) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 20px", borderRadius: 12, marginBottom: 24,
              background: isStale ? "#FFFBEB" : "#FFF7F0",
              border: `1px solid ${isStale ? "#F5E6B8" : "#FED7AA"}`,
            }}
          >
            <div style={{
              height: 36, width: 36, borderRadius: 9, flexShrink: 0,
              background: isStale ? "#FEF3C7" : "#FFEDD5",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <RefreshCw style={{ height: 16, width: 16, color: isStale ? "#92400E" : "#C2410C" }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: isStale ? "#92400E" : "#9A3412", marginBottom: 2 }}>
                {isStale
                  ? `Your Q-Score is ${daysSinceScore} days old — it may not reflect your current progress`
                  : `Your score was calculated ${daysSinceScore} days ago — consider a re-assessment soon`}
              </p>
              <p style={{ fontSize: 12, color: isStale ? "#A16207" : "#B45309" }}>
                {isStale
                  ? "Retake the interview to get an accurate score and unlock fresh insights."
                  : "Scores older than 90 days are considered stale. Your startup has likely evolved."}
              </p>
            </div>
            <Link
              href="/founder/assessment"
              style={{
                flexShrink: 0, padding: "7px 16px",
                background: isStale ? "#92400E" : "#C2410C",
                color: "#fff", borderRadius: 999,
                fontSize: 12, fontWeight: 600, textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Retake now
            </Link>
          </motion.div>
        )}

        {/* ── hero: Q-Score + dimensions ────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 24,
          marginBottom: 24,
          alignItems: "stretch",
        }}
          className="dashboard-hero"
        >
          {/* Q-Score card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            style={{
              background: ink, borderRadius: 20, padding: "32px 24px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18,
            }}
          >
            {/* SVG ring */}
            <div style={{ position: "relative", height: 128, width: 128 }}>
              <svg style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
                <motion.circle
                  cx="60" cy="60" r="52"
                  fill="none" stroke="#F9F7F2" strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={`${circumference}`}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: dash }}
                  transition={{ duration: 1.4, delay: 0.3, ease: "easeOut" }}
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 38, fontWeight: 600, color: "#F9F7F2", lineHeight: 1 }}>{qs.overall}</span>
                <span style={{ fontSize: 10, color: "rgba(249,247,242,0.5)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.12em" }}>Q-Score</span>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 15, fontWeight: 500, color: "#F9F7F2" }}>{gradeLabel(qs.overall)}</p>
              <p style={{ fontSize: 11, color: "rgba(249,247,242,0.5)", marginTop: 2 }}>Top {100 - qs.percentile}% of founders</p>
              {daysSinceScore !== null && !isDemo && (
                <p style={{
                  fontSize: 10, marginTop: 6,
                  color: isStale ? "#FCA5A5" : isMaturing ? "#FCD34D" : "rgba(249,247,242,0.4)",
                  fontWeight: isStale || isMaturing ? 600 : 400,
                }}>
                  {isStale ? "⚠ " : isMaturing ? "○ " : ""}{daysSinceScore}d old
                </p>
              )}
            </div>
            <Link href={isDemo ? "/founder/assessment" : "/founder/improve-qscore"}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "9px 20px",
                background: "rgba(249,247,242,0.1)", border: "1px solid rgba(249,247,242,0.18)",
                borderRadius: 999, fontSize: 12, color: "#F9F7F2", fontWeight: 500, textDecoration: "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(249,247,242,0.18)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(249,247,242,0.1)")}
            >
              {isDemo ? "Complete assessment" : "Improve score"} <ArrowRight style={{ height: 12, width: 12 }} />
            </Link>
          </motion.div>

          {/* Dimension bars */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              background: surf, border: `1px solid ${bdr}`, borderRadius: 20, padding: "24px 28px",
              display: "flex", flexDirection: "column", justifyContent: "space-between",
            }}
          >
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 20 }}>
              6-dimension breakdown
            </p>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 13 }}>
              {Object.entries(qs.breakdown).map(([key, dim], i) => {
                const meta = DIMENSION_META[key];
                const TrendIcon = dim.trend === "up" ? TrendingUp : dim.trend === "down" ? TrendingDown : Minus;
                const trendColor = dim.trend === "up" ? green : dim.trend === "down" ? red : muted;
                return (
                  <motion.div key={key}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.06 }}
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <span style={{ width: 64, fontSize: 11, color: muted, fontWeight: 500, flexShrink: 0, textAlign: "right" }}>{meta.label}</span>
                    <div style={{ flex: 1, height: 5, background: bdr, borderRadius: 999, overflow: "hidden" }}>
                      <motion.div
                        style={{ height: "100%", borderRadius: 999, background: scoreColor(dim.score) }}
                        initial={{ width: 0 }}
                        animate={{ width: `${dim.score}%` }}
                        transition={{ delay: 0.45 + i * 0.06, duration: 0.7, ease: "easeOut" }}
                      />
                    </div>
                    <span style={{ width: 24, fontSize: 12, color: ink, fontWeight: 600, fontFamily: "monospace", flexShrink: 0, textAlign: "right" }}>{dim.score}</span>
                    {dim.change !== 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                        <TrendIcon style={{ height: 10, width: 10, color: trendColor }} />
                        <span style={{ fontSize: 10, color: trendColor, fontWeight: 600 }}>
                          {dim.change > 0 ? "+" : ""}{dim.change}
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ── score challenges ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{ marginBottom: 24 }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600 }}>
              Score challenges — complete a deliverable to boost your weakest dimensions
            </p>
            <Link href="/founder/improve-qscore" style={{ fontSize: 11, color: blue, textDecoration: "none", fontWeight: 500 }}>
              View all →
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {topActions.map(([key, dim], i) => {
              const meta    = DIMENSION_META[key];
              const aInfo   = DIMENSION_AGENT[key];
              const col     = scoreColor(dim.score);
              const TrendIcon = dim.trend === "up" ? TrendingUp : dim.trend === "down" ? TrendingDown : Minus;
              return (
                <Link key={key} href={`/founder/agents/${aInfo.agentId}?challenge=${key}`} style={{ textDecoration: "none" }}>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.07 }}
                    style={{
                      background: bg, border: `1px solid ${bdr}`, borderRadius: 14,
                      padding: "18px 20px", cursor: "pointer",
                      transition: "border-color .15s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = col; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = bdr; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: col }}>{dim.score}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <TrendIcon style={{ height: 10, width: 10, color: dim.trend === "up" ? green : dim.trend === "down" ? red : muted }} />
                        {dim.change !== 0 && (
                          <span style={{ fontSize: 10, color: dim.trend === "up" ? green : dim.trend === "down" ? red : muted, fontWeight: 600 }}>
                            {dim.change > 0 ? "+" : ""}{dim.change}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ height: 3, background: bdr, borderRadius: 999, marginBottom: 12, overflow: "hidden" }}>
                      <div style={{ width: `${dim.score}%`, height: "100%", background: col, borderRadius: 999 }} />
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 3 }}>
                      {meta.label} — Challenge
                    </p>
                    <p style={{ fontSize: 11, color: muted, marginBottom: 10 }}>
                      Build a {aInfo.label} with {aInfo.agentName}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: col }}>
                      Start challenge <ChevronRight style={{ height: 11, width: 11 }} />
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </motion.div>

        {/* ── quick stats row ───────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 32 }}>
          {quickStats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06 }}
                style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, padding: "18px 20px" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ height: 32, width: 32, borderRadius: 8, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon style={{ height: 14, width: 14, color: muted }} />
                  </div>
                </div>
                <p style={{ fontSize: 24, fontWeight: 300, color: ink, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: muted, marginTop: 4 }}>{s.label}</p>
                <p style={{ fontSize: 10, color: s.positive === true ? green : s.positive === false ? red : muted, marginTop: 2, fontWeight: 500 }}>{s.sub}</p>
              </motion.div>
            );
          })}
        </div>

        {/* ── main content: actions + sessions ──────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>

          {/* top actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}
          >
            <div style={{ padding: "20px 22px 16px", borderBottom: `1px solid ${bdr}` }}>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600 }}>
                Top actions to improve your score
              </p>
            </div>
            <div>
              {topActions.map(([key, dim], i) => {
                const meta = DIMENSION_META[key];
                const dimAgents = agents.filter((a) => {
                  const map: Record<string, string> = { market: "market", product: "product", goToMarket: "goToMarket", financial: "financial", team: "team", traction: "traction" };
                  return a.improvesScore === map[key];
                });
                const agent = dimAgents[0];
                const potentialGain = Math.round((80 - dim.score) * (meta.weight / 100) * 2.5);
                const col = scoreColor(dim.score);
                return (
                  <motion.div key={key}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + i * 0.07 }}
                    style={{ borderBottom: i < 2 ? `1px solid ${bdr}` : "none" }}
                  >
                    <Link href={agent ? `/founder/agents/${agent.id}` : "/founder/assessment"} style={{ textDecoration: "none" }}>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 22px", cursor: "pointer", transition: "background 0.15s" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = surf)}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                      >
                        {/* score pill */}
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: col, fontFamily: "monospace" }}>{dim.score}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: ink }}>
                            {meta.label}
                            {agent && <span style={{ fontWeight: 400, color: muted }}> — {agent.name}</span>}
                          </p>
                          <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                            {meta.weight}% weight · up to +{potentialGain} pts
                          </p>
                        </div>
                        <ChevronRight style={{ height: 13, width: 13, color: muted, flexShrink: 0 }} />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* recent agent sessions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}
          >
            <div style={{ padding: "20px 22px 16px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600 }}>
                Recent adviser sessions
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {agentActivity.length > 0 && (
                  <Link href="/founder/activity" style={{ fontSize: 11, color: muted, textDecoration: "none", fontWeight: 500 }}>
                    Full log →
                  </Link>
                )}
                <Link href="/founder/agents" style={{ fontSize: 11, color: blue, textDecoration: "none", fontWeight: 500 }}>
                  All advisers →
                </Link>
              </div>
            </div>
            <div>
              {(agentActivity.length > 0 ? agentActivity : MOCK_AGENT_SESSIONS).map((item, i) => {
                const isReal = agentActivity.length > 0;
                const agentId  = isReal ? (item as ActivityRow).agent_id   : (item as typeof MOCK_AGENT_SESSIONS[0]).agentId;
                const preview  = isReal ? (item as ActivityRow).description : (item as typeof MOCK_AGENT_SESSIONS[0]).preview;
                const ago      = isReal
                  ? (() => {
                      const diff = Date.now() - new Date((item as ActivityRow).created_at).getTime();
                      const h = Math.floor(diff / 3600000);
                      const d = Math.floor(diff / 86400000);
                      return h < 1 ? "Just now" : h < 24 ? `${h}h ago` : d === 1 ? "Yesterday" : `${d}d ago`;
                    })()
                  : (item as typeof MOCK_AGENT_SESSIONS[0]).ago;
                const agent  = agents.find((a) => a.id === agentId);
                if (!agent) return null;
                const accent = pillarAccent[agent.pillar] ?? blue;
                const listLen = isReal ? agentActivity.length : MOCK_AGENT_SESSIONS.length;
                return (
                  <motion.div key={isReal ? (item as ActivityRow).id : i}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.07 }}
                    style={{ borderBottom: i < listLen - 1 ? `1px solid ${bdr}` : "none" }}
                  >
                    <Link href={`/founder/agents/${agent.id}`} style={{ textDecoration: "none" }}>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 22px", cursor: "pointer", transition: "background 0.15s" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = surf)}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                      >
                        <div style={{ height: 34, width: 34, borderRadius: 10, background: bg, border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: accent, flexShrink: 0 }}>
                          {agent.name[0]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: ink }}>{agent.name}</p>
                          <p style={{ fontSize: 11, color: muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                            {preview}
                          </p>
                        </div>
                        <span style={{ fontSize: 10, color: muted, flexShrink: 0 }}>{ago}</span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ── score trajectory (full width) ─────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          style={{ padding: "22px 28px", background: surf, border: `1px solid ${bdr}`, borderRadius: 18, marginBottom: 24 }}
        >
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 2 }}>
            Score trajectory
          </p>
          <p style={{ fontSize: 11, color: muted, marginBottom: 14 }}>
            Every assessment and agent boost · hover a point to see the exact score
          </p>
          <ScoreChart points={scoreHistory} />
        </motion.div>

        {/* ── workspace quick-access ────────────────────────────── */}
        {usedAgentIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44 }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
              padding: "18px 24px", background: bg, border: `1px solid ${bdr}`, borderRadius: 18,
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ height: 40, width: 40, borderRadius: 10, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <GraduationCap style={{ height: 18, width: 18, color: muted }} />
              </div>
              <div>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: muted, fontWeight: 600, marginBottom: 3 }}>Deliverables Workspace</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: ink }}>
                  {usedAgentIds.size} of 9 advisers have produced deliverables
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 180, height: 6, background: bdr, borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${(usedAgentIds.size / 9) * 100}%`, height: "100%", borderRadius: 999, background: usedAgentIds.size === 9 ? green : blue }} />
              </div>
              <Link href="/founder/workspace" style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 16px", background: surf, border: `1px solid ${bdr}`,
                borderRadius: 999, fontSize: 12, fontWeight: 500, color: ink, textDecoration: "none",
                whiteSpace: "nowrap",
              }}>
                View workspace <ArrowRight style={{ height: 11, width: 11 }} />
              </Link>
            </div>
          </motion.div>
        )}

        {/* ── investor portfolio CTA ────────────────────────────── */}
        {!isDemo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.46 }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
              padding: "18px 24px", background: bg, border: `1px solid ${bdr}`, borderRadius: 18,
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ height: 40, width: 40, borderRadius: 10, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Briefcase style={{ height: 18, width: 18, color: muted }} />
              </div>
              <div>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: muted, fontWeight: 600, marginBottom: 3 }}>Investor Portfolio</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: ink }}>
                  Share your Q-Score &amp; deliverables with investors
                </p>
              </div>
            </div>
            <Link href="/founder/portfolio" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 16px", background: ink, color: bg,
              borderRadius: 999, fontSize: 12, fontWeight: 500, textDecoration: "none",
              whiteSpace: "nowrap",
            }}>
              View portfolio <ArrowRight style={{ height: 11, width: 11 }} />
            </Link>
          </motion.div>
        )}

        {/* ── live metrics strip ────────────────────────────────── */}
        {dashMetrics && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48 }}
            style={{ marginBottom: 24 }}
          >
            <Link href="/founder/metrics" style={{ textDecoration: "none" }}>
              <div
                style={{
                  display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
                  gap: 0, border: `1px solid ${bdr}`, borderRadius: 14, overflow: "hidden",
                  cursor: "pointer", transition: "border-color .15s",
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "#C4BFB8")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = bdr)}
              >
                {[
                  { icon: DollarSign, label: "MRR",     value: `$${dashMetrics.mrr.toLocaleString()}`,           sub: "monthly recurring" },
                  { icon: TrendingDown, label: "Burn",  value: `$${dashMetrics.burn.toLocaleString()}`,          sub: "monthly burn" },
                  { icon: BarChart3, label: "Runway",   value: `${dashMetrics.runway} mo`,                       sub: dashMetrics.runway >= 18 ? "strong" : dashMetrics.runway >= 12 ? "adequate" : "extend soon" },
                  { icon: Users, label: "Customers",    value: String(dashMetrics.customers),                    sub: "paying" },
                  { icon: TrendingUp, label: "LTV:CAC", value: `${dashMetrics.ltvCacRatio}:1`,                   sub: dashMetrics.ltvCacRatio >= 3 ? "healthy ✓" : "below target" },
                ].map((item, idx, arr) => {
                  const Icon = item.icon;
                  const isLast = idx === arr.length - 1;
                  return (
                    <div
                      key={item.label}
                      style={{
                        padding: "14px 18px", background: bg,
                        borderRight: isLast ? "none" : `1px solid ${bdr}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                        <Icon style={{ width: 11, height: 11, color: muted }} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>{item.label}</span>
                      </div>
                      <p style={{ fontSize: 18, fontWeight: 300, color: ink, lineHeight: 1, marginBottom: 3 }}>{item.value}</p>
                      <p style={{ fontSize: 10, color: muted }}>{item.sub}</p>
                    </div>
                  );
                })}
              </div>
            </Link>
          </motion.div>
        )}

        {/* ── approval inbox (conditional row above bottom row) ─── */}
        {pendingActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42 }}
            style={{ padding: "18px 24px", background: "#FFFBEB", border: `1px solid #FDE68A`, borderRadius: 18, marginBottom: 0 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ height: 6, width: 6, borderRadius: "50%", background: amber, flexShrink: 0 }} />
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "#92400E", fontWeight: 700 }}>
                  Pending approvals
                </p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: amber }}>{pendingActions.length} action{pendingActions.length !== 1 ? "s" : ""}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendingActions.map(action => (
                <div
                  key={action.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", background: "#fff",
                    border: `1px solid #FDE68A`, borderRadius: 10,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ color: muted, fontWeight: 500, textTransform: "capitalize" }}>{action.agent_id} · </span>
                      {action.title}
                    </p>
                    {action.summary && (
                      <p style={{ fontSize: 11, color: muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{action.summary}</p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      disabled={approvingId === action.id}
                      onClick={() => handleDecision(action.id, "approved")}
                      style={{
                        padding: "5px 12px", background: green, color: "#fff",
                        border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                        opacity: approvingId === action.id ? 0.6 : 1,
                      }}
                    >
                      Approve
                    </button>
                    <button
                      disabled={approvingId === action.id}
                      onClick={() => handleDecision(action.id, "rejected")}
                      style={{
                        padding: "5px 12px", background: "transparent", color: muted,
                        border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                        opacity: approvingId === action.id ? 0.6 : 1,
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── bottom row: activity + investor pulse + academy ───── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }} className="dashboard-bottom">

          {/* live agent activity feed */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            style={{ padding: "22px 24px", background: surf, border: `1px solid ${bdr}`, borderRadius: 18 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600 }}>
                Adviser activity
              </p>
              <span style={{ fontSize: 11, fontWeight: 700, color: usedAgentIds.size > 0 ? green : muted }}>
                {usedAgentIds.size}/{agents.length}
              </span>
            </div>

            {agentActivity.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {agentActivity.map(row => {
                  const accent = agents.find(a => a.id === row.agent_id)
                    ? (pillarAccent[agents.find(a => a.id === row.agent_id)!.pillar] ?? blue)
                    : blue;
                  const ago = (() => {
                    const diff = Date.now() - new Date(row.created_at).getTime();
                    const m = Math.floor(diff / 60000);
                    if (m < 1) return "just now";
                    if (m < 60) return `${m}m ago`;
                    const h = Math.floor(m / 60);
                    if (h < 24) return `${h}h ago`;
                    return `${Math.floor(h / 24)}d ago`;
                  })();
                  return (
                    <div key={row.id} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{
                        height: 28, width: 28, borderRadius: 8, flexShrink: 0,
                        background: `${accent}18`, border: `1.5px solid ${accent}40`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, color: accent,
                      }}>
                        {(row.agent_id[0] ?? "?").toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, color: ink, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {row.description}
                        </p>
                        <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>{ago}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {agents.map((agent) => {
                  const done   = usedAgentIds.has(agent.id);
                  const accent = { "sales-marketing": blue, "operations-finance": green, "product-strategy": "#7C3AED" }[agent.pillar] ?? blue;
                  return (
                    <Link key={agent.id} href={`/founder/agents/${agent.id}`} style={{ textDecoration: "none" }}>
                      <div
                        title={agent.name}
                        style={{
                          height: 48, borderRadius: 10,
                          border: `1.5px solid ${done ? accent : bdr}`,
                          background: done ? `${accent}12` : bg,
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center", gap: 2,
                          cursor: "pointer", transition: "opacity .15s",
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.7"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: done ? accent : muted }}>
                          {agent.name[0]}
                        </span>
                        {done && (
                          <span style={{ fontSize: 8, fontWeight: 600, color: accent, letterSpacing: "0.05em" }}>✓</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
              <Link href="/founder/agents" style={{ textDecoration: "none" }}>
                <p style={{ fontSize: 11, color: blue, fontWeight: 500 }}>All advisers →</p>
              </Link>
              {agentActivity.length > 0 && (
                <Link href="/founder/activity" style={{ textDecoration: "none" }}>
                  <p style={{ fontSize: 11, color: muted, fontWeight: 500 }}>Full log →</p>
                </Link>
              )}
            </div>
          </motion.div>

          {/* investor pulse */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {qs.overall >= 65 ? (
              <Link href="/founder/matching" style={{ textDecoration: "none", display: "block", height: "100%" }}>
                <div
                  style={{
                    padding: "22px 24px", background: ink, borderRadius: 18, height: "100%",
                    display: "flex", flexDirection: "column", justifyContent: "space-between",
                    cursor: "pointer", transition: "opacity 0.15s", boxSizing: "border-box",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.88")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                >
                  <div>
                    <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(249,247,242,0.45)", fontWeight: 600, marginBottom: 8 }}>
                      Investor Marketplace
                    </p>
                    <p style={{ fontSize: 15, fontWeight: 400, color: "#F9F7F2", marginBottom: 4 }}>500+ verified investors</p>
                    {portfolioViews && portfolioViews.last7 > 0 ? (
                      <p style={{ fontSize: 11, color: "rgba(249,247,242,0.65)", marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, color: "#F9F7F2" }}>{portfolioViews.last7}</span> portfolio {portfolioViews.last7 === 1 ? "view" : "views"} this week
                      </p>
                    ) : (
                      <p style={{ fontSize: 11, color: "rgba(249,247,242,0.5)" }}>Your Q-Score qualifies you.</p>
                    )}
                    {portfolioViews && portfolioViews.total > 0 && (
                      <p style={{ fontSize: 10, color: "rgba(249,247,242,0.35)" }}>{portfolioViews.total} total views</p>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                    <div style={{ height: 36, width: 36, borderRadius: 10, background: "rgba(249,247,242,0.1)", border: "1px solid rgba(249,247,242,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ArrowRight style={{ height: 14, width: 14, color: "#F9F7F2" }} />
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div style={{ padding: "22px 24px", background: surf, border: `1px solid ${bdr}`, borderRadius: 18, height: "100%", boxSizing: "border-box" }}>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: muted, fontWeight: 600, marginBottom: 8 }}>
                  Investor Marketplace
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Lock style={{ height: 13, width: 13, color: muted }} />
                  <p style={{ fontSize: 14, fontWeight: 500, color: ink }}>Locked — need {65 - qs.overall} more pts</p>
                </div>
                <p style={{ fontSize: 11, color: muted, marginBottom: 14 }}>
                  Reach Q-Score 65 to access 500+ investors.
                </p>
                <Link href="/founder/assessment" style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 18px", background: ink, color: bg,
                  fontSize: 12, fontWeight: 500, borderRadius: 999, textDecoration: "none",
                }}>
                  Improve score <ArrowRight style={{ height: 11, width: 11 }} />
                </Link>
              </div>
            )}
          </motion.div>

          {/* academy */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            style={{ padding: "22px 24px", background: surf, border: `1px solid ${bdr}`, borderRadius: 18 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: muted, fontWeight: 600 }}>
                Academy
              </p>
              <Link href="/founder/academy" style={{ fontSize: 11, color: blue, textDecoration: "none", fontWeight: 500 }}>
                View all →
              </Link>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ height: 44, width: 44, borderRadius: 12, background: bg, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <GraduationCap style={{ height: 20, width: 20, color: muted }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 2 }}>{NEXT_WORKSHOP?.title ?? "Live Workshops"}</p>
                <p style={{ fontSize: 11, color: muted }}>
                  {NEXT_WORKSHOP
                    ? `${NEXT_WORKSHOP.instructor} · ${new Date(NEXT_WORKSHOP.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${NEXT_WORKSHOP.time}`
                    : "New sessions added weekly"}
                </p>
              </div>
            </div>
            <Link href="/founder/academy"
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                marginTop: 16, padding: "7px 16px", border: `1px solid ${bdr}`, borderRadius: 999,
                fontSize: 12, color: ink, textDecoration: "none", fontWeight: 500, transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = ink)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = bdr)}
            >
              Register
            </Link>
          </motion.div>
        </div>

      </div>

      {/* responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .dashboard-hero { grid-template-columns: 1fr !important; }
          .dashboard-bottom { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .dashboard-bottom { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
