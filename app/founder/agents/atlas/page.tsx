"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, CheckCircle2,
  MessageSquare, Package, ListChecks, FileText,
  BarChart3, RefreshCw, ChevronRight,
  ExternalLink, Shield, Eye, Plus, Trash2,
  TrendingUp, Globe, AlertCircle,
} from "lucide-react";
import { WorkspaceSidebar } from "@/features/agents/shared/components/WorkspaceSidebar";
import { bg, surf, bdr, ink, muted } from "@/features/agents/shared/constants/colors";
import { ARTIFACT_META } from "@/features/agents/shared/constants/artifact-meta";
import { DeliverablePanel } from "@/features/agents/shared/components/DeliverablePanel";
import type { ArtifactData } from "@/features/agents/types/agent.types";

// ─── constants ────────────────────────────────────────────────────────────────

const accent = "#0EA5E9"; // sky blue — intelligence/recon feel

const ATLAS_DELIVERABLES = [
  { type: "competitive_matrix",  icon: BarChart3,  label: "Competitive Matrix",  description: "Feature comparison, positioning map, white space" },
  { type: "battle_card",         icon: Shield,     label: "Battle Card",         description: "How to beat a specific competitor in a deal" },
  { type: "market_map",          icon: Globe,      label: "Market Map",          description: "All players on two positioning axes" },
  { type: "competitor_weekly",   icon: Eye,        label: "Weekly Intel Digest", description: "Changes detected across tracked competitors" },
  { type: "win_loss_analysis",   icon: TrendingUp, label: "Win/Loss Analysis",   description: "Deal patterns and recommended positioning" },
  { type: "review_intelligence", icon: FileText,   label: "Review Intelligence", description: "Competitor weaknesses from G2/Capterra reviews" },
];

const SUGGESTED = [
  "Who are my top 3 competitors and how do I beat them?",
  "Build a battle card against [competitor]",
  "Map the competitive landscape for my market",
  "What are customers complaining about in competitor reviews?",
  "Generate a weekly competitive intelligence digest",
  "Where is the white space in my market?",
];

const THREAT_LEVELS = [
  { id: "critical", label: "Critical", color: "#DC2626" },
  { id: "high",     label: "High",     color: "#D97706" },
  { id: "medium",   label: "Medium",   color: "#2563EB" },
  { id: "watch",    label: "Watch",    color: muted },
] as const;

type ThreatLevel = typeof THREAT_LEVELS[number]["id"];

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = "chat" | "competitors" | "deliverables" | "actions";

interface UiMessage  { role: "agent" | "user" | "tool"; text: string; toolActivity?: { toolName: string; label: string; status: "running" | "done"; summary?: string }; }
interface ApiMessage { role: "user" | "assistant"; content: string; }
interface ActionItem { id: string; action_text: string; priority: string; status: string; action_type?: string; cta_label?: string; }

interface Competitor {
  id: string;
  name: string;
  website?: string;
  threat: ThreatLevel;
  notes?: string;
  last_updated?: string;
}

interface DashStats {
  tracked:     number;
  critical:    number;
  deliverables: number;
  openActions: number;
}

interface RawArtifact {
  id: string; artifact_type: string; title: string;
  content: Record<string, unknown>; created_at: string;
}

// ─── competitor card ──────────────────────────────────────────────────────────

function CompetitorCard({
  competitor, onDelete, onUpdate, onAnalyse,
}: {
  competitor: Competitor;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Competitor>) => void;
  onAnalyse: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes,    setNotes]    = useState(competitor.notes ?? "");
  const threat = THREAT_LEVELS.find(t => t.id === competitor.threat)!;

  return (
    <div style={{ borderRadius: 12, background: surf, border: `1px solid ${bdr}`, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", cursor: "pointer" }}
        onClick={() => setExpanded(p => !p)}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${threat.color}18`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Shield size={15} color={threat.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>{competitor.name}</p>
          {competitor.website && <p style={{ fontSize: 11, color: muted, margin: 0 }}>{competitor.website}</p>}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: threat.color, background: `${threat.color}18`,
          border: `1px solid ${threat.color}30`, borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>
          {threat.label}
        </span>
        <ChevronRight size={14} color={muted} style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
      </div>

      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${bdr}` }}>
          {/* threat picker */}
          <div style={{ display: "flex", gap: 6, marginTop: 12, marginBottom: 12 }}>
            {THREAT_LEVELS.map(t => (
              <button key={t.id} onClick={() => onUpdate(competitor.id, { threat: t.id })}
                style={{ flex: 1, padding: "5px 0", borderRadius: 6, fontSize: 10, fontWeight: 700,
                  background: competitor.threat === t.id ? `${t.color}22` : "transparent",
                  border: `1px solid ${competitor.threat === t.id ? t.color : bdr}`,
                  color: competitor.threat === t.id ? t.color : muted, cursor: "pointer" }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* notes */}
          <textarea value={notes} rows={2}
            onChange={e => setNotes(e.target.value)}
            onBlur={() => onUpdate(competitor.id, { notes })}
            placeholder="Key differentiators, known weaknesses, deal patterns…"
            style={{ width: "100%", resize: "none", background: bg, border: `1px solid ${bdr}`,
              borderRadius: 8, padding: "8px 10px", fontSize: 12, color: ink, fontFamily: "inherit",
              outline: "none", boxSizing: "border-box" }} />

          {/* actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => onAnalyse(competitor.name)}
              style={{ flex: 1, padding: "7px 0", borderRadius: 8, background: accent, border: "none",
                color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              Build Battle Card
            </button>
            <button onClick={() => onAnalyse(`Research latest news and moves for ${competitor.name}`)}
              style={{ flex: 1, padding: "7px 0", borderRadius: 8, background: `${accent}18`,
                border: `1px solid ${accent}44`, color: accent, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              Scan Now
            </button>
            <button onClick={() => onDelete(competitor.id)}
              style={{ width: 32, height: 32, borderRadius: 8, background: "transparent",
                border: `1px solid ${bdr}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={13} color={muted} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function AtlasWorkspace() {
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

  const [dashStats, setDashStats]   = useState<DashStats>({ tracked: 0, critical: 0, deliverables: 0, openActions: 0 });
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [compLoading, setCompLoad]  = useState(true);
  const [addingComp,  setAddingComp] = useState(false);
  const [newName,     setNewName]   = useState("");
  const [newSite,     setNewSite]   = useState("");
  const [newThreat,   setNewThreat] = useState<ThreatLevel>("medium");

  const [artifactHistory, setArtHistory] = useState<(ArtifactData & { created_at: string })[]>([]);
  const [actions, setActions]        = useState<ActionItem[]>([]);
  const [actionsLoading, setActLoad] = useState(true);
  const [openArtifact, setOpenArtifact] = useState<(ArtifactData & { created_at: string }) | null>(null);

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
      // history
      const hr = await fetch(`/api/agents/chat?agentId=atlas&limit=40`);
      if (hr.ok) {
        const hd = await hr.json();
        const msgs = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role === "assistant" ? "agent" : "user", text: m.content }));
        const api  = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role, content: m.content }));
        setUiMessages(msgs); setApiMessages(api);
        if (msgs.length) setShowPrompts(false);
        if (hd.conversationId) setConvId(hd.conversationId);
      }
      setHistLoad(false);

      // tracked competitors from DB
      const cr = await fetch(`/api/agents/competitors`);
      if (cr.ok) {
        const cd = await cr.json();
        const comps: Competitor[] = (cd.competitors ?? []).map((c: Record<string, unknown>) => ({
          id: c.id as string, name: c.name as string, website: c.website as string | undefined,
          threat: (c.threat_level ?? "medium") as ThreatLevel,
          notes: c.notes as string | undefined, last_updated: c.updated_at as string | undefined,
        }));
        setCompetitors(comps);
        setDashStats(p => ({ ...p, tracked: comps.length, critical: comps.filter(c => c.threat === "critical").length }));
      }
      setCompLoad(false);

      // goals for deliverables count
      const gr = await fetch(`/api/agents/goals?agentId=atlas`);
      if (gr.ok) {
        const gd = await gr.json();
        setDashStats(p => ({ ...p, deliverables: gd.deliverables?.length ?? 0 }));
      }

      // artifacts
      const ar = await fetch(`/api/agents/artifacts?agentId=atlas&limit=12`);
      if (ar.ok) {
        const ad = await ar.json();
        setArtHistory((ad.artifacts ?? []).map((a: RawArtifact) => ({
          id: a.id, type: a.artifact_type as ArtifactData["type"],
          title: a.title, content: a.content, created_at: a.created_at,
        })));
      }

      // actions
      const acr = await fetch(`/api/agents/actions?agentId=atlas`);
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

  // ── competitor CRUD ───────────────────────────────────────────────────────
  async function addCompetitor() {
    if (!newName.trim()) return;
    const res = await fetch("/api/agents/competitors", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), website: newSite.trim() || undefined, threat_level: newThreat }),
    });
    if (res.ok) {
      const { competitor } = await res.json();
      const c: Competitor = { id: competitor.id, name: competitor.name, website: competitor.website, threat: newThreat };
      setCompetitors(p => [...p, c]);
      setDashStats(p => ({ ...p, tracked: p.tracked + 1, critical: newThreat === "critical" ? p.critical + 1 : p.critical }));
    }
    setNewName(""); setNewSite(""); setNewThreat("medium"); setAddingComp(false);
  }

  async function deleteCompetitor(id: string) {
    const comp = competitors.find(c => c.id === id);
    setCompetitors(p => p.filter(c => c.id !== id));
    setDashStats(p => ({ ...p, tracked: p.tracked - 1, critical: comp?.threat === "critical" ? p.critical - 1 : p.critical }));
    await fetch(`/api/agents/competitors/${id}`, { method: "DELETE" });
  }

  async function updateCompetitor(id: string, patch: Partial<Competitor>) {
    setCompetitors(p => p.map(c => c.id === id ? { ...c, ...patch } : c));
    await fetch(`/api/agents/competitors/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threat_level: patch.threat, notes: patch.notes }),
    });
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
        body: JSON.stringify({ agentId: "atlas", messages: nextApi, stream: true, conversationId }),
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
                fontSize: 24, margin: "0 auto 12px", border: `1px solid ${accent}44` }}>🛡️</div>
              <p style={{ fontSize: 17, fontWeight: 700, color: ink }}>Atlas — Competitive Intelligence</p>
              <p style={{ fontSize: 13, color: muted, marginTop: 4 }}>Real-time competitor monitoring, battle cards & market maps</p>
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
            placeholder="Ask Atlas to research competitors, build battle cards…"
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

  // ─── competitors tab ──────────────────────────────────────────────────────
  const CompetitorsTab = (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0 }}>Tracked Competitors</h2>
            <p style={{ fontSize: 12, color: muted, marginTop: 3 }}>Atlas monitors these continuously</p>
          </div>
          <button onClick={() => setAddingComp(true)} style={{ display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8, background: accent, border: "none",
            color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={13} /> Add Competitor
          </button>
        </div>

        {/* add form */}
        <AnimatePresence>
          {addingComp && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ padding: "16px", borderRadius: 12, background: surf, border: `1px solid ${accent}44`, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 12 }}>Add Competitor</p>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Company name *"
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: "none", fontFamily: "inherit" }} />
                <input value={newSite} onChange={e => setNewSite(e.target.value)} placeholder="website.com"
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: "none", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {THREAT_LEVELS.map(t => (
                  <button key={t.id} onClick={() => setNewThreat(t.id)}
                    style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: newThreat === t.id ? `${t.color}22` : "transparent",
                      border: `1px solid ${newThreat === t.id ? t.color : bdr}`,
                      color: newThreat === t.id ? t.color : muted, cursor: "pointer" }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addCompetitor} disabled={!newName.trim()}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: accent, border: "none",
                    color: "#fff", fontSize: 12, fontWeight: 600, cursor: newName.trim() ? "pointer" : "default",
                    opacity: newName.trim() ? 1 : 0.5 }}>
                  Add
                </button>
                <button onClick={() => setAddingComp(false)}
                  style={{ padding: "8px 16px", borderRadius: 8, background: "transparent",
                    border: `1px solid ${bdr}`, fontSize: 12, color: muted, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {compLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: muted }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} /> Loading…
          </div>
        ) : competitors.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
            <Shield size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No competitors tracked yet — add your first one above</p>
          </div>
        ) : (
          <>
            {/* threat level buckets */}
            {THREAT_LEVELS.map(level => {
              const bucket = competitors.filter(c => c.threat === level.id);
              if (!bucket.length) return null;
              return (
                <div key={level.id} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: level.color }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: level.color, letterSpacing: "0.06em" }}>
                      {level.label.toUpperCase()} ({bucket.length})
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {bucket.map(c => (
                      <CompetitorCard key={c.id} competitor={c}
                        onDelete={deleteCompetitor}
                        onUpdate={updateCompetitor}
                        onAnalyse={prompt => { sendMessage(prompt); setTab("chat"); }} />
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
        <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Intelligence reports, battle cards & market maps</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
          {ATLAS_DELIVERABLES.map(d => (
            <button key={d.type} onClick={() => { sendMessage(`Build a ${d.label} for my market`); setTab("chat"); }}
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
        <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Atlas-recommended intelligence tasks</p>

        {actionsLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: muted }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} /> Loading…
          </div>
        ) : actions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
            <ListChecks size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No actions yet — chat with Atlas to generate recommendations</p>
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
          name="Atlas"
          role="Strategy · Competitive Intel"
          emoji="🛡️"
          accent={accent}
          badge="ALWAYS WATCHING"
          tabs={[
            { id: "chat",         label: "Chat",        icon: MessageSquare },
            { id: "competitors",  label: "Competitors", icon: Shield, badge: competitors.length },
            { id: "deliverables", label: "Deliverables",icon: Package },
            { id: "actions",      label: "Actions",     icon: ListChecks },
          ]}
          activeTab={tab}
          onTabChange={id => setTab(id as Tab)}
          stats={[
            { label: "Tracked",      value: dashStats.tracked },
            { label: "Critical",     value: dashStats.critical, color: dashStats.critical > 0 ? "#DC2626" : undefined },
            { label: "Deliverables", value: dashStats.deliverables },
            { label: "Open Actions", value: dashStats.openActions },
          ]}
          quickActions={ATLAS_DELIVERABLES.slice(0, 4).map(d => ({
            label: d.label,
            icon:  d.icon,
            onClick: () => { sendMessage(`Build a ${d.label} for my market`); setTab("chat"); },
          }))}
          alert={
            dashStats.critical > 0
              ? {
                  message: `${dashStats.critical} critical threat${dashStats.critical > 1 ? "s" : ""} — review now`,
                  color:   "#DC2626",
                  icon:    AlertCircle,
                }
              : undefined
          }
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <div style={{ padding: "14px 24px", borderBottom: `1px solid ${bdr}`,
            display: "flex", alignItems: "center", gap: 12, background: surf }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accent}22`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛡️</div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: ink }}>Atlas</span>
              <span style={{ fontSize: 12, color: muted, marginLeft: 8 }}>Competitive Intelligence · Strategy</span>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: `${accent}18`,
                border: `1px solid ${accent}44`, borderRadius: 20, padding: "3px 10px", letterSpacing: "0.05em" }}>
                ALWAYS WATCHING
              </span>
            </div>
          </div>

          {tab === "chat"        && ChatTab}
          {tab === "competitors" && CompetitorsTab}
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
              agentName="Atlas"
              userId={userId ?? undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
