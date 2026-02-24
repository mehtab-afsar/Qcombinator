"use client";

import React from "react";
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
} from "lucide-react";
import Link from "next/link";
import { useQScore } from "@/features/qscore/hooks/useQScore";

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

// ─── component ────────────────────────────────────────────────────────────────
export default function ImproveQScorePage() {
  const { qScore } = useQScore();

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
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{dim.name}</span>
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
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 999,
                      border: `1px solid ${bdr}`,
                      color: muted,
                    }}>
                      {dim.weight}% weight
                    </span>
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
