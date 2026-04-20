"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Zap, CheckCircle2,
  MessageSquare, Package, ListChecks, FileText,
  RefreshCw, ChevronRight, ExternalLink,
  Users, UserPlus, Star, Clock, Plus, Trash2,
  Briefcase, Award, ClipboardList, BookOpen,
} from "lucide-react";
import Link from "next/link";
import { WorkspaceSidebar } from "@/features/agents/shared/components/WorkspaceSidebar";
import { bg, surf, bdr, ink, muted } from "@/features/agents/shared/constants/colors";
import { ARTIFACT_META } from "@/features/agents/shared/constants/artifact-meta";
import { DeliverablePanel } from "@/features/agents/shared/components/DeliverablePanel";
import type { ArtifactData } from "@/features/agents/types/agent.types";

// ─── constants ────────────────────────────────────────────────────────────────

const accent   = "#0891B2"; // teal — people/trust
const SIDEBAR_W = 264;

const HARPER_DELIVERABLES = [
  { type: "hiring_plan",        icon: ClipboardList, label: "Hiring Plan",        description: "Next 3 hires, org structure, comp bands, timeline" },
  { type: "job_description",    icon: Briefcase,     label: "Job Description",    description: "Role with 30/60/90 outcomes, requirements, equity" },
  { type: "interview_scorecard",icon: Star,          label: "Interview Scorecard",description: "Competencies, questions, rubric, red flags" },
  { type: "offer_letter",       icon: Award,         label: "Offer Letter",       description: "Personalised offer with cash, equity, benefits" },
  { type: "onboarding_plan",    icon: BookOpen,      label: "Onboarding Plan",    description: "Day 1 checklist, 30/60/90 milestones, first project" },
  { type: "comp_benchmark",     icon: Users,         label: "Comp Benchmark",     description: "Market data for role + stage with equity context" },
];

const SUGGESTED = [
  "What should my next 3 hires be?",
  "Write a job description for a Senior Engineer",
  "What's the market comp for a Head of Sales?",
  "Build an interview scorecard for an AE",
  "Draft an offer letter for my engineering hire",
  "Create a 30/60/90 onboarding plan",
];

const HIRE_STAGES = [
  { id: "sourcing",     label: "Sourcing",    color: "#6B7280" },
  { id: "screening",   label: "Screening",   color: "#2563EB" },
  { id: "interviewing",label: "Interviewing",color: "#7C3AED" },
  { id: "offer",       label: "Offer",       color: "#D97706" },
  { id: "hired",       label: "Hired",       color: "#16A34A" },
  { id: "rejected",    label: "Rejected",    color: "#DC2626" },
] as const;

type HireStage = typeof HIRE_STAGES[number]["id"];

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = "chat" | "pipeline" | "deliverables" | "actions";

interface UiMessage  { role: "agent" | "user" | "tool"; text: string; toolActivity?: { toolName: string; label: string; status: "running" | "done"; summary?: string }; }
interface ApiMessage { role: "user" | "assistant"; content: string; }
interface ActionItem { id: string; action_text: string; priority: string; status: string; action_type?: string; cta_label?: string; }

interface Candidate {
  id:        string;
  name:      string;
  role:      string;
  stage:     HireStage;
  score?:    number; // 1-5
  source?:   string;
  notes?:    string;
  created_at: string;
}

interface DashStats {
  activeRoles:   number;
  inPipeline:    number;
  hired:         number;
  deliverables:  number;
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

// ─── candidate card ───────────────────────────────────────────────────────────

function CandidateCard({
  candidate, onStageChange, onDelete, onAsk,
}: {
  candidate: Candidate;
  onStageChange: (id: string, stage: HireStage) => void;
  onDelete: (id: string) => void;
  onAsk: (prompt: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const stage = HIRE_STAGES.find(s => s.id === candidate.stage)!;
  const nextStages = HIRE_STAGES.filter(s => s.id !== candidate.stage && s.id !== "rejected");

  return (
    <div style={{ borderRadius: 10, background: surf, border: `1px solid ${bdr}`, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", cursor: "pointer" }}
        onClick={() => setExpanded(p => !p)}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${accent}18`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          fontSize: 13, fontWeight: 700, color: accent }}>
          {candidate.name.slice(0, 1).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>{candidate.name}</p>
          <p style={{ fontSize: 11, color: muted, margin: 0 }}>{candidate.role}</p>
        </div>
        {candidate.score && (
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            {[1,2,3,4,5].map(n => (
              <Star key={n} size={10} color={n <= candidate.score! ? "#D97706" : bdr} fill={n <= candidate.score! ? "#D97706" : "none"} />
            ))}
          </div>
        )}
        <span style={{ fontSize: 10, fontWeight: 700, color: stage.color, background: `${stage.color}18`,
          border: `1px solid ${stage.color}30`, borderRadius: 4, padding: "2px 6px", flexShrink: 0 }}>
          {stage.label}
        </span>
        <ChevronRight size={13} color={muted}
          style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
      </div>

      {expanded && (
        <div style={{ padding: "0 13px 13px", borderTop: `1px solid ${bdr}` }}>
          {candidate.source && (
            <p style={{ fontSize: 11, color: muted, marginTop: 10, marginBottom: 8 }}>Source: {candidate.source}</p>
          )}

          {/* move stage */}
          <p style={{ fontSize: 10, fontWeight: 600, color: muted, letterSpacing: "0.06em", margin: "10px 0 6px" }}>MOVE TO</p>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
            {nextStages.map(s => (
              <button key={s.id} onClick={() => onStageChange(candidate.id, s.id)}
                style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                  background: "transparent", border: `1px solid ${s.color}`, color: s.color, cursor: "pointer" }}>
                {s.label}
              </button>
            ))}
            <button onClick={() => onStageChange(candidate.id, "rejected")}
              style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                background: "transparent", border: `1px solid #DC2626`, color: "#DC2626", cursor: "pointer" }}>
              Reject
            </button>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onAsk(`Build an interview scorecard for ${candidate.name} applying for ${candidate.role}`)}
              style={{ flex: 1, padding: "6px 0", borderRadius: 7, background: accent, border: "none",
                color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              Build Scorecard
            </button>
            <button onClick={() => onAsk(`Draft an offer letter for ${candidate.name} for the ${candidate.role} role`)}
              style={{ flex: 1, padding: "6px 0", borderRadius: 7, background: `${accent}18`,
                border: `1px solid ${accent}44`, color: accent, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              Draft Offer
            </button>
            <button onClick={() => onDelete(candidate.id)}
              style={{ width: 30, height: 30, borderRadius: 7, background: "transparent",
                border: `1px solid ${bdr}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={12} color={muted} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function HarperWorkspace() {
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

  const [dashStats, setDashStats]   = useState<DashStats>({ activeRoles: 0, inPipeline: 0, hired: 0, deliverables: 0 });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candLoading, setCandLoad]  = useState(true);
  const [addingCand,  setAddingCand] = useState(false);
  const [newName,  setNewName]      = useState("");
  const [newRole,  setNewRole]      = useState("");
  const [newSource,setNewSource]    = useState("");
  const [stageFilter, setStageFilter] = useState<HireStage | "all">("all");

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
      const hr = await fetch(`/api/agents/chat?agentId=harper&limit=40`);
      if (hr.ok) {
        const hd = await hr.json();
        const msgs = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role === "assistant" ? "agent" : "user", text: m.content }));
        const api  = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role, content: m.content }));
        setUiMessages(msgs); setApiMessages(api);
        if (msgs.length) setShowPrompts(false);
        if (hd.conversationId) setConvId(hd.conversationId);
      }
      setHistLoad(false);

      // candidates
      const cr = await fetch(`/api/agents/candidates`);
      if (cr.ok) {
        const cd = await cr.json();
        const cands: Candidate[] = (cd.candidates ?? []).map((c: Record<string, unknown>) => ({
          id: c.id as string, name: c.name as string, role: c.role as string,
          stage: (c.stage ?? "sourcing") as HireStage,
          score: c.score as number | undefined, source: c.source as string | undefined,
          notes: c.notes as string | undefined, created_at: c.created_at as string,
        }));
        setCandidates(cands);
        const roles = new Set(cands.map(c => c.role)).size;
        const hired = cands.filter(c => c.stage === "hired").length;
        const active = cands.filter(c => !["hired","rejected"].includes(c.stage)).length;
        setDashStats(p => ({ ...p, activeRoles: roles, inPipeline: active, hired }));
      }
      setCandLoad(false);

      const gr = await fetch(`/api/agents/goals?agentId=harper`);
      if (gr.ok) {
        const gd = await gr.json();
        setDashStats(p => ({ ...p, deliverables: gd.deliverables?.length ?? 0 }));
      }

      const ar = await fetch(`/api/agents/artifacts?agentId=harper&limit=12`);
      if (ar.ok) {
        const ad = await ar.json();
        setArtHistory((ad.artifacts ?? []).map((a: RawArtifact) => ({
          id: a.id, type: a.artifact_type as ArtifactData["type"],
          title: a.title, content: a.content, created_at: a.created_at,
        })));
      }

      const acr = await fetch(`/api/agents/actions?agentId=harper`);
      if (acr.ok) {
        const acd = await acr.json();
        const acts = acd.actions ?? [];
        setActions(acts);
        setDashStats(p => ({ ...p, openActions: acts.filter((a: ActionItem) => a.status !== "done").length } as DashStats));
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

  // ── candidate CRUD ────────────────────────────────────────────────────────
  async function addCandidate() {
    if (!newName.trim() || !newRole.trim()) return;
    const res = await fetch("/api/agents/candidates", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), role: newRole.trim(), source: newSource.trim() || undefined, stage: "sourcing" }),
    });
    if (res.ok) {
      const { candidate } = await res.json();
      setCandidates(p => [...p, { ...candidate, stage: "sourcing" as HireStage, created_at: new Date().toISOString() }]);
      setDashStats(p => ({ ...p, inPipeline: p.inPipeline + 1 }));
    }
    setNewName(""); setNewRole(""); setNewSource(""); setAddingCand(false);
  }

  async function updateStage(id: string, stage: HireStage) {
    setCandidates(p => p.map(c => c.id === id ? { ...c, stage } : c));
    await fetch(`/api/agents/candidates/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }),
    });
  }

  async function deleteCandidate(id: string) {
    setCandidates(p => p.filter(c => c.id !== id));
    await fetch(`/api/agents/candidates/${id}`, { method: "DELETE" });
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
        body: JSON.stringify({ agentId: "harper", messages: nextApi, stream: true, conversationId }),
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

  const visibleCandidates = stageFilter === "all" ? candidates : candidates.filter(c => c.stage === stageFilter);

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
                fontSize: 24, margin: "0 auto 12px", border: `1px solid ${accent}44` }}>👥</div>
              <p style={{ fontSize: 17, fontWeight: 700, color: ink }}>Harper — Chief People Officer</p>
              <p style={{ fontSize: 13, color: muted, marginTop: 4 }}>Hiring plans, JDs, scorecards, offers & onboarding</p>
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
            placeholder="Ask Harper about hiring, comp benchmarks, offer letters…"
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

  // ─── pipeline tab ─────────────────────────────────────────────────────────
  const PipelineTab = (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0 }}>Hiring Pipeline</h2>
            <p style={{ fontSize: 12, color: muted, marginTop: 3 }}>Track candidates across all open roles</p>
          </div>
          <button onClick={() => setAddingCand(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              borderRadius: 8, background: accent, border: "none",
              color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={13} /> Add Candidate
          </button>
        </div>

        {/* stage summary strip */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={() => setStageFilter("all")}
            style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: stageFilter === "all" ? ink : "transparent",
              border: `1px solid ${stageFilter === "all" ? ink : bdr}`,
              color: stageFilter === "all" ? "#fff" : muted }}>
            All ({candidates.length})
          </button>
          {HIRE_STAGES.map(s => {
            const count = candidates.filter(c => c.stage === s.id).length;
            return (
              <button key={s.id} onClick={() => setStageFilter(s.id)}
                style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  background: stageFilter === s.id ? `${s.color}22` : "transparent",
                  border: `1px solid ${stageFilter === s.id ? s.color : bdr}`,
                  color: stageFilter === s.id ? s.color : muted }}>
                {s.label} {count > 0 ? `(${count})` : ""}
              </button>
            );
          })}
        </div>

        {/* add form */}
        <AnimatePresence>
          {addingCand && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ padding: "16px", borderRadius: 12, background: surf, border: `1px solid ${accent}44`, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 12 }}>Add Candidate</p>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name *"
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: "none", fontFamily: "inherit" }} />
                <input value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="Role *"
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: "none", fontFamily: "inherit" }} />
                <input value={newSource} onChange={e => setNewSource(e.target.value)} placeholder="Source (optional)"
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: "none", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addCandidate} disabled={!newName.trim() || !newRole.trim()}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: accent, border: "none",
                    color: "#fff", fontSize: 12, fontWeight: 600,
                    cursor: newName.trim() && newRole.trim() ? "pointer" : "default",
                    opacity: newName.trim() && newRole.trim() ? 1 : 0.5 }}>
                  Add
                </button>
                <button onClick={() => setAddingCand(false)}
                  style={{ padding: "8px 16px", borderRadius: 8, background: "transparent",
                    border: `1px solid ${bdr}`, fontSize: 12, color: muted, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {candLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: muted }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} /> Loading…
          </div>
        ) : visibleCandidates.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
            <UserPlus size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>
              {stageFilter === "all" ? "No candidates yet — add your first one above" : `No candidates in ${stageFilter}`}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visibleCandidates.map(c => (
              <CandidateCard key={c.id} candidate={c}
                onStageChange={updateStage}
                onDelete={deleteCandidate}
                onAsk={prompt => { sendMessage(prompt); }}
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
        <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Hiring docs, scorecards & onboarding plans</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
          {HARPER_DELIVERABLES.map(d => (
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
        <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Harper-recommended hiring tasks</p>
        {actionsLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: muted }}>
            <RefreshCw size={18} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} /> Loading…
          </div>
        ) : actions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
            <ListChecks size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No actions yet — chat with Harper to get recommendations</p>
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
          name="Harper"
          role="People · Hiring"
          emoji="👥"
          accent={accent}
          badge="TALENT ENGINE"
          tabs={[
            { id: "chat",         label: "Chat",         icon: MessageSquare },
            { id: "pipeline",     label: "Pipeline",     icon: UserPlus,     badge: candidates.filter(c => !["hired","rejected"].includes(c.stage)).length },
            { id: "deliverables", label: "Deliverables", icon: Package },
            { id: "actions",      label: "Actions",      icon: ListChecks },
          ]}
          activeTab={tab}
          onTabChange={(id) => setTab(id as Tab)}
          stats={[
            { label: "Active Roles", value: dashStats.activeRoles },
            { label: "In Pipeline",  value: dashStats.inPipeline,  color: dashStats.inPipeline > 0 ? accent : undefined },
            { label: "Hired",        value: dashStats.hired,        color: dashStats.hired > 0 ? "#16A34A" : undefined },
            { label: "Deliverables", value: dashStats.deliverables },
          ]}
          quickActions={HARPER_DELIVERABLES.slice(0, 4).map(d => ({
            label: d.label,
            icon: d.icon,
            onClick: () => { sendMessage(`Generate a ${d.label}`); setTab("chat"); },
          }))}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <div style={{ padding: "14px 24px", borderBottom: `1px solid ${bdr}`,
            display: "flex", alignItems: "center", gap: 12, background: surf }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accent}22`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👥</div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: ink }}>Harper</span>
              <span style={{ fontSize: 12, color: muted, marginLeft: 8 }}>Chief People Officer · Hiring & talent</span>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: `${accent}18`,
                border: `1px solid ${accent}44`, borderRadius: 20, padding: "3px 10px", letterSpacing: "0.05em" }}>
                TALENT ENGINE
              </span>
            </div>
          </div>
          {tab === "chat"        && ChatTab}
          {tab === "pipeline"    && PipelineTab}
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
              agentName="Harper"
              userId={userId ?? undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
