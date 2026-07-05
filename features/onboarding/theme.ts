/**
 * Onboarding design tokens — reuses the canonical app palette + type system.
 * Mirrors the features/landing/theme.ts pattern.
 */
import { bg, surf, bdr, ink, muted, blue, green, amber, red, purple, cyan, alpha } from "@/lib/constants/colors";

export const O = {
  bg, surf, bdr, ink, muted, blue, green, amber, red, purple, cyan, alpha,
  card: "#FFFFFF",
  cream2: "#FBFAF6",
} as const;

export const FONT_SERIF = "var(--font-fraunces), Georgia, serif";
export const FONT_MONO = "var(--font-mono), 'SF Mono', monospace";
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Per-flow accent — same shell/components, different personality. */
export const ACCENTS = {
  founder: blue,
  investor: purple,
} as const;
