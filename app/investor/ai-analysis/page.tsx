"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, TrendingUp, AlertTriangle,
  Target, Sparkles, ChevronRight, Zap, BarChart3, Activity, RefreshCw,
} from "lucide-react";

const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";
const amber = "#D97706";
const red   = "#DC2626";

type InsightType = "opportunity" | "risk" | "trend" | "recommendation";
type Impact      = "high" | "medium" | "low";

interface AIInsight {
  id: string; type: InsightType; title: string; description: string;
  confidence: number; impact: Impact; category: string; timestamp: string;
}
interface TopFounder {
  id: string; name: string; founder: string; sector: string; stage: string;
  qScore: number; teamScore: number; marketScore: number; productScore: number; financialScore: number; tractionScore: number;
}
interface Stats {
  totalFounders: number; avgQScore: number; highQCount: number;
  acceptedConnections: number; pendingConnections: number; uniqueSectors: number;
}
interface SectorEntry { sector: string; count: number }

const TABS = ["insights", "deep-dive", "predictions"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  insights: "AI Insights", "deep-dive": "Deal Flow", predictions: "Sector View",
};

function insightMeta(type: InsightType) {
  switch (type) {
    case "opportunity":    return { icon: Target,        color: green,     label: "Opportunity",    bg: "#ECFDF5", border: "#86EFAC" };
    case "risk":           return { icon: AlertTriangle, color: amber,     label: "Risk Alert",     bg: "#FFFBEB", border: "#FDE68A" };
    case "trend":          return { icon: TrendingUp,    color: blue,      label: "Trend",          bg: "#EFF6FF", border: "#93C5FD" };
    case "recommendation": return { icon: Sparkles,      color: "#7C3AED", label: "Recommendation", bg: "#F5F3FF", border: "#C4B5FD" };
  }
}

function qColor(n: number) {
  return n >= 75 ? green : n >= 55 ? amber : red;
}

export default function AIAnalysisPage() {
  const [activeTab,   setActiveTab]   = useState<Tab>("insights");
  const [insights,    setInsights]    = useState<AIInsight[]>([]);
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [topFounders, setTopFounders] = useState<TopFounder[]>([]);
  const [sectorData,  setSectorData]  = useState<SectorEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/investor/ai-analysis");
      const d = await res.json();
      if (res.ok) {
        setInsights(d.insights ?? []);
        setStats(d.stats ?? null);
        setTopFounders(d.topFounders ?? []);
        setSectorData(d.sectorBreakdown ?? []);
        setLastRefresh(new Date());
      }
    } catch { /* non-critical */ } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const counts = {
    opportunity:    insights.filter(i => i.type === "opportunity").length,
    risk:           insights.filter(i => i.type === "risk").length,
    trend:          insights.filter(i => i.type === "trend").length,
    recommendation: insights.filter(i => i.type === "recommendation").length,
  };

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, padding: "36px 28px 72px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: muted, fontWeight: 600, marginBottom: 5 }}>AI Intelligence Hub</p>
            <h1 style={{ fontSize: "clamp(1.5rem,3.5vw,2.1rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink }}>Deep insights, live.</h1>
            <p style={{ fontSize: 11, color: muted, marginTop: 4 }}>Last refreshed {lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
          </div>
          <button onClick={load} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", background: ink, border: `1px solid ${ink}`, borderRadius: 999, fontSize: 12, color: bg, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
            <RefreshCw style={{ height: 12, width: 12 }} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 12, marginBottom: 28 }}>
            {[
              { label: "Founders in Pipeline",  value: stats.totalFounders,         color: ink },
              { label: "Avg Q-Score",            value: stats.avgQScore,             color: qColor(stats.avgQScore) },
              { label: "High Signal (70+)",       value: stats.highQCount,            color: green },
              { label: "Active Connections",      value: stats.acceptedConnections,   color: blue },
              { label: "Pending Responses",       value: stats.pendingConnections,    color: stats.pendingConnections > 3 ? amber : muted },
              { label: "Sectors Represented",     value: stats.uniqueSectors,         color: ink },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 14, padding: "16px 18px" }}>
                <p style={{ fontSize: 28, fontWeight: 300, color: s.color, letterSpacing: "-0.04em", lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 5 }}>{s.label}</p>
              </motion.div>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
          {(["opportunity", "risk", "trend", "recommendation"] as InsightType[]).map((type, i) => {
            const meta = insightMeta(type);
            const Icon = meta.icon;
            return (
              <motion.div key={type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, padding: "20px 22px" }}>
                <div style={{ height: 36, width: 36, borderRadius: 10, background: meta.bg, border: `1px solid ${meta.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Icon style={{ height: 16, width: 16, color: meta.color }} />
                </div>
                <p style={{ fontSize: 30, fontWeight: 300, color: ink, letterSpacing: "-0.04em", lineHeight: 1 }}>{loading ? "—" : counts[type]}</p>
                <p style={{ fontSize: 11, color: muted, marginTop: 5 }}>{meta.label}{counts[type] !== 1 ? "s" : ""}</p>
              </motion.div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 2, padding: "4px", background: surf, border: `1px solid ${bdr}`, borderRadius: 12, marginBottom: 24, width: "fit-content" }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: "8px 18px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: activeTab === tab ? bg : "transparent", color: activeTab === tab ? ink : muted, boxShadow: activeTab === tab ? "0 1px 4px rgba(24,22,15,0.08)" : "none" }}>
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>

            {activeTab === "insights" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {loading && (
                  <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${bdr}`, padding: "40px", textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: muted }}>Generating insights from deal flow…</p>
                  </div>
                )}
                {!loading && insights.length === 0 && (
                  <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${bdr}`, padding: "60px 40px", textAlign: "center" }}>
                    <div style={{ height: 48, width: 48, borderRadius: 12, background: surf, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                      <Brain style={{ height: 20, width: 20, color: muted }} />
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: ink, marginBottom: 6 }}>No insights yet</p>
                    <p style={{ fontSize: 12, color: muted }}>Insights generate automatically as founders join and improve their Q-Scores.</p>
                  </div>
                )}
                {insights.map((insight, i) => {
                  const meta = insightMeta(insight.type);
                  const Icon = meta.icon;
                  return (
                    <motion.div key={insight.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, padding: "22px 24px", display: "flex", gap: 18, alignItems: "flex-start" }}>
                      <div style={{ height: 40, width: 40, borderRadius: 12, background: meta.bg, border: `1px solid ${meta.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon style={{ height: 17, width: 17, color: meta.color }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7, flexWrap: "wrap" }}>
                          <p style={{ fontSize: 14, fontWeight: 500, color: ink }}>{insight.title}</p>
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, color: insight.impact === "high" ? red : insight.impact === "medium" ? amber : muted, background: insight.impact === "high" ? "#FEF2F2" : insight.impact === "medium" ? "#FFFBEB" : surf, border: `1px solid ${insight.impact === "high" ? "#FECACA" : insight.impact === "medium" ? "#FDE68A" : bdr}` }}>
                            {insight.impact} impact
                          </span>
                          <span style={{ fontSize: 10, padding: "2px 9px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, color: muted }}>{insight.category}</span>
                        </div>
                        <p style={{ fontSize: 13, color: muted, lineHeight: 1.6, marginBottom: 12 }}>{insight.description}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 11, color: muted }}>Confidence</span>
                          <div style={{ width: 96, height: 4, background: surf, borderRadius: 999, overflow: "hidden", border: `1px solid ${bdr}` }}>
                            <motion.div style={{ height: "100%", borderRadius: 999, background: meta.color }} initial={{ width: 0 }} animate={{ width: `${insight.confidence}%` }} transition={{ delay: 0.3 + i * 0.06, duration: 0.6 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{insight.confidence}%</span>
                          <span style={{ fontSize: 11, color: muted, marginLeft: "auto" }}>{insight.timestamp}</span>
                        </div>
                      </div>
                      <button style={{ height: 32, width: 32, borderRadius: 8, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                        <ChevronRight style={{ height: 14, width: 14, color: muted }} />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {activeTab === "deep-dive" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: ink, borderRadius: 18, padding: "24px 28px" }}>
                  <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(249,247,242,0.45)", fontWeight: 600, marginBottom: 6 }}>Top Signal</p>
                  <h2 style={{ fontSize: 20, fontWeight: 300, color: "#F9F7F2", letterSpacing: "-0.02em" }}>Highest Q-Score Founders</h2>
                </div>
                {loading && <p style={{ fontSize: 13, color: muted, textAlign: "center", padding: "32px 0" }}>Loading deal flow…</p>}
                {!loading && topFounders.length === 0 && (
                  <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${bdr}`, padding: "48px", textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: muted }}>No founders with Q-Score data yet.</p>
                  </div>
                )}
                {topFounders.map((f, i) => (
                  <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>{f.name.charAt(0)}</p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>{f.name}</p>
                      <p style={{ fontSize: 11, color: muted }}>{f.founder && `${f.founder} · `}{f.sector}{f.stage && ` · ${f.stage}`}</p>
                    </div>
                    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                      {[{ label: "Team", score: f.teamScore }, { label: "Market", score: f.marketScore }, { label: "Product", score: f.productScore }, { label: "Financial", score: f.financialScore }, { label: "Traction", score: f.tractionScore }].map(d => (
                        <div key={d.label} style={{ textAlign: "center" }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: qColor(d.score) }}>{d.score}</p>
                          <p style={{ fontSize: 9, color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{d.label}</p>
                        </div>
                      ))}
                      <div style={{ width: 1, height: 32, background: bdr }} />
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: 20, fontWeight: 700, color: qColor(f.qScore), lineHeight: 1 }}>{f.qScore}</p>
                        <p style={{ fontSize: 9, color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Q-Score</p>
                      </div>
                    </div>
                    <a href={`/investor/startup/${f.id}`} style={{ padding: "7px 16px", borderRadius: 8, background: ink, color: "#F9F7F2", fontSize: 11, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>View →</a>
                  </motion.div>
                ))}
              </div>
            )}

            {activeTab === "predictions" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 16, padding: "24px 28px" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, marginBottom: 16 }}>Deal Flow by Sector</p>
                  {loading && <p style={{ fontSize: 13, color: muted }}>Loading…</p>}
                  {!loading && sectorData.length === 0 && <p style={{ fontSize: 13, color: muted }}>No sector data available yet.</p>}
                  {sectorData.map((s, i) => {
                    const pct = Math.round((s.count / (sectorData[0]?.count ?? 1)) * 100);
                    return (
                      <div key={s.sector} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <p style={{ fontSize: 13, color: ink, fontWeight: i === 0 ? 600 : 400 }}>{s.sector}</p>
                          <p style={{ fontSize: 12, color: muted }}>{s.count} founder{s.count !== 1 ? "s" : ""}</p>
                        </div>
                        <div style={{ height: 6, background: surf, borderRadius: 99, overflow: "hidden", border: `1px solid ${bdr}` }}>
                          <motion.div style={{ height: "100%", background: i === 0 ? blue : i === 1 ? green : muted, borderRadius: 99 }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.1, duration: 0.6 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {stats && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 16, padding: "22px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <BarChart3 style={{ height: 14, width: 14, color: muted }} />
                        <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Pipeline Quality</p>
                      </div>
                      <p style={{ fontSize: 32, fontWeight: 300, color: qColor(stats.avgQScore), letterSpacing: "-0.04em", lineHeight: 1 }}>{stats.avgQScore}</p>
                      <p style={{ fontSize: 12, color: muted, marginTop: 4 }}>Average Q-Score across {stats.totalFounders} founders</p>
                    </div>
                    <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 16, padding: "22px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <Activity style={{ height: 14, width: 14, color: muted }} />
                        <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>High-Signal Founders</p>
                      </div>
                      <p style={{ fontSize: 32, fontWeight: 300, color: green, letterSpacing: "-0.04em", lineHeight: 1 }}>{stats.highQCount}</p>
                      <p style={{ fontSize: 12, color: muted, marginTop: 4 }}>Founders with Q-Score 70+ (strong signal)</p>
                    </div>
                  </div>
                )}

                <div style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 16, padding: "24px 28px", textAlign: "center" }}>
                  <div style={{ height: 48, width: 48, borderRadius: 12, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <Zap style={{ height: 20, width: 20, color: muted }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 400, color: ink, marginBottom: 8 }}>Predictive Analytics Coming Soon</p>
                  <p style={{ fontSize: 13, color: muted, lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>Advanced forecasting models will project which founders are most likely to raise in the next 90 days.</p>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}
