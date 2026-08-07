"use client";

import { useReducedMotion } from "framer-motion";

/**
 * Single source of truth for the user's motion preference.
 * true → reduce motion: doodles render fully-drawn and static (no idle wobble),
 * canvas/scroll choreography and marquees/auto-rotation stop, reveals collapse to static.
 */
export function useMotionPrefs(): boolean {
  return useReducedMotion() ?? false;
}
