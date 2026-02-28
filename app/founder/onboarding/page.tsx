"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Send,
  Play,
  ChevronRight,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// ─── palette ──────────────────────────────────────────────────────────────────
// bg: #F9F7F2 | surface: #F0EDE6 | border: #E2DDD5
// ink: #18160F | muted: #8A867C | accent: #2563EB

// ─── types ────────────────────────────────────────────────────────────────────

type Step = "video" | "chat" | "signup" | "emailsent";

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
        if (!completeRes.ok) {
          console.warn("Onboarding data persistence failed");
        }
      } catch {
        // Non-fatal — score still visible from client-side calculation
      }

      toast.success("Account created!");
      setStep("emailsent");
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

              <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.03em", color: ink, marginBottom: 6 }}>Create your account</h1>
              <p style={{ color: muted, fontSize: 14, marginBottom: 28 }}>Free to start. No credit card required.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: muted, marginBottom: 6, display: "block" }}>First name</label>
                    <input
                      placeholder="Alex"
                      value={signup.firstName}
                      onChange={(e) => setSignup((p) => ({ ...p, firstName: e.target.value }))}
                      style={{ width: "100%", background: surf, border: `1px solid ${bdr}`, color: ink, borderRadius: 10, height: 42, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: muted, marginBottom: 6, display: "block" }}>Last name</label>
                    <input
                      placeholder="Smith"
                      value={signup.lastName}
                      onChange={(e) => setSignup((p) => ({ ...p, lastName: e.target.value }))}
                      style={{ width: "100%", background: surf, border: `1px solid ${bdr}`, color: ink, borderRadius: 10, height: 42, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: muted, marginBottom: 6, display: "block" }}>Work email</label>
                  <input
                    type="email"
                    placeholder="you@startup.com"
                    value={signup.email}
                    onChange={(e) => setSignup((p) => ({ ...p, email: e.target.value }))}
                    style={{ width: "100%", background: surf, border: `1px solid ${bdr}`, color: ink, borderRadius: 10, height: 42, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: muted, marginBottom: 6, display: "block" }}>Password</label>
                  <input
                    type="password"
                    placeholder="At least 6 characters"
                    value={signup.password}
                    onChange={(e) => setSignup((p) => ({ ...p, password: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                    style={{ width: "100%", background: surf, border: `1px solid ${bdr}`, color: ink, borderRadius: 10, height: 42, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
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

        {/* ── EMAIL SENT ────────────────────────────────────────────────────── */}
        {step === "emailsent" && (
          <motion.div
            key="emailsent"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}
          >
            <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
              {/* logo */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 40 }}>
                <div style={{ height: 32, width: 32, borderRadius: 8, background: blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontWeight: 900, fontSize: 8 }}>EA</span>
                </div>
                <span style={{ fontWeight: 600, fontSize: 15, color: ink }}>Edge Alpha</span>
              </div>

              {/* envelope icon */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 160 }}
                style={{ width: 72, height: 72, borderRadius: 20, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={blue} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <polyline points="2,4 12,13 22,4" />
                </svg>
              </motion.div>

              <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink, marginBottom: 10 }}>
                Check your inbox
              </h1>
              <p style={{ color: muted, fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
                We sent a confirmation link to
              </p>
              <p style={{ color: ink, fontSize: 14, fontWeight: 600, marginBottom: 28 }}>
                {signup.email}
              </p>

              {/* info box */}
              <div style={{ padding: "16px 20px", background: surf, border: `1px solid ${bdr}`, borderRadius: 14, marginBottom: 32, textAlign: "left" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ height: 32, width: 32, borderRadius: 8, background: bg, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <Lock style={{ height: 13, width: 13, color: blue }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 4 }}>Your Q-Score is waiting</p>
                    <p style={{ fontSize: 12, color: muted, lineHeight: 1.6 }}>
                      Once you confirm your email, you&apos;ll be taken to your dashboard where your full Q-Score breakdown and AI advisers are ready.
                    </p>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>
                Didn&apos;t receive it? Check your spam folder or{" "}
                <Link href="/login" style={{ color: blue, fontWeight: 500 }}>sign in here</Link>.
              </p>

              <p style={{ textAlign: "center", fontSize: 11, color: muted, opacity: 0.6 }}>
                The confirmation link expires in 24 hours.
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
