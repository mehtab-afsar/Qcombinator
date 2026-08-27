"use client";

import { motion } from "framer-motion";
import { L, FONT_SERIF, FONT_MONO } from "../theme";
import { DISCOVER } from "../copy";
import { Reveal, Eyebrow } from "./Section";
import { useMotionPrefs } from "@/features/shared/hooks/useMotionPrefs";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Discover() {
  const reduced = useMotionPrefs();

  return (
    <section style={{ padding: "20px 24px 110px", maxWidth: 1180, margin: "0 auto" }}>
      <Reveal>
        <Eyebrow color={L.green}>What the check gives you</Eyebrow>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(28px, 3.6vw, 42px)", fontWeight: 480, letterSpacing: "-0.02em", color: L.ink, margin: "0 0 44px" }}>
          Four answers, in order.
        </h2>
      </Reveal>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
        {DISCOVER.map((card, i) => (
          <motion.div
            key={card.n}
            initial={reduced ? undefined : { opacity: 0, y: 24 }}
            whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
            whileHover={reduced ? undefined : { y: -5, borderColor: L.blue, boxShadow: "0 20px 44px -22px rgba(37,99,235,0.28)" }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: EASE, delay: i * 0.1 }}
            style={{ background: L.card, border: `1px solid ${L.bdr}`, borderRadius: 16, padding: "28px 24px", height: "100%" }}
          >
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: L.blue, letterSpacing: "0.12em" }}>{card.n}</span>
            <h3 style={{ fontSize: 17.5, fontWeight: 650, color: L.ink, margin: "16px 0 8px", letterSpacing: "-0.01em" }}>{card.title}</h3>
            <p style={{ fontSize: 13.5, color: L.muted, lineHeight: 1.6, margin: 0 }}>{card.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
