"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export interface DialSegment {
  value: number; // 0–100
  color: string;
  label?: string;
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const [x0, y0] = polar(cx, cy, r, start);
  const [x1, y1] = polar(cx, cy, r, end);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

const clamp = (v: number) => Math.min(100, Math.max(0, v));

/**
 * Living Q-Score dial — six dimension segments fill to their real scores and
 * draw in on view, with the overall score counting up in the centre.
 * Reusable across dashboard, portfolio, and investor deep-dive.
 */
export function QScoreDial({
  score,
  segments,
  size = 128,
  dark = false,
  centerLabel = "Q-Score",
}: {
  score: number;
  segments: DialSegment[];
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

  const R = 52, CX = 60, CY = 60, GAP = 8, SLOT = 60;
  const track = dark ? "rgba(255,255,255,0.12)" : "#E2DDD5";
  const primaryText = dark ? "#F9F7F2" : "#18160F";
  const subText = dark ? "rgba(249,247,242,0.5)" : "#8A867C";

  return (
    <div ref={ref} style={{ position: "relative", width: size, height: size }}>
      <svg viewBox="0 0 120 120" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {segments.slice(0, 6).map((s, i) => {
          const slotStart = i * SLOT + GAP / 2;
          const slotEnd = (i + 1) * SLOT - GAP / 2;
          const filledEnd = slotStart + (clamp(s.value) / 100) * (slotEnd - slotStart) || slotStart + 0.1;
          return (
            <g key={i}>
              <path d={arcPath(CX, CY, R, slotStart, slotEnd)} fill="none" stroke={track} strokeWidth={7} strokeLinecap="round" />
              <motion.path
                d={arcPath(CX, CY, R, slotStart, Math.max(filledEnd, slotStart + 0.5))}
                fill="none" stroke={s.color} strokeWidth={7} strokeLinecap="round"
                initial={reduced ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                animate={inView || reduced ? { pathLength: 1, opacity: 1 } : {}}
                transition={{ duration: 0.85, delay: 0.15 + i * 0.11, ease: "easeOut" }}
              />
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.3, fontWeight: 600, color: primaryText, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{n}</span>
        <span style={{ fontSize: size * 0.078, color: subText, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.12em" }}>{centerLabel}</span>
      </div>
    </div>
  );
}
