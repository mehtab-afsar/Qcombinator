"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Zap, CheckCircle2,
  MessageSquare, Package, ListChecks, FileText,
  RefreshCw, ExternalLink,
  Rss, Search, Newspaper,
  Palette, TrendingUp, Calendar,
} from "lucide-react";
import { WorkspaceSidebar } from "@/features/agents/shared/components/WorkspaceSidebar";
import { bg, surf, bdr, ink, muted } from "@/features/agents/shared/constants/colors";
import { ARTIFACT_META } from "@/features/agents/shared/constants/artifact-meta";
import { DeliverablePanel } from "@/features/agents/shared/components/DeliverablePanel";
import type { ArtifactData } from "@/features/agents/types/agent.types";

// ─── constants ────────────────────────────────────────────────────────────────

const accent  = "#EC4899"; // pink — brand/creative

const MAYA_DELIVERABLES = [
  { type: "brand_messaging",    icon: Palette,    label: "Brand Messaging",    description: "Positioning, value prop, taglines, hero copy" },
  { type: "content_calendar",   icon: Calendar,   label: "Content Calendar",   description: "4-week multi-channel plan with sample posts" },
  { type: "seo_audit",          icon: Search,     label: "SEO Audit",          description: "Keyword gaps, ranking opportunities, content briefs" },
  { type: "press_kit",          icon: Newspaper,  label: "Press Kit",          description: "Company overview, founder bio, story angles" },
  { type: "newsletter_issue",   icon: Rss,        label: "Newsletter Issue",   description: "Subject lines, hook, insight, CTA — ready to send" },
  { type: "brand_health_report",icon: TrendingUp, label: "Brand Health Report",description: "Mentions, share of voice, top content this month" },
];

const SUGGESTED = [
  "Help me nail my one-line positioning statement",
  "Build a 4-week content calendar for LinkedIn",
  "Run an SEO audit and find our top keyword gaps",
  "Draft a newsletter issue for this week",
  "Create a press kit for upcoming PR outreach",
  "What content angle will resonate with our ICP?",
];

const CHANNELS = [
  { id: "linkedin",    label: "LinkedIn",   icon: "💼", color: "#0A66C2" },
  { id: "twitter",     label: "Twitter/X",  icon: "𝕏",  color: "#000000" },
  { id: "newsletter",  label: "Newsletter", icon: "📧",  color: "#D97706" },
  { id: "blog",        label: "Blog/SEO",   icon: "✍️",  color: "#7C3AED" },
] as const;

type ChannelId = typeof CHANNELS[number]["id"];

const WEEKS = ["Week 1", "Week 2", "Week 3", "Week 4"] as const;

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = "chat" | "content" | "deliverables" | "actions";

interface UiMessage  { role: "agent" | "user" | "tool"; text: string; toolActivity?: { toolName: string; label: string; status: "running" | "done"; summary?: string }; }
interface ApiMessage { role: "user" | "assistant"; content: string; }
interface ActionItem { id: string; action_text: string; priority: string; status: string; action_type?: string; cta_label?: string; }

interface ContentItem {
  id:        string;
  channel:   ChannelId;
  week:      number;
  topic:     string;
  angle?:    string;
  status:    "idea" | "draft" | "scheduled" | "published";
}

interface DashStats {
  positioningSet: boolean;
  contentItems:   number;
  deliverables:   number;
  openActions:    number;
}

interface RawArtifact {
  id: string; artifact_type: string; title: string;
  content: Record<string, unknown>; created_at: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<ContentItem["status"], { label: string; color: string }> = {
  idea:      { label: "Idea",      color: muted },
  draft:     { label: "Draft",     color: "#D97706" },
  scheduled: { label: "Scheduled", color: "#2563EB" },
  published: { label: "Published", color: "#16A34A" },
};

// ─── content card ─────────────────────────────────────────────────────────────

function ContentCard({
  item, onStatusChange, onDelete,
}: { item: ContentItem; onStatusChange: (id: string, s: ContentItem["status"]) => void; onDelete: (id: string) => void }) {
  const ch = CHANNELS.find(c => c.id === item.channel)!;
  const _st = STATUS_META[item.status];
  const statuses: ContentItem["status"][] = ["idea", "draft", "scheduled", "published"];

  return (
    <div style={{ padding: "10px 12px", borderRadius: 10, background: bg, border: `1px solid ${bdr}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{ch.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0, lineHeight: 1.3 }}>{item.topic}</p>
          {item.angle && <p style={{ fontSize: 11, color: muted, margin: "3px 0 0", lineHeight: 1.3 }}>{item.angle}</p>}
        </div>
        <button onClick={() => onDelete(item.id)}
          style={{ fontSize: 14, color: muted, background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
        {statuses.map(s => (
          <button key={s} onClick={() => onStatusChange(item.id, s)}
            style={{ flex: 1, padding: "3px 0", borderRadius: 4, fontSize: 9, fontWeight: 700,
              background: item.status === s ? `${STATUS_META[s].color}22` : "transparent",
              border: `1px solid ${item.status === s ? STATUS_META[s].color : bdr}`,
              color: item.status === s ? STATUS_META[s].color : muted, cursor: "pointer" }}>
            {STATUS_META[s].label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function MayaWorkspace() {
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

  const [dashStats, setDashStats]   = useState<DashStats>({ positioningSet: false, contentItems: 0, deliverables: 0, openActions: 0 });

  // content calendar state
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [activeChannels, setActiveChannels] = useState<Set<ChannelId>>(new Set(["linkedin", "newsletter"]));
  const [addingTo,  setAddingTo]  = useState<{ week: number; channel: ChannelId } | null>(null);
  const [newTopic,  setNewTopic]  = useState("");
  const [newAngle,  setNewAngle]  = useState("");

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
      const hr = await fetch(`/api/agents/chat?agentId=maya&limit=40`);
      if (hr.ok) {
        const hd = await hr.json();
        const msgs = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role === "assistant" ? "agent" : "user", text: m.content }));
        const api  = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role, content: m.content }));
        setUiMessages(msgs); setApiMessages(api);
        if (msgs.length) setShowPrompts(false);
        if (hd.conversationId) setConvId(hd.conversationId);
      }
      setHistLoad(false);

      const gr = await fetch(`/api/agents/goals?agentId=maya`);
      if (gr.ok) {
        const gd = await gr.json();
        setDashStats(p => ({ ...p, deliverables: gd.deliverables?.length ?? 0 }));
      }

      const ar = await fetch(`/api/agents/artifacts?agentId=maya&limit=12`);
      if (ar.ok) {
        const ad = await ar.json();
        const mapped = (ad.artifacts ?? []).map((a: RawArtifact) => ({
          id: a.id, type: a.artifact_type as ArtifactData["type"],
          title: a.title, content: a.content, created_at: a.created_at,
        }));
        setArtHistory(mapped);
        const hasBrand = mapped.some((a: ArtifactData) => a.type === "brand_messaging");
        setDashStats(p => ({ ...p, positioningSet: hasBrand }));
      }

      // load saved content calendar items
      const ccr = await fetch(`/api/agents/content-calendar`);
      if (ccr.ok) {
        const ccd = await ccr.json();
        const items: ContentItem[] = (ccd.items ?? []).map((i: Record<string, unknown>) => ({
          id: i.id as string, channel: i.channel as ChannelId,
          week: i.week as number, topic: i.topic as string,
          angle: i.angle as string | undefined, status: (i.status ?? "idea") as ContentItem["status"],
        }));
        setContentItems(items);
        setDashStats(p => ({ ...p, contentItems: items.length }));
      }

      const acr = await fetch(`/api/agents/actions?agentId=maya`);
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

  // ── content calendar CRUD ─────────────────────────────────────────────────
  async function addContentItem() {
    if (!newTopic.trim() || !addingTo) return;
    const res = await fetch("/api/agents/content-calendar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: addingTo.channel, week: addingTo.week, topic: newTopic.trim(), angle: newAngle.trim() || undefined }),
    });
    if (res.ok) {
      const { item } = await res.json();
      const ci: ContentItem = { id: item.id, channel: addingTo.channel, week: addingTo.week, topic: newTopic.trim(), angle: newAngle.trim() || undefined, status: "idea" };
      setContentItems(p => [...p, ci]);
      setDashStats(p => ({ ...p, contentItems: p.contentItems + 1 }));
    }
    setNewTopic(""); setNewAngle(""); setAddingTo(null);
  }

  async function updateItemStatus(id: string, status: ContentItem["status"]) {
    setContentItems(p => p.map(i => i.id === id ? { ...i, status } : i));
    await fetch(`/api/agents/content-calendar/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  }

  async function deleteContentItem(id: string) {
    setContentItems(p => p.filter(i => i.id !== id));
    setDashStats(p => ({ ...p, contentItems: p.contentItems - 1 }));
    await fetch(`/api/agents/content-calendar/${id}`, { method: "DELETE" });
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
        body: JSON.stringify({ agentId: "maya", messages: nextApi, stream: true, conversationId }),
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

  function toggleChannel(ch: ChannelId) {
    setActiveChannels(p => { const s = new Set(p); if (s.has(ch)) { s.delete(ch); } else { s.add(ch); } return s; });
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
                fontSize: 24, margin: "0 auto 12px", border: `1px solid ${accent}44` }}>🎨</div>
              <p style={{ fontSize: 17, fontWeight: 700, color: ink }}>Maya — Brand Director</p>
              <p style={{ fontSize: 13, color: muted, marginTop: 4 }}>Positioning, content calendar, SEO & brand health</p>
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
            placeholder="Ask Maya about brand messaging, content, SEO…"
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

  // ─── content tab ──────────────────────────────────────────────────────────
  const visibleChannels = CHANNELS.filter(c => activeChannels.has(c.id));

  const ContentTab = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* channel toggles */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: muted }}>CHANNELS</span>
        {CHANNELS.map(ch => (
          <button key={ch.id} onClick={() => toggleChannel(ch.id)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20,
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              background: activeChannels.has(ch.id) ? `${ch.color}18` : "transparent",
              border: `1px solid ${activeChannels.has(ch.id) ? ch.color : bdr}`,
              color: activeChannels.has(ch.id) ? ch.color : muted }}>
            <span>{ch.icon}</span> {ch.label}
          </button>
        ))}
        <button onClick={() => { sendMessage("Build a 4-week content calendar for my ICP"); setTab("chat"); }}
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
            borderRadius: 8, background: accent, border: "none", color: "#fff",
            fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          <Zap size={11} /> Generate with Maya
        </button>
      </div>

      {/* 4-week grid */}
      <div style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `80px repeat(${visibleChannels.length}, 1fr)`,
          minWidth: 600, padding: "16px 20px", gap: 0 }}>

          {/* header row */}
          <div />
          {visibleChannels.map(ch => (
            <div key={ch.id} style={{ padding: "6px 8px", textAlign: "center" }}>
              <span style={{ fontSize: 13 }}>{ch.icon}</span>
              <p style={{ fontSize: 11, fontWeight: 700, color: ch.color, margin: "2px 0 0" }}>{ch.label}</p>
            </div>
          ))}

          {/* week rows */}
          {WEEKS.map((week, wi) => (
            <>
              {/* week label */}
              <div key={`wl-${wi}`} style={{ padding: "12px 8px 12px 0", display: "flex", alignItems: "flex-start" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: muted, writingMode: "horizontal-tb" }}>{week}</span>
              </div>

              {/* channel cells */}
              {visibleChannels.map(ch => {
                const cellItems = contentItems.filter(i => i.week === wi + 1 && i.channel === ch.id);
                const isAdding  = addingTo?.week === wi + 1 && addingTo?.channel === ch.id;
                return (
                  <div key={`cell-${wi}-${ch.id}`} style={{ padding: "8px", minHeight: 100,
                    borderLeft: `1px solid ${bdr}`, borderTop: wi === 0 ? `1px solid ${bdr}` : "none" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {cellItems.map(item => (
                        <ContentCard key={item.id} item={item}
                          onStatusChange={updateItemStatus} onDelete={deleteContentItem} />
                      ))}

                      {isAdding ? (
                        <div style={{ padding: "8px", borderRadius: 8, background: `${accent}0D`, border: `1px dashed ${accent}` }}>
                          <input autoFocus value={newTopic} onChange={e => setNewTopic(e.target.value)}
                            placeholder="Topic…"
                            style={{ width: "100%", fontSize: 11, background: "transparent", border: "none",
                              outline: "none", color: ink, fontFamily: "inherit", marginBottom: 4, boxSizing: "border-box" }} />
                          <input value={newAngle} onChange={e => setNewAngle(e.target.value)}
                            placeholder="Angle (optional)"
                            style={{ width: "100%", fontSize: 11, background: "transparent", border: "none",
                              outline: "none", color: muted, fontFamily: "inherit", boxSizing: "border-box" }} />
                          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                            <button onClick={addContentItem}
                              style={{ flex: 1, padding: "3px 0", borderRadius: 4, background: accent,
                                border: "none", color: "#fff", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                              Add
                            </button>
                            <button onClick={() => { setAddingTo(null); setNewTopic(""); setNewAngle(""); }}
                              style={{ flex: 1, padding: "3px 0", borderRadius: 4, background: "transparent",
                                border: `1px solid ${bdr}`, color: muted, fontSize: 10, cursor: "pointer" }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setAddingTo({ week: wi + 1, channel: ch.id })}
                          style={{ width: "100%", padding: "4px 0", borderRadius: 6, background: "transparent",
                            border: `1px dashed ${bdr}`, color: muted, fontSize: 11, cursor: "pointer" }}>
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
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
        <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Brand assets, content & SEO reports</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
          {MAYA_DELIVERABLES.map(d => (
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
        <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Maya-recommended content tasks</p>

        {actionsLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: muted }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} /> Loading…
          </div>
        ) : actions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
            <ListChecks size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No actions yet — chat with Maya to get recommendations</p>
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
          name="Maya"
          role="Brand · Content"
          emoji="🎨"
          accent={accent}
          badge="CONTENT ENGINE"
          tabs={[
            { id: "chat",         label: "Chat",         icon: MessageSquare },
            { id: "content",      label: "Content",      icon: Calendar },
            { id: "deliverables", label: "Deliverables", icon: Package },
            { id: "actions",      label: "Actions",      icon: ListChecks },
          ]}
          activeTab={tab}
          onTabChange={(id) => setTab(id as Tab)}
          stats={[
            { label: "Positioning",    value: dashStats.positioningSet ? "Set ✓" : "Missing", color: dashStats.positioningSet ? "#16A34A" : "#DC2626" },
            { label: "Content Items",  value: dashStats.contentItems },
            { label: "Deliverables",   value: dashStats.deliverables },
            { label: "Open Actions",   value: dashStats.openActions },
          ]}
          quickActions={MAYA_DELIVERABLES.slice(0, 4).map(d => ({
            label: d.label,
            icon: d.icon,
            onClick: () => { sendMessage(`Generate a ${d.label}`); setTab("chat"); },
          }))}
          alert={!dashStats.positioningSet ? { message: "Lock positioning first", color: accent, icon: Palette } : undefined}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <div style={{ padding: "14px 24px", borderBottom: `1px solid ${bdr}`,
            display: "flex", alignItems: "center", gap: 12, background: surf }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accent}22`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎨</div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: ink }}>Maya</span>
              <span style={{ fontSize: 12, color: muted, marginLeft: 8 }}>Brand Director · Content & SEO</span>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: `${accent}18`,
                border: `1px solid ${accent}44`, borderRadius: 20, padding: "3px 10px", letterSpacing: "0.05em" }}>
                CONTENT ENGINE
              </span>
            </div>
          </div>

          {tab === "chat"        && ChatTab}
          {tab === "content"     && ContentTab}
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
              agentName="Maya"
              userId={userId ?? undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
