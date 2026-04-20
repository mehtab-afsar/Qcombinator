"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, TrendingUp, Zap, CheckCircle2, Paperclip,
  MessageSquare, Package, ListChecks, FileText, BarChart3,
  DollarSign, PieChart, ChevronRight, X, RefreshCw,
  AlertCircle, TrendingDown, Layers, CreditCard, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { WorkspaceSidebar } from "@/features/agents/shared/components/WorkspaceSidebar";
import { bg, surf, bdr, ink, muted, amber } from "@/features/agents/shared/constants/colors";
import { ARTIFACT_META } from "@/features/agents/shared/constants/artifact-meta";
import { DeliverablePanel } from "@/features/agents/shared/components/DeliverablePanel";
import type { ArtifactData } from "@/features/agents/types/agent.types";

// ─── constants ────────────────────────────────────────────────────────────────

const accent = amber;
const SIDEBAR_W = 264;

const FELIX_DELIVERABLES = [
  { type: "financial_summary",       icon: BarChart3,    label: "Financial Summary",       description: "MRR, ARR, burn, runway snapshot" },
  { type: "financial_model",         icon: PieChart,     label: "Financial Model",         description: "12/24-month P&L + cash flow model" },
  { type: "investor_update",         icon: FileText,     label: "Investor Update",         description: "Monthly progress email to investors" },
  { type: "board_deck",              icon: Layers,       label: "Board Deck",              description: "Quarterly board presentation" },
  { type: "cap_table_summary",       icon: CreditCard,   label: "Cap Table Summary",       description: "Ownership breakdown + dilution analysis" },
  { type: "fundraising_narrative",   icon: TrendingUp,   label: "Fundraising Narrative",   description: "Seed / Series A story + ask" },
];

const SUGGESTED = [
  "Build a 12-month financial model",
  "What's my current burn rate and runway?",
  "Draft an investor update for this month",
  "Model out a Series A fundraise scenario",
  "Analyze my unit economics",
  "When should I start my next fundraise?",
];

const METRIC_FIELDS = [
  { key: "mrr",             label: "MRR",          prefix: "$", suffix: "" },
  { key: "arr",             label: "ARR",           prefix: "$", suffix: "" },
  { key: "burn_rate",       label: "Monthly Burn",  prefix: "$", suffix: "" },
  { key: "runway_months",   label: "Runway",        prefix: "",  suffix: " mo" },
  { key: "revenue_growth",  label: "MoM Growth",    prefix: "",  suffix: "%" },
  { key: "gross_margin",    label: "Gross Margin",  prefix: "",  suffix: "%" },
] as const;

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = "chat" | "financials" | "deliverables" | "actions";
interface UiMessage  { role: "agent" | "user" | "tool"; text: string; toolActivity?: { toolName: string; label: string; status: "running" | "done"; summary?: string }; }
interface ApiMessage { role: "user" | "assistant"; content: string; }
interface ActionItem { id: string; action_text: string; priority: string; status: string; action_type?: string; cta_label?: string; }

interface FinancialMetrics {
  mrr:            number | null;
  arr:            number | null;
  burn_rate:      number | null;
  runway_months:  number | null;
  revenue_growth: number | null;
  gross_margin:   number | null;
}

interface DashStats {
  mrr:           number | null;
  runway_months: number | null;
  burn_rate:     number | null;
  deliverables:  number;
}

interface RawArtifact {
  id: string;
  artifact_type: string;
  title: string;
  content: Record<string, unknown>;
  created_at: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt$(n: number | null, prefix = "$", suffix = "") {
  if (n == null) return "—";
  const abs = Math.abs(n);
  let str: string;
  if (abs >= 1_000_000) str = `${(n / 1_000_000).toFixed(1)}M`;
  else if (abs >= 1_000) str = `${(n / 1_000).toFixed(0)}k`;
  else str = String(n);
  return `${prefix}${str}${suffix}`;
}

function fmtVal(val: number | null, prefix: string, suffix: string) {
  if (val == null) return "—";
  const abs = Math.abs(val);
  let str: string;
  if (prefix === "$" && abs >= 1_000_000) str = `${(val / 1_000_000).toFixed(1)}M`;
  else if (prefix === "$" && abs >= 1_000) str = `${(val / 1_000).toFixed(0)}k`;
  else str = String(val);
  return `${prefix}${str}${suffix}`;
}

function runwayColor(months: number | null) {
  if (months == null) return muted;
  if (months <= 3) return "#DC2626";
  if (months <= 6) return "#D97706";
  return "#16A34A";
}

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ flex: 1, padding: "10px 12px", borderRadius: 8, background: bg, border: `1px solid ${bdr}` }}>
      <p style={{ fontSize: 18, fontWeight: 700, color: color ?? ink, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 10, color: muted, marginTop: 3, fontWeight: 500 }}>{label}</p>
      {sub && <p style={{ fontSize: 9, color: accent, marginTop: 2, fontWeight: 600 }}>{sub}</p>}
    </div>
  );
}

// ─── metric row ───────────────────────────────────────────────────────────────

function MetricRow({
  label, value, prefix, suffix, onChange,
}: { label: string; value: number | null; prefix: string; suffix: string; onChange: (v: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));

  function commit() {
    const n = parseFloat(draft.replace(/[^0-9.-]/g, ""));
    onChange(isNaN(n) ? null : n);
    setEditing(false);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 14px", borderRadius: 8, background: surf, border: `1px solid ${bdr}` }}>
      <span style={{ fontSize: 12, color: muted, fontWeight: 500 }}>{label}</span>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          style={{ width: 90, fontSize: 13, fontWeight: 700, color: ink, background: "transparent",
            border: `1px solid ${accent}`, borderRadius: 4, padding: "2px 6px", textAlign: "right", outline: "none" }}
        />
      ) : (
        <button onClick={() => { setDraft(String(value ?? "")); setEditing(true); }}
          style={{ fontSize: 13, fontWeight: 700, color: value == null ? muted : ink,
            background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          {fmtVal(value, prefix, suffix)}
        </button>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function FelixWorkspace() {
  const searchParams = useSearchParams();
  const targetArtifactId = searchParams.get("artifact");

  const [tab, setTab] = useState<Tab>("chat");
  const [uiMessages, setUiMessages]     = useState<UiMessage[]>([]);
  const [apiMessages, setApiMessages]   = useState<ApiMessage[]>([]);
  const [input, setInput]               = useState("");
  const [typing, setTyping]             = useState(false);
  const [showPrompts, setShowPrompts]   = useState(true);
  const [userId, setUserId]             = useState<string | null>(null);
  const [conversationId, setConvId]     = useState<string | null>(null);
  const [historyLoading, setHistLoading]= useState(true);

  const [dashStats, setDashStats]       = useState<DashStats>({ mrr: null, runway_months: null, burn_rate: null, deliverables: 0 });
  const [metrics, setMetrics]           = useState<FinancialMetrics>({ mrr: null, arr: null, burn_rate: null, runway_months: null, revenue_growth: null, gross_margin: null });
  const [metricsLoading, setMtrLoading] = useState(true);
  const [metricsSaved, setMtrSaved]     = useState(false);

  const [artifactHistory, setArtHistory]= useState<(ArtifactData & { created_at: string })[]>([]);
  const [actions, setActions]           = useState<ActionItem[]>([]);
  const [actionsLoading, setActLoading] = useState(true);
  const [openArtifact, setOpenArtifact] = useState<(ArtifactData & { created_at: string }) | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  // ── auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/auth/session").then(r => r.json()).then(d => {
      if (d?.user?.id) setUserId(d.user.id);
    });
  }, []);

  // ── load history + metrics + actions ─────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    async function loadAll() {
      // conversation history
      const hr = await fetch(`/api/agents/chat?agentId=felix&limit=40`);
      if (hr.ok) {
        const hd = await hr.json();
        const msgs: UiMessage[]  = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role === "assistant" ? "agent" : "user", text: m.content }));
        const api: ApiMessage[]  = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role, content: m.content }));
        setUiMessages(msgs);
        setApiMessages(api);
        if (msgs.length) setShowPrompts(false);
        if (hd.conversationId) setConvId(hd.conversationId);
      }
      setHistLoading(false);

      // goals / dash stats
      const gr = await fetch(`/api/agents/goals?agentId=felix`);
      if (gr.ok) {
        const gd = await gr.json();
        const snap = gd.goals?.[0]?.state_snapshot ?? {};
        setDashStats({
          mrr:           snap.mrr ?? null,
          runway_months: snap.runway_months ?? null,
          burn_rate:     snap.burn_rate ?? null,
          deliverables:  gd.deliverables?.length ?? 0,
        });
        setMetrics({
          mrr:            snap.mrr ?? null,
          arr:            snap.arr ?? null,
          burn_rate:      snap.burn_rate ?? null,
          runway_months:  snap.runway_months ?? null,
          revenue_growth: snap.revenue_growth ?? null,
          gross_margin:   snap.gross_margin ?? null,
        });
      }
      setMtrLoading(false);

      // artifact history
      const ar = await fetch(`/api/agents/artifacts?agentId=felix&limit=12`);
      if (ar.ok) {
        const ad = await ar.json();
        const mapped = (ad.artifacts ?? []).map((a: RawArtifact) => ({
          id: a.id, type: a.artifact_type as ArtifactData["type"],
          title: a.title, content: a.content, created_at: a.created_at,
        }));
        setArtHistory(mapped);
      }

      // actions
      const acr = await fetch(`/api/agents/actions?agentId=felix`);
      if (acr.ok) {
        const acd = await acr.json();
        setActions(acd.actions ?? []);
      }
      setActLoading(false);
    }

    loadAll();
  }, [userId]);

  // open artifact from URL param
  useEffect(() => {
    if (!targetArtifactId || !artifactHistory.length) return;
    const found = artifactHistory.find(a => a.id === targetArtifactId);
    if (found) { setOpenArtifact(found); setTab("deliverables"); }
  }, [targetArtifactId, artifactHistory]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [uiMessages]);

  // ── save metrics to startup_state ─────────────────────────────────────────
  async function saveMetrics() {
    await fetch("/api/agents/startup-state", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(metrics) });
    setMtrSaved(true);
    setTimeout(() => setMtrSaved(false), 2000);
  }

  // ── send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || typing) return;
    setShowPrompts(false);
    setTyping(true);

    const userMsg: UiMessage  = { role: "user", text };
    const userApi: ApiMessage = { role: "user", content: text };
    setUiMessages(p => [...p, userMsg]);
    const nextApi = [...apiMessages, userApi];
    setApiMessages(nextApi);
    setInput("");

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const toolMsg: UiMessage = { role: "tool", text: "", toolActivity: { toolName: "", label: "Working…", status: "running" } };
    let toolIdx = -1;
    let agentText = "";
    let lastChunk = "";

    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "felix", messages: nextApi, stream: true, conversationId }),
        signal: ctrl.signal,
      });

      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const dec    = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = dec.decode(value);
        for (const line of raw.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === "[DONE]") continue;

          let evt: Record<string, unknown>;
          try { evt = JSON.parse(payload); } catch { continue; }

          if (evt.type === "tool_start") {
            toolMsg.toolActivity = { toolName: evt.toolName as string, label: evt.label as string, status: "running" };
            if (toolIdx === -1) { setUiMessages(p => { toolIdx = p.length; return [...p, { ...toolMsg }]; }); }
            else { setUiMessages(p => p.map((m, i) => i === toolIdx ? { ...toolMsg } : m)); }
          } else if (evt.type === "tool_done") {
            setUiMessages(p => p.map((m, i) => i === toolIdx ? { ...m, toolActivity: { ...(m.toolActivity!), status: "done", summary: evt.summary as string } } : m));
            toolIdx = -1;
          } else if (evt.type === "text_delta") {
            agentText += evt.text as string;
            lastChunk = evt.text as string;
            setUiMessages(p => {
              const idx = p.findLastIndex(m => m.role === "agent");
              if (idx === -1) return [...p, { role: "agent", text: agentText }];
              return p.map((m, i) => i === idx ? { ...m, text: agentText } : m);
            });
          } else if (evt.type === "conversation_id" && evt.id) {
            setConvId(evt.id as string);
          }
        }
      }

      setApiMessages(p => [...p, { role: "assistant", content: agentText }]);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setUiMessages(p => [...p, { role: "agent", text: "Something went wrong. Please try again." }]);
      }
    } finally {
      setTyping(false);
    }
  }, [typing, apiMessages, conversationId]);

  // ── action toggle ─────────────────────────────────────────────────────────
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
                fontSize: 24, margin: "0 auto 12px", border: `1px solid ${accent}44` }}>💰</div>
              <p style={{ fontSize: 17, fontWeight: 700, color: ink }}>Felix — CFO Agent</p>
              <p style={{ fontSize: 13, color: muted, marginTop: 4 }}>Financial modeling, fundraising strategy & investor relations</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => sendMessage(s)} style={{
                  padding: "12px 14px", borderRadius: 10, background: surf, border: `1px solid ${bdr}`,
                  color: ink, fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left",
                  transition: "border-color 0.15s",
                }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {uiMessages.map((m, i) => (
          <div key={i} style={{ marginBottom: 16, display: "flex",
            justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "tool" && m.toolActivity ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                borderRadius: 8, background: `${accent}12`, border: `1px solid ${accent}30`,
                fontSize: 12, color: muted, maxWidth: "80%" }}>
                {m.toolActivity.status === "running"
                  ? <RefreshCw size={12} color={accent} style={{ animation: "spin 1s linear infinite" }} />
                  : <CheckCircle2 size={12} color={accent} />}
                <span style={{ fontWeight: 500 }}>{m.toolActivity.label}</span>
                {m.toolActivity.summary && <span style={{ color: muted }}>· {m.toolActivity.summary}</span>}
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

      {/* input */}
      <div style={{ padding: "12px 20px 16px", borderTop: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end",
          background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "8px 12px" }}>
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }}}
            placeholder="Ask Felix about financials, fundraising, modeling…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: 13, color: ink, resize: "none", fontFamily: "inherit", lineHeight: 1.5 }}
          />
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

  // ─── financials tab ───────────────────────────────────────────────────────
  const FinancialsTab = (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0 }}>Financial Snapshot</h2>
            <p style={{ fontSize: 12, color: muted, marginTop: 3 }}>Update your metrics — Felix uses these in every response</p>
          </div>
          <button onClick={saveMetrics} style={{
            padding: "7px 16px", borderRadius: 8, background: accent, border: "none",
            color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>
            {metricsSaved ? "Saved ✓" : "Save"}
          </button>
        </div>

        {metricsLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: muted }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} />
            Loading metrics…
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
            {METRIC_FIELDS.map(f => (
              <MetricRow
                key={f.key}
                label={f.label}
                value={metrics[f.key as keyof FinancialMetrics]}
                prefix={f.prefix}
                suffix={f.suffix}
                onChange={v => setMetrics(p => ({ ...p, [f.key]: v }))}
              />
            ))}
          </div>
        )}

        {/* runway visual */}
        {metrics.runway_months != null && (
          <div style={{ padding: "16px 18px", borderRadius: 12, background: surf, border: `1px solid ${bdr}`, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>Runway</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: runwayColor(metrics.runway_months) }}>
                {metrics.runway_months} months
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: bdr, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 4, width: `${Math.min(100, (metrics.runway_months / 24) * 100)}%`,
                background: runwayColor(metrics.runway_months), transition: "width 0.4s ease" }} />
            </div>
            <p style={{ fontSize: 11, color: muted, marginTop: 6 }}>
              {metrics.runway_months <= 3  ? "⚠️ Raise immediately — critical runway" :
               metrics.runway_months <= 6  ? "⚠️ Start fundraise process now" :
               metrics.runway_months <= 12 ? "Plan your next round in the next 3–6 months" :
                                             "Strong runway — focus on growth"}
            </p>
          </div>
        )}

        {/* quick actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Build 12-month model", prompt: "Build a 12-month financial model based on my metrics" },
            { label: "Calculate unit economics", prompt: "Calculate and explain my unit economics (LTV, CAC, payback)" },
            { label: "Draft investor update", prompt: "Draft a monthly investor update based on my latest metrics" },
            { label: "Model fundraise scenarios", prompt: "Model Series A fundraise scenarios at different valuations" },
          ].map(a => (
            <button key={a.label} onClick={() => { sendMessage(a.prompt); setTab("chat"); }}
              style={{ padding: "12px 14px", borderRadius: 10, background: `${accent}0D`,
                border: `1px solid ${accent}30`, cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: accent }}>{a.label}</span>
              <p style={{ fontSize: 11, color: muted, marginTop: 3, margin: 0 }}>{a.prompt.slice(0, 48)}…</p>
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
        <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Generate financial documents and models</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
          {FELIX_DELIVERABLES.map(d => (
            <button key={d.type} onClick={() => { sendMessage(`Generate a ${d.label} for my startup`); setTab("chat"); }}
              style={{ padding: "16px", borderRadius: 12, background: surf, border: `1px solid ${bdr}`,
                cursor: "pointer", textAlign: "left", transition: "border-color 0.15s" }}>
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
        <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Felix-recommended next steps</p>

        {actionsLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: muted }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} />
            Loading actions…
          </div>
        ) : actions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
            <ListChecks size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No actions yet — chat with Felix to generate recommendations</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {actions.map(a => (
              <div key={a.id} style={{ padding: "14px 16px", borderRadius: 12, background: surf,
                border: `1px solid ${bdr}`, display: "flex", alignItems: "flex-start", gap: 12,
                opacity: a.status === "done" ? 0.55 : 1 }}>
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
                  <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
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
          name="Felix"
          role="CFO · Finance"
          emoji="💰"
          accent={accent}
          badge="LIVE MODEL"
          tabs={[
            { id: "chat",         label: "Chat",         icon: MessageSquare },
            { id: "financials",   label: "Financials",   icon: BarChart3 },
            { id: "deliverables", label: "Deliverables", icon: Package },
            { id: "actions",      label: "Actions",      icon: ListChecks, badge: actions.filter(a => a.status !== "done").length },
          ]}
          activeTab={tab}
          onTabChange={id => setTab(id as Tab)}
          stats={[
            { label: "MRR",          value: fmt$(dashStats.mrr),                                                                   color: accent },
            { label: "Runway",       value: dashStats.runway_months != null ? `${dashStats.runway_months}mo` : "—",                color: runwayColor(dashStats.runway_months) },
            { label: "Burn/mo",      value: fmt$(dashStats.burn_rate) },
            { label: "Deliverables", value: dashStats.deliverables },
          ]}
          quickActions={FELIX_DELIVERABLES.slice(0, 4).map(d => ({
            label: d.label,
            icon:  d.icon,
            onClick: () => { sendMessage(`Build me a ${d.label}`); setTab("chat"); },
          }))}
          alert={
            dashStats.runway_months != null && dashStats.runway_months <= 6
              ? {
                  message: dashStats.runway_months <= 3 ? "Critical: < 3mo runway" : "Low runway — fundraise now",
                  color:   "#DC2626",
                  icon:    AlertCircle,
                }
              : undefined
          }
        />

        {/* main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* header */}
          <div style={{ padding: "14px 24px", borderBottom: `1px solid ${bdr}`,
            display: "flex", alignItems: "center", gap: 12, background: surf }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accent}22`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💰</div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: ink }}>Felix</span>
              <span style={{ fontSize: 12, color: muted, marginLeft: 8 }}>CFO · Financial modeling & fundraising strategy</span>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: `${accent}18`,
                border: `1px solid ${accent}44`, borderRadius: 20, padding: "3px 10px", letterSpacing: "0.05em" }}>
                LIVE MODEL
              </span>
            </div>
          </div>

          {tab === "chat"        && ChatTab}
          {tab === "financials"  && FinancialsTab}
          {tab === "deliverables"&& DeliverablesTab}
          {tab === "actions"     && ActionsTab}
        </div>
      </div>

      {/* artifact overlay */}
      <AnimatePresence>
        {openArtifact && (
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ position: "fixed", top: 0, right: 0, width: "min(680px, 90vw)", height: "100vh",
              zIndex: 50, boxShadow: "-4px 0 32px rgba(0,0,0,0.12)" }}>
            <DeliverablePanel
              artifact={openArtifact}
              artifactHistory={artifactHistory.filter(a => a.type === openArtifact.type)}
              onSelectArtifact={a => setOpenArtifact(a as (ArtifactData & { created_at: string }))}
              onClose={() => setOpenArtifact(null)}
              onRefine={instruction => { setOpenArtifact(null); setTab("chat"); setTimeout(() => sendMessage(`Refine the ${openArtifact.title}: ${instruction}`), 100); }}
              agentName="Felix"
              userId={userId ?? undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
