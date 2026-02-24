"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  Send,
  Play,
  ChevronRight,
  Lock,
  Users,
  Lightbulb,
  ShieldCheck,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// ─── palette ──────────────────────────────────────────────────────────────────
// bg: #F9F7F2 | surface: #F0EDE6 | border: #E2DDD5
// ink: #18160F | muted: #8A867C | accent: #2563EB

// ─── types ────────────────────────────────────────────────────────────────────

type Step = "video" | "chat" | "signup" | "score";

interface ChatMessage {
  role: "agent" | "user";
  text: string;
}

interface ApiMessage {
  role: "user" | "assistant";
  content: string;
}

interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface Dimension {
  label: string;
  icon: React.ElementType;
  score: number;
  max: number;
}

// ─── scoring ──────────────────────────────────────────────────────────────────

function scoreConversation(allUserText: string): Dimension[] {
  const t = allUserText.toLowerCase();
  const kw = (words: string[]) => words.filter((w) => t.includes(w)).length;
  const wordCount = allUserText.split(/\s+/).filter(Boolean).length;
  const lenBonus = (max: number) => Math.min(Math.floor(wordCount / 30), max);

  const problemScore = Math.min(
    6 +
      kw(["year", "2020", "2021", "2022", "2023", "2024", "when i was", "i was working", "i noticed", "i discovered", "we found", "back in"]) * 2 +
      kw(["i realized", "that's when", "epiphany", "aha moment", "suddenly", "couldn't believe", "saw that"]) * 2 +
      kw(["problem", "pain", "frustrated", "annoying", "broken", "manual", "spreadsheet", "slow", "expensive", "wasted"]) * 1 +
      lenBonus(4),
    25
  );

  const advantageScore = Math.min(
    6 +
      kw(["years experience", "10 years", "8 years", "5 years", "3 years", "domain expert", "industry", "worked at", "built", "technical", "engineer", "cto", "proprietary"]) * 2 +
      kw(["customer relationships", "existing relationships", "know the buyers", "network", "distribution", "audience", "newsletter", "community", "partnerships"]) * 3 +
      kw(["data", "insight", "unique angle", "unfair", "advantage", "moat", "ip"]) * 2 +
      lenBonus(3),
    25
  );

  const custScore = Math.min(
    5 +
      kw(["they said", "told me", "literally said", "her exact words", "his exact words", "quote", "feedback", "pain point"]) * 2 +
      kw(["last week", "yesterday", "last month", "two weeks ago", "recently", "this week"]) * 2 +
      kw(["loi", "letter of intent", "signed", "paid", "paying customer", "committed", "willing to pay", "switch to us", "pre-order"]) * 4 +
      kw(["50 conversations", "30 conversations", "20 conversations", "40 people", "talked to over", "spoken to"]) * 3 +
      kw(["10", "15", "20", "25", "30", "conversations", "interviews", "discovery calls", "users"]) * 1 +
      lenBonus(4),
    30
  );

  const resScore = Math.min(
    5 +
      kw(["almost quit", "wanted to quit", "nearly gave up", "close to quitting", "darkest moment", "hardest moment", "failed", "rejected", "churned", "fell apart", "crisis", "ran out"]) * 3 +
      kw(["kept going", "what kept me", "mission", "believe in", "passionate", "customers need", "problem is real", "can't give up", "have to solve", "why i started"]) * 3 +
      kw(["7", "8", "9", "10", "out of 10", "/10", "really close", "very close"]) * 2 +
      lenBonus(2),
    20
  );

  return [
    { label: "Problem Origin",      icon: Lightbulb,   score: problemScore,    max: 25 },
    { label: "Founder Edge",        icon: ShieldCheck, score: advantageScore,  max: 25 },
    { label: "Customer Validation", icon: Users,       score: custScore,       max: 30 },
    { label: "Resilience",          icon: Heart,       score: resScore,        max: 20 },
  ];
}

// ─── component ────────────────────────────────────────────────────────────────

function OnboardingContent() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("video");

  const [uiMessages, setUiMessages]   = useState<ChatMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [input, setInput]             = useState("");
  const [agentTyping, setAgentTyping] = useState(false);
  const [chatDone, setChatDone]       = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [signup, setSignup] = useState<SignupData>({ firstName: "", lastName: "", email: "", password: "" });
  const [signingUp, setSigningUp] = useState(false);

  const [dimensions, setDimensions]         = useState<Dimension[]>([]);
  const [rawScore, setRawScore]             = useState(0);
  const [displayedScore, setDisplayedScore] = useState(0);
  const [scoreRevealed, setScoreRevealed]   = useState(false);
  const [onboardingExtracted, setOnboardingExtracted] = useState<Record<string, unknown>>({});

  // Redirect already-authenticated founders to dashboard
  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient().auth.getSession().then(({ data: { session } }) => {
        if (session) router.replace("/founder/dashboard");
      });
    });
  }, [router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [uiMessages, agentTyping]);

  useEffect(() => {
    if (!scoreRevealed || rawScore === 0) return;
    let cur = 0;
    const inc = Math.max(1, Math.ceil(rawScore / 40));
    const id = setInterval(() => {
      cur = Math.min(cur + inc, rawScore);
      setDisplayedScore(cur);
      if (cur >= rawScore) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [scoreRevealed, rawScore]);

  const callAI = useCallback(async (history: ApiMessage[]) => {
    setAgentTyping(true);
    try {
      const res = await fetch("/api/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error("API error");
      const data: { content: string; isComplete: boolean } = await res.json();
      setUiMessages((prev) => [...prev, { role: "agent", text: data.content }]);
      setApiMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
      if (data.isComplete) {
        setChatDone(true);
        // Quick client-side score for immediate feedback
        const allUserText = history.filter((m) => m.role === "user").map((m) => m.content).join(" ");
        const dims = scoreConversation(allUserText);
        const total = dims.reduce((s, d) => s + d.score, 0);
        setDimensions(dims);
        setRawScore(total);
        // Run LLM extraction in background for real data
        fetch("/api/onboarding/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationHistory: history }),
        })
          .then((r) => r.json())
          .then((result) => {
            if (result.extractedData && Object.keys(result.extractedData).length > 0) {
              setOnboardingExtracted(result.extractedData);
            }
          })
          .catch(() => { /* extraction failed — use keyword score as fallback */ });
        setTimeout(() => setStep("signup"), 2500);
      }
    } catch {
      toast.error("Connection issue — please try again.");
    } finally {
      setAgentTyping(false);
    }
  }, []);

  useEffect(() => {
    if (step !== "chat" || uiMessages.length > 0) return;
    callAI([]);
  }, [step, uiMessages.length, callAI]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || agentTyping || chatDone) return;
    const userApiMsg: ApiMessage = { role: "user", content: text };
    const newHistory = [...apiMessages, userApiMsg];
    setUiMessages((prev) => [...prev, { role: "user", text }]);
    setApiMessages(newHistory);
    setInput("");
    setExchangeCount((c) => c + 1);
    callAI(newHistory);
  }, [input, agentTyping, chatDone, apiMessages, callAI]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSignup = async () => {
    if (!signup.email || !signup.password || !signup.firstName) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (signup.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSigningUp(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signup.email,
          password: signup.password,
          fullName: `${signup.firstName} ${signup.lastName}`.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Signup failed"); setSigningUp(false); return; }
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.auth.signInWithPassword({ email: signup.email, password: signup.password });

      // Persist onboarding data + score to database
      try {
        const completeRes = await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extractedData: Object.keys(onboardingExtracted).length > 0 ? onboardingExtracted : {},
            chatHistory: apiMessages,
          }),
        });
        const completeData = await completeRes.json();
        if (completeData.qScore) {
          setRawScore(completeData.qScore.overall);
        }
      } catch {
        // Non-fatal — score still visible from client-side calculation
      }

      toast.success("Account created!");
      setStep("score");
      setTimeout(() => setScoreRevealed(true), 500);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setSigningUp(false);
  };

  const TOTAL_DOTS = 5;
  const filledDots = chatDone ? TOTAL_DOTS : Math.min(exchangeCount, TOTAL_DOTS - 1);

  // ── shared styles ────────────────────────────────────────────────────────────
  const bg   = "#F9F7F2";
  const surf = "#F0EDE6";
  const bdr  = "#E2DDD5";
  const ink  = "#18160F";
  const muted = "#8A867C";
  const blue  = "#2563EB";

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, fontFamily: "inherit" }}>
      <AnimatePresence mode="wait">

        {/* ── VIDEO ─────────────────────────────────────────────────────────── */}
        {step === "video" && (
          <motion.div
            key="video"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
          >
            {/* nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px", borderBottom: `1px solid ${bdr}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ height: 32, width: 32, borderRadius: 8, background: blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontWeight: 900, fontSize: 8 }}>EA</span>
                </div>
                <span style={{ fontWeight: 600, fontSize: 15, color: ink }}>Edge Alpha</span>
              </div>
              <button
                onClick={() => setStep("chat")}
                style={{ fontSize: 13, color: muted, display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer" }}
              >
                Skip intro <ChevronRight style={{ height: 14, width: 14 }} />
              </button>
            </div>

            {/* body */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
              <div style={{ width: "100%", maxWidth: 600 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 12, color: muted, fontWeight: 500, marginBottom: 28 }}>
                  <span style={{ height: 6, width: 6, background: blue, borderRadius: "50%", display: "inline-block" }} />
                  Welcome to Edge Alpha
                </div>

                <h1 style={{ fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16, color: ink }}>
                  Build a fundable business.<br />
                  <span style={{ color: blue }}>Then raise from the best.</span>
                </h1>
                <p style={{ color: muted, fontSize: 16, marginBottom: 36, lineHeight: 1.7, maxWidth: 480 }}>
                  Watch a 90-second overview, then have a quick conversation with your Edge Alpha adviser to generate your initial Q-Score — no forms, just a conversation.
                </p>

                {/* video placeholder */}
                <div
                  onClick={() => setStep("chat")}
                  style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: `1px solid ${bdr}`, background: surf, aspectRatio: "16/9", marginBottom: 32, cursor: "pointer" }}
                >
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <motion.div
                      whileHover={{ scale: 1.08 }}
                      style={{ height: 64, width: 64, borderRadius: "50%", background: "#fff", border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
                    >
                      <Play style={{ height: 26, width: 26, color: ink, marginLeft: 3 }} />
                    </motion.div>
                    <p style={{ color: muted, fontSize: 13 }}>90-second overview · click to continue</p>
                  </div>
                  <div style={{ position: "absolute", bottom: 12, right: 14, background: "rgba(24,22,15,0.08)", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: muted, fontFamily: "monospace" }}>1:32</div>
                </div>

                {/* stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 36 }}>
                  {[
                    { value: "5 min",  label: "to your Q-Score" },
                    { value: "500+",   label: "verified investors" },
                    { value: "3",      label: "assessment categories" },
                  ].map((s) => (
                    <div key={s.label} style={{ textAlign: "center", padding: "16px 12px", background: surf, border: `1px solid ${bdr}`, borderRadius: 12 }}>
                      <p style={{ fontSize: 20, fontWeight: 600, color: ink, marginBottom: 2 }}>{s.value}</p>
                      <p style={{ fontSize: 11, color: muted }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <button
                    onClick={() => setStep("chat")}
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: ink, color: "#F9F7F2", fontWeight: 500, padding: "14px 32px", borderRadius: 999, fontSize: 15, border: "none", cursor: "pointer", transition: "opacity .15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    Get started <ArrowRight style={{ height: 16, width: 16 }} />
                  </button>
                  <button onClick={() => setStep("chat")} style={{ fontSize: 13, color: muted, background: "none", border: "none", cursor: "pointer" }}>
                    Skip introduction →
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── CHAT ──────────────────────────────────────────────────────────── */}
        {step === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
          >
            {/* header */}
            <div style={{ position: "sticky", top: 0, zIndex: 10, background: bg, borderBottom: `1px solid ${bdr}`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ height: 34, width: 34, borderRadius: 8, background: blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#fff", fontWeight: 800, fontSize: 11, letterSpacing: "-0.02em" }}>EA</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 1 }}>Edge Alpha Adviser</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ height: 6, width: 6, background: "#22C55E", borderRadius: "50%" }} />
                    <p style={{ fontSize: 11, color: muted }}>
                      {chatDone ? "Analysis complete — creating your account" : `Category 1 of 3 · Question ${Math.min(exchangeCount + 1, 5)} of 5`}
                    </p>
                  </div>
                </div>
              </div>

              {/* progress dots */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {Array.from({ length: TOTAL_DOTS }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: 6,
                      borderRadius: 999,
                      transition: "all .5s",
                      width: i < filledDots ? 20 : i === filledDots && !chatDone ? 10 : 6,
                      background: i < filledDots ? blue : i === filledDots && !chatDone ? bdr : "#E8E4DC",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 16px" }}>
              <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
                {uiMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ display: "flex", gap: 12, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}
                  >
                    {msg.role === "agent" && (
                      <div style={{ height: 28, width: 28, borderRadius: 8, background: blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                        <span style={{ color: "#fff", fontWeight: 800, fontSize: 9, letterSpacing: "-0.02em" }}>EA</span>
                      </div>
                    )}
                    <div
                      style={{
                        maxWidth: "82%",
                        borderRadius: 18,
                        padding: "12px 16px",
                        fontSize: 14,
                        lineHeight: 1.6,
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
                {agentTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 12 }}>
                    <div style={{ height: 28, width: 28, borderRadius: 8, background: blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: "#fff", fontWeight: 800, fontSize: 9, letterSpacing: "-0.02em" }}>EA</span>
                    </div>
                    <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 18, borderTopLeftRadius: 4, padding: "14px 18px", display: "flex", gap: 5, alignItems: "center" }}>
                      {[0, 0.2, 0.4].map((d, i) => (
                        <motion.div key={i} style={{ height: 6, width: 6, background: muted, borderRadius: "50%" }} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: d }} />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* transitioning */}
                {chatDone && !agentTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", background: surf, border: `1px solid ${bdr}`, borderRadius: 16 }}>
                      <motion.div style={{ height: 14, width: 14, border: `2px solid ${blue}`, borderTopColor: "transparent", borderRadius: "50%" }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} />
                      <span style={{ fontSize: 13, color: muted }}>Analysing responses · creating your account next…</span>
                    </div>
                  </motion.div>
                )}

                <div ref={chatEndRef} />
              </div>
            </div>

            {/* input */}
            <div style={{ position: "sticky", bottom: 0, background: bg, borderTop: `1px solid ${bdr}`, padding: "14px 16px" }}>
              <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={agentTyping ? "Adviser is thinking…" : chatDone ? "Analysis complete…" : "Type your answer…"}
                  disabled={agentTyping || chatDone}
                  style={{
                    flex: 1,
                    background: surf,
                    border: `1px solid ${bdr}`,
                    borderRadius: 12,
                    padding: "12px 16px",
                    fontSize: 14,
                    color: ink,
                    outline: "none",
                    opacity: agentTyping || chatDone ? 0.5 : 1,
                    cursor: agentTyping || chatDone ? "not-allowed" : "text",
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || agentTyping || chatDone}
                  style={{
                    height: 44,
                    width: 44,
                    background: ink,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    border: "none",
                    cursor: !input.trim() || agentTyping || chatDone ? "not-allowed" : "pointer",
                    opacity: !input.trim() || agentTyping || chatDone ? 0.3 : 1,
                    transition: "opacity .15s",
                  }}
                >
                  <Send style={{ height: 16, width: 16, color: bg }} />
                </button>
              </div>
              <p style={{ textAlign: "center", fontSize: 11, color: muted, marginTop: 8, opacity: 0.6 }}>
                Enter to send · No account needed yet — just a conversation
              </p>
            </div>
          </motion.div>
        )}

        {/* ── SIGN UP ───────────────────────────────────────────────────────── */}
        {step === "signup" && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}
          >
            <div style={{ width: "100%", maxWidth: 440 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
                <div style={{ height: 32, width: 32, borderRadius: 8, background: blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontWeight: 900, fontSize: 8 }}>EA</span>
                </div>
                <span style={{ fontWeight: 600, fontSize: 15, color: ink }}>Edge Alpha</span>
              </div>

              {/* score teaser */}
              <div style={{ marginBottom: 28, padding: 16, background: surf, border: `1px solid ${bdr}`, borderRadius: 16, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ height: 56, width: 56, borderRadius: 12, background: bg, border: `1px solid ${bdr}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: blue }}>{rawScore}</span>
                  <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>/100</span>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 3 }}>Your Q-Score is ready</p>
                  <p style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>
                    Create your account to see the full breakdown — and unlock Categories 2 & 3.
                  </p>
                </div>
              </div>

              <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.03em", color: ink, marginBottom: 6 }}>Create your account</h1>
              <p style={{ color: muted, fontSize: 14, marginBottom: 28 }}>Free to start. No credit card required.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <Label style={{ fontSize: 12, color: muted, marginBottom: 6, display: "block" }}>First name</Label>
                    <Input
                      placeholder="Alex"
                      value={signup.firstName}
                      onChange={(e) => setSignup((p) => ({ ...p, firstName: e.target.value }))}
                      style={{ background: surf, border: `1px solid ${bdr}`, color: ink, borderRadius: 10, height: 42 }}
                    />
                  </div>
                  <div>
                    <Label style={{ fontSize: 12, color: muted, marginBottom: 6, display: "block" }}>Last name</Label>
                    <Input
                      placeholder="Smith"
                      value={signup.lastName}
                      onChange={(e) => setSignup((p) => ({ ...p, lastName: e.target.value }))}
                      style={{ background: surf, border: `1px solid ${bdr}`, color: ink, borderRadius: 10, height: 42 }}
                    />
                  </div>
                </div>
                <div>
                  <Label style={{ fontSize: 12, color: muted, marginBottom: 6, display: "block" }}>Work email</Label>
                  <Input
                    type="email"
                    placeholder="you@startup.com"
                    value={signup.email}
                    onChange={(e) => setSignup((p) => ({ ...p, email: e.target.value }))}
                    style={{ background: surf, border: `1px solid ${bdr}`, color: ink, borderRadius: 10, height: 42 }}
                  />
                </div>
                <div>
                  <Label style={{ fontSize: 12, color: muted, marginBottom: 6, display: "block" }}>Password</Label>
                  <Input
                    type="password"
                    placeholder="At least 6 characters"
                    value={signup.password}
                    onChange={(e) => setSignup((p) => ({ ...p, password: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                    style={{ background: surf, border: `1px solid ${bdr}`, color: ink, borderRadius: 10, height: 42 }}
                  />
                </div>
              </div>

              <button
                onClick={handleSignup}
                disabled={signingUp}
                style={{
                  width: "100%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: ink,
                  color: bg,
                  fontWeight: 500,
                  padding: "14px 0",
                  borderRadius: 999,
                  fontSize: 15,
                  border: "none",
                  cursor: signingUp ? "not-allowed" : "pointer",
                  opacity: signingUp ? 0.6 : 1,
                  marginBottom: 16,
                  transition: "opacity .15s",
                }}
              >
                {signingUp ? "Creating account…" : "See my Q-Score"}
                {!signingUp && <ArrowRight style={{ height: 16, width: 16 }} />}
              </button>

              <p style={{ textAlign: "center", fontSize: 13, color: muted }}>
                Already have an account?{" "}
                <Link href="/login" style={{ color: blue, fontWeight: 500 }}>Sign in</Link>
              </p>
              <p style={{ textAlign: "center", fontSize: 11, color: muted, marginTop: 16, opacity: 0.6 }}>
                By continuing you agree to our Terms and Privacy Policy.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── SCORE REVEAL ──────────────────────────────────────────────────── */}
        {step === "score" && (
          <motion.div
            key="score"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}
          >
            <div style={{ width: "100%", maxWidth: 480 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
                <div style={{ height: 32, width: 32, borderRadius: 8, background: blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontWeight: 900, fontSize: 8 }}>EA</span>
                </div>
                <span style={{ fontWeight: 600, fontSize: 15, color: ink }}>Edge Alpha</span>
              </div>

              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: blue, fontWeight: 600, marginBottom: 8 }}>
                Category 1 of 3 Complete
              </p>
              <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink, marginBottom: 8 }}>
                Your initial Q-Score.
              </h1>
              <p style={{ color: muted, fontSize: 14, marginBottom: 36, lineHeight: 1.7 }}>
                Based on your conversation covering Problem, Team & Validation. Complete Categories 2 & 3 in your dashboard for your full score.
              </p>

              {/* ring */}
              <motion.div
                style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36 }}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 130 }}
              >
                <div style={{ position: "relative", height: 176, width: 176 }}>
                  <svg style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} viewBox="0 0 144 144">
                    <circle cx="72" cy="72" r="64" fill="none" stroke={bdr} strokeWidth="8" />
                    <motion.circle
                      cx="72" cy="72" r="64"
                      fill="none" stroke={blue} strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 64}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 64 }}
                      animate={scoreRevealed ? { strokeDashoffset: 2 * Math.PI * 64 * (1 - rawScore / 100) } : {}}
                      transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
                    />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 48, fontWeight: 600, color: ink, fontVariantNumeric: "tabular-nums" }}>{displayedScore}</span>
                    <span style={{ fontSize: 12, color: muted, marginTop: 2 }}>out of 100</span>
                  </div>
                </div>
                <div style={{
                  marginTop: 14,
                  padding: "6px 16px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  border: `1px solid ${bdr}`,
                  background: surf,
                  color: rawScore >= 80 ? "#16A34A" : rawScore >= 60 ? blue : rawScore >= 40 ? "#D97706" : "#DC2626",
                }}>
                  {rawScore >= 80 ? "Strong Start" : rawScore >= 60 ? "Good Foundation" : rawScore >= 40 ? "Needs Development" : "Early Stage"}
                </div>
              </motion.div>

              {/* dimension bars */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, fontWeight: 600, marginBottom: 14 }}>Category 1 breakdown</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {dimensions.map((dim, i) => {
                    const Icon = dim.icon;
                    const pct = (dim.score / dim.max) * 100;
                    return (
                      <motion.div key={dim.label} style={{ display: "flex", alignItems: "center", gap: 12 }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={scoreRevealed ? { opacity: 1, x: 0 } : {}}
                        transition={{ delay: 0.55 + i * 0.08 }}
                      >
                        <div style={{ height: 28, width: 28, borderRadius: 8, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon style={{ height: 13, width: 13, color: muted }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                            <span style={{ fontSize: 12, color: ink, fontWeight: 500 }}>{dim.label}</span>
                            <span style={{ fontSize: 11, color: muted, fontFamily: "monospace" }}>{dim.score}/{dim.max}</span>
                          </div>
                          <div style={{ height: 3, background: surf, borderRadius: 999, overflow: "hidden", border: `1px solid ${bdr}` }}>
                            <motion.div
                              style={{ height: "100%", borderRadius: 999, background: pct >= 70 ? blue : pct >= 40 ? "#D97706" : "#EF4444" }}
                              initial={{ width: 0 }}
                              animate={scoreRevealed ? { width: `${pct}%` } : {}}
                              transition={{ delay: 0.65 + i * 0.08, duration: 0.6, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* locked categories */}
              <motion.div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}
                initial={{ opacity: 0 }} animate={scoreRevealed ? { opacity: 1 } : {}} transition={{ delay: 1.1 }}>
                {[
                  { label: "Category 2", desc: "Customer Validation · Market Sizing · Learning Velocity", pts: "+33 pts" },
                  { label: "Category 3", desc: "Go-to-Market · Financial Health", pts: "+34 pts" },
                ].map((cat) => (
                  <div key={cat.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: surf, border: `1px solid ${bdr}`, borderRadius: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Lock style={{ height: 13, width: 13, color: muted }} />
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{cat.label}</p>
                        <p style={{ fontSize: 11, color: muted }}>{cat.desc}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: muted }}>{cat.pts}</span>
                  </div>
                ))}
              </motion.div>

              {/* CTAs */}
              <motion.div style={{ display: "flex", flexDirection: "column", gap: 10 }}
                initial={{ opacity: 0, y: 10 }} animate={scoreRevealed ? { opacity: 1, y: 0 } : {}} transition={{ delay: 1.3 }}>
                <button
                  onClick={() => router.push("/founder/assessment")}
                  style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: ink, color: bg, fontWeight: 500, padding: "14px 0", borderRadius: 999, fontSize: 15, border: "none", cursor: "pointer", transition: "opacity .15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  Complete my full assessment <ArrowRight style={{ height: 16, width: 16 }} />
                </button>
                <button
                  onClick={() => router.push("/founder/dashboard")}
                  style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", color: muted, border: `1px solid ${bdr}`, background: "transparent", fontWeight: 500, padding: "14px 0", borderRadius: 999, fontSize: 14, cursor: "pointer", transition: "border-color .15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = ink)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = bdr)}
                >
                  Go to dashboard first
                </button>
              </motion.div>

              <p style={{ textAlign: "center", fontSize: 11, color: muted, marginTop: 20, opacity: 0.6 }}>
                Your Q-Score improves as you complete assessments and work with AI advisers.
              </p>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// ─── export ───────────────────────────────────────────────────────────────────

export default function FounderOnboarding() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#F9F7F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ height: 40, width: 40, borderRadius: 10, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 8 }}>EA</span>
          </div>
          <p style={{ color: "#8A867C", fontSize: 13 }}>Loading…</p>
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
