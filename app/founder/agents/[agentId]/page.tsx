"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, TrendingUp, ChevronRight, Copy, Check, X, RefreshCw, FileText, Mail, Swords, BookOpen } from "lucide-react";
import Link from "next/link";
import { getAgentById } from "@/features/agents/data/agents";

// ─── palette (matches investor dashboard exactly) ─────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";
const amber = "#D97706";
const red   = "#DC2626";

const pillarAccent: Record<string, string> = {
  "sales-marketing":    "#2563EB",
  "operations-finance": "#16A34A",
  "product-strategy":   "#7C3AED",
};

const pillarLabel: Record<string, string> = {
  "sales-marketing":    "Sales & Marketing",
  "operations-finance": "Operations & Finance",
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

// ─── types ────────────────────────────────────────────────────────────────────
interface UiMessage  { role: "agent" | "user"; text: string; }
interface ApiMessage { role: "user" | "assistant"; content: string; }

interface FinModel {
  mrr: string; growthRate: string; burn: string; grossMargin: string;
  cac: string; ltv: string; cash: string;
}

interface ArtifactData {
  id: string | null;
  type: "icp_document" | "outreach_sequence" | "battle_card" | "gtm_playbook";
  title: string;
  content: Record<string, unknown>;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtNum(n: number, decimals = 0): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

function healthColor(val: number, lo: number, hi: number): string {
  if (val >= hi) return green;
  if (val >= lo) return amber;
  return red;
}

// ─── copy-to-clipboard button ─────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{
        background: "none", border: `1px solid ${bdr}`, borderRadius: 6,
        padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
        fontSize: 11, color: copied ? green : muted, transition: "color .15s",
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ─── artifact type meta ───────────────────────────────────────────────────────
const ARTIFACT_META: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  icp_document:       { icon: FileText, label: "ICP Document",       color: blue },
  outreach_sequence:  { icon: Mail,     label: "Outreach Sequence",  color: green },
  battle_card:        { icon: Swords,   label: "Battle Card",        color: red },
  gtm_playbook:       { icon: BookOpen, label: "GTM Playbook",       color: amber },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ICP RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
function ICPRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    summary?: string;
    buyerPersona?: { title?: string; role?: string; seniority?: string; dayInLife?: string; goals?: string[]; frustrations?: string[] };
    firmographics?: { companySize?: string; industry?: string[]; revenue?: string; geography?: string[]; techStack?: string[] };
    painPoints?: { pain: string; severity: string; currentSolution: string }[];
    buyingTriggers?: string[];
    channels?: { channel: string; priority: string; rationale: string }[];
    qualificationCriteria?: string[];
  };

  const sevColor: Record<string, string> = { high: red, medium: amber, low: green };

  const sectionHead: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.14em", color: muted, marginBottom: 10,
  };

  const pill = (text: string, accent = muted): React.CSSProperties => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 999,
    fontSize: 11, background: surf, border: `1px solid ${bdr}`, color: accent, marginRight: 6, marginBottom: 5,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Summary */}
      {d.summary && (
        <div style={{ background: surf, borderRadius: 10, padding: "14px 16px", border: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: ink }}>{d.summary}</p>
        </div>
      )}

      {/* Buyer Persona */}
      {d.buyerPersona && (
        <div>
          <p style={sectionHead}>Buyer Persona</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            {[
              { l: "Title", v: d.buyerPersona.title },
              { l: "Role", v: d.buyerPersona.role },
              { l: "Seniority", v: d.buyerPersona.seniority },
            ].filter(x => x.v).map(({ l, v }) => (
              <div key={l}>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{l}</p>
                <p style={{ fontSize: 13, color: ink }}>{v}</p>
              </div>
            ))}
          </div>
          {d.buyerPersona.dayInLife && (
            <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 8 }}>{d.buyerPersona.dayInLife}</p>
          )}
          {d.buyerPersona.goals && d.buyerPersona.goals.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: green, marginBottom: 4 }}>Goals</p>
              {d.buyerPersona.goals.map((g, i) => (
                <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>• {g}</p>
              ))}
            </div>
          )}
          {d.buyerPersona.frustrations && d.buyerPersona.frustrations.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: red, marginBottom: 4 }}>Frustrations</p>
              {d.buyerPersona.frustrations.map((f, i) => (
                <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>• {f}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Firmographics */}
      {d.firmographics && (
        <div>
          <p style={sectionHead}>Firmographics</p>
          {d.firmographics.companySize && <p style={{ fontSize: 12, color: ink, marginBottom: 6 }}>Size: {d.firmographics.companySize}</p>}
          {d.firmographics.revenue && <p style={{ fontSize: 12, color: ink, marginBottom: 6 }}>Revenue: {d.firmographics.revenue}</p>}
          <div style={{ marginTop: 6 }}>
            {(d.firmographics.industry || []).map(t => <span key={t} style={pill(t)}>{t}</span>)}
            {(d.firmographics.geography || []).map(t => <span key={t} style={pill(t, blue)}>{t}</span>)}
            {(d.firmographics.techStack || []).map(t => <span key={t} style={pill(t, amber)}>{t}</span>)}
          </div>
        </div>
      )}

      {/* Pain Points */}
      {d.painPoints && d.painPoints.length > 0 && (
        <div>
          <p style={sectionHead}>Pain Points</p>
          {d.painPoints.map((pp, i) => (
            <div key={i} style={{ padding: "10px 14px", background: surf, borderRadius: 8, border: `1px solid ${bdr}`, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{pp.pain}</p>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: sevColor[pp.severity] || muted }}>{pp.severity}</span>
              </div>
              <p style={{ fontSize: 11, color: muted }}>Current: {pp.currentSolution}</p>
            </div>
          ))}
        </div>
      )}

      {/* Buying Triggers */}
      {d.buyingTriggers && d.buyingTriggers.length > 0 && (
        <div>
          <p style={sectionHead}>Buying Triggers</p>
          {d.buyingTriggers.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: green, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{t}</p>
            </div>
          ))}
        </div>
      )}

      {/* Channels */}
      {d.channels && d.channels.length > 0 && (
        <div>
          <p style={sectionHead}>Recommended Channels</p>
          {d.channels.map((ch, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>{ch.channel}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                  padding: "2px 7px", borderRadius: 999,
                  background: ch.priority === "primary" ? blue : surf,
                  color: ch.priority === "primary" ? "#fff" : muted,
                }}>{ch.priority}</span>
              </div>
              <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{ch.rationale}</p>
            </div>
          ))}
        </div>
      )}

      {/* Qualification */}
      {d.qualificationCriteria && d.qualificationCriteria.length > 0 && (
        <div>
          <p style={sectionHead}>Qualification Criteria</p>
          {d.qualificationCriteria.map((q, i) => (
            <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>✓ {q}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTREACH SEQUENCE RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
function OutreachRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    targetICP?: string;
    sequence?: { step: number; channel: string; timing: string; subject?: string | null; body: string; goal: string; tips: string[] }[];
  };

  const chColor: Record<string, string> = { email: blue, linkedin: "#0A66C2", call: amber };
  const chLabel: Record<string, string> = { email: "Email", linkedin: "LinkedIn", call: "Call" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {d.targetICP && (
        <div style={{ background: surf, borderRadius: 10, padding: "12px 14px", border: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, marginBottom: 4 }}>Target</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.5 }}>{d.targetICP}</p>
        </div>
      )}

      {(d.sequence || []).map((step, i) => (
        <div key={i} style={{ position: "relative", paddingLeft: 20 }}>
          {/* timeline line */}
          {i < (d.sequence?.length ?? 0) - 1 && (
            <div style={{ position: "absolute", left: 6, top: 20, bottom: -14, width: 1, background: bdr }} />
          )}
          {/* dot */}
          <div style={{
            position: "absolute", left: 0, top: 6,
            width: 13, height: 13, borderRadius: "50%",
            background: chColor[step.channel] || muted,
            border: `2px solid ${bg}`,
          }} />

          <div style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px" }}>
            {/* header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: ink }}>{step.timing}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                  padding: "2px 8px", borderRadius: 999,
                  background: chColor[step.channel] || muted, color: "#fff",
                }}>{chLabel[step.channel] || step.channel}</span>
              </div>
              <CopyBtn text={step.body} />
            </div>

            {/* subject line */}
            {step.subject && (
              <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 6 }}>
                Subject: {step.subject}
              </p>
            )}

            {/* body */}
            <p style={{ fontSize: 12, color: ink, lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 8 }}>{step.body}</p>

            {/* goal + tips */}
            <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>
              <strong>Goal:</strong> {step.goal}
            </p>
            {step.tips && step.tips.map((tip, ti) => (
              <p key={ti} style={{ fontSize: 11, color: muted, paddingLeft: 8 }}>💡 {tip}</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATTLE CARD RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
function BattleCardRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    competitor?: string;
    overview?: string;
    positioningMatrix?: { dimension: string; us: string; them: string; verdict: string }[];
    objectionHandling?: { objection: string; response: string; proofPoint: string }[];
    strengths?: string[];
    weaknesses?: string[];
    winStrategy?: string;
    sources?: { title: string; url: string }[];
  };

  const verdictColor: Record<string, string> = { advantage: green, parity: amber, disadvantage: red };
  const verdictLabel: Record<string, string> = { advantage: "Win", parity: "Tie", disadvantage: "Lose" };

  const sectionHead: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.14em", color: muted, marginBottom: 10,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {d.overview && (
        <div style={{ background: surf, borderRadius: 10, padding: "14px 16px", border: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: ink }}>{d.overview}</p>
        </div>
      )}

      {/* Positioning Matrix */}
      {d.positioningMatrix && d.positioningMatrix.length > 0 && (
        <div>
          <p style={sectionHead}>Positioning Matrix</p>
          {/* header row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 50px", gap: 1, background: bdr, borderRadius: 8, overflow: "hidden" }}>
            {["Dimension", "Us", "Them", ""].map(h => (
              <div key={h} style={{ background: surf, padding: "8px 10px", fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
            ))}
            {d.positioningMatrix.map((row, i) => (
              <>
                <div key={`d${i}`} style={{ background: "#fff", padding: "10px", fontSize: 12, fontWeight: 600, color: ink }}>{row.dimension}</div>
                <div key={`u${i}`} style={{ background: "#fff", padding: "10px", fontSize: 11, color: ink, lineHeight: 1.4 }}>{row.us}</div>
                <div key={`t${i}`} style={{ background: "#fff", padding: "10px", fontSize: 11, color: muted, lineHeight: 1.4 }}>{row.them}</div>
                <div key={`v${i}`} style={{ background: "#fff", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                    color: verdictColor[row.verdict] || muted,
                  }}>{verdictLabel[row.verdict] || row.verdict}</span>
                </div>
              </>
            ))}
          </div>
        </div>
      )}

      {/* Objection Handling */}
      {d.objectionHandling && d.objectionHandling.length > 0 && (
        <div>
          <p style={sectionHead}>Objection Handling</p>
          {d.objectionHandling.map((obj, i) => (
            <div key={i} style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: red, marginBottom: 6 }}>&quot;{obj.objection}&quot;</p>
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, marginBottom: 6 }}>{obj.response}</p>
              <p style={{ fontSize: 11, color: green }}>📊 {obj.proofPoint}</p>
            </div>
          ))}
        </div>
      )}

      {/* Strengths / Weaknesses */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {d.strengths && d.strengths.length > 0 && (
          <div>
            <p style={{ ...sectionHead, color: amber }}>Their Strengths</p>
            {d.strengths.map((s, i) => <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.6, marginBottom: 4 }}>• {s}</p>)}
          </div>
        )}
        {d.weaknesses && d.weaknesses.length > 0 && (
          <div>
            <p style={{ ...sectionHead, color: green }}>Their Weaknesses</p>
            {d.weaknesses.map((w, i) => <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.6, marginBottom: 4 }}>• {w}</p>)}
          </div>
        )}
      </div>

      {/* Win Strategy */}
      {d.winStrategy && (
        <div style={{ background: "#F0FDF4", border: `1px solid #BBF7D0`, borderRadius: 10, padding: "14px 16px" }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: green, marginBottom: 6 }}>Win Strategy</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.winStrategy}</p>
        </div>
      )}

      {/* Sources */}
      {d.sources && d.sources.length > 0 && (
        <div>
          <p style={sectionHead}>Sources</p>
          {d.sources.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", fontSize: 11, color: blue, textDecoration: "none", marginBottom: 4, lineHeight: 1.4 }}>
              {s.title || s.url} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GTM PLAYBOOK RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
function PlaybookRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    companyContext?: string;
    icp?: { summary?: string; segments?: string[] };
    positioning?: { statement?: string; differentiators?: string[] };
    channels?: { channel: string; priority: string; budget: string; expectedCAC: string }[];
    messaging?: { audience: string; headline: string; valueProps: string[] }[];
    metrics?: { metric: string; target: string; currentBaseline: string }[];
    ninetyDayPlan?: { phase: string; weeks: string; objectives: string[]; keyActions: string[]; successCriteria: string }[];
  };

  const sectionHead: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.14em", color: muted, marginBottom: 10,
  };

  const priColor: Record<string, string> = { primary: blue, secondary: amber, experimental: muted };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Company Context */}
      {d.companyContext && (
        <div style={{ background: surf, borderRadius: 10, padding: "14px 16px", border: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: ink }}>{d.companyContext}</p>
        </div>
      )}

      {/* Positioning */}
      {d.positioning?.statement && (
        <div style={{ background: "#EFF6FF", border: `1px solid #BFDBFE`, borderRadius: 10, padding: "14px 16px" }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: blue, marginBottom: 6 }}>Positioning</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6, fontStyle: "italic" }}>{d.positioning.statement}</p>
          {d.positioning.differentiators && (
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {d.positioning.differentiators.map((diff, i) => (
                <span key={i} style={{
                  padding: "3px 10px", borderRadius: 999, fontSize: 11,
                  background: "#DBEAFE", color: blue,
                }}>{diff}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ICP Segments */}
      {d.icp?.segments && d.icp.segments.length > 0 && (
        <div>
          <p style={sectionHead}>ICP Segments</p>
          {d.icp.summary && <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 8 }}>{d.icp.summary}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {d.icp.segments.map((seg, i) => (
              <span key={i} style={{
                padding: "5px 12px", borderRadius: 999, fontSize: 12,
                background: surf, border: `1px solid ${bdr}`, color: ink,
              }}>{seg}</span>
            ))}
          </div>
        </div>
      )}

      {/* Channels */}
      {d.channels && d.channels.length > 0 && (
        <div>
          <p style={sectionHead}>Channel Strategy</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 70px 70px", gap: 1, background: bdr, borderRadius: 8, overflow: "hidden" }}>
            {["Channel", "Priority", "Budget", "CAC"].map(h => (
              <div key={h} style={{ background: surf, padding: "8px 10px", fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
            ))}
            {d.channels.map((ch, i) => (
              <>
                <div key={`c${i}`} style={{ background: "#fff", padding: "10px", fontSize: 12, fontWeight: 600, color: ink }}>{ch.channel}</div>
                <div key={`p${i}`} style={{ background: "#fff", padding: "10px", display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: priColor[ch.priority] || muted }}>{ch.priority}</span>
                </div>
                <div key={`b${i}`} style={{ background: "#fff", padding: "10px", fontSize: 11, color: ink }}>{ch.budget}</div>
                <div key={`a${i}`} style={{ background: "#fff", padding: "10px", fontSize: 11, color: ink }}>{ch.expectedCAC}</div>
              </>
            ))}
          </div>
        </div>
      )}

      {/* Messaging */}
      {d.messaging && d.messaging.length > 0 && (
        <div>
          <p style={sectionHead}>Messaging</p>
          {d.messaging.map((msg, i) => (
            <div key={i} style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: blue, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{msg.audience}</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 6 }}>{msg.headline}</p>
              {msg.valueProps.map((vp, vi) => (
                <p key={vi} style={{ fontSize: 12, color: muted, lineHeight: 1.6, paddingLeft: 8 }}>• {vp}</p>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Metrics */}
      {d.metrics && d.metrics.length > 0 && (
        <div>
          <p style={sectionHead}>Key Metrics</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {d.metrics.map((m, i) => (
              <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{m.metric}</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>{m.target}</p>
                <p style={{ fontSize: 10, color: muted }}>Baseline: {m.currentBaseline}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 90-Day Plan */}
      {d.ninetyDayPlan && d.ninetyDayPlan.length > 0 && (
        <div>
          <p style={sectionHead}>90-Day Plan</p>
          {d.ninetyDayPlan.map((phase, i) => (
            <div key={i} style={{
              background: "#fff", border: `1px solid ${bdr}`, borderRadius: 10,
              padding: "16px", marginBottom: 10,
              borderLeft: `3px solid ${i === 0 ? blue : i === 1 ? amber : green}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>{phase.phase}</p>
                <span style={{ fontSize: 11, color: muted }}>{phase.weeks}</span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Objectives</p>
                {phase.objectives.map((o, oi) => <p key={oi} style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingLeft: 8 }}>→ {o}</p>)}
              </div>
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Key Actions</p>
                {phase.keyActions.map((a, ai) => <p key={ai} style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingLeft: 8 }}>• {a}</p>)}
              </div>
              <div style={{ background: "#F0FDF4", borderRadius: 6, padding: "8px 10px" }}>
                <p style={{ fontSize: 11, color: green }}>✓ {phase.successCriteria}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERABLE PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function DeliverablePanel({
  artifact,
  artifactHistory,
  onSelectArtifact,
  onClose,
  onRefine,
}: {
  artifact: ArtifactData;
  artifactHistory: ArtifactData[];
  onSelectArtifact: (a: ArtifactData) => void;
  onClose: () => void;
  onRefine: (feedback: string) => void;
}) {
  const [refineInput, setRefineInput] = useState("");
  const meta = ARTIFACT_META[artifact.type];
  const Icon = meta?.icon || FileText;

  const renderContent = () => {
    switch (artifact.type) {
      case "icp_document":       return <ICPRenderer data={artifact.content} />;
      case "outreach_sequence":  return <OutreachRenderer data={artifact.content} />;
      case "battle_card":        return <BattleCardRenderer data={artifact.content} />;
      case "gtm_playbook":       return <PlaybookRenderer data={artifact.content} />;
      default:                   return <pre style={{ fontSize: 11, color: muted, whiteSpace: "pre-wrap" }}>{JSON.stringify(artifact.content, null, 2)}</pre>;
    }
  };

  return (
    <div style={{
      width: 420, flexShrink: 0,
      borderLeft: `1px solid ${bdr}`,
      background: bg,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* panel header */}
      <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${bdr}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon size={14} style={{ color: meta?.color || blue }} />
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: meta?.color || blue }}>
              {meta?.label || artifact.type}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: muted, display: "flex", padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, color: ink, lineHeight: 1.3 }}>
          {artifact.title || meta?.label}
        </p>
      </div>

      {/* artifact tabs (if multiple) */}
      {artifactHistory.length > 1 && (
        <div style={{ display: "flex", gap: 6, padding: "10px 18px", borderBottom: `1px solid ${bdr}`, overflowX: "auto", flexShrink: 0 }}>
          {artifactHistory.map((a, i) => {
            const m = ARTIFACT_META[a.type];
            const AIcon = m?.icon || FileText;
            const isActive = a.id === artifact.id;
            return (
              <button
                key={a.id || i}
                onClick={() => onSelectArtifact(a)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                  background: isActive ? surf : "transparent",
                  border: `1px solid ${isActive ? bdr : "transparent"}`,
                  color: isActive ? ink : muted,
                  cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                <AIcon size={11} />
                {m?.label || a.type}
              </button>
            );
          })}
        </div>
      )}

      {/* scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px" }}>
        {renderContent()}
      </div>

      {/* refine input */}
      <div style={{ padding: "12px 18px", borderTop: `1px solid ${bdr}`, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={refineInput}
            onChange={(e) => setRefineInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && refineInput.trim()) {
                onRefine(refineInput.trim());
                setRefineInput("");
              }
            }}
            placeholder="Ask Patel to refine this…"
            style={{
              flex: 1, padding: "9px 12px", borderRadius: 8,
              background: surf, border: `1px solid ${bdr}`, fontSize: 12,
              color: ink, outline: "none", fontFamily: "inherit",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = blue; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = bdr; }}
          />
          <button
            onClick={() => { if (refineInput.trim()) { onRefine(refineInput.trim()); setRefineInput(""); } }}
            disabled={!refineInput.trim()}
            style={{
              padding: "9px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: refineInput.trim() ? blue : surf,
              color: refineInput.trim() ? "#fff" : muted,
              border: "none", cursor: refineInput.trim() ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <RefreshCw size={12} /> Refine
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCIAL PANEL (Felix)
// ═══════════════════════════════════════════════════════════════════════════════
function FinancialPanel({ onShare }: { onShare: (ctx: string) => void }) {
  const [model, setModel] = useState<FinModel>({
    mrr: "", growthRate: "", burn: "", grossMargin: "",
    cac: "", ltv: "", cash: "",
  });

  const set = (key: keyof FinModel) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setModel(prev => ({ ...prev, [key]: e.target.value }));

  const n = (v: string) => parseFloat(v.replace(/,/g, "")) || 0;

  const mrr         = n(model.mrr);
  const growth      = n(model.growthRate);
  const burn        = n(model.burn);
  const gm          = n(model.grossMargin);
  const cac         = n(model.cac);
  const ltv         = n(model.ltv);
  const cash        = n(model.cash);

  const arr         = mrr * 12;
  const grossProfit = mrr * (gm / 100);
  const netBurn     = Math.max(burn - grossProfit, 0);
  const runway      = netBurn > 0 ? cash / netBurn : Infinity;
  const ltvCac      = cac > 0 ? ltv / cac : 0;
  const payback     = grossProfit > 0 ? cac / grossProfit : Infinity;

  const projection = Array.from({ length: 12 }, (_, i) => {
    const mo      = i + 1;
    const mrrMo   = mrr * Math.pow(1 + growth / 100, mo);
    const gpMo    = mrrMo * (gm / 100);
    const nbMo    = Math.max(burn - gpMo, 0);
    const cashLeft = cash - nbMo * mo;
    return { mo, mrr: mrrMo, nb: nbMo, cash: cashLeft };
  });

  const hasData = mrr > 0 || burn > 0;

  const handleShare = () => {
    const lines = [
      "Here is my current financial snapshot — please use these exact numbers for your advice:",
      "",
      `**MRR:** $${fmtNum(mrr)}`,
      `**ARR:** $${fmtNum(arr)}`,
      `**Monthly Burn:** $${fmtNum(burn)}`,
      `**Gross Margin:** ${gm}%`,
      `**Net Burn/mo:** $${fmtNum(netBurn)}`,
      `**Runway:** ${isFinite(runway) ? Math.round(runway) + " months" : "Not burning cash"}`,
      `**Cash in Bank:** $${fmtNum(cash)}`,
      ...(cac   > 0 ? [`**CAC:** $${fmtNum(cac)}`]                                       : []),
      ...(ltv   > 0 ? [`**LTV:** $${fmtNum(ltv)}`]                                       : []),
      ...(ltvCac > 0 ? [`**LTV:CAC Ratio:** ${ltvCac.toFixed(2)}:1`]                     : []),
      ...(isFinite(payback) ? [`**Payback Period:** ${Math.round(payback)} months`]       : []),
      `**Monthly Growth Rate:** ${growth}%`,
    ];
    onShare(lines.join("\n"));
  };

  const inputFields: { key: keyof FinModel; label: string; placeholder: string }[] = [
    { key: "mrr",         label: "MRR ($)",            placeholder: "12,000"   },
    { key: "growthRate",  label: "Monthly Growth (%)",  placeholder: "8"        },
    { key: "burn",        label: "Monthly Burn ($)",    placeholder: "45,000"   },
    { key: "grossMargin", label: "Gross Margin (%)",    placeholder: "72"       },
    { key: "cac",         label: "CAC ($)",             placeholder: "800"      },
    { key: "ltv",         label: "LTV ($)",             placeholder: "4,800"    },
    { key: "cash",        label: "Cash in Bank ($)",    placeholder: "250,000"  },
  ];

  const vitals = [
    { label: "ARR",             value: "$" + fmtNum(arr),                                               accent: ink   },
    { label: "Net Burn / mo",   value: netBurn > 0 ? "$" + fmtNum(netBurn) : "Cash positive",            accent: netBurn === 0 ? green : healthColor(runway, 6, 18) },
    { label: "Runway",          value: isFinite(runway) ? fmtNum(runway, 1) + " mo" : "∞",              accent: isFinite(runway) ? healthColor(runway, 6, 18) : green },
    ...(ltvCac > 0 ? [{ label: "LTV : CAC",     value: ltvCac.toFixed(1) + " : 1",                     accent: healthColor(ltvCac, 2, 3) }] : []),
    ...(isFinite(payback) && payback > 0 ? [{ label: "Payback Period", value: Math.round(payback) + " mo", accent: payback <= 12 ? green : payback <= 18 ? amber : red }] : []),
  ];

  return (
    <div style={{
      width: 340, flexShrink: 0,
      borderLeft: `1px solid ${bdr}`,
      background: bg,
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      <div style={{ padding: "20px 20px 14px", borderBottom: `1px solid ${bdr}` }}>
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: green, fontWeight: 600, marginBottom: 4 }}>
          Financial Model
        </p>
        <p style={{ fontSize: 13, color: muted, lineHeight: 1.5 }}>
          Enter your numbers, then share them with Felix.
        </p>
      </div>

      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${bdr}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {inputFields.map(({ key, label, placeholder }) => (
            <div key={key} style={{ gridColumn: key === "cash" ? "1 / -1" : "auto" }}>
              <label style={{
                display: "block", marginBottom: 5,
                fontSize: 10, fontWeight: 600, color: muted,
                textTransform: "uppercase", letterSpacing: "0.1em",
              }}>
                {label}
              </label>
              <input
                type="number"
                value={model[key]}
                onChange={set(key)}
                placeholder={placeholder}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: surf, border: `1px solid ${bdr}`, borderRadius: 8,
                  padding: "8px 10px", fontSize: 13, color: ink,
                  outline: "none", fontFamily: "inherit",
                }}
                onFocus={(e)  => { e.currentTarget.style.borderColor = green; }}
                onBlur={(e)   => { e.currentTarget.style.borderColor = bdr;   }}
              />
            </div>
          ))}
        </div>
      </div>

      {hasData && vitals.length > 0 && (
        <div style={{ borderBottom: `1px solid ${bdr}` }}>
          <div style={{ padding: "14px 20px 10px" }}>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600 }}>
              Vitals
            </p>
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
            gap: 1, background: bdr,
            borderTop: `1px solid ${bdr}`,
          }}>
            {vitals.map(({ label, value, accent }) => (
              <div key={label} style={{ background: bg, padding: "14px 16px" }}>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>
                  {label}
                </p>
                <p style={{ fontSize: 16, fontWeight: 700, color: accent }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {mrr > 0 && burn > 0 && (
        <div style={{ borderBottom: `1px solid ${bdr}` }}>
          <div style={{ padding: "14px 20px 10px" }}>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600 }}>
              12-Month Projection
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 1fr", gap: 8, padding: "6px 16px 6px", borderTop: `1px solid ${bdr}`, borderBottom: `1px solid ${bdr}` }}>
            {["Mo", "MRR", "Burn", "Cash"].map(h => (
              <p key={h} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: muted, fontWeight: 600, textAlign: h === "Mo" ? "left" : "right" }}>{h}</p>
            ))}
          </div>
          {projection.map(({ mo, mrr: mrrMo, nb, cash: cl }) => {
            const depleted = cl < 0;
            const low      = cl < cash * 0.15 && !depleted;
            return (
              <div
                key={mo}
                style={{
                  display: "grid", gridTemplateColumns: "32px 1fr 1fr 1fr",
                  gap: 8, padding: "7px 16px",
                  borderBottom: `1px solid ${bdr}`,
                  background: mo % 2 === 0 ? surf : bg,
                }}
              >
                <p style={{ fontSize: 11, color: muted }}>{mo}</p>
                <p style={{ fontSize: 11, color: ink, textAlign: "right" }}>
                  ${mrrMo >= 1000 ? (mrrMo / 1000).toFixed(1) + "k" : fmtNum(mrrMo)}
                </p>
                <p style={{ fontSize: 11, color: amber, textAlign: "right" }}>
                  ${nb >= 1000 ? (nb / 1000).toFixed(1) + "k" : fmtNum(nb)}
                </p>
                <p style={{
                  fontSize: 11, textAlign: "right", fontWeight: depleted ? 700 : 400,
                  color: depleted ? red : low ? amber : green,
                }}>
                  {depleted
                    ? "Out"
                    : "$" + (cl >= 1000 ? (cl / 1000).toFixed(0) + "k" : fmtNum(cl))}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ padding: "16px 20px", marginTop: "auto" }}>
        <button
          onClick={handleShare}
          disabled={!hasData}
          style={{
            width: "100%", padding: "10px 14px",
            background: hasData ? green : surf,
            color: hasData ? "#fff" : muted,
            border: `1px solid ${hasData ? green : bdr}`,
            borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: hasData ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "opacity .15s", fontFamily: "inherit",
          }}
          onMouseEnter={(e) => { if (hasData) e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <ChevronRight style={{ height: 13, width: 13 }} />
          Share model with Felix
        </button>
        <p style={{ fontSize: 11, color: muted, textAlign: "center", marginTop: 8, opacity: 0.7 }}>
          Felix will reference your exact numbers
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AgentChat() {
  const params  = useParams();
  const router  = useRouter();
  const agentId = params.agentId as string;
  const agent   = getAgentById(agentId);
  const isFelix = agentId === "felix";
  const isPatel = agentId === "patel";

  const [uiMessages,      setUiMessages]      = useState<UiMessage[]>([]);
  const [apiMessages,     setApiMessages]     = useState<ApiMessage[]>([]);
  const [input,           setInput]           = useState("");
  const [typing,          setTyping]          = useState(false);
  const [showPrompts,     setShowPrompts]     = useState(true);
  const [userId,          setUserId]          = useState<string | null>(null);
  const [conversationId,  setConversationId]  = useState<string | null>(null);
  const [historyLoading,  setHistoryLoading]  = useState(true);
  const [activeArtifact,  setActiveArtifact]  = useState<ArtifactData | null>(null);
  const [artifactHistory, setArtifactHistory] = useState<ArtifactData[]>([]);
  const [generatingArtifact, setGeneratingArtifact] = useState(false);
  const [actionItems,     setActionItems]     = useState<{ id: string; action_text: string; priority: string; status: string }[]>([]);
  const [extractingActions, setExtractingActions] = useState(false);
  const [showActions,     setShowActions]     = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const hasPanel = isFelix || (isPatel && activeArtifact !== null);

  useEffect(() => {
    if (!agent) router.push("/founder/agents");
  }, [agent, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [uiMessages, typing]);

  // ── load conversation history + artifacts ──────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setHistoryLoading(false); return; }
        setUserId(user.id);

        const { data: conv } = await supabase
          .from("agent_conversations")
          .select("id")
          .eq("user_id", user.id)
          .eq("agent_id", agentId)
          .order("last_message_at", { ascending: false })
          .limit(1)
          .single();

        if (!conv) { setHistoryLoading(false); return; }
        setConversationId(conv.id);

        const { data: msgs } = await supabase
          .from("agent_messages")
          .select("role, content")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true });

        if (msgs && msgs.length > 0) {
          setUiMessages(msgs.map(m => ({
            role: (m.role === "user" ? "user" : "agent") as "user" | "agent",
            text: m.content,
          })));
          setApiMessages(msgs.map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })));
          setShowPrompts(false);
        }

        // Load artifacts for Patel
        if (isPatel) {
          const { data: artifacts } = await supabase
            .from("agent_artifacts")
            .select("id, artifact_type, title, content")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: true });

          if (artifacts && artifacts.length > 0) {
            const mapped: ArtifactData[] = artifacts.map(a => ({
              id: a.id,
              type: a.artifact_type as ArtifactData["type"],
              title: a.title,
              content: a.content as Record<string, unknown>,
            }));
            setArtifactHistory(mapped);
            setActiveArtifact(mapped[mapped.length - 1]);
          }
        }
      } catch {
        // anonymous session fallback
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [agentId, isPatel]);

  // ── call AI ────────────────────────────────────────────────────────────────
  const callAI = useCallback(async (history: ApiMessage[], convId: string | null) => {
    setTyping(true);
    const isPatel = agentId === "patel";

    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          message: history[history.length - 1]?.content ?? "",
          conversationHistory: history.slice(0, -1),
          userId:         userId ?? undefined,
          conversationId: convId  ?? undefined,
          stream:         !isPatel,  // Patel needs 2-pass artifact generation
        }),
      });

      // ── Usage limit reached ────────────────────────────────────────────
      if (res.status === 429) {
        setUiMessages((p) => [...p, {
          role: "agent",
          text: "You've reached your monthly message limit (50 messages). Your limit resets on the 1st of next month.",
        }]);
        return;
      }

      // ── Streaming path (non-Patel) ─────────────────────────────────────
      if (!isPatel && res.headers.get("content-type")?.includes("text/event-stream")) {
        setUiMessages((p) => [...p, { role: "agent", text: "" }]);
        let fullText = "";
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);
              // Final meta event from our server
              if (parsed.conversationId !== undefined) {
                if (!convId) setConversationId(parsed.conversationId);
                continue;
              }
              const token = parsed.choices?.[0]?.delta?.content ?? "";
              if (token) {
                fullText += token;
                setUiMessages((p) => {
                  const updated = [...p];
                  updated[updated.length - 1] = { role: "agent", text: fullText };
                  return updated;
                });
              }
            } catch { /* skip malformed SSE line */ }
          }
        }

        setApiMessages((p) => [...p, { role: "assistant", content: fullText }]);
        return;
      }

      // ── Non-streaming path (Patel or fallback) ─────────────────────────
      const data = await res.json();
      const reply: string = data.response ?? data.content ?? "Sorry, I couldn't respond right now. Please try again.";
      if (data.conversationId && !convId) setConversationId(data.conversationId);
      setUiMessages((p) => [...p, { role: "agent", text: reply }]);
      setApiMessages((p) => [...p, { role: "assistant", content: reply }]);

      // Handle artifact from Patel
      if (data.artifact) {
        const newArtifact: ArtifactData = {
          id: data.artifact.id,
          type: data.artifact.type,
          title: data.artifact.title,
          content: data.artifact.content,
        };
        setArtifactHistory(prev => [...prev, newArtifact]);
        setActiveArtifact(newArtifact);
        setGeneratingArtifact(false);
      }
    } catch {
      setUiMessages((p) => [...p, { role: "agent", text: "Connection issue — please try again." }]);
    } finally {
      setTyping(false);
      setGeneratingArtifact(false);
    }
  }, [agentId, userId]);

  const handleSend = useCallback((text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || typing) return;
    setShowPrompts(false);
    setInput("");
    const newHistory = [...apiMessages, { role: "user" as const, content: msg }];
    setUiMessages((p) => [...p, { role: "user", text: msg }]);
    setApiMessages(newHistory);
    callAI(newHistory, conversationId);
  }, [input, typing, apiMessages, callAI, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleExtractActions = useCallback(async () => {
    if (extractingActions || apiMessages.length < 4) return;
    setExtractingActions(true);
    setShowActions(true);
    try {
      const res = await fetch("/api/agents/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationHistory: apiMessages, agentId, conversationId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.actions?.length) setActionItems(data.actions);
      }
    } catch {
      // silently fail
    } finally {
      setExtractingActions(false);
    }
  }, [extractingActions, apiMessages, agentId, conversationId]);

  const handleToggleActionStatus = useCallback(async (actionId: string, currentStatus: string) => {
    const next = currentStatus === "pending" ? "in_progress" : currentStatus === "in_progress" ? "done" : "pending";
    setActionItems(prev => prev.map(a => a.id === actionId ? { ...a, status: next } : a));
    await fetch("/api/agents/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId, status: next }),
    });
  }, []);

  if (!agent) return null;
  if (historyLoading) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bg }}>
      <p style={{ fontSize: 13, color: muted }}>Loading conversation…</p>
    </div>
  );

  const accent   = pillarAccent[agent.pillar] ?? blue;
  const pillar   = pillarLabel[agent.pillar]  ?? agent.pillar;
  const dimLabel = dimensionLabel[agent.improvesScore] ?? agent.improvesScore;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: bg, color: ink }}>

      {/* ── page header ─────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${bdr}`, padding: "20px 28px 16px", background: bg }}>
        <div style={{ maxWidth: hasPanel ? "none" : 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <Link
              href="/founder/dashboard"
              replace
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: muted, textDecoration: "none", transition: "color .15s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = ink)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = muted)}
            >
              <ArrowLeft style={{ height: 13, width: 13 }} />
              Dashboard
            </Link>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isFelix && (
                <div style={{ padding: "4px 12px", background: "#F0FDF4", border: `1px solid #86EFAC`, borderRadius: 999, fontSize: 11, color: green, fontWeight: 600 }}>
                  Live Model Active
                </div>
              )}
              {isPatel && (
                <div style={{ padding: "4px 12px", background: "#EFF6FF", border: `1px solid #93C5FD`, borderRadius: 999, fontSize: 11, color: blue, fontWeight: 600 }}>
                  Agentic GTM
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 11, color: muted }}>
                <TrendingUp style={{ height: 11, width: 11, color: accent }} />
                Improves {dimLabel}
              </div>
              {apiMessages.length >= 4 && (
                <button
                  onClick={handleExtractActions}
                  disabled={extractingActions}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: showActions ? ink : surf,
                    color: showActions ? bg : ink,
                    border: `1px solid ${showActions ? ink : bdr}`,
                    cursor: extractingActions ? "wait" : "pointer",
                    transition: "background .15s, color .15s",
                    fontFamily: "inherit",
                    opacity: extractingActions ? 0.6 : 1,
                  }}
                >
                  {extractingActions ? "Extracting…" : "Get action items"}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              height: 44, width: 44, borderRadius: 11, flexShrink: 0,
              background: surf, border: `2px solid ${accent}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 700, color: accent,
            }}>
              {agent.name[0]}
            </div>
            <div>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: accent, fontWeight: 600, marginBottom: 2 }}>
                {pillar}
              </p>
              <p style={{ fontSize: "clamp(1.1rem,2vw,1.4rem)", fontWeight: 300, letterSpacing: "-0.02em", color: ink, lineHeight: 1.1 }}>
                {agent.name}
              </p>
              <p style={{ fontSize: 13, color: muted, marginTop: 1 }}>{agent.specialty}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── body (chat + optional panel) ──────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── chat column ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* suggested prompts */}
            <AnimatePresence>
              {showPrompts && (
                <motion.div
                  key="prompts"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                    <div style={{
                      height: 28, width: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                      background: surf, border: `2px solid ${accent}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: accent,
                    }}>
                      {agent.name[0]}
                    </div>
                    <div style={{
                      background: surf, border: `1px solid ${bdr}`,
                      borderRadius: 14, borderTopLeftRadius: 4,
                      padding: "12px 16px", fontSize: 14, lineHeight: 1.65, color: ink, maxWidth: "82%",
                    }}>
                      {isFelix
                        ? "I'm Felix, your financial strategist. Enter your numbers in the model panel on the right, share them with me, and I'll give you precise advice specific to your situation."
                        : isPatel
                        ? "I'm Patel, your GTM strategist. Tell me about your product and target customers — once I have enough context, I can generate ICP documents, outreach sequences, competitor battle cards, and full GTM playbooks for you."
                        : `${agent.description} What would you like to work on?`}
                    </div>
                  </div>

                  <div style={{ paddingLeft: 38, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {agent.suggestedPrompts.slice(0, 5).map((p, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(p)}
                        style={{
                          padding: "7px 14px", borderRadius: 999, fontSize: 12,
                          background: bg, border: `1px solid ${bdr}`, color: muted,
                          cursor: "pointer", transition: "border-color .15s, color .15s",
                          fontFamily: "inherit",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = ink; e.currentTarget.style.color = ink; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.color = muted; }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* message thread */}
            {uiMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{ display: "flex", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}
              >
                {msg.role === "agent" && (
                  <div style={{
                    height: 28, width: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                    background: surf, border: `2px solid ${accent}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: accent,
                  }}>
                    {agent.name[0]}
                  </div>
                )}
                <div style={{
                  maxWidth: "78%",
                  padding: "11px 16px",
                  fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap",
                  borderRadius: 14,
                  background:          msg.role === "user" ? ink  : surf,
                  color:               msg.role === "user" ? bg   : ink,
                  border:              msg.role === "agent" ? `1px solid ${bdr}` : "none",
                  borderTopLeftRadius: msg.role === "agent" ? 4   : 14,
                  borderTopRightRadius:msg.role === "user"  ? 4   : 14,
                }}>
                  {msg.text}
                </div>
              </motion.div>
            ))}

            {/* typing indicator */}
            {typing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 10 }}>
                <div style={{
                  height: 28, width: 28, borderRadius: 8, flexShrink: 0,
                  background: surf, border: `2px solid ${accent}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: accent,
                }}>
                  {agent.name[0]}
                </div>
                <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, borderTopLeftRadius: 4, padding: "14px 18px", display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 0.18, 0.36].map((d, i) => (
                    <motion.div key={i}
                      style={{ height: 5, width: 5, background: muted, borderRadius: "50%" }}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: d }}
                    />
                  ))}
                  {generatingArtifact && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: muted }}>Generating deliverable…</span>
                  )}
                </div>
              </motion.div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ── Felix financial panel ───────────────────────────────────────── */}
        {isFelix && <FinancialPanel onShare={(ctx) => handleSend(ctx)} />}

        {/* ── Patel deliverable panel ─────────────────────────────────────── */}
        {isPatel && activeArtifact && (
          <DeliverablePanel
            artifact={activeArtifact}
            artifactHistory={artifactHistory}
            onSelectArtifact={setActiveArtifact}
            onClose={() => setActiveArtifact(null)}
            onRefine={(feedback) => handleSend(`Please refine the ${activeArtifact.type.replace(/_/g, " ")}: ${feedback}`)}
          />
        )}
      </div>

      {/* ── input bar ──────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${bdr}`, padding: "14px 28px", background: bg }}>
        <div style={{
          maxWidth: hasPanel ? "none" : 680, margin: "0 auto",
          display: "flex", alignItems: "flex-end", gap: 10,
          paddingRight: hasPanel ? (isFelix ? 356 : 436) : 0,
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${agent.name} anything about ${agent.specialty.toLowerCase()}…`}
            disabled={typing}
            rows={1}
            style={{
              flex: 1,
              background: surf, border: `1px solid ${bdr}`, borderRadius: 8,
              padding: "11px 14px", fontSize: 14, color: ink,
              resize: "none", outline: "none", fontFamily: "inherit",
              lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
              opacity: typing ? 0.5 : 1, cursor: typing ? "not-allowed" : "text",
            }}
            onFocus={(e)  => { e.currentTarget.style.borderColor = ink; }}
            onBlur={(e)   => { e.currentTarget.style.borderColor = bdr; }}
            onInput={(e)  => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || typing}
            style={{
              height: 42, width: 42, flexShrink: 0,
              background: !input.trim() || typing ? surf : ink,
              border: `1px solid ${!input.trim() || typing ? bdr : ink}`,
              borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: !input.trim() || typing ? "not-allowed" : "pointer",
              transition: "background .15s, border-color .15s",
            }}
          >
            <Send style={{ height: 15, width: 15, color: !input.trim() || typing ? muted : bg }} />
          </button>
        </div>
        <p style={{
          textAlign: "center", fontSize: 11, color: muted,
          marginTop: 8, opacity: 0.5,
          paddingRight: hasPanel ? (isFelix ? 356 : 436) : 0,
        }}>
          Enter to send · Shift+Enter for new line · Sessions auto-save
        </p>
      </div>

      {/* ── action items panel ───────────────────────────────────────────────── */}
      {showActions && (
        <div style={{
          flexShrink: 0, borderTop: `1px solid ${bdr}`, padding: "16px 28px",
          background: surf,
          paddingRight: hasPanel ? (isFelix ? `${356 + 28}px` : `${436 + 28}px`) : 28,
        }}>
          <div style={{ maxWidth: hasPanel ? "none" : 680, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: ink, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Action Items
              </p>
              <button
                onClick={() => setShowActions(false)}
                style={{ fontSize: 11, color: muted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Dismiss
              </button>
            </div>
            {extractingActions && actionItems.length === 0 ? (
              <p style={{ fontSize: 13, color: muted }}>Extracting action items…</p>
            ) : actionItems.length === 0 ? (
              <p style={{ fontSize: 13, color: muted }}>No action items found. Continue the conversation and try again.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {actionItems.map((item) => {
                  const priorityColor = item.priority === "high" ? "#DC2626" : item.priority === "medium" ? "#D97706" : muted;
                  const isDone = item.status === "done";
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleActionStatus(item.id, item.status)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 12px", borderRadius: 8,
                        background: bg, border: `1px solid ${bdr}`,
                        cursor: "pointer", transition: "border-color .15s",
                        opacity: isDone ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ink; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = bdr; }}
                    >
                      {/* status circle */}
                      <div style={{
                        height: 16, width: 16, borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${isDone ? muted : item.status === "in_progress" ? accent : bdr}`,
                        background: isDone ? muted : item.status === "in_progress" ? accent : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isDone && <span style={{ fontSize: 9, color: bg, fontWeight: 700 }}>✓</span>}
                        {item.status === "in_progress" && <span style={{ fontSize: 8, color: bg, fontWeight: 700 }}>→</span>}
                      </div>
                      <span style={{ flex: 1, fontSize: 13, color: isDone ? muted : ink, textDecoration: isDone ? "line-through" : "none" }}>
                        {item.action_text}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: priorityColor, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {item.priority}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
