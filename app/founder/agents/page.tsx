"use client";

import { motion } from "framer-motion";
import { TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { agents } from "@/features/agents/data/agents";
import { Agent } from "@/features/agents/types/agent.types";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";

const pillarAccent: Record<string, string> = {
  "sales-marketing":   "#2563EB",
  "operations-finance": "#16A34A",
  "product-strategy":  "#7C3AED",
};

const pillarLabel: Record<string, string> = {
  "sales-marketing":   "Sales & Marketing",
  "operations-finance": "Operations & Finance",
  "product-strategy":  "Product & Strategy",
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
  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, padding: "40px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* header */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 10 }}>
            AI Adviser Suite
          </p>
          <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink, marginBottom: 10 }}>
            Your advisory board.
          </h1>
          <p style={{ fontSize: 15, color: muted, lineHeight: 1.65, maxWidth: 520 }}>
            Nine specialist advisers, each with deep domain expertise. Every conversation is context-aware and tied to your Q-Score.
          </p>
        </div>

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
                const dimLabel = dimensionLabel[agent.improvesScore] ?? agent.improvesScore;
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
                        {/* avatar */}
                        <div style={{
                          height: 40, width: 40, borderRadius: 10, flexShrink: 0,
                          background: bg, border: `2px solid ${accent}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 15, fontWeight: 700, color: accent,
                        }}>
                          {agent.name[0]}
                        </div>

                        {/* name + desc */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 15, fontWeight: 600, color: ink, marginBottom: 2 }}>{agent.name}</p>
                          <p style={{ fontSize: 13, color: muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {agent.specialty} · {agent.description.split(".")[0]}
                          </p>
                        </div>

                        {/* dim badge */}
                        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", border: `1px solid ${bdr}`, borderRadius: 999, flexShrink: 0, background: bg }}>
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
          All 9 advisers are live · Powered by Claude 3.5 Haiku via OpenRouter
        </p>
      </div>
    </div>
  );
}
