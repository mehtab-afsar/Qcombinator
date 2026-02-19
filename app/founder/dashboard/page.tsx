"use client";

import { motion } from "framer-motion";
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
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useQScore } from "@/features/qscore/hooks/useQScore";
import { agents } from "@/features/agents/data/agents";

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

const MOCK_AGENT_SESSIONS = [
  { agentId: "patel",  preview: "Let's tighten your ICP — you said B2B SaaS, but which segment?",  ago: "2h ago" },
  { agentId: "felix",  preview: "Your LTV:CAC is 2.1x. Target is 3x minimum for Series A.",          ago: "Yesterday" },
  { agentId: "nova",   preview: "How many users reach your core value event in the first 7 days?",    ago: "3 days ago" },
];

const MOCK_WORKSHOP = {
  title:      "Nailing Your ICP Workshop",
  instructor: "Sarah Chen",
  date:       "Feb 25, 2026 · 2:00 PM",
  topic:      "Go-to-Market",
};

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

// ─── component ────────────────────────────────────────────────────────────────
export default function FounderDashboard() {
  const { loading: authLoading } = useAuth();
  const { qScore: realQScore, loading: qScoreLoading } = useQScore();

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
  const topActions = sortedDims.slice(0, 3);
  const circumference = 2 * Math.PI * 52;
  const dash = circumference * (1 - qs.overall / 100);

  const quickStats = [
    { label: "Sessions this week", value: "7", sub: "+3 vs last week", icon: Bot,      positive: true  },
    { label: "Investor matches",   value: "12", sub: "unlocked at 65+", icon: Users,    positive: true  },
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
              Good morning.
            </h1>
            {isDemo && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 11, color: muted }}>
                <span style={{ height: 6, width: 6, background: amber, borderRadius: "50%", display: "inline-block", flexShrink: 0 }} />
                Demo data — complete assessment for a real score
              </div>
            )}
          </div>
        </motion.div>

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
              <Link href="/founder/agents" style={{ fontSize: 11, color: blue, textDecoration: "none", fontWeight: 500 }}>
                All advisers →
              </Link>
            </div>
            <div>
              {MOCK_AGENT_SESSIONS.map((session, i) => {
                const agent = agents.find((a) => a.id === session.agentId);
                if (!agent) return null;
                const accent = pillarAccent[agent.pillar] ?? blue;
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.07 }}
                    style={{ borderBottom: i < MOCK_AGENT_SESSIONS.length - 1 ? `1px solid ${bdr}` : "none" }}
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
                            {session.preview}
                          </p>
                        </div>
                        <span style={{ fontSize: 10, color: muted, flexShrink: 0 }}>{session.ago}</span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ── bottom row: investor pulse + academy ──────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* investor pulse */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {qs.overall >= 65 ? (
              <Link href="/founder/matching" style={{ textDecoration: "none" }}>
                <div
                  style={{
                    padding: "22px 24px", background: ink, borderRadius: 18,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    cursor: "pointer", transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.88")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                >
                  <div>
                    <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(249,247,242,0.45)", fontWeight: 600, marginBottom: 8 }}>
                      Investor Marketplace
                    </p>
                    <p style={{ fontSize: 15, fontWeight: 400, color: "#F9F7F2", marginBottom: 4 }}>500+ verified investors</p>
                    <p style={{ fontSize: 11, color: "rgba(249,247,242,0.5)" }}>Your Q-Score qualifies you.</p>
                  </div>
                  <div style={{ height: 40, width: 40, borderRadius: 10, background: "rgba(249,247,242,0.1)", border: "1px solid rgba(249,247,242,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ArrowRight style={{ height: 16, width: 16, color: "#F9F7F2" }} />
                  </div>
                </div>
              </Link>
            ) : (
              <div style={{ padding: "22px 24px", background: surf, border: `1px solid ${bdr}`, borderRadius: 18 }}>
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
                <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 2 }}>{MOCK_WORKSHOP.title}</p>
                <p style={{ fontSize: 11, color: muted }}>{MOCK_WORKSHOP.instructor} · {MOCK_WORKSHOP.date}</p>
              </div>
              <Link href="/founder/academy"
                style={{
                  padding: "7px 16px", border: `1px solid ${bdr}`, borderRadius: 999,
                  fontSize: 12, color: ink, textDecoration: "none", fontWeight: 500, flexShrink: 0, transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = ink)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = bdr)}
              >
                Register
              </Link>
            </div>
          </motion.div>
        </div>

      </div>

      {/* responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .dashboard-hero { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 700px) {
          .dashboard-hero ~ div { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 500px) {
          .dashboard-hero ~ div { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
