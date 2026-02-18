"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, ArrowUpRight, ArrowDownRight, ChevronRight, AlertCircle, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

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
interface PortfolioCompany {
  id: string;
  name: string;
  sector: string;
  stage: string;
  investedAmount: string;
  currentValuation: string;
  investmentDate: string;
  ownership: string;
  lastRound: string;
  health: "excellent" | "good" | "concern" | "critical";
  metrics: { revenue: string; growth: string; burnRate: string; runway: string };
  performance: { multiple: number; change: number };
  nextMilestone: string;
  lastUpdate: string;
}

// ─── mock data ────────────────────────────────────────────────────────────────
const mockPortfolio: PortfolioCompany[] = [
  {
    id: "1", name: "TechFlow AI", sector: "AI/ML", stage: "Series A",
    investedAmount: "$2M", currentValuation: "$50M",
    investmentDate: "Jan 2023", ownership: "8.5%", lastRound: "Series B ($15M)",
    health: "excellent",
    metrics: { revenue: "$2.1M ARR", growth: "+180% YoY", burnRate: "$150K/mo", runway: "24 months" },
    performance: { multiple: 3.2, change: 15 },
    nextMilestone: "Series B closing Q1 2024", lastUpdate: "2d ago"
  },
  {
    id: "2", name: "HealthTech Pro", sector: "Healthcare", stage: "Seed",
    investedAmount: "$500K", currentValuation: "$12M",
    investmentDate: "Jun 2023", ownership: "5.2%", lastRound: "Seed ($2M)",
    health: "good",
    metrics: { revenue: "$450K ARR", growth: "+240% YoY", burnRate: "$80K/mo", runway: "18 months" },
    performance: { multiple: 1.8, change: 8 },
    nextMilestone: "FDA approval process", lastUpdate: "5d ago"
  },
  {
    id: "3", name: "FinanceOS", sector: "Fintech", stage: "Series A",
    investedAmount: "$3M", currentValuation: "$65M",
    investmentDate: "Mar 2022", ownership: "12%", lastRound: "Series A ($8M)",
    health: "excellent",
    metrics: { revenue: "$3.5M ARR", growth: "+150% YoY", burnRate: "$200K/mo", runway: "30 months" },
    performance: { multiple: 4.1, change: 22 },
    nextMilestone: "Profitability Q2 2024", lastUpdate: "1d ago"
  },
  {
    id: "4", name: "DataHub Analytics", sector: "SaaS", stage: "Seed",
    investedAmount: "$750K", currentValuation: "$15M",
    investmentDate: "Aug 2023", ownership: "6.8%", lastRound: "Seed ($3M)",
    health: "concern",
    metrics: { revenue: "$890K ARR", growth: "+210% YoY", burnRate: "$180K/mo", runway: "12 months" },
    performance: { multiple: 1.4, change: -5 },
    nextMilestone: "Series A fundraise", lastUpdate: "1w ago"
  },
  {
    id: "5", name: "SecureCloud", sector: "Cybersecurity", stage: "Series A",
    investedAmount: "$2.5M", currentValuation: "$55M",
    investmentDate: "Nov 2022", ownership: "9.2%", lastRound: "Series A ($6M)",
    health: "good",
    metrics: { revenue: "$2.8M ARR", growth: "+190% YoY", burnRate: "$170K/mo", runway: "22 months" },
    performance: { multiple: 2.7, change: 12 },
    nextMilestone: "Enterprise expansion", lastUpdate: "3d ago"
  }
];

function healthStyle(h: PortfolioCompany["health"]) {
  if (h === "excellent") return { color: green, bg: "#F0FDF4", label: "Excellent", Icon: CheckCircle }
  if (h === "good")      return { color: blue,  bg: "#EFF6FF", label: "Good",      Icon: CheckCircle }
  if (h === "concern")   return { color: amber, bg: "#FFFBEB", label: "Concern",   Icon: AlertCircle }
  return                        { color: red,   bg: "#FEF2F2", label: "Critical",  Icon: AlertCircle }
}

function parseMoney(s: string) {
  const n = parseFloat(s.replace(/[$MK]/g, ""));
  return s.includes("M") ? n * 1_000_000 : n * 1_000;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "excellent" | "attention">("all");

  const totalInvested = mockPortfolio.reduce((s, c) => s + parseMoney(c.investedAmount), 0);
  const totalValue    = mockPortfolio.reduce((s, c) => {
    const own = parseFloat(c.ownership) / 100;
    return s + parseMoney(c.currentValuation) * own;
  }, 0);
  const totalROI  = ((totalValue - totalInvested) / totalInvested) * 100;
  const avgMultiple = mockPortfolio.reduce((s, c) => s + c.performance.multiple, 0) / mockPortfolio.length;

  const filtered = mockPortfolio.filter(c => {
    if (activeTab === "excellent") return c.health === "excellent";
    if (activeTab === "attention") return c.health === "concern" || c.health === "critical";
    return true;
  });

  const tabs = [
    { key: "all"       as const, label: `All (${mockPortfolio.length})` },
    { key: "excellent" as const, label: `Top Performers (${mockPortfolio.filter(c => c.health === "excellent").length})` },
    { key: "attention" as const, label: `Needs Attention (${mockPortfolio.filter(c => c.health === "concern" || c.health === "critical").length})` },
  ];

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, padding: "40px 24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 8 }}>
            Portfolio
          </p>
          <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.4rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink, marginBottom: 6 }}>
            Your investments.
          </h1>
          <p style={{ fontSize: 14, color: muted }}>Track performance and manage your portfolio companies.</p>
        </div>

        {/* stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: bdr, border: `1px solid ${bdr}`, borderRadius: 12, overflow: "hidden", marginBottom: 32 }}>
          {[
            { label: "Total Invested",  value: `$${(totalInvested / 1_000_000).toFixed(1)}M`,   accent: ink,   sub: `${mockPortfolio.length} companies` },
            { label: "Current Value",   value: `$${(totalValue    / 1_000_000).toFixed(1)}M`,   accent: green, sub: `+${totalROI.toFixed(0)}% ROI` },
            { label: "Avg Multiple",    value: `${avgMultiple.toFixed(1)}x`,                     accent: blue,  sub: "Across portfolio" },
            { label: "Active Deals",    value: `${mockPortfolio.length}`,                        accent: amber, sub: `${mockPortfolio.filter(c => c.health === "excellent" || c.health === "good").length} performing well` },
          ].map((s, i) => (
            <div key={i} style={{ background: bg, padding: "20px 20px" }}>
              <p style={{ fontSize: 11, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{s.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: s.accent, marginBottom: 2 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: muted }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${bdr}`, marginBottom: 0 }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: "10px 16px", fontSize: 12, fontWeight: 500, color: activeTab === tab.key ? ink : muted, background: "transparent", border: "none", cursor: "pointer", borderBottom: activeTab === tab.key ? `2px solid ${ink}` : "2px solid transparent", transition: "color .15s", fontFamily: "inherit" }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* table header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 100px 100px 90px 80px 44px", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${bdr}` }}>
          {["Company", "Invested", "Valuation", "Revenue", "Runway", "Multiple", ""].map((h, i) => (
            <p key={i} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: muted, fontWeight: 600 }}>{h}</p>
          ))}
        </div>

        {/* rows */}
        <div style={{ border: `1px solid ${bdr}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
          {filtered.map((company, i) => {
            const hs = healthStyle(company.health);
            const HIcon = hs.Icon;
            const initials = company.name.split(" ").map(n => n[0]).join("").slice(0, 2);
            return (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${bdr}` : "none", background: bg }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = surf}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = bg}
              >
                <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 100px 100px 90px 80px 44px", gap: 8, padding: "14px 16px", alignItems: "center" }}>

                  {/* company */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ height: 38, width: 38, borderRadius: 9, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: ink, flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{company.name}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                        <HIcon style={{ height: 10, width: 10, color: hs.color }} />
                        <span style={{ fontSize: 11, color: hs.color }}>{hs.label}</span>
                        <span style={{ fontSize: 11, color: muted }}>· {company.sector} · Since {company.investmentDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* invested */}
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{company.investedAmount}</p>
                    <p style={{ fontSize: 11, color: muted }}>{company.ownership} stake</p>
                  </div>

                  {/* valuation */}
                  <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{company.currentValuation}</p>

                  {/* revenue */}
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: ink }}>{company.metrics.revenue}</p>
                    <p style={{ fontSize: 11, color: green }}>{company.metrics.growth}</p>
                  </div>

                  {/* runway */}
                  <p style={{ fontSize: 12, color: parseFloat(company.metrics.runway) <= 12 ? amber : muted }}>{company.metrics.runway}</p>

                  {/* multiple */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: company.performance.multiple >= 3 ? green : ink }}>{company.performance.multiple}x</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      {company.performance.change > 0 ? (
                        <ArrowUpRight style={{ height: 11, width: 11, color: green }} />
                      ) : (
                        <ArrowDownRight style={{ height: 11, width: 11, color: red }} />
                      )}
                      <span style={{ fontSize: 10, color: company.performance.change > 0 ? green : red }}>
                        {Math.abs(company.performance.change)}%
                      </span>
                    </div>
                  </div>

                  {/* arrow */}
                  <button onClick={() => router.push(`/investor/startup/${company.id}`)} style={{ height: 32, width: 32, display: "flex", alignItems: "center", justifyContent: "center", background: surf, border: `1px solid ${bdr}`, borderRadius: 8, cursor: "pointer" }}>
                    <ChevronRight style={{ height: 13, width: 13, color: muted }} />
                  </button>
                </div>

                {/* milestone row */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 16px 12px 76px" }}>
                  <TrendingUp style={{ height: 11, width: 11, color: muted }} />
                  <p style={{ fontSize: 12, color: muted }}>Next: {company.nextMilestone}</p>
                  <span style={{ fontSize: 12, color: muted, opacity: 0.5 }}>· Updated {company.lastUpdate}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <p style={{ marginTop: 48, fontSize: 11, color: muted, opacity: 0.5, textAlign: "center" }}>
          {filtered.length} companies · Portfolio analytics v1.0
        </p>
      </div>
    </div>
  );
}
