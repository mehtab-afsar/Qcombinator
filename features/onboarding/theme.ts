/**
 * Onboarding design tokens — reuses the canonical app palette + type system.
 * Mirrors the features/landing/theme.ts pattern.
 */
import { bg, surf, bdr, ink, muted, blue, green, amber, red, purple, cyan, alpha } from "@/lib/constants/colors";
import { font, ease } from "@/features/shared/tokens";

export const O = {
  bg, surf, bdr, ink, muted, blue, green, amber, red, purple, cyan, alpha,
  card: "#FFFFFF",
  cream2: "#FBFAF6",
} as const;

// Was declared identically here and in features/landing/theme.ts — now both re-export the one
// definition in features/shared/tokens.ts instead of maintaining two copies.
export const FONT_SERIF = font.family.serif;
export const FONT_MONO = font.family.mono;
export const EASE = ease;

/** Per-flow accent — same shell/components, different personality. */
export const ACCENTS = {
  founder: blue,
  investor: purple,
} as const;
