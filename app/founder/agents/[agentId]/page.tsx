"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, TrendingUp, ChevronRight, X, FileText, Sparkles, Zap, CheckCircle2, Paperclip } from "lucide-react";
import Link from "next/link";
import { getAgentById } from "@/features/agents/data/agents";

// ─── shared features ──────────────────────────────────────────────────────────
import { bg, surf, bdr, ink, muted, blue, green, amber, red, pillarAccent } from "@/features/agents/shared/constants/colors";
import { ARTIFACT_META, QUICK_QUESTIONS } from "@/features/agents/shared/constants/artifact-meta";
import { fmtFileSize, fmtFileType } from "@/features/agents/shared/utils";
import { DeliverablePanel } from "@/features/agents/shared/components/DeliverablePanel";
import { AGENT_TEMPLATES } from "@/features/agents/data/agent-templates";
import type { ArtifactData } from "@/features/agents/types/agent.types";


// ─── page-local types ────────────────────────────────────────────────────────
interface FileUploadData { id: string; name: string; size: number; mimeType: string; status: "uploading" | "done" | "error"; }
interface ToolActivity  { toolName: string; label: string; status: "running" | "done"; summary?: string; }
interface UiMessage  { role: "agent" | "user" | "tool"; text: string; fileUpload?: FileUploadData; toolActivity?: ToolActivity; }
interface ApiMessage { role: "user" | "assistant"; content: string; }

// Challenge dimension labels
const CHALLENGE_LABEL: Record<string, string> = {
  market:     "Market",
  product:    "Product",
  goToMarket: "Go-to-Market",
  financial:  "Financial",
  team:       "Team",
  traction:   "Traction",
};

export default function AgentChat() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const agentId      = params.agentId as string;
  const agent        = getAgentById(agentId);
  const isFelix      = agentId === "felix";
  const isPatel      = agentId === "patel";
  const challengeDim  = searchParams.get("challenge");  // e.g. "goToMarket"
  const targetArtifactId = searchParams.get("artifact"); // e.g. "uuid-from-workspace"
  const autoPrompt    = searchParams.get("prompt");      // pre-seeded message from Q-Score actions

  const [uiMessages,      setUiMessages]      = useState<UiMessage[]>([]);
  const [apiMessages,     setApiMessages]     = useState<ApiMessage[]>([]);
  const [input,           setInput]           = useState("");
  const [typing,          setTyping]          = useState(false);
  const [showPrompts,     setShowPrompts]     = useState(true);
  const [userId,          setUserId]          = useState<string | null>(null);
  const [conversationId,  setConversationId]  = useState<string | null>(null);
  const [historyLoading,  setHistoryLoading]  = useState(true);
  const [activeArtifact,  setActiveArtifact]  = useState<ArtifactData | null>(null);
  const [artifactHistory, setArtifactHistory] = useState<ArtifactData[]>([]);
  const [generatingArtifact, setGeneratingArtifact] = useState(false);
  const [scoreBoost, setScoreBoost] = useState<{ points: number; dimension: string } | null>(null);
  const [_showQuickGen, setShowQuickGen] = useState(false);
  const [quickAnswers, setQuickAnswers] = useState<string[]>(["", "", "", "", ""]);
  const [isQuickGenerating, setIsQuickGenerating] = useState(false);
  const [quickGenStep, setQuickGenStep] = useState<string | null>(null);
  const [actionItems,     setActionItems]     = useState<{ id: string; action_text: string; priority: string; status: string; action_type?: string; cta_label?: string }[]>([]);
  const [extractingActions, setExtractingActions] = useState(false);
  const [showActions,     setShowActions]     = useState(false);
  const [showDelivDropdown, setShowDelivDropdown] = useState(false);
  const [showActionsPanel, setShowActionsPanel] = useState(false);
  // Susi deal reminders
  const [susiReminders,   setSusiReminders]   = useState<{ id: string; company: string; contact_name?: string; stage: string; next_action?: string; label: string; isOverdue: boolean }[]>([]);
  const chatEndRef    = useRef<HTMLDivElement>(null);
  const chatFileRef   = useRef<HTMLInputElement>(null);
  const [agentFileUploading, setAgentFileUploading] = useState(false);

  const hasPanel = activeArtifact !== null || showActionsPanel;

  useEffect(() => {
    if (!agent) router.push("/founder/agents");
  }, [agent, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [uiMessages, typing]);

  // ── load conversation history + artifacts ──────────────────────────────────
  useEffect(() => {
    import("@/features/agents/services/agent-chat.service")
      .then(({ loadAgentChatHistory }) => loadAgentChatHistory(agentId, targetArtifactId))
      .then(result => {
        if (!result) return;
        setUserId(result.userId);
        if (result.conversationId) setConversationId(result.conversationId);
        if (result.messages.length > 0) {
          setUiMessages(result.messages.map(m => ({
            role: (m.role === "user" ? "user" : "agent") as "user" | "agent",
            text: m.content,
          })));
          setApiMessages(result.messages);
          setShowPrompts(false);
        }
        if (result.artifacts.length > 0) {
          const mapped: ArtifactData[] = result.artifacts.map(a => ({
            id: a.id,
            type: a.artifact_type as ArtifactData["type"],
            title: a.title,
            content: a.content,
          }));
          setArtifactHistory(mapped);
          const target = targetArtifactId
            ? (mapped.find(a => a.id === targetArtifactId) ?? mapped[mapped.length - 1])
            : mapped[mapped.length - 1];
          setActiveArtifact(target);
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));

    // Susi: load deal reminders (stale deals due within 3 days)
    if (agentId === 'susi') {
      fetch('/api/agents/deals/reminders')
        .then(r => r.json())
        .then(d => { if (d.reminders?.length) setSusiReminders(d.reminders); })
        .catch(() => {});
    }
  }, [agentId, targetArtifactId]);

  // Load persisted action items when conversation is known
  useEffect(() => {
    if (!conversationId) return;
    fetch(`/api/agents/actions?conversationId=${conversationId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.actions?.length) { setActionItems(d.actions); setShowActions(true); } })
      .catch(() => {});
  }, [conversationId]);

  // ── Auto-send ?prompt= when history finishes loading and chat is empty ──────
  useEffect(() => {
    if (historyLoading || !autoPrompt || uiMessages.length > 0) return;
    // Small delay so the UI is fully rendered before firing
    const t = setTimeout(() => {
      setInput(autoPrompt);
      handleSend(autoPrompt);
    }, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyLoading, autoPrompt]);

  // ── call AI ────────────────────────────────────────────────────────────────
  const callAI = useCallback(async (history: ApiMessage[], convId: string | null) => {
    setTyping(true);
    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          message: history[history.length - 1]?.content ?? "",
          conversationHistory: history.slice(0, -1),
          userId:         userId ?? undefined,
          conversationId: convId  ?? undefined,
          stream:         true,
        }),
      });

      // ── Usage limit reached ────────────────────────────────────────────
      if (res.status === 429) {
        setUiMessages((p) => [...p, {
          role: "agent",
          text: "You've reached your monthly message limit (50 messages). Your limit resets on the 1st of next month.",
        }]);
        return;
      }

      // ── Streaming path ─────────────────────────────────────────────────
      if (res.headers.get("content-type")?.includes("text/event-stream")) {
        setUiMessages((p) => [...p, { role: "agent", text: "" }]);
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
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);

              // Text delta
              if (parsed.type === "delta" && parsed.text) {
                fullText += parsed.text;
                setUiMessages((p) => {
                  const updated = [...p];
                  updated[updated.length - 1] = { role: "agent", text: fullText };
                  return updated;
                });
                continue;
              }

              // Tool started — insert activity bubble
              if (parsed.type === "tool_start") {
                setUiMessages((p) => [
                  ...p,
                  { role: "tool", text: "", toolActivity: { toolName: parsed.toolName as string, label: parsed.label as string, status: "running" } },
                ]);
                continue;
              }

              // Tool finished — mark as done with summary
              if (parsed.type === "tool_done") {
                setUiMessages((p) => {
                  const updated = [...p];
                  const idx = [...updated].reverse().findIndex(m => m.role === "tool" && m.toolActivity?.toolName === parsed.toolName && m.toolActivity?.status === "running");
                  if (idx !== -1) {
                    const realIdx = updated.length - 1 - idx;
                    updated[realIdx] = { ...updated[realIdx], toolActivity: { ...updated[realIdx].toolActivity!, status: "done", summary: parsed.summary as string | undefined } };
                  }
                  return updated;
                });
                continue;
              }

              // Artifact from SSE — show panel
              if (parsed.type === "artifact" && parsed.artifact) {
                const a = parsed.artifact as { id: string; type: string; title: string; content: Record<string, unknown> };
                const newArtifact: ArtifactData = { id: a.id, type: a.type as ArtifactData["type"], title: a.title, content: a.content };
                setArtifactHistory(prev => [...prev, newArtifact]);
                setActiveArtifact(newArtifact);
                setGeneratingArtifact(false);
                continue;
              }

              // Final done event
              if (parsed.type === "done") {
                if (parsed.conversationId && !convId) setConversationId(parsed.conversationId);
                continue;
              }

              if (parsed.type === "error") {
                setUiMessages((p) => {
                  const updated = [...p];
                  updated[updated.length - 1] = { role: "agent", text: "Connection issue — please try again." };
                  return updated;
                });
                continue;
              }

              // Fallback: raw Groq SSE format (backward compat)
              const token = parsed.choices?.[0]?.delta?.content ?? "";
              if (token) {
                fullText += token;
                setUiMessages((p) => {
                  const updated = [...p];
                  updated[updated.length - 1] = { role: "agent", text: fullText };
                  return updated;
                });
              }
            } catch { /* skip malformed SSE line */ }
          }
        }

        setApiMessages((p) => [...p, { role: "assistant", content: fullText }]);
        return;
      }

      // ── Non-streaming fallback ──────────────────────────────────────────
      const data = await res.json();
      const reply: string = data.response ?? data.content ?? "Sorry, I couldn't respond right now. Please try again.";
      if (data.conversationId && !convId) setConversationId(data.conversationId);
      setUiMessages((p) => [...p, { role: "agent", text: reply }]);
      setApiMessages((p) => [...p, { role: "assistant", content: reply }]);

      // Handle artifact from Patel
      if (data.artifact) {
        const newArtifact: ArtifactData = {
          id: data.artifact.id,
          type: data.artifact.type,
          title: data.artifact.title,
          content: data.artifact.content,
        };
        setArtifactHistory(prev => [...prev, newArtifact]);
        setActiveArtifact(newArtifact);
        setGeneratingArtifact(false);
      }
    } catch {
      setUiMessages((p) => [...p, { role: "agent", text: "Connection issue — please try again." }]);
    } finally {
      setTyping(false);
      setGeneratingArtifact(false);
    }
  }, [agentId, userId]);

  const handleSend = useCallback((text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || typing) return;
    setShowPrompts(false);
    setInput("");
    const newHistory = [...apiMessages, { role: "user" as const, content: msg }];
    setUiMessages((p) => [...p, { role: "user", text: msg }]);
    setApiMessages(newHistory);
    callAI(newHistory, conversationId);
  }, [input, typing, apiMessages, callAI, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ─── chat file upload ──────────────────────────────────────────────────────
  const handleChatFileUpload = async (file: File) => {
    if (agentFileUploading) return;
    setAgentFileUploading(true);
    const uploadId = `upload-${Date.now()}`;
    setUiMessages(prev => [...prev, {
      role: "user",
      text: "",
      fileUpload: { id: uploadId, name: file.name, size: file.size, mimeType: file.type, status: "uploading" },
    }]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/assessment/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) {
        setUiMessages(prev => prev.map(m =>
          m.fileUpload?.id === uploadId ? { ...m, fileUpload: { ...m.fileUpload!, status: "error" } } : m
        ));
      } else {
        setUiMessages(prev => prev.map(m =>
          m.fileUpload?.id === uploadId ? { ...m, fileUpload: { ...m.fileUpload!, status: "done" } } : m
        ));
        const summary = data.summary || "";
        handleSend(`I've shared a document: ${file.name}${summary ? `\n\n${summary}` : ""}`);
      }
    } catch {
      setUiMessages(prev => prev.map(m =>
        m.fileUpload?.id === uploadId ? { ...m, fileUpload: { ...m.fileUpload!, status: "error" } } : m
      ));
    } finally {
      setAgentFileUploading(false);
    }
  };

  const _handleExtractActions = useCallback(async () => {
    if (extractingActions || apiMessages.length < 4) return;
    setExtractingActions(true);
    setShowActions(true);
    try {
      const res = await fetch("/api/agents/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationHistory: apiMessages, agentId, conversationId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.actions?.length) setActionItems(data.actions);
      }
    } catch {
      // silently fail
    } finally {
      setExtractingActions(false);
    }
  }, [extractingActions, apiMessages, agentId, conversationId]);

  const handleGenerate = useCallback(async () => {
    if (!agent?.artifactType || generatingArtifact || apiMessages.length < 2) return;
    setGeneratingArtifact(true);
    try {
      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          conversationHistory: apiMessages,
          artifactType: agent.artifactType,
          userId:         userId ?? undefined,
          conversationId: conversationId ?? undefined,
        }),
      });
      if (!res.ok) throw new Error("Generate failed");
      const data = await res.json();
      if (data.artifact) {
        const newArtifact: ArtifactData = {
          id: data.artifact.id,
          type: data.artifact.type,
          title: data.artifact.title,
          content: data.artifact.content,
        };
        setArtifactHistory(prev => [...prev, newArtifact]);
        setActiveArtifact(newArtifact);

        // Show score boost toast if the signal fired
        if (data.scoreSignal?.boosted) {
          setScoreBoost({
            points: data.scoreSignal.pointsAdded,
            dimension: data.scoreSignal.dimensionLabel,
          });
          setTimeout(() => setScoreBoost(null), 4000);
        }
      }
    } catch {
      // silently fail — artifact generation is non-critical
    } finally {
      setGeneratingArtifact(false);
    }
  }, [agent, agentId, generatingArtifact, apiMessages, userId, conversationId]);

  const _handleQuickGenerate = useCallback(async () => {
    if (!agent?.artifactType || isQuickGenerating) return;
    const questions = QUICK_QUESTIONS[agent.artifactType] ?? [];
    const hasAnyAnswer = quickAnswers.some(a => a.trim().length > 0);
    if (!hasAnyAnswer) return;

    setIsQuickGenerating(true);
    setQuickGenStep("Extracting context…");
    try {
      const qaPairs = questions
        .map((q, i) => `Q: ${q}\nA: ${quickAnswers[i]?.trim() || "(not provided)"}`)
        .join("\n\n");
      const syntheticHistory: Array<{ role: string; content: string }> = [
        { role: "assistant", content: `I'll help you create your ${ARTIFACT_META[agent.artifactType!]?.label}. Let me ask you a few quick questions to generate it.` },
        { role: "user", content: qaPairs },
      ];

      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          conversationHistory: syntheticHistory,
          artifactType: agent.artifactType,
          userId:         userId ?? undefined,
          conversationId: conversationId ?? undefined,
        }),
      });
      if (!res.ok) throw new Error("Quick generate failed");
      const data = await res.json() as {
        artifact?: { id: string; type: string; title: string; content: Record<string, unknown> };
        scoreSignal?: { boosted: boolean; pointsAdded: number; dimensionLabel: string };
        jobId?: string;
        status?: string;
      };

      // Async path — poll until complete
      if (data.jobId && data.status === 'pending') {
        setQuickGenStep("Building artifact…");
        let attempts = 0;
        const maxAttempts = 60; // 2s × 60 = 2 min max
        while (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 2000));
          attempts++;
          const pollRes = await fetch(`/api/agents/generate/status?jobId=${data.jobId}`);
          const poll = await pollRes.json() as {
            status: string;
            artifact?: { id: string; type: string; title: string; content: Record<string, unknown> };
            scoreSignal?: { boosted: boolean; pointsAdded: number; dimensionLabel: string };
          };
          if (poll.status === 'completed' && poll.artifact) {
            setQuickGenStep("Done!");
            const newArtifact: ArtifactData = {
              id: poll.artifact.id, type: poll.artifact.type as ArtifactData['type'],
              title: poll.artifact.title, content: poll.artifact.content,
            };
            setArtifactHistory(prev => [...prev, newArtifact]);
            setActiveArtifact(newArtifact);
            setShowQuickGen(false);
            setQuickAnswers(["", "", "", "", ""]);
            if (poll.scoreSignal?.boosted) {
              setScoreBoost({ points: poll.scoreSignal.pointsAdded, dimension: poll.scoreSignal.dimensionLabel });
              setTimeout(() => setScoreBoost(null), 4000);
            }
            break;
          }
          if (poll.status === 'failed') break;
          if (attempts === 15) setQuickGenStep("Researching competitors…");
          if (attempts === 30) setQuickGenStep("Finalising artifact…");
        }
        return;
      }

      // Sync path (flag off)
      if (data.artifact) {
        setQuickGenStep("Done!");
        const newArtifact: ArtifactData = {
          id: data.artifact.id, type: data.artifact.type as ArtifactData['type'],
          title: data.artifact.title, content: data.artifact.content,
        };
        setArtifactHistory(prev => [...prev, newArtifact]);
        setActiveArtifact(newArtifact);
        setShowQuickGen(false);
        setQuickAnswers(["", "", "", "", ""]);
        if (data.scoreSignal?.boosted) {
          setScoreBoost({ points: data.scoreSignal.pointsAdded, dimension: data.scoreSignal.dimensionLabel });
          setTimeout(() => setScoreBoost(null), 4000);
        }
      }
    } catch {
      // silently fail
    } finally {
      setIsQuickGenerating(false);
      setQuickGenStep(null);
    }
  }, [agent, agentId, isQuickGenerating, quickAnswers, userId, conversationId]);

  const handleToggleActionStatus = useCallback(async (actionId: string, currentStatus: string) => {
    const next = currentStatus === "pending" ? "in_progress" : currentStatus === "in_progress" ? "done" : "pending";
    setActionItems(prev => prev.map(a => a.id === actionId ? { ...a, status: next } : a));
    await fetch("/api/agents/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId, status: next }),
    });
  }, []);

  const handleActionCTA = useCallback((item: { id: string; action_text: string; action_type?: string; cta_label?: string }) => {
    const type = item.action_type ?? "task";
    // Navigate to dashboard for metrics/pipeline views
    if (type === "view_metrics") {
      router.push("/founder/dashboard");
      return;
    }
    if (type === "update_pipeline") {
      router.push(`/founder/agents/susi`);
      return;
    }
    // For executable types: inject the action into chat so the agent guides execution
    const chatMessages: Record<string, string> = {
      send_outreach:      "I'm ready to send the outreach emails. Open the email sender so I can upload my contacts and send.",
      send_proposal:      "I want to send a sales proposal to a prospect. Walk me through sending it now.",
      generate_artifact:  `Please generate the deliverable for this now: ${item.action_text}`,
      schedule_call:      "Help me schedule a call with this prospect. What's the best approach?",
      task:               `Let's work on this: ${item.action_text}`,
    };
    const msg = chatMessages[type] ?? `Let's work on this: ${item.action_text}`;
    setShowActions(false); // close panel to show chat
    handleSend(msg);
  }, [router, handleSend, setShowActions]);

  if (!agent) return null;
  if (historyLoading) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bg }}>
      <p style={{ fontSize: 13, color: muted }}>Loading conversation…</p>
    </div>
  );

  const accent = pillarAccent[agent.pillar] ?? blue;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: bg, color: ink }}>

      {/* Q-Score boost toast */}
      <AnimatePresence>
        {scoreBoost && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            style={{
              position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
              zIndex: 1000, background: "#052e16", color: "#bbf7d0",
              borderRadius: 12, padding: "10px 20px",
              display: "flex", alignItems: "center", gap: 10,
              fontSize: 13, fontWeight: 600, boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
              pointerEvents: "none",
            }}
          >
            <TrendingUp size={15} style={{ color: "#4ade80" }} />
            Q-Score +{scoreBoost.points} pts · {scoreBoost.dimension} boosted
          </motion.div>
        )}
      </AnimatePresence>

      {/* Challenge banner */}
      {challengeDim && CHALLENGE_LABEL[challengeDim] && (
        <div style={{
          flexShrink: 0, background: "#FFFBEB", borderBottom: `1px solid #F5E6B8`,
          padding: "8px 24px", display: "flex", alignItems: "center", gap: 10,
        }}>
          <Zap size={13} style={{ color: amber, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: "#92400E", flex: 1 }}>
            <strong>Score Challenge:</strong> generate a deliverable here to boost your <strong>{CHALLENGE_LABEL[challengeDim]}</strong> score.
          </p>
          <Link href="/founder/improve-qscore" style={{ fontSize: 11, color: amber, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
            View all →
          </Link>
        </div>
      )}

      {/* Header */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${bdr}`, background: bg, padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Left: back + agent identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/founder/dashboard"
            replace
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: muted, textDecoration: "none", transition: "color .15s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = ink)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = muted)}
          >
            <ArrowLeft style={{ height: 13, width: 13 }} />
            Back
          </Link>
          <div style={{ width: 1, height: 16, background: bdr }} />
          <div style={{
            height: 30, width: 30, borderRadius: 8, flexShrink: 0,
            background: accent + "15", border: `1.5px solid ${accent}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: accent,
          }}>
            {agent.name[0]}
          </div>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: ink }}>{agent.name}</span>
            <span style={{ fontSize: 11, color: muted, marginLeft: 8 }}>{agent.specialty}</span>
          </div>
        </div>

        {/* Right: single Generate button */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowDelivDropdown(d => !d)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: showDelivDropdown ? ink : surf,
              color: showDelivDropdown ? bg : ink,
              border: `1px solid ${showDelivDropdown ? ink : bdr}`,
              cursor: "pointer", transition: "all .15s", fontFamily: "inherit",
            }}
          >
            <Sparkles style={{ height: 12, width: 12 }} />
            Generate
            <ChevronRight style={{ height: 9, width: 9, transform: showDelivDropdown ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
          </button>
          {showDelivDropdown && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowDelivDropdown(false)} />
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100,
                width: 260, background: bg, border: `1px solid ${bdr}`,
                borderRadius: 12, boxShadow: "0 8px 28px rgba(0,0,0,0.11)", overflow: "hidden",
              }}>
                {(AGENT_TEMPLATES[agentId] ?? []).map((tmpl, i) => {
                  const meta  = tmpl.artifactType ? ARTIFACT_META[tmpl.artifactType as keyof typeof ARTIFACT_META] : null;
                  const TIcon = meta?.icon ?? FileText;
                  return (
                    <button
                      key={i}
                      onClick={() => { handleSend(tmpl.starterPrompt); setShowDelivDropdown(false); }}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 10,
                        width: "100%", padding: "10px 14px", textAlign: "left",
                        background: "none", border: "none",
                        borderBottom: i < (AGENT_TEMPLATES[agentId] ?? []).length - 1 ? `1px solid ${bdr}` : "none",
                        cursor: "pointer", fontFamily: "inherit", transition: "background .12s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = surf; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                    >
                      <TIcon size={13} style={{ color: meta?.color ?? accent, flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 1 }}>{tmpl.title}</p>
                        <p style={{ fontSize: 10, color: muted, lineHeight: 1.4 }}>{tmpl.description}</p>
                      </div>
                    </button>
                  );
                })}
                {!isPatel && agent.artifactType && apiMessages.length >= 4 && (
                  <button
                    onClick={() => { handleGenerate(); setShowDelivDropdown(false); }}
                    disabled={generatingArtifact}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "10px 14px", textAlign: "left",
                      background: generatingArtifact ? surf : "none", border: "none",
                      borderTop: `1px solid ${bdr}`,
                      cursor: generatingArtifact ? "wait" : "pointer",
                      fontFamily: "inherit", transition: "background .12s",
                      opacity: generatingArtifact ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => { if (!generatingArtifact) e.currentTarget.style.background = surf; }}
                    onMouseLeave={(e) => { if (!generatingArtifact) e.currentTarget.style.background = "none"; }}
                  >
                    <Sparkles size={13} style={{ color: accent, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 1 }}>
                        {generatingArtifact ? "Generating…" : "Generate from conversation"}
                      </p>
                      <p style={{ fontSize: 10, color: muted }}>Uses your chat history</p>
                    </div>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Body: chat + optional right panel */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Chat column */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px 0" }}>
          <div style={{ maxWidth: 660, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Susi: deal follow-up reminders */}
            {agentId === "susi" && susiReminders.length > 0 && (
              <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: "12px 14px", marginBottom: 4 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Follow-up Reminders
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {susiReminders.map(r => (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{r.company}</span>
                        {r.contact_name && <span style={{ fontSize: 11, color: muted }}> · {r.contact_name}</span>}
                        <span style={{ fontSize: 10, marginLeft: 6, padding: "2px 6px", borderRadius: 4, background: r.isOverdue ? "#FEE2E2" : "#FEF3C7", color: r.isOverdue ? "#B91C1C" : "#92400E", fontWeight: 600 }}>{r.label}</span>
                        {r.next_action && <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>{r.next_action}</p>}
                      </div>
                      <button
                        onClick={() => handleSend(`Help me follow up on my deal with ${r.company} (${r.stage} stage). ${r.next_action ? `My planned next action was: ${r.next_action}.` : ""} What should I say?`)}
                        style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#F59E0B", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
                      >Follow Up</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested prompts */}
            <AnimatePresence>
              {showPrompts && (
                <motion.div
                  key="prompts"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                    <div style={{
                      height: 28, width: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                      background: accent + "15", border: `1.5px solid ${accent}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: accent,
                    }}>
                      {agent.name[0]}
                    </div>
                    <div style={{
                      background: surf, border: `1px solid ${bdr}`,
                      borderRadius: 14, borderTopLeftRadius: 4,
                      padding: "12px 16px", fontSize: 14, lineHeight: 1.65, color: ink, maxWidth: "82%",
                    }}>
                      {isFelix
                        ? "I'm Felix, your financial strategist. Enter your numbers in the model panel on the right, share them with me, and I'll give you precise advice specific to your situation."
                        : isPatel
                        ? "I'm Patel, your GTM strategist. Tell me about your product and target customers — once I have enough context, I can generate ICP documents, outreach sequences, competitor battle cards, and full GTM playbooks for you."
                        : `${agent.description} What would you like to work on?`}
                    </div>
                  </div>

                  <div style={{ paddingLeft: 38, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {agent.suggestedPrompts.slice(0, 4).map((p, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(p)}
                        style={{
                          padding: "7px 14px", borderRadius: 999, fontSize: 12,
                          background: bg, border: `1px solid ${bdr}`, color: muted,
                          cursor: "pointer", transition: "border-color .15s, color .15s",
                          fontFamily: "inherit",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = ink; e.currentTarget.style.color = ink; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.color = muted; }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Susi: deal follow-up reminders ──────────────────────────── */}
            {agentId === 'susi' && susiReminders.length > 0 && (
              <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "12px 14px", marginBottom: 4 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Follow-up Reminders
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {susiReminders.map(r => (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{r.company}</span>
                        {r.contact_name && <span style={{ fontSize: 11, color: muted }}> · {r.contact_name}</span>}
                        <span style={{ fontSize: 10, marginLeft: 6, padding: "2px 6px", borderRadius: 4, background: r.isOverdue ? "#FEE2E2" : "#FEF3C7", color: r.isOverdue ? "#B91C1C" : "#92400E", fontWeight: 600 }}>{r.label}</span>
                        {r.next_action && <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>{r.next_action}</p>}
                      </div>
                      <button
                        onClick={() => handleSend(`Help me follow up on my deal with ${r.company} (${r.stage} stage). ${r.next_action ? `My planned next action was: ${r.next_action}.` : ''} What should I say?`)}
                        style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#F59E0B", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
                      >
                        Follow Up
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* message thread */}
            {uiMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{ display: "flex", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}
              >
                {msg.role === "agent" && (
                  <div style={{
                    height: 28, width: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                    background: accent + "15", border: `1.5px solid ${accent}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: accent,
                  }}>
                    {agent.name[0]}
                  </div>
                )}

                {/* file upload card */}
                {/* tool activity bubble */}
                {msg.role === "tool" && msg.toolActivity && (
                  <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 12px",
                      background: surf,
                      border: `1px solid ${bdr}`,
                      borderRadius: 10,
                      fontSize: 12, color: muted,
                      maxWidth: "72%",
                    }}
                  >
                    {msg.toolActivity.status === "running" ? (
                      <motion.div
                        style={{ height: 8, width: 8, borderRadius: "50%", border: `2px solid ${muted}`, borderTopColor: "transparent", flexShrink: 0 }}
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                      />
                    ) : (
                      <CheckCircle2 style={{ height: 12, width: 12, color: green, flexShrink: 0 }} />
                    )}
                    <span style={{ fontWeight: 500 }}>
                      {msg.toolActivity.status === "running"
                        ? msg.toolActivity.label
                        : msg.toolActivity.summary || msg.toolActivity.label}
                    </span>
                  </motion.div>
                )}

                {msg.role !== "tool" && msg.fileUpload ? (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px",
                    background: ink, borderRadius: 14, borderTopRightRadius: 4,
                    maxWidth: 300, minWidth: 220,
                  }}>
                    <div style={{
                      height: 42, width: 38, flexShrink: 0,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                    }}>
                      <FileText style={{ height: 14, width: 14, color: "rgba(249,247,242,0.7)" }} />
                      <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(249,247,242,0.5)", letterSpacing: "0.04em" }}>
                        {fmtFileType(msg.fileUpload.mimeType, msg.fileUpload.name)}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: bg, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {msg.fileUpload.name}
                      </p>
                      <p style={{ fontSize: 10, color: "rgba(249,247,242,0.45)" }}>
                        {fmtFileSize(msg.fileUpload.size)}
                      </p>
                    </div>
                    {msg.fileUpload.status === "uploading" && (
                      <motion.div
                        style={{ height: 18, width: 18, flexShrink: 0, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "rgba(255,255,255,0.8)" }}
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }}
                      />
                    )}
                    {msg.fileUpload.status === "done" && (
                      <div style={{ height: 20, width: 20, flexShrink: 0, borderRadius: "50%", background: green, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CheckCircle2 style={{ height: 11, width: 11, color: "#fff" }} />
                      </div>
                    )}
                    {msg.fileUpload.status === "error" && (
                      <div style={{ height: 20, width: 20, flexShrink: 0, borderRadius: "50%", background: red, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <X style={{ height: 11, width: 11, color: "#fff" }} />
                      </div>
                    )}
                  </div>
                ) : msg.role !== "tool" ? (
                  /* regular text bubble */
                  <div style={{
                    maxWidth: "78%",
                    padding: "11px 16px",
                    fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap",
                    borderRadius: 14,
                    background:          msg.role === "user" ? ink  : surf,
                    color:               msg.role === "user" ? bg   : ink,
                    border:              msg.role === "agent" ? `1px solid ${bdr}` : "none",
                    borderTopLeftRadius: msg.role === "agent" ? 4   : 14,
                    borderTopRightRadius:msg.role === "user"  ? 4   : 14,
                  }}>
                    {msg.text}
                  </div>
                ) : null}
              </motion.div>
            ))}

            {/* typing indicator */}
            {typing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 10 }}>
                <div style={{
                  height: 28, width: 28, borderRadius: 8, flexShrink: 0,
                  background: accent + "15", border: `1.5px solid ${accent}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: accent,
                }}>
                  {agent.name[0]}
                </div>
                <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, borderTopLeftRadius: 4, padding: "14px 18px", display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 0.18, 0.36].map((d, i) => (
                    <motion.div key={i}
                      style={{ height: 5, width: 5, background: muted, borderRadius: "50%" }}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: d }}
                    />
                  ))}
                  {(generatingArtifact || isQuickGenerating) && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: muted }}>
                      {quickGenStep ?? "Generating deliverable…"}
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ── deliverable panel (all agents) ──────────────────────────────── */}
        {activeArtifact ? (
          <DeliverablePanel
            artifact={activeArtifact}
            artifactHistory={artifactHistory}
            onSelectArtifact={setActiveArtifact}
            onClose={() => setActiveArtifact(null)}
            onRefine={(feedback) => handleSend(`Please refine the ${activeArtifact.type.replace(/_/g, " ")}: ${feedback}`)}
            agentName={agent.name}
            userId={userId ?? undefined}
          />
        ) : showActionsPanel ? (
          <DeliverablePanel
            artifact={{ id: null, type: (agent.artifactType ?? "gtm_playbook") as ArtifactData["type"], title: agent.name, content: {} }}
            artifactHistory={[]}
            onSelectArtifact={setActiveArtifact}
            onClose={() => setShowActionsPanel(false)}
            onRefine={(feedback) => handleSend(feedback)}
            agentName={agent.name}
            userId={userId ?? undefined}
            actionsOnly
          />
        ) : null}
      </div>

      {/* Input bar */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${bdr}`, padding: "14px 24px", background: bg }}>
        <input
          ref={chatFileRef}
          type="file"
          accept=".pdf,.csv,.txt,.md"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleChatFileUpload(f); e.target.value = ""; } }}
        />
        <div style={{
          maxWidth: hasPanel ? "none" : 660, margin: "0 auto",
          display: "flex", alignItems: "flex-end", gap: 8,
          paddingRight: hasPanel ? 436 : 0,
        }}>
          {/* attachment button */}
          <button
            onClick={() => chatFileRef.current?.click()}
            disabled={agentFileUploading || typing}
            title="Attach a document (PDF, CSV, TXT)"
            style={{
              height: 42, width: 42, flexShrink: 0,
              background: agentFileUploading ? surf : "transparent",
              border: `1px solid ${bdr}`,
              borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: agentFileUploading || typing ? "not-allowed" : "pointer",
              transition: "background .15s, border-color .15s",
            }}
            onMouseEnter={(e) => { if (!agentFileUploading && !typing) { e.currentTarget.style.background = surf; e.currentTarget.style.borderColor = ink; }}}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = bdr; }}
          >
            {agentFileUploading
              ? <motion.div style={{ height: 14, width: 14, borderRadius: "50%", border: `2px solid ${bdr}`, borderTopColor: accent }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
              : <Paperclip style={{ height: 15, width: 15, color: muted }} />
            }
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${agent.name} anything…`}
            disabled={typing}
            rows={1}
            style={{
              flex: 1,
              background: surf, border: `1px solid ${bdr}`, borderRadius: 8,
              padding: "11px 14px", fontSize: 14, color: ink,
              resize: "none", outline: "none", fontFamily: "inherit",
              lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
              opacity: typing ? 0.5 : 1, cursor: typing ? "not-allowed" : "text",
            }}
            onFocus={(e)  => { e.currentTarget.style.borderColor = ink; }}
            onBlur={(e)   => { e.currentTarget.style.borderColor = bdr; }}
            onInput={(e)  => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || typing}
            style={{
              height: 42, width: 42, flexShrink: 0,
              background: !input.trim() || typing ? surf : ink,
              border: `1px solid ${!input.trim() || typing ? bdr : ink}`,
              borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: !input.trim() || typing ? "not-allowed" : "pointer",
              transition: "background .15s, border-color .15s",
            }}
          >
            <Send style={{ height: 15, width: 15, color: !input.trim() || typing ? muted : bg }} />
          </button>
        </div>
      </div>

      {/* Action items panel */}
      {false && showActions && (
        <div style={{
          flexShrink: 0, borderTop: `1px solid ${bdr}`, padding: "16px 28px",
          background: surf,
          paddingRight: hasPanel ? `${436 + 28}px` : 28,
        }}>
          <div style={{ maxWidth: hasPanel ? "none" : 680, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: ink, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Action Items
              </p>
              <button
                onClick={() => setShowActions(false)}
                style={{ fontSize: 11, color: muted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Dismiss
              </button>
            </div>
            {extractingActions && actionItems.length === 0 ? (
              <p style={{ fontSize: 13, color: muted }}>Extracting action items…</p>
            ) : actionItems.length === 0 ? (
              <p style={{ fontSize: 13, color: muted }}>No action items found. Continue the conversation and try again.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {actionItems.map((item) => {
                  const priorityColor = item.priority === "high" ? "#DC2626" : item.priority === "medium" ? "#D97706" : muted;
                  const isDone = item.status === "done";
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleActionStatus(item.id, item.status)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 12px", borderRadius: 8,
                        background: bg, border: `1px solid ${bdr}`,
                        cursor: "pointer", transition: "border-color .15s",
                        opacity: isDone ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ink; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = bdr; }}
                    >
                      {/* status circle */}
                      <div style={{
                        height: 16, width: 16, borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${isDone ? muted : item.status === "in_progress" ? accent : bdr}`,
                        background: isDone ? muted : item.status === "in_progress" ? accent : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isDone && <span style={{ fontSize: 9, color: bg, fontWeight: 700 }}>✓</span>}
                        {item.status === "in_progress" && <span style={{ fontSize: 8, color: bg, fontWeight: 700 }}>→</span>}
                      </div>
                      <span style={{ flex: 1, fontSize: 13, color: isDone ? muted : ink, textDecoration: isDone ? "line-through" : "none" }}>
                        {item.action_text}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: priorityColor, textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4 }}>
                        {item.priority}
                      </span>
                      {/* CTA button — actually executes the action */}
                      {!isDone && item.cta_label && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleActionCTA(item); }}
                          style={{
                            flexShrink: 0,
                            padding: "3px 10px",
                            borderRadius: 6,
                            border: `1px solid ${accent}`,
                            background: accent,
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            letterSpacing: "0.02em",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.cta_label}
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
  );
}
