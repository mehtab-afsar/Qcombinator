"use client";

import { useReducedMotion } from "framer-motion";

/** true → reduce motion: doodles render fully-drawn and static, no idle wobble. */
export function useMotionPrefs(): boolean {
  return useReducedMotion() ?? false;
}
