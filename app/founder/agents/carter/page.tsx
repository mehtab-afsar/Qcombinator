"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, CheckCircle2,
  MessageSquare, Package, ListChecks, FileText,
  RefreshCw, ChevronRight, ExternalLink,
  Plus, Trash2,
  BookOpen, Activity, AlertTriangle, BarChart3, TrendingUp, Star,
  Users,
} from "lucide-react";
import { bg, surf, bdr, ink, muted } from "@/features/agents/shared/constants/colors";
import { ARTIFACT_META } from "@/features/agents/shared/constants/artifact-meta";
import { DeliverablePanel } from "@/features/agents/shared/components/DeliverablePanel";
import { WorkspaceSidebar } from "@/features/agents/shared/components/WorkspaceSidebar";
import type { ArtifactData } from "@/features/agents/types/agent.types";

// ─── constants ────────────────────────────────────────────────────────────────

const accent = "#16A34A"; // green — customer success/health

const CARTER_DELIVERABLES = [
  { type: "onboarding_sequence",  icon: BookOpen,       label: "Onboarding Sequence",  description: "Day 1/7/30 milestones + proactive check-ins" },
  { type: "health_scorecard",     icon: Activity,       label: "Health Scorecard",      description: "Composite account health model + thresholds" },
  { type: "churn_risk_report",    icon: AlertTriangle,  label: "Churn Risk Report",     description: "At-risk accounts with intervention playbooks" },
  { type: "qbr_template",         icon: BarChart3,      label: "QBR Template",          description: "ROI quantification + renewal defense + expansion" },
  { type: "expansion_playbook",   icon: TrendingUp,     label: "Expansion Playbook",    description: "Upsell/seat expansion/referral triggers" },
  { type: "nps_survey",           icon: Star,           label: "NPS Survey",            description: "3-question NPS with follow-up routing" },
];

const SUGGESTED = [
  "Which customers are at risk of churning?",
  "Build an onboarding sequence for new customers",
  "Create a QBR template for enterprise accounts",
  "Design a health scorecard for my customer base",
  "Which accounts have expansion potential?",
  "How do I get customers to refer others?",
];

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = "chat" | "accounts" | "deliverables" | "actions";

type AccountHealth = "green" | "yellow" | "red";
type AccountStage  = "onboarding" | "active" | "at-risk" | "churned" | "champion";

interface UiMessage  { role: "agent" | "user" | "tool"; text: string; toolActivity?: { toolName: string; label: string; status: "running" | "done"; summary?: string }; }
interface ApiMessage { role: "user" | "assistant"; content: string; }
interface ActionItem { id: string; action_text: string; priority: string; status: string; action_type?: string; cta_label?: string; }

interface Account {
  id:            string;
  company:       string;
  contact_name?: string;
  arr?:          number;
  health:        AccountHealth;
  stage:         AccountStage;
  last_contact?: string;
  notes?:        string;
}

interface DashStats {
  totalAccounts: number;
  atRisk:        number;
  totalArr:      number;
  deliverables:  number;
}

interface RawArtifact {
  id: string; artifact_type: string; title: string;
  content: Record<string, unknown>; created_at: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtArr(arr: number): string {
  if (arr >= 1_000_000) return `$${(arr / 1_000_000).toFixed(1)}M`;
  if (arr >= 1_000)     return `$${Math.round(arr / 1_000)}k`;
  return `$${arr}`;
}

const HEALTH_CONFIG: Record<AccountHealth, { dot: string; label: string; bg: string; border: string }> = {
  green:  { dot: "#16A34A", label: "Healthy",   bg: "#16A34A18", border: "#16A34A30" },
  yellow: { dot: "#D97706", label: "At Risk",   bg: "#D9770618", border: "#D9770630" },
  red:    { dot: "#DC2626", label: "Critical",  bg: "#DC262618", border: "#DC262630" },
};

const STAGE_ORDER: AccountStage[] = ["onboarding", "active", "at-risk", "churned", "champion"];

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ flex: 1, padding: "10px 12px", borderRadius: 8, background: bg, border: `1px solid ${bdr}` }}>
      <p style={{ fontSize: 18, fontWeight: 700, color: color ?? ink, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 10, color: muted, marginTop: 3, fontWeight: 500 }}>{label}</p>
    </div>
  );
}

// ─── account card ─────────────────────────────────────────────────────────────

function AccountCard({
  account, onStageChange, onDelete, onAsk,
}: {
  account:       Account;
  onStageChange: (id: string, stage: AccountStage) => void;
  onDelete:      (id: string) => void;
  onAsk:         (prompt: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hcfg = HEALTH_CONFIG[account.health];

  return (
    <div style={{ borderRadius: 10, background: surf, border: `1px solid ${bdr}`, overflow: "hidden" }}>
      {/* header row */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", cursor: "pointer" }}
        onClick={() => setExpanded(p => !p)}
      >
        {/* health dot */}
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: hcfg.dot, flexShrink: 0 }} />

        {/* names */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>{account.company}</p>
          {account.contact_name && (
            <p style={{ fontSize: 11, color: muted, margin: 0 }}>{account.contact_name}</p>
          )}
        </div>

        {/* ARR */}
        {account.arr != null && (
          <span style={{ fontSize: 11, fontWeight: 600, color: ink, flexShrink: 0 }}>
            {fmtArr(account.arr)}
          </span>
        )}

        {/* health badge */}
        <span style={{
          fontSize: 10, fontWeight: 700, color: hcfg.dot,
          background: hcfg.bg, border: `1px solid ${hcfg.border}`,
          borderRadius: 4, padding: "2px 6px", flexShrink: 0,
        }}>
          {hcfg.label}
        </span>

        <ChevronRight
          size={13} color={muted}
          style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}
        />
      </div>

      {/* expanded body */}
      {expanded && (
        <div style={{ padding: "0 13px 13px", borderTop: `1px solid ${bdr}` }}>
          {/* meta */}
          <div style={{ display: "flex", gap: 14, marginTop: 10, marginBottom: 10 }}>
            {account.last_contact && (
              <p style={{ fontSize: 11, color: muted, margin: 0 }}>
                Last contact: <strong style={{ color: ink }}>{account.last_contact}</strong>
              </p>
            )}
            <p style={{ fontSize: 11, color: muted, margin: 0 }}>
              Stage: <strong style={{ color: ink }}>{account.stage}</strong>
            </p>
          </div>
          {account.notes && (
            <p style={{ fontSize: 11, color: muted, margin: "0 0 10px", fontStyle: "italic" }}>{account.notes}</p>
          )}

          {/* stage movers */}
          <p style={{ fontSize: 10, fontWeight: 600, color: muted, letterSpacing: "0.06em", margin: "0 0 6px" }}>MOVE TO STAGE</p>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
            {STAGE_ORDER.filter(s => s !== account.stage).map(s => (
              <button key={s} onClick={() => onStageChange(account.id, s)}
                style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                  background: "transparent", border: `1px solid ${bdr}`, color: muted, cursor: "pointer" }}>
                {s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}
              </button>
            ))}
          </div>

          {/* action buttons */}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => { onAsk(`Create a churn intervention plan for ${account.company}`); }}
              style={{ flex: 1, padding: "6px 0", borderRadius: 7, background: accent,
                border: "none", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              Plan Intervention
            </button>
            <button
              onClick={() => onAsk(`Prepare a QBR for ${account.company}${account.arr != null ? ` with ${fmtArr(account.arr)} ARR` : ""}`)}
              style={{ flex: 1, padding: "6px 0", borderRadius: 7, background: `${accent}18`,
                border: `1px solid ${accent}44`, color: accent, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              Schedule QBR
            </button>
            <button onClick={() => onDelete(account.id)}
              style={{ width: 30, height: 30, borderRadius: 7, background: "transparent",
                border: `1px solid ${bdr}`, cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={12} color={muted} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function CarterWorkspace() {
  const searchParams     = useSearchParams();
  const targetArtifactId = searchParams.get("artifact");

  const [tab, setTab]                 = useState<Tab>("chat");
  const [uiMessages, setUiMessages]   = useState<UiMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [input, setInput]             = useState("");
  const [typing, setTyping]           = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const [userId, setUserId]           = useState<string | null>(null);
  const [conversationId, setConvId]   = useState<string | null>(null);
  const [historyLoading, setHistLoad] = useState(true);

  const [dashStats, setDashStats]     = useState<DashStats>({ totalAccounts: 0, atRisk: 0, totalArr: 0, deliverables: 0 });
  const [accounts, setAccounts]       = useState<Account[]>([]);
  const [acctLoading, setAcctLoad]    = useState(true);
  const [addingAcct, setAddingAcct]   = useState(false);
  const [newCompany,    setNewCompany]    = useState("");
  const [newContact,    setNewContact]    = useState("");
  const [newArr,        setNewArr]        = useState("");
  const [newHealth,     setNewHealth]     = useState<AccountHealth>("green");
  const [newStage,      setNewStage]      = useState<AccountStage>("onboarding");
  const [healthFilter,  setHealthFilter]  = useState<AccountHealth | "all">("all");

  const [artifactHistory, setArtHistory]   = useState<(ArtifactData & { created_at: string })[]>([]);
  const [actions, setActions]              = useState<ActionItem[]>([]);
  const [actionsLoading, setActLoad]       = useState(true);
  const [openArtifact, setOpenArtifact]    = useState<(ArtifactData & { created_at: string }) | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  // ── auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/auth/session").then(r => r.json()).then(d => { if (d?.user?.id) setUserId(d.user.id); });
  }, []);

  // ── load everything once userId known ─────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    async function loadAll() {
      // chat history
      const hr = await fetch(`/api/agents/chat?agentId=carter&limit=40`);
      if (hr.ok) {
        const hd = await hr.json();
        const msgs = (hd.messages ?? []).map((m: ApiMessage) => ({
          role: m.role === "assistant" ? "agent" : "user", text: m.content,
        }));
        const api = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role, content: m.content }));
        setUiMessages(msgs); setApiMessages(api);
        if (msgs.length) setShowPrompts(false);
        if (hd.conversationId) setConvId(hd.conversationId);
      }
      setHistLoad(false);

      // accounts
      const acr = await fetch(`/api/agents/accounts`);
      if (acr.ok) {
        const acd = await acr.json();
        const accts: Account[] = (acd.accounts ?? acd ?? []).map((a: Record<string, unknown>) => ({
          id:            a.id as string,
          company:       a.company as string,
          contact_name:  a.contact_name as string | undefined,
          arr:           a.arr as number | undefined,
          health:        (a.health ?? "green") as AccountHealth,
          stage:         (a.stage ?? "active") as AccountStage,
          last_contact:  a.last_contact as string | undefined,
          notes:         a.notes as string | undefined,
        }));
        setAccounts(accts);
        const totalArr = accts.reduce((s, a) => s + (a.arr ?? 0), 0);
        const atRisk   = accts.filter(a => a.health === "yellow" || a.health === "red").length;
        setDashStats(p => ({ ...p, totalAccounts: accts.length, atRisk, totalArr }));
      }
      setAcctLoad(false);

      // goals
      const gr = await fetch(`/api/agents/goals?agentId=carter`);
      if (gr.ok) {
        const gd = await gr.json();
        setDashStats(p => ({ ...p, deliverables: gd.deliverables?.length ?? 0 }));
      }

      // artifacts
      const ar = await fetch(`/api/agents/artifacts?agentId=carter&limit=12`);
      if (ar.ok) {
        const ad = await ar.json();
        setArtHistory((ad.artifacts ?? []).map((a: RawArtifact) => ({
          id: a.id, type: a.artifact_type as ArtifactData["type"],
          title: a.title, content: a.content, created_at: a.created_at,
        })));
      }

      // actions
      const actr = await fetch(`/api/agents/actions?agentId=carter`);
      if (actr.ok) {
        const actd = await actr.json();
        setActions(actd.actions ?? []);
      }
      setActLoad(false);
    }
    loadAll();
  }, [userId]);

  // ── open artifact from URL param ──────────────────────────────────────────
  useEffect(() => {
    if (!targetArtifactId || !artifactHistory.length) return;
    const found = artifactHistory.find(a => a.id === targetArtifactId);
    if (found) { setOpenArtifact(found); setTab("deliverables"); }
  }, [targetArtifactId, artifactHistory]);

  // ── scroll chat to bottom ─────────────────────────────────────────────────
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [uiMessages]);

  // ── account CRUD ──────────────────────────────────────────────────────────
  async function addAccount() {
    if (!newCompany.trim()) return;
    const body: Record<string, unknown> = {
      company:       newCompany.trim(),
      contact_name:  newContact.trim() || undefined,
      arr:           newArr ? Number(newArr) : undefined,
      health:        newHealth,
      stage:         newStage,
    };
    const res = await fetch("/api/agents/accounts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      const acct: Account = data.account ?? { ...body, id: data.id ?? String(Date.now()) } as Account;
      setAccounts(p => [...p, acct]);
      setDashStats(p => ({
        ...p,
        totalAccounts: p.totalAccounts + 1,
        atRisk: p.atRisk + (newHealth !== "green" ? 1 : 0),
        totalArr: p.totalArr + (body.arr ? Number(body.arr) : 0),
      }));
    }
    setNewCompany(""); setNewContact(""); setNewArr(""); setNewHealth("green"); setNewStage("onboarding");
    setAddingAcct(false);
  }

  async function updateStage(id: string, stage: AccountStage) {
    setAccounts(p => p.map(a => a.id === id ? { ...a, stage } : a));
    await fetch(`/api/agents/accounts/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
  }

  async function deleteAccount(id: string) {
    const acct = accounts.find(a => a.id === id);
    setAccounts(p => p.filter(a => a.id !== id));
    setDashStats(p => ({
      ...p,
      totalAccounts: p.totalAccounts - 1,
      atRisk: p.atRisk - (acct && (acct.health === "yellow" || acct.health === "red") ? 1 : 0),
      totalArr: p.totalArr - (acct?.arr ?? 0),
    }));
    await fetch(`/api/agents/accounts/${id}`, { method: "DELETE" });
  }

  // ── send message ──────────────────────────────────────────────────────────
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
        body: JSON.stringify({ agentId: "carter", messages: nextApi, stream: true, conversationId }),
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
      if ((e as Error).name !== "AbortError")
        setUiMessages(p => [...p, { role: "agent", text: "Something went wrong. Please try again." }]);
    } finally { setTyping(false); }
  }, [typing, apiMessages, conversationId]);

  async function toggleAction(id: string, status: string) {
    const next = status === "done" ? "pending" : "done";
    setActions(p => p.map(a => a.id === id ? { ...a, status: next } : a));
    await fetch(`/api/agents/actions/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  }

  // ── derived ───────────────────────────────────────────────────────────────
  const visibleAccounts = healthFilter === "all" ? accounts : accounts.filter(a => a.health === healthFilter);
  const greenCount  = accounts.filter(a => a.health === "green").length;
  const yellowCount = accounts.filter(a => a.health === "yellow").length;
  const redCount    = accounts.filter(a => a.health === "red").length;

  // ─── sidebar ──────────────────────────────────────────────────────────────
  const Sidebar = (
    <WorkspaceSidebar
      name="Carter"
      role="CCO · Customer Success"
      emoji="💚"
      accent={accent}
      badge="NRR ENGINE"
      tabs={[
        { id: "chat",         label: "Chat",         icon: MessageSquare },
        { id: "accounts",     label: "Accounts",     icon: Users, badge: dashStats.atRisk > 0 ? dashStats.atRisk : undefined },
        { id: "deliverables", label: "Deliverables", icon: Package },
        { id: "actions",      label: "Actions",      icon: ListChecks },
      ]}
      activeTab={tab}
      onTabChange={id => setTab(id as Tab)}
      stats={[
        { label: "Total Accounts", value: dashStats.totalAccounts },
        { label: "At Risk",        value: dashStats.atRisk, color: dashStats.atRisk > 0 ? "#D97706" : undefined },
        { label: "Total ARR",      value: dashStats.totalArr > 0 ? fmtArr(dashStats.totalArr) : "—", color: accent },
        { label: "Deliverables",   value: dashStats.deliverables },
      ]}
      quickActions={CARTER_DELIVERABLES.slice(0, 4).map(d => ({
        label:   d.label,
        icon:    d.icon,
        onClick: () => { sendMessage(`Generate a ${d.label}`); setTab("chat"); },
      }))}
      alert={redCount > 0 ? { message: `${redCount} account${redCount > 1 ? "s" : ""} in critical health`, color: "#DC2626", icon: AlertTriangle } : undefined}
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
                fontSize: 24, margin: "0 auto 12px", border: `1px solid ${accent}44` }}>💚</div>
              <p style={{ fontSize: 17, fontWeight: 700, color: ink }}>Carter — Chief Customer Officer</p>
              <p style={{ fontSize: 13, color: muted, marginTop: 4 }}>Onboarding, health scorecards, churn prevention & expansion</p>
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
            {[0, 1, 2].map(j => (
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
            placeholder="Ask Carter about churn risk, QBRs, onboarding, expansion…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: 13, color: ink, resize: "none", fontFamily: "inherit", lineHeight: 1.5 }} />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || typing}
            style={{ width: 32, height: 32, borderRadius: 8,
              background: input.trim() && !typing ? accent : bdr,
              border: "none", cursor: input.trim() && !typing ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Send size={14} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );

  // ─── accounts tab ─────────────────────────────────────────────────────────
  const AccountsTab = (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0 }}>Customer Accounts</h2>
            <p style={{ fontSize: 12, color: muted, marginTop: 3 }}>Track health, ARR and engagement across your book</p>
          </div>
          <button onClick={() => setAddingAcct(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              borderRadius: 8, background: accent, border: "none",
              color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={13} /> Add Account
          </button>
        </div>

        {/* summary strip */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20,
          padding: "12px 16px", borderRadius: 12, background: surf, border: `1px solid ${bdr}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#16A34A" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{greenCount} Healthy</span>
          </div>
          <div style={{ width: 1, background: bdr }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#D97706" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{yellowCount} At Risk</span>
          </div>
          <div style={{ width: 1, background: bdr }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#DC2626" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{redCount} Critical</span>
          </div>
          <div style={{ width: 1, background: bdr }} />
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            <TrendingUp size={12} color={accent} />
            <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>
              {dashStats.totalArr > 0 ? fmtArr(dashStats.totalArr) : "—"} total ARR
            </span>
          </div>
        </div>

        {/* filters */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {(["all", "green", "yellow", "red"] as const).map(f => (
            <button key={f} onClick={() => setHealthFilter(f)}
              style={{ padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer",
                background: healthFilter === f
                  ? f === "all" ? ink : HEALTH_CONFIG[f as AccountHealth]?.dot
                  : "transparent",
                border: `1px solid ${healthFilter === f
                  ? f === "all" ? ink : HEALTH_CONFIG[f as AccountHealth]?.dot
                  : bdr}`,
                color: healthFilter === f ? "#fff" : muted }}>
              {f === "all" ? `All (${accounts.length})` : HEALTH_CONFIG[f as AccountHealth].label}
            </button>
          ))}
        </div>

        {/* add form */}
        <AnimatePresence>
          {addingAcct && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ padding: "16px", borderRadius: 12, background: surf, border: `1px solid ${accent}44`, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 12 }}>Add Account</p>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <input autoFocus value={newCompany} onChange={e => setNewCompany(e.target.value)} placeholder="Company *"
                  style={{ flex: 2, padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: "none", fontFamily: "inherit" }} />
                <input value={newContact} onChange={e => setNewContact(e.target.value)} placeholder="Contact name"
                  style={{ flex: 2, padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: "none", fontFamily: "inherit" }} />
                <input value={newArr} onChange={e => setNewArr(e.target.value)} placeholder="ARR ($)" type="number"
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: "none", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: muted }}>HEALTH</label>
                  <select value={newHealth} onChange={e => setNewHealth(e.target.value as AccountHealth)}
                    style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`,
                      background: bg, fontSize: 12, color: ink, outline: "none", fontFamily: "inherit", cursor: "pointer" }}>
                    <option value="green">Healthy</option>
                    <option value="yellow">At Risk</option>
                    <option value="red">Critical</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: muted }}>STAGE</label>
                  <select value={newStage} onChange={e => setNewStage(e.target.value as AccountStage)}
                    style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`,
                      background: bg, fontSize: 12, color: ink, outline: "none", fontFamily: "inherit", cursor: "pointer" }}>
                    {STAGE_ORDER.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addAccount} disabled={!newCompany.trim()}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: accent, border: "none",
                    color: "#fff", fontSize: 12, fontWeight: 600,
                    cursor: newCompany.trim() ? "pointer" : "default",
                    opacity: newCompany.trim() ? 1 : 0.5 }}>
                  Add
                </button>
                <button onClick={() => setAddingAcct(false)}
                  style={{ padding: "8px 16px", borderRadius: 8, background: "transparent",
                    border: `1px solid ${bdr}`, fontSize: 12, color: muted, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* list */}
        {acctLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: muted }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} /> Loading…
          </div>
        ) : visibleAccounts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
            <Users size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>
              {healthFilter === "all"
                ? "No accounts yet — add your first customer above"
                : `No accounts with ${HEALTH_CONFIG[healthFilter as AccountHealth]?.label ?? healthFilter} health`}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visibleAccounts.map(a => (
              <AccountCard key={a.id} account={a}
                onStageChange={updateStage}
                onDelete={deleteAccount}
                onAsk={prompt => { sendMessage(prompt); setTab("chat"); }}
              />
            ))}
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
        <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Onboarding sequences, health scorecards & playbooks</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
          {CARTER_DELIVERABLES.map(d => (
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
        <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Carter-recommended customer success tasks</p>
        {actionsLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: muted }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} /> Loading…
          </div>
        ) : actions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
            <ListChecks size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No actions yet — chat with Carter to get recommendations</p>
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
        {Sidebar}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {/* top bar */}
          <div style={{ padding: "14px 24px", borderBottom: `1px solid ${bdr}`,
            display: "flex", alignItems: "center", gap: 12, background: surf }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accent}22`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💚</div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: ink }}>Carter</span>
              <span style={{ fontSize: 12, color: muted, marginLeft: 8 }}>Chief Customer Officer · Customer Success</span>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: `${accent}18`,
                border: `1px solid ${accent}44`, borderRadius: 20, padding: "3px 10px", letterSpacing: "0.05em" }}>
                NRR ENGINE
              </span>
            </div>
          </div>

          {tab === "chat"         && ChatTab}
          {tab === "accounts"     && AccountsTab}
          {tab === "deliverables" && DeliverablesTab}
          {tab === "actions"      && ActionsTab}
        </div>
      </div>

      {/* artifact overlay */}
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
              onRefine={instruction => {
                setOpenArtifact(null);
                setTab("chat");
                setTimeout(() => sendMessage(`Refine the ${openArtifact.title}: ${instruction}`), 100);
              }}
              agentName="Carter"
              userId={userId ?? undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
