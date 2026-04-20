"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Zap, CheckCircle2,
  MessageSquare, Package, ListChecks, FileText,
  RefreshCw, ChevronRight, ExternalLink,
  TrendingUp, Target, Users, Search, BarChart3,
  Plus, Trash2, FlaskConical,
} from "lucide-react";
import { bg, surf, bdr, ink, muted } from "@/features/agents/shared/constants/colors";
import { ARTIFACT_META } from "@/features/agents/shared/constants/artifact-meta";
import { DeliverablePanel } from "@/features/agents/shared/components/DeliverablePanel";
import { WorkspaceSidebar } from "@/features/agents/shared/components/WorkspaceSidebar";
import type { ArtifactData } from "@/features/agents/types/agent.types";

// ─── constants ────────────────────────────────────────────────────────────────

const accent = "#EA580C"; // orange — growth/energy

const RILEY_DELIVERABLES = [
  { type: "growth_model",       icon: TrendingUp,  label: "Growth Model",       description: "Channel strategy, CAC targets, MoM growth projections" },
  { type: "ad_campaign",        icon: Target,      label: "Ad Campaign",        description: "Campaign structure, ad copy variants, bidding strategy" },
  { type: "referral_program",   icon: Users,       label: "Referral Program",   description: "Two-sided incentive, mechanic, viral coefficient model" },
  { type: "seo_brief",          icon: Search,      label: "SEO Brief",          description: "Keyword clusters mapped to ICP pain points" },
  { type: "experiment_backlog", icon: FlaskConical, label: "Experiment Backlog", description: "Prioritised growth experiments with hypotheses" },
  { type: "growth_report",      icon: BarChart3,   label: "Growth Report",      description: "CAC, MoM growth, channel ROAS, top experiments this month" },
];

const SUGGESTED = [
  "What growth channel should I focus on first?",
  "Build a Google Ads campaign for my product",
  "Design a referral program with viral mechanics",
  "Create a prioritised experiment backlog",
  "What's my CAC and how do I compress it?",
  "Build a 90-day growth model",
];

const EXP_STATUSES = [
  { id: "backlog", label: "Backlog",  color: "#6B7280" },
  { id: "running", label: "Running",  color: "#16A34A" },
  { id: "won",     label: "Won",      color: "#2563EB" },
  { id: "killed",  label: "Killed",   color: "#DC2626" },
] as const;

const CHANNELS = ["Paid", "SEO", "Referral", "Content", "Product", "Email", "Other"] as const;

type ExpStatus = typeof EXP_STATUSES[number]["id"];
type Channel   = typeof CHANNELS[number];

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = "chat" | "experiments" | "deliverables" | "actions";

interface UiMessage  { role: "agent" | "user" | "tool"; text: string; toolActivity?: { toolName: string; label: string; status: "running" | "done"; summary?: string }; }
interface ApiMessage { role: "user" | "assistant"; content: string; }
interface ActionItem { id: string; action_text: string; priority: string; status: string; action_type?: string; cta_label?: string; }

interface Experiment {
  id:         string;
  hypothesis: string;
  metric:     string;
  status:     ExpStatus;
  channel?:   string;
  result?:    string;
  created_at: string;
}

interface DashStats {
  running:      number;
  won:          number;
  backlog:      number;
  deliverables: number;
}

interface RawArtifact {
  id: string; artifact_type: string; title: string;
  content: Record<string, unknown>; created_at: string;
}

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ flex: 1, padding: "10px 12px", borderRadius: 8, background: bg, border: `1px solid ${bdr}` }}>
      <p style={{ fontSize: 18, fontWeight: 700, color: color ?? ink, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 10, color: muted, marginTop: 3, fontWeight: 500 }}>{label}</p>
    </div>
  );
}

// ─── experiment card ──────────────────────────────────────────────────────────

function ExperimentCard({
  experiment, onStatusChange, onDelete,
}: {
  experiment:    Experiment;
  onStatusChange:(id: string, status: ExpStatus) => void;
  onDelete:      (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusMeta = EXP_STATUSES.find(s => s.id === experiment.status)!;
  const nextStatuses = EXP_STATUSES.filter(s => s.id !== experiment.status);

  return (
    <div style={{ borderRadius: 10, background: surf, border: `1px solid ${bdr}`, overflow: "hidden", marginBottom: 8 }}>
      <div style={{ padding: "11px 13px", cursor: "pointer" }} onClick={() => setExpanded(p => !p)}>
        {/* hypothesis */}
        <p style={{
          fontSize: 12, fontWeight: 600, color: ink, margin: "0 0 6px",
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {experiment.hypothesis}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {/* metric */}
          <span style={{ fontSize: 10, color: muted, background: bg, border: `1px solid ${bdr}`,
            borderRadius: 4, padding: "2px 6px", fontWeight: 500 }}>
            📏 {experiment.metric}
          </span>

          {/* channel badge */}
          {experiment.channel && (
            <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: `${accent}18`,
              border: `1px solid ${accent}30`, borderRadius: 4, padding: "2px 6px" }}>
              {experiment.channel}
            </span>
          )}

          {/* status indicators */}
          {experiment.status === "running" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "#16A34A", fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#16A34A",
                display: "inline-block", animation: "pulse 1.5s ease-in-out infinite" }} />
              Running
            </span>
          )}
          {experiment.status === "won" && (
            <span style={{ fontSize: 11, color: "#16A34A", fontWeight: 700 }}>✓ Won</span>
          )}
          {experiment.status === "killed" && (
            <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 700 }}>× Killed</span>
          )}

          <ChevronRight size={12} color={muted}
            style={{ marginLeft: "auto", transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
        </div>

        {/* result */}
        {(experiment.status === "won" || experiment.status === "killed") && experiment.result && (
          <p style={{ fontSize: 11, color: muted, margin: "6px 0 0",
            borderTop: `1px solid ${bdr}`, paddingTop: 6 }}>
            {experiment.result}
          </p>
        )}
      </div>

      {expanded && (
        <div style={{ padding: "0 13px 13px", borderTop: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: muted, letterSpacing: "0.06em", margin: "10px 0 6px" }}>MOVE TO</p>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
            {nextStatuses.map(s => (
              <button key={s.id} onClick={() => onStatusChange(experiment.id, s.id)}
                style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                  background: "transparent", border: `1px solid ${s.color}`, color: s.color, cursor: "pointer" }}>
                {s.label}
              </button>
            ))}
          </div>
          <button onClick={() => onDelete(experiment.id)}
            style={{ width: 30, height: 30, borderRadius: 7, background: "transparent",
              border: `1px solid ${bdr}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trash2 size={12} color={muted} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function RileyWorkspace() {
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

  const [dashStats, setDashStats]   = useState<DashStats>({ running: 0, won: 0, backlog: 0, deliverables: 0 });
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [expLoading, setExpLoad]    = useState(true);

  // add experiment form
  const [addingExp,      setAddingExp]      = useState(false);
  const [newHypothesis,  setNewHypothesis]  = useState("");
  const [newMetric,      setNewMetric]      = useState("");
  const [newChannel,     setNewChannel]     = useState<Channel | "">("");

  const [artifactHistory, setArtHistory]   = useState<(ArtifactData & { created_at: string })[]>([]);
  const [actions, setActions]              = useState<ActionItem[]>([]);
  const [actionsLoading, setActLoad]       = useState(true);
  const [openArtifact, setOpenArtifact]    = useState<(ArtifactData & { created_at: string }) | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/auth/session").then(r => r.json()).then(d => { if (d?.user?.id) setUserId(d.user.id); });
  }, []);

  useEffect(() => {
    if (!userId) return;
    async function loadAll() {
      // history
      const hr = await fetch(`/api/agents/chat?agentId=riley&limit=40`);
      if (hr.ok) {
        const hd = await hr.json();
        const msgs = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role === "assistant" ? "agent" : "user", text: m.content }));
        const api  = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role, content: m.content }));
        setUiMessages(msgs); setApiMessages(api);
        if (msgs.length) setShowPrompts(false);
        if (hd.conversationId) setConvId(hd.conversationId);
      }
      setHistLoad(false);

      // experiments
      const er = await fetch(`/api/agents/experiments`);
      if (er.ok) {
        const ed = await er.json();
        const exps: Experiment[] = (ed.experiments ?? []).map((e: Record<string, unknown>) => ({
          id:         e.id as string,
          hypothesis: e.hypothesis as string,
          metric:     e.metric as string,
          status:     (e.status ?? "backlog") as ExpStatus,
          channel:    e.channel as string | undefined,
          result:     e.result as string | undefined,
          created_at: e.created_at as string,
        }));
        setExperiments(exps);
        setDashStats(p => ({
          ...p,
          running: exps.filter(e => e.status === "running").length,
          won:     exps.filter(e => e.status === "won").length,
          backlog: exps.filter(e => e.status === "backlog").length,
        }));
      }
      setExpLoad(false);

      // goals/stats
      const gr = await fetch(`/api/agents/goals?agentId=riley`);
      if (gr.ok) {
        const gd = await gr.json();
        setDashStats(p => ({ ...p, deliverables: gd.deliverables?.length ?? 0 }));
      }

      // artifacts
      const ar = await fetch(`/api/agents/artifacts?agentId=riley&limit=12`);
      if (ar.ok) {
        const ad = await ar.json();
        setArtHistory((ad.artifacts ?? []).map((a: RawArtifact) => ({
          id: a.id, type: a.artifact_type as ArtifactData["type"],
          title: a.title, content: a.content, created_at: a.created_at,
        })));
      }

      // actions
      const acr = await fetch(`/api/agents/actions?agentId=riley`);
      if (acr.ok) {
        const acd = await acr.json();
        setActions(acd.actions ?? []);
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

  // ── experiment CRUD ───────────────────────────────────────────────────────
  async function addExperiment() {
    if (!newHypothesis.trim() || !newMetric.trim()) return;
    const res = await fetch("/api/agents/experiments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hypothesis: newHypothesis.trim(),
        metric:     newMetric.trim(),
        channel:    newChannel || undefined,
        status:     "backlog",
      }),
    });
    if (res.ok) {
      const { experiment } = await res.json();
      const exp: Experiment = { ...experiment, status: "backlog" as ExpStatus, created_at: experiment.created_at ?? new Date().toISOString() };
      setExperiments(p => [...p, exp]);
      setDashStats(p => ({ ...p, backlog: p.backlog + 1 }));
    }
    setNewHypothesis(""); setNewMetric(""); setNewChannel(""); setAddingExp(false);
  }

  async function updateExpStatus(id: string, status: ExpStatus) {
    const prev = experiments.find(e => e.id === id);
    setExperiments(p => p.map(e => e.id === id ? { ...e, status } : e));
    if (prev) {
      setDashStats(p => {
        const next = { ...p };
        if (prev.status === "running") next.running = Math.max(0, p.running - 1);
        if (prev.status === "won")     next.won     = Math.max(0, p.won - 1);
        if (prev.status === "backlog") next.backlog  = Math.max(0, p.backlog - 1);
        if (status === "running") next.running += 1;
        if (status === "won")     next.won     += 1;
        if (status === "backlog") next.backlog  += 1;
        return next;
      });
    }
    await fetch(`/api/agents/experiments/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
  }

  async function deleteExperiment(id: string) {
    const prev = experiments.find(e => e.id === id);
    setExperiments(p => p.filter(e => e.id !== id));
    if (prev) {
      setDashStats(p => {
        const next = { ...p };
        if (prev.status === "running") next.running = Math.max(0, p.running - 1);
        if (prev.status === "won")     next.won     = Math.max(0, p.won - 1);
        if (prev.status === "backlog") next.backlog  = Math.max(0, p.backlog - 1);
        return next;
      });
    }
    await fetch(`/api/agents/experiments/${id}`, { method: "DELETE" });
  }

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
        body: JSON.stringify({ agentId: "riley", messages: nextApi, stream: true, conversationId }),
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

  // ─── sidebar ──────────────────────────────────────────────────────────────
  const Sidebar = (
    <WorkspaceSidebar
      name="Riley"
      role="CGO · Growth & Demand"
      emoji="🚀"
      accent={accent}
      badge="GROWTH OPS"
      tabs={[
        { id: "chat",         label: "Chat",         icon: MessageSquare },
        { id: "experiments",  label: "Experiments",  icon: FlaskConical, badge: dashStats.running > 0 ? dashStats.running : undefined },
        { id: "deliverables", label: "Deliverables", icon: Package },
        { id: "actions",      label: "Actions",      icon: ListChecks },
      ]}
      activeTab={tab}
      onTabChange={id => setTab(id as Tab)}
      stats={[
        { label: "Running",      value: dashStats.running,      color: dashStats.running > 0 ? "#16A34A" : undefined },
        { label: "Won",          value: dashStats.won,          color: dashStats.won > 0 ? "#2563EB" : undefined },
        { label: "Backlog",      value: dashStats.backlog,      color: dashStats.backlog > 0 ? accent : undefined },
        { label: "Deliverables", value: dashStats.deliverables },
      ]}
      quickActions={RILEY_DELIVERABLES.slice(0, 4).map(d => ({
        label:   d.label,
        icon:    d.icon,
        onClick: () => { sendMessage(`Generate a ${d.label}`); setTab("chat"); },
      }))}
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
                fontSize: 24, margin: "0 auto 12px", border: `1px solid ${accent}44` }}>🚀</div>
              <p style={{ fontSize: 17, fontWeight: 700, color: ink }}>Riley — Chief Growth Officer</p>
              <p style={{ fontSize: 13, color: muted, marginTop: 4 }}>Growth models, ad campaigns, experiments & referral programs</p>
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
            placeholder="Ask Riley about growth channels, CAC, referral programs…"
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

  // ─── experiments tab ──────────────────────────────────────────────────────
  const ExperimentsTab = (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0 }}>Experiment Tracker</h2>
            <p style={{ fontSize: 12, color: muted, marginTop: 3 }}>Kanban board for all growth experiments</p>
          </div>
          <button onClick={() => setAddingExp(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              borderRadius: 8, background: accent, border: "none",
              color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={13} /> Add Experiment
          </button>
        </div>

        {/* add form */}
        <AnimatePresence>
          {addingExp && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ padding: "16px", borderRadius: 12, background: surf, border: `1px solid ${accent}44`, marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 12 }}>New Experiment</p>
              <textarea
                autoFocus
                value={newHypothesis}
                onChange={e => setNewHypothesis(e.target.value)}
                placeholder="Hypothesis — e.g. 'If we add a referral CTA on the success screen, our viral coefficient will increase above 0.3'"
                rows={3}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`,
                  background: bg, fontSize: 12, color: ink, outline: "none", fontFamily: "inherit",
                  resize: "vertical", marginBottom: 10, boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <input value={newMetric} onChange={e => setNewMetric(e.target.value)} placeholder="Primary metric *"
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: "none", fontFamily: "inherit" }} />
                <select value={newChannel} onChange={e => setNewChannel(e.target.value as Channel | "")}
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: newChannel ? ink : muted, outline: "none", fontFamily: "inherit" }}>
                  <option value="">Channel (optional)</option>
                  {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addExperiment} disabled={!newHypothesis.trim() || !newMetric.trim()}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: accent, border: "none",
                    color: "#fff", fontSize: 12, fontWeight: 600,
                    cursor: newHypothesis.trim() && newMetric.trim() ? "pointer" : "default",
                    opacity: newHypothesis.trim() && newMetric.trim() ? 1 : 0.5 }}>
                  Add Experiment
                </button>
                <button onClick={() => { setAddingExp(false); setNewHypothesis(""); setNewMetric(""); setNewChannel(""); }}
                  style={{ padding: "8px 16px", borderRadius: 8, background: "transparent",
                    border: `1px solid ${bdr}`, fontSize: 12, color: muted, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {expLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: muted }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} /> Loading…
          </div>
        ) : (
          /* kanban columns */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
            {EXP_STATUSES.map(col => {
              const colExps = experiments.filter(e => e.status === col.id);
              return (
                <div key={col.id}>
                  {/* column header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "6px 10px",
                    borderRadius: 8, background: `${col.color}12`, border: `1px solid ${col.color}22` }}>
                    {col.id === "running" && (
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.color,
                        flexShrink: 0, animation: "pulse 1.5s ease-in-out infinite" }} />
                    )}
                    {col.id === "won"     && <span style={{ fontSize: 12, color: col.color }}>✓</span>}
                    {col.id === "killed"  && <span style={{ fontSize: 12, color: col.color }}>×</span>}
                    {col.id === "backlog" && <FlaskConical size={11} color={col.color} />}
                    <span style={{ fontSize: 12, fontWeight: 700, color: col.color }}>{col.label}</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: col.color,
                      background: `${col.color}20`, borderRadius: 10, padding: "1px 6px" }}>
                      {colExps.length}
                    </span>
                  </div>

                  {/* cards */}
                  {colExps.length === 0 ? (
                    <div style={{ padding: "20px 0", textAlign: "center", color: muted, fontSize: 11 }}>
                      No experiments
                    </div>
                  ) : (
                    colExps.map(exp => (
                      <ExperimentCard
                        key={exp.id}
                        experiment={exp}
                        onStatusChange={updateExpStatus}
                        onDelete={deleteExperiment}
                      />
                    ))
                  )}
                </div>
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
        <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Growth models, campaigns, referral programs & reports</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
          {RILEY_DELIVERABLES.map(d => (
            <button key={d.type} onClick={() => { sendMessage(`Generate a ${d.label}`); setTab("chat"); }}
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
        <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Riley-recommended growth tasks</p>
        {actionsLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: muted }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} /> Loading…
          </div>
        ) : actions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
            <ListChecks size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No actions yet — chat with Riley to get growth recommendations</p>
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
                    <button onClick={() => { sendMessage(`Execute: ${a.action_text}`); setTab("chat"); }}
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
        @keyframes pulse  { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
      <div style={{ display: "flex", height: "100vh", background: bg, overflow: "hidden" }}>
        {Sidebar}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <div style={{ padding: "14px 24px", borderBottom: `1px solid ${bdr}`,
            display: "flex", alignItems: "center", gap: 12, background: surf }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accent}22`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🚀</div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: ink }}>Riley</span>
              <span style={{ fontSize: 12, color: muted, marginLeft: 8 }}>Chief Growth Officer · Growth & Demand</span>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: `${accent}18`,
                border: `1px solid ${accent}44`, borderRadius: 20, padding: "3px 10px", letterSpacing: "0.05em" }}>
                GROWTH OPS
              </span>
            </div>
          </div>
          {tab === "chat"        && ChatTab}
          {tab === "experiments" && ExperimentsTab}
          {tab === "deliverables"&& DeliverablesTab}
          {tab === "actions"     && ActionsTab}
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
              agentName="Riley"
              userId={userId ?? undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
