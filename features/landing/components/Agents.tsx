"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { L, FONT_SERIF, FONT_MONO } from "../theme";
import { ADVISERS } from "../copy";
import { Reveal, Eyebrow } from "./Section";
import { useMotionPrefs } from "../hooks/useMotionPrefs";

const EASE = [0.22, 1, 0.36, 1] as const;

function Avatar({ color, letter, size = 34 }: { color: string; letter: string; size?: number }) {
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, borderRadius: 99, flexShrink: 0,
      background: L.alpha(color, 0.14), border: `1.5px solid ${L.alpha(color, 0.5)}`,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 700, color,
    }}>{letter}</span>
  );
}

function TypingDots({ color }: { color: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center", padding: "4px 2px" }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          style={{ width: 6, height: 6, borderRadius: 99, background: color }}
        />
      ))}
    </span>
  );
}

export function Agents() {
  const reduced = useMotionPrefs();
  const [selected, setSelected] = useState(0);
  const [typing, setTyping] = useState(false);
  const active = ADVISERS[selected];

  useEffect(() => {
    if (reduced) { setTyping(false); return; }
    setTyping(true);
    const t = setTimeout(() => setTyping(false), 750);
    return () => clearTimeout(t);
  }, [selected, reduced]);

  return (
    <section id="advisers" style={{ padding: "110px 24px", maxWidth: 1180, margin: "0 auto", scrollMarginTop: 80 }}>
      <Reveal>
        <Eyebrow color={L.blue}>Your bench</Eyebrow>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 480, lineHeight: 1.12, letterSpacing: "-0.02em", color: L.ink, margin: "0 0 14px", maxWidth: 720, textWrap: "balance" }}>
          Every founder worry has a specialist.
        </h2>
        <p style={{ fontSize: 17, color: L.muted, maxWidth: 580, lineHeight: 1.65, margin: "0 0 40px" }}>
          Ask any of the questions that keep you up. The adviser who owns it answers
          with your context — this is the real thing, not a brochure.
        </p>
      </Reveal>

      <Reveal>
        <div style={{ maxWidth: 860, margin: "0 auto", background: L.card, border: `1px solid ${L.bdr}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 24px 60px -30px rgba(24,22,15,0.22)" }}>
          {/* chat header — reads like the product */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: `1px solid ${L.bdr}`, background: L.cream2 }}>
            <div style={{ display: "flex" }}>
              {ADVISERS.slice(0, 5).map((a, i) => (
                <span key={a.name} aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 99, background: L.alpha(a.color, 0.16), border: `2px solid ${L.card}`, marginLeft: i === 0 ? 0 : -8, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: a.color }}>{a.name[0]}</span>
              ))}
            </div>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: L.ink }}>Your advisory bench</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginLeft: "auto", fontFamily: FONT_MONO, fontSize: 11, color: L.muted }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: L.green }} /> 9 online
            </span>
          </div>

          {/* conversation */}
          <div style={{ padding: "26px 22px", minHeight: 230, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* founder's worry — right aligned */}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 10 }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`q-${selected}`}
                  initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduced ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ maxWidth: "78%", background: L.ink, color: L.bg, padding: "11px 16px", borderRadius: "16px 16px 4px 16px", fontSize: 15, lineHeight: 1.45 }}
                >
                  {active.thought}
                </motion.div>
              </AnimatePresence>
              <Avatar color={L.muted} letter="Y" />
            </div>

            {/* adviser reply — left aligned, types in */}
            <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-start", gap: 10 }}>
              <Avatar color={active.color} letter={active.name[0]} />
              <div style={{ maxWidth: "80%" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: L.ink }}>{active.name}</span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: active.color }}>{active.role}</span>
                </div>
                <AnimatePresence mode="wait">
                  {typing ? (
                    <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                      style={{ display: "inline-block", background: L.surf, borderRadius: "4px 16px 16px 16px", padding: "8px 14px" }}>
                      <TypingDots color={active.color} />
                    </motion.div>
                  ) : (
                    <motion.div key={`a-${selected}`}
                      initial={reduced ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduced ? undefined : { opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      style={{ background: L.surf, color: L.ink, padding: "11px 16px", borderRadius: "4px 16px 16px 16px", fontSize: 15, lineHeight: 1.5 }}>
                      {active.advice}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* suggested-prompt chips */}
          <div style={{ borderTop: `1px solid ${L.bdr}`, padding: "14px 16px", background: L.cream2 }}>
            <p style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: L.muted, margin: "0 0 10px" }}>Try a question</p>
            <div className="scrollbar-hide" role="tablist" aria-label="Founder worries" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
              {ADVISERS.map((a, i) => {
                const on = selected === i;
                return (
                  <button
                    key={a.name}
                    role="tab"
                    aria-selected={on}
                    onClick={() => setSelected(i)}
                    className="lp-cloud"
                    style={{
                      flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 8,
                      background: on ? L.alpha(a.color, 0.1) : L.card,
                      border: `1.5px solid ${on ? a.color : L.bdr}`,
                      borderRadius: 999, padding: "9px 15px", cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: a.color, boxShadow: on ? `0 0 8px ${a.color}` : "none" }} />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: L.ink, whiteSpace: "nowrap" }}>{a.domain}</span>
                    <span style={{ fontSize: 12.5, color: L.muted, whiteSpace: "nowrap" }}>{a.thought}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
