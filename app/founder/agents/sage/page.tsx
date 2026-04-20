"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, CheckCircle2,
  MessageSquare, Package, ListChecks, FileText,
  RefreshCw, ExternalLink,
  Target, TrendingUp, AlertTriangle, BarChart3, Shield,
  DollarSign, Users, Zap, Globe,
} from "lucide-react";
import { bg, surf, bdr, ink, muted } from "@/features/agents/shared/constants/colors";
import { ARTIFACT_META } from "@/features/agents/shared/constants/artifact-meta";
import { DeliverablePanel } from "@/features/agents/shared/components/DeliverablePanel";
import { WorkspaceSidebar } from "@/features/agents/shared/components/WorkspaceSidebar";
import type { ArtifactData } from "@/features/agents/types/agent.types";

// ─── constants ────────────────────────────────────────────────────────────────

const accent = "#6D28D9"; // deep violet — strategy/wisdom

const SAGE_DELIVERABLES = [
  { type: "strategic_plan",           icon: Target,        label: "Strategic Plan",        description: "12-month vision, 3 bets, Q1 OKRs, risk register" },
  { type: "investor_readiness_report", icon: TrendingUp,    label: "Investor Readiness",    description: "Score across 6 dimensions + gaps + pitch narrative" },
  { type: "contradiction_report",     icon: AlertTriangle, label: "Contradiction Report",  description: "Conflicts between agent plans — severity + resolution" },
  { type: "okr_health_report",        icon: BarChart3,     label: "OKR Health Report",     description: "KR progress: on-track / at-risk / off-track" },
  { type: "crisis_playbook",          icon: Shield,        label: "Crisis Playbook",       description: "48-hour actions, stabilisation, comms plan" },
];

const SUGGESTED = [
  "What's my investor readiness score right now?",
  "Are there any contradictions in my current plans?",
  "Build a 12-month strategic plan",
  "Run an OKR health check",
  "How do I prepare for a Series A?",
  "What's my single biggest strategic risk?",
];

const READINESS_DIMENSIONS = [
  { key: "gtm",       label: "Go-to-Market", icon: Target },
  { key: "financial", label: "Financial",     icon: DollarSign },
  { key: "team",      label: "Team",          icon: Users },
  { key: "product",   label: "Product/PMF",   icon: Zap },
  { key: "market",    label: "Market",        icon: Globe },
  { key: "traction",  label: "Traction",      icon: TrendingUp },
] as const;

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = "chat" | "readiness" | "deliverables" | "actions";

interface UiMessage  { role: "agent" | "user" | "tool"; text: string; toolActivity?: { toolName: string; label: string; status: "running" | "done"; summary?: string }; }
interface ApiMessage { role: "user" | "assistant"; content: string; }
interface ActionItem { id: string; action_text: string; priority: string; status: string; action_type?: string; cta_label?: string; }

interface DashStats {
  deliverables: number;
  openActions:  number;
  composite:    number;
}

interface ReadinessScores {
  gtm:       number;
  financial: number;
  team:      number;
  product:   number;
  market:    number;
  traction:  number;
  [key: string]: number;
}

interface RawArtifact {
  id: string; artifact_type: string; title: string;
  content: Record<string, unknown>; created_at: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 75) return "#16A34A";
  if (score >= 50) return "#D97706";
  return "#DC2626";
}

function scoreLabel(composite: number): string {
  if (composite >= 75) return "Ready to Raise";
  if (composite >= 50) return "Getting Close";
  return "Not Ready";
}

function composite(scores: ReadinessScores): number {
  const keys = Object.keys(scores);
  if (!keys.length) return 0;
  return Math.round(keys.reduce((sum, k) => sum + scores[k], 0) / keys.length);
}

function lowestDimension(scores: ReadinessScores): { label: string; score: number } {
  const dim = READINESS_DIMENSIONS.reduce((lowest, d) => {
    const s = scores[d.key] ?? 0;
    return s < (scores[lowest.key] ?? 0) ? d : lowest;
  }, READINESS_DIMENSIONS[0]);
  return { label: dim.label, score: scores[dim.key] ?? 0 };
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function SageWorkspace() {
  const searchParams     = useSearchParams();
  const targetArtifactId = searchParams.get("artifact");

  const [tab, setTab]               = useState<Tab>("chat");
  const [uiMessages, setUiMessages] = useState<UiMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [input, setInput]           = useState("");
  const [typing, setTyping]         = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const [userId, setUserId]         = useState<string | null>(null);
  const [conversationId, setConvId] = useState<string | null>(null);
  const [historyLoading, setHistLoad] = useState(true);

  const [dashStats, setDashStats]   = useState<DashStats>({ deliverables: 0, openActions: 0, composite: 0 });
  const [readinessScores, setReadinessScores] = useState<ReadinessScores>({ gtm: 0, financial: 0, team: 0, product: 0, market: 0, traction: 0 });
  const [readinessLoading, setReadinessLoad] = useState(true);

  const [artifactHistory, setArtHistory] = useState<(ArtifactData & { created_at: string })[]>([]);
  const [actions, setActions]        = useState<ActionItem[]>([]);
  const [actionsLoading, setActLoad] = useState(true);
  const [openArtifact, setOpenArtifact] = useState<(ArtifactData & { created_at: string }) | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/auth/session").then(r => r.json()).then(d => { if (d?.user?.id) setUserId(d.user.id); });
  }, []);

  useEffect(() => {
    if (!userId) return;
    async function loadAll() {
      const hr = await fetch(`/api/agents/chat?agentId=sage&limit=40`);
      if (hr.ok) {
        const hd = await hr.json();
        const msgs = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role === "assistant" ? "agent" : "user", text: m.content }));
        const api  = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role, content: m.content }));
        setUiMessages(msgs); setApiMessages(api);
        if (msgs.length) setShowPrompts(false);
        if (hd.conversationId) setConvId(hd.conversationId);
      }
      setHistLoad(false);

      const gr = await fetch(`/api/agents/goals?agentId=sage`);
      if (gr.ok) {
        const gd = await gr.json();
        setDashStats(p => ({ ...p, deliverables: gd.deliverables?.length ?? 0 }));
        const snap = gd.state_snapshot?.scores as Record<string, number> | undefined;
        if (snap) {
          const scores: ReadinessScores = {
            gtm:       snap.gtm       ?? 0,
            financial: snap.financial ?? 0,
            team:      snap.team      ?? 0,
            product:   snap.product   ?? 0,
            market:    snap.market    ?? 0,
            traction:  snap.traction  ?? 0,
          };
          setReadinessScores(scores);
          setDashStats(p => ({ ...p, composite: composite(scores) }));
        }
      }
      setReadinessLoad(false);

      const ar = await fetch(`/api/agents/artifacts?agentId=sage&limit=12`);
      if (ar.ok) {
        const ad = await ar.json();
        setArtHistory((ad.artifacts ?? []).map((a: RawArtifact) => ({
          id: a.id, type: a.artifact_type as ArtifactData["type"],
          title: a.title, content: a.content, created_at: a.created_at,
        })));
      }

      const acr = await fetch(`/api/agents/actions?agentId=sage`);
      if (acr.ok) {
        const acd = await acr.json();
        const acts = acd.actions ?? [];
        setActions(acts);
        setDashStats(p => ({ ...p, openActions: acts.filter((a: ActionItem) => a.status !== "done").length }));
      }
      setActLoad(false);
    }
    loadAll();
  }, [userId]);

  useEffect(() => {
    if (!targetArtifactId || !artifactHistory.length) return;
    const found = artifactHistory.find(a => a.id === targetArtifactId);
    if (found) { setOpenArtifact(found); setTab("deliverables"); }
  }, [targetArtifactId, artifactHistory]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [uiMessages]);

  // ── send ──────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || typing) return;
    setShowPrompts(false); setTyping(true);
    setTab("chat");
    const userMsg: UiMessage  = { role: "user", text };
    const userApi: ApiMessage = { role: "user", content: text };
    setUiMessages(p => [...p, userMsg]);
    const nextApi = [...apiMessages, userApi];
    setApiMessages(nextApi); setInput("");

    abortRef.current?.abort();
    const ctrl = new AbortController(); abortRef.current = ctrl;
    let toolIdx = -1; let agentText = "";

    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST", signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "sage", messages: nextApi, stream: true, conversationId }),
      });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader(); const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim(); if (!payload || payload === "[DONE]") continue;
          let evt: Record<string, unknown>; try { evt = JSON.parse(payload); } catch { continue; }
          if (evt.type === "tool_start") {
            const tm: UiMessage = { role: "tool", text: "", toolActivity: { toolName: evt.toolName as string, label: evt.label as string, status: "running" } };
            if (toolIdx === -1) { setUiMessages(p => { toolIdx = p.length; return [...p, tm]; }); }
            else setUiMessages(p => p.map((m, i) => i === toolIdx ? { ...m, toolActivity: tm.toolActivity } : m));
          } else if (evt.type === "tool_done") {
            setUiMessages(p => p.map((m, i) => i === toolIdx ? { ...m, toolActivity: { ...m.toolActivity!, status: "done", summary: evt.summary as string } } : m));
            toolIdx = -1;
          } else if (evt.type === "text_delta") {
            agentText += evt.text as string;
            setUiMessages(p => {
              const idx = p.findLastIndex(m => m.role === "agent");
              return idx === -1 ? [...p, { role: "agent", text: agentText }] : p.map((m, i) => i === idx ? { ...m, text: agentText } : m);
            });
          } else if (evt.type === "conversation_id" && evt.id) setConvId(evt.id as string);
        }
      }
      setApiMessages(p => [...p, { role: "assistant", content: agentText }]);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setUiMessages(p => [...p, { role: "agent", text: "Something went wrong. Please try again." }]);
    } finally { setTyping(false); }
  }, [typing, apiMessages, conversationId]);

  async function toggleAction(id: string, status: string) {
    const next = status === "done" ? "pending" : "done";
    setActions(p => p.map(a => a.id === id ? { ...a, status: next } : a));
    await fetch(`/api/agents/actions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
  }

  const compositeScore = composite(readinessScores);
  const lowest = lowestDimension(readinessScores);

  // ─── sidebar ──────────────────────────────────────────────────────────────
  const Sidebar = (
    <WorkspaceSidebar
      name="Sage"
      role="CEO Advisor · Strategy"
      emoji="🧭"
      accent={accent}
      badge="STRATEGIC CORE"
      tabs={[
        { id: "chat",         label: "Chat",         icon: MessageSquare },
        { id: "readiness",    label: "Readiness",    icon: TrendingUp },
        { id: "deliverables", label: "Deliverables", icon: Package },
        { id: "actions",      label: "Actions",      icon: ListChecks, badge: dashStats.openActions > 0 ? dashStats.openActions : undefined },
      ]}
      activeTab={tab}
      onTabChange={id => setTab(id as Tab)}
      stats={[
        { label: "Readiness",    value: `${compositeScore}/100`, color: scoreColor(compositeScore) },
        { label: "Weakest",      value: lowest.label },
        { label: "Deliverables", value: dashStats.deliverables },
        { label: "Open Actions", value: dashStats.openActions, color: dashStats.openActions > 0 ? accent : undefined },
      ]}
      quickActions={SAGE_DELIVERABLES.slice(0, 4).map(d => ({
        label:   d.label,
        icon:    d.icon,
        onClick: () => sendMessage(`Generate a ${d.label}`),
      }))}
      alert={compositeScore < 50 ? { message: `Composite score ${compositeScore}/100 — not yet investor-ready`, color: "#DC2626" } : undefined}
    />
  );

  // ─── chat tab ─────────────────────────────────────────────────────────────
  const ChatTab = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        {historyLoading && (
          <div style={{ textAlign: "center", color: muted, fontSize: 13, padding: "40px 0" }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} /> Loading…
          </div>
        )}
        {!historyLoading && showPrompts && uiMessages.length === 0 && (
          <div style={{ maxWidth: 560, margin: "0 auto", paddingTop: 40 }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: `${accent}22`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, margin: "0 auto 12px", border: `1px solid ${accent}44` }}>🧭</div>
              <p style={{ fontSize: 17, fontWeight: 700, color: ink }}>Sage — CEO Advisor & Strategic Coordinator</p>
              <p style={{ fontSize: 13, color: muted, marginTop: 4 }}>Strategy, investor readiness, OKRs & cross-agent alignment</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => sendMessage(s)} style={{
                  padding: "12px 14px", borderRadius: 10, background: surf, border: `1px solid ${bdr}`,
                  color: ink, fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left",
                }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {uiMessages.map((m, i) => (
          <div key={i} style={{ marginBottom: 16, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "tool" && m.toolActivity ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                borderRadius: 8, background: `${accent}12`, border: `1px solid ${accent}30`,
                fontSize: 12, color: muted, maxWidth: "80%" }}>
                {m.toolActivity.status === "running"
                  ? <RefreshCw size={12} color={accent} style={{ animation: "spin 1s linear infinite" }} />
                  : <CheckCircle2 size={12} color={accent} />}
                <span style={{ fontWeight: 500 }}>{m.toolActivity.label}</span>
                {m.toolActivity.summary && <span>· {m.toolActivity.summary}</span>}
              </div>
            ) : (
              <div style={{
                maxWidth: "80%", padding: "10px 14px", borderRadius: 12, fontSize: 13, lineHeight: 1.55,
                background: m.role === "user" ? accent : surf,
                color:      m.role === "user" ? "#fff" : ink,
                border:     m.role === "user" ? "none" : `1px solid ${bdr}`,
                whiteSpace: "pre-wrap",
              }}>
                {m.text}
              </div>
            )}
          </div>
        ))}
        {typing && uiMessages[uiMessages.length - 1]?.role !== "agent" && (
          <div style={{ display: "flex", gap: 4, padding: "10px 14px", background: surf,
            border: `1px solid ${bdr}`, borderRadius: 12, width: "fit-content" }}>
            {[0,1,2].map(j => (
              <span key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: muted,
                display: "inline-block", animation: `bounce 0.9s ${j * 0.15}s infinite` }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "12px 20px 16px", borderTop: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end",
          background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "8px 12px" }}>
          <textarea rows={1} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }}}
            placeholder="Ask Sage about strategy, investor readiness, OKRs…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: 13, color: ink, resize: "none", fontFamily: "inherit", lineHeight: 1.5 }} />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || typing}
            style={{ width: 32, height: 32, borderRadius: 8, background: input.trim() && !typing ? accent : bdr,
              border: "none", cursor: input.trim() && !typing ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Send size={14} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );

  // ─── readiness tab ────────────────────────────────────────────────────────
  const ReadinessTab = (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* composite hero */}
        <div style={{ padding: "24px", borderRadius: 16, background: surf, border: `1px solid ${bdr}`,
          marginBottom: 24, display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <p style={{ fontSize: 48, fontWeight: 800, color: scoreColor(compositeScore), lineHeight: 1, margin: 0 }}>
              {compositeScore}
            </p>
            <p style={{ fontSize: 12, color: muted, margin: "4px 0 0", fontWeight: 500 }}>/ 100</p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: ink, margin: "0 0 4px" }}>Composite: {compositeScore}/100</p>
            <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(compositeScore),
              background: `${scoreColor(compositeScore)}18`, border: `1px solid ${scoreColor(compositeScore)}44`,
              borderRadius: 20, padding: "3px 12px" }}>
              {scoreLabel(compositeScore)}
            </span>
            <p style={{ fontSize: 12, color: muted, margin: "10px 0 0" }}>
              Average across all 6 investor readiness dimensions. Click any dimension to get a deep-dive analysis.
            </p>
          </div>
          <button
            onClick={() => { sendMessage("Run a full investor readiness assessment across all dimensions"); }}
            style={{ padding: "10px 18px", borderRadius: 10, background: accent, border: "none",
              color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
            Run Full Assessment
          </button>
        </div>

        {readinessLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: muted }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} /> Loading scores…
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {READINESS_DIMENSIONS.map(d => {
              const score = readinessScores[d.key] ?? 0;
              const color = scoreColor(score);
              const Icon  = d.icon;
              return (
                <button key={d.key}
                  onClick={() => { sendMessage(`Deep dive on my ${d.label} score — what's dragging it down and what should I fix first?`); }}
                  style={{ padding: "18px", borderRadius: 12, background: surf, border: `1px solid ${bdr}`,
                    cursor: "pointer", textAlign: "left", transition: "border-color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = bdr)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`,
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={16} color={color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>{d.label}</p>
                    </div>
                    <p style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1, margin: 0 }}>{score}</p>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: `${bdr}`, overflow: "hidden" }}>
                    <div style={{ width: `${score}%`, height: "100%", borderRadius: 3,
                      background: color, transition: "width 0.5s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: muted }}>0</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color }}>{score}/100</span>
                    <span style={{ fontSize: 10, color: muted }}>100</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ─── deliverables tab ─────────────────────────────────────────────────────
  const DeliverablesTab = (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, marginBottom: 4 }}>Deliverables</h2>
        <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Strategic plans, readiness reports & playbooks</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
          {SAGE_DELIVERABLES.map(d => (
            <button key={d.type} onClick={() => { sendMessage(`Generate a ${d.label}`); }}
              style={{ padding: "16px", borderRadius: 12, background: surf, border: `1px solid ${bdr}`,
                cursor: "pointer", textAlign: "left" }}>
              <d.icon size={20} color={accent} style={{ marginBottom: 10 }} />
              <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 4 }}>{d.label}</p>
              <p style={{ fontSize: 11, color: muted, margin: 0 }}>{d.description}</p>
            </button>
          ))}
        </div>
        {artifactHistory.length > 0 && (
          <>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 12 }}>Recent</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {artifactHistory.map(a => {
                const meta = ARTIFACT_META[a.type] ?? { icon: FileText, label: a.type, color: accent };
                const Icon = meta.icon;
                return (
                  <button key={a.id} onClick={() => setOpenArtifact(a)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                      borderRadius: 10, background: surf, border: `1px solid ${bdr}`, cursor: "pointer", textAlign: "left" }}>
                    <Icon size={16} color={meta.color ?? accent} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>{meta.label ?? a.title}</p>
                      <p style={{ fontSize: 11, color: muted, margin: 0 }}>{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                    <ExternalLink size={13} color={muted} />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ─── actions tab ──────────────────────────────────────────────────────────
  const ActionsTab = (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, marginBottom: 4 }}>Actions</h2>
        <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Sage-recommended strategic tasks</p>
        {actionsLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: muted }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} /> Loading…
          </div>
        ) : actions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
            <ListChecks size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No actions yet — chat with Sage to get strategic recommendations</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {actions.map(a => (
              <div key={a.id} style={{ padding: "14px 16px", borderRadius: 12, background: surf, border: `1px solid ${bdr}`,
                display: "flex", alignItems: "flex-start", gap: 12, opacity: a.status === "done" ? 0.55 : 1 }}>
                <button onClick={() => toggleAction(a.id, a.status)} style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                  background: a.status === "done" ? accent : "transparent",
                  border: `2px solid ${a.status === "done" ? accent : bdr}`,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {a.status === "done" && <CheckCircle2 size={10} color="#fff" />}
                </button>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: ink, margin: 0,
                    textDecoration: a.status === "done" ? "line-through" : "none" }}>{a.action_text}</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 600,
                      color: a.priority === "high" ? "#DC2626" : muted,
                      background: a.priority === "high" ? "#DC262612" : surf,
                      border: `1px solid ${a.priority === "high" ? "#DC262630" : bdr}`,
                      borderRadius: 4, padding: "1px 6px" }}>{a.priority}</span>
                    <button onClick={() => { sendMessage(`Execute: ${a.action_text}`); }}
                      style={{ fontSize: 10, fontWeight: 600, color: accent, background: `${accent}12`,
                        border: `1px solid ${accent}30`, borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>
                      {a.cta_label ?? "Execute"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-5px); } }
      `}</style>
      <div style={{ display: "flex", height: "100vh", background: bg, overflow: "hidden" }}>
        {Sidebar}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <div style={{ padding: "14px 24px", borderBottom: `1px solid ${bdr}`,
            display: "flex", alignItems: "center", gap: 12, background: surf }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accent}22`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧭</div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: ink }}>Sage</span>
              <span style={{ fontSize: 12, color: muted, marginLeft: 8 }}>CEO Advisor · Strategy & coordination</span>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: `${accent}18`,
                border: `1px solid ${accent}44`, borderRadius: 20, padding: "3px 10px", letterSpacing: "0.05em" }}>
                STRATEGIC CORE
              </span>
            </div>
          </div>
          {tab === "chat"         && ChatTab}
          {tab === "readiness"    && ReadinessTab}
          {tab === "deliverables" && DeliverablesTab}
          {tab === "actions"      && ActionsTab}
        </div>
      </div>

      <AnimatePresence>
        {openArtifact && (
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ position: "fixed", top: 0, right: 0, width: "min(680px, 90vw)", height: "100vh",
              zIndex: 50, boxShadow: "-4px 0 32px rgba(0,0,0,0.12)" }}>
            <DeliverablePanel
              artifact={openArtifact}
              artifactHistory={artifactHistory.filter(a => a.type === openArtifact.type)}
              onSelectArtifact={a => setOpenArtifact(a as (ArtifactData & { created_at: string }))}
              onClose={() => setOpenArtifact(null)}
              onRefine={instruction => { setOpenArtifact(null); setTab("chat"); setTimeout(() => sendMessage(`Refine the ${openArtifact.title}: ${instruction}`), 100); }}
              agentName="Sage"
              userId={userId ?? undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
