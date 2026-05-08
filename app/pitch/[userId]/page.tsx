"use client";

/**
 * /pitch/:userId  —  Investor-facing shareable pitch profile
 *
 * Public page — no auth required. Investors land here from a founder-shared link.
 * Pulls from: founder_profiles + qscore_history + agent_artifacts.
 */

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ExternalLink, MapPin, Users, Globe, DollarSign, BarChart3,
  TrendingUp, Target, Zap, ArrowRight, CheckCircle, Copy, Check,
  Flame, Shield, Compass, MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { bg, surf, bdr, ink, muted, blue, green, amber, red } from "@/lib/constants/colors";

// ─── types ────────────────────────────────────────────────────────────────────
interface QScoreBreakdown {
  label: string;
  score: number;
  weight: number;
}

interface PitchData {
  profile: {
    companyName: string;
    founderName: string;
    tagline: string;
    sector: string;
    stage: string;
    website: string;
    location: string;
    teamSize: string;
    fundingGoal: string;
    description: string;
    avatarUrl: string | null;
    companyLogoUrl: string | null;
    solution: string;
    whyNow: string;
    moat: string;
    tamSize: string;
    businessModel: string;
  };
  qscore: {
    score: number;
    percentile: number;
    grade: string;
    calculatedAt: string;
    breakdown: QScoreBreakdown[];
  } | null;
  artifacts: Record<string, {
    title: string;
    content: Record<string, unknown>;
    created_at: string;
  }>;
  generatedAt: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 70) return green;
  if (s >= 50) return amber;
  return red;
}

function gradeLabel(s: number) {
  if (s >= 85) return "Exceptional";
  if (s >= 70) return "Strong";
  if (s >= 55) return "Good";
  if (s >= 40) return "Developing";
  return "Early Stage";
}

function stageLabel(raw: string) {
  const map: Record<string, string> = {
    idea: "Idea", mvp: "MVP", launched: "Seed", scaling: "Series A",
    "pre-seed": "Pre-Seed", seed: "Seed", "series-a": "Series A",
    "series-b": "Series B", bootstrapped: "Bootstrapped",
  };
  return map[raw] ?? raw;
}

function extractStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return "";
}

// Render the compact text from an artifact field
function ArtifactText({ text, fallback }: { text: string; fallback?: string }) {
  const val = text || fallback || "";
  if (!val) return null;
  return (
    <p style={{ fontSize: 14, color: ink, lineHeight: 1.65, opacity: 0.85, margin: 0 }}>
      {val}
    </p>
  );
}

// Mini score bar
function ScoreBar({ label, score, weight }: { label: string; score: number; weight: number }) {
  const color = scoreColor(score);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: muted, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{score}</span>
      </div>
      <div style={{ height: 4, background: `${color}22`, borderRadius: 2, overflow: "hidden" }}>
        <div
          style={{
            height: "100%", width: `${score}%`, background: color,
            borderRadius: 2, transition: "width 1s ease-out",
          }}
        />
      </div>
      <div style={{ fontSize: 9, color: muted, marginTop: 2, textAlign: "right" }}>{weight}% weight</div>
    </div>
  );
}

// Section wrapper card
function Section({
  title,
  icon: Icon,
  color = blue,
  children,
}: {
  title: string;
  icon: React.ElementType;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        background: surf, border: `1px solid ${bdr}`, borderRadius: 16,
        padding: "24px 28px", marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{
          height: 28, width: 28, borderRadius: 8,
          background: `${color}18`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon style={{ height: 14, width: 14, color }} />
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.15em", color: muted,
        }}>
          {title}
        </span>
      </div>
      {children}
    </motion.div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function PitchProfile() {
  const params = useParams();
  const userId = params?.userId as string;

  const [data,    setData]    = useState<PitchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/pitch/${userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d as PitchData);
      })
      .catch(() => setError("Failed to load pitch profile"))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, []);

  // ── loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            height: 40, width: 40, borderRadius: 10, background: blue,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
          }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 9 }}>EA</span>
          </div>
          <p style={{ color: muted, fontSize: 13 }}>Loading pitch profile…</p>
        </div>
      </div>
    );
  }

  // ── error / not found ────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div style={{
        minHeight: "100vh", background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center", maxWidth: 360, padding: "0 24px" }}>
          <div style={{
            height: 40, width: 40, borderRadius: 10, background: ink,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
          }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 9 }}>EA</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 300, color: ink, marginBottom: 8 }}>
            Pitch profile not found
          </h1>
          <p style={{ color: muted, fontSize: 13, marginBottom: 24 }}>
            This founder hasn&apos;t published their pitch yet, or the link may have expired.
          </p>
          <Link href="/" style={{ fontSize: 13, color: blue, textDecoration: "none" }}>
            ← Back to Edge Alpha
          </Link>
        </div>
      </div>
    );
  }

  const { profile, qscore, artifacts } = data;

  // Compute ring animation values
  const circumference = 2 * Math.PI * 52;
  const score = qscore?.score ?? 0;
  const dash  = circumference * (1 - score / 100);
  const ringColor = scoreColor(score);

  // Extract artifact content with fallbacks
  const icp = artifacts.icp_document?.content ?? {};
  const pos = artifacts.positioning_messaging?.content ?? {};
  const fin = artifacts.financial_summary?.content ?? {};
  const strat = artifacts.strategic_plan?.content ?? {};
  const gtm  = artifacts.gtm_playbook?.content ?? {};

  const icpText = extractStr(icp as Record<string, unknown>, [
    "icpSummary", "primaryPersona", "targetCustomer", "idealCustomer", "summary",
  ]);
  const posText = extractStr(pos as Record<string, unknown>, [
    "statement", "valueProposition", "positioningStatement", "core",
  ]) || extractStr((pos as Record<string, unknown>).positioning as Record<string, unknown> ?? {}, [
    "statement", "valueProposition",
  ]);
  const problemText = extractStr(gtm as Record<string, unknown>, [
    "problem", "problemStatement",
  ]) || profile.description;

  // Financial metrics
  function extractFin(keys: string[]): string {
    const val = extractStr(fin as Record<string, unknown>, keys);
    return val;
  }
  const mrr       = extractFin(["mrr", "MRR", "monthlyRevenue", "monthly_revenue"]);
  const arr       = extractFin(["arr", "ARR", "annualRevenue"]);
  const runway    = extractFin(["runway", "runwayMonths", "runway_months"]);
  const burnRate  = extractFin(["burn", "burnRate", "burn_rate", "monthlyBurn"]);
  const customers = extractFin(["customers", "customerCount", "activeCustomers"]);
  const growth    = extractFin(["growth", "growthRate", "mrrGrowth"]);

  const hasFinancials = !!(mrr || arr || runway || burnRate || customers || growth);

  // Strategic metrics / traction
  const keyMilestones = (() => {
    const ms = (strat as Record<string, unknown>).keyMilestones
      || (strat as Record<string, unknown>).milestones
      || (strat as Record<string, unknown>).traction;
    if (Array.isArray(ms)) return (ms as unknown[]).slice(0, 3).map(m => String(m));
    return [];
  })();

  const stage = profile.stage ? stageLabel(profile.stage) : "";

  const hasICP        = !!icpText;
  const hasPos        = !!posText;
  const hasTraction   = keyMilestones.length > 0;
  const hasArtifacts  = Object.keys(artifacts).length > 0;

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, fontFamily: "inherit" }}>

      {/* ── sticky nav ────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: bg, borderBottom: `1px solid ${bdr}`,
        padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            height: 28, width: 28, borderRadius: 7, background: blue,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 8 }}>EA</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>Edge Alpha</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={handleCopyLink}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 14px",
              background: copied ? green : surf,
              color: copied ? "#fff" : muted,
              border: `1px solid ${copied ? green : bdr}`,
              borderRadius: 999, fontSize: 11, fontWeight: 500, cursor: "pointer",
              transition: "all 0.2s", whiteSpace: "nowrap",
            }}
          >
            {copied
              ? <><Check style={{ height: 11, width: 11 }} /> Copied!</>
              : <><Copy style={{ height: 11, width: 11 }} /> Copy link</>
            }
          </button>
          <Link
            href="/login"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 14px", background: ink, color: bg,
              borderRadius: 999, fontSize: 11, fontWeight: 600, textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            View on Edge Alpha <ArrowRight style={{ height: 10, width: 10 }} />
          </Link>
        </div>
      </div>

      {/* ── main content ─────────────────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "44px 24px 100px" }}>

        {/* ── hero section ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 40 }}
        >
          {/* company name + badges */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
            {/* logo / initials */}
            <div style={{
              height: 64, width: 64, borderRadius: 16,
              background: profile.companyLogoUrl ? "transparent" : `${blue}18`,
              border: `1px solid ${bdr}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", flexShrink: 0,
            }}>
              {profile.companyLogoUrl
                ? <Image src={profile.companyLogoUrl} alt={profile.companyName} fill style={{ objectFit: "cover" }} />
                : <span style={{ fontSize: 22, fontWeight: 700, color: blue }}>
                    {profile.companyName.slice(0, 2).toUpperCase()}
                  </span>
              }
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                <h1 style={{
                  fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
                  fontWeight: 300, letterSpacing: "-0.03em", color: ink, margin: 0,
                }}>
                  {profile.companyName}
                </h1>
                {stage && (
                  <span style={{
                    padding: "2px 10px", background: surf, border: `1px solid ${bdr}`,
                    borderRadius: 999, fontSize: 11, color: muted, fontWeight: 500,
                  }}>
                    {stage}
                  </span>
                )}
                {profile.sector && (
                  <span style={{
                    padding: "2px 10px", background: "#EFF6FF", border: "1px solid #BFDBFE",
                    borderRadius: 999, fontSize: 11, color: blue, fontWeight: 500,
                  }}>
                    {profile.sector}
                  </span>
                )}
              </div>

              {profile.tagline && (
                <p style={{
                  fontSize: 15, color: ink, lineHeight: 1.6, opacity: 0.8,
                  marginBottom: 10, maxWidth: 540,
                }}>
                  {profile.tagline}
                </p>
              )}

              {/* meta row */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: muted }}>
                  Founded by <strong style={{ color: ink }}>{profile.founderName}</strong>
                </span>
                {profile.location && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: muted }}>
                    <MapPin style={{ height: 11, width: 11 }} /> {profile.location}
                  </span>
                )}
                {profile.teamSize && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: muted }}>
                    <Users style={{ height: 11, width: 11 }} /> {profile.teamSize} people
                  </span>
                )}
                {profile.website && (
                  <a
                    href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: blue, textDecoration: "none" }}
                  >
                    <Globe style={{ height: 11, width: 11 }} /> Website
                    <ExternalLink style={{ height: 9, width: 9 }} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── two-column layout: Q-Score | sections ─────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr",
          gap: 24,
          alignItems: "start",
        }}
          className="pitch-grid"
        >

          {/* ── LEFT: Q-Score sidebar ──────────────────────────────── */}
          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.05 }}
              style={{
                background: ink, borderRadius: 20, padding: "28px 24px",
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 16, marginBottom: 16,
              }}
            >
              {qscore ? (
                <>
                  {/* Ring */}
                  <div style={{ position: "relative", height: 120, width: 120 }}>
                    <svg
                      style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
                      viewBox="0 0 120 120"
                    >
                      <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
                      <circle
                        cx="60" cy="60" r="52"
                        fill="none" stroke={ringColor} strokeWidth="7" strokeLinecap="round"
                        strokeDasharray={`${circumference}`}
                        strokeDashoffset={dash}
                        style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
                      />
                    </svg>
                    <div style={{
                      position: "absolute", inset: 0,
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 36, fontWeight: 600, color: "#F9F7F2", lineHeight: 1 }}>
                        {score}
                      </span>
                      <span style={{ fontSize: 9, color: "rgba(249,247,242,0.5)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                        Q-Score
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#F9F7F2", marginBottom: 2 }}>
                      {qscore.grade} — {gradeLabel(score)}
                    </p>
                    {qscore.percentile > 0 && (
                      <p style={{ fontSize: 11, color: "rgba(249,247,242,0.5)" }}>
                        Top {100 - qscore.percentile}% of founders
                      </p>
                    )}
                  </div>

                  {/* Sub-score bars */}
                  {qscore.breakdown.length > 0 && (
                    <div style={{ width: "100%", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
                      {qscore.breakdown.map(b => (
                        <div key={b.label} style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 10, color: "rgba(249,247,242,0.55)", fontWeight: 500 }}>
                              {b.label}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: scoreColor(b.score) }}>
                              {b.score}
                            </span>
                          </div>
                          <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                            <div
                              style={{
                                height: "100%", width: `${b.score}%`,
                                background: scoreColor(b.score), borderRadius: 2,
                                transition: "width 1s ease-out",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <div style={{ fontSize: 38, fontWeight: 300, color: "rgba(249,247,242,0.25)", lineHeight: 1, marginBottom: 8 }}>—</div>
                  <p style={{ fontSize: 12, color: "rgba(249,247,242,0.4)" }}>
                    Q-Score not yet available
                  </p>
                </div>
              )}
            </motion.div>

            {/* Funding goal card */}
            {profile.fundingGoal && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{
                  background: surf, border: `1px solid ${bdr}`, borderRadius: 16,
                  padding: "16px 20px", marginBottom: 16,
                }}
              >
                <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.16em", color: muted, fontWeight: 600, marginBottom: 6 }}>
                  Raising
                </p>
                <p style={{ fontSize: 18, fontWeight: 600, color: ink, marginBottom: 2 }}>
                  {profile.fundingGoal}
                </p>
                <p style={{ fontSize: 11, color: muted }}>{stage || "Current round"}</p>
              </motion.div>
            )}

            {/* Agent artifacts coverage badge */}
            {hasArtifacts && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  background: `${green}10`, border: `1px solid ${green}30`,
                  borderRadius: 14, padding: "14px 18px", marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <CheckCircle style={{ height: 13, width: 13, color: green }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                    AI Due Diligence
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {Object.keys(artifacts).map(type => (
                    <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ height: 5, width: 5, borderRadius: "50%", background: green, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: muted }}>
                        {type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Edge Alpha badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                padding: "10px 14px", borderRadius: 12,
                border: `1px solid ${bdr}`, background: bg,
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <div style={{
                height: 22, width: 22, borderRadius: 6, background: blue,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ color: "#fff", fontWeight: 900, fontSize: 7 }}>EA</span>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: ink, marginBottom: 1 }}>Built with Edge Alpha</p>
                <p style={{ fontSize: 9, color: muted }}>AI-powered startup OS</p>
              </div>
            </motion.div>
          </div>

          {/* ── RIGHT: Content sections ────────────────────────────── */}
          <div>

            {/* Problem / description */}
            {problemText && (
              <Section title="Problem" icon={Flame} color={red}>
                <ArtifactText text={problemText} />
              </Section>
            )}

            {/* Solution */}
            {profile.solution && (
              <Section title="Solution" icon={Zap} color={blue}>
                <ArtifactText text={profile.solution} />
              </Section>
            )}

            {/* ICP — who they serve */}
            {hasICP && (
              <Section title="Ideal Customer Profile" icon={Target} color={amber}>
                <ArtifactText text={icpText} />
              </Section>
            )}

            {/* Positioning */}
            {hasPos && (
              <Section title="Positioning" icon={MessageSquare} color={blue}>
                <ArtifactText text={posText} />
              </Section>
            )}

            {/* Why Now */}
            {profile.whyNow && (
              <Section title="Why Now" icon={TrendingUp} color={green}>
                <ArtifactText text={profile.whyNow} />
              </Section>
            )}

            {/* Moat */}
            {profile.moat && (
              <Section title="Defensibility / Moat" icon={Shield} color={red}>
                <ArtifactText text={profile.moat} />
              </Section>
            )}

            {/* Financials */}
            {hasFinancials && (
              <Section title="Financials" icon={DollarSign} color={green}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {[
                    { label: "MRR",       value: mrr,       icon: DollarSign },
                    { label: "ARR",       value: arr,       icon: BarChart3  },
                    { label: "Runway",    value: runway ? `${runway} mo` : "", icon: Compass },
                    { label: "Burn",      value: burnRate,  icon: TrendingUp },
                    { label: "Customers", value: customers, icon: Users      },
                    { label: "Growth",    value: growth,    icon: TrendingUp },
                  ]
                    .filter(m => !!m.value)
                    .map(({ label, value, icon: Icon }) => (
                      <div key={label} style={{
                        background: bg, border: `1px solid ${bdr}`,
                        borderRadius: 10, padding: "12px 14px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                          <Icon style={{ height: 11, width: 11, color: green }} />
                          <span style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
                            {label}
                          </span>
                        </div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0 }}>{value}</p>
                      </div>
                    ))
                  }
                </div>
              </Section>
            )}

            {/* Market */}
            {profile.tamSize && (
              <Section title="Market Opportunity" icon={BarChart3} color={blue}>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 4 }}>TAM</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: ink }}>{profile.tamSize}</p>
                  </div>
                  {profile.businessModel && (
                    <div style={{ flex: 2, minWidth: 200 }}>
                      <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 4 }}>Business Model</p>
                      <p style={{ fontSize: 14, color: ink, lineHeight: 1.55 }}>{profile.businessModel}</p>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Traction / Milestones */}
            {hasTraction && (
              <Section title="Traction & Milestones" icon={TrendingUp} color={green}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {keyMilestones.map((m, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ height: 20, width: 20, borderRadius: "50%", background: `${green}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        <CheckCircle style={{ height: 11, width: 11, color: green }} />
                      </div>
                      <p style={{ fontSize: 13, color: ink, lineHeight: 1.55, margin: 0 }}>{m}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Q-Score details (repeated for mobile, hidden on wide layout) */}
            {qscore && qscore.breakdown.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                style={{
                  background: surf, border: `1px solid ${bdr}`, borderRadius: 16,
                  padding: "24px 28px", marginBottom: 16,
                }}
                className="qscore-detail-card"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.15em", color: muted,
                  }}>
                    Q-Score Breakdown
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                    background: "#EFF6FF", color: blue, border: `1px solid ${blue}33`,
                    textTransform: "uppercase", letterSpacing: "0.1em",
                  }}>
                    IQ Matrix
                  </span>
                </div>
                {qscore.breakdown.map(b => (
                  <ScoreBar key={b.label} label={b.label} score={b.score} weight={b.weight} />
                ))}
              </motion.div>
            )}

          </div>
        </div>

        {/* ── CTA footer ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            marginTop: 48, padding: "32px 40px",
            background: ink, borderRadius: 20,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 20,
          }}
        >
          <div>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(249,247,242,0.4)", fontWeight: 600, marginBottom: 6 }}>
              Powered by Edge Alpha
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 300, color: "#F9F7F2", marginBottom: 6, letterSpacing: "-0.02em" }}>
              Discover high-signal startups before anyone else.
            </h2>
            <p style={{ fontSize: 13, color: "rgba(249,247,242,0.55)", maxWidth: 440, lineHeight: 1.6 }}>
              Edge Alpha surfaces investment-ready founders through AI-powered Q-Scores, verified metrics, and autonomous agent deliverables.
            </p>
          </div>
          <Link
            href="/login"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 24px",
              background: "#F9F7F2", color: ink,
              borderRadius: 999, fontSize: 13, fontWeight: 600, textDecoration: "none",
              whiteSpace: "nowrap", transition: "opacity 0.15s",
              flexShrink: 0,
            }}
          >
            Join Edge Alpha <ArrowRight style={{ height: 13, width: 13 }} />
          </Link>
        </motion.div>

      </div>

      {/* ── responsive grid fix ─────────────────────────────────────── */}
      <style>{`
        @media (max-width: 700px) {
          .pitch-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
