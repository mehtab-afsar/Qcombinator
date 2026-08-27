"use client";

import { motion } from "framer-motion";
import { L, FONT_SERIF, FONT_MONO } from "../theme";
import { LADDER, PREMISE, PROBLEMS } from "../copy";
import { Reveal, Eyebrow } from "./Section";
import { CountUp } from "./CountUp";
import { useMotionPrefs } from "@/features/shared/hooks/useMotionPrefs";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fill bar + 5 stop dots, lighting up left-to-right once scrolled into view. Reduced motion
 *  renders the fully-lit end state immediately, same convention as Reveal/StaticHowItWorks. */
function LadderTrack() {
  const reduced = useMotionPrefs();

  return (
    <div style={{ padding: "8px 0 0" }}>
      <div style={{ position: "relative", height: 3, background: L.bdr, borderRadius: 2 }}>
        <motion.div
          initial={reduced ? undefined : { scaleX: 0 }}
          whileInView={reduced ? undefined : { scaleX: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={reduced ? undefined : { duration: 1.2, ease: EASE, delay: 0.1 }}
          style={{ position: "absolute", inset: 0, transformOrigin: "left", background: `linear-gradient(90deg, ${L.blue}, ${L.green})`, borderRadius: 2 }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 0 }}>
        {LADDER.map((stop, i) => {
          const isLast = i === LADDER.length - 1;
          return (
            <motion.div
              key={stop.multiple}
              initial={reduced ? undefined : { opacity: 0, y: 12 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
              whileHover={reduced ? undefined : { y: -3 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.35 + i * 0.14 }}
              style={{ position: "relative", paddingTop: 30, textAlign: isLast ? "right" : "left", cursor: "default" }}
            >
              <motion.span
                aria-hidden="true"
                initial={reduced ? undefined : { scale: 0 }}
                whileInView={reduced ? undefined : { scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4, ease: "backOut", delay: 0.4 + i * 0.14 }}
                className={reduced ? undefined : "lp-ladder-dot"}
                style={{
                  position: "absolute", top: -6, left: isLast ? "auto" : 0, right: isLast ? 0 : "auto",
                  width: 12, height: 12, borderRadius: 99, background: L.green, border: `2px solid ${L.card}`, boxShadow: `0 0 0 2px ${L.green}`,
                }}
              />
              <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: 13, fontWeight: 600, color: L.green, marginBottom: 4 }}>{stop.multiple}</span>
              <span style={{ display: "block", fontSize: "clamp(12.5px, 1.4vw, 14.5px)", fontWeight: 600, color: L.ink, lineHeight: 1.3, maxWidth: 128, marginLeft: isLast ? "auto" : 0 }}>{stop.archetype}</span>
              <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: 10.5, color: L.muted, marginTop: 4 }}>Q {stop.scoreMin}–{stop.scoreMax}</span>
              <span style={{ display: "block", fontSize: 11.5, color: L.muted, lineHeight: 1.4, marginTop: 8, maxWidth: 148, marginLeft: isLast ? "auto" : 0 }}>{stop.note}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function Ladder() {
  return (
    <section style={{ padding: "40px 24px 100px", maxWidth: 1180, margin: "0 auto" }}>
      <Reveal>
        <Eyebrow color={L.blue}>{PREMISE.eyebrow}</Eyebrow>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(28px, 3.6vw, 42px)", fontWeight: 480, letterSpacing: "-0.02em", lineHeight: 1.15, color: L.ink, maxWidth: "22ch", margin: "0 0 56px", textWrap: "balance" }}>
          {PREMISE.heading}
        </h2>
      </Reveal>

      <LadderTrack />

      <Reveal delay={0.1}>
        <div className="premise-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "start", marginTop: 64 }}>
          <p style={{ fontSize: "clamp(15.5px, 1.8vw, 17.5px)", color: L.muted, lineHeight: 1.65, margin: 0 }}>{PREMISE.body}</p>
          <div style={{ borderLeft: `1px solid ${L.bdr}`, paddingLeft: 28 }}>
            <span style={{ display: "block", fontFamily: FONT_SERIF, fontSize: 40, fontWeight: 700, color: L.ink, marginBottom: 6 }}>{PREMISE.statValue}</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: L.muted, lineHeight: 1.7 }}>{PREMISE.statLabel}</span>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24, marginTop: 56, paddingTop: 40, borderTop: `1px solid ${L.bdr}` }}>
          {PROBLEMS.map((p) => {
            const m = p.stat.match(/^(\d+)(.*)$/);
            const to = m ? Number(m[1]) : 0;
            const suffix = m ? m[2] : p.stat;
            return (
              <div key={p.stat} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 24, fontWeight: 700, color: L.red, minWidth: 66, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                  <CountUp to={to} suffix={suffix} />
                </span>
                <p style={{ fontSize: 13, color: L.muted, margin: 0, lineHeight: 1.55 }}>{p.label}</p>
              </div>
            );
          })}
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <p style={{ fontFamily: FONT_MONO, fontSize: 13, color: L.ink, textAlign: "center", margin: "56px 0 0" }}>{PREMISE.closingLine}</p>
      </Reveal>

      <style>{`
        @media (max-width: 820px) {
          .premise-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
