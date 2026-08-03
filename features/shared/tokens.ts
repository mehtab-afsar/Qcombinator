/**
 * Shared design tokens — spacing, radius, typography, shadow.
 * Re-exports colors so consumers import a single file for all design values.
 */

export { bg, surf, bdr, ink, muted, blue, green, amber, red, purple, cyan, pink, indigo, alpha } from '@/lib/constants/colors'

// ── Radius ────────────────────────────────────────────────────────────────────
// lg corrected 14 → 12: two independent, unrelated hand-rolled cards
// (app/founder/dashboard's highlight card, app/founder/executive's quote card) both landed on 12
// on their own — the one value that recurs across files that never saw each other's code. 14 had
// no corroborating usage anywhere outside SectionCard itself.
export const radius = {
  sm:   6,
  md:   10,
  lg:   12,
  xl:   20,
  full: 9999,
} as const

// ── Spacing scale (px) ────────────────────────────────────────────────────────
export const space = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
} as const

// ── Typography ────────────────────────────────────────────────────────────────
export const font = {
  family: {
    sans:  "system-ui, -apple-system, sans-serif",
    // Previously declared identically in TWO places (features/landing/theme.ts,
    // features/onboarding/theme.ts) instead of once — both now re-export this rather than
    // redeclaring it. Needs the Fraunces variable to actually be loaded (app/layout.tsx).
    serif: "var(--font-fraunces), Georgia, serif",
    mono:  "var(--font-mono), 'SF Mono', monospace",
  },
  size: {
    xs:   10,
    sm:   11,
    base: 13,
    md:   14,
    lg:   16,
    xl:   18,
    '2xl': 22,
    '3xl': 28,
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  letterSpacing: {
    label: '0.06em',  // ALL CAPS labels
    tight: '-0.02em', // large headings
  },
} as const

// ── Shadows ───────────────────────────────────────────────────────────────────
export const shadow = {
  sm:  '0 1px 3px rgba(0,0,0,0.06)',
  md:  '0 4px 12px rgba(0,0,0,0.08)',
  lg:  '0 8px 24px rgba(0,0,0,0.10)',
  xl:  '0 16px 48px rgba(0,0,0,0.12)',
} as const

// ── Animation durations ───────────────────────────────────────────────────────
export const duration = {
  fast:   '0.12s',
  normal: '0.2s',
  slow:   '0.35s',
} as const

/** The one easing curve this app deliberately sets — was duplicated in landing/onboarding theme
 *  files identically; most of the app leaves easing at the framer-motion default instead, so this
 *  isn't applied everywhere, just no longer redeclared where it already was. */
export const ease = [0.22, 1, 0.36, 1] as const

// ── Button size scale ─────────────────────────────────────────────────────────
// radius corrected to full (pill) across every size, not the previous 6/8/10 split.
// Pill is already the dominant shape for every OTHER interactive control in this app today —
// status chips, tags, filter pills all use 999 — so a pill Button unifies with what's already
// dominant, rather than adding a fourth shape next to Card's radius.lg (12). The rectangular
// 8px buttons found in ActionsPanel/ConnectorsPanel/RhythmPanel were the outliers, not the norm.
export const btn = {
  xs: { padding: '3px 9px',   fontSize: 11, borderRadius: radius.full },
  sm: { padding: '6px 12px',  fontSize: 12, borderRadius: radius.full },
  md: { padding: '10px 16px', fontSize: 13, borderRadius: radius.full },
  lg: { padding: '12px 24px', fontSize: 13, borderRadius: radius.full },
} as const

// ── Page layout ───────────────────────────────────────────────────────────────
export const page = {
  paddingX:      40,
  paddingY:      32,
  paddingBottom: 72,
} as const
