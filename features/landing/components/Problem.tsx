"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, useScroll, useTransform, useSpring } from "framer-motion";
import { L, DUSK, FONT_SERIF, FONT_MONO } from "../theme";
import { PROBLEMS, FLOORS } from "../copy";
import { Reveal, Eyebrow } from "./Section";
import { CountUp } from "./CountUp";
import { HeroBuilding } from "./building/HeroBuilding";
import { Crane } from "./building/Crane";

// The Hero already told this story once — a tower rising floor by floor as the Q-Score climbs
// to Fundable. This is the same tower, same component, just caught mid-construction: most
// first-time founders pitch while still stuck around "First customers" (FLOORS[1]), nowhere
// near Fundable (FLOORS[4]). Reusing the real building instead of a new illustration is the
// point — this IS the company the Hero was building, just pitched too soon.
const STALLED_AT = 1.4;
const RISE_MS = 1400;
const HOLD_MS = 1000;
const BREAK_MS = 650;
const CYCLE_MS = RISE_MS + HOLD_MS + BREAK_MS;

const STARS = [
  { x: 12, y: 14 }, { x: 28, y: 8 }, { x: 44, y: 20 }, { x: 62, y: 10 },
  { x: 78, y: 22 }, { x: 88, y: 12 }, { x: 20, y: 32 }, { x: 70, y: 34 },
];

/** Loops while it's in view: builds, holds a beat stuck at the same stalled floor (crane
 *  breathing, idle), then breaks — falls back down — and builds again. Never reaches the top;
 *  every attempt ends the same way, which is the actual point being made, not just a decoration. */
function StalledTower() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-80px" });
  const reduced = useReducedMotion() ?? false;
  const [built, setBuilt] = useState(reduced ? STALLED_AT : 0);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    if (reduced || !inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) % CYCLE_MS;
      let value: number;
      let isHolding = false;
      if (elapsed < RISE_MS) {
        const t = elapsed / RISE_MS;
        value = (1 - Math.pow(1 - t, 3)) * STALLED_AT; // build — ease out
      } else if (elapsed < RISE_MS + HOLD_MS) {
        value = STALLED_AT; // stuck
        isHolding = true;
      } else {
        const t = (elapsed - RISE_MS - HOLD_MS) / BREAK_MS;
        value = STALLED_AT * (1 - t * t); // break — falls back down, ease in
      }
      setBuilt(value);
      setHolding(isHolding);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced]);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", maxWidth: 190, aspectRatio: "400 / 470" }}>
      <HeroBuilding builtFloors={built} />
      <motion.div
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        animate={holding && !reduced ? { opacity: [1, 0.65, 1] } : { opacity: 1 }}
        transition={holding && !reduced ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
      >
        <Crane builtFloors={built} />
      </motion.div>
    </div>
  );
}

/** Sits at its normal size until you scroll it into view, then pushes in slightly as you scroll
 *  through it — a camera push-in, not a fixed illustration. Settles at the bigger size and stays
 *  there (useTransform clamps past the mapped range) rather than shrinking back down. */
function ZoomOnScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const rawScale = useTransform(scrollYProgress, [0.1, 0.55], [1, 1.08]);
  const scale = useSpring(rawScale, { stiffness: 100, damping: 24, mass: 0.4 });

  return (
    <motion.div ref={ref} style={{ scale: reduced ? 1 : scale, transformOrigin: "center center" }}>
      {children}
    </motion.div>
  );
}

export function Problem() {
  const stalledFloor = FLOORS[Math.min(Math.floor(STALLED_AT), FLOORS.length - 1)];

  return (
    <section style={{ padding: "100px 24px", maxWidth: 1180, margin: "0 auto" }}>
      <Reveal>
        <Eyebrow color={L.red}>The problem</Eyebrow>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 480, lineHeight: 1.12, letterSpacing: "-0.02em", color: L.ink, margin: "0 0 14px", maxWidth: 640, textWrap: "balance" }}>
          Most founders raise blind.
        </h2>
        <p style={{ fontSize: 17, color: L.muted, maxWidth: 560, lineHeight: 1.65, margin: "0 0 50px" }}>
          Fundraising has a feedback problem: you find out you weren&apos;t ready only after
          the meetings stop getting booked.
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <ZoomOnScroll>
          <div className="problem-tower" style={{ display: "grid", gridTemplateColumns: "minmax(240px, 340px) 1fr", border: `1px solid ${L.bdr}`, borderRadius: 20, overflow: "hidden" }}>
          {/* left — the same tower from the Hero, stalled */}
          <div
            aria-hidden="true"
            style={{
              position: "relative", padding: "32px 24px 24px",
              background: `linear-gradient(175deg, ${DUSK.skyTop} 0%, ${DUSK.skyMid} 100%)`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
              overflow: "hidden", minHeight: 300,
            }}
          >
            {STARS.map((s, i) => (
              <span key={i} style={{ position: "absolute", left: `${s.x}%`, top: `${s.y}%`, width: 1.6, height: 1.6, borderRadius: 99, background: DUSK.text, opacity: 0.5 }} />
            ))}
            <StalledTower />
            <div style={{ position: "relative", textAlign: "center", marginTop: 8 }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: DUSK.skyGlow }}>
                Stalled at
              </span>
              <p style={{ fontFamily: FONT_SERIF, fontSize: 17, color: DUSK.text, margin: "3px 0 0" }}>
                {stalledFloor.label}
              </p>
            </div>
          </div>

          {/* right — the real numbers */}
          <div style={{ padding: "34px 36px", background: L.card, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
            {PROBLEMS.map((p) => {
              const m = p.stat.match(/^(\d+)(.*)$/);
              const to = m ? Number(m[1]) : 0;
              const suffix = m ? m[2] : p.stat;
              return (
                <div key={p.stat} style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 27, fontWeight: 700, color: L.red, minWidth: 76, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                    <CountUp to={to} suffix={suffix} />
                  </span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: L.ink, margin: "0 0 4px", lineHeight: 1.4 }}>{p.label}</p>
                    <p style={{ fontSize: 13, color: L.muted, margin: 0, lineHeight: 1.6 }}>{p.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </ZoomOnScroll>
      </Reveal>

      <style>{`
        @media (max-width: 760px) {
          .problem-tower { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
