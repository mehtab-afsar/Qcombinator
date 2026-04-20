"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Zap, CheckCircle2,
  MessageSquare, Package, ListChecks, FileText,
  BarChart3, Target, RefreshCw, ChevronRight,
  X, TrendingUp, Users, Activity, ExternalLink,
  AlertTriangle, Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { WorkspaceSidebar } from "@/features/agents/shared/components/WorkspaceSidebar";
import { bg, surf, bdr, ink, muted } from "@/features/agents/shared/constants/colors";
import { ARTIFACT_META } from "@/features/agents/shared/constants/artifact-meta";
import { DeliverablePanel } from "@/features/agents/shared/components/DeliverablePanel";
import type { ArtifactData } from "@/features/agents/types/agent.types";

// ─── constants ────────────────────────────────────────────────────────────────

const accent = "#7C3AED"; // purple — product-strategy pillar
const SIDEBAR_W = 264;

const NOVA_DELIVERABLES = [
  { type: "pmf_survey",          icon: FileText,  label: "PMF Survey",          description: "Sean Ellis-style survey to measure fit" },
  { type: "interview_script",    icon: Users,     label: "Interview Script",     description: "JTBD discovery interview questions" },
  { type: "product_roadmap",     icon: Target,    label: "Product Roadmap",     description: "Now/Next/Later outcome-based plan" },
  { type: "feature_priority",    icon: BarChart3, label: "Feature Priority",    description: "RICE/ICE scoring for backlog items" },
  { type: "assumption_map",      icon: Lightbulb, label: "Assumption Map",      description: "Riskiest assumptions ranked + validation plan" },
  { type: "pivot_analysis",      icon: TrendingUp,label: "Pivot/Persevere",     description: "Evidence-based pivot vs stay decision" },
];

const SUGGESTED = [
  "What are my riskiest product assumptions?",
  "Generate a PMF survey for my product",
  "Help me design a discovery interview script",
  "Build a RICE-scored feature priority list",
  "Should I pivot or persevere based on my metrics?",
  "Create a Now/Next/Later roadmap",
];

const PMF_SIGNALS = [
  { key: "retention_d7",    label: "Day 7 Retention",  suffix: "%", benchmark: 25, benchmarkLabel: "benchmark" },
  { key: "retention_d30",   label: "Day 30 Retention", suffix: "%", benchmark: 10, benchmarkLabel: "benchmark" },
  { key: "nps",             label: "NPS Score",        suffix: "",  benchmark: 40, benchmarkLabel: "good NPS" },
  { key: "dau_mau",         label: "DAU/MAU Ratio",    suffix: "%", benchmark: 20, benchmarkLabel: "healthy" },
  { key: "very_disappointed",label: "% Very Disappointed", suffix: "%", benchmark: 40, benchmarkLabel: "PMF threshold" },
] as const;

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = "chat" | "signals" | "deliverables" | "actions";

interface UiMessage  { role: "agent" | "user" | "tool"; text: string; toolActivity?: { toolName: string; label: string; status: "running" | "done"; summary?: string }; }
interface ApiMessage { role: "user" | "assistant"; content: string; }
interface ActionItem { id: string; action_text: string; priority: string; status: string; action_type?: string; cta_label?: string; }

interface SignalMetrics {
  retention_d7:      number | null;
  retention_d30:     number | null;
  nps:               number | null;
  dau_mau:           number | null;
  very_disappointed: number | null;
}

interface DashStats {
  pmfStrength:  string;
  signalsFilled: number;
  deliverables:  number;
  openActions:   number;
}

interface RawArtifact {
  id: string; artifact_type: string; title: string;
  content: Record<string, unknown>; created_at: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function pmfStrength(m: SignalMetrics): { label: string; color: string } {
  const scores: number[] = [];
  if (m.retention_d7   != null) scores.push(m.retention_d7   >= 25 ? 1 : m.retention_d7 >= 15 ? 0.5 : 0);
  if (m.retention_d30  != null) scores.push(m.retention_d30  >= 10 ? 1 : m.retention_d30 >= 5  ? 0.5 : 0);
  if (m.nps            != null) scores.push(m.nps             >= 40 ? 1 : m.nps >= 20          ? 0.5 : 0);
  if (m.very_disappointed != null) scores.push(m.very_disappointed >= 40 ? 1 : m.very_disappointed >= 25 ? 0.5 : 0);
  if (!scores.length) return { label: "No Data", color: muted };
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg >= 0.8) return { label: "Strong PMF", color: "#16A34A" };
  if (avg >= 0.5) return { label: "Weak PMF",   color: "#D97706" };
  return { label: "Pre-PMF", color: "#DC2626" };
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

// ─── signal row ───────────────────────────────────────────────────────────────

function SignalRow({
  label, value, suffix, benchmark, benchmarkLabel, onChange,
}: { label: string; value: number | null; suffix: string; benchmark: number; benchmarkLabel: string; onChange: (v: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(String(value ?? ""));

  function commit() {
    const n = parseFloat(draft.replace(/[^0-9.-]/g, ""));
    onChange(isNaN(n) ? null : n);
    setEditing(false);
  }

  const isGood = value != null && value >= benchmark;
  const barW   = value != null ? Math.min(100, (value / (benchmark * 2)) * 100) : 0;

  return (
    <div style={{ padding: "12px 14px", borderRadius: 10, background: surf, border: `1px solid ${bdr}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{label}</span>
        {editing ? (
          <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
            style={{ width: 70, fontSize: 13, fontWeight: 700, textAlign: "right", background: "transparent",
              border: `1px solid ${accent}`, borderRadius: 4, padding: "2px 6px", outline: "none", color: ink }} />
        ) : (
          <button onClick={() => { setDraft(String(value ?? "")); setEditing(true); }}
            style={{ fontSize: 13, fontWeight: 700, color: value == null ? muted : isGood ? "#16A34A" : "#DC2626",
              background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            {value == null ? "Add" : `${value}${suffix}`}
          </button>
        )}
      </div>
      <div style={{ height: 4, borderRadius: 2, background: bdr, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${barW}%`, borderRadius: 2,
          background: isGood ? "#16A34A" : value != null ? "#D97706" : bdr, transition: "width 0.4s" }} />
      </div>
      <p style={{ fontSize: 10, color: muted, marginTop: 4 }}>
        Target: {benchmark}{suffix} {benchmarkLabel}
        {value != null && !isGood && <span style={{ color: "#D97706", fontWeight: 600 }}> — below threshold</span>}
        {value != null && isGood  && <span style={{ color: "#16A34A", fontWeight: 600 }}> — above target ✓</span>}
      </p>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function NovaWorkspace() {
  const searchParams = useSearchParams();
  const targetArtifactId = searchParams.get("artifact");

  const [tab, setTab] = useState<Tab>("chat");
  const [uiMessages, setUiMessages]   = useState<UiMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [input, setInput]             = useState("");
  const [typing, setTyping]           = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const [userId, setUserId]           = useState<string | null>(null);
  const [conversationId, setConvId]   = useState<string | null>(null);
  const [historyLoading, setHistLoad] = useState(true);

  const [dashStats, setDashStats]     = useState<DashStats>({ pmfStrength: "No Data", signalsFilled: 0, deliverables: 0, openActions: 0 });
  const [signals, setSignals]         = useState<SignalMetrics>({ retention_d7: null, retention_d30: null, nps: null, dau_mau: null, very_disappointed: null });
  const [signalsSaved, setSigSaved]   = useState(false);
  const [signalsLoading, setSigLoad]  = useState(true);

  const [artifactHistory, setArtHistory] = useState<(ArtifactData & { created_at: string })[]>([]);
  const [actions, setActions]            = useState<ActionItem[]>([]);
  const [actionsLoading, setActLoad]     = useState(true);
  const [openArtifact, setOpenArtifact]  = useState<(ArtifactData & { created_at: string }) | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  // ── auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/auth/session").then(r => r.json()).then(d => { if (d?.user?.id) setUserId(d.user.id); });
  }, []);

  // ── load all ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    async function loadAll() {
      const hr = await fetch(`/api/agents/chat?agentId=nova&limit=40`);
      if (hr.ok) {
        const hd = await hr.json();
        const msgs = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role === "assistant" ? "agent" : "user", text: m.content }));
        const api  = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role, content: m.content }));
        setUiMessages(msgs); setApiMessages(api);
        if (msgs.length) setShowPrompts(false);
        if (hd.conversationId) setConvId(hd.conversationId);
      }
      setHistLoad(false);

      const gr = await fetch(`/api/agents/goals?agentId=nova`);
      if (gr.ok) {
        const gd = await gr.json();
        const snap = gd.goals?.[0]?.state_snapshot ?? {};
        const sigs: SignalMetrics = {
          retention_d7:      snap.retention_d7      ?? null,
          retention_d30:     snap.retention_d30     ?? null,
          nps:               snap.nps               ?? null,
          dau_mau:           snap.dau_mau           ?? null,
          very_disappointed: snap.very_disappointed ?? null,
        };
        setSignals(sigs);
        const strength = pmfStrength(sigs);
        const filled   = Object.values(sigs).filter(v => v != null).length;
        setDashStats({ pmfStrength: strength.label, signalsFilled: filled, deliverables: gd.deliverables?.length ?? 0, openActions: 0 });
      }
      setSigLoad(false);

      const ar = await fetch(`/api/agents/artifacts?agentId=nova&limit=12`);
      if (ar.ok) {
        const ad = await ar.json();
        setArtHistory((ad.artifacts ?? []).map((a: RawArtifact) => ({ id: a.id, type: a.artifact_type as ArtifactData["type"], title: a.title, content: a.content, created_at: a.created_at })));
      }

      const acr = await fetch(`/api/agents/actions?agentId=nova`);
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

  const strength = pmfStrength(signals);

  // ── save signals ──────────────────────────────────────────────────────────
  async function saveSignals() {
    await fetch("/api/agents/startup-state", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(signals) });
    setSigSaved(true);
    setTimeout(() => setSigSaved(false), 2000);
  }

  // ── send ──────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || typing) return;
    setShowPrompts(false); setTyping(true);
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
        body: JSON.stringify({ agentId: "nova", messages: nextApi, stream: true, conversationId }),
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

  // ─── chat tab ─────────────────────────────────────────────────────────────
  const ChatTab = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        {historyLoading && (
          <div style={{ textAlign: "center", color: muted, fontSize: 13, padding: "40px 0" }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} />
            Loading conversation…
          </div>
        )}

        {!historyLoading && showPrompts && uiMessages.length === 0 && (
          <div style={{ maxWidth: 560, margin: "0 auto", paddingTop: 40 }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: `${accent}22`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, margin: "0 auto 12px", border: `1px solid ${accent}44` }}>🔬</div>
              <p style={{ fontSize: 17, fontWeight: 700, color: ink }}>Nova — Product Strategist</p>
              <p style={{ fontSize: 13, color: muted, marginTop: 4 }}>PMF signals, roadmaps, user research & prioritisation</p>
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
            placeholder="Ask Nova about PMF, roadmaps, user research…"
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

  // ─── signals tab ──────────────────────────────────────────────────────────
  const SignalsTab = (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0 }}>PMF Signals</h2>
            <p style={{ fontSize: 12, color: muted, marginTop: 3 }}>Click any value to update — Nova uses these to calibrate advice</p>
          </div>
          <button onClick={saveSignals} style={{
            padding: "7px 16px", borderRadius: 8, background: accent, border: "none",
            color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>
            {signalsSaved ? "Saved ✓" : "Save"}
          </button>
        </div>

        {/* PMF status banner */}
        <div style={{ padding: "14px 18px", borderRadius: 12, marginBottom: 20,
          background: `${strength.color}12`, border: `1px solid ${strength.color}30`,
          display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: strength.color, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: strength.color, margin: 0 }}>{strength.label}</p>
            <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>
              {strength.label === "Strong PMF" ? "Signals look healthy — focus on scaling" :
               strength.label === "Weak PMF"   ? "Mixed signals — identify the weakest link" :
               strength.label === "Pre-PMF"    ? "Below thresholds — focus on finding fit before scaling" :
               "Add your metrics to see your PMF assessment"}
            </p>
          </div>
        </div>

        {signalsLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: muted }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} /> Loading…
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
            {PMF_SIGNALS.map(f => (
              <SignalRow key={f.key} label={f.label}
                value={signals[f.key as keyof SignalMetrics]}
                suffix={f.suffix} benchmark={f.benchmark} benchmarkLabel={f.benchmarkLabel}
                onChange={v => setSignals(p => ({ ...p, [f.key]: v }))} />
            ))}
          </div>
        )}

        {/* quick analysis */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Pivot or Persevere?",   prompt: "Analyse my PMF signals and advise whether I should pivot or persevere" },
            { label: "Identify gaps",          prompt: "Which PMF signals are weakest and what should I fix first?" },
            { label: "Interview 5 users",      prompt: "Generate a JTBD discovery interview script to improve my PMF signals" },
            { label: "Build retention loop",   prompt: "Design a retention loop to improve my Day 7 and Day 30 retention" },
          ].map(a => (
            <button key={a.label} onClick={() => { sendMessage(a.prompt); setTab("chat"); }}
              style={{ padding: "12px 14px", borderRadius: 10, background: `${accent}0D`,
                border: `1px solid ${accent}30`, cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: accent }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── deliverables tab ─────────────────────────────────────────────────────
  const DeliverablesTab = (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, marginBottom: 4 }}>Deliverables</h2>
        <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Research tools, roadmaps & frameworks</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
          {NOVA_DELIVERABLES.map(d => (
            <button key={d.type} onClick={() => { sendMessage(`Generate a ${d.label} for my product`); setTab("chat"); }}
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
        <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Nova-recommended research tasks</p>

        {actionsLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: muted }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} /> Loading…
          </div>
        ) : actions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
            <ListChecks size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No actions yet — chat with Nova to get recommendations</p>
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
                    <span style={{ fontSize: 10, fontWeight: 600, color: a.priority === "high" ? "#DC2626" : muted,
                      background: a.priority === "high" ? "#DC262612" : surf,
                      border: `1px solid ${a.priority === "high" ? "#DC262630" : bdr}`,
                      borderRadius: 4, padding: "1px 6px" }}>
                      {a.priority}
                    </span>
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
      `}</style>

      <div style={{ display: "flex", height: "100vh", background: bg, overflow: "hidden" }}>
        <WorkspaceSidebar
          name="Nova"
          role="Product · PMF"
          emoji="🔬"
          accent={accent}
          badge="PMF SIGNAL"
          tabs={[
            { id: "chat",         label: "Chat",         icon: MessageSquare },
            { id: "signals",      label: "Signals",      icon: Activity },
            { id: "deliverables", label: "Deliverables", icon: Package },
            { id: "actions",      label: "Actions",      icon: ListChecks },
          ]}
          activeTab={tab}
          onTabChange={id => setTab(id as Tab)}
          stats={[
            { label: "PMF Status",   value: dashStats.pmfStrength,                            color: strength.color },
            { label: "Signals",      value: `${dashStats.signalsFilled}/${PMF_SIGNALS.length}` },
            { label: "Deliverables", value: dashStats.deliverables },
            { label: "Open Actions", value: dashStats.openActions },
          ]}
          quickActions={NOVA_DELIVERABLES.slice(0, 4).map(d => ({
            label: d.label,
            icon:  d.icon,
            onClick: () => { sendMessage(`Generate a ${d.label} for my product`); setTab("chat"); },
          }))}
          alert={
            dashStats.signalsFilled < 3
              ? { message: "Add signals to measure PMF", color: accent, icon: AlertTriangle }
              : undefined
          }
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {/* header */}
          <div style={{ padding: "14px 24px", borderBottom: `1px solid ${bdr}`,
            display: "flex", alignItems: "center", gap: 12, background: surf }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accent}22`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔬</div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: ink }}>Nova</span>
              <span style={{ fontSize: 12, color: muted, marginLeft: 8 }}>Product Strategist · PMF & roadmap</span>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: `${accent}18`,
                border: `1px solid ${accent}44`, borderRadius: 20, padding: "3px 10px", letterSpacing: "0.05em" }}>
                PMF SIGNAL
              </span>
            </div>
          </div>

          {tab === "chat"        && ChatTab}
          {tab === "signals"     && SignalsTab}
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
              agentName="Nova"
              userId={userId ?? undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
