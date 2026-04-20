"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Zap, CheckCircle2,
  MessageSquare, Package, ListChecks, FileText,
  RefreshCw, ExternalLink,
  ClipboardList, DollarSign, Briefcase, Shield, AlertTriangle, AlertCircle,
  Plus, Scale,
} from "lucide-react";
import Link from "next/link";
import { WorkspaceSidebar } from "@/features/agents/shared/components/WorkspaceSidebar";
import { bg, surf, bdr, ink, muted } from "@/features/agents/shared/constants/colors";
import { ARTIFACT_META } from "@/features/agents/shared/constants/artifact-meta";
import { DeliverablePanel } from "@/features/agents/shared/components/DeliverablePanel";
import type { ArtifactData } from "@/features/agents/types/agent.types";

// ─── constants ────────────────────────────────────────────────────────────────

const accent   = "#059669"; // emerald green — law/trust
const SIDEBAR_W = 264;

const LEO_DELIVERABLES = [
  { type: "legal_checklist",      icon: ClipboardList,  label: "Legal Checklist",      description: "Prioritised legal items for current stage" },
  { type: "nda",                  icon: FileText,        label: "NDA",                  description: "Mutual or one-way NDA ready for signature" },
  { type: "safe_note",            icon: DollarSign,      label: "SAFE Note",            description: "YC-standard SAFE with filled terms" },
  { type: "contractor_agreement", icon: Briefcase,       label: "Contractor Agreement", description: "Scope, payment, IP assignment, confidentiality" },
  { type: "privacy_policy",       icon: Shield,          label: "Privacy Policy",       description: "GDPR/CCPA-compliant policy for your data flows" },
  { type: "term_sheet_redline",   icon: AlertTriangle,   label: "Term Sheet Redline",   description: "Non-standard terms flagged in plain English" },
];

const SUGGESTED = [
  "What legal items do I need for my seed round?",
  "Draft an NDA for a partner conversation",
  "Generate a contractor agreement with IP assignment",
  "Review and redline this term sheet",
  "Create a privacy policy for my SaaS product",
  "What are my biggest legal risks right now?",
];

const SEVERITY_ORDER = ["critical", "high", "medium", "low"] as const;
type Severity = typeof SEVERITY_ORDER[number];

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#DC2626",
  high:     "#D97706",
  medium:   "#2563EB",
  low:      "#6B7280",
};

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = "chat" | "risks" | "deliverables" | "actions";

interface UiMessage  { role: "agent" | "user" | "tool"; text: string; toolActivity?: { toolName: string; label: string; status: "running" | "done"; summary?: string }; }
interface ApiMessage { role: "user" | "assistant"; content: string; }
interface ActionItem { id: string; action_text: string; priority: string; status: string; action_type?: string; cta_label?: string; }

interface LegalRisk {
  id:       string;
  title:    string;
  severity: Severity;
  resolved: boolean;
  category: string;
  notes?:   string;
}

interface DashStats {
  critical:     number;
  open:         number;
  resolved:     number;
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

// ─── risk card ────────────────────────────────────────────────────────────────

function RiskCard({
  risk, onToggleResolve, onGetHelp,
}: {
  risk: LegalRisk;
  onToggleResolve: (id: string, resolved: boolean) => void;
  onGetHelp: (title: string) => void;
}) {
  const sColor = SEVERITY_COLORS[risk.severity];
  return (
    <div style={{
      borderRadius: 10, background: surf, border: `1px solid ${bdr}`,
      padding: "13px 14px", opacity: risk.resolved ? 0.55 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: sColor,
              background: `${sColor}18`, border: `1px solid ${sColor}30`,
              borderRadius: 4, padding: "2px 7px", textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              {risk.severity}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 500, color: muted,
              background: bg, border: `1px solid ${bdr}`,
              borderRadius: 4, padding: "2px 7px",
            }}>
              {risk.category}
            </span>
            {risk.resolved && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: accent,
                background: `${accent}18`, border: `1px solid ${accent}30`,
                borderRadius: 4, padding: "2px 7px",
              }}>
                RESOLVED
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0, lineHeight: 1.4 }}>{risk.title}</p>
          {risk.notes && (
            <p style={{ fontSize: 11, color: muted, marginTop: 5, margin: "5px 0 0" }}>{risk.notes}</p>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={() => onToggleResolve(risk.id, risk.resolved)}
          style={{
            flex: 1, padding: "6px 0", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
            background: risk.resolved ? "transparent" : accent,
            border: risk.resolved ? `1px solid ${bdr}` : "none",
            color: risk.resolved ? muted : "#fff",
          }}
        >
          {risk.resolved ? "Unresolve" : "Mark Resolved"}
        </button>
        {!risk.resolved && (
          <button
            onClick={() => onGetHelp(risk.title)}
            style={{
              flex: 1, padding: "6px 0", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
              background: `${accent}18`, border: `1px solid ${accent}44`, color: accent,
            }}
          >
            Get Help
          </button>
        )}
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function LeoWorkspace() {
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

  const [dashStats, setDashStats]   = useState<DashStats>({ critical: 0, open: 0, resolved: 0, deliverables: 0 });
  const [risks, setRisks]           = useState<LegalRisk[]>([]);
  const [risksLoading, setRisksLoad] = useState(true);
  const [addingRisk,  setAddingRisk] = useState(false);
  const [newRiskTitle,    setNewRiskTitle]    = useState("");
  const [newRiskSeverity, setNewRiskSeverity] = useState<Severity>("medium");
  const [newRiskCategory, setNewRiskCategory] = useState("");

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
      const hr = await fetch(`/api/agents/chat?agentId=leo&limit=40`);
      if (hr.ok) {
        const hd = await hr.json();
        const msgs = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role === "assistant" ? "agent" : "user", text: m.content }));
        const api  = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role, content: m.content }));
        setUiMessages(msgs); setApiMessages(api);
        if (msgs.length) setShowPrompts(false);
        if (hd.conversationId) setConvId(hd.conversationId);
      }
      setHistLoad(false);

      // legal risks
      const rr = await fetch(`/api/agents/legal-risks`);
      if (rr.ok) {
        const rd = await rr.json();
        const loaded: LegalRisk[] = (rd.risks ?? []).map((r: Record<string, unknown>) => ({
          id:       r.id as string,
          title:    r.title as string,
          severity: (r.severity ?? "medium") as Severity,
          resolved: Boolean(r.resolved),
          category: (r.category ?? "") as string,
          notes:    r.notes as string | undefined,
        }));
        setRisks(loaded);
        recomputeRiskStats(loaded);
      }
      setRisksLoad(false);

      const gr = await fetch(`/api/agents/goals?agentId=leo`);
      if (gr.ok) {
        const gd = await gr.json();
        setDashStats(p => ({ ...p, deliverables: gd.deliverables?.length ?? 0 }));
      }

      const ar = await fetch(`/api/agents/artifacts?agentId=leo&limit=12`);
      if (ar.ok) {
        const ad = await ar.json();
        setArtHistory((ad.artifacts ?? []).map((a: RawArtifact) => ({
          id: a.id, type: a.artifact_type as ArtifactData["type"],
          title: a.title, content: a.content, created_at: a.created_at,
        })));
      }

      const acr = await fetch(`/api/agents/actions?agentId=leo`);
      if (acr.ok) {
        const acd = await acr.json();
        setActions(acd.actions ?? []);
      }
      setActLoad(false);
    }
    loadAll();
  }, [userId]);

  function recomputeRiskStats(list: LegalRisk[]) {
    const critical = list.filter(r => r.severity === "critical" && !r.resolved).length;
    const open     = list.filter(r => !r.resolved).length;
    const resolved = list.filter(r => r.resolved).length;
    setDashStats(p => ({ ...p, critical, open, resolved }));
  }

  useEffect(() => {
    if (!targetArtifactId || !artifactHistory.length) return;
    const found = artifactHistory.find(a => a.id === targetArtifactId);
    if (found) { setOpenArtifact(found); setTab("deliverables"); }
  }, [targetArtifactId, artifactHistory]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [uiMessages]);

  // ── risk CRUD ─────────────────────────────────────────────────────────────
  async function addRisk() {
    if (!newRiskTitle.trim() || !newRiskCategory.trim()) return;
    const res = await fetch("/api/agents/legal-risks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newRiskTitle.trim(), severity: newRiskSeverity, category: newRiskCategory.trim(), resolved: false }),
    });
    if (res.ok) {
      const { risk } = await res.json();
      const newRisk: LegalRisk = {
        id: risk.id ?? String(Date.now()), title: risk.title ?? newRiskTitle.trim(),
        severity: risk.severity ?? newRiskSeverity, resolved: false,
        category: risk.category ?? newRiskCategory.trim(),
      };
      const next = [...risks, newRisk];
      setRisks(next);
      recomputeRiskStats(next);
    }
    setNewRiskTitle(""); setNewRiskSeverity("medium"); setNewRiskCategory(""); setAddingRisk(false);
  }

  async function toggleResolve(id: string, currentResolved: boolean) {
    const next = !currentResolved;
    setRisks(p => {
      const updated = p.map(r => r.id === id ? { ...r, resolved: next } : r);
      recomputeRiskStats(updated);
      return updated;
    });
    await fetch(`/api/agents/legal-risks/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resolved: next }),
    });
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
        body: JSON.stringify({ agentId: "leo", messages: nextApi, stream: true, conversationId }),
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
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} /> Loading…
          </div>
        )}
        {!historyLoading && showPrompts && uiMessages.length === 0 && (
          <div style={{ maxWidth: 560, margin: "0 auto", paddingTop: 40 }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: `${accent}22`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, margin: "0 auto 12px", border: `1px solid ${accent}44` }}>⚖️</div>
              <p style={{ fontSize: 17, fontWeight: 700, color: ink }}>Leo — General Counsel</p>
              <p style={{ fontSize: 13, color: muted, marginTop: 4 }}>Legal docs, risk reviews & compliance for your startup</p>
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
            placeholder="Ask Leo about legal risks, docs, compliance…"
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

  // ─── risks tab ────────────────────────────────────────────────────────────
  const RisksTab = (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0 }}>Legal Risks</h2>
            <p style={{ fontSize: 12, color: muted, marginTop: 3 }}>Track and resolve legal exposure items</p>
          </div>
          <button onClick={() => setAddingRisk(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              borderRadius: 8, background: accent, border: "none",
              color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={13} /> Add Risk
          </button>
        </div>

        {/* add form */}
        <AnimatePresence>
          {addingRisk && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ padding: "16px", borderRadius: 12, background: surf, border: `1px solid ${accent}44`, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 12 }}>Add Legal Risk</p>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <input autoFocus value={newRiskTitle} onChange={e => setNewRiskTitle(e.target.value)} placeholder="Risk title *"
                  style={{ flex: 2, padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: "none", fontFamily: "inherit" }} />
                <select value={newRiskSeverity} onChange={e => setNewRiskSeverity(e.target.value as Severity)}
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: "none", fontFamily: "inherit", cursor: "pointer" }}>
                  {SEVERITY_ORDER.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <input value={newRiskCategory} onChange={e => setNewRiskCategory(e.target.value)} placeholder="Category *"
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: "none", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addRisk} disabled={!newRiskTitle.trim() || !newRiskCategory.trim()}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: accent, border: "none",
                    color: "#fff", fontSize: 12, fontWeight: 600,
                    cursor: newRiskTitle.trim() && newRiskCategory.trim() ? "pointer" : "default",
                    opacity: newRiskTitle.trim() && newRiskCategory.trim() ? 1 : 0.5 }}>
                  Add Risk
                </button>
                <button onClick={() => setAddingRisk(false)}
                  style={{ padding: "8px 16px", borderRadius: 8, background: "transparent",
                    border: `1px solid ${bdr}`, fontSize: 12, color: muted, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {risksLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: muted }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} /> Loading…
          </div>
        ) : risks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
            <AlertTriangle size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No legal risks tracked — add your first one above</p>
          </div>
        ) : (
          <>
            {SEVERITY_ORDER.map(severity => {
              const group = risks.filter(r => r.severity === severity);
              if (group.length === 0) return null;
              const sColor = SEVERITY_COLORS[severity];
              return (
                <div key={severity} style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: sColor,
                      background: `${sColor}18`, border: `1px solid ${sColor}30`,
                      borderRadius: 4, padding: "3px 9px", textTransform: "uppercase", letterSpacing: "0.06em",
                    }}>
                      {severity}
                    </span>
                    <span style={{ fontSize: 11, color: muted }}>
                      {group.filter(r => !r.resolved).length} open · {group.filter(r => r.resolved).length} resolved
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {group.map(r => (
                      <RiskCard
                        key={r.id}
                        risk={r}
                        onToggleResolve={toggleResolve}
                        onGetHelp={(title) => { sendMessage(`Help me resolve this legal risk: ${title}`); setTab("chat"); }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );

  // ─── deliverables tab ─────────────────────────────────────────────────────
  const DeliverablesTab = (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, marginBottom: 4 }}>Deliverables</h2>
        <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Legal docs, agreements & compliance artifacts</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
          {LEO_DELIVERABLES.map(d => (
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
        <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Leo-recommended legal tasks</p>
        {actionsLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: muted }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} /> Loading…
          </div>
        ) : actions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
            <ListChecks size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No actions yet — chat with Leo to get recommendations</p>
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
      `}</style>
      <div style={{ display: "flex", height: "100vh", background: bg, overflow: "hidden" }}>
        <WorkspaceSidebar
          name="Leo"
          role="General Counsel · Legal"
          emoji="⚖️"
          accent={accent}
          badge="IN-HOUSE COUNSEL"
          tabs={[
            { id: "chat",         label: "Chat",         icon: MessageSquare },
            { id: "risks",        label: "Risks",        icon: AlertTriangle, badge: risks.filter(r => !r.resolved).length },
            { id: "deliverables", label: "Deliverables", icon: Package },
            { id: "actions",      label: "Actions",      icon: ListChecks },
          ]}
          activeTab={tab}
          onTabChange={(id) => setTab(id as Tab)}
          stats={[
            { label: "Critical",     value: dashStats.critical,     color: dashStats.critical > 0 ? "#DC2626" : undefined },
            { label: "Open Risks",   value: dashStats.open,         color: dashStats.open > 0 ? accent : undefined },
            { label: "Resolved",     value: dashStats.resolved,     color: dashStats.resolved > 0 ? "#16A34A" : undefined },
            { label: "Deliverables", value: dashStats.deliverables },
          ]}
          quickActions={LEO_DELIVERABLES.slice(0, 4).map(d => ({
            label: d.label,
            icon: d.icon,
            onClick: () => { sendMessage(`Generate a ${d.label}`); setTab("chat"); },
          }))}
          alert={dashStats.critical > 0 ? { message: `${dashStats.critical} critical risk${dashStats.critical > 1 ? "s" : ""} unresolved`, color: "#DC2626", icon: AlertCircle } : undefined}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <div style={{ padding: "14px 24px", borderBottom: `1px solid ${bdr}`,
            display: "flex", alignItems: "center", gap: 12, background: surf }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accent}22`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚖️</div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: ink }}>Leo</span>
              <span style={{ fontSize: 12, color: muted, marginLeft: 8 }}>General Counsel · Legal</span>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: `${accent}18`,
                border: `1px solid ${accent}44`, borderRadius: 20, padding: "3px 10px", letterSpacing: "0.05em" }}>
                IN-HOUSE COUNSEL
              </span>
            </div>
          </div>
          {tab === "chat"         && ChatTab}
          {tab === "risks"        && RisksTab}
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
              agentName="Leo"
              userId={userId ?? undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
