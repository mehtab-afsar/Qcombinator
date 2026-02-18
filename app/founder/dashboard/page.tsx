"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Lock,
  TrendingUp,
  Bot,
  GraduationCap,
  ChevronRight,
  RefreshCw,
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

// ─── demo mock data (shown when no real Q-Score yet) ─────────────────────────

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
  market:     { label: "Market",     weight: 20 },
  product:    { label: "Product",    weight: 18 },
  goToMarket: { label: "GTM",        weight: 17 },
  financial:  { label: "Financial",  weight: 18 },
  team:       { label: "Team",       weight: 15 },
  traction:   { label: "Traction",   weight: 12 },
};

const MOCK_AGENT_SESSIONS = [
  { agentId: "patel",  preview: "Let's tighten your ICP — you said B2B SaaS, but which segment?",       ago: "2h ago" },
  { agentId: "felix",  preview: "Your LTV:CAC is 2.1x. Target is 3x minimum for Series A.",             ago: "Yesterday" },
  { agentId: "nova",   preview: "How many users reach your core value event in the first 7 days?",       ago: "3 days ago" },
];

const MOCK_WORKSHOP = {
  title:      "Nailing Your ICP Workshop",
  instructor: "Sarah Chen",
  date:       "Feb 25, 2026 · 2:00 PM",
  topic:      "Go-to-Market",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 70) return "#2563EB";
  if (s >= 50) return "#D97706";
  return "#DC2626";
}

function gradeLabel(s: number) {
  if (s >= 80) return "Strong";
  if (s >= 65) return "Good";
  if (s >= 50) return "Developing";
  return "Early Stage";
}

// ─── component ────────────────────────────────────────────────────────────────

export default function FounderDashboard() {
  const { loading: authLoading } = useAuth();
  const { qScore: realQScore, loading: qScoreLoading } = useQScore();

  // ── loading ──────────────────────────────────────────────────────────────
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

  // Use real Q-Score if available, otherwise use demo data
  const qs = realQScore
    ? {
        overall:    realQScore.overall,
        percentile: realQScore.percentile ?? 41,
        breakdown:  {
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

  // Sorted dimensions — lowest first → drives recommendations
  const sortedDims = Object.entries(qs.breakdown).sort(([, a], [, b]) => a.score - b.score);
  const topActions = sortedDims.slice(0, 3);

  // SVG ring
  const circumference = 2 * Math.PI * 64;
  const dash          = circumference * (1 - qs.overall / 100);

  const pillarAccent: Record<string, string> = {
    "sales-marketing":   "#2563EB",
    "operations-finance": "#16A34A",
    "product-strategy":  "#7C3AED",
  };

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, padding: "36px 24px 64px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* ── header ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 6 }}>
            Founder Dashboard
          </p>
          <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink, marginBottom: 6 }}>
            Good morning.
          </h1>
          {isDemo && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 11, color: muted }}>
              <span style={{ height: 6, width: 6, background: "#D97706", borderRadius: "50%", display: "inline-block" }} />
              Demo data shown — complete your full assessment for a real score
            </div>
          )}
        </div>

        {/* ── Q-Score hero ────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 32, alignItems: "flex-start", marginBottom: 40, flexWrap: "wrap" }}>

          {/* ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}
          >
            <div style={{ position: "relative", height: 160, width: 160 }}>
              <svg style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} viewBox="0 0 144 144">
                <circle cx="72" cy="72" r="64" fill="none" stroke={bdr} strokeWidth="8" />
                <motion.circle
                  cx="72" cy="72" r="64"
                  fill="none" stroke={scoreColor(qs.overall)} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${circumference}`}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: dash }}
                  transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 40, fontWeight: 600, color: ink, lineHeight: 1 }}>{qs.overall}</span>
                <span style={{ fontSize: 11, color: muted, marginTop: 4 }}>Q-Score</span>
              </div>
            </div>

            {/* grade + percentile */}
            <div style={{ marginTop: 10, textAlign: "center" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{gradeLabel(qs.overall)}</p>
              <p style={{ fontSize: 11, color: muted }}>Top {100 - qs.percentile}% of founders</p>
            </div>
          </motion.div>

          {/* dimension bars */}
          <div style={{ flex: 1, minWidth: 240 }}>
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, fontWeight: 600, marginBottom: 14 }}>
              6-dimension breakdown
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {Object.entries(qs.breakdown).map(([key, dim], i) => {
                const meta = DIMENSION_META[key];
                return (
                  <motion.div key={key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.06 }}
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ width: 68, fontSize: 12, color: muted, fontWeight: 500, flexShrink: 0, textAlign: "right" }}>{meta.label}</span>
                    <div style={{ flex: 1, height: 4, background: surf, borderRadius: 999, overflow: "hidden", border: `1px solid ${bdr}` }}>
                      <motion.div
                        style={{ height: "100%", borderRadius: 999, background: scoreColor(dim.score) }}
                        initial={{ width: 0 }}
                        animate={{ width: `${dim.score}%` }}
                        transition={{ delay: 0.4 + i * 0.06, duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                    <span style={{ width: 28, fontSize: 11, color: ink, fontWeight: 600, fontFamily: "monospace", flexShrink: 0 }}>{dim.score}</span>
                    {dim.change !== 0 && (
                      <span style={{ fontSize: 10, color: dim.trend === "up" ? "#16A34A" : dim.trend === "down" ? "#DC2626" : muted, flexShrink: 0, fontWeight: 600 }}>
                        {dim.change > 0 ? "+" : ""}{dim.change}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <div style={{ marginTop: 16 }}>
              <Link href="/founder/assessment" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: blue, textDecoration: "none", fontWeight: 500 }}>
                {isDemo ? "Complete full assessment" : "Improve my score"}
                <ArrowRight style={{ height: 13, width: 13 }} />
              </Link>
            </div>
          </div>
        </div>

        {/* ── divider ─────────────────────────────────────────────────── */}
        <div style={{ height: 1, background: bdr, marginBottom: 36 }} />

        {/* ── top actions ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, fontWeight: 600, marginBottom: 16 }}>
            Top actions to improve your score
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {topActions.map(([key, dim], i) => {
              const meta    = DIMENSION_META[key];
              const dimAgents = agents.filter((a) => {
                const map: Record<string, string> = { market: "market", product: "product", goToMarket: "goToMarket", financial: "financial", team: "team", traction: "traction" };
                return a.improvesScore === map[key];
              });
              const agent = dimAgents[0];
              const potentialGain = Math.round((80 - dim.score) * (meta.weight / 100) * 2.5);

              return (
                <motion.div key={key}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.07 }}
                  style={{ borderBottom: i < 2 ? `1px solid ${bdr}` : "none" }}
                >
                  <Link href={agent ? `/founder/agents/${agent.id}` : "/founder/assessment"} style={{ textDecoration: "none" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0", cursor: "pointer", transition: "opacity .15s" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.7")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                    >
                      <div style={{ height: 34, width: 34, borderRadius: 8, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <TrendingUp style={{ height: 14, width: 14, color: scoreColor(dim.score) }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 2 }}>
                          Improve your {meta.label} Score
                          {agent && <span style={{ fontWeight: 400, color: muted }}> — talk to {agent.name}</span>}
                        </p>
                        <p style={{ fontSize: 12, color: muted }}>
                          Currently {dim.score}/100 · {meta.weight}% weight · up to +{potentialGain} pts overall
                        </p>
                      </div>
                      <ChevronRight style={{ height: 14, width: 14, color: muted, flexShrink: 0 }} />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── divider ─────────────────────────────────────────────────── */}
        <div style={{ height: 1, background: bdr, marginBottom: 36 }} />

        {/* ── recent agent sessions ────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, fontWeight: 600 }}>
              Recent adviser sessions
            </p>
            <Link href="/founder/agents" style={{ fontSize: 12, color: blue, textDecoration: "none", fontWeight: 500 }}>
              All 9 advisers →
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {MOCK_AGENT_SESSIONS.map((session, i) => {
              const agent = agents.find((a) => a.id === session.agentId);
              if (!agent) return null;
              const accent = pillarAccent[agent.pillar] ?? blue;
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.06 }}
                  style={{ borderBottom: i < MOCK_AGENT_SESSIONS.length - 1 ? `1px solid ${bdr}` : "none" }}
                >
                  <Link href={`/founder/agents/${agent.id}`} style={{ textDecoration: "none" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", cursor: "pointer", transition: "opacity .15s" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.7")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                    >
                      <div style={{ height: 32, width: 32, borderRadius: 8, background: bg, border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: accent, flexShrink: 0 }}>
                        {agent.name[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 2 }}>{agent.name} · <span style={{ fontWeight: 400, color: muted }}>{agent.specialty}</span></p>
                        <p style={{ fontSize: 12, color: muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {session.preview}
                        </p>
                      </div>
                      <span style={{ fontSize: 11, color: muted, flexShrink: 0 }}>{session.ago}</span>
                      <ChevronRight style={{ height: 13, width: 13, color: muted, flexShrink: 0 }} />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {MOCK_AGENT_SESSIONS.length === 0 && (
            <div style={{ padding: "24px", background: surf, borderRadius: 12, border: `1px solid ${bdr}`, textAlign: "center" }}>
              <Bot style={{ height: 24, width: 24, color: muted, margin: "0 auto 8px" }} />
              <p style={{ fontSize: 13, color: muted }}>No sessions yet.</p>
              <Link href="/founder/agents" style={{ fontSize: 13, color: blue, fontWeight: 500 }}>Start a conversation →</Link>
            </div>
          )}
        </div>

        {/* ── divider ─────────────────────────────────────────────────── */}
        <div style={{ height: 1, background: bdr, marginBottom: 36 }} />

        {/* ── investor pulse ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, fontWeight: 600, marginBottom: 16 }}>
            Investor marketplace
          </p>

          {qs.overall >= 65 ? (
            <Link href="/founder/matching" style={{ textDecoration: "none" }}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                style={{ padding: "20px", background: surf, border: `1px solid ${bdr}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "border-color .15s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = ink)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = bdr)}
              >
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 4 }}>500+ verified investors matched to your profile</p>
                  <p style={{ fontSize: 12, color: muted }}>Your Q-Score of {qs.overall} qualifies you for the marketplace.</p>
                </div>
                <ArrowRight style={{ height: 16, width: 16, color: ink, flexShrink: 0 }} />
              </motion.div>
            </Link>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              style={{ padding: "20px", background: surf, border: `1px solid ${bdr}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Lock style={{ height: 14, width: 14, color: muted }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>Investor marketplace locked</p>
                </div>
                <p style={{ fontSize: 12, color: muted }}>
                  You need a Q-Score of 65+ to access 500+ investors. You&apos;re at {qs.overall} — {65 - qs.overall} points away.
                </p>
              </div>
              <Link href="/founder/assessment" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: ink, color: bg, fontSize: 13, fontWeight: 500, borderRadius: 999, textDecoration: "none", flexShrink: 0, marginLeft: 16 }}>
                Unlock <ArrowRight style={{ height: 12, width: 12 }} />
              </Link>
            </motion.div>
          )}
        </div>

        {/* ── divider ─────────────────────────────────────────────────── */}
        <div style={{ height: 1, background: bdr, marginBottom: 36 }} />

        {/* ── academy next ────────────────────────────────────────────── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, fontWeight: 600 }}>
              Academy
            </p>
            <Link href="/founder/academy" style={{ fontSize: 12, color: blue, textDecoration: "none", fontWeight: 500 }}>
              View all →
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px", background: surf, border: `1px solid ${bdr}`, borderRadius: 14 }}
          >
            <div style={{ height: 40, width: 40, borderRadius: 10, background: bg, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <GraduationCap style={{ height: 18, width: 18, color: muted }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 2 }}>{MOCK_WORKSHOP.title}</p>
              <p style={{ fontSize: 12, color: muted }}>{MOCK_WORKSHOP.instructor} · {MOCK_WORKSHOP.date}</p>
            </div>
            <Link href="/founder/academy"
              style={{ padding: "8px 16px", border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 13, color: ink, textDecoration: "none", fontWeight: 500, flexShrink: 0, transition: "border-color .15s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = ink)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = bdr)}
            >
              Register
            </Link>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
