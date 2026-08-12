"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Single source of truth for the user's motion preference.
 * true → reduce motion: doodles render fully-drawn and static (no idle wobble),
 * canvas/scroll choreography and marquees/auto-rotation stop, reveals collapse to static.
 *
 * The server can never know the OS-level prefers-reduced-motion setting, so it always renders
 * as if reduced=false. Returning framer-motion's live value directly meant a client whose OS
 * actually has reduced-motion on would render `false` on the server and `true` on its very first
 * client render — a real server/client mismatch, not a hypothetical one: it showed up as a
 * hydration error on every Reveal-wrapped section (landing page FAQ accordion included), because
 * Reveal swaps between a motion.div and a plain tag based on this value. Deferring the real
 * preference to an effect keeps the first client render identical to the server's, then applies
 * the actual preference one tick later — same fix shape as any other client-only read (matchMedia,
 * localStorage, window size) that must not diverge from SSR output on mount.
 */
export function useMotionPrefs(): boolean {
  const preference = useReducedMotion() ?? false;
  const [reduced, setReduced] = useState(false);
  useEffect(() => { setReduced(preference); }, [preference]);
  return reduced;
}
