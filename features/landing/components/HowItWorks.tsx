"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { L, FONT_SERIF, FONT_MONO } from "../theme";
import { STEPS, PARAMETERS } from "../copy";
import { Reveal, Eyebrow } from "./Section";
import { useMotionPrefs } from "../hooks/useMotionPrefs";
import { useIsWide } from "../hooks/useIsWide";

const EASE = [0.22, 1, 0.36, 1] as const;

// ─── Static variant (mobile / reduced-motion) ────────────────────────────────

function StaticHowItWorks() {
  const reduced = useMotionPrefs();
  return (
    <section id="how-it-works" style={{ padding: "100px 24px", maxWidth: 1180, margin: "0 auto", scrollMarginTop: 80 }}>
      <Reveal>
        <Eyebrow color={L.green}>How it works</Eyebrow>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 480, lineHeight: 1.12, letterSpacing: "-0.02em", color: L.ink, margin: "0 0 44px", maxWidth: 640, textWrap: "balance" }}>
          Score. Improve. Unlock.
        </h2>
      </Reveal>

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
        <DimensionsPanel />
      </Reveal>
    </section>
  );
}

function DimensionsPanel() {
  return (
    <div style={{ background: L.surf, border: `1px solid ${L.bdr}`, borderRadius: 16, padding: "26px 28px" }}>
      <p style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: L.muted, margin: "0 0 18px" }}>
        The six dimensions investors actually price
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 18 }}>
        {PARAMETERS.map((p, i) => (
          <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: p.color, marginTop: 5, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: 12.5, fontWeight: 700, color: L.ink, margin: 0 }}>P{i + 1} · {p.name}</p>
              <div style={{ height: 2, background: L.alpha(p.color, 0.4), borderRadius: 2, margin: "5px 0 6px" }} />
              <p style={{ fontSize: 12.5, color: L.muted, lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pinned depth-gallery (desktop) ──────────────────────────────────────────

/** One step card flying in from depth to its slot in the row. */
function DepthCard({ progress, index }: { progress: MotionValue<number>; index: number }) {
  const s = STEPS[index];
  // arrival window per card
  const a0 = 0.06 + index * 0.20;
  const a1 = a0 + 0.16;
  const slotX = (index - 1) * 356;

  const z = useTransform(progress, [a0, a1], [-420, 0]);
  const x = useTransform(progress, [a0, a1], [0, slotX]);
  const y = useTransform(progress, [a0, a1], [70, 0]);
  const opacity = useTransform(progress, [a0, a0 + 0.05], [0, 1]);
  // during the finale the row recedes upward slightly to make room
  const rowY = useTransform(progress, [0.70, 0.86], [0, -46]);
  const rowScale = useTransform(progress, [0.70, 0.86], [1, 0.94]);

  return (
    <motion.div
      style={{
        position: "absolute", left: "50%", top: "50%",
        width: 336, marginLeft: -168, marginTop: -120,
        x, y, z, opacity, translateY: rowY, scale: rowScale,
        background: L.card, border: `1px solid ${L.bdr}`, borderRadius: 16,
        padding: "28px 26px", boxShadow: "0 22px 44px -26px rgba(24,22,15,0.28)",
      }}
    >
      <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: L.blue, letterSpacing: "0.12em" }}>{s.n}</span>
      <h3 style={{ fontSize: 19, fontWeight: 650, color: L.ink, margin: "12px 0 10px", letterSpacing: "-0.01em" }}>{s.title}</h3>
      <p style={{ fontSize: 14.5, color: L.muted, lineHeight: 1.6, margin: 0 }}>{s.body}</p>
    </motion.div>
  );
}

/** One dimension tile fanning into the curved gallery. */
function DimensionTile({ progress, index }: { progress: MotionValue<number>; index: number }) {
  const p = PARAMETERS[index];
  const t0 = 0.74 + index * 0.028;
  const t1 = t0 + 0.10;
  // curved gallery pose: outer tiles rotate toward the centre and recede
  const centerOffset = index - 2.5; // -2.5 … +2.5
  const finalRotY = centerOffset * -6.5;
  const finalZ = -Math.abs(centerOffset) * 26;

  const opacity = useTransform(progress, [t0, t0 + 0.05], [0, 1]);
  const y = useTransform(progress, [t0, t1], [90, 0]);
  const z = useTransform(progress, [t0, t1], [-260, finalZ]);
  const rotateY = useTransform(progress, [t0, t1], [0, finalRotY]);
  const lineScale = useTransform(progress, [t1, t1 + 0.06], [0, 1]);

  return (
    <motion.div
      style={{
        width: 172, flexShrink: 0, opacity, y, z, rotateY,
        background: L.card, border: `1px solid ${L.bdr}`, borderRadius: 14,
        padding: "16px 15px", boxShadow: "0 16px 34px -22px rgba(24,22,15,0.3)",
      }}
    >
      <span aria-hidden="true" style={{ display: "block", width: 9, height: 9, borderRadius: 99, background: p.color, marginBottom: 9 }} />
      <p style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: L.ink, margin: 0, lineHeight: 1.4 }}>P{index + 1} · {p.name}</p>
      <motion.div style={{ height: 2, background: L.alpha(p.color, 0.5), borderRadius: 2, margin: "7px 0 8px", transformOrigin: "left", scaleX: lineScale }} />
      <p style={{ fontSize: 11.5, color: L.muted, lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
    </motion.div>
  );
}

function PinnedHowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const railFill = useTransform(scrollYProgress, [0.06, 0.9], [0, 1]);
  const dimsLabelOpacity = useTransform(scrollYProgress, [0.72, 0.8], [0, 1]);

  return (
    <section ref={ref} id="how-it-works" style={{ height: "300vh", position: "relative", scrollMarginTop: 0 }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
        {/* header */}
        <div style={{ position: "absolute", top: "9vh", left: 0, right: 0, textAlign: "center", padding: "0 24px", zIndex: 3 }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: L.green, margin: "0 0 14px" }}>How it works</p>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 480, lineHeight: 1.1, letterSpacing: "-0.02em", color: L.ink, margin: "0 auto 18px", maxWidth: 640, textWrap: "balance" }}>
            Score. Improve. Unlock.
          </h2>
          {/* progress rail */}
          <div style={{ width: 220, height: 3, background: L.bdr, borderRadius: 99, margin: "0 auto", overflow: "hidden" }} aria-hidden="true">
            <motion.div style={{ height: "100%", background: L.green, borderRadius: 99, transformOrigin: "left", scaleX: railFill }} />
          </div>
        </div>

        {/* 3D stage */}
        <div style={{ position: "absolute", inset: 0, perspective: 1300, transformStyle: "preserve-3d" }}>
          {/* step cards fly in from depth to their slots */}
          <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>
            {STEPS.map((_, i) => (
              <DepthCard key={i} progress={scrollYProgress} index={i} />
            ))}
          </div>

          {/* finale: six dimensions fan into a curved gallery */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: "9vh", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, transformStyle: "preserve-3d" }}>
            <motion.p style={{ opacity: dimsLabelOpacity, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: L.muted, margin: 0 }}>
              The six dimensions investors actually price
            </motion.p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", perspective: 1100, transformStyle: "preserve-3d" }}>
              {PARAMETERS.map((_, i) => (
                <DimensionTile key={i} progress={scrollYProgress} index={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const reduced = useMotionPrefs();
  const wide = useIsWide();
  if (reduced || !wide) return <StaticHowItWorks />;
  return <PinnedHowItWorks />;
}
