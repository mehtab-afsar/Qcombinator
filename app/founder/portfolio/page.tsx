"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Download, FileText, Mail, Swords, BookOpen, Sparkles,
  DollarSign, Scale, Users, Search, Compass, BarChart3, Zap,
  TrendingUp, TrendingDown, Minus, Check, ExternalLink, Eye,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/useAuth";

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

// ─── artifact meta ────────────────────────────────────────────────────────────
const ARTIFACT_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  icp_document:       { icon: FileText,   label: "ICP Document",         color: blue       },
  outreach_sequence:  { icon: Mail,       label: "Outreach Sequence",    color: green      },
  battle_card:        { icon: Swords,     label: "Battle Card",          color: red        },
  gtm_playbook:       { icon: BookOpen,   label: "GTM Playbook",         color: amber      },
  sales_script:       { icon: Zap,        label: "Sales Script",         color: green      },
  brand_messaging:    { icon: Sparkles,   label: "Brand Messaging",      color: "#7C3AED"  },
  financial_summary:  { icon: DollarSign, label: "Financial Summary",    color: green      },
  legal_checklist:    { icon: Scale,      label: "Legal Checklist",      color: amber      },
  hiring_plan:        { icon: Users,      label: "Hiring Plan",          color: blue       },
  pmf_survey:         { icon: BarChart3,  label: "PMF Research Kit",     color: "#7C3AED"  },
  competitive_matrix: { icon: Search,     label: "Competitive Analysis", color: red        },
  strategic_plan:     { icon: Compass,    label: "Strategic Plan",       color: blue       },
};

const DIMENSION_META: Record<string, { label: string }> = {
  market:     { label: "Market"        },
  product:    { label: "Product"       },
  goToMarket: { label: "Go-to-Market"  },
  financial:  { label: "Financial"     },
  team:       { label: "Team"          },
  traction:   { label: "Traction"      },
};

function gradeLabel(s: number) {
  if (s >= 80) return "Strong";
  if (s >= 65) return "Good";
  if (s >= 50) return "Developing";
  return "Early Stage";
}

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins  = Math.floor(diff / 60000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

interface Artifact {
  id: string;
  artifact_type: string;
  title: string;
  agent_id: string;
  created_at: string;
}

interface Evidence {
  id: string;
  dimension: string;
  evidence_type: string;
  title: string;
  status: string;
  points_awarded: number;
  created_at: string;
}

interface ScoreDim {
  score: number;
  change: number;
  trend: "up" | "down" | "neutral";
}

interface ScoreData {
  overall: number;
  percentile: number;
  breakdown: Record<string, ScoreDim>;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const { user } = useAuth();
  const [loading,    setLoading]    = useState(true);
  const [score,      setScore]      = useState<ScoreData | null>(null);
  const [artifacts,  setArtifacts]  = useState<Artifact[]>([]);
  const [evidence,   setEvidence]   = useState<Evidence[]>([]);
  const [agentCount, setAgentCount] = useState(0);
  const [viewStats,  setViewStats]  = useState<{ total: number; last7: number } | null>(null);

  const displayName  = (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "Founder";
  const startupName  = (user?.user_metadata?.startup_name as string) || "Your Startup";
  const initials     = displayName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user: u } } = await supabase.auth.getUser();
        if (!u) { setLoading(false); return; }

        // Load latest Q-Score
        const res = await fetch("/api/qscore/latest");
        if (res.ok) {
          const data = await res.json();
          if (data.qScore) setScore({
            overall:    data.qScore.overall,
            percentile: data.qScore.percentile ?? 50,
            breakdown:  data.qScore.breakdown,
          });
        }

        // Load artifacts
        const { data: arts } = await supabase
          .from("agent_artifacts")
          .select("id, artifact_type, title, agent_id, created_at")
          .eq("user_id", u.id)
          .order("created_at", { ascending: false });
        if (arts) {
          setArtifacts(arts);
          setAgentCount(new Set(arts.map((a: Artifact) => a.agent_id)).size);
        }

        // Load verified evidence
        const { data: evData } = await supabase
          .from("score_evidence")
          .select("id, dimension, evidence_type, title, status, points_awarded, created_at")
          .eq("user_id", u.id)
          .eq("status", "verified")
          .order("created_at", { ascending: false });
        if (evData) setEvidence(evData);

        // Load portfolio view analytics
        const analyticsRes = await fetch(`/api/p/${u.id}/analytics`);
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setViewStats({ total: analyticsData.totalViews, last7: analyticsData.last7Days });
        }
      } catch { /* anonymous */ }
      finally { setLoading(false); }
    })();
  }, []);

  const [copied, setCopied] = useState(false);

  const handlePrint = () => window.print();

  const handleCopyLink = async () => {
    const publicUrl = `${window.location.origin}/p/${user?.id}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = publicUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const circumference = 2 * Math.PI * 44;
  const dash = score ? circumference * (1 - score.overall / 100) : circumference;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 13, color: muted }}>Loading portfolio…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink }}>

      {/* ── toolbar (hidden on print) ──────────────────────────────────────── */}
      <div className="no-print" style={{
        position: "sticky", top: 0, zIndex: 10,
        background: bg, borderBottom: `1px solid ${bdr}`,
        padding: "12px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link
          href="/founder/dashboard"
          replace
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: muted, textDecoration: "none" }}
        >
          <ArrowLeft size={13} />
          Dashboard
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <p style={{ fontSize: 11, color: muted }}>
            Share this page with investors or download as PDF
          </p>
          <button
            onClick={handleCopyLink}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", background: copied ? green : surf,
              color: copied ? "#fff" : ink,
              border: `1px solid ${copied ? green : bdr}`, borderRadius: 8,
              fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
            }}
          >
            {copied ? <Check size={12} /> : <ExternalLink size={12} />}
            {copied ? "Link copied!" : "Copy public link"}
          </button>
          <button
            onClick={handlePrint}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", background: ink, color: bg,
              border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <Download size={12} />
            Download PDF
          </button>
        </div>
      </div>

      {/* ── portfolio content ──────────────────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 28px 80px" }}>

        {/* ── header ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 36, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              height: 52, width: 52, borderRadius: 13, flexShrink: 0,
              background: ink, color: bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 700,
            }}>
              {initials}
            </div>
            <div>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 4 }}>
                Founder Portfolio
              </p>
              <h1 style={{ fontSize: "clamp(1.4rem,3vw,1.9rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink, marginBottom: 2 }}>
                {displayName}
              </h1>
              <p style={{ fontSize: 13, color: muted }}>{startupName}</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>AI Advisors Used</p>
              <p style={{ fontSize: 28, fontWeight: 300, color: ink, letterSpacing: "-0.03em", lineHeight: 1 }}>{agentCount}</p>
              <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>of 9</p>
            </div>
            <div style={{ width: 1, height: 40, background: bdr }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Deliverables</p>
              <p style={{ fontSize: 28, fontWeight: 300, color: ink, letterSpacing: "-0.03em", lineHeight: 1 }}>{artifacts.length}</p>
              <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>built</p>
            </div>
            <div style={{ width: 1, height: 40, background: bdr }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Proof Items</p>
              <p style={{ fontSize: 28, fontWeight: 300, color: ink, letterSpacing: "-0.03em", lineHeight: 1 }}>{evidence.length}</p>
              <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>verified</p>
            </div>
            {viewStats !== null && (
              <>
                <div style={{ width: 1, height: 40, background: bdr }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 4 }}>
                    <Eye size={10} color={muted} />
                    <p style={{ fontSize: 11, color: muted }}>Portfolio Views</p>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 300, color: ink, letterSpacing: "-0.03em", lineHeight: 1 }}>{viewStats.total}</p>
                  <p style={{ fontSize: 10, color: viewStats.last7 > 0 ? green : muted, marginTop: 2, fontWeight: viewStats.last7 > 0 ? 600 : 400 }}>
                    {viewStats.last7 > 0 ? `+${viewStats.last7} this week` : "no views yet"}
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* ── Q-Score card ───────────────────────────────────────────────── */}
        {score ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              background: ink, borderRadius: 20, padding: "28px 32px",
              marginBottom: 24, display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: 32, alignItems: "center",
            }}
          >
            {/* Score ring */}
            <div style={{ position: "relative", height: 100, width: 100 }}>
              <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                <motion.circle
                  cx="50" cy="50" r="44"
                  fill="none" stroke="#F9F7F2" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${circumference}`}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: dash }}
                  transition={{ duration: 1.4, delay: 0.3, ease: "easeOut" }}
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 30, fontWeight: 600, color: "#F9F7F2", lineHeight: 1 }}>{score.overall}</span>
                <span style={{ fontSize: 9, color: "rgba(249,247,242,0.5)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.12em" }}>Q-Score</span>
              </div>
            </div>

            {/* Dimension breakdown */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <p style={{ fontSize: 15, fontWeight: 500, color: "#F9F7F2" }}>{gradeLabel(score.overall)}</p>
                <span style={{ padding: "2px 10px", borderRadius: 999, background: "rgba(249,247,242,0.12)", fontSize: 11, color: "rgba(249,247,242,0.7)", fontWeight: 600 }}>
                  Top {100 - score.percentile}% of founders
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {Object.entries(score.breakdown).map(([key, dim]) => {
                  const meta  = DIMENSION_META[key];
                  const TIcon = dim.trend === "up" ? TrendingUp : dim.trend === "down" ? TrendingDown : Minus;
                  const tColor = dim.trend === "up" ? "#4ade80" : dim.trend === "down" ? "#f87171" : "rgba(249,247,242,0.4)";
                  return (
                    <div key={key}>
                      <p style={{ fontSize: 10, color: "rgba(249,247,242,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                        {meta?.label ?? key}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 18, fontWeight: 600, color: "#F9F7F2" }}>{dim.score}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <TIcon size={10} style={{ color: tColor }} />
                          {dim.change !== 0 && <span style={{ fontSize: 10, color: tColor, fontWeight: 600 }}>{dim.change > 0 ? "+" : ""}{dim.change}</span>}
                        </div>
                      </div>
                      <div style={{ height: 3, background: "rgba(255,255,255,0.12)", borderRadius: 999, marginTop: 4, overflow: "hidden" }}>
                        <motion.div
                          style={{ height: "100%", borderRadius: 999, background: "#F9F7F2" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${dim.score}%` }}
                          transition={{ delay: 0.5, duration: 0.7 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : (
          <div style={{ background: surf, borderRadius: 14, padding: "20px 24px", marginBottom: 24, border: `1px solid ${bdr}` }}>
            <p style={{ fontSize: 13, color: muted }}>Q-Score not yet calculated. Complete the assessment to display your score.</p>
            <Link href="/founder/assessment" style={{ fontSize: 12, color: blue, textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8 }}>
              Take assessment <ExternalLink size={11} />
            </Link>
          </div>
        )}

        {/* ── deliverables portfolio ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ marginBottom: 24 }}
        >
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 14 }}>
            Deliverables built with AI advisors ({artifacts.length})
          </p>
          {artifacts.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {artifacts.map((art, i) => {
                const meta = ARTIFACT_META[art.artifact_type];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={art.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.04 }}
                    style={{
                      background: bg, border: `1px solid ${bdr}`, borderRadius: 12,
                      padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12,
                    }}
                  >
                    <div style={{
                      height: 34, width: 34, borderRadius: 9, flexShrink: 0,
                      background: `${meta.color}14`, border: `1.5px solid ${meta.color}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={15} style={{ color: meta.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 2 }}>{art.title}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10, color: meta.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                          {meta.label}
                        </span>
                        <span style={{ fontSize: 10, color: muted }}>· {timeAgo(art.created_at)}</span>
                      </div>
                    </div>
                    <Check size={14} style={{ color: green, flexShrink: 0, marginTop: 2 }} />
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div style={{ background: surf, borderRadius: 12, padding: "20px 24px", border: `1px solid ${bdr}`, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: muted }}>No deliverables yet.</p>
              <Link href="/founder/agents" style={{ fontSize: 12, color: blue, textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8 }}>
                Start with AI advisors <ExternalLink size={11} />
              </Link>
            </div>
          )}
        </motion.div>

        {/* ── verified proof ─────────────────────────────────────────────── */}
        {evidence.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ marginBottom: 24 }}
          >
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 14 }}>
              Verified proof ({evidence.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {evidence.map((ev, i) => {
                const isAgent = ev.evidence_type === "agent_artifact";
                const dimLabel = DIMENSION_META[ev.dimension]?.label ?? ev.dimension;
                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.04 }}
                    style={{
                      background: isAgent ? "#EFF6FF" : bg,
                      border: `1px solid ${isAgent ? "#BFDBFE" : bdr}`,
                      borderRadius: 10, padding: "12px 16px",
                      display: "flex", alignItems: "center", gap: 12,
                    }}
                  >
                    <div style={{
                      height: 30, width: 30, borderRadius: 8, flexShrink: 0,
                      background: isAgent ? "#DBEAFE" : "#F0FDF4",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isAgent ? <Zap size={13} style={{ color: blue }} /> : <Check size={13} style={{ color: green }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 1 }}>{ev.title}</p>
                      <p style={{ fontSize: 10, color: muted }}>{dimLabel} dimension</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {ev.points_awarded > 0 && (
                        <p style={{ fontSize: 11, color: green, fontWeight: 700 }}>+{ev.points_awarded} pts</p>
                      )}
                      <p style={{ fontSize: 9, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 1 }}>Verified</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── footer ────────────────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 11, color: muted }}>
            Generated by Edge Alpha · {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
          <div className="no-print">
            <Link href="/founder/agents" style={{ fontSize: 11, color: blue, textDecoration: "none", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
              Continue building <ExternalLink size={10} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── print stylesheet ───────────────────────────────────────────────── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
