"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, TrendingUp, CheckCircle2, Paperclip,
  MessageSquare, Package, ListChecks, Phone, Briefcase,
  PieChart, BarChart2, FileText, ChevronRight, X, RefreshCw,
  Target, AlertCircle, Plus, ExternalLink,
} from "lucide-react";
import { bg, surf, bdr, ink, muted, green } from "@/features/agents/shared/constants/colors";
import { ARTIFACT_META } from "@/features/agents/shared/constants/artifact-meta";
import { DeliverablePanel } from "@/features/agents/shared/components/DeliverablePanel";
import { WorkspaceSidebar } from "@/features/agents/shared/components/WorkspaceSidebar";
import type { ArtifactData } from "@/features/agents/types/agent.types";

// ─── constants ────────────────────────────────────────────────────────────────

const accent = green;

const STAGES = [
  { id: "lead",        label: "Lead",        color: "#6B7280" },
  { id: "qualified",   label: "Qualified",   color: "#2563EB" },
  { id: "proposal",    label: "Proposal",    color: "#D97706" },
  { id: "negotiating", label: "Negotiating", color: "#7C3AED" },
  { id: "won",         label: "Won",         color: "#16A34A" },
  { id: "lost",        label: "Lost",        color: "#DC2626" },
] as const;

type StageId = typeof STAGES[number]["id"];

interface Deal {
  id: string;
  company: string;
  contact_name?: string;
  contact_email?: string;
  contact_title?: string;
  stage: StageId;
  value?: number;
  notes?: string;
  next_action?: string;
  next_action_date?: string;
  source?: string;
  created_at: string;
}

interface Reminder {
  id: string;
  company: string;
  contact_name?: string;
  stage: string;
  next_action?: string;
  label: string;
  isOverdue: boolean;
}

const SUSI_DELIVERABLES = [
  { type: "sales_script",     icon: FileText,  label: "Sales Script",       description: "Discovery questions, pitch, objection handling" },
  { type: "call_playbook",    icon: Phone,     label: "Call Playbook",      description: "Pre-call prep for a specific deal" },
  { type: "pipeline_report",  icon: PieChart,  label: "Pipeline Report",    description: "Stage analysis, velocity & recommended actions" },
  { type: "proposal",         icon: Briefcase, label: "Proposal",           description: "Branded proposal with ROI estimate" },
  { type: "win_loss_analysis",icon: BarChart2, label: "Win/Loss Analysis",  description: "Deal patterns, objection themes, competitive signals" },
];

const SUGGESTED = [
  "Design a cold outreach sequence for my product",
  "Help me qualify this lead better",
  "What should my sales process look like?",
  "How do I handle price objections?",
  "Build a discovery call script",
  "How do I scale from founder-led sales?",
];

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = "chat" | "pipeline" | "deliverables" | "actions";
interface UiMessage  { role: "agent" | "user" | "tool"; text: string; toolActivity?: { toolName: string; label: string; status: "running" | "done"; summary?: string }; }
interface ApiMessage { role: "user" | "assistant"; content: string; }
interface ActionItem { id: string; action_text: string; priority: string; status: string; action_type?: string; cta_label?: string; }

interface DashStats {
  totalDeals: number;
  pipelineValue: number;
  wonDeals: number;
  reminders: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

// ─── stage badge ─────────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: StageId }) {
  const s = STAGES.find(x => x.id === stage);
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
      background: (s?.color ?? "#6B7280") + "18",
      color: s?.color ?? "#6B7280",
      textTransform: "capitalize",
    }}>{s?.label ?? stage}</span>
  );
}

// ─── deal card ────────────────────────────────────────────────────────────────

function DealCard({ deal, onMove, onChat }: {
  deal: Deal;
  onMove: (id: string, stage: StageId) => void;
  onChat: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 10, padding: "12px 14px", marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{deal.company}</p>
          {deal.contact_name && <p style={{ fontSize: 11, color: muted, marginTop: 1 }}>{deal.contact_name}{deal.contact_title ? ` · ${deal.contact_title}` : ""}</p>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {deal.value && <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>{fmt$(deal.value)}</span>}
          <StageBadge stage={deal.stage} />
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: "hidden" }}>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${bdr}` }}>
              {deal.next_action && (
                <p style={{ fontSize: 11, color: muted, marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: ink }}>Next: </span>{deal.next_action}
                </p>
              )}
              {/* stage selector */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                {STAGES.filter(s => s.id !== deal.stage).map(s => (
                  <button key={s.id} onClick={() => onMove(deal.id, s.id)}
                    style={{ padding: "3px 9px", borderRadius: 5, fontSize: 10, fontWeight: 600, border: `1px solid ${bdr}`, background: bg, color: s.color, cursor: "pointer", fontFamily: "inherit" }}>
                    → {s.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onChat(`Help me follow up on my deal with ${deal.company}${deal.contact_name ? ` (${deal.contact_name})` : ""}. Stage: ${deal.stage}.${deal.next_action ? ` Planned next action: ${deal.next_action}` : ""}`)}
                style={{ padding: "5px 12px", borderRadius: 6, background: ink, color: bg, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>
                Ask Susi
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function SusiWorkspace() {
  const searchParams = useSearchParams();
  const targetArtifactId = searchParams.get("artifact");

  const [tab, setTab]               = useState<Tab>("chat");
  const [uiMessages, setUiMessages] = useState<UiMessage[]>([]);
  const [apiMessages, setApiMsgs]   = useState<ApiMessage[]>([]);
  const [input, setInput]           = useState("");
  const [typing, setTyping]         = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const [userId, setUserId]         = useState<string | null>(null);
  const [convId, setConvId]         = useState<string | null>(null);
  const [histLoading, setHistLoading] = useState(true);
  const [artifacts, setArtifacts]   = useState<ArtifactData[]>([]);
  const [viewing, setViewing]       = useState<ArtifactData | null>(null);
  const [actions, setActions]       = useState<ActionItem[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [deals, setDeals]           = useState<Deal[]>([]);
  const [_dealsLoading, setDealsLoading] = useState(true);
  const [reminders, setReminders]   = useState<Reminder[]>([]);
  const [scoreBoost, setScoreBoost] = useState<{ points: number; dimension: string } | null>(null);
  const [stats, setStats]           = useState<DashStats>({ totalDeals: 0, pipelineValue: 0, wonDeals: 0, reminders: 0 });
  const [pipelineFilter, setPipelineFilter] = useState<StageId | "all">("all");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [uiMessages, typing]);

  // ── load history ───────────────────────────────────────────────────────────
  useEffect(() => {
    import("@/features/agents/services/agent-chat.service")
      .then(({ loadAgentChatHistory }) => loadAgentChatHistory("susi", targetArtifactId))
      .then(result => {
        if (!result) return;
        setUserId(result.userId);
        if (result.conversationId) setConvId(result.conversationId);
        if (result.messages.length > 0) {
          setUiMessages(result.messages.map(m => ({ role: (m.role === "user" ? "user" : "agent") as "user" | "agent", text: m.content })));
          setApiMsgs(result.messages);
          setShowPrompts(false);
        }
        if (result.artifacts.length > 0) {
          const mapped: ArtifactData[] = result.artifacts.map(a => ({ id: a.id, type: a.artifact_type as ArtifactData["type"], title: a.title, content: a.content }));
          setArtifacts(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, [targetArtifactId]);

  // ── load deals + reminders ─────────────────────────────────────────────────
  useEffect(() => {
    Promise.allSettled([
      fetch("/api/agents/deals").then(r => r.ok ? r.json() : null),
      fetch("/api/agents/deals/reminders").then(r => r.ok ? r.json() : null),
    ]).then(([dealsRes, remRes]) => {
      if (dealsRes.status === "fulfilled" && dealsRes.value?.deals) {
        const d: Deal[] = dealsRes.value.deals;
        setDeals(d);
        const active = d.filter(x => x.stage !== "won" && x.stage !== "lost");
        const won    = d.filter(x => x.stage === "won");
        const val    = active.reduce((s, x) => s + (x.value ?? 0), 0);
        setStats(prev => ({ ...prev, totalDeals: active.length, pipelineValue: val, wonDeals: won.length }));
      }
      if (remRes.status === "fulfilled" && remRes.value?.reminders) {
        const r: Reminder[] = remRes.value.reminders;
        setReminders(r);
        setStats(prev => ({ ...prev, reminders: r.length }));
      }
    }).finally(() => setDealsLoading(false));
  }, []);

  // ── load actions ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!convId) return;
    fetch(`/api/agents/actions?conversationId=${convId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.actions?.length) setActions(d.actions); })
      .catch(() => {});
  }, [convId]);

  // ── move deal stage ────────────────────────────────────────────────────────
  const moveDeal = useCallback(async (dealId: string, stage: StageId) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage } : d));
    await fetch("/api/agents/deals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: dealId, stage }),
    });
  }, []);

  // ── send message ───────────────────────────────────────────────────────────
  const callAI = useCallback(async (history: ApiMessage[], cId: string | null) => {
    setTyping(true);
    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "susi",
          message: history[history.length - 1]?.content ?? "",
          conversationHistory: history.slice(0, -1),
          userId: userId ?? undefined,
          conversationId: cId ?? undefined,
          stream: true,
        }),
      });

      if (res.status === 429) {
        setUiMessages(p => [...p, { role: "agent", text: "Monthly message limit reached (50). Resets on the 1st." }]);
        return;
      }

      if (res.headers.get("content-type")?.includes("text/event-stream")) {
        setUiMessages(p => [...p, { role: "agent", text: "" }]);
        let fullText = "";
        const reader = res.body?.getReader();
        if (!reader) return;
        const dec = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const p = JSON.parse(line.slice(6).trim());
              if (p.type === "delta" && p.text) {
                fullText += p.text;
                setUiMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "agent", text: fullText }; return u; });
              } else if (p.type === "tool_start") {
                setUiMessages(prev => [...prev, { role: "tool", text: "", toolActivity: { toolName: p.toolName, label: p.label, status: "running" } }]);
              } else if (p.type === "tool_done") {
                setUiMessages(prev => {
                  const u = [...prev];
                  const idx = [...u].reverse().findIndex(m => m.role === "tool" && m.toolActivity?.toolName === p.toolName && m.toolActivity?.status === "running");
                  if (idx !== -1) u[u.length - 1 - idx] = { ...u[u.length - 1 - idx], toolActivity: { ...u[u.length - 1 - idx].toolActivity!, status: "done", summary: p.summary } };
                  return u;
                });
                // refresh deals if a deal was created
                if (p.toolName === "create_deal") {
                  fetch("/api/agents/deals").then(r => r.ok ? r.json() : null).then(d => { if (d?.deals) setDeals(d.deals); }).catch(() => {});
                }
              } else if (p.type === "artifact" && p.artifact) {
                const a = p.artifact as { id: string; type: string; title: string; content: Record<string, unknown> };
                const newA: ArtifactData = { id: a.id, type: a.type as ArtifactData["type"], title: a.title, content: a.content };
                setArtifacts(prev => [...prev, newA]);
                setViewing(newA);
              } else if (p.type === "done" && p.conversationId && !cId) {
                setConvId(p.conversationId);
              } else if (p.type === "score_signal" && p.boosted) {
                setScoreBoost({ points: p.pointsAdded, dimension: p.dimensionLabel });
                setTimeout(() => setScoreBoost(null), 4000);
              }
            } catch { /* skip */ }
          }
        }
        setApiMsgs(p => [...p, { role: "assistant", content: fullText }]);
        return;
      }

      const data = await res.json();
      const reply = data.response ?? data.content ?? "Sorry, try again.";
      if (data.conversationId && !cId) setConvId(data.conversationId);
      setUiMessages(p => [...p, { role: "agent", text: reply }]);
      setApiMsgs(p => [...p, { role: "assistant", content: reply }]);
      if (data.artifact) {
        const newA: ArtifactData = { id: data.artifact.id, type: data.artifact.type, title: data.artifact.title, content: data.artifact.content };
        setArtifacts(prev => [...prev, newA]);
        setViewing(newA);
      }
    } catch {
      setUiMessages(p => [...p, { role: "agent", text: "Connection issue — please try again." }]);
    } finally {
      setTyping(false);
    }
  }, [userId]);

  const handleSend = useCallback((text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || typing) return;
    setShowPrompts(false);
    setInput("");
    if (tab !== "chat") setTab("chat");
    const newHistory = [...apiMessages, { role: "user" as const, content: msg }];
    setUiMessages(p => [...p, { role: "user", text: msg }]);
    setApiMsgs(newHistory);
    callAI(newHistory, convId);
  }, [input, typing, apiMessages, callAI, convId, tab]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleExtractActions = useCallback(async () => {
    if (extracting || apiMessages.length < 4) return;
    setExtracting(true);
    try {
      const res = await fetch("/api/agents/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationHistory: apiMessages, agentId: "susi", conversationId: convId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.actions?.length) setActions(data.actions);
      }
    } finally { setExtracting(false); }
  }, [extracting, apiMessages, convId]);

  const handleToggleAction = useCallback(async (id: string, current: string) => {
    const next = current === "pending" ? "in_progress" : current === "in_progress" ? "done" : "pending";
    setActions(prev => prev.map(a => a.id === id ? { ...a, status: next } : a));
    await fetch("/api/agents/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: id, status: next }),
    });
  }, []);

  if (histLoading) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bg }}>
      <p style={{ fontSize: 13, color: muted }}>Loading…</p>
    </div>
  );

  const filteredDeals = pipelineFilter === "all" ? deals : deals.filter(d => d.stage === pipelineFilter);
  const pendingActions = actions.filter(a => a.status !== "done").length;

  const TABS: { id: Tab; label: string; icon: typeof MessageSquare; count?: number }[] = [
    { id: "chat",         label: "Chat",         icon: MessageSquare },
    { id: "pipeline",     label: "Pipeline",     icon: Target,      count: stats.totalDeals || undefined },
    { id: "deliverables", label: "Deliverables", icon: Package,     count: artifacts.length || undefined },
    { id: "actions",      label: "Actions",      icon: ListChecks,  count: pendingActions || undefined },
  ];

  return (
    <div style={{ height: "100vh", display: "flex", overflow: "hidden", background: bg, color: ink }}>

      {/* score boost toast */}
      <AnimatePresence>
        {scoreBoost && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 1000,
              background: "#052e16", color: "#bbf7d0", borderRadius: 12, padding: "10px 20px",
              display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600,
              boxShadow: "0 4px 24px rgba(0,0,0,0.18)", pointerEvents: "none" }}>
            <TrendingUp size={15} style={{ color: "#4ade80" }} />
            Q-Score +{scoreBoost.points} pts · {scoreBoost.dimension} boosted
          </motion.div>
        )}
      </AnimatePresence>

      <WorkspaceSidebar
        name="Susi"
        role="CRO · Sales"
        emoji="📞"
        accent={accent}
        badge="AI SDR"
        tabs={TABS.map(t => ({ id: t.id, label: t.label, icon: t.icon, badge: t.count }))}
        activeTab={tab}
        onTabChange={id => setTab(id as Tab)}
        stats={[
          { label: "Active Deals",  value: stats.totalDeals },
          { label: "Pipeline",      value: fmt$(stats.pipelineValue) },
          { label: "Won",           value: stats.wonDeals, color: "#16A34A" },
          { label: "Reminders",     value: stats.reminders, color: stats.reminders > 0 ? "#D97706" : undefined },
        ]}
        quickActions={SUSI_DELIVERABLES.slice(0, 4).map(d => ({
          label: d.label,
          icon: d.icon,
          onClick: () => { handleSend(`Generate a ${d.label.toLowerCase()} for my business`); setTab("chat"); },
        }))}
        alert={stats.reminders > 0 ? {
          message: `${stats.reminders} follow-up${stats.reminders > 1 ? "s" : ""} overdue`,
          color: "#D97706",
          icon: AlertCircle,
        } : undefined}
      />

      {/* ════ MAIN AREA ═══════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* top bar */}
        <div style={{ flexShrink: 0, height: 52, borderBottom: `1px solid ${bdr}`, background: bg, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 7, background: active ? ink : "transparent", color: active ? bg : muted, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: active ? 600 : 400, transition: "all .15s" }}>
                  <Icon size={12} />
                  {t.label}
                  {t.count !== undefined && t.count > 0 && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 999, background: active ? "#ffffff30" : accent + "20", color: active ? "#fff" : accent }}>{t.count}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ padding: "3px 10px", background: accent + "12", border: `1px solid ${accent}30`, borderRadius: 999, fontSize: 11, color: accent, fontWeight: 600 }}>AI SDR</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 11, color: muted }}>
              <TrendingUp size={10} style={{ color: accent }} /> Traction Score
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>

          {/* ── CHAT ──────────────────────────────────────────────────────── */}
          {tab === "chat" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
                <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* follow-up reminders */}
                  {reminders.length > 0 && (
                    <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "12px 14px" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Follow-up Reminders</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {reminders.map(r => (
                          <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            <div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{r.company}</span>
                              {r.contact_name && <span style={{ fontSize: 11, color: muted }}> · {r.contact_name}</span>}
                              <span style={{ fontSize: 10, marginLeft: 6, padding: "2px 6px", borderRadius: 4, background: r.isOverdue ? "#FEE2E2" : "#FEF3C7", color: r.isOverdue ? "#B91C1C" : "#92400E", fontWeight: 600 }}>{r.label}</span>
                              {r.next_action && <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>{r.next_action}</p>}
                            </div>
                            <button onClick={() => handleSend(`Help me follow up on my deal with ${r.company}${r.next_action ? `. Next action: ${r.next_action}` : ""}`)}
                              style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#F59E0B", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}>
                              Follow Up
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <AnimatePresence>
                    {showPrompts && (
                      <motion.div key="prompts" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                          <div style={{ height: 28, width: 28, borderRadius: 8, flexShrink: 0, marginTop: 2, background: surf, border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: accent }}>S</div>
                          <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, borderTopLeftRadius: 4, padding: "12px 16px", fontSize: 14, lineHeight: 1.65, color: ink, maxWidth: "82%" }}>
                            I&apos;m Susi, your CRO. I build repeatable sales systems — discovery scripts, call playbooks, proposals, and win/loss analysis. I can also add deals to your pipeline directly. What are we closing today?
                          </div>
                        </div>
                        <div style={{ paddingLeft: 38, display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {SUGGESTED.map((p, i) => (
                            <button key={i} onClick={() => handleSend(p)}
                              style={{ padding: "7px 14px", borderRadius: 999, fontSize: 12, background: bg, border: `1px solid ${bdr}`, color: muted, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = ink; e.currentTarget.style.color = ink; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.color = muted; }}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {uiMessages.map((msg, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                      style={{ display: "flex", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                      {msg.role === "agent" && (
                        <div style={{ height: 28, width: 28, borderRadius: 8, flexShrink: 0, marginTop: 2, background: surf, border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: accent }}>S</div>
                      )}
                      {msg.role === "tool" && msg.toolActivity && (
                        <motion.div initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: surf, border: `1px solid ${bdr}`, borderRadius: 10, fontSize: 12, color: muted, maxWidth: "72%" }}>
                          {msg.toolActivity.status === "running"
                            ? <motion.div style={{ height: 8, width: 8, borderRadius: "50%", border: `2px solid ${muted}`, borderTopColor: "transparent" }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }} />
                            : <CheckCircle2 size={12} style={{ color: accent }} />}
                          <span>{msg.toolActivity.status === "running" ? msg.toolActivity.label : (msg.toolActivity.summary ?? msg.toolActivity.label)}</span>
                        </motion.div>
                      )}
                      {msg.role !== "tool" && (
                        <div style={{ background: msg.role === "user" ? ink : surf, color: msg.role === "user" ? bg : ink, border: msg.role === "user" ? "none" : `1px solid ${bdr}`, borderRadius: 14, borderTopLeftRadius: msg.role === "agent" ? 4 : 14, borderTopRightRadius: msg.role === "user" ? 4 : 14, padding: "10px 14px", fontSize: 14, lineHeight: 1.65, maxWidth: "82%", whiteSpace: "pre-wrap" }}>
                          {msg.text}
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {typing && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 10 }}>
                      <div style={{ height: 28, width: 28, borderRadius: 8, flexShrink: 0, background: surf, border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: accent }}>S</div>
                      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, borderTopLeftRadius: 4, padding: "10px 14px", display: "flex", gap: 4, alignItems: "center" }}>
                        {[0, 1, 2].map(j => <motion.span key={j} style={{ height: 5, width: 5, borderRadius: "50%", background: muted, display: "inline-block" }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: j * 0.2 }} />)}
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* input */}
              <div style={{ flexShrink: 0, padding: "12px 28px 20px", borderTop: `1px solid ${bdr}`, background: bg }}>
                <div style={{ maxWidth: 680, margin: "0 auto" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "10px 14px", background: surf, border: `1px solid ${bdr}`, borderRadius: 12 }}>
                    <label style={{ cursor: "pointer", flexShrink: 0, marginBottom: 2 }}>
                      <Paperclip size={16} style={{ color: muted }} />
                      <input type="file" style={{ display: "none" }} />
                    </label>
                    <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                      placeholder="Ask Susi about sales, deals, objections…" rows={1}
                      style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: ink, fontFamily: "inherit", resize: "none", lineHeight: 1.5, maxHeight: 120, overflowY: "auto" }} />
                    <button onClick={() => handleSend()} disabled={!input.trim() || typing}
                      style={{ height: 32, width: 32, borderRadius: 8, flexShrink: 0, background: !input.trim() || typing ? bdr : ink, border: "none", cursor: !input.trim() || typing ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s" }}>
                      <Send size={14} style={{ color: !input.trim() || typing ? muted : bg }} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PIPELINE ──────────────────────────────────────────────────── */}
          {tab === "pipeline" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
              <div style={{ maxWidth: 860, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: ink, marginBottom: 4 }}>Pipeline</h2>
                    <p style={{ fontSize: 13, color: muted }}>{deals.length} total deals · {fmt$(stats.pipelineValue)} active value</p>
                  </div>
                  <button onClick={() => { setTab("chat"); setTimeout(() => handleSend("Help me add a new deal to the pipeline"), 100); }}
                    style={{ padding: "8px 14px", borderRadius: 8, background: ink, color: bg, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                    <Plus size={12} /> Add deal
                  </button>
                </div>

                {/* stage summary strip */}
                <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
                  {STAGES.map(s => {
                    const count = deals.filter(d => d.stage === s.id).length;
                    const value = deals.filter(d => d.stage === s.id).reduce((sum, d) => sum + (d.value ?? 0), 0);
                    return (
                      <button key={s.id} onClick={() => setPipelineFilter(pipelineFilter === s.id ? "all" : s.id)}
                        style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${pipelineFilter === s.id ? s.color : bdr}`, background: pipelineFilter === s.id ? s.color + "10" : bg, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.label}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: ink, marginTop: 2 }}>{count}</p>
                        {value > 0 && <p style={{ fontSize: 10, color: muted, marginTop: 1 }}>{fmt$(value)}</p>}
                      </button>
                    );
                  })}
                </div>

                {/* deal list */}
                {filteredDeals.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 24px" }}>
                    <Target size={28} style={{ color: bdr, marginBottom: 12 }} />
                    <p style={{ fontSize: 14, color: muted, marginBottom: 8 }}>No deals yet</p>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Ask Susi to add deals to your pipeline from your conversations.</p>
                    <button onClick={() => setTab("chat")} style={{ padding: "8px 20px", borderRadius: 8, background: ink, color: bg, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>Go to chat</button>
                  </div>
                ) : (
                  filteredDeals.map(deal => (
                    <DealCard key={deal.id} deal={deal} onMove={moveDeal}
                      onChat={msg => { setTab("chat"); setTimeout(() => handleSend(msg), 100); }} />
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── DELIVERABLES ──────────────────────────────────────────────── */}
          {tab === "deliverables" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
              <div style={{ maxWidth: 840, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: ink, marginBottom: 4 }}>Deliverables</h2>
                    <p style={{ fontSize: 13, color: muted }}>{artifacts.length} built · {SUSI_DELIVERABLES.length - artifacts.length} remaining</p>
                  </div>
                  <button onClick={() => { setTab("chat"); setTimeout(() => handleSend("What sales deliverable should I build next?"), 100); }}
                    style={{ padding: "8px 16px", borderRadius: 8, background: ink, color: bg, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>+ Build new</button>
                </div>

                <p style={{ fontSize: 11, fontWeight: 700, color: muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Available</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, marginBottom: 28 }}>
                  {SUSI_DELIVERABLES.map(d => {
                    const Icon = d.icon;
                    const built = artifacts.find(a => a.type === d.type);
                    return (
                      <button key={d.type}
                        onClick={() => { if (built) setViewing(built); else { setTab("chat"); setTimeout(() => handleSend(`Generate a ${d.label.toLowerCase()} for my business`), 100); } }}
                        style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderRadius: 10, textAlign: "left", background: built ? "#F0FDF4" : bg, border: `1.5px solid ${built ? "#86EFAC" : bdr}`, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = built ? "#4ADE80" : accent; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = built ? "#86EFAC" : bdr; }}>
                        <div style={{ height: 32, width: 32, borderRadius: 8, flexShrink: 0, background: (ARTIFACT_META[d.type]?.color ?? accent) + "14", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {built ? <CheckCircle2 size={16} style={{ color: "#16A34A" }} /> : <Icon size={16} style={{ color: ARTIFACT_META[d.type]?.color ?? accent }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 3 }}>{d.label}</p>
                          <p style={{ fontSize: 11, color: muted, lineHeight: 1.4 }}>{built ? "Built · click to view" : d.description}</p>
                        </div>
                        <ChevronRight size={12} style={{ color: muted, flexShrink: 0, marginTop: 2 }} />
                      </button>
                    );
                  })}
                </div>

                {artifacts.length > 0 && (
                  <>
                    <p style={{ fontSize: 11, fontWeight: 700, color: muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>History</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[...artifacts].reverse().map(a => {
                        const meta = ARTIFACT_META[a.type];
                        const Icon = meta?.icon ?? FileText;
                        return (
                          <div key={a.id} onClick={() => setViewing(a)}
                            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, background: bg, border: `1px solid ${bdr}`, cursor: "pointer", transition: "border-color .15s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = accent; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = bdr; }}>
                            <Icon size={14} style={{ color: meta?.color ?? accent, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</p>
                              <p style={{ fontSize: 11, color: muted }}>{meta?.label ?? a.type}</p>
                            </div>
                            <ExternalLink size={12} style={{ color: muted }} />
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── ACTIONS ───────────────────────────────────────────────────── */}
          {tab === "actions" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
              <div style={{ maxWidth: 680, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: ink, marginBottom: 4 }}>Actions</h2>
                    <p style={{ fontSize: 13, color: muted }}>{pendingActions} pending · {actions.filter(a => a.status === "done").length} done</p>
                  </div>
                  <button onClick={handleExtractActions} disabled={extracting || apiMessages.length < 4}
                    style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: extracting ? muted : ink, cursor: extracting || apiMessages.length < 4 ? "default" : "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                    <RefreshCw size={11} style={{ animation: extracting ? "spin 1s linear infinite" : "none" }} />
                    {extracting ? "Extracting…" : "Extract from chat"}
                  </button>
                </div>

                {actions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 24px" }}>
                    <ListChecks size={28} style={{ color: bdr, marginBottom: 12 }} />
                    <p style={{ fontSize: 14, color: muted, marginBottom: 8 }}>No actions yet</p>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Chat with Susi, then extract next steps.</p>
                    <button onClick={() => setTab("chat")} style={{ padding: "8px 20px", borderRadius: 8, background: ink, color: bg, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>Go to chat</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {actions.map(item => {
                      const pColor = item.priority === "high" ? "#DC2626" : item.priority === "medium" ? "#D97706" : muted;
                      return (
                        <div key={item.id} style={{ padding: "14px 16px", borderRadius: 10, background: item.status === "done" ? "#F0FDF4" : bg, border: `1px solid ${item.status === "done" ? "#86EFAC" : bdr}`, display: "flex", alignItems: "flex-start", gap: 12 }}>
                          <button onClick={() => handleToggleAction(item.id, item.status)}
                            style={{ height: 20, width: 20, borderRadius: 6, flexShrink: 0, marginTop: 1, border: `1.5px solid ${item.status === "done" ? "#16A34A" : bdr}`, background: item.status === "done" ? "#16A34A" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {item.status === "done" && <CheckCircle2 size={12} style={{ color: "#fff" }} />}
                            {item.status === "in_progress" && <motion.div style={{ height: 6, width: 6, borderRadius: "50%", background: "#D97706" }} animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }} />}
                          </button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: item.status === "done" ? muted : ink, textDecoration: item.status === "done" ? "line-through" : "none", marginBottom: 6 }}>{item.action_text}</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: pColor, textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.priority}</span>
                              <span style={{ fontSize: 10, color: muted }}>·</span>
                              <span style={{ fontSize: 10, color: muted, textTransform: "capitalize" }}>{item.status.replace("_", " ")}</span>
                            </div>
                          </div>
                          {item.status !== "done" && (
                            <button onClick={() => { setTab("chat"); setTimeout(() => handleSend(`Let's work on this: ${item.action_text}`), 100); }}
                              style={{ padding: "5px 12px", borderRadius: 6, background: ink, color: bg, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", flexShrink: 0 }}>
                              {item.cta_label ?? "Execute"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── artifact viewer overlay ──────────────────────────────────────────── */}
      <AnimatePresence>
        {viewing && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewing(null)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 200 }} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 26, stiffness: 240 }}
              style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(780px, 90vw)", zIndex: 201, background: bg, boxShadow: "-8px 0 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${bdr}`, flexShrink: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>{viewing.title}</p>
                <button onClick={() => setViewing(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                  <X size={16} style={{ color: muted }} />
                </button>
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <DeliverablePanel artifact={viewing} artifactHistory={artifacts.filter(a => a.type === viewing.type)} onSelectArtifact={setViewing} onClose={() => setViewing(null)}
                  onRefine={inst => { setViewing(null); setTab("chat"); setTimeout(() => handleSend(`Refine the ${viewing.title}: ${inst}`), 100); }} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
