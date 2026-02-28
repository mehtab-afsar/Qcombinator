"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ExternalLink, FileText, Mail, Swords, BookOpen,
  DollarSign, Scale, Users, Search, Compass, BarChart3, Zap,
  Sparkles, CheckCircle, Globe, MapPin, Calendar,
  TrendingUp, TrendingDown, Minus,
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

// ─── artifact meta ────────────────────────────────────────────────────────────
const ARTIFACT_META: Record<string, { icon: React.ElementType; color: string }> = {
  icp_document:       { icon: FileText,   color: blue       },
  outreach_sequence:  { icon: Mail,       color: green      },
  battle_card:        { icon: Swords,     color: red        },
  gtm_playbook:       { icon: BookOpen,   color: amber      },
  sales_script:       { icon: Zap,        color: green      },
  brand_messaging:    { icon: Sparkles,   color: "#7C3AED"  },
  financial_summary:  { icon: DollarSign, color: green      },
  legal_checklist:    { icon: Scale,      color: amber      },
  hiring_plan:        { icon: Users,      color: blue       },
  pmf_survey:         { icon: BarChart3,  color: "#7C3AED"  },
  competitive_matrix: { icon: Search,     color: red        },
  strategic_plan:     { icon: Compass,    color: blue       },
};

const DIM_LABELS: Record<string, string> = {
  market:     "Market",
  product:    "Product",
  goToMarket: "Go-to-Market",
  financial:  "Financial",
  team:       "Team",
  traction:   "Traction",
};

function scoreColor(s: number) {
  if (s >= 70) return green;
  if (s >= 50) return amber;
  return red;
}

function TrendIcon({ score }: { score: number }) {
  if (score >= 70) return <TrendingUp style={{ height: 12, width: 12, color: green }} />;
  if (score >= 40) return <Minus style={{ height: 12, width: 12, color: amber }} />;
  return <TrendingDown style={{ height: 12, width: 12, color: red }} />;
}

function gradeLabel(s: number) {
  if (s >= 85) return "Exceptional";
  if (s >= 70) return "Strong";
  if (s >= 55) return "Good";
  if (s >= 40) return "Developing";
  return "Early Stage";
}

interface StartupProfile {
  about: string | null;
  solution: string | null;
  moat: string | null;
  whyNow: string | null;
  tamSize: string | null;
  businessModel: string | null;
  raisingAmount: string | null;
  advisors: string[];
  keyHires: string[];
}

interface PortfolioData {
  founder: {
    name: string;
    startupName: string;
    tagline: string;
    industry: string;
    stage: string;
    location: string;
    websiteUrl: string | null;
    linkedinUrl: string | null;
    foundedYear: number | null;
    teamSize: number | null;
  };
  qScore: {
    overall: number;
    percentile: number | null;
    grade: string;
    breakdown: Record<string, number>;
    calculatedAt: string;
  } | null;
  deliverables: {
    type: string;
    label: string;
    title: string;
    createdAt: string;
  }[];
  verifiedEvidenceCount: number;
  startupProfile: StartupProfile | null;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function PublicPortfolio() {
  const params = useParams();
  const userId = params?.userId as string;

  const [data,    setData]    = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/p/${userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load portfolio"))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ height: 40, width: 40, borderRadius: 10, background: blue, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 9 }}>EA</span>
          </div>
          <p style={{ color: muted, fontSize: 13 }}>Loading portfolio…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 360, padding: "0 24px" }}>
          <div style={{ height: 40, width: 40, borderRadius: 10, background: ink, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 9 }}>EA</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 300, color: ink, marginBottom: 8 }}>Portfolio not found</h1>
          <p style={{ color: muted, fontSize: 13, marginBottom: 24 }}>This founder hasn&apos;t published their portfolio yet, or the link may have changed.</p>
          <Link href="/" style={{ fontSize: 13, color: blue, textDecoration: "none" }}>← Back to Edge Alpha</Link>
        </div>
      </div>
    );
  }

  const { founder, qScore, deliverables, verifiedEvidenceCount, startupProfile } = data;
  const circumference = 2 * Math.PI * 52;
  const overall = qScore?.overall ?? 0;
  const strokeDash = circumference * (1 - overall / 100);
  const ringColor = scoreColor(overall);
  const initials = founder.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, fontFamily: "inherit" }}>

      {/* ── nav ───────────────────────────────────────────────────────── */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: bg, borderBottom: `1px solid ${bdr}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ height: 28, width: 28, borderRadius: 7, background: blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 8 }}>EA</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>Edge Alpha</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ padding: "4px 10px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 11, color: muted }}>
            Founder Portfolio
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* ── hero ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: "flex", alignItems: "flex-start", gap: 24, marginBottom: 40, flexWrap: "wrap" }}
        >
          {/* avatar */}
          <div style={{
            height: 64, width: 64, borderRadius: 16, background: ink, color: bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "clamp(1.4rem,3vw,1.8rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink, margin: 0 }}>
                {founder.startupName || founder.name}
              </h1>
              {founder.stage && (
                <span style={{ padding: "2px 10px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 11, color: muted, fontWeight: 500 }}>
                  {founder.stage}
                </span>
              )}
              {founder.industry && (
                <span style={{ padding: "2px 10px", background: "#EFF6FF", border: `1px solid #BFDBFE`, borderRadius: 999, fontSize: 11, color: blue, fontWeight: 500 }}>
                  {founder.industry}
                </span>
              )}
            </div>

            {founder.tagline && (
              <p style={{ fontSize: 15, color: ink, lineHeight: 1.6, marginBottom: 10, opacity: 0.8 }}>
                {founder.tagline}
              </p>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: muted }}>
                Built by <strong style={{ color: ink }}>{founder.name}</strong>
              </span>
              {founder.location && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: muted }}>
                  <MapPin style={{ height: 11, width: 11 }} /> {founder.location}
                </span>
              )}
              {founder.foundedYear && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: muted }}>
                  <Calendar style={{ height: 11, width: 11 }} /> Founded {founder.foundedYear}
                </span>
              )}
              {founder.teamSize && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: muted }}>
                  <Users style={{ height: 11, width: 11 }} /> {founder.teamSize} person{founder.teamSize !== 1 ? "s" : ""}
                </span>
              )}
              {founder.websiteUrl && (
                <a href={founder.websiteUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: blue, textDecoration: "none" }}>
                  <Globe style={{ height: 11, width: 11 }} /> Website <ExternalLink style={{ height: 9, width: 9 }} />
                </a>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── main grid ───────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.6fr)", gap: 20, alignItems: "start" }}>

          {/* ── left: Q-Score ring ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 16, padding: 28, textAlign: "center" }}
          >
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 20 }}>Q-Score</p>

            {qScore ? (
              <>
                {/* ring */}
                <div style={{ position: "relative", height: 140, width: 140, margin: "0 auto 16px" }}>
                  <svg style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke={bdr} strokeWidth="8" />
                    <motion.circle
                      cx="60" cy="60" r="52"
                      fill="none" stroke={ringColor} strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset: strokeDash }}
                      transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                    />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 38, fontWeight: 600, color: ink, fontVariantNumeric: "tabular-nums" }}>{overall}</span>
                    <span style={{ fontSize: 10, color: muted }}>/ 100</span>
                  </div>
                </div>

                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 14px", borderRadius: 999, border: `1px solid ${bdr}`,
                  background: bg, fontSize: 12, fontWeight: 600, color: ringColor, marginBottom: 16,
                }}>
                  {gradeLabel(overall)}
                </div>

                {qScore.percentile != null && (
                  <p style={{ fontSize: 12, color: muted, marginBottom: 8 }}>
                    Top <strong style={{ color: ink }}>{100 - qScore.percentile}%</strong> of founders on the platform
                  </p>
                )}

                <p style={{ fontSize: 11, color: muted, opacity: 0.7 }}>
                  Updated {new Date(qScore.calculatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </>
            ) : (
              <div style={{ padding: "24px 0", color: muted, fontSize: 13 }}>
                Assessment in progress
              </div>
            )}
          </motion.div>

          {/* ── right: dimension bars ──────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 16, padding: 24 }}
          >
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 18 }}>Score Breakdown</p>

            {qScore?.breakdown ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {Object.entries(qScore.breakdown).map(([dim, score], i) => {
                  const col = scoreColor(score);
                  const pct = score;
                  return (
                    <motion.div key={dim}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.06 }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <TrendIcon score={score} />
                          <span style={{ fontSize: 12, fontWeight: 500, color: ink }}>{DIM_LABELS[dim] ?? dim}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: col, fontVariantNumeric: "tabular-nums" }}>{score}</span>
                      </div>
                      <div style={{ height: 4, background: bdr, borderRadius: 999, overflow: "hidden" }}>
                        <motion.div
                          style={{ height: "100%", background: col, borderRadius: 999 }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.3 + i * 0.06, duration: 0.7, ease: "easeOut" }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: muted, fontSize: 13 }}>Q-Score assessment not yet completed.</p>
            )}
          </motion.div>
        </div>

        {/* ── stats row ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 20 }}
        >
          {[
            { label: "AI Deliverables", value: String(deliverables.length), sublabel: "completed" },
            { label: "Verified Evidence", value: String(verifiedEvidenceCount), sublabel: "proof points" },
            { label: "Q-Score Grade", value: qScore?.grade ?? "—", sublabel: gradeLabel(overall) },
          ].map(stat => (
            <div key={stat.label} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
              <p style={{ fontSize: 22, fontWeight: 600, color: ink, marginBottom: 2 }}>{stat.value}</p>
              <p style={{ fontSize: 11, color: muted }}>{stat.label}</p>
              <p style={{ fontSize: 10, color: muted, opacity: 0.6 }}>{stat.sublabel}</p>
            </div>
          ))}
        </motion.div>

        {/* ── about section ─────────────────────────────────────────────── */}
        {startupProfile && (startupProfile.about || startupProfile.solution || startupProfile.tamSize) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            style={{ marginTop: 28 }}
          >
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 14 }}>
              About
            </p>
            <div style={{ display: "grid", gridTemplateColumns: startupProfile.solution ? "1fr 1fr" : "1fr", gap: 12 }}>

              {/* Problem */}
              {startupProfile.about && (
                <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "20px 20px" }}>
                  <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, fontWeight: 600, marginBottom: 8 }}>
                    Problem
                  </p>
                  <p style={{ fontSize: 13, color: ink, lineHeight: 1.7 }}>{startupProfile.about}</p>
                </div>
              )}

              {/* Solution */}
              {startupProfile.solution && (
                <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "20px 20px" }}>
                  <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, fontWeight: 600, marginBottom: 8 }}>
                    Solution
                  </p>
                  <p style={{ fontSize: 13, color: ink, lineHeight: 1.7 }}>{startupProfile.solution}</p>
                </div>
              )}
            </div>

            {/* Market / Moat / Why Now row */}
            {(startupProfile.tamSize || startupProfile.moat || startupProfile.whyNow || startupProfile.businessModel || startupProfile.raisingAmount) && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginTop: 10 }}>
                {startupProfile.tamSize && (
                  <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px" }}>
                    <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 4 }}>Market Size</p>
                    <p style={{ fontSize: 13, color: ink, fontWeight: 500 }}>{startupProfile.tamSize}</p>
                  </div>
                )}
                {startupProfile.businessModel && (
                  <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px" }}>
                    <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 4 }}>Business Model</p>
                    <p style={{ fontSize: 13, color: ink, fontWeight: 500 }}>{startupProfile.businessModel}</p>
                  </div>
                )}
                {startupProfile.raisingAmount && (
                  <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px" }}>
                    <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 4 }}>Raising</p>
                    <p style={{ fontSize: 13, color: ink, fontWeight: 500 }}>{startupProfile.raisingAmount}</p>
                  </div>
                )}
                {startupProfile.moat && (
                  <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px" }}>
                    <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 4 }}>Defensibility</p>
                    <p style={{ fontSize: 13, color: ink, fontWeight: 500, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>{startupProfile.moat}</p>
                  </div>
                )}
                {startupProfile.whyNow && (
                  <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px" }}>
                    <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 4 }}>Why Now</p>
                    <p style={{ fontSize: 13, color: ink, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>{startupProfile.whyNow}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── deliverables ──────────────────────────────────────────────── */}
        {deliverables.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            style={{ marginTop: 28 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600 }}>
                AI-Generated Deliverables
              </p>
              <span style={{ fontSize: 11, color: muted }}>{deliverables.length} of 12</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {deliverables.map((d, i) => {
                const meta = ARTIFACT_META[d.type];
                const Icon = meta?.icon ?? FileText;
                return (
                  <motion.div key={d.type}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.04 }}
                    style={{
                      background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "14px 16px",
                      display: "flex", alignItems: "flex-start", gap: 10,
                    }}
                  >
                    <div style={{
                      height: 30, width: 30, borderRadius: 8, flexShrink: 0,
                      background: bg, border: `1px solid ${bdr}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon style={{ height: 13, width: 13, color: meta?.color ?? muted }} />
                    </div>
                    <div style={{ overflow: "hidden" }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.label}</p>
                      <p style={{ fontSize: 11, color: muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.title}</p>
                    </div>
                    <CheckCircle style={{ height: 12, width: 12, color: green, flexShrink: 0, marginLeft: "auto", marginTop: 2 }} />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ marginTop: 40, padding: "32px 36px", background: ink, borderRadius: 20, textAlign: "center" }}
        >
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "#8A867C", fontWeight: 600, marginBottom: 10 }}>
            Interested in connecting?
          </p>
          <h2 style={{ fontSize: "clamp(1.2rem,2.5vw,1.6rem)", fontWeight: 300, letterSpacing: "-0.03em", color: "#F9F7F2", marginBottom: 8 }}>
            Meet {founder.name} on Edge Alpha
          </h2>
          <p style={{ fontSize: 14, color: "#8A867C", marginBottom: 28, lineHeight: 1.6, maxWidth: 480, margin: "0 auto 28px" }}>
            Edge Alpha verifies founder quality via AI assessment before introducing them to investors. {founder.name}&apos;s Q-Score of <strong style={{ color: "#F9F7F2" }}>{overall}</strong> puts them in the top tier.
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/investor/onboarding"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "#F9F7F2", color: ink,
                fontWeight: 600, padding: "12px 28px", borderRadius: 999,
                fontSize: 14, textDecoration: "none", transition: "opacity .15s",
              }}
            >
              Sign up as an investor
            </Link>
            <Link
              href="/login"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "transparent", color: "#8A867C",
                fontWeight: 500, padding: "12px 28px", borderRadius: 999,
                fontSize: 14, textDecoration: "none", border: "1px solid #2A2820",
              }}
            >
              Already have an account?
            </Link>
          </div>
        </motion.div>

        {/* ── footer ────────────────────────────────────────────────────── */}
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <p style={{ fontSize: 11, color: muted, opacity: 0.6 }}>
            Powered by{" "}
            <Link href="/" style={{ color: blue, textDecoration: "none", fontWeight: 500 }}>Edge Alpha</Link>
            {" "}· The OS for fundable founders
          </p>
        </div>
      </div>
    </div>
  );
}
