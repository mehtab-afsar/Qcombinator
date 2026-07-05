"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useInView, useReducedMotion } from "framer-motion";

/**
 * Counts a number up from 0 to `to` when scrolled into view, once.
 * Respects prefers-reduced-motion (jumps straight to the value).
 */
export function CountUp({
  to,
  suffix = "",
  duration = 1400,
  style,
}: {
  to: number;
  suffix?: string;
  duration?: number;
  style?: CSSProperties;
}) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [n, setN] = useState(reduced ? to : 0);

  useEffect(() => {
    if (reduced) { setN(to); return; }
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setN(Math.round(e * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, reduced]);

  return <span ref={ref} style={style}>{n}{suffix}</span>;
}
