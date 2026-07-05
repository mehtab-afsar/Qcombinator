"use client";

import { L } from "../../theme";
import { FLOOR_COUNT } from "./geometry";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The "fundable" moment: warm light rays burst from behind the hero roofline
 * once the tower crosses the threshold (score ≈ 70). Low-opacity amber/cream
 * beams with a soft halo — dramatic but not neon.
 */
export function GodRays({ builtFloors, animate = true }: { builtFloors: number; animate?: boolean }) {
  const reveal = clamp01((builtFloors - (FLOOR_COUNT - 0.9)) / 0.9);
  if (reveal <= 0.01) return null;

  // rays fan out from just behind the roof apex
  const cx = 200, cy = 132;
  const rays = [-72, -48, -26, -6, 14, 38, 62].map((deg, i) => {
    const len = 210 + (i % 3) * 46;
    const halfW = 7 + (i % 2) * 5;
    const rad = ((deg - 90) * Math.PI) / 180;
    const px = (a: number, r: number) => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    const spread = (halfW * Math.PI) / 180;
    return `M ${cx} ${cy} L ${px(rad - spread, len)} L ${px(rad + spread, len)} Z`;
  });

  return (
    <svg viewBox="0 0 400 470" aria-hidden="true" style={{ width: "100%", height: "100%", display: "block", overflow: "visible", opacity: reveal }}>
      <defs>
        <linearGradient id="ray-grad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={L.alpha(L.windowOn, 0.34)} />
          <stop offset="70%" stopColor={L.alpha(L.windowOn, 0.08)} />
          <stop offset="100%" stopColor={L.alpha(L.windowOn, 0)} />
        </linearGradient>
        <radialGradient id="ray-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={L.alpha(L.windowOn, 0.30)} />
          <stop offset="100%" stopColor={L.alpha(L.windowOn, 0)} />
        </radialGradient>
      </defs>
      {/* halo behind the roofline */}
      <circle cx={cx} cy={cy + 16} r={98} fill="url(#ray-halo)" />
      {/* the beams — slow ceremonial rotation */}
      <g className={animate ? "lp-rays" : undefined} style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {rays.map((d, i) => (
          <path key={i} d={d} fill="url(#ray-grad)" />
        ))}
      </g>
    </svg>
  );
}
