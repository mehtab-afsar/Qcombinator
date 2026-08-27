"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { L, FONT_SERIF, FONT_MONO } from "../theme";
import { HERO_COPY } from "../copy";
import { Eyebrow } from "./Section";
import { useMotionPrefs } from "@/features/shared/hooks/useMotionPrefs";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Staggered rise-in for the hero's own stack — each child fades/slides up in turn instead of
 *  the whole block arriving at once. Reduced motion collapses straight to the end state. */
const stack = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};
const rise = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

/** Two soft accent blobs that drift toward the cursor — a light-touch echo of the old cinematic
 *  hero's parallax, without the 3D machinery. Skipped entirely under reduced motion. */
function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useSpring(useMotionValue(0), { stiffness: 40, damping: 20, mass: 0.6 });
  const my = useSpring(useMotionValue(0), { stiffness: 40, damping: 20, mass: 0.6 });
  const blueX = useTransform(mx, [-0.5, 0.5], [-18, 18]);
  const blueY = useTransform(my, [-0.5, 0.5], [-14, 14]);
  const greenX = useTransform(mx, [-0.5, 0.5], [16, -16]);
  const greenY = useTransform(my, [-0.5, 0.5], [12, -12]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <div ref={ref} onMouseMove={onMove} aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <motion.div style={{ position: "absolute", top: "-10%", left: "6%", width: 460, height: 460, borderRadius: "50%", background: L.alpha(L.blue, 0.13), filter: "blur(90px)", x: blueX, y: blueY }} />
      <motion.div style={{ position: "absolute", top: "8%", right: "2%", width: 380, height: 380, borderRadius: "50%", background: L.alpha(L.green, 0.12), filter: "blur(90px)", x: greenX, y: greenY }} />
    </div>
  );
}

function ScrollCue() {
  const reduced = useMotionPrefs();
  return (
    <motion.p
      variants={rise}
      animate={reduced ? undefined : { y: [0, 6, 0] }}
      transition={reduced ? undefined : { duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: L.muted, margin: "48px 0 0" }}
    >
      {HERO_COPY.scrollCue}
    </motion.p>
  );
}

export function Hero() {
  const reduced = useMotionPrefs();

  return (
    <section style={{ position: "relative", padding: "150px 24px 90px", overflow: "hidden" }} aria-label="Edge Alpha — Founder Leverage Check">
      {!reduced && <CursorGlow />}

      <motion.div
        variants={stack}
        initial="hidden"
        animate="show"
        style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto" }}
      >
        <motion.div variants={rise}><Eyebrow color={L.blue}>{HERO_COPY.eyebrow}</Eyebrow></motion.div>

        <motion.h1 variants={rise} style={{ fontFamily: FONT_SERIF, fontSize: "clamp(38px, 6.4vw, 68px)", fontWeight: 480, lineHeight: 1.05, letterSpacing: "-0.02em", color: L.ink, margin: "0 0 22px", maxWidth: "16ch", textWrap: "balance" }}>
          {HERO_COPY.headlinePre}
          <span className={reduced ? undefined : "lp-shimmer"} style={{
            background: `linear-gradient(97deg, ${L.blue}, ${L.green}, ${L.blue})`,
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>
            {HERO_COPY.headlineGradient}
          </span>
          {HERO_COPY.headlinePost}
        </motion.h1>

        <motion.p variants={rise} style={{ fontSize: "clamp(16px, 1.9vw, 19px)", color: L.muted, lineHeight: 1.6, maxWidth: "48ch", margin: "0 0 40px" }}>
          {HERO_COPY.sub}
        </motion.p>

        <motion.div variants={rise} style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
          <Link href="/founder/onboarding" className="lp-cta lp-cta-glow" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: L.ink, color: L.bg, padding: "13px 26px", borderRadius: 999,
            fontSize: 15, fontWeight: 600, textDecoration: "none",
          }}>
            {HERO_COPY.ctaLabel} <ArrowRight size={16} aria-hidden="true" className="lp-cta-arrow" />
          </Link>
          <Link href="/login" className="lp-cta" style={{
            display: "inline-flex", alignItems: "center",
            background: L.card, color: L.ink, padding: "13px 22px", borderRadius: 999,
            border: `1px solid ${L.bdr}`, fontSize: 15, fontWeight: 500, textDecoration: "none",
          }}>
            I&apos;m an investor
          </Link>
        </motion.div>
        <motion.p variants={rise} style={{ fontFamily: FONT_MONO, fontSize: 12, color: L.muted, margin: "0 0 44px" }}>{HERO_COPY.tagline}</motion.p>

        <motion.div variants={rise} className="hero-line" style={{ display: "flex", gap: 40, paddingTop: 28, borderTop: `1px solid ${L.bdr}` }}>
          <p style={{ fontSize: "clamp(15px, 1.7vw, 17px)", color: L.ink, lineHeight: 1.5, flex: 1, minWidth: 260 }}>
            <span style={{ fontFamily: FONT_MONO, color: L.blue, fontWeight: 500 }}>Most founders </span>
            {HERO_COPY.flaggedLine}
          </p>
          <p style={{ fontSize: "clamp(15px, 1.7vw, 17px)", color: L.ink, fontWeight: 600, lineHeight: 1.5, flex: 1, minWidth: 260 }}>
            {HERO_COPY.closerLine}
          </p>
        </motion.div>

        <ScrollCue />
      </motion.div>

      <style>{`
        @media (max-width: 720px) {
          .hero-line { flex-direction: column !important; gap: 18px !important; }
        }
      `}</style>
    </section>
  );
}
