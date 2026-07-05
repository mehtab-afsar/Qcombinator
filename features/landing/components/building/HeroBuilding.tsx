"use client";

import { useMemo } from "react";
import { L } from "../../theme";
import { buildBuilding } from "./geometry";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The isometric company HQ. `builtFloors` (0–6, fractional) drives how much of
 * the tower has risen; windows light up as each floor completes. Purely
 * presentational — the parent computes builtFloors from scroll (or passes 6
 * for the static/reduced-motion render).
 */
export function HeroBuilding({ builtFloors }: { builtFloors: number }) {
  const b = useMemo(() => buildBuilding(), []);
  const roofReveal = clamp01(builtFloors - (b.floors.length - 1));

  return (
    <svg
      viewBox="0 0 400 470"
      role="img"
      aria-label="An isometric company headquarters building itself floor by floor as the Q-Score rises from an idea to fundable."
      style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id="rise-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={L.skyTop} />
          <stop offset="100%" stopColor={L.skyBot} />
        </linearGradient>
        <filter id="rise-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* ground shadow */}
      <ellipse cx={b.groundCx} cy={b.groundCy} rx={b.groundRx} ry={b.groundRy} fill={L.alpha(L.ink, 0.08)} filter="url(#rise-soft)" />

      {/* foundation */}
      <polygon points={b.baseLeft} fill={L.brickLeft} />
      <polygon points={b.baseRight} fill={L.brickRight} />
      <polygon points={b.baseTop} fill={L.brickTop} stroke={L.alpha(L.ink, 0.06)} strokeWidth={0.5} />

      {/* floors, bottom → top */}
      {b.floors.map((f) => {
        const r = clamp01(builtFloors - f.i);
        const lit = r > 0.62;
        return (
          <g
            key={f.i}
            style={{
              opacity: r,
              transform: `translateY(${(1 - r) * 14}px)`,
              transition: "opacity 0.5s ease, transform 0.5s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <polygon points={f.left} fill={L.brickLeft} />
            <polygon points={f.right} fill={L.brickRight} />
            {f.leftWindows.map((w, j) => (
              <polygon key={`l${j}`} points={w} fill={lit ? L.windowOn : L.windowOff}
                style={{ transition: "fill 0.45s ease" }} opacity={lit ? 1 : 0.7} />
            ))}
            {f.rightWindows.map((w, j) => (
              <polygon key={`r${j}`} points={w} fill={lit ? L.windowOn : L.windowOff}
                style={{ transition: "fill 0.45s ease" }} opacity={lit ? 0.85 : 0.6} />
            ))}
            {/* floor edge highlight */}
            <polygon points={f.left} fill="none" stroke={L.alpha(L.ink, 0.05)} strokeWidth={0.5} />
          </g>
        );
      })}

      {/* roof + flag on the top floor */}
      <g style={{ opacity: roofReveal, transform: `translateY(${(1 - roofReveal) * 12}px)`, transition: "opacity 0.5s ease, transform 0.5s ease" }}>
        <polygon points={b.roof} fill={L.brickTop} stroke={L.alpha(L.ink, 0.07)} strokeWidth={0.5} />
        {/* rooftop flag */}
        <line x1={200} y1={98} x2={200} y2={128} stroke={L.ink} strokeWidth={2} />
        <polygon points="200,98 218,104 200,110" fill={L.green} />
      </g>
    </svg>
  );
}
