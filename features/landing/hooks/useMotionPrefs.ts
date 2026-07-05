"use client";

import { useReducedMotion } from "framer-motion";

/**
 * Single source of truth for motion preferences on the landing page.
 * true → user prefers reduced motion: no canvas, no scroll choreography,
 * reveals collapse to static, marquees/auto-rotation stop.
 */
export function useMotionPrefs(): boolean {
  return useReducedMotion() ?? false;
}
