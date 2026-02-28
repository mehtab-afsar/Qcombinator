"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, FileText, Mail, Swords, BookOpen, Sparkles,
  DollarSign, Scale, Users, Search, Compass, BarChart3, Zap,
  ArrowRight, Clock, Plus, ChevronDown, ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { agents } from "@/features/agents/data/agents";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";

// ─── artifact meta ────────────────────────────────────────────────────────────
const ARTIFACT_META: Record<string, { icon: React.ElementType; label: string; color: string; agentId: string }> = {
  icp_document:       { icon: FileText,   label: "ICP Document",         color: blue,      agentId: "patel" },
  outreach_sequence:  { icon: Mail,       label: "Outreach Sequence",    color: green,     agentId: "patel" },
  battle_card:        { icon: Swords,     label: "Battle Card",          color: "#DC2626", agentId: "patel" },
  gtm_playbook:       { icon: BookOpen,   label: "GTM Playbook",         color: "#D97706", agentId: "patel" },
  sales_script:       { icon: Zap,        label: "Sales Script",         color: green,     agentId: "susi"  },
  brand_messaging:    { icon: Sparkles,   label: "Brand Messaging",      color: "#7C3AED", agentId: "maya"  },
  financial_summary:  { icon: DollarSign, label: "Financial Summary",    color: green,     agentId: "felix" },
  legal_checklist:    { icon: Scale,      label: "Legal Checklist",      color: "#D97706", agentId: "leo"   },
  hiring_plan:        { icon: Users,      label: "Hiring Plan",          color: blue,      agentId: "harper"},
  pmf_survey:         { icon: BarChart3,  label: "PMF Research Kit",     color: "#7C3AED", agentId: "nova"  },
  competitive_matrix: { icon: Search,     label: "Competitive Analysis", color: "#DC2626", agentId: "atlas" },
  strategic_plan:     { icon: Compass,    label: "Strategic Plan",       color: blue,      agentId: "sage"  },
};

const PILLAR_LABEL: Record<string, string> = {
  "sales-marketing":    "Sales & Marketing",
  "operations-finance": "Operations & Finance",
  "product-strategy":   "Product & Strategy",
};

const PILLAR_ACCENT: Record<string, string> = {
  "sales-marketing":    blue,
  "operations-finance": green,
  "product-strategy":   "#7C3AED",
};

interface Artifact {
  id: string;
  agent_id: string;
  artifact_type: string;
  title: string;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return "just now";
}

// ─── component ────────────────────────────────────────────────────────────────
export default function WorkspacePage() {
  const [artifacts,    setArtifacts]    = useState<Artifact[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [expandedType, setExpandedType] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("agent_artifacts")
          .select("id, agent_id, artifact_type, title, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        setArtifacts(data ?? []);
      } catch {
        // anonymous session
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pillars: Array<"sales-marketing" | "operations-finance" | "product-strategy"> = [
    "sales-marketing", "operations-finance", "product-strategy",
  ];

  const totalPossible = 12; // one per artifact type
  const builtTypes    = new Set(artifacts.map(a => a.artifact_type));
  const pct           = Math.round((builtTypes.size / totalPossible) * 100);

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, padding: "40px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* header */}
        <Link href="/founder/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: muted, textDecoration: "none", marginBottom: 24 }}>
          <ArrowLeft size={14} /> Dashboard
        </Link>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 8 }}>
              Deliverables Workspace
            </p>
            <h1 style={{ fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Everything you&apos;ve built.
            </h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 24, fontWeight: 600, color: builtTypes.size === totalPossible ? green : ink, letterSpacing: "-0.02em" }}>
              {builtTypes.size}<span style={{ fontSize: 14, fontWeight: 400, color: muted }}> / {totalPossible}</span>
            </p>
            <p style={{ fontSize: 11, color: muted }}>deliverables built</p>
          </div>
        </div>

        {/* progress bar */}
        <div style={{ height: 6, background: bdr, borderRadius: 999, marginBottom: 36, overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ height: "100%", borderRadius: 999, background: builtTypes.size === totalPossible ? green : blue }}
          />
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
            <p style={{ fontSize: 13, color: muted }}>Loading workspace…</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            {pillars.map((pillar) => {
              const pillarAgents  = agents.filter(a => a.pillar === pillar);
              const accent        = PILLAR_ACCENT[pillar];
              const label         = PILLAR_LABEL[pillar];

              // Artifacts belonging to agents in this pillar
              const pillarAgentIds = new Set(pillarAgents.map(a => a.id));
              const pillarArtifacts = artifacts.filter(a => pillarAgentIds.has(a.agent_id));

              // All artifact types for agents in this pillar
              const expectedTypes = Object.entries(ARTIFACT_META)
                .filter(([, m]) => pillarAgentIds.has(m.agentId))
                .map(([type]) => type);

              return (
                <div key={pillar}>
                  {/* pillar header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <div style={{ height: 8, width: 8, borderRadius: "50%", background: accent }} />
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: accent }}>
                      {label}
                    </span>
                    <span style={{ fontSize: 11, color: muted }}>
                      — {pillarArtifacts.length > 0 ? `${new Set(pillarArtifacts.map(a => a.artifact_type)).size}/${expectedTypes.length} built` : `0/${expectedTypes.length} built`}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                    {expectedTypes.map((type) => {
                      const meta      = ARTIFACT_META[type];
                      const Icon      = meta.icon;
                      const typeArts  = pillarArtifacts.filter(a => a.artifact_type === type);
                      const latest    = typeArts[0]; // most recent first
                      const isDone    = !!latest;

                      const isExpanded = expandedType === type;

                      return (
                        <motion.div
                          key={type}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25 }}
                          style={{
                            background: isDone ? "#fff" : surf,
                            border: `1px solid ${bdr}`,
                            borderRadius: 12,
                            overflow: "hidden",
                            opacity: isDone ? 1 : 0.65,
                          }}
                        >
                          {/* summary row */}
                          <div style={{ padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                            {/* icon */}
                            <div style={{
                              height: 36, width: 36, borderRadius: 9, flexShrink: 0,
                              background: isDone ? `${meta.color}14` : surf,
                              border: `1.5px solid ${isDone ? meta.color : bdr}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <Icon size={16} style={{ color: isDone ? meta.color : muted }} />
                            </div>

                            {/* info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: isDone ? ink : muted, marginBottom: 2 }}>
                                {meta.label}
                              </p>
                              {isDone ? (
                                <>
                                  <p style={{
                                    fontSize: 11, color: muted,
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                    marginBottom: 6,
                                  }}>
                                    {latest.title}
                                  </p>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <Clock size={10} style={{ color: muted }} />
                                    <span style={{ fontSize: 10, color: muted }}>{timeAgo(latest.created_at)}</span>
                                    {typeArts.length > 1 ? (
                                      <button
                                        onClick={() => setExpandedType(isExpanded ? null : type)}
                                        style={{
                                          fontSize: 10, color: blue, background: "none", border: "none",
                                          cursor: "pointer", display: "flex", alignItems: "center", gap: 2,
                                          padding: 0, fontFamily: "inherit",
                                        }}
                                      >
                                        · {typeArts.length} versions
                                        {isExpanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                                      </button>
                                    ) : (
                                      <span style={{ fontSize: 10, color: muted }}>· 1 version</span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <p style={{ fontSize: 11, color: muted }}>Not yet built</p>
                              )}
                            </div>

                            {/* CTA */}
                            <Link
                              href={isDone
                                ? `/founder/agents/${meta.agentId}?artifact=${latest.id}`
                                : `/founder/agents/${meta.agentId}`}
                              style={{ textDecoration: "none", flexShrink: 0 }}
                            >
                              <div style={{
                                height: 30, paddingInline: 12, borderRadius: 999, fontSize: 11, fontWeight: 600,
                                display: "flex", alignItems: "center", gap: 5,
                                background: isDone ? surf : accent,
                                color: isDone ? muted : "#fff",
                                border: `1px solid ${isDone ? bdr : accent}`,
                                cursor: "pointer",
                              }}>
                                {isDone ? (
                                  <><ArrowRight size={11} /> View</>
                                ) : (
                                  <><Plus size={11} /> Build</>
                                )}
                              </div>
                            </Link>
                          </div>

                          {/* version history (expandable) */}
                          <AnimatePresence>
                            {isDone && isExpanded && typeArts.length > 1 && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{ overflow: "hidden" }}
                              >
                                <div style={{ borderTop: `1px solid ${bdr}`, padding: "10px 18px 14px" }}>
                                  <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, marginBottom: 8 }}>
                                    All versions
                                  </p>
                                  {typeArts.map((a, vi) => (
                                    <Link
                                      key={a.id}
                                      href={`/founder/agents/${meta.agentId}?artifact=${a.id}`}
                                      style={{ textDecoration: "none" }}
                                    >
                                      <div
                                        style={{
                                          display: "flex", alignItems: "center", justifyContent: "space-between",
                                          padding: "6px 0",
                                          borderBottom: vi < typeArts.length - 1 ? `1px solid ${bdr}` : "none",
                                          cursor: "pointer",
                                          transition: "opacity .12s",
                                        }}
                                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = "0.7")}
                                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                                      >
                                        <div>
                                          <span style={{ fontSize: 11, fontWeight: 600, color: ink }}>v{typeArts.length - vi}</span>
                                          <span style={{ fontSize: 11, color: muted, marginLeft: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200, display: "inline-block", verticalAlign: "middle" }}>
                                            {a.title}
                                          </span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                          <span style={{ fontSize: 10, color: muted }}>{timeAgo(a.created_at)}</span>
                                          {vi === 0 && (
                                            <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 999, background: `${green}18`, color: green, border: `1px solid #BBF7D0` }}>
                                              Latest
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* empty state */}
        <AnimatePresence>
          {!loading && artifacts.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: "center", padding: "60px 0" }}
            >
              <p style={{ fontSize: 15, color: muted, marginBottom: 6 }}>No deliverables built yet</p>
              <p style={{ fontSize: 13, color: muted, marginBottom: 20, opacity: 0.7 }}>
                Start a conversation with any adviser to generate your first document
              </p>
              <Link href="/founder/agents" style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "10px 22px", background: ink, color: bg,
                fontSize: 13, fontWeight: 500, borderRadius: 999, textDecoration: "none",
              }}>
                Meet your advisers <ArrowRight size={13} />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* footnote */}
        {!loading && artifacts.length > 0 && (
          <p style={{ marginTop: 48, fontSize: 12, color: muted, opacity: 0.55, textAlign: "center" }}>
            Every deliverable is saved · Generate new versions any time by talking to your adviser
          </p>
        )}
      </div>
    </div>
  );
}
