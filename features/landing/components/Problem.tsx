"use client";

import { motion } from "framer-motion";
import { L, FONT_SERIF, FONT_MONO } from "../theme";
import { PROBLEMS } from "../copy";
import { Reveal, Eyebrow } from "./Section";
import { CountUp } from "./CountUp";
import { useMotionPrefs } from "../hooks/useMotionPrefs";
import { TargetDoodle } from "@/features/onboarding/components/doodles/TargetDoodle";
import { CompassDoodle } from "@/features/onboarding/components/doodles/CompassDoodle";
import { ScoutDoodle } from "@/features/onboarding/components/doodles/ScoutDoodle";

const EASE = [0.22, 1, 0.36, 1] as const;

// One hand-drawn doodle per problem stat (by index) — matches the app's doodle style.
// Target = pitching blind, Compass = wasted/lost time, Scout = searching for signal.
const PROBLEM_DOODLES = [TargetDoodle, CompassDoodle, ScoutDoodle];

export function Problem() {
  const reduced = useMotionPrefs();

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
        {PROBLEMS.map((p, i) => {
          const m = p.stat.match(/^(\d+)(.*)$/);
          const to = m ? Number(m[1]) : 0;
          const suffix = m ? m[2] : p.stat;
          const Doodle = PROBLEM_DOODLES[i] ?? TargetDoodle;
          return (
            <motion.div
              key={p.stat}
              initial={reduced ? undefined : { opacity: 0, y: 30 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-70px" }}
              transition={{ duration: 0.6, ease: EASE, delay: i * 0.12 }}
              whileHover={reduced ? undefined : { y: -4 }}
              style={{ background: L.card, border: `1px solid ${L.bdr}`, borderRadius: 16, padding: "30px 28px", height: "100%", position: "relative", overflow: "hidden" }}
            >
              {/* large hand-drawn doodle — bleeds off the top-right corner (card clips overflow) */}
              <motion.div
                aria-hidden="true"
                initial={reduced ? undefined : { opacity: 0, scale: 0.9, rotate: -6 }}
                whileInView={reduced ? undefined : { opacity: 0.9, scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: EASE, delay: i * 0.12 + 0.15 }}
                style={{ position: "absolute", top: -14, right: -10, width: 132, height: 132, pointerEvents: "none" }}
              >
                <Doodle color={L.alpha(L.red, 0.5)} />
              </motion.div>
              <p style={{ fontFamily: FONT_MONO, fontSize: 42, fontWeight: 700, color: L.red, margin: "0 0 10px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                <CountUp to={to} suffix={suffix} />
              </p>
              <p style={{ fontSize: 15.5, fontWeight: 600, color: L.ink, margin: "0 0 10px", lineHeight: 1.45 }}>{p.label}</p>
              <p style={{ fontSize: 14, color: L.muted, lineHeight: 1.65, margin: 0 }}>{p.body}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
