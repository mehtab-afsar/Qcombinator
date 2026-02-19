"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Target,
  Sparkles,
  ChevronRight,
  Download,
  Zap,
  BarChart3,
  Activity,
  RefreshCw,
} from "lucide-react";

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
type InsightType = "opportunity" | "risk" | "trend" | "recommendation";
type Impact      = "high" | "medium" | "low";

interface AIInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  confidence: number;
  impact: Impact;
  category: string;
  timestamp: string;
}

interface CompanyAnalysis {
  name: string;
  qScore: number;
  overallRating: number;
  strengths: string[];
  risks: string[];
  marketSize: string;
  competitivePosition: string;
  founderScore: number;
  teamScore: number;
  tractionScore: number;
  marketScore: number;
}

// ─── mock data ────────────────────────────────────────────────────────────────
const mockInsights: AIInsight[] = [
  {
    id: "1", type: "opportunity",
    title: "High-growth AI/ML Sector Opportunity",
    description: "3 new startups in your target AI/ML sector with 90%+ match scores have entered the pipeline in the last 48 hours. Market timing is optimal with recent enterprise adoption trends.",
    confidence: 94, impact: "high", category: "Market Intelligence", timestamp: "2 hours ago",
  },
  {
    id: "2", type: "risk",
    title: "Market Saturation Alert: FinTech",
    description: "Your FinTech portfolio concentration (35%) exceeds recommended diversification threshold. Consider rebalancing or adjusting deal flow filters.",
    confidence: 88, impact: "medium", category: "Portfolio Risk", timestamp: "5 hours ago",
  },
  {
    id: "3", type: "trend",
    title: "Healthcare Tech Momentum Building",
    description: "Healthcare sector showing 180% increase in high-quality deal flow. Average Q scores increased from 742 to 819 in last quarter.",
    confidence: 91, impact: "high", category: "Sector Trends", timestamp: "1 day ago",
  },
  {
    id: "4", type: "recommendation",
    title: "Portfolio Company Follow-on Opportunity",
    description: "TechFlow AI (Portfolio) shows strong signals for Series B readiness. Metrics exceed projected targets by 40%. Consider pro-rata follow-on.",
    confidence: 96, impact: "high", category: "Portfolio Insights", timestamp: "1 day ago",
  },
  {
    id: "5", type: "opportunity",
    title: "Undervalued CleanTech Opportunity",
    description: "GreenEnergy Labs valuation 30% below market comparables with superior founder profile and traction metrics. Limited time window.",
    confidence: 87, impact: "medium", category: "Valuation Analysis", timestamp: "2 days ago",
  },
];

const mockCompanyAnalysis: CompanyAnalysis = {
  name: "TechFlow AI",
  qScore: 847,
  overallRating: 8.9,
  strengths: [
    "Exceptional founding team with deep domain expertise (Ex-Google, Stanford)",
    "Strong product-market fit evidenced by 180% YoY growth",
    "High customer retention rate (94%) and NPS score (72)",
    "Clear competitive moat through proprietary ML algorithms",
    "Efficient capital deployment with strong unit economics",
  ],
  risks: [
    "Customer concentration: Top 3 clients represent 45% of revenue",
    "Competitive pressure from well-funded incumbents",
    "Key person dependency on technical co-founder",
    "Limited geographic diversification (80% revenue from US)",
  ],
  marketSize: "$45B TAM, $8.5B SAM, Growing at 32% CAGR",
  competitivePosition: "Top 3 player in mid-market segment with defensible IP",
  founderScore: 9.2,
  teamScore: 8.7,
  tractionScore: 8.9,
  marketScore: 8.4,
};

// ─── helpers ──────────────────────────────────────────────────────────────────
const TABS = ["insights", "deep-dive", "predictions", "comparables"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  insights:    "AI Insights",
  "deep-dive": "Deep Dive",
  predictions: "Predictions",
  comparables: "Comparables",
};

function insightMeta(type: InsightType) {
  switch (type) {
    case "opportunity":    return { icon: Target,    color: green, label: "Opportunity", bg: "#ECFDF5", border: "#86EFAC" };
    case "risk":           return { icon: AlertTriangle, color: amber, label: "Risk Alert",   bg: "#FFFBEB", border: "#FDE68A" };
    case "trend":          return { icon: TrendingUp, color: blue,  label: "Trend",       bg: "#EFF6FF", border: "#93C5FD" };
    case "recommendation": return { icon: Sparkles,  color: "#7C3AED", label: "Recommendation", bg: "#F5F3FF", border: "#C4B5FD" };
  }
}

function impactColor(impact: Impact) {
  return impact === "high" ? red : impact === "medium" ? amber : muted;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function AIAnalysisPage() {
  const [activeTab, setActiveTab] = useState<Tab>("insights");

  const overviewCounts = {
    opportunity:    mockInsights.filter((i) => i.type === "opportunity").length,
    risk:           mockInsights.filter((i) => i.type === "risk").length,
    trend:          mockInsights.filter((i) => i.type === "trend").length,
    recommendation: mockInsights.filter((i) => i.type === "recommendation").length,
  };

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, padding: "36px 28px 72px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>

        {/* ── header ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: muted, fontWeight: 600, marginBottom: 5 }}>
              AI Intelligence Hub
            </p>
            <h1 style={{ fontSize: "clamp(1.5rem,3.5vw,2.1rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink }}>
              Deep insights, live.
            </h1>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "9px 18px", background: surf, border: `1px solid ${bdr}`,
                borderRadius: 999, fontSize: 12, color: ink, fontWeight: 500, cursor: "pointer",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = ink)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = bdr)}
            >
              <Download style={{ height: 13, width: 13 }} />
              Export report
            </button>
            <button
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "9px 18px", background: ink, border: `1px solid ${ink}`,
                borderRadius: 999, fontSize: 12, color: bg, fontWeight: 500, cursor: "pointer",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.82")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
            >
              <Brain style={{ height: 13, width: 13 }} />
              Generate analysis
            </button>
          </div>
        </div>

        {/* ── overview tiles ─────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
          {(["opportunity", "risk", "trend", "recommendation"] as InsightType[]).map((type, i) => {
            const meta = insightMeta(type);
            const Icon = meta.icon;
            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, padding: "20px 22px" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ height: 36, width: 36, borderRadius: 10, background: meta.bg, border: `1px solid ${meta.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon style={{ height: 16, width: 16, color: meta.color }} />
                  </div>
                </div>
                <p style={{ fontSize: 30, fontWeight: 300, color: ink, letterSpacing: "-0.04em", lineHeight: 1 }}>
                  {overviewCounts[type]}
                </p>
                <p style={{ fontSize: 11, color: muted, marginTop: 5 }}>{meta.label}{overviewCounts[type] !== 1 ? "s" : ""}</p>
              </motion.div>
            );
          })}
        </div>

        {/* ── custom tab bar ─────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 2, padding: "4px", background: surf, border: `1px solid ${bdr}`, borderRadius: 12, marginBottom: 24, width: "fit-content" }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 18px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer",
                border: "none", transition: "all 0.15s",
                background: activeTab === tab ? bg : "transparent",
                color: activeTab === tab ? ink : muted,
                boxShadow: activeTab === tab ? `0 1px 4px rgba(24,22,15,0.08)` : "none",
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* ── tab content ────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >

            {/* ── INSIGHTS ──────────────────────────────────────────── */}
            {activeTab === "insights" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {mockInsights.map((insight, i) => {
                  const meta = insightMeta(insight.type);
                  const Icon = meta.icon;
                  return (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      style={{
                        background: bg, border: `1px solid ${bdr}`, borderRadius: 16,
                        padding: "22px 24px", display: "flex", gap: 18, alignItems: "flex-start",
                        transition: "border-color 0.15s",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#C8C3BB")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = bdr)}
                    >
                      {/* type icon */}
                      <div style={{ height: 40, width: 40, borderRadius: 12, background: meta.bg, border: `1px solid ${meta.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon style={{ height: 17, width: 17, color: meta.color }} />
                      </div>

                      <div style={{ flex: 1 }}>
                        {/* title row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7, flexWrap: "wrap" }}>
                          <p style={{ fontSize: 14, fontWeight: 500, color: ink }}>{insight.title}</p>
                          {/* impact badge */}
                          <span style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                            padding: "2px 8px", borderRadius: 999, flexShrink: 0,
                            color: impactColor(insight.impact),
                            background: insight.impact === "high" ? "#FEF2F2" : insight.impact === "medium" ? "#FFFBEB" : surf,
                            border: `1px solid ${insight.impact === "high" ? "#FECACA" : insight.impact === "medium" ? "#FDE68A" : bdr}`,
                          }}>
                            {insight.impact} impact
                          </span>
                          {/* category pill */}
                          <span style={{ fontSize: 10, padding: "2px 9px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, color: muted }}>
                            {insight.category}
                          </span>
                        </div>

                        <p style={{ fontSize: 13, color: muted, lineHeight: 1.6, marginBottom: 12 }}>{insight.description}</p>

                        {/* confidence bar */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 11, color: muted }}>Confidence</span>
                          <div style={{ width: 96, height: 4, background: surf, borderRadius: 999, overflow: "hidden", border: `1px solid ${bdr}` }}>
                            <motion.div
                              style={{ height: "100%", borderRadius: 999, background: meta.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${insight.confidence}%` }}
                              transition={{ delay: 0.3 + i * 0.06, duration: 0.6, ease: "easeOut" }}
                            />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{insight.confidence}%</span>
                          <span style={{ fontSize: 11, color: muted, marginLeft: "auto" }}>{insight.timestamp}</span>
                        </div>
                      </div>

                      <button style={{ height: 32, width: 32, borderRadius: 8, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "background 0.15s" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = bdr)}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = surf)}
                      >
                        <ChevronRight style={{ height: 14, width: 14, color: muted }} />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* ── DEEP DIVE ─────────────────────────────────────────── */}
            {activeTab === "deep-dive" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* header card */}
                <div style={{ background: ink, borderRadius: 18, padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(249,247,242,0.45)", fontWeight: 600, marginBottom: 6 }}>
                      Comprehensive Analysis
                    </p>
                    <h2 style={{ fontSize: 22, fontWeight: 300, color: "#F9F7F2", letterSpacing: "-0.02em" }}>{mockCompanyAnalysis.name}</h2>
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ textAlign: "center", padding: "12px 20px", background: "rgba(249,247,242,0.1)", border: "1px solid rgba(249,247,242,0.15)", borderRadius: 12 }}>
                      <p style={{ fontSize: 22, fontWeight: 600, color: "#F9F7F2", lineHeight: 1 }}>{mockCompanyAnalysis.qScore}</p>
                      <p style={{ fontSize: 10, color: "rgba(249,247,242,0.45)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.1em" }}>Q-Score</p>
                    </div>
                    <div style={{ textAlign: "center", padding: "12px 20px", background: "rgba(249,247,242,0.1)", border: "1px solid rgba(249,247,242,0.15)", borderRadius: 12 }}>
                      <p style={{ fontSize: 22, fontWeight: 600, color: "#F9F7F2", lineHeight: 1 }}>{mockCompanyAnalysis.overallRating}</p>
                      <p style={{ fontSize: 10, color: "rgba(249,247,242,0.45)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.1em" }}>Rating / 10</p>
                    </div>
                  </div>
                </div>

                {/* score dimensions */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                  {[
                    { label: "Founder",  score: mockCompanyAnalysis.founderScore, max: 10, icon: Sparkles },
                    { label: "Team",     score: mockCompanyAnalysis.teamScore,    max: 10, icon: Brain    },
                    { label: "Traction", score: mockCompanyAnalysis.tractionScore,max: 10, icon: TrendingUp },
                    { label: "Market",   score: mockCompanyAnalysis.marketScore,  max: 10, icon: BarChart3 },
                  ].map(({ label, score, max, icon: Icon }, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, padding: "22px 20px", textAlign: "center" }}
                    >
                      <div style={{ height: 40, width: 40, borderRadius: 12, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                        <Icon style={{ height: 17, width: 17, color: muted }} />
                      </div>
                      <p style={{ fontSize: 28, fontWeight: 300, color: ink, letterSpacing: "-0.03em", lineHeight: 1 }}>{score}</p>
                      <p style={{ fontSize: 11, color: muted, marginTop: 3 }}>{label}</p>
                      {/* mini bar */}
                      <div style={{ height: 4, background: surf, border: `1px solid ${bdr}`, borderRadius: 999, overflow: "hidden", marginTop: 10 }}>
                        <motion.div
                          style={{ height: "100%", borderRadius: 999, background: blue }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(score / max) * 100}%` }}
                          transition={{ delay: 0.3 + i * 0.08, duration: 0.7, ease: "easeOut" }}
                        />
                      </div>
                      <p style={{ fontSize: 9, color: muted, marginTop: 4 }}>out of {max}</p>
                    </motion.div>
                  ))}
                </div>

                {/* strengths + risks */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle2 style={{ height: 15, width: 15, color: green }} />
                      <p style={{ fontSize: 11, fontWeight: 600, color: ink, textTransform: "uppercase", letterSpacing: "0.12em" }}>Key Strengths</p>
                    </div>
                    <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
                      {mockCompanyAnalysis.strengths.map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <div style={{ height: 6, width: 6, borderRadius: "50%", background: green, flexShrink: 0, marginTop: 5 }} />
                          <p style={{ fontSize: 13, color: muted, lineHeight: 1.55 }}>{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertTriangle style={{ height: 15, width: 15, color: amber }} />
                      <p style={{ fontSize: 11, fontWeight: 600, color: ink, textTransform: "uppercase", letterSpacing: "0.12em" }}>Risk Factors</p>
                    </div>
                    <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
                      {mockCompanyAnalysis.risks.map((r, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <div style={{ height: 6, width: 6, borderRadius: "50%", background: amber, flexShrink: 0, marginTop: 5 }} />
                          <p style={{ fontSize: 13, color: muted, lineHeight: 1.55 }}>{r}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* market + position */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {[
                    { label: "Market Opportunity", value: mockCompanyAnalysis.marketSize,         icon: BarChart3 },
                    { label: "Competitive Position", value: mockCompanyAnalysis.competitivePosition, icon: Activity  },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 16, padding: "22px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <Icon style={{ height: 14, width: 14, color: muted }} />
                        <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</p>
                      </div>
                      <p style={{ fontSize: 14, color: ink, lineHeight: 1.55 }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── PREDICTIONS ───────────────────────────────────────── */}
            {activeTab === "predictions" && (
              <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, padding: "80px 40px", textAlign: "center" }}>
                <div style={{ height: 56, width: 56, borderRadius: 16, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <Zap style={{ height: 24, width: 24, color: muted }} />
                </div>
                <p style={{ fontSize: 16, fontWeight: 400, color: ink, marginBottom: 8 }}>Predictive Analytics Coming Soon</p>
                <p style={{ fontSize: 13, color: muted, lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>
                  Advanced forecasting models are being calibrated with your portfolio data.
                </p>
              </div>
            )}

            {/* ── COMPARABLES ───────────────────────────────────────── */}
            {activeTab === "comparables" && (
              <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, padding: "80px 40px", textAlign: "center" }}>
                <div style={{ height: 56, width: 56, borderRadius: 16, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <RefreshCw style={{ height: 24, width: 24, color: muted }} />
                </div>
                <p style={{ fontSize: 16, fontWeight: 400, color: ink, marginBottom: 8 }}>Comparable Analysis</p>
                <p style={{ fontSize: 13, color: muted, lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>
                  Benchmarking against similar companies in sector and stage is being set up.
                </p>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}
