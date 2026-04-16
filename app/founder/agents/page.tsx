"use client";

import { motion } from "framer-motion";
import { TrendingUp, ArrowRight, Check, Star } from "lucide-react";
import Link from "next/link";
import { agents } from "@/features/agents/data/agents";
import { Agent } from "@/features/agents/types/agent.types";
import { useAgentCompletion } from "@/features/agents/hooks/useAgentCompletion";
import { bg, surf, bdr, ink, muted, blue, green, amber, red } from '@/lib/constants/colors'

const pillarAccent: Record<string, string> = {
  "sales-marketing":    "#2563EB",
  "operations-finance": "#16A34A",
  "product-strategy":   "#7C3AED",
};

const pillarLabel: Record<string, string> = {
  "sales-marketing":    "Marketing",
  "operations-finance": "Finance & Operations",
  "product-strategy":   "Product & Strategy",
};

const dimensionLabel: Record<string, string> = {
  goToMarket: "GTM Score",
  financial:  "Financial Score",
  team:       "Team Score",
  product:    "Product Score",
  market:     "Market Score",
  traction:   "Traction Score",
};

const pillars: Agent["pillar"][] = [
  "sales-marketing",
  "operations-finance",
  "product-strategy",
];

// ─── component ────────────────────────────────────────────────────────────────
export default function AgentsHub() {
  const { completedAgents, recommendedIds, loaded } = useAgentCompletion();

  const totalAgents    = agents.length;
  const doneCount      = completedAgents.size;
  const progressPct    = totalAgents > 0 ? (doneCount / totalAgents) * 100 : 0;
  const hasRecommended = recommendedIds.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, padding: "40px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 10 }}>
            CXO Suite
          </p>
          <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink, marginBottom: 10 }}>
            Your executive team.
          </h1>
          <p style={{ fontSize: 15, color: muted, lineHeight: 1.65, maxWidth: 520 }}>
            Nine AI executives — CMO, CFO, CRO, CPO and more. Each has deep domain expertise, builds real deliverables, and improves your Q-Score.
          </p>
        </div>

        {/* ── deliverable progress ─────────────────────────────────────── */}
        {loaded && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background: surf, border: `1px solid ${bdr}`, borderRadius: 14,
              padding: "18px 20px", marginBottom: 32,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: muted }}>
                Deliverable progress
              </p>
              <p style={{ fontSize: 13, fontWeight: 700, color: doneCount === totalAgents ? green : ink }}>
                {doneCount} / {totalAgents}
                <span style={{ fontSize: 11, fontWeight: 400, color: muted, marginLeft: 4 }}>
                  {doneCount === totalAgents ? "all done 🎉" : "deliverables built"}
                </span>
              </p>
            </div>
            <div style={{ height: 7, background: bdr, borderRadius: 999, overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                style={{ height: "100%", borderRadius: 999, background: doneCount === totalAgents ? green : "#2563EB" }}
              />
            </div>
            {hasRecommended && doneCount < totalAgents && (
              <p style={{ fontSize: 11, color: muted, marginTop: 8 }}>
                <Star size={11} style={{ color: amber, display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                Your Q-Score recommends starting with{" "}
                <strong style={{ color: ink }}>
                  {recommendedIds
                    .map(id => agents.find(a => a.id === id)?.name)
                    .filter(Boolean)
                    .join(", ")}
                </strong>
              </p>
            )}
          </motion.div>
        )}

        {/* pillars */}
        {pillars.map((pillar, pi) => {
          const accent = pillarAccent[pillar];
          const label  = pillarLabel[pillar];
          const group  = agents.filter((a) => a.pillar === pillar);

          return (
            <div key={pillar} style={{ marginBottom: pi < pillars.length - 1 ? 48 : 0 }}>
              {/* pillar header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                <div style={{ height: 8, width: 8, borderRadius: "50%", background: accent, flexShrink: 0 }} />
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600, color: accent }}>
                  {label}
                </p>
              </div>
              <div style={{ height: 1, background: bdr, marginBottom: 0 }} />

              {/* agent rows */}
              {group.map((agent, ai) => {
                const dimLabel    = dimensionLabel[agent.improvesScore] ?? agent.improvesScore;
                const isDone      = completedAgents.has(agent.id);
                const isRecommended = !isDone && recommendedIds.includes(agent.id);

                return (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: pi * 0.06 + ai * 0.04 }}
                    style={{ borderBottom: `1px solid ${bdr}` }}
                  >
                    <Link href={`/founder/agents/${agent.id}`} replace style={{ textDecoration: "none" }}>
                      <div
                        style={{
                          display: "flex", alignItems: "center", gap: 16,
                          padding: "18px 0", cursor: "pointer",
                          transition: "background .15s",
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = surf)}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                      >
                        {/* avatar with completion overlay */}
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <div style={{
                            height: 40, width: 40, borderRadius: 10,
                            background: isDone ? "#F0FDF4" : bg,
                            border: `2px solid ${isDone ? green : isRecommended ? amber : accent}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 15, fontWeight: 700,
                            color: isDone ? green : isRecommended ? amber : accent,
                          }}>
                            {isDone ? <Check size={16} /> : agent.name[0]}
                          </div>
                        </div>

                        {/* name + desc */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                            <p style={{ fontSize: 15, fontWeight: 600, color: ink }}>{agent.name}</p>
                            <span style={{ fontSize: 10, color: accent, fontWeight: 600, letterSpacing: "0.04em" }}>
                              {(agent as typeof agent & { cxoTitle?: string }).cxoTitle}
                            </span>
                            {isRecommended && (
                              <span style={{
                                fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
                                padding: "2px 7px", borderRadius: 999,
                                background: "#FEF3C7", color: "#92400E",
                                border: "1px solid #F5E6B8",
                              }}>
                                Start here
                              </span>
                            )}
                            {isDone && (
                              <span style={{
                                fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
                                padding: "2px 7px", borderRadius: 999,
                                background: "#F0FDF4", color: "#166534",
                                border: "1px solid #BBF7D0",
                              }}>
                                Done
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 13, color: muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {agent.specialty} · {agent.description.split(".")[0]}
                          </p>
                        </div>

                        {/* dim badge */}
                        <div style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "4px 12px", border: `1px solid ${bdr}`,
                          borderRadius: 999, flexShrink: 0, background: bg,
                        }}>
                          <TrendingUp style={{ height: 11, width: 11, color: accent }} />
                          <span style={{ fontSize: 11, color: muted, whiteSpace: "nowrap" }}>{dimLabel}</span>
                        </div>

                        {/* arrow */}
                        <ArrowRight style={{ height: 14, width: 14, color: muted, flexShrink: 0 }} />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          );
        })}

        {/* footnote */}
        <p style={{ marginTop: 48, fontSize: 12, color: muted, opacity: 0.6, textAlign: "center" }}>
          Your CXO team · 9 AI executives · Powered by Claude 3.5 Haiku via OpenRouter
        </p>
      </div>
    </div>
  );
}
