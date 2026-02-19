"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, TrendingUp, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getAgentById } from "@/features/agents/data/agents";

// ─── palette (matches investor dashboard exactly) ─────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";
const amber = "#D97706";
const red   = "#DC2626";

const pillarAccent: Record<string, string> = {
  "sales-marketing":    "#2563EB",
  "operations-finance": "#16A34A",
  "product-strategy":   "#7C3AED",
};

const pillarLabel: Record<string, string> = {
  "sales-marketing":    "Sales & Marketing",
  "operations-finance": "Operations & Finance",
  "product-strategy":   "Product & Strategy",
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

interface FinModel {
  mrr:         string;
  growthRate:  string;
  burn:        string;
  grossMargin: string;
  cac:         string;
  ltv:         string;
  cash:        string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtNum(n: number, decimals = 0): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

function healthColor(val: number, lo: number, hi: number): string {
  if (val >= hi) return green;
  if (val >= lo) return amber;
  return red;
}

// ─── financial panel ──────────────────────────────────────────────────────────
function FinancialPanel({ onShare }: { onShare: (ctx: string) => void }) {
  const [model, setModel] = useState<FinModel>({
    mrr: "", growthRate: "", burn: "", grossMargin: "",
    cac: "", ltv: "", cash: "",
  });

  const set = (key: keyof FinModel) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setModel(prev => ({ ...prev, [key]: e.target.value }));

  const n = (v: string) => parseFloat(v.replace(/,/g, "")) || 0;

  const mrr         = n(model.mrr);
  const growth      = n(model.growthRate);
  const burn        = n(model.burn);
  const gm          = n(model.grossMargin);
  const cac         = n(model.cac);
  const ltv         = n(model.ltv);
  const cash        = n(model.cash);

  const arr         = mrr * 12;
  const grossProfit = mrr * (gm / 100);
  const netBurn     = Math.max(burn - grossProfit, 0);
  const runway      = netBurn > 0 ? cash / netBurn : Infinity;
  const ltvCac      = cac > 0 ? ltv / cac : 0;
  const payback     = grossProfit > 0 ? cac / grossProfit : Infinity;

  const projection = Array.from({ length: 12 }, (_, i) => {
    const mo      = i + 1;
    const mrrMo   = mrr * Math.pow(1 + growth / 100, mo);
    const gpMo    = mrrMo * (gm / 100);
    const nbMo    = Math.max(burn - gpMo, 0);
    const cashLeft = cash - nbMo * mo;
    return { mo, mrr: mrrMo, nb: nbMo, cash: cashLeft };
  });

  const hasData = mrr > 0 || burn > 0;

  const handleShare = () => {
    const lines = [
      "Here is my current financial snapshot — please use these exact numbers for your advice:",
      "",
      `**MRR:** $${fmtNum(mrr)}`,
      `**ARR:** $${fmtNum(arr)}`,
      `**Monthly Burn:** $${fmtNum(burn)}`,
      `**Gross Margin:** ${gm}%`,
      `**Net Burn/mo:** $${fmtNum(netBurn)}`,
      `**Runway:** ${isFinite(runway) ? Math.round(runway) + " months" : "Not burning cash"}`,
      `**Cash in Bank:** $${fmtNum(cash)}`,
      ...(cac   > 0 ? [`**CAC:** $${fmtNum(cac)}`]                                       : []),
      ...(ltv   > 0 ? [`**LTV:** $${fmtNum(ltv)}`]                                       : []),
      ...(ltvCac > 0 ? [`**LTV:CAC Ratio:** ${ltvCac.toFixed(2)}:1`]                     : []),
      ...(isFinite(payback) ? [`**Payback Period:** ${Math.round(payback)} months`]       : []),
      `**Monthly Growth Rate:** ${growth}%`,
    ];
    onShare(lines.join("\n"));
  };

  const inputFields: { key: keyof FinModel; label: string; placeholder: string }[] = [
    { key: "mrr",         label: "MRR ($)",            placeholder: "12,000"   },
    { key: "growthRate",  label: "Monthly Growth (%)",  placeholder: "8"        },
    { key: "burn",        label: "Monthly Burn ($)",    placeholder: "45,000"   },
    { key: "grossMargin", label: "Gross Margin (%)",    placeholder: "72"       },
    { key: "cac",         label: "CAC ($)",             placeholder: "800"      },
    { key: "ltv",         label: "LTV ($)",             placeholder: "4,800"    },
    { key: "cash",        label: "Cash in Bank ($)",    placeholder: "250,000"  },
  ];

  const vitals = [
    { label: "ARR",             value: "$" + fmtNum(arr),                                               accent: ink   },
    { label: "Net Burn / mo",   value: netBurn > 0 ? "$" + fmtNum(netBurn) : "Cash positive",            accent: netBurn === 0 ? green : healthColor(runway, 6, 18) },
    { label: "Runway",          value: isFinite(runway) ? fmtNum(runway, 1) + " mo" : "∞",              accent: isFinite(runway) ? healthColor(runway, 6, 18) : green },
    ...(ltvCac > 0 ? [{ label: "LTV : CAC",     value: ltvCac.toFixed(1) + " : 1",                     accent: healthColor(ltvCac, 2, 3) }] : []),
    ...(isFinite(payback) && payback > 0 ? [{ label: "Payback Period", value: Math.round(payback) + " mo", accent: payback <= 12 ? green : payback <= 18 ? amber : red }] : []),
  ];

  return (
    <div style={{
      width: 340, flexShrink: 0,
      borderLeft: `1px solid ${bdr}`,
      background: bg,
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>

      {/* panel header */}
      <div style={{ padding: "20px 20px 14px", borderBottom: `1px solid ${bdr}` }}>
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: green, fontWeight: 600, marginBottom: 4 }}>
          Financial Model
        </p>
        <p style={{ fontSize: 13, color: muted, lineHeight: 1.5 }}>
          Enter your numbers, then share them with Felix.
        </p>
      </div>

      {/* inputs */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${bdr}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {inputFields.map(({ key, label, placeholder }) => (
            <div key={key} style={{ gridColumn: key === "cash" ? "1 / -1" : "auto" }}>
              <label style={{
                display: "block", marginBottom: 5,
                fontSize: 10, fontWeight: 600, color: muted,
                textTransform: "uppercase", letterSpacing: "0.1em",
              }}>
                {label}
              </label>
              <input
                type="number"
                value={model[key]}
                onChange={set(key)}
                placeholder={placeholder}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: surf, border: `1px solid ${bdr}`, borderRadius: 8,
                  padding: "8px 10px", fontSize: 13, color: ink,
                  outline: "none", fontFamily: "inherit",
                }}
                onFocus={(e)  => { e.currentTarget.style.borderColor = green; }}
                onBlur={(e)   => { e.currentTarget.style.borderColor = bdr;   }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* vitals — stat-tile grid (same pattern as investor dashboard stats row) */}
      {hasData && vitals.length > 0 && (
        <div style={{ borderBottom: `1px solid ${bdr}` }}>
          <div style={{ padding: "14px 20px 10px" }}>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600 }}>
              Vitals
            </p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 1, background: bdr,
            borderTop: `1px solid ${bdr}`,
          }}>
            {vitals.map(({ label, value, accent }) => (
              <div key={label} style={{ background: bg, padding: "14px 16px" }}>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>
                  {label}
                </p>
                <p style={{ fontSize: 16, fontWeight: 700, color: accent }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 12-month projection */}
      {mrr > 0 && burn > 0 && (
        <div style={{ borderBottom: `1px solid ${bdr}` }}>
          <div style={{ padding: "14px 20px 10px" }}>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600 }}>
              12-Month Projection
            </p>
          </div>

          {/* table header */}
          <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 1fr", gap: 8, padding: "6px 16px 6px", borderTop: `1px solid ${bdr}`, borderBottom: `1px solid ${bdr}` }}>
            {["Mo", "MRR", "Burn", "Cash"].map(h => (
              <p key={h} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: muted, fontWeight: 600, textAlign: h === "Mo" ? "left" : "right" }}>{h}</p>
            ))}
          </div>

          {projection.map(({ mo, mrr: mrrMo, nb, cash: cl }) => {
            const depleted = cl < 0;
            const low      = cl < cash * 0.15 && !depleted;
            return (
              <div
                key={mo}
                style={{
                  display: "grid", gridTemplateColumns: "32px 1fr 1fr 1fr",
                  gap: 8, padding: "7px 16px",
                  borderBottom: `1px solid ${bdr}`,
                  background: mo % 2 === 0 ? surf : bg,
                }}
              >
                <p style={{ fontSize: 11, color: muted }}>{mo}</p>
                <p style={{ fontSize: 11, color: ink, textAlign: "right" }}>
                  ${mrrMo >= 1000 ? (mrrMo / 1000).toFixed(1) + "k" : fmtNum(mrrMo)}
                </p>
                <p style={{ fontSize: 11, color: amber, textAlign: "right" }}>
                  ${nb >= 1000 ? (nb / 1000).toFixed(1) + "k" : fmtNum(nb)}
                </p>
                <p style={{
                  fontSize: 11, textAlign: "right", fontWeight: depleted ? 700 : 400,
                  color: depleted ? red : low ? amber : green,
                }}>
                  {depleted
                    ? "Out"
                    : "$" + (cl >= 1000 ? (cl / 1000).toFixed(0) + "k" : fmtNum(cl))}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* share CTA */}
      <div style={{ padding: "16px 20px", marginTop: "auto" }}>
        <button
          onClick={handleShare}
          disabled={!hasData}
          style={{
            width: "100%", padding: "10px 14px",
            background: hasData ? green : surf,
            color: hasData ? "#fff" : muted,
            border: `1px solid ${hasData ? green : bdr}`,
            borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: hasData ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "opacity .15s", fontFamily: "inherit",
          }}
          onMouseEnter={(e) => { if (hasData) e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <ChevronRight style={{ height: 13, width: 13 }} />
          Share model with Felix
        </button>
        <p style={{ fontSize: 11, color: muted, textAlign: "center", marginTop: 8, opacity: 0.7 }}>
          Felix will reference your exact numbers
        </p>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function AgentChat() {
  const params  = useParams();
  const router  = useRouter();
  const agentId = params.agentId as string;
  const agent   = getAgentById(agentId);
  const isFelix = agentId === "felix";

  const [uiMessages,     setUiMessages]     = useState<UiMessage[]>([]);
  const [apiMessages,    setApiMessages]    = useState<ApiMessage[]>([]);
  const [input,          setInput]          = useState("");
  const [typing,         setTyping]         = useState(false);
  const [showPrompts,    setShowPrompts]    = useState(true);
  const [userId,         setUserId]         = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!agent) router.push("/founder/agents");
  }, [agent, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [uiMessages, typing]);

  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setHistoryLoading(false); return; }
        setUserId(user.id);

        const { data: conv } = await supabase
          .from("agent_conversations")
          .select("id")
          .eq("user_id", user.id)
          .eq("agent_id", agentId)
          .order("last_message_at", { ascending: false })
          .limit(1)
          .single();

        if (!conv) { setHistoryLoading(false); return; }
        setConversationId(conv.id);

        const { data: msgs } = await supabase
          .from("agent_messages")
          .select("role, content")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true });

        if (msgs && msgs.length > 0) {
          setUiMessages(msgs.map(m => ({
            role: (m.role === "user" ? "user" : "agent") as "user" | "agent",
            text: m.content,
          })));
          setApiMessages(msgs.map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })));
          setShowPrompts(false);
        }
      } catch {
        // anonymous session fallback
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [agentId]);

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
        }),
      });
      const data = await res.json();
      const reply: string = data.response ?? data.content ?? "Sorry, I couldn't respond right now. Please try again.";
      if (data.conversationId && !convId) setConversationId(data.conversationId);
      setUiMessages((p) => [...p, { role: "agent", text: reply }]);
      setApiMessages((p) => [...p, { role: "assistant", content: reply }]);
    } catch {
      setUiMessages((p) => [...p, { role: "agent", text: "Connection issue — please try again." }]);
    } finally {
      setTyping(false);
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

  if (!agent) return null;
  if (historyLoading) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bg }}>
      <p style={{ fontSize: 13, color: muted }}>Loading conversation…</p>
    </div>
  );

  const accent   = pillarAccent[agent.pillar] ?? blue;
  const pillar   = pillarLabel[agent.pillar]  ?? agent.pillar;
  const dimLabel = dimensionLabel[agent.improvesScore] ?? agent.improvesScore;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: bg, color: ink }}>

      {/* ── page header (matches investor dashboard header style) ─────────── */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${bdr}`, padding: "20px 28px 16px", background: bg }}>
        <div style={{ maxWidth: isFelix ? "none" : 900, margin: "0 auto" }}>

          {/* back + nav row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <Link
              href="/founder/agents"
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: muted, textDecoration: "none", transition: "color .15s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = ink)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = muted)}
            >
              <ArrowLeft style={{ height: 13, width: 13 }} />
              Agents
            </Link>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isFelix && (
                <div style={{ padding: "4px 12px", background: "#F0FDF4", border: `1px solid #86EFAC`, borderRadius: 999, fontSize: 11, color: green, fontWeight: 600 }}>
                  Live Model Active
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 11, color: muted }}>
                <TrendingUp style={{ height: 11, width: 11, color: accent }} />
                Improves {dimLabel}
              </div>
            </div>
          </div>

          {/* agent identity */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              height: 44, width: 44, borderRadius: 11, flexShrink: 0,
              background: surf, border: `2px solid ${accent}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 700, color: accent,
            }}>
              {agent.name[0]}
            </div>
            <div>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: accent, fontWeight: 600, marginBottom: 2 }}>
                {pillar}
              </p>
              <p style={{ fontSize: "clamp(1.1rem,2vw,1.4rem)", fontWeight: 300, letterSpacing: "-0.02em", color: ink, lineHeight: 1.1 }}>
                {agent.name}
              </p>
              <p style={{ fontSize: 13, color: muted, marginTop: 1 }}>{agent.specialty}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── body (chat + optional panel) ────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── chat column ───────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* suggested prompts */}
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
                    <div style={{
                      height: 28, width: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                      background: surf, border: `2px solid ${accent}`,
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
                        : `${agent.description} What would you like to work on?`}
                    </div>
                  </div>

                  {/* prompt chips */}
                  <div style={{ paddingLeft: 38, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {agent.suggestedPrompts.slice(0, 5).map((p, i) => (
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
                    background: surf, border: `2px solid ${accent}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: accent,
                  }}>
                    {agent.name[0]}
                  </div>
                )}
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
              </motion.div>
            ))}

            {/* typing indicator */}
            {typing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 10 }}>
                <div style={{
                  height: 28, width: 28, borderRadius: 8, flexShrink: 0,
                  background: surf, border: `2px solid ${accent}`,
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
                </div>
              </motion.div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ── Felix financial panel ─────────────────────────────────────────── */}
        {isFelix && <FinancialPanel onShare={(ctx) => handleSend(ctx)} />}
      </div>

      {/* ── input bar ────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${bdr}`, padding: "14px 28px", background: bg }}>
        <div style={{
          maxWidth: isFelix ? "none" : 680, margin: "0 auto",
          display: "flex", alignItems: "flex-end", gap: 10,
          paddingRight: isFelix ? 356 : 0,
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${agent.name} anything about ${agent.specialty.toLowerCase()}…`}
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
        <p style={{
          textAlign: "center", fontSize: 11, color: muted,
          marginTop: 8, opacity: 0.5,
          paddingRight: isFelix ? 356 : 0,
        }}>
          Enter to send · Shift+Enter for new line · Sessions auto-save
        </p>
      </div>

    </div>
  );
}
