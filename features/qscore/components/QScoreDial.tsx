"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { red, amber, green } from "@/lib/constants/colors";

const clamp = (v: number) => Math.min(100, Math.max(0, v));

/** Same low/medium/high bands the dashboard's gradeLabel() uses — Early Stage / Developing vs Good / Strong. */
function bandColor(score: number): string {
  if (score < 50) return red;
  if (score < 70) return amber;
  return green;
}

/**
 * Living Q-Score dial — a single ring that fills to the real overall score
 * (0–100%), colored by band (low/medium/high), with the score counting up
 * in the centre. Reusable across dashboard, portfolio, and investor deep-dive.
 */
export function QScoreDial({
  score,
  size = 128,
  dark = false,
  centerLabel = "Q-Score",
}: {
  score: number;
  size?: number;
  dark?: boolean;
  centerLabel?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [n, setN] = useState(reduced ? score : 0);

  useEffect(() => {
    if (reduced) { setN(score); return; }
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1200;
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setN(Math.round(e * score));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, score, reduced]);

  const R = 52, CX = 60, CY = 60, STROKE = 9;
  const circumference = 2 * Math.PI * R;
  const pct = clamp(score) / 100;
  const track = dark ? "rgba(255,255,255,0.12)" : "#E2DDD5";
  const fill = bandColor(score);
  const primaryText = dark ? "#F9F7F2" : "#18160F";
  const subText = dark ? "rgba(249,247,242,0.5)" : "#8A867C";

  return (
    <div ref={ref} style={{ position: "relative", width: size, height: size }}>
      <svg viewBox="0 0 120 120" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={track} strokeWidth={STROKE} />
        <motion.circle
          cx={CX} cy={CY} r={R} fill="none" stroke={fill} strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: (inView || reduced) ? circumference * (1 - pct) : circumference }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.15 }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.3, fontWeight: 600, color: primaryText, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{n}</span>
        <span style={{ fontSize: size * 0.078, color: subText, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.12em" }}>{centerLabel}</span>
      </div>
    </div>
  );
}
