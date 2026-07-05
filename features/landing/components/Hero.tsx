"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import { L, FONT_SERIF, FONT_MONO } from "../theme";
import { FLOORS, HERO_SCORE } from "../copy";
import { useMotionPrefs } from "../hooks/useMotionPrefs";
import { useIsWide } from "../hooks/useIsWide";
import { HeroBuilding } from "./building/HeroBuilding";

function CtaRow({ center = false }: { center?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: center ? "center" : "flex-start" }}>
      <Link href="/signup" className="lp-cta" style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: L.ink, color: L.bg, padding: "13px 26px",
        borderRadius: 999, fontSize: 15, fontWeight: 600, textDecoration: "none",
      }}>
        Get your Q-Score <ArrowRight size={16} aria-hidden="true" />
      </Link>
      <Link href="/investor/onboarding" className="lp-cta" style={{
        display: "inline-flex", alignItems: "center",
        background: L.card, color: L.ink, padding: "13px 22px",
        borderRadius: 999, border: `1px solid ${L.bdr}`,
        fontSize: 15, fontWeight: 500, textDecoration: "none",
      }}>
        I&apos;m an investor
      </Link>
    </div>
  );
}

function ScoreReadout({ scoreRef, milestoneRef }: {
  scoreRef: React.RefObject<HTMLSpanElement | null>;
  milestoneRef: React.RefObject<HTMLSpanElement | null>;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
        <span ref={scoreRef} style={{ fontFamily: FONT_MONO, fontSize: "clamp(40px, 6vw, 68px)", fontWeight: 700, color: L.ink, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>0</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 20, color: L.muted, fontWeight: 500 }}>/100</span>
      </div>
      <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.22em", color: L.green, textTransform: "uppercase", marginTop: 7 }}>Q-Score</span>
      <span ref={milestoneRef} style={{ display: "block", fontSize: 13, color: L.muted, marginTop: 6, minHeight: 18 }} aria-live="polite" />
    </div>
  );
}

function SkyBackdrop() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "8%", left: "12%", width: 120, height: 120, borderRadius: "50%", background: L.alpha(L.amber, 0.10), filter: "blur(30px)" }} />
      <div style={{ position: "absolute", bottom: "16%", right: "14%", width: 180, height: 180, borderRadius: "50%", background: L.alpha(L.blue, 0.06), filter: "blur(45px)" }} />
    </div>
  );
}

/** Compact static hero for mobile / reduced-motion — fully-built HQ, no pin. */
function StaticHero() {
  return (
    <section style={{ position: "relative", padding: "120px 24px 60px", overflow: "hidden" }} aria-label="Edge Alpha — build a fundable business">
      <SkyBackdrop />
      <div style={{ position: "relative", maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: "0.18em", textTransform: "uppercase", color: L.green, margin: "0 0 16px" }}>
          The startup OS with a score
        </p>
        <h1 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(38px, 10vw, 56px)", fontWeight: 480, lineHeight: 1.05, letterSpacing: "-0.02em", color: L.ink, margin: "0 0 16px", textWrap: "balance" }}>
          Build a fundable business. Then raise.
        </h1>
        <p style={{ fontSize: 16.5, color: L.muted, lineHeight: 1.6, margin: "0 auto 30px", maxWidth: 460 }}>
          Edge Alpha scores your startup across the six dimensions investors actually price —
          then nine AI advisers help you move the number.
        </p>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><CtaRow center /></div>
      </div>
      <div style={{ position: "relative", width: "min(84vw, 380px)", margin: "34px auto 0" }}>
        <HeroBuilding builtFloors={6} />
      </div>
      <div style={{ position: "relative", textAlign: "center", marginTop: 8 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 40, fontWeight: 700, color: L.ink, fontVariantNumeric: "tabular-nums" }}>{HERO_SCORE}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 16, color: L.muted }}>/100</span>
        <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.2em", color: L.green, textTransform: "uppercase", marginTop: 4 }}>Fundable</span>
      </div>
    </section>
  );
}

/** Desktop scroll-pinned hero: the HQ rises floor by floor as you scroll. */
function PinnedHero() {
  const ref = useRef<HTMLElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const milestoneRef = useRef<HTMLSpanElement>(null);
  const [built, setBuilt] = useState(0);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const builtMv = useTransform(scrollYProgress, [0.12, 0.86], [0, 6]);
  const scoreMv = useTransform(scrollYProgress, [0.12, 0.86], [0, HERO_SCORE]);

  const introOpacity = useTransform(scrollYProgress, [0, 0.1, 0.66, 0.76], [1, 1, 1, 0]);
  const ctaOpacity = useTransform(scrollYProgress, [0.76, 0.88], [0, 1]);
  const ctaY = useTransform(scrollYProgress, [0.76, 0.88], [28, 0]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  useMotionValueEvent(builtMv, "change", (v) => setBuilt(v));
  useMotionValueEvent(scoreMv, "change", (v) => {
    if (scoreRef.current) scoreRef.current.textContent = String(Math.round(v));
    if (milestoneRef.current) {
      if (v < 2) { milestoneRef.current.textContent = ""; return; }
      if (v >= HERO_SCORE - 1) { milestoneRef.current.textContent = "Fundable — investors see you"; return; }
      let idx = FLOORS.findIndex((f) => f.score >= v);
      if (idx === -1) idx = FLOORS.length - 1;
      milestoneRef.current.textContent = `Building: ${FLOORS[idx].label}`;
    }
  });

  return (
    <section ref={ref} style={{ height: "340vh", position: "relative" }} aria-label="Edge Alpha — build a fundable business, then raise">
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <SkyBackdrop />

        {/* headline / stage-A copy (fades out) */}
        <motion.div style={{ opacity: introOpacity, position: "absolute", top: "11vh", left: 0, right: 0, textAlign: "center", padding: "0 24px", zIndex: 3, pointerEvents: "none" }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: L.green, margin: "0 0 16px" }}>
            The startup OS with a score
          </p>
          <h1 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(40px, 5.5vw, 68px)", fontWeight: 480, lineHeight: 1.04, letterSpacing: "-0.02em", color: L.ink, margin: "0 auto 14px", maxWidth: 760, textWrap: "balance" }}>
            Build a fundable business.
          </h1>
          <p style={{ fontSize: "clamp(15px, 1.7vw, 18px)", color: L.muted, maxWidth: 520, lineHeight: 1.6, margin: "0 auto" }}>
            Scroll to watch a company go from an idea to fundable. That&apos;s the whole job.
          </p>
        </motion.div>

        {/* the building */}
        <div style={{ position: "relative", zIndex: 1, width: "min(58vh, 440px)", height: "min(72vh, 560px)", display: "flex", alignItems: "flex-end", marginTop: "6vh" }}>
          <HeroBuilding builtFloors={built} />
        </div>

        {/* score readout, lower-left */}
        <div style={{ position: "absolute", left: "clamp(24px, 9vw, 150px)", top: "50%", transform: "translateY(-50%)", zIndex: 3 }}>
          <ScoreReadout scoreRef={scoreRef} milestoneRef={milestoneRef} />
        </div>

        {/* stage-C CTA (fades in) */}
        <motion.div style={{ opacity: ctaOpacity, y: ctaY, position: "absolute", bottom: "10vh", left: 0, right: 0, textAlign: "center", padding: "0 24px", zIndex: 4 }}>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(26px, 3.4vw, 40px)", fontWeight: 480, lineHeight: 1.1, letterSpacing: "-0.02em", color: L.ink, margin: "0 auto 18px", maxWidth: 620, textWrap: "balance" }}>
            You&apos;re fundable. Now raise.
          </h2>
          <div style={{ display: "flex", justifyContent: "center" }}><CtaRow center /></div>
        </motion.div>

        {/* scroll hint */}
        <motion.p style={{ opacity: hintOpacity, position: "absolute", bottom: 24, left: 0, right: 0, textAlign: "center", fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: L.muted, zIndex: 2, pointerEvents: "none" }}>
          Scroll to build ↓
        </motion.p>
      </div>
    </section>
  );
}

export function Hero() {
  const reduced = useMotionPrefs();
  const wide = useIsWide();
  if (reduced || !wide) return <StaticHero />;
  return <PinnedHero />;
}
