"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE } from "../../theme";
import { useMotionPrefs } from "../../hooks/useMotionPrefs";

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
 * Wraps a doodle's strokes with a very slow idle "breathing" motion once
 * drawn — a subtle rotate + vertical drift, like a sketch settling on paper.
 * Disabled entirely under reduced motion.
 */
export function DoodleStage({ children, drawDuration = 1.1 }: { children: ReactNode; drawDuration?: number }) {
  const reduced = useMotionPrefs();
  if (reduced) return <>{children}</>;
  return (
    <motion.g
      animate={{ rotate: [0, 1.4, 0, -1.2, 0], y: [0, -2, 0, 1.5, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: drawDuration + 0.3 }}
      style={{ transformOrigin: "50% 55%" }}
    >
      {children}
    </motion.g>
  );
}

/** Standard 160×160 doodle frame — every doodle SVG renders inside this. */
export function DoodleFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 160 160" width="100%" height="100%" role="img" aria-label={label} style={{ display: "block", overflow: "visible" }}>
      <DoodleStage>{children}</DoodleStage>
    </svg>
  );
}
