"use client";

import { DUSK } from "../../theme";
import { FLOOR_COUNT } from "./geometry";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The "fundable" moment at dusk: the horizon glow surges behind the finished
 * tower — a soft lens-bloom disc, a warm gradient wall of light, and faint
 * wide beams. Photographic, not cartoon rays.
 */
export function GodRays({ builtFloors, animate = true }: { builtFloors: number; animate?: boolean }) {
  const reveal = clamp01((builtFloors - (FLOOR_COUNT - 0.9)) / 0.9);
  if (reveal <= 0.01) return null;

  const cx = 200, cy = 190;

  return (
    <svg viewBox="0 0 400 470" aria-hidden="true" style={{ width: "100%", height: "100%", display: "block", overflow: "visible", opacity: reveal }}>
      <defs>
        <radialGradient id="sb-bloom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={DUSK.skyGlow} stopOpacity="0.55" />
          <stop offset="38%" stopColor={DUSK.skyGlow} stopOpacity="0.22" />
          <stop offset="100%" stopColor={DUSK.skyGlow} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sb-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF3DC" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFF3DC" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sb-beam" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={DUSK.skyGlow} stopOpacity="0.16" />
          <stop offset="100%" stopColor={DUSK.skyGlow} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* wide horizon bloom behind the tower */}
      <ellipse cx={cx} cy={cy + 60} rx={220} ry={150} fill="url(#sb-bloom)" />
      {/* bright core just behind the crown */}
      <circle cx={cx} cy={cy - 46} r={54} fill="url(#sb-core)" className={animate ? "lp-sunbreak" : undefined} />
      {/* two faint wide light shafts */}
      <polygon points={`${cx},${cy - 40} ${cx - 130},${cy - 300} ${cx - 58},${cy - 300}`} fill="url(#sb-beam)" />
      <polygon points={`${cx},${cy - 40} ${cx + 64},${cy - 300} ${cx + 138},${cy - 300}`} fill="url(#sb-beam)" />
      {/* lens streak */}
      <rect x={cx - 120} y={cy - 48} width={240} height={1.6} fill="#FFF3DC" opacity={0.4} rx={1} />
      <rect x={cx - 60} y={cy - 48.5} width={120} height={2.6} fill="#FFF8EA" opacity={0.5} rx={1.3} />
    </svg>
  );
}
