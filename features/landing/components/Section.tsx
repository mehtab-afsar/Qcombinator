"use client";

import { motion } from "framer-motion";
import { useMotionPrefs } from "../hooks/useMotionPrefs";
import type { ReactNode, CSSProperties } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Scroll-reveal wrapper. Under prefers-reduced-motion the reveal collapses
 * to a static render (opacity 1, no transform).
 */
export function Reveal({
  children,
  delay = 0,
  style,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  style?: CSSProperties;
  as?: "div" | "section" | "li" | "figure";
}) {
  const reduced = useMotionPrefs();
  const M = motion[as];
  if (reduced) {
    const Tag = as;
    return <Tag style={style}>{children}</Tag>;
  }
  return (
    <M
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
      style={style}
    >
      {children}
    </M>
  );
}

/** Mono uppercase eyebrow label used at the top of every section. */
export function Eyebrow({ children, color }: { children: ReactNode; color: string }) {
  return (
    <p
      style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: 11,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color,
        margin: "0 0 16px",
      }}
    >
      {children}
    </p>
  );
}
