"use client";

import { motion } from "framer-motion";
import { L, FONT_SERIF, FONT_MONO } from "../theme";
import { STEPS, PARAMETERS } from "../copy";
import { Reveal, Eyebrow } from "./Section";
import { useMotionPrefs } from "../hooks/useMotionPrefs";

const EASE = [0.22, 1, 0.36, 1] as const;
const NODE_POS = ["16.666%", "50%", "83.333%"];

export function HowItWorks() {
  const reduced = useMotionPrefs();

  return (
    <section id="how-it-works" style={{ padding: "100px 24px", maxWidth: 1180, margin: "0 auto", scrollMarginTop: 80 }}>
      <Reveal>
        <Eyebrow color={L.green}>How it works</Eyebrow>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 480, lineHeight: 1.12, letterSpacing: "-0.02em", color: L.ink, margin: "0 0 44px", maxWidth: 640, textWrap: "balance" }}>
          Score. Improve. Unlock.
        </h2>
      </Reveal>

      {/* desktop progress stepper — the line draws across as the section enters */}
      <div className="lp-stepper" style={{ position: "relative", height: 14, margin: "0 0 22px" }} aria-hidden="true">
        <div style={{ position: "absolute", top: 6, left: NODE_POS[0], right: NODE_POS[0], height: 2, background: L.bdr, borderRadius: 2 }}>
          <motion.div
            initial={reduced ? undefined : { scaleX: 0 }}
            whileInView={reduced ? undefined : { scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.2, ease: "easeInOut", delay: 0.15 }}
            style={{ height: "100%", background: L.green, transformOrigin: "left", borderRadius: 2 }}
          />
        </div>
        {NODE_POS.map((left, i) => (
          <motion.span
            key={i}
            initial={reduced ? undefined : { scale: 0 }}
            whileInView={reduced ? undefined : { scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.15 + i * 0.5 }}
            style={{ position: "absolute", top: 0, left, transform: "translateX(-50%)", width: 14, height: 14, borderRadius: 99, background: L.green, boxShadow: `0 0 0 4px ${L.alpha(L.green, 0.14)}` }}
          />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18, marginBottom: 56 }}>
        {STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            initial={reduced ? undefined : { opacity: 0, y: 26 }}
            whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: EASE, delay: i * 0.14 }}
            style={{ background: L.card, border: `1px solid ${L.bdr}`, borderRadius: 16, padding: "30px 28px", height: "100%" }}
          >
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: L.blue, letterSpacing: "0.12em" }}>{s.n}</span>
            <h3 style={{ fontSize: 19, fontWeight: 650, color: L.ink, margin: "12px 0 10px", letterSpacing: "-0.01em" }}>{s.title}</h3>
            <p style={{ fontSize: 14.5, color: L.muted, lineHeight: 1.65, margin: 0 }}>{s.body}</p>
          </motion.div>
        ))}
      </div>

      <Reveal>
        <div style={{ background: L.surf, border: `1px solid ${L.bdr}`, borderRadius: 16, padding: "26px 28px" }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: L.muted, margin: "0 0 18px" }}>
            The six dimensions investors actually price
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 18 }}>
            {PARAMETERS.map((p, i) => (
              <motion.div
                key={p.id}
                initial={reduced ? undefined : { opacity: 0, y: 14 }}
                whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, ease: EASE, delay: i * 0.07 }}
                style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
              >
                <motion.span
                  aria-hidden="true"
                  initial={reduced ? undefined : { scale: 0 }}
                  whileInView={reduced ? undefined : { scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, ease: EASE, delay: i * 0.07 + 0.15 }}
                  style={{ width: 8, height: 8, borderRadius: 99, background: p.color, marginTop: 5, flexShrink: 0 }}
                />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: FONT_MONO, fontSize: 12.5, fontWeight: 700, color: L.ink, margin: 0 }}>P{i + 1} · {p.name}</p>
                  <motion.div
                    initial={reduced ? undefined : { scaleX: 0 }}
                    whileInView={reduced ? undefined : { scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: EASE, delay: i * 0.07 + 0.25 }}
                    style={{ height: 2, background: L.alpha(p.color, 0.4), borderRadius: 2, transformOrigin: "left", margin: "5px 0 6px" }}
                  />
                  <p style={{ fontSize: 12.5, color: L.muted, lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
