"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import { L, DUSK, FONT_SERIF, FONT_MONO } from "../theme";
import { FLOORS, HERO_SCORE } from "../copy";
import { useMotionPrefs } from "../hooks/useMotionPrefs";
import { useIsWide } from "../hooks/useIsWide";
import { HeroBuilding } from "./building/HeroBuilding";
import { CityBackdrop } from "./building/CityBackdrop";
import { Crane } from "./building/Crane";
import { GodRays } from "./building/GodRays";

/** Tiny drifting birds — far layer life. Hidden under reduced motion via CSS. */
function Birds() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {[{ top: "18%", delay: "0s", scale: 1 }, { top: "12%", delay: "7s", scale: 0.7 }, { top: "24%", delay: "13s", scale: 0.85 }].map((b, i) => (
        <svg key={i} className="lp-bird" viewBox="0 0 14 6" width={14 * b.scale} height={6 * b.scale}
          style={{ position: "absolute", top: b.top, left: "-8%", animationDelay: b.delay }}>
          <path d="M1 4 Q4 0.5 7 4 Q10 0.5 13 4" fill="none" stroke="rgba(12,16,32,0.75)" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      ))}
    </div>
  );
}

function CtaRow({ center = false, variant = "dusk" }: { center?: boolean; variant?: "dusk" | "light" }) {
  const dusk = variant === "dusk";
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: center ? "center" : "flex-start" }}>
      <Link href="/founder/onboarding" className="lp-cta" style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: dusk ? DUSK.text : L.ink, color: dusk ? "#141B33" : L.bg,
        padding: "13px 26px", borderRadius: 999, fontSize: 15, fontWeight: 600, textDecoration: "none",
      }}>
        Get your Q-Score <ArrowRight size={16} aria-hidden="true" />
      </Link>
      <Link href="/login" className="lp-cta" style={{
        display: "inline-flex", alignItems: "center",
        background: dusk ? "rgba(245,239,228,0.06)" : L.card,
        color: dusk ? DUSK.text : L.ink,
        padding: "13px 22px", borderRadius: 999,
        border: `1px solid ${dusk ? "rgba(245,239,228,0.3)" : L.bdr}`,
        fontSize: 15, fontWeight: 500, textDecoration: "none",
        backdropFilter: dusk ? "blur(4px)" : undefined,
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
        <span ref={scoreRef} style={{ fontFamily: FONT_MONO, fontSize: "clamp(40px, 6vw, 68px)", fontWeight: 700, color: DUSK.text, lineHeight: 1, fontVariantNumeric: "tabular-nums", textShadow: "0 2px 24px rgba(0,0,0,0.4)" }}>0</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 20, color: DUSK.textFaint, fontWeight: 500 }}>/100</span>
      </div>
      <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.22em", color: DUSK.skyGlow, textTransform: "uppercase", marginTop: 7 }}>Q-Score</span>
      <span ref={milestoneRef} style={{ display: "block", fontSize: 13, color: DUSK.textDim, marginTop: 6, minHeight: 18 }} aria-live="polite" />
    </div>
  );
}

/** Full-bleed dusk sky: gradient, stars, horizon glow, blurred cloud bands. */
function DuskSky({ twinkle = true }: { twinkle?: boolean }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden", background: `linear-gradient(180deg, ${DUSK.skyTop} 0%, ${DUSK.skyMid} 46%, #4A4468 68%, ${DUSK.skyHorizon} 88%, #E08B52 100%)` }}>
      {/* stars in the upper third */}
      {[[6, 8], [14, 18], [23, 6], [31, 13], [39, 22], [47, 9], [55, 16], [63, 5], [71, 12], [79, 19], [87, 8], [93, 15], [10, 27], [43, 30], [68, 26], [84, 29], [27, 24], [58, 31]].map(([x, y], i) => (
        <span key={i} className={twinkle ? "lp-star" : undefined} style={{
          position: "absolute", left: `${x}%`, top: `${y}%`,
          width: i % 3 === 0 ? 2 : 1.4, height: i % 3 === 0 ? 2 : 1.4, borderRadius: 99,
          background: "#DDE4F7", opacity: 0.5 + (i % 4) * 0.11,
          animationDelay: `${(i * 0.7) % 4}s`,
        }} />
      ))}
      {/* horizon sun glow */}
      <div style={{ position: "absolute", left: "50%", bottom: "-6%", transform: "translateX(-50%)", width: "80%", height: "34%", background: `radial-gradient(50% 100% at 50% 100%, ${L.alpha(DUSK.skyGlow, 0.5)}, transparent 70%)` }} />
      {/* blurred cloud bands catching the light */}
      <div style={{ position: "absolute", left: "-5%", right: "30%", top: "38%", height: 26, background: "rgba(214,150,110,0.20)", borderRadius: 99, filter: "blur(16px)" }} />
      <div style={{ position: "absolute", left: "36%", right: "-8%", top: "48%", height: 20, background: "rgba(214,150,110,0.16)", borderRadius: 99, filter: "blur(14px)" }} />
      <div style={{ position: "absolute", left: "12%", right: "44%", top: "28%", height: 16, background: "rgba(150,158,200,0.16)", borderRadius: 99, filter: "blur(14px)" }} />
    </div>
  );
}

/** Film grain + vignette over the dusk scene (kept fully dark — the curtain
 *  handles the transition to the light page). */
function CinematicFinish() {
  return (
    <>
      <svg aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.05, pointerEvents: "none", zIndex: 5, mixBlendMode: "overlay" }}>
        <filter id="lp-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /></filter>
        <rect width="100%" height="100%" filter="url(#lp-grain)" />
      </svg>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5, boxShadow: "inset 0 0 180px rgba(6,9,20,0.55)" }} />
    </>
  );
}

/** Compact static hero for mobile / reduced-motion — the finished city at dusk. */
function StaticHero() {
  const reduced = useMotionPrefs();
  return (
    <section style={{ position: "relative", padding: "110px 24px 0", overflow: "hidden" }} aria-label="Edge Alpha — build a fundable business">
      <DuskSky twinkle={!reduced} />
      <div style={{ position: "relative", maxWidth: 560, margin: "0 auto", textAlign: "center", zIndex: 2 }}>
        <p style={{ fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: "0.18em", textTransform: "uppercase", color: DUSK.skyGlow, margin: "0 0 16px" }}>
          The startup OS with a score
        </p>
        <h1 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(38px, 10vw, 56px)", fontWeight: 480, lineHeight: 1.05, letterSpacing: "-0.02em", color: DUSK.text, margin: "0 0 16px", textWrap: "balance", textShadow: "0 2px 30px rgba(0,0,0,0.45)" }}>
          Build a fundable business. Then raise.
        </h1>
        <p style={{ fontSize: 16.5, color: DUSK.textDim, lineHeight: 1.6, margin: "0 auto 30px", maxWidth: 460 }}>
          Edge Alpha scores your startup across the six dimensions investors actually price —
          then nine AI advisers help you move the number.
        </p>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><CtaRow center /></div>
      </div>
      <div style={{ position: "relative", width: "min(84vw, 380px)", margin: "20px auto 0", zIndex: 1 }}>
        <div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, width: "175%", left: "-37.5%", pointerEvents: "none" }}>
          <CityBackdrop row="back" />
        </div>
        <div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, width: "175%", left: "-37.5%", pointerEvents: "none" }}>
          <CityBackdrop row="mid" />
        </div>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <GodRays builtFloors={6} animate={false} />
        </div>
        <HeroBuilding builtFloors={6} />
      </div>
      <div style={{ position: "relative", textAlign: "center", margin: "8px 0 0", paddingBottom: 110, zIndex: 2 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 40, fontWeight: 700, color: DUSK.text, fontVariantNumeric: "tabular-nums" }}>{HERO_SCORE}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 16, color: DUSK.textFaint }}>/100</span>
        <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.2em", color: DUSK.skyGlow, textTransform: "uppercase", marginTop: 4 }}>Fundable</span>
      </div>
      <CinematicFinish />
      {/* clean handoff to the light page (mobile only — desktop uses the curtain) */}
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120, pointerEvents: "none", zIndex: 6, background: `linear-gradient(180deg, transparent, ${L.bg})` }} />
    </section>
  );
}

/** Desktop scroll-pinned hero: the dusk city, your tower rising through it. */
function PinnedHero() {
  const ref = useRef<HTMLElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const milestoneRef = useRef<HTMLSpanElement>(null);
  const [built, setBuilt] = useState(0);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // build completes at 0.70, tower shines 0.70→0.80, curtain covers 0.80→0.90,
  // curtain turns light 0.92→0.99 → seamless handoff into the light page
  const builtMv = useTransform(scrollYProgress, [0.10, 0.70], [0, 6]);
  const scoreMv = useTransform(scrollYProgress, [0.10, 0.70], [0, HERO_SCORE]);

  const introOpacity = useTransform(scrollYProgress, [0, 0.1, 0.58, 0.68], [1, 1, 1, 0]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  // ── curtain reveal ─────────────────────────────────────────────────────────
  const curtainY = useTransform(scrollYProgress, [0.80, 0.90], ["102%", "0%"]);
  const curtainBg = useTransform(scrollYProgress, [0.92, 0.99], ["#141B33", "#F9F7F2"]);
  const darkCtaOpacity = useTransform(scrollYProgress, [0.92, 0.98], [1, 0]);
  const lightCtaOpacity = useTransform(scrollYProgress, [0.92, 0.98], [0, 1]);
  const curtainContentY = useTransform(scrollYProgress, [0.82, 0.92], [40, 0]);
  const [lightActive, setLightActive] = useState(false);
  useMotionValueEvent(scrollYProgress, "change", (v) => setLightActive(v > 0.95));

  // ── 2.5D parallax: cursor tilt + depth layers ──────────────────────────────
  const SPRING = { stiffness: 70, damping: 16, mass: 0.4 };
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sceneRotX = useSpring(useTransform(my, [-0.5, 0.5], [5, -5]), SPRING);
  const sceneRotY = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), SPRING);
  const skyX = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]), SPRING);
  const cloudX = useSpring(useTransform(mx, [-0.5, 0.5], [-14, 14]), SPRING);
  const midX = useSpring(useTransform(mx, [-0.5, 0.5], [-19, 19]), SPRING);
  const buildX = useSpring(useTransform(mx, [-0.5, 0.5], [-26, 26]), SPRING);
  const cloudDrift = useTransform(scrollYProgress, [0, 1], [0, -70]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

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
      <div
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", perspective: 1200 }}
      >
        <DuskSky />

        {/* headline / stage-A copy (fades out) */}
        <motion.div style={{ opacity: introOpacity, position: "absolute", top: "10vh", left: 0, right: 0, textAlign: "center", padding: "0 24px", zIndex: 3, pointerEvents: "none" }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: DUSK.skyGlow, margin: "0 0 16px" }}>
            The startup OS with a score
          </p>
          <h1 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(40px, 5.5vw, 68px)", fontWeight: 480, lineHeight: 1.04, letterSpacing: "-0.02em", color: DUSK.text, margin: "0 auto 14px", maxWidth: 760, textWrap: "balance", textShadow: "0 2px 40px rgba(0,0,0,0.5)" }}>
            Build a fundable business.
          </h1>
          <p style={{ fontSize: "clamp(15px, 1.7vw, 18px)", color: DUSK.textDim, maxWidth: 520, lineHeight: 1.6, margin: "0 auto" }}>
            Scroll to watch a company go from an idea to fundable. That&apos;s the whole job.
          </p>
        </motion.div>

        {/* parallax depth scene */}
        <motion.div
          style={{
            position: "relative", zIndex: 1, marginTop: "7vh",
            transformStyle: "preserve-3d",
            rotateX: sceneRotX, rotateY: sceneRotY,
          }}
        >
          <div style={{ position: "relative", width: "min(58vh, 440px)", height: "min(72vh, 560px)", transformStyle: "preserve-3d" }}>
            {/* farthest — hazy horizon skyline + birds */}
            <motion.div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, width: "175%", left: "-37.5%", x: skyX, z: -220, pointerEvents: "none" }}>
              <CityBackdrop row="back" />
              <Birds />
            </motion.div>

            {/* drifting dusk clouds */}
            <motion.div aria-hidden="true" style={{ position: "absolute", inset: "-40% -60%", x: cloudX, y: cloudDrift, z: -160, pointerEvents: "none" }}>
              <div style={{ position: "absolute", top: "12%", left: "16%", width: 170, height: 42, borderRadius: 99, background: "rgba(150,158,200,0.13)", filter: "blur(18px)" }} />
              <div style={{ position: "absolute", top: "26%", right: "18%", width: 220, height: 48, borderRadius: 99, background: "rgba(214,150,110,0.14)", filter: "blur(22px)" }} />
            </motion.div>

            {/* mid — dim neighbor towers */}
            <motion.div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, width: "175%", left: "-37.5%", x: midX, z: -90, pointerEvents: "none" }}>
              <CityBackdrop row="mid" />
            </motion.div>

            {/* hero layer — sun-break behind, tower, crane silhouette in front */}
            <motion.div style={{ position: "absolute", inset: 0, x: buildX, z: 0, display: "flex", alignItems: "flex-end" }}>
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <GodRays builtFloors={built} />
              </div>
              <HeroBuilding builtFloors={built} />
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <Crane builtFloors={built} />
              </div>
            </motion.div>

          </div>
        </motion.div>

        {/* score readout, lower-left */}
        <div style={{ position: "absolute", left: "clamp(24px, 9vw, 150px)", top: "50%", transform: "translateY(-50%)", zIndex: 3 }}>
          <ScoreReadout scoreRef={scoreRef} milestoneRef={milestoneRef} />
        </div>

        {/* scroll hint */}
        <motion.p style={{ opacity: hintOpacity, position: "absolute", bottom: 24, left: 0, right: 0, textAlign: "center", fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: DUSK.textFaint, zIndex: 4, pointerEvents: "none" }}>
          Scroll to build ↓
        </motion.p>

        <CinematicFinish />

        {/* curtain reveal: slides up over the finished scene, then turns light */}
        <motion.div
          style={{
            position: "absolute", inset: 0, y: curtainY, backgroundColor: curtainBg,
            zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center",
            willChange: "transform, background-color",
          }}
        >
          <motion.div style={{ y: curtainContentY, position: "relative", textAlign: "center", padding: "0 24px", width: "100%" }}>
            {/* dark version */}
            <motion.div style={{ opacity: darkCtaOpacity, pointerEvents: lightActive ? "none" : "auto" }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: DUSK.skyGlow, margin: "0 0 18px" }}>The startup OS with a score</p>
              <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(32px, 4.6vw, 56px)", fontWeight: 480, lineHeight: 1.06, letterSpacing: "-0.02em", color: DUSK.text, margin: "0 auto 16px", maxWidth: 680, textWrap: "balance" }}>
                Now build yours.
              </h2>
              <p style={{ fontSize: 16.5, color: DUSK.textDim, maxWidth: 520, lineHeight: 1.6, margin: "0 auto 30px" }}>
                Get your Q-Score, move it up with nine AI advisers, and raise when you hit 70.
              </p>
              <div style={{ display: "flex", justifyContent: "center" }}><CtaRow center variant="dusk" /></div>
            </motion.div>
            {/* light version — crossfades in as the curtain turns cream */}
            <motion.div aria-hidden={!lightActive} style={{ opacity: lightCtaOpacity, position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: lightActive ? "auto" : "none" }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: L.green, margin: "0 0 18px" }}>The startup OS with a score</p>
              <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(32px, 4.6vw, 56px)", fontWeight: 480, lineHeight: 1.06, letterSpacing: "-0.02em", color: L.ink, margin: "0 auto 16px", maxWidth: 680, textWrap: "balance" }}>
                Now build yours.
              </h2>
              <p style={{ fontSize: 16.5, color: L.muted, maxWidth: 520, lineHeight: 1.6, margin: "0 auto 30px" }}>
                Get your Q-Score, move it up with nine AI advisers, and raise when you hit 70.
              </p>
              <div style={{ display: "flex", justifyContent: "center" }}><CtaRow center variant="light" /></div>
            </motion.div>
          </motion.div>
        </motion.div>
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
