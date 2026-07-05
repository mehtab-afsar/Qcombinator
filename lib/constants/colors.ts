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

// ─── Landing Page Theme (YC Startup Dark) ─────────────────────────────────────
// Neon accents + dark surfaces. Used exclusively by /app/page.tsx
export const landingTheme = {
  // Dark surfaces
  bg: "#0F0F1A",           // deep navy background
  surface: "#16172B",      // card surface

  // Text on dark
  text: {
    primary: "#FFFFFF",                    // white
    secondary: "rgba(255,255,255,0.70)",   // muted white
    tertiary: "rgba(255,255,255,0.40)",    // faint white
  },

  // Borders
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.15)",

  // Signature neon accents
  green: "#47FF95",       // bright lime (YC-style)
  blue: "#1A6CFF",        // electric blue

  // Button
  ctaBg: "#ECF2C4",        // pale cream
  ctaText: "#0A0A0A",      // dark text

  // Gradients
  gradientAccent: "linear-gradient(135deg, #1A6CFF 0%, #47FF95 100%)",
  gradientSoft: "linear-gradient(135deg, rgba(26,108,255,0.12), rgba(71,255,149,0.12))",

  // Glows
  glowGreen: "0 0 20px rgba(71, 255, 149, 0.25)",
  glowBlue: "0 0 20px rgba(26, 108, 255, 0.25)",

  // Utility
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",

  // Raised surface (cards on cards) + dim ring stroke for the Q-Prism hero
  surfaceRaised: "#1C1E36",
  ringDim: "rgba(255,255,255,0.12)",
}
