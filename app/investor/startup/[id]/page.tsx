"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Heart,
  Share2,
  MessageCircle,
  Download,
  FileText,
  CheckCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  Users,
  BarChart3,
  ChevronRight,
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
  documents:  "Documents",
  analysis:   "AI Analysis",
};

// ─── mock startup data ────────────────────────────────────────────────────────
const mockStartup = {
  name: "TechFlow AI",
  tagline: "AI-powered workflow automation for enterprise teams",
  description: "TechFlow AI revolutionizes enterprise productivity by automating complex workflows using advanced AI. Our platform integrates seamlessly with existing tools and can reduce manual work by up to 70% while improving accuracy and compliance.",
  website: "https://techflow.ai",
  founded: "2022",
  location: "San Francisco, CA",
  stage: "Series A",
  sector: "AI / ML",
  qScore: 847,
  matchScore: 94,

  founder: {
    name: "Sarah Chen",
    title: "CEO & Co-founder",
    background: "Ex-Google AI Research, Stanford CS PhD",
    previousExperience: [
      "Lead AI Researcher at Google (3 years)",
      "Senior ML Engineer at DeepMind (2 years)",
      "PhD in Computer Science, Stanford",
    ],
  },

  team: {
    size: 12,
    keyMembers: [
      { name: "David Kim",     role: "CTO & Co-founder",  background: "Ex-Uber Engineering, MIT"        },
      { name: "Maria Rodriguez", role: "VP of Sales",     background: "Ex-Salesforce, 8 years enterprise sales" },
      { name: "Alex Thompson", role: "Head of Product",   background: "Ex-Figma, Stanford MBA"          },
    ],
  },

  financials: {
    revenue:     "$2.1M ARR",
    growth:      "+180% YoY",
    runway:      "18 months",
    burnRate:    "$85K / month",
    customers:   47,
    cac:         "$2,400",
    ltv:         "$24,000",
    grossMargin: "85%",
  },

  funding: {
    totalRaised:  "$3.2M",
    currentRound: "Series A",
    seeking:      "$5M",
    valuation:    "$25M pre-money",
    investors:    ["Andreessen Horowitz", "First Round Capital", "Y Combinator"],
    useOfFunds: [
      { category: "Engineering & Product", percentage: 60 },
      { category: "Sales & Marketing",     percentage: 25 },
      { category: "Operations",            percentage: 10 },
      { category: "Working Capital",       percentage: 5  },
    ],
  },

  traction: {
    highlights: [
      "$2.1M ARR with 180% YoY growth",
      "47 enterprise customers including Fortune 500 companies",
      "95% customer retention rate",
      "Average 70% reduction in manual work for customers",
    ],
    milestones: [
      { date: "Jan 2024",  description: "Reached $2M ARR milestone",          type: "revenue"     as const },
      { date: "Dec 2023",  description: "Launched AI Workflow Builder 2.0",   type: "product"     as const },
      { date: "Nov 2023",  description: "Partnership with Microsoft Azure",   type: "partnership" as const },
      { date: "Oct 2023",  description: "Hired VP of Sales from Salesforce",  type: "team"        as const },
    ],
  },

  market: {
    size:   "$12.8B TAM",
    growth: "23% CAGR",
    competition: [
      { name: "Zapier",               description: "Workflow automation platform",     funding: "$140M raised"       },
      { name: "UiPath",               description: "RPA and automation platform",      funding: "Public company"      },
      { name: "Automation Anywhere",  description: "Enterprise automation platform",   funding: "$840M raised"       },
    ],
  },

  documents: [
    { name: "Pitch Deck – Series A",  type: "PDF",  size: "12.4 MB", lastUpdated: "Jan 15, 2024" },
    { name: "Financial Model",        type: "XLSX", size: "2.8 MB",  lastUpdated: "Jan 10, 2024" },
    { name: "Product Demo Video",     type: "MP4",  size: "45.2 MB", lastUpdated: "Jan 8, 2024"  },
    { name: "Customer References",    type: "PDF",  size: "1.2 MB",  lastUpdated: "Jan 5, 2024"  },
  ],

  aiAnalysis: {
    strengths: [
      "Strong technical team with AI expertise from top companies",
      "Impressive revenue growth (180% YoY) with healthy unit economics",
      "Large addressable market with clear differentiation",
      "High customer retention and proven product-market fit",
    ],
    risks: [
      "Competitive market with well-funded incumbents",
      "Dependency on key founders for technical vision",
      "Need to scale sales team for enterprise market",
      "Regulatory risks in AI automation space",
    ],
    recommendations: [
      "Strong investment opportunity with proven traction",
      "Consider co-investing with existing top-tier VCs",
      "Due diligence focus on technical moat and scalability",
      "Negotiate board seat given the growth stage",
    ],
  },
};

const qScoreBreakdown = [
  { category: "Team",       score: 92, weight: "30%" },
  { category: "Market",     score: 85, weight: "25%" },
  { category: "Traction",   score: 88, weight: "20%" },
  { category: "Product",    score: 90, weight: "15%" },
  { category: "Financials", score: 82, weight: "10%" },
];

const milestoneColors: Record<string, string> = {
  revenue:     green,
  product:     blue,
  partnership: amber,
  team:        "#7C3AED",
};

// ─── helper ───────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 70) return blue;
  if (s >= 50) return amber;
  return red;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function StartupDeepDive({ params: _params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [saved, setSaved] = useState(false);
  const s = mockStartup;

  // Q-Score ring
  const circumference = 2 * Math.PI * 36;
  const dash = circumference * (1 - s.qScore / 1000);

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink }}>

      {/* ── sticky header ─────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "rgba(249,247,242,0.92)", backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${bdr}`,
        padding: "0 28px",
      }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>

          {/* left: back + startup name */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/investor/deal-flow" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: muted, textDecoration: "none", fontWeight: 500 }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = ink)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = muted)}
            >
              <ArrowLeft style={{ height: 13, width: 13 }} />
              Pipeline
            </Link>
            <div style={{ height: 16, width: 1, background: bdr }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* logo placeholder */}
              <div style={{ height: 32, width: 32, borderRadius: 8, background: ink, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: bg }}>TF</span>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: ink, lineHeight: 1.1 }}>{s.name}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 10, padding: "1px 7px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, color: muted }}>{s.stage}</span>
                  <span style={{ fontSize: 10, padding: "1px 7px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, color: muted }}>{s.sector}</span>
                  <span style={{ fontSize: 10, color: muted, display: "flex", alignItems: "center", gap: 3 }}>
                    <MapPin style={{ height: 9, width: 9 }} />{s.location}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* right: scores + actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 20, fontWeight: 600, color: blue, lineHeight: 1 }}>{s.qScore}</p>
              <p style={{ fontSize: 9, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>Q-Score</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 20, fontWeight: 600, color: green, lineHeight: 1 }}>{s.matchScore}%</p>
              <p style={{ fontSize: 9, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>Match</p>
            </div>
            <div style={{ height: 28, width: 1, background: bdr }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setSaved((v) => !v)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: "pointer",
                  background: saved ? ink : surf,
                  color: saved ? bg : ink,
                  border: `1px solid ${saved ? ink : bdr}`,
                  transition: "all 0.15s",
                }}
              >
                <Heart style={{ height: 12, width: 12, fill: saved ? "currentColor" : "none" }} />
                {saved ? "Saved" : "Save"}
              </button>
              <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: "pointer", background: surf, color: ink, border: `1px solid ${bdr}`, transition: "border-color 0.15s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = ink)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = bdr)}
              >
                <Share2 style={{ height: 12, width: 12 }} /> Share
              </button>
              <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: "pointer", background: ink, color: bg, border: `1px solid ${ink}`, transition: "opacity 0.15s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.82")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
              >
                <MessageCircle style={{ height: 12, width: 12 }} /> Connect
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── content ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 28px 72px" }}>

        {/* tagline */}
        <p style={{ fontSize: 14, color: muted, marginBottom: 24, fontWeight: 300, lineHeight: 1.5 }}>{s.tagline}</p>

        {/* tab bar */}
        <div style={{ display: "flex", gap: 2, padding: "4px", background: surf, border: `1px solid ${bdr}`, borderRadius: 12, marginBottom: 28, width: "fit-content", flexWrap: "wrap" }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 16px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer",
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

        {/* tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >

            {/* ── OVERVIEW ──────────────────────────────────────────── */}
            {activeTab === "overview" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                  {/* description card */}
                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Company Overview</p>
                    </div>
                    <div style={{ padding: "20px 22px" }}>
                      <p style={{ fontSize: 14, color: ink, lineHeight: 1.7, marginBottom: 20 }}>{s.description}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {[
                          { label: "Founded", value: s.founded },
                          { label: "Team size", value: `${s.team.size} people` },
                          { label: "Stage", value: s.stage },
                          { label: "Website", value: s.website, isLink: true },
                        ].map(({ label, value, isLink }) => (
                          <div key={label}>
                            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, fontWeight: 600, marginBottom: 3 }}>{label}</p>
                            {isLink ? (
                              <a href={value} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: blue, textDecoration: "none" }}>{value}</a>
                            ) : (
                              <p style={{ fontSize: 13, color: ink, fontWeight: 500 }}>{value}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* key metrics */}
                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Key Metrics</p>
                    </div>
                    <div style={{ padding: "20px 22px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                      {[
                        { label: "Annual Revenue", value: s.financials.revenue, color: blue   },
                        { label: "YoY Growth",     value: s.financials.growth,  color: green  },
                        { label: "Customers",      value: String(s.financials.customers), color: ink },
                        { label: "Gross Margin",   value: s.financials.grossMargin, color: amber },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ textAlign: "center", padding: "16px 12px", background: surf, border: `1px solid ${bdr}`, borderRadius: 14 }}>
                          <p style={{ fontSize: 20, fontWeight: 300, color, letterSpacing: "-0.02em", marginBottom: 4 }}>{value}</p>
                          <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* traction highlights */}
                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Traction Highlights</p>
                    </div>
                    <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
                      {s.traction.highlights.map((h, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <CheckCircle style={{ height: 15, width: 15, color: green, flexShrink: 0, marginTop: 1 }} />
                          <p style={{ fontSize: 13, color: muted, lineHeight: 1.5 }}>{h}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* right sidebar */}
                <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "sticky", top: 88 }}>

                  {/* Q-Score breakdown */}
                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", borderBottom: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Q-Score Breakdown</p>
                    </div>
                    <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 13 }}>
                      {qScoreBreakdown.map((item, i) => (
                        <motion.div key={item.category}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <span style={{ fontSize: 12, color: ink, fontWeight: 500 }}>{item.category}</span>
                            <span style={{ fontSize: 11, color: muted }}>{item.score}/100</span>
                          </div>
                          <div style={{ height: 4, background: surf, border: `1px solid ${bdr}`, borderRadius: 999, overflow: "hidden" }}>
                            <motion.div
                              style={{ height: "100%", borderRadius: 999, background: scoreColor(item.score) }}
                              initial={{ width: 0 }}
                              animate={{ width: `${item.score}%` }}
                              transition={{ delay: 0.2 + i * 0.06, duration: 0.6, ease: "easeOut" }}
                            />
                          </div>
                          <p style={{ fontSize: 9, color: muted, marginTop: 2 }}>Weight: {item.weight}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* funding details */}
                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", borderBottom: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Funding Details</p>
                    </div>
                    <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                      {[
                        { label: "Current Round", value: s.funding.currentRound },
                        { label: "Seeking",       value: s.funding.seeking      },
                        { label: "Valuation",     value: s.funding.valuation    },
                        { label: "Total Raised",  value: s.funding.totalRaised  },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>{label}</p>
                          <p style={{ fontSize: 13, fontWeight: 500, color: ink }}>{value}</p>
                        </div>
                      ))}
                      <div>
                        <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Previous Investors</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {s.funding.investors.map((inv) => (
                            <span key={inv} style={{ fontSize: 10, padding: "3px 9px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, color: muted }}>{inv}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── FINANCIALS ────────────────────────────────────────── */}
            {activeTab === "financials" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {/* Revenue metrics */}
                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Revenue Metrics</p>
                    </div>
                    <div style={{ padding: "22px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                      {[
                        { label: "ARR",         value: s.financials.revenue,   color: blue   },
                        { label: "Growth Rate", value: s.financials.growth,    color: green  },
                        { label: "CAC",         value: s.financials.cac,       color: ink    },
                        { label: "LTV",         value: s.financials.ltv,       color: ink    },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ padding: "14px 16px", background: surf, border: `1px solid ${bdr}`, borderRadius: 12 }}>
                          <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</p>
                          <p style={{ fontSize: 18, fontWeight: 300, color, letterSpacing: "-0.02em" }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Burn & Runway */}
                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Burn &amp; Runway</p>
                    </div>
                    <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: 16 }}>
                      {[
                        { label: "Monthly Burn Rate", value: s.financials.burnRate,    color: red   },
                        { label: "Runway",             value: s.financials.runway,      color: green },
                        { label: "Gross Margin",       value: s.financials.grossMargin, color: green },
                        { label: "Customers",          value: String(s.financials.customers), color: blue },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottom: `1px solid ${bdr}` }}>
                          <p style={{ fontSize: 13, color: muted }}>{label}</p>
                          <p style={{ fontSize: 16, fontWeight: 500, color }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Use of funds */}
                <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                  <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Use of Funds</p>
                  </div>
                  <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: 14 }}>
                    {s.funding.useOfFunds.map((item, i) => (
                      <div key={item.category}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, color: ink }}>{item.category}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>{item.percentage}%</span>
                        </div>
                        <div style={{ height: 5, background: surf, border: `1px solid ${bdr}`, borderRadius: 999, overflow: "hidden" }}>
                          <motion.div
                            style={{ height: "100%", borderRadius: 999, background: [blue, green, amber, muted][i % 4] }}
                            initial={{ width: 0 }}
                            animate={{ width: `${item.percentage}%` }}
                            transition={{ delay: 0.1 + i * 0.07, duration: 0.7, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TEAM ──────────────────────────────────────────────── */}
            {activeTab === "team" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Founder */}
                  <div style={{ background: bg, border: `2px solid ${blue}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ height: 6, width: 6, borderRadius: "50%", background: blue }} />
                      <p style={{ fontSize: 11, fontWeight: 600, color: blue, textTransform: "uppercase", letterSpacing: "0.14em" }}>Founder</p>
                    </div>
                    <div style={{ padding: "22px", display: "flex", gap: 16 }}>
                      <div style={{ height: 56, width: 56, borderRadius: 14, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, color: ink, flexShrink: 0 }}>
                        {s.founder.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 15, fontWeight: 600, color: ink }}>{s.founder.name}</p>
                        <p style={{ fontSize: 12, color: blue, fontWeight: 500, marginTop: 2 }}>{s.founder.title}</p>
                        <p style={{ fontSize: 12, color: muted, marginTop: 4 }}>{s.founder.background}</p>
                        <div style={{ marginTop: 12 }}>
                          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, fontWeight: 600, marginBottom: 6 }}>Experience</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            {s.founder.previousExperience.map((exp, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                <div style={{ height: 4, width: 4, borderRadius: "50%", background: muted, flexShrink: 0, marginTop: 5 }} />
                                <p style={{ fontSize: 12, color: muted }}>{exp}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key members */}
                  {s.team.keyMembers.map((member, i) => (
                    <div key={i} style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 16, padding: "18px 22px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ height: 44, width: 44, borderRadius: 12, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: ink, flexShrink: 0 }}>
                        {member.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: ink }}>{member.name}</p>
                        <p style={{ fontSize: 12, color: muted, marginTop: 2 }}>{member.role}</p>
                        <p style={{ fontSize: 11, color: muted, marginTop: 3 }}>{member.background}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Team overview sidebar */}
                <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden", height: "fit-content" }}>
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Team Overview</p>
                  </div>
                  <div style={{ padding: "20px" }}>
                    <p style={{ fontSize: 32, fontWeight: 300, color: ink, letterSpacing: "-0.03em" }}>{s.team.size}</p>
                    <p style={{ fontSize: 11, color: muted, marginBottom: 20 }}>Total team members</p>
                    <div style={{ height: 1, background: bdr, marginBottom: 16 }} />
                    <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, fontWeight: 600, marginBottom: 12 }}>By Department</p>
                    {[
                      { dept: "Engineering", count: 7, pct: 58 },
                      { dept: "Sales & Marketing", count: 3, pct: 25 },
                      { dept: "Operations", count: 2, pct: 17 },
                    ].map(({ dept, count, pct }) => (
                      <div key={dept} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 12, color: ink }}>{dept}</span>
                          <span style={{ fontSize: 11, color: muted }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ height: 4, background: surf, border: `1px solid ${bdr}`, borderRadius: 999, overflow: "hidden" }}>
                          <motion.div style={{ height: "100%", borderRadius: 999, background: blue }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── MARKET ────────────────────────────────────────────── */}
            {activeTab === "market" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, padding: "28px 28px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <BarChart3 style={{ height: 16, width: 16, color: muted }} />
                      <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Market Opportunity</p>
                    </div>
                    <p style={{ fontSize: 36, fontWeight: 300, color: blue, letterSpacing: "-0.04em", marginBottom: 6 }}>{s.market.size}</p>
                    <p style={{ fontSize: 13, color: muted }}>Total Addressable Market</p>
                    <div style={{ height: 1, background: bdr, margin: "20px 0" }} />
                    <p style={{ fontSize: 24, fontWeight: 300, color: green, letterSpacing: "-0.03em", marginBottom: 4 }}>{s.market.growth}</p>
                    <p style={{ fontSize: 13, color: muted }}>Market Growth Rate</p>
                  </div>

                  <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Competitive Landscape</p>
                    </div>
                    <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
                      {s.market.competition.map((comp, i) => (
                        <div key={i} style={{ padding: "14px 16px", background: surf, border: `1px solid ${bdr}`, borderRadius: 12 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 3 }}>{comp.name}</p>
                          <p style={{ fontSize: 12, color: muted, marginBottom: 3 }}>{comp.description}</p>
                          <p style={{ fontSize: 10, color: muted }}>{comp.funding}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* milestones */}
                <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                  <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Key Milestones</p>
                  </div>
                  <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: 0 }}>
                    {s.traction.milestones.map((m, i) => (
                      <div key={i} style={{ display: "flex", gap: 16, paddingBottom: i < s.traction.milestones.length - 1 ? 16 : 0, marginBottom: i < s.traction.milestones.length - 1 ? 16 : 0, borderBottom: i < s.traction.milestones.length - 1 ? `1px solid ${bdr}` : "none" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ height: 10, width: 10, borderRadius: "50%", background: milestoneColors[m.type], flexShrink: 0 }} />
                          {i < s.traction.milestones.length - 1 && <div style={{ flex: 1, width: 1, background: bdr, marginTop: 4 }} />}
                        </div>
                        <div>
                          <p style={{ fontSize: 10, color: muted, marginBottom: 2 }}>{m.date}</p>
                          <p style={{ fontSize: 13, color: ink }}>{m.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── DOCUMENTS ─────────────────────────────────────────── */}
            {activeTab === "documents" && (
              <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                <div style={{ padding: "16px 22px", borderBottom: `1px solid ${bdr}` }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>Available Documents</p>
                </div>
                <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {s.documents.map((doc, i) => (
                    <div key={i}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: surf, border: `1px solid ${bdr}`, borderRadius: 12, transition: "border-color 0.15s" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#C8C3BB")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = bdr)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ height: 36, width: 36, borderRadius: 9, background: bg, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <FileText style={{ height: 15, width: 15, color: muted }} />
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: ink }}>{doc.name}</p>
                          <p style={{ fontSize: 11, color: muted }}>{doc.type} · {doc.size} · Updated {doc.lastUpdated}</p>
                        </div>
                      </div>
                      <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: bg, border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 11, fontWeight: 500, color: ink, cursor: "pointer", transition: "border-color 0.15s" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = ink)}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = bdr)}
                      >
                        <Download style={{ height: 11, width: 11 }} /> Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── AI ANALYSIS ───────────────────────────────────────── */}
            {activeTab === "analysis" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
                {[
                  { label: "Strengths",       items: s.aiAnalysis.strengths,       icon: CheckCircle,   color: green, bg: "#ECFDF5", border: "#86EFAC" },
                  { label: "Risks",           items: s.aiAnalysis.risks,           icon: AlertTriangle, color: amber, bg: "#FFFBEB", border: "#FDE68A" },
                  { label: "Recommendations", items: s.aiAnalysis.recommendations, icon: Info,          color: blue,  bg: "#EFF6FF", border: "#93C5FD" },
                ].map(({ label, items, icon: Icon, color, bg: cardBg, border: cardBorder }, col) => (
                  <div key={label} style={{ background, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ height: 28, width: 28, borderRadius: 8, background: cardBg, border: `1px solid ${cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon style={{ height: 13, width: 13, color }} />
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: ink, textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</p>
                    </div>
                    <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                      {items.map((item, i) => (
                        <motion.div key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: col * 0.1 + i * 0.06 }}
                          style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
                        >
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
    </div>
  );
}
