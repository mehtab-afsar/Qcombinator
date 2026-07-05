/**
 * Landing page design tokens — warm light theme, consistent with the app.
 * Imports the canonical palette and adds a few landing-only surfaces.
 */
import { bg, surf, bdr, ink, muted, blue, green, amber, red, purple, cyan, pink, alpha } from "@/lib/constants/colors";

export const L = {
  bg,          // #F9F7F2 warm cream
  surf,        // #F0EDE6 warm sand
  bdr,         // #E2DDD5 border
  ink,         // #18160F near-black text
  muted,       // #8A867C secondary text
  blue, green, amber, red, purple, cyan, pink,
  alpha,

  card: "#FFFFFF",       // elevated card on cream
  cream2: "#FBFAF6",     // faint alt surface
  skyTop: "#EEF3FA",     // pale sky behind the building
  skyBot: "#F9F7F2",
  brick: "#E9E2D6",      // building body — warm stone
  brickTop: "#F3EEE4",   // roof / top face (lightest)
  brickLeft: "#DED5C6",  // left face (mid)
  brickRight: "#CDC2AE", // right face (dark)
  windowOff: "#B9AE9C",  // unlit window
  windowOn: "#F5B944",   // lit window (warm amber glow)
} as const;

/** Cinematic dusk palette — hero band only; the rest of the page stays light. */
export const DUSK = {
  skyTop: "#141B33",       // deep indigo zenith
  skyMid: "#2A3454",       // slate blue
  skyHorizon: "#C8734B",   // burnt amber at the horizon
  skyGlow: "#F0A05A",      // sun glow core
  haze: "#8A93B8",         // atmospheric haze tint
  towerLight: "#3A4266",   // sun-side glass
  towerDark: "#1C2238",    // shade-side glass
  towerEdge: "#6E7BA8",    // lit edge highlight
  paneOff: "#252D48",      // unlit pane (barely lighter than facade)
  paneOn: "#FFC46B",       // lit pane core
  paneOnHot: "#FFE3B0",    // lit pane highlight
  cityFar: "#39415F",      // far silhouettes (hazier = lighter)
  cityMid: "#242C49",      // mid silhouettes
  cityWin: "#AEB9DF",      // sparse cool windows in the city
  ground: "#12172B",       // plaza silhouette
  lamp: "#FFB35C",         // street lamp glow
  text: "#F5EFE4",         // warm white type over the scene
  textDim: "rgba(245,239,228,0.66)",
  textFaint: "rgba(245,239,228,0.42)",
} as const;

export const FONT_SERIF = "var(--font-fraunces), Georgia, serif";
export const FONT_MONO = "var(--font-mono), 'SF Mono', monospace";
export const EASE = [0.22, 1, 0.36, 1] as const;
