"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, TrendingUp, FileText, CheckCircle2,
  Paperclip, Mail, Users, BarChart3, Swords, BookOpen,
  MessageSquare, Package, ListChecks, ChevronRight, X,
  RefreshCw, ExternalLink, Target, Compass, Megaphone,
} from "lucide-react";
import { bg, surf, bdr, ink, muted, blue } from "@/features/agents/shared/constants/colors";
import { ARTIFACT_META } from "@/features/agents/shared/constants/artifact-meta";
import { DeliverablePanel } from "@/features/agents/shared/components/DeliverablePanel";
import { WorkspaceSidebar } from "@/features/agents/shared/components/WorkspaceSidebar";
import { DiagnosticSidebar } from "@/features/agents/patel/components/DiagnosticSidebar";
import { ClosingRecommendationCard } from "@/features/agents/patel/components/ClosingRecommendationCard";
import type { ArtifactData } from "@/features/agents/types/agent.types";

// ─── constants ────────────────────────────────────────────────────────────────

const accent = blue;

const PATEL_DELIVERABLES = [
  { type: "icp_document",           icon: FileText,  label: "D1 · ICP Definition",      description: "Define your ideal customer profile" },
  { type: "pains_gains_triggers",   icon: Target,    label: "D2 · Pains & Gains",        description: "Map buyer pain, triggers & objections" },
  { type: "buyer_journey",          icon: Compass,   label: "D3 · Buyer Journey",         description: "Stage-by-stage GTM motion map" },
  { type: "positioning_messaging",  icon: Megaphone, label: "D4 · Positioning",           description: "Value prop, pillars & channel copy" },
  { type: "outreach_sequence",      icon: Mail,      label: "Outreach Sequence",          description: "5-step personalised email sequence" },
  { type: "battle_card",            icon: Swords,    label: "Battle Card",                description: "Win vs your top competitor" },
  { type: "gtm_playbook",           icon: BookOpen,  label: "GTM Playbook",               description: "Full go-to-market execution plan" },
  { type: "lead_list",              icon: Users,     label: "Lead List",                  description: "Apollo-sourced target contacts" },
  { type: "campaign_report",        icon: BarChart3, label: "Campaign Report",            description: "Email + channel performance analysis" },
];

const SUGGESTED = [
  "Build D1 ICP Definition for my startup",
  "Build D2 Pains & Gains map for my startup",
  "Build D3 Buyer Journey map for my startup",
  "Build D4 Positioning & Messaging for my startup",
  "Find 20 B2B SaaS CTOs and send them our outreach",
  "Build a battle card against our top competitor",
];

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = "chat" | "deliverables" | "actions";
interface UiMessage  { role: "agent" | "user" | "tool"; text: string; toolActivity?: { toolName: string; label: string; status: "running" | "done"; summary?: string }; }
interface ApiMessage { role: "user" | "assistant"; content: string; }
interface ActionItem { id: string; action_text: string; priority: string; status: string; action_type?: string; cta_label?: string; }
interface DashStats  { sent: number; openRate: number; replyRate: number; openDeals: number; deliverables: number; }

// ─── main page ────────────────────────────────────────────────────────────────

export default function PatelWorkspace() {
  const _router = useRouter();
  const searchParams = useSearchParams();
  const targetArtifactId = searchParams.get("artifact");

  // ── state ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>("chat");
  const [uiMessages, setUiMessages]     = useState<UiMessage[]>([]);
  const [apiMessages, setApiMessages]   = useState<ApiMessage[]>([]);
  const [input, setInput]               = useState("");
  const [typing, setTyping]             = useState(false);
  const [showPrompts, setShowPrompts]   = useState(true);
  const [userId, setUserId]             = useState<string | null>(null);
  const [conversationId, setConvId]     = useState<string | null>(null);
  const [historyLoading, setHistLoading]= useState(true);
  const [artifactHistory, setArtifacts] = useState<ArtifactData[]>([]);
  const [_activeArtifact, setActive]    = useState<ArtifactData | null>(null);
  const [viewingArtifact, setViewing]   = useState<ArtifactData | null>(null);
  const [actionItems, setActions]       = useState<ActionItem[]>([]);
  const [extracting, setExtracting]     = useState(false);
  const [scoreBoost, setScoreBoost]     = useState<{ points: number; dimension: string } | null>(null);
  const [stats, setStats]               = useState<DashStats>({ sent: 0, openRate: 0, replyRate: 0, openDeals: 0, deliverables: 0 });
  const [_statsLoading, setStatsLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── scroll ─────────────────────────────────────────────────────────────────
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [uiMessages, typing]);

  // ── load history ───────────────────────────────────────────────────────────
  useEffect(() => {
    import("@/features/agents/services/agent-chat.service")
      .then(({ loadAgentChatHistory }) => loadAgentChatHistory("patel", targetArtifactId))
      .then(result => {
        if (!result) return;
        setUserId(result.userId);
        if (result.conversationId) setConvId(result.conversationId);
        if (result.messages.length > 0) {
          setUiMessages(result.messages.map(m => ({ role: m.role === "user" ? "user" : "agent" as "user" | "agent", text: m.content })));
          setApiMessages(result.messages);
          setShowPrompts(false);
        }
        if (result.artifacts.length > 0) {
          const mapped: ArtifactData[] = result.artifacts.map(a => ({ id: a.id, type: a.artifact_type as ArtifactData["type"], title: a.title, content: a.content }));
          setArtifacts(mapped);
          const target = targetArtifactId ? (mapped.find(a => a.id === targetArtifactId) ?? mapped[mapped.length - 1]) : mapped[mapped.length - 1];
          setActive(target);
        }
      })
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, [targetArtifactId]);

  // ── load actions ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;
    fetch(`/api/agents/actions?conversationId=${conversationId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.actions?.length) setActions(d.actions); })
      .catch(() => {});
  }, [conversationId]);

  // ── load dashboard stats ───────────────────────────────────────────────────
  useEffect(() => {
    Promise.allSettled([
      fetch("/api/agents/goals").then(r => r.ok ? r.json() : null),
    ]).then(([goalsRes]) => {
      const goals = goalsRes.status === "fulfilled" ? goalsRes.value : null;
      const patelGoal = goals?.goals?.find((g: { agent_id: string }) => g.agent_id === "patel");
      if (patelGoal?.state_snapshot) {
        const snap = patelGoal.state_snapshot as Record<string, number | null>;
        setStats(prev => ({
          ...prev,
          sent:      snap.outreach_sent_count ?? 0,
          openRate:  snap.outreach_open_rate  ?? 0,
          replyRate: snap.outreach_reply_rate ?? 0,
          openDeals: snap.open_deals_count    ?? 0,
        }));
      }
    }).finally(() => setStatsLoading(false));
  }, []);

  // keep deliverable count in sync
  useEffect(() => {
    setStats(prev => ({ ...prev, deliverables: artifactHistory.length }));
  }, [artifactHistory]);

  // ── send message ───────────────────────────────────────────────────────────
  const callAI = useCallback(async (history: ApiMessage[], convId: string | null) => {
    setTyping(true);
    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "patel",
          message: history[history.length - 1]?.content ?? "",
          conversationHistory: history.slice(0, -1),
          userId: userId ?? undefined,
          conversationId: convId ?? undefined,
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
            try {
              const parsed = JSON.parse(line.slice(6).trim());
              if (parsed.type === "delta" && parsed.text) {
                fullText += parsed.text;
                setUiMessages(p => { const u = [...p]; u[u.length - 1] = { role: "agent", text: fullText }; return u; });
              } else if (parsed.type === "tool_start") {
                setUiMessages(p => [...p, { role: "tool", text: "", toolActivity: { toolName: parsed.toolName, label: parsed.label, status: "running" } }]);
              } else if (parsed.type === "tool_done") {
                setUiMessages(p => {
                  const u = [...p];
                  const idx = [...u].reverse().findIndex(m => m.role === "tool" && m.toolActivity?.toolName === parsed.toolName && m.toolActivity?.status === "running");
                  if (idx !== -1) u[u.length - 1 - idx] = { ...u[u.length - 1 - idx], toolActivity: { ...u[u.length - 1 - idx].toolActivity!, status: "done", summary: parsed.summary } };
                  return u;
                });
              } else if (parsed.type === "artifact" && parsed.artifact) {
                const a = parsed.artifact as { id: string; type: string; title: string; content: Record<string, unknown> };
                const newA: ArtifactData = { id: a.id, type: a.type as ArtifactData["type"], title: a.title, content: a.content };
                setArtifacts(prev => [...prev, newA]);
                setActive(newA);
                setViewing(newA);
              } else if (parsed.type === "done" && parsed.conversationId && !convId) {
                setConvId(parsed.conversationId);
              } else if (parsed.type === "score_signal" && parsed.boosted) {
                setScoreBoost({ points: parsed.pointsAdded, dimension: parsed.dimensionLabel });
                setTimeout(() => setScoreBoost(null), 4000);
              }
            } catch { /* skip */ }
          }
        }
        setApiMessages(p => [...p, { role: "assistant", content: fullText }]);
        return;
      }

      const data = await res.json();
      const reply = data.response ?? data.content ?? "Sorry, try again.";
      if (data.conversationId && !convId) setConvId(data.conversationId);
      setUiMessages(p => [...p, { role: "agent", text: reply }]);
      setApiMessages(p => [...p, { role: "assistant", content: reply }]);
      if (data.artifact) {
        const newA: ArtifactData = { id: data.artifact.id, type: data.artifact.type, title: data.artifact.title, content: data.artifact.content };
        setArtifacts(prev => [...prev, newA]);
        setActive(newA);
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
    setApiMessages(newHistory);
    callAI(newHistory, conversationId);
  }, [input, typing, apiMessages, callAI, conversationId, tab]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── extract actions ────────────────────────────────────────────────────────
  const handleExtractActions = useCallback(async () => {
    if (extracting || apiMessages.length < 4) return;
    setExtracting(true);
    try {
      const res = await fetch("/api/agents/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationHistory: apiMessages, agentId: "patel", conversationId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.actions?.length) setActions(data.actions);
      }
    } finally { setExtracting(false); }
  }, [extracting, apiMessages, conversationId]);

  const handleToggleAction = useCallback(async (id: string, current: string) => {
    const next = current === "pending" ? "in_progress" : current === "in_progress" ? "done" : "pending";
    setActions(prev => prev.map(a => a.id === id ? { ...a, status: next } : a));
    await fetch("/api/agents/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: id, status: next }),
    });
  }, []);

  if (historyLoading) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bg }}>
      <p style={{ fontSize: 13, color: muted }}>Loading…</p>
    </div>
  );

  const TABS: { id: Tab; label: string; icon: typeof MessageSquare; count?: number }[] = [
    { id: "chat",         label: "Chat",         icon: MessageSquare },
    { id: "deliverables", label: "Deliverables", icon: Package,     count: artifactHistory.length },
    { id: "actions",      label: "Actions",      icon: ListChecks,  count: actionItems.filter(a => a.status !== "done").length || undefined },
  ];

  return (
    <div style={{ height: "100vh", display: "flex", overflow: "hidden", background: bg, color: ink }}>

      {/* ── score boost toast ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {scoreBoost && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 1000,
              background: "#052e16", color: "#bbf7d0", borderRadius: 12, padding: "10px 20px",
              display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600,
              boxShadow: "0 4px 24px rgba(0,0,0,0.18)", pointerEvents: "none" }}
          >
            <TrendingUp size={15} style={{ color: "#4ade80" }} />
            Q-Score +{scoreBoost.points} pts · {scoreBoost.dimension} boosted
          </motion.div>
        )}
      </AnimatePresence>

      <WorkspaceSidebar
        name="Patel"
        role="CMO · Go-to-Market"
        emoji="📈"
        accent={accent}
        badge="AGENTIC GTM"
        tabs={TABS.map(t => ({ id: t.id, label: t.label, icon: t.icon, badge: t.count }))}
        activeTab={tab}
        onTabChange={id => setTab(id as Tab)}
        stats={[
          { label: "Emails Sent",   value: stats.sent },
          { label: "Open Rate",     value: `${stats.openRate}%` },
          { label: "Reply Rate",    value: `${stats.replyRate}%` },
          { label: "Deliverables",  value: stats.deliverables },
        ]}
        quickActions={PATEL_DELIVERABLES.slice(0, 4).map(d => ({
          label: d.label,
          icon: d.icon,
          onClick: () => { handleSend(`Generate a ${d.label.toLowerCase()} for my startup`); setTab("chat"); },
        }))}
      />

      {/* ── diagnostic sidebar ───────────────────────────────────────────── */}
      {userId && <DiagnosticSidebar userId={userId} />}

      {/* ════════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* ── top bar ──────────────────────────────────────────────────── */}
        <div style={{
          flexShrink: 0, height: 52,
          borderBottom: `1px solid ${bdr}`,
          background: bg,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 12px", borderRadius: 7,
                    background: active ? ink : "transparent",
                    color: active ? bg : muted,
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                    fontSize: 12, fontWeight: active ? 600 : 400,
                    transition: "all .15s",
                  }}
                >
                  <Icon size={12} />
                  {t.label}
                  {t.count !== undefined && t.count > 0 && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "1px 5px",
                      borderRadius: 999, background: active ? "#ffffff30" : accent + "20",
                      color: active ? "#fff" : accent,
                    }}>{t.count}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ padding: "3px 10px", background: accent + "12", border: `1px solid ${accent}30`, borderRadius: 999, fontSize: 11, color: accent, fontWeight: 600 }}>
              Agentic GTM
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 11, color: muted }}>
              <TrendingUp size={10} style={{ color: accent }} />
              GTM Score
            </div>
          </div>
        </div>

        {/* ── tab content ──────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>

          {/* ─── CHAT TAB ──────────────────────────────────────────────── */}
          {tab === "chat" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
                <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* suggested prompts */}
                  <AnimatePresence>
                    {showPrompts && (
                      <motion.div key="prompts" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                          <div style={{ height: 28, width: 28, borderRadius: 8, flexShrink: 0, marginTop: 2, background: surf, border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: accent }}>P</div>
                          <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, borderTopLeftRadius: 4, padding: "12px 16px", fontSize: 14, lineHeight: 1.65, color: ink, maxWidth: "82%" }}>
                            I&apos;m Patel, your GTM strategist. Tell me about your product and target customers — I can find leads via Apollo, send outreach automatically, build battle cards, and create full GTM playbooks.
                          </div>
                        </div>
                        <div style={{ paddingLeft: 38, display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {SUGGESTED.map((p, i) => (
                            <button key={i} onClick={() => handleSend(p)}
                              style={{ padding: "7px 14px", borderRadius: 999, fontSize: 12, background: bg, border: `1px solid ${bdr}`, color: muted, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = ink; e.currentTarget.style.color = ink; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.color = muted; }}
                            >{p}</button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* messages */}
                  {uiMessages.map((msg, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                      style={{ display: "flex", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>

                      {msg.role === "agent" && (
                        <div style={{ height: 28, width: 28, borderRadius: 8, flexShrink: 0, marginTop: 2, background: surf, border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: accent }}>P</div>
                      )}

                      {/* tool bubble */}
                      {msg.role === "tool" && msg.toolActivity && (
                        <motion.div initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: surf, border: `1px solid ${bdr}`, borderRadius: 10, fontSize: 12, color: muted, maxWidth: "72%" }}>
                          {msg.toolActivity.status === "running"
                            ? <motion.div style={{ height: 8, width: 8, borderRadius: "50%", border: `2px solid ${muted}`, borderTopColor: "transparent" }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }} />
                            : <CheckCircle2 size={12} style={{ color: "#16A34A" }} />
                          }
                          <span>{msg.toolActivity.status === "running" ? msg.toolActivity.label : (msg.toolActivity.summary ?? msg.toolActivity.label)}</span>
                        </motion.div>
                      )}

                      {/* text bubble */}
                      {msg.role !== "tool" && (
                        <div style={{
                          background: msg.role === "user" ? ink : surf,
                          color: msg.role === "user" ? bg : ink,
                          border: msg.role === "user" ? "none" : `1px solid ${bdr}`,
                          borderRadius: 14,
                          borderTopLeftRadius: msg.role === "agent" ? 4 : 14,
                          borderTopRightRadius: msg.role === "user" ? 4 : 14,
                          padding: "10px 14px", fontSize: 14, lineHeight: 1.65,
                          maxWidth: "82%",
                          whiteSpace: "pre-wrap",
                        }}>
                          {msg.text || (typing && i === uiMessages.length - 1
                            ? <span style={{ display: "flex", gap: 3, padding: "2px 0" }}>
                                {[0, 1, 2].map(j => (
                                  <motion.span key={j} style={{ height: 5, width: 5, borderRadius: "50%", background: muted, display: "inline-block" }}
                                    animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: j * 0.2 }} />
                                ))}
                              </span>
                            : null
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* typing indicator */}
                  {typing && uiMessages[uiMessages.length - 1]?.role !== "agent" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 10 }}>
                      <div style={{ height: 28, width: 28, borderRadius: 8, flexShrink: 0, background: surf, border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: accent }}>P</div>
                      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, borderTopLeftRadius: 4, padding: "10px 14px", display: "flex", gap: 4, alignItems: "center" }}>
                        {[0, 1, 2].map(j => (
                          <motion.span key={j} style={{ height: 5, width: 5, borderRadius: "50%", background: muted, display: "inline-block" }}
                            animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: j * 0.2 }} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                  {/* closing recommendation — shows bottleneck + next step */}
                  {userId && !typing && uiMessages.length > 0 && (
                    <ClosingRecommendationCard
                      userId={userId}
                      onAction={deliverable => {
                        const labels: Record<string, string> = {
                          icp_document:          "Build D1 ICP Definition for my startup",
                          pains_gains_triggers:  "Build D2 Pains & Gains map for my startup",
                          buyer_journey:         "Build D3 Buyer Journey map for my startup",
                          positioning_messaging: "Build D4 Positioning & Messaging for my startup",
                        };
                        handleSend(labels[deliverable] ?? `Build ${deliverable}`);
                      }}
                    />
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* input bar */}
              <div style={{ flexShrink: 0, padding: "12px 28px 20px", borderTop: `1px solid ${bdr}`, background: bg }}>
                <div style={{ maxWidth: 680, margin: "0 auto" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "10px 14px", background: surf, border: `1px solid ${bdr}`, borderRadius: 12 }}>
                    <label style={{ cursor: "pointer", flexShrink: 0, marginBottom: 2 }}>
                      <Paperclip size={16} style={{ color: muted }} />
                      <input type="file" style={{ display: "none" }} />
                    </label>
                    <textarea
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask Patel anything about GTM, leads, outreach…"
                      rows={1}
                      style={{
                        flex: 1, background: "none", border: "none", outline: "none",
                        fontSize: 14, color: ink, fontFamily: "inherit", resize: "none",
                        lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
                      }}
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={!input.trim() || typing}
                      style={{
                        height: 32, width: 32, borderRadius: 8, flexShrink: 0,
                        background: !input.trim() || typing ? bdr : ink,
                        border: "none", cursor: !input.trim() || typing ? "default" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background .15s",
                      }}
                    >
                      <Send size={14} style={{ color: !input.trim() || typing ? muted : bg }} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── DELIVERABLES TAB ──────────────────────────────────────── */}
          {tab === "deliverables" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
              <div style={{ maxWidth: 840, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: ink, marginBottom: 4 }}>Deliverables</h2>
                    <p style={{ fontSize: 13, color: muted }}>{artifactHistory.length} built · {PATEL_DELIVERABLES.length - artifactHistory.length} remaining</p>
                  </div>
                  <button
                    onClick={() => { setTab("chat"); setTimeout(() => handleSend("What should I build next for my GTM?"), 100); }}
                    style={{ padding: "8px 16px", borderRadius: 8, background: ink, color: bg, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}
                  >
                    + Build new
                  </button>
                </div>

                {/* available types */}
                <p style={{ fontSize: 11, fontWeight: 700, color: muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Available</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, marginBottom: 28 }}>
                  {PATEL_DELIVERABLES.map(d => {
                    const Icon = d.icon;
                    const built = artifactHistory.find(a => a.type === d.type);
                    return (
                      <button
                        key={d.type}
                        onClick={() => {
                          if (built) { setViewing(built); }
                          else { setTab("chat"); setTimeout(() => handleSend(`Generate a ${d.label.toLowerCase()} for my startup`), 100); }
                        }}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 12,
                          padding: "14px 16px", borderRadius: 10, textAlign: "left",
                          background: built ? "#F0FDF4" : bg,
                          border: `1.5px solid ${built ? "#86EFAC" : bdr}`,
                          cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = built ? "#4ADE80" : accent; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = built ? "#86EFAC" : bdr; }}
                      >
                        <div style={{ height: 32, width: 32, borderRadius: 8, flexShrink: 0, background: (ARTIFACT_META[d.type]?.color ?? accent) + "14", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {built
                            ? <CheckCircle2 size={16} style={{ color: "#16A34A" }} />
                            : <Icon size={16} style={{ color: ARTIFACT_META[d.type]?.color ?? accent }} />
                          }
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

                {/* built artifacts history */}
                {artifactHistory.length > 0 && (
                  <>
                    <p style={{ fontSize: 11, fontWeight: 700, color: muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>History</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[...artifactHistory].reverse().map(a => {
                        const meta = ARTIFACT_META[a.type];
                        const Icon = meta?.icon ?? FileText;
                        return (
                          <div
                            key={a.id}
                            onClick={() => setViewing(a)}
                            style={{
                              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                              borderRadius: 10, background: bg, border: `1px solid ${bdr}`,
                              cursor: "pointer", transition: "border-color .15s",
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = accent; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = bdr; }}
                          >
                            <Icon size={14} style={{ color: meta?.color ?? accent, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</p>
                              <p style={{ fontSize: 11, color: muted }}>{meta?.label ?? a.type}</p>
                            </div>
                            <ExternalLink size={12} style={{ color: muted, flexShrink: 0 }} />
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ─── ACTIONS TAB ───────────────────────────────────────────── */}
          {tab === "actions" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
              <div style={{ maxWidth: 680, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: ink, marginBottom: 4 }}>Actions</h2>
                    <p style={{ fontSize: 13, color: muted }}>
                      {actionItems.filter(a => a.status !== "done").length} pending · {actionItems.filter(a => a.status === "done").length} done
                    </p>
                  </div>
                  <button
                    onClick={handleExtractActions}
                    disabled={extracting || apiMessages.length < 4}
                    style={{
                      padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`,
                      background: bg, color: extracting ? muted : ink,
                      cursor: extracting || apiMessages.length < 4 ? "default" : "pointer",
                      fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    <RefreshCw size={11} style={{ animation: extracting ? "spin 1s linear infinite" : "none" }} />
                    {extracting ? "Extracting…" : "Extract from chat"}
                  </button>
                </div>

                {actionItems.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 24px" }}>
                    <ListChecks size={28} style={{ color: bdr, marginBottom: 12 }} />
                    <p style={{ fontSize: 14, color: muted, marginBottom: 8 }}>No actions yet</p>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Chat with Patel first, then extract actionable next steps from the conversation.</p>
                    <button
                      onClick={() => setTab("chat")}
                      style={{ padding: "8px 20px", borderRadius: 8, background: ink, color: bg, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}
                    >
                      Go to chat
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {actionItems.map(item => {
                      const priorityColor = item.priority === "high" ? "#DC2626" : item.priority === "medium" ? "#D97706" : muted;
                      const statusBg = item.status === "done" ? "#F0FDF4" : item.status === "in_progress" ? "#FEF3C7" : bg;
                      const statusBdr = item.status === "done" ? "#86EFAC" : item.status === "in_progress" ? "#FDE68A" : bdr;
                      return (
                        <div
                          key={item.id}
                          style={{
                            padding: "14px 16px", borderRadius: 10,
                            background: statusBg, border: `1px solid ${statusBdr}`,
                            display: "flex", alignItems: "flex-start", gap: 12,
                          }}
                        >
                          <button
                            onClick={() => handleToggleAction(item.id, item.status)}
                            style={{
                              height: 20, width: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                              border: `1.5px solid ${item.status === "done" ? "#16A34A" : bdr}`,
                              background: item.status === "done" ? "#16A34A" : "transparent",
                              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            {item.status === "done" && <CheckCircle2 size={12} style={{ color: "#fff" }} />}
                            {item.status === "in_progress" && <motion.div style={{ height: 6, width: 6, borderRadius: "50%", background: "#D97706" }} animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }} />}
                          </button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: item.status === "done" ? muted : ink, textDecoration: item.status === "done" ? "line-through" : "none", marginBottom: 6 }}>
                              {item.action_text}
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: priorityColor, textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.priority}</span>
                              <span style={{ fontSize: 10, color: muted }}>·</span>
                              <span style={{ fontSize: 10, color: muted, textTransform: "capitalize" }}>{item.status.replace("_", " ")}</span>
                            </div>
                          </div>
                          {item.status !== "done" && (
                            <button
                              onClick={() => { setTab("chat"); setTimeout(() => handleSend(`Let's work on this: ${item.action_text}`), 100); }}
                              style={{
                                padding: "5px 12px", borderRadius: 6, flexShrink: 0,
                                background: ink, color: bg, border: "none",
                                cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                              }}
                            >
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

      {/* ── artifact viewer overlay ────────────────────────────────────────── */}
      <AnimatePresence>
        {viewingArtifact && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setViewing(null)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 200 }}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 240 }}
              style={{
                position: "fixed", top: 0, right: 0, bottom: 0,
                width: "min(780px, 90vw)", zIndex: 201,
                background: bg, boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
                display: "flex", flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${bdr}`, flexShrink: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>{viewingArtifact.title}</p>
                <button onClick={() => setViewing(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                  <X size={16} style={{ color: muted }} />
                </button>
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <DeliverablePanel
                  artifact={viewingArtifact}
                  artifactHistory={artifactHistory.filter(a => a.type === viewingArtifact.type)}
                  onSelectArtifact={a => setViewing(a)}
                  onClose={() => setViewing(null)}
                  onRefine={instruction => { setViewing(null); setTab("chat"); setTimeout(() => handleSend(`Refine the ${viewingArtifact.title}: ${instruction}`), 100); }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
