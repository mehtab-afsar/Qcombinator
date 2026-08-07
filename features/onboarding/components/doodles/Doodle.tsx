"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE } from "../../theme";
import { useMotionPrefs } from "@/features/shared/hooks/useMotionPrefs";

/**
 * One stroke of a monoline doodle. Uses framer-motion's `pathLength` (0→1)
 * to "draw" the line on — no manual getTotalLength() measuring needed.
 * Under prefers-reduced-motion it renders fully drawn, no animation.
 */
export function DoodlePath({
  d,
  delay = 0,
  duration = 1,
  stroke,
  strokeWidth,
}: {
  d: string;
  delay?: number;
  duration?: number;
  stroke: string;
  strokeWidth: number;
}) {
  const reduced = useMotionPrefs();
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={reduced ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{
        pathLength: { duration, delay, ease: EASE },
        opacity: { duration: 0.25, delay },
      }}
    />
  );
}

/**
 * Wraps a doodle's strokes with an idle motion once drawn. Two modes:
 * - default: a very slow, subtle rotate + vertical drift, like a sketch settling on paper.
 * - `active`: a faster, larger rotate + scale pulse — used where the doodle stands in for
 *   ongoing work (e.g. a "calculating…" loader) and needs to visibly read as still running,
 *   not idle.
 * Disabled entirely under reduced motion.
 */
export function DoodleStage({ children, drawDuration = 1.1, active = false }: { children: ReactNode; drawDuration?: number; active?: boolean }) {
  const reduced = useMotionPrefs();
  if (reduced) return <>{children}</>;
  return (
    <motion.g
      animate={active
        ? { rotate: [0, -6, 6, -6, 0], scale: [1, 1.06, 1, 1.06, 1] }
        : { rotate: [0, 3.5, 0, -3, 0], y: [0, -5, 0, 3.5, 0] }}
      transition={{ duration: active ? 1.6 : 6, repeat: Infinity, ease: "easeInOut", delay: drawDuration + 0.3 }}
      style={{ transformOrigin: "50% 55%" }}
    >
      {children}
    </motion.g>
  );
}

/** Standard 160×160 doodle frame — every doodle SVG renders inside this. */
export function DoodleFrame({ children, label, active = false }: { children: ReactNode; label: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 160 160" width="100%" height="100%" role="img" aria-label={label} style={{ display: "block", overflow: "visible" }}>
      <DoodleStage active={active}>{children}</DoodleStage>
    </svg>
  );
}
