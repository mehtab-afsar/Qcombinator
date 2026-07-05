"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { L, FONT_SERIF, FONT_MONO } from "../theme";
import { ADVISERS } from "../copy";
import { Reveal } from "./Section";
import { useMotionPrefs } from "../hooks/useMotionPrefs";

const EASE = [0.22, 1, 0.36, 1] as const;

function Avatar({ color, letter, size = 36 }: { color: string; letter: string; size?: number }) {
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, borderRadius: 99, flexShrink: 0,
      background: L.alpha(color, 0.13), border: `1.5px solid ${L.alpha(color, 0.45)}`,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color,
    }}>{letter}</span>
  );
}

function TypingDots({ color }: { color: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center", padding: "5px 2px" }}>
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

  // subtle product-on-a-stage tilt
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const SPRING = { stiffness: 90, damping: 20, mass: 0.4 };
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [2.4, -2.4]), SPRING);
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-3.4, 3.4]), SPRING);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  useEffect(() => {
    if (reduced) { setTyping(false); return; }
    setTyping(true);
    const t = setTimeout(() => setTyping(false), 780);
    return () => clearTimeout(t);
  }, [selected, reduced]);

  return (
    <section id="advisers" style={{ padding: "130px 24px 120px", scrollMarginTop: 80, position: "relative", overflow: "hidden" }}>
      {/* keynote header — centered */}
      <Reveal>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: L.blue, margin: "0 0 20px" }}>Your bench</p>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(34px, 5vw, 58px)", fontWeight: 460, lineHeight: 1.07, letterSpacing: "-0.025em", color: L.ink, margin: "0 0 20px", textWrap: "balance" }}>
            Every founder worry has a specialist.
          </h2>
          <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: L.muted, lineHeight: 1.6, margin: 0, textWrap: "balance" }}>
            Nine advisers, each an expert in one thing that makes or breaks a raise. Loaded
            with your context — they answer with specifics, not platitudes.
          </p>
        </div>
      </Reveal>

      {/* product stage — the white card is the hero; a soft aura hugs it */}
      <Reveal>
        <div
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          style={{ maxWidth: 1060, margin: "60px auto 0", position: "relative", perspective: 1900 }}
        >
          {/* soft aura hugging the card, tinted by the active adviser */}
          <motion.div aria-hidden="true"
            animate={reduced ? undefined : { opacity: [0.6, 0.92, 0.6] }}
            transition={reduced ? undefined : { duration: 7, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: -48, borderRadius: 48,
              background: `radial-gradient(58% 58% at 50% 42%, ${L.alpha(active.color, 0.28)}, ${L.alpha(active.color, 0.09)} 60%, transparent 100%)`,
              filter: "blur(66px)", transition: "background 0.6s ease", pointerEvents: "none", zIndex: 0,
            }}
          />

          <motion.div
            initial={reduced ? undefined : { opacity: 0, rotateX: 14, y: 40 }}
            whileInView={reduced ? undefined : { opacity: 1, rotateX: 0, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, ease: EASE }}
            style={{
              position: "relative", zIndex: 1,
              rotateX: reduced ? 0 : rotX, rotateY: reduced ? 0 : rotY,
              transformStyle: "preserve-3d",
              background: L.card, borderRadius: 28, overflow: "hidden",
              border: `1px solid ${L.bdr}`,
              boxShadow: "0 60px 120px -42px rgba(24,22,15,0.36), 0 14px 38px -18px rgba(24,22,15,0.15)",
            }}
          >
            {/* window chrome */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "17px 28px", borderBottom: `1px solid ${L.bdr}` }}>
              <div style={{ display: "flex", gap: 7 }}>
                {["#E5675E", "#E6B14C", "#5FB86A"].map((c) => (
                  <span key={c} aria-hidden="true" style={{ width: 11, height: 11, borderRadius: 99, background: L.alpha(c, 0.9) }} />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 auto" }}>
                {ADVISERS.slice(0, 5).map((a, i) => (
                  <span key={a.name} aria-hidden="true" style={{ width: 20, height: 20, borderRadius: 99, background: L.alpha(a.color, 0.16), border: `2px solid ${L.card}`, marginLeft: i === 0 ? 0 : -8, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700, color: a.color }}>{a.name[0]}</span>
                ))}
                <span style={{ fontSize: 13, fontWeight: 600, color: L.ink, marginLeft: 4 }}>Advisory bench</span>
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT_MONO, fontSize: 11, color: L.muted }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: L.green }} /> live
              </span>
            </div>

            {/* conversation */}
            <div style={{ padding: "44px 40px", minHeight: 340, display: "flex", flexDirection: "column", gap: 22, justifyContent: "center" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 10 }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`q-${selected}`}
                    initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduced ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ maxWidth: "68%", background: L.ink, color: L.bg, padding: "13px 19px", borderRadius: "20px 20px 5px 20px", fontSize: 16.5, lineHeight: 1.45 }}
                  >
                    {active.thought}
                  </motion.div>
                </AnimatePresence>
                <Avatar color={L.muted} letter="Y" size={36} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-start", gap: 12 }}>
                <motion.div
                  key={`av-${selected}`}
                  initial={reduced ? false : { scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 22 }}
                >
                  <Avatar color={active.color} letter={active.name[0]} />
                </motion.div>
                <div style={{ maxWidth: "78%" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 15.5, fontWeight: 700, color: L.ink }}>{active.name}</span>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: active.color }}>{active.role}</span>
                  </div>
                  <AnimatePresence mode="wait">
                    {typing ? (
                      <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                        style={{ display: "inline-block", background: L.surf, borderRadius: "5px 18px 18px 18px", padding: "9px 15px" }}>
                        <TypingDots color={active.color} />
                      </motion.div>
                    ) : (
                      <motion.div key={`a-${selected}`}
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduced ? undefined : { opacity: 0 }}
                        transition={{ duration: 0.34, ease: EASE }}
                        style={{ background: L.surf, color: L.ink, padding: "15px 20px", borderRadius: "5px 20px 20px 20px", fontSize: 16.5, lineHeight: 1.62 }}>
                        {active.advice}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* suggested prompts */}
            <div style={{ borderTop: `1px solid ${L.bdr}`, padding: "18px 20px" }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: L.muted, margin: "0 0 12px", paddingLeft: 4 }}>Ask a question</p>
              <div className="scrollbar-hide" role="tablist" aria-label="Founder worries" style={{ display: "flex", gap: 9, overflowX: "auto", paddingBottom: 2 }}>
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
                        background: on ? L.alpha(a.color, 0.1) : L.bg,
                        border: `1.5px solid ${on ? a.color : L.bdr}`,
                        borderRadius: 999, padding: "9px 16px", cursor: "pointer", fontFamily: "inherit",
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
          </motion.div>

          <p style={{ textAlign: "center", fontFamily: FONT_MONO, fontSize: 11.5, color: L.muted, margin: "22px 0 0", position: "relative", zIndex: 1 }}>
            A preview. Inside Edge Alpha, every answer is built from your live Q-Score data.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
