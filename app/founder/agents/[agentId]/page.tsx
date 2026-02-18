"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, TrendingUp } from "lucide-react";
import Link from "next/link";
import { getAgentById } from "@/features/agents/data/agents";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";

const pillarAccent: Record<string, string> = {
  "sales-marketing":   "#2563EB",
  "operations-finance": "#16A34A",
  "product-strategy":  "#7C3AED",
};

const dimensionLabel: Record<string, string> = {
  goToMarket: "GTM Score",
  financial:  "Financial Score",
  team:       "Team Score",
  product:    "Product Score",
  market:     "Market Score",
  traction:   "Traction Score",
};

// ─── types ────────────────────────────────────────────────────────────────────
interface UiMessage  { role: "agent" | "user"; text: string; }
interface ApiMessage { role: "user" | "assistant"; content: string; }

// ─── component ────────────────────────────────────────────────────────────────

export default function AgentChat() {
  const params  = useParams();
  const router  = useRouter();
  const agentId = params.agentId as string;
  const agent   = getAgentById(agentId);

  const [uiMessages,  setUiMessages]  = useState<UiMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [input,       setInput]       = useState("");
  const [typing,      setTyping]      = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!agent) router.push("/founder/agents");
  }, [agent, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [uiMessages, typing]);

  const callAI = useCallback(async (history: ApiMessage[]) => {
    setTyping(true);
    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          message: history[history.length - 1]?.content ?? "",
          conversationHistory: history.slice(0, -1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = await res.json();
      const reply: string = data.response ?? data.content ?? "Sorry, I couldn't respond right now. Please try again.";
      setUiMessages((p) => [...p, { role: "agent", text: reply }]);
      setApiMessages((p) => [...p, { role: "assistant", content: reply }]);
    } catch {
      setUiMessages((p) => [...p, { role: "agent", text: "Connection issue — please try again." }]);
    } finally {
      setTyping(false);
    }
  }, [agentId]);

  const handleSend = useCallback((text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || typing) return;
    setShowPrompts(false);
    setInput("");
    const userApiMsg: ApiMessage = { role: "user", content: msg };
    const newHistory = [...apiMessages, userApiMsg];
    setUiMessages((p) => [...p, { role: "user", text: msg }]);
    setApiMessages(newHistory);
    callAI(newHistory);
  }, [input, typing, apiMessages, callAI]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!agent) return null;

  const accent = pillarAccent[agent.pillar] ?? blue;
  const dimLabel = dimensionLabel[agent.improvesScore] ?? agent.improvesScore;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: bg, color: ink }}>

      {/* ── header ─────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${bdr}`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: bg }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/founder/agents" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: muted, textDecoration: "none" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = ink)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = muted)}
          >
            <ArrowLeft style={{ height: 14, width: 14 }} />
            Agents
          </Link>

          <div style={{ width: 1, height: 18, background: bdr }} />

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* avatar */}
            <div style={{
              height: 38, width: 38, borderRadius: 10,
              background: surf, border: `2px solid ${accent}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 700, color: accent, flexShrink: 0,
            }}>
              {agent.name[0]}
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: ink, lineHeight: 1.2 }}>{agent.name}</p>
              <p style={{ fontSize: 12, color: muted }}>{agent.specialty}</p>
            </div>
          </div>
        </div>

        {/* dimension chip */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 12, color: muted }}>
          <TrendingUp style={{ height: 12, width: 12, color: accent }} />
          Improves {dimLabel}
        </div>
      </div>

      {/* ── messages ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 16px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* suggested prompts — only before first message */}
          <AnimatePresence>
            {showPrompts && (
              <motion.div
                key="prompts"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                {/* intro bubble */}
                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                  <div style={{ height: 28, width: 28, borderRadius: 8, background: surf, border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: accent, flexShrink: 0, marginTop: 2 }}>
                    {agent.name[0]}
                  </div>
                  <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 18, borderTopLeftRadius: 4, padding: "12px 16px", fontSize: 14, lineHeight: 1.6, color: ink, maxWidth: "82%" }}>
                    {agent.description} What would you like to work on?
                  </div>
                </div>

                {/* prompt chips */}
                <div style={{ paddingLeft: 38, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {agent.suggestedPrompts.slice(0, 5).map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(p)}
                      style={{
                        padding: "8px 14px", borderRadius: 999, fontSize: 13,
                        background: bg, border: `1px solid ${bdr}`, color: ink,
                        cursor: "pointer", transition: "border-color .15s, background .15s",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = ink; e.currentTarget.style.background = surf; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.background = bg; }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* message thread */}
          {uiMessages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{ display: "flex", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}
            >
              {msg.role === "agent" && (
                <div style={{ height: 28, width: 28, borderRadius: 8, background: surf, border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: accent, flexShrink: 0, marginTop: 2 }}>
                  {agent.name[0]}
                </div>
              )}
              <div
                style={{
                  maxWidth: "78%",
                  borderRadius: 18,
                  padding: "12px 16px",
                  fontSize: 14,
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                  background: msg.role === "user" ? ink : surf,
                  color: msg.role === "user" ? bg : ink,
                  border: msg.role === "agent" ? `1px solid ${bdr}` : "none",
                  borderTopLeftRadius: msg.role === "agent" ? 4 : 18,
                  borderTopRightRadius: msg.role === "user" ? 4 : 18,
                }}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}

          {/* typing indicator */}
          {typing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 10 }}>
              <div style={{ height: 28, width: 28, borderRadius: 8, background: surf, border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: accent, flexShrink: 0 }}>
                {agent.name[0]}
              </div>
              <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 18, borderTopLeftRadius: 4, padding: "14px 18px", display: "flex", gap: 5, alignItems: "center" }}>
                {[0, 0.18, 0.36].map((d, i) => (
                  <motion.div key={i} style={{ height: 6, width: 6, background: muted, borderRadius: "50%" }}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: d }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ── input ──────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${bdr}`, padding: "14px 16px", background: bg }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "flex-end", gap: 10 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${agent.name} anything about ${agent.specialty.toLowerCase()}…`}
            disabled={typing}
            rows={1}
            style={{
              flex: 1,
              background: surf,
              border: `1px solid ${bdr}`,
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 14,
              color: ink,
              resize: "none",
              outline: "none",
              fontFamily: "inherit",
              lineHeight: 1.5,
              maxHeight: 120,
              overflowY: "auto",
              opacity: typing ? 0.5 : 1,
              cursor: typing ? "not-allowed" : "text",
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || typing}
            style={{
              height: 44, width: 44,
              background: ink,
              borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              border: "none",
              cursor: !input.trim() || typing ? "not-allowed" : "pointer",
              opacity: !input.trim() || typing ? 0.3 : 1,
              transition: "opacity .15s",
            }}
          >
            <Send style={{ height: 16, width: 16, color: bg }} />
          </button>
        </div>
        <p style={{ textAlign: "center", fontSize: 11, color: muted, marginTop: 8, opacity: 0.5 }}>
          Enter to send · Shift+Enter for new line · Sessions auto-save
        </p>
      </div>

    </div>
  );
}
