/**
 * Design token — canonical app-wide color palette.
 * Single source of truth. Import from here in all pages and components.
 * Do NOT redefine these locally in page files.
 */

// ─── Base palette ─────────────────────────────────────────────────────────────
export const bg    = "#F9F7F2"  // warm cream — page background
export const surf  = "#F0EDE6"  // warm sand — card / surface
export const bdr   = "#E2DDD5"  // border
export const ink   = "#18160F"  // primary text
export const muted = "#8A867C"  // secondary / meta text
export const blue  = "#2563EB"  // primary accent
export const green = "#16A34A"  // success
export const amber = "#D97706"  // warning
export const red   = "#DC2626"  // error / danger

// ─── Extended palette ─────────────────────────────────────────────────────────
export const purple = "#7C3AED"  // investor pipeline in_dd, premium badges
export const cyan   = "#0891B2"  // photo/upload accents, startup_share notifications
export const pink   = "#EC4899"  // investor onboarding accents
export const indigo = "#4F46E5"  // secondary accent variant

// ─── Opacity helper ───────────────────────────────────────────────────────────
// Appends a 2-digit hex alpha to any 6-char hex color.
// alpha(blue, 0.12) → "#2563EB1F"
export function alpha(hex: string, opacity: number): string {
  return hex + Math.round(opacity * 255).toString(16).padStart(2, "0")
}
