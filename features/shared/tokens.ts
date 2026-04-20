/**
 * Shared design tokens — spacing, radius, typography, shadow.
 * Re-exports colors so consumers import a single file for all design values.
 */

export { bg, surf, bdr, ink, muted, blue, green, amber, red } from '@/lib/constants/colors'

// ── Radius ────────────────────────────────────────────────────────────────────
export const radius = {
  sm:   6,
  md:   10,
  lg:   14,
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
  family: "system-ui, -apple-system, sans-serif",
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
