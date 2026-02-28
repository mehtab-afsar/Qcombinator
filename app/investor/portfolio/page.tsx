"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, ArrowUpRight, ChevronRight, AlertCircle, CheckCircle, RefreshCw, Users } from "lucide-react";
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
interface Company {
  id: string;
  name: string;
  sector: string;
  stage: string;
  founderName: string;
  description: string;
  qScore: number;
  qScoreBreakdown: { team: number; market: number; traction: number; gtm: number; product: number };
  health: "excellent" | "good" | "concern" | "critical";
  connectedAt: string;
  metrics: { revenue: string; growth: string; burnRate: string; runway: string };
}

function healthStyle(h: Company["health"]) {
  if (h === "excellent") return { color: green, bg: "#F0FDF4", label: "Strong",   Icon: CheckCircle }
  if (h === "good")      return { color: blue,  bg: "#EFF6FF", label: "Good",     Icon: CheckCircle }
  if (h === "concern")   return { color: amber, bg: "#FFFBEB", label: "Watch",    Icon: AlertCircle }
  return                        { color: red,   bg: "#FEF2F2", label: "Critical", Icon: AlertCircle }
}

function relativeDate(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime();
  const days  = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30)  return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "excellent" | "attention">("all");
  const [companies, setCompanies]  = useState<Company[]>([]);
  const [loading,   setLoading]    = useState(true);
  const [expanded,  setExpanded]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/investor/portfolio")
      .then(r => r.json())
      .then(d => { if (d.companies) setCompanies(d.companies); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = companies.filter(c => {
    if (activeTab === "excellent") return c.health === "excellent" || c.health === "good";
    if (activeTab === "attention") return c.health === "concern" || c.health === "critical";
    return true;
  });

  const tabs = [
    { key: "all"       as const, label: `All (${companies.length})` },
    { key: "excellent" as const, label: `Strong (${companies.filter(c => c.health === "excellent" || c.health === "good").length})` },
    { key: "attention" as const, label: `Watch (${companies.filter(c => c.health === "concern" || c.health === "critical").length})` },
  ];

  // Derived stats
  const avgQScore   = companies.length ? Math.round(companies.reduce((s, c) => s + c.qScore, 0) / companies.length) : 0;
  const strongCount = companies.filter(c => c.qScore >= 60).length;
  const watchCount  = companies.filter(c => c.health === "concern" || c.health === "critical").length;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <RefreshCw style={{ height: 20, width: 20, color: muted, margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: 13, color: muted }}>Loading portfolio…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, padding: "40px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* ── header ── */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 8 }}>
            Investor · Portfolio
          </p>
          <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.4rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink, marginBottom: 6 }}>
            Your connections.
          </h1>
          <p style={{ fontSize: 14, color: muted }}>Founders you&apos;ve connected with on Edge Alpha.</p>
        </div>

        {/* ── stats strip ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: bdr, border: `1px solid ${bdr}`, borderRadius: 12, overflow: "hidden", marginBottom: 32 }}>
          {[
            { label: "Connections",  value: companies.length.toString(), accent: ink,   sub: "Total connected" },
            { label: "Avg Q-Score",  value: avgQScore ? `${avgQScore}` : "—",           accent: blue,  sub: "Portfolio average" },
            { label: "High Q-Score", value: strongCount.toString(),                     accent: green, sub: "Scoring 60+" },
            { label: "Watching",     value: watchCount.toString(),                      accent: amber, sub: "Need attention" },
          ].map((s, i) => (
            <div key={i} style={{ background: bg, padding: "20px" }}>
              <p style={{ fontSize: 11, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{s.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: s.accent, marginBottom: 2 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: muted }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── empty state ── */}
        {companies.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 24px", border: `1px dashed ${bdr}`, borderRadius: 16 }}>
            <Users style={{ height: 36, width: 36, color: muted, margin: "0 auto 16px" }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: ink, marginBottom: 6 }}>No connections yet</p>
            <p style={{ fontSize: 13, color: muted, marginBottom: 20 }}>
              Accept connection requests from founders in your deal flow to build your portfolio here.
            </p>
            <button
              onClick={() => router.push("/investor/dashboard")}
              style={{ padding: "10px 22px", borderRadius: 999, border: "none", background: ink, color: bg, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
            >
              Go to Deal Flow
            </button>
          </div>
        )}

        {companies.length > 0 && (
          <>
            {/* ── tabs ── */}
            <div style={{ display: "flex", borderBottom: `1px solid ${bdr}`, marginBottom: 0 }}>
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{ padding: "10px 16px", fontSize: 12, fontWeight: 500, color: activeTab === tab.key ? ink : muted, background: "transparent", border: "none", cursor: "pointer", borderBottom: activeTab === tab.key ? `2px solid ${ink}` : "2px solid transparent", transition: "color .15s", fontFamily: "inherit" }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── table header ── */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 90px 90px 44px", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${bdr}` }}>
              {["Company", "Q-Score", "Stage", "Connected", ""].map((h, i) => (
                <p key={i} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: muted, fontWeight: 600 }}>{h}</p>
              ))}
            </div>

            {/* ── rows ── */}
            <div style={{ border: `1px solid ${bdr}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
              {filtered.length === 0 && (
                <p style={{ padding: "24px", fontSize: 13, color: muted, textAlign: "center" }}>No companies in this filter.</p>
              )}
              {filtered.map((company, i) => {
                const hs       = healthStyle(company.health);
                const HIcon    = hs.Icon;
                const initials = company.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                const isOpen   = expanded === company.id;

                return (
                  <motion.div
                    key={company.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${bdr}` : "none", background: isOpen ? surf : bg }}
                    onMouseEnter={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = surf; }}
                    onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = bg; }}
                  >
                    {/* main row */}
                    <div
                      style={{ display: "grid", gridTemplateColumns: "2fr 80px 90px 90px 44px", gap: 8, padding: "14px 16px", alignItems: "center", cursor: "pointer" }}
                      onClick={() => setExpanded(isOpen ? null : company.id)}
                    >
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
                            <span style={{ fontSize: 11, color: muted }}>· {company.sector} · {company.founderName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Q-Score */}
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: company.qScore >= 60 ? green : company.qScore >= 40 ? amber : red }}>{company.qScore || "—"}</p>
                        <p style={{ fontSize: 10, color: muted }}>/ 100</p>
                      </div>

                      {/* stage */}
                      <p style={{ fontSize: 12, color: ink }}>{company.stage}</p>

                      {/* connected */}
                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <TrendingUp style={{ height: 11, width: 11, color: muted }} />
                        <p style={{ fontSize: 11, color: muted }}>{relativeDate(company.connectedAt)}</p>
                      </div>

                      {/* arrow */}
                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/investor/startup/${company.id}`); }}
                        style={{ height: 32, width: 32, display: "flex", alignItems: "center", justifyContent: "center", background: surf, border: `1px solid ${bdr}`, borderRadius: 8, cursor: "pointer" }}
                      >
                        <ChevronRight style={{ height: 13, width: 13, color: muted }} />
                      </button>
                    </div>

                    {/* expanded details */}
                    {isOpen && (
                      <div style={{ padding: "0 16px 16px 68px", borderTop: `1px solid ${bdr}` }}>
                        {company.description && (
                          <p style={{ fontSize: 12, color: muted, lineHeight: 1.6, marginTop: 12, marginBottom: 14 }}>
                            {company.description}
                          </p>
                        )}

                        {/* Metrics row */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
                          {[
                            { label: "Revenue",   value: company.metrics.revenue },
                            { label: "Growth",    value: company.metrics.growth },
                            { label: "Burn Rate", value: company.metrics.burnRate },
                            { label: "Runway",    value: company.metrics.runway },
                          ].map((m, mi) => (
                            <div key={mi} style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 8, padding: "10px 12px" }}>
                              <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{m.label}</p>
                              <p style={{ fontSize: 14, fontWeight: 600, color: m.value === "—" ? muted : ink }}>{m.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Q-Score breakdown pills */}
                        <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: muted, marginBottom: 8 }}>Q-Score Breakdown</p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                          {Object.entries(company.qScoreBreakdown).map(([dim, score]) => (
                            <div key={dim} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999, background: bg, border: `1px solid ${bdr}` }}>
                              <p style={{ fontSize: 11, color: muted, textTransform: "capitalize" }}>{dim}</p>
                              <p style={{ fontSize: 12, fontWeight: 700, color: score >= 60 ? green : score >= 40 ? amber : red }}>{score}</p>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => router.push(`/investor/startup/${company.id}`)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                        >
                          Full profile <ArrowUpRight style={{ height: 12, width: 12 }} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        <p style={{ marginTop: 48, fontSize: 11, color: muted, opacity: 0.5, textAlign: "center" }}>
          {companies.length} founder{companies.length !== 1 ? "s" : ""} · Edge Alpha Portfolio
        </p>
      </div>
    </div>
  );
}
