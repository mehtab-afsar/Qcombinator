"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, CheckCircle2 } from "lucide-react";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";

interface ConnectionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  investorName: string;
  startupOneLiner: string;
  keyMetrics: string[];
  matchReason: string;
}

export function ConnectionRequestModal({
  isOpen,
  onClose,
  onSubmit,
  investorName,
  startupOneLiner,
  keyMetrics,
  matchReason,
}: ConnectionRequestModalProps) {
  const [personalMessage, setPersonalMessage] = useState("");
  const [isSending,       setIsSending]       = useState(false);
  const [sent,            setSent]            = useState(false);
  const textareaRef                           = useRef<HTMLTextAreaElement>(null);

  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // reset when reopened
  useEffect(() => {
    if (isOpen) { setSent(false); setPersonalMessage(""); }
  }, [isOpen]);

  const handleSubmit = async () => {
    setIsSending(true);
    await new Promise(r => setTimeout(r, 900));
    setSent(true);
    setIsSending(false);
    setTimeout(() => {
      onSubmit(personalMessage);
      setPersonalMessage("");
    }, 1400);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 50,
              background: "rgba(24,22,15,0.45)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          />

          {/* positioning wrapper — never animated so translate stays intact */}
          <div style={{
            position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 51,
            width: "calc(100% - 48px)", maxWidth: 580,
          }}>
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              maxHeight: "90vh",
              background: bg,
              borderRadius: 20,
              border: `1px solid ${bdr}`,
              overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}
          >
            {sent ? (
              /* ── success state ── */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                style={{ padding: "56px 40px", textAlign: "center" }}
              >
                <div style={{
                  height: 56, width: 56, borderRadius: 16,
                  background: `${green}18`, border: `1px solid ${green}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 18px",
                }}>
                  <CheckCircle2 style={{ height: 26, width: 26, color: green }} />
                </div>
                <p style={{ fontSize: 18, fontWeight: 400, color: ink, letterSpacing: "-0.02em", marginBottom: 6 }}>
                  Request sent to {investorName}
                </p>
                <p style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>
                  You&apos;ll be notified when they respond. Average response time is 2–4 business days.
                </p>
              </motion.div>
            ) : (
              <>
                {/* ── header ── */}
                <div style={{ padding: "20px 24px 18px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
                  <div>
                    <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: muted, fontWeight: 600, marginBottom: 4 }}>
                      Connection Request
                    </p>
                    <h2 style={{ fontSize: 20, fontWeight: 300, letterSpacing: "-0.025em", color: ink }}>
                      Connect with {investorName}
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    style={{
                      height: 32, width: 32, display: "flex", alignItems: "center", justifyContent: "center",
                      background: "none", border: `1px solid ${bdr}`, borderRadius: 8, cursor: "pointer",
                      transition: "border-color 0.15s", flexShrink: 0, marginTop: 2,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = ink)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = bdr)}
                  >
                    <X style={{ height: 13, width: 13, color: muted }} />
                  </button>
                </div>

                {/* ── body (scrollable) ── */}
                <div style={{ overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>

                  {/* AI pitch summary */}
                  <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ height: 24, width: 24, borderRadius: 6, background: bg, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Sparkles style={{ height: 12, width: 12, color: blue }} />
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: ink }}>Auto-Generated Pitch Summary</p>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "2px 7px", background: bg, border: `1px solid ${bdr}`, borderRadius: 999, color: blue }}>
                        AI
                      </span>
                    </div>

                    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
                      {/* one-liner */}
                      <div>
                        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, fontWeight: 600, marginBottom: 5 }}>
                          Your Startup
                        </p>
                        <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{startupOneLiner}</p>
                      </div>

                      {/* divider */}
                      <div style={{ height: 1, background: bdr }} />

                      {/* key metrics */}
                      <div>
                        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, fontWeight: 600, marginBottom: 8 }}>
                          Key Metrics
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {keyMetrics.map((metric, idx) => (
                            <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                              <div style={{ height: 5, width: 5, borderRadius: "50%", background: blue, flexShrink: 0, marginTop: 5 }} />
                              <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{metric}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* divider */}
                      <div style={{ height: 1, background: bdr }} />

                      {/* match reason */}
                      <div>
                        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, fontWeight: 600, marginBottom: 5 }}>
                          Why This Match
                        </p>
                        <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{matchReason}</p>
                      </div>
                    </div>
                  </div>

                  {/* personal message */}
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                      <label style={{ fontSize: 12, fontWeight: 500, color: ink }}>
                        Personal Message
                        <span style={{ fontWeight: 400, color: muted, marginLeft: 6 }}>optional</span>
                      </label>
                      <span style={{ fontSize: 10, color: personalMessage.length > 460 ? "#DC2626" : muted }}>
                        {personalMessage.length}/500
                      </span>
                    </div>
                    <textarea
                      ref={textareaRef}
                      placeholder="Add a personal note to introduce yourself or highlight specific synergies…"
                      value={personalMessage}
                      onChange={e => setPersonalMessage(e.target.value)}
                      maxLength={500}
                      rows={4}
                      style={{
                        width: "100%", padding: "10px 14px", fontSize: 13, color: ink,
                        background: surf, border: `1px solid ${bdr}`, borderRadius: 10,
                        outline: "none", fontFamily: "inherit", resize: "vertical",
                        lineHeight: 1.6, boxSizing: "border-box",
                        transition: "border-color 0.15s",
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = muted)}
                      onBlur={e => (e.currentTarget.style.borderColor = bdr)}
                    />
                  </div>

                </div>

                {/* ── footer ── */}
                <div style={{ padding: "14px 24px 20px", borderTop: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={onClose}
                    disabled={isSending}
                    style={{
                      padding: "9px 20px", fontSize: 12, fontWeight: 500,
                      background: "transparent", color: muted,
                      border: `1px solid ${bdr}`, borderRadius: 999, cursor: "pointer",
                      transition: "border-color 0.15s, color 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = ink; e.currentTarget.style.color = ink; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.color = muted; }}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleSubmit}
                    disabled={isSending}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 7,
                      padding: "9px 22px", fontSize: 12, fontWeight: 500,
                      background: isSending ? surf : ink,
                      color: isSending ? muted : bg,
                      border: `1px solid ${isSending ? bdr : ink}`,
                      borderRadius: 999, cursor: isSending ? "default" : "pointer",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={e => { if (!isSending) (e.currentTarget as HTMLButtonElement).style.opacity = "0.82"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                  >
                    {isSending ? (
                      <>
                        <span style={{ height: 12, width: 12, border: `2px solid ${bdr}`, borderTopColor: muted, borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send style={{ height: 12, width: 12 }} />
                        Send Request
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
