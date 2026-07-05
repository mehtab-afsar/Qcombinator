"use client";

import { useMemo } from "react";
import { DUSK } from "../../theme";
import { buildCinematicTower, paneThreshold, PANE_COLS, PANE_ROWS, FLOOR_COUNT } from "./geometry";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const PANES_PER_FACE = PANE_COLS * PANE_ROWS;

/**
 * The hero tower at dusk — a stepped glass skyscraper that builds floor by
 * floor as `builtFloors` (0–6, fractional) rises. Windows ignite amber in
 * deterministic pseudo-random order like a real evening tower; a warm bloom
 * layer glows behind the lit panes. Purely presentational.
 */
export function HeroBuilding({ builtFloors }: { builtFloors: number }) {
  const t = useMemo(() => buildCinematicTower(), []);
  const roofReveal = clamp01(builtFloors - (FLOOR_COUNT - 1));
  const locked = builtFloors >= FLOOR_COUNT - 0.05;

  return (
    <svg
      viewBox="0 0 400 470"
      role="img"
      aria-label="A glass skyscraper at dusk building itself floor by floor, windows lighting up as the Q-Score rises to fundable."
      style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id="ct-faceL" x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0%" stopColor={DUSK.towerLight} />
          <stop offset="100%" stopColor="#2A3150" />
        </linearGradient>
        <linearGradient id="ct-faceR" x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0%" stopColor="#232A45" />
          <stop offset="100%" stopColor={DUSK.towerDark} />
        </linearGradient>
        <linearGradient id="ct-pane-on" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={DUSK.paneOnHot} />
          <stop offset="100%" stopColor={DUSK.paneOn} />
        </linearGradient>
        <filter id="ct-bloom" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="ct-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* long dusk shadow + contact shadow */}
      <ellipse cx={t.groundCx} cy={t.groundCy} rx={t.groundRx} ry={t.groundRy} fill="rgba(6,9,20,0.55)" filter="url(#ct-soft)" />
      <polygon points={`${t.groundCx - 60},${t.groundCy - 6} ${t.groundCx + 210},${t.groundCy + 4} ${t.groundCx + 240},${t.groundCy + 14} ${t.groundCx - 40},${t.groundCy + 8}`} fill="rgba(6,9,20,0.3)" filter="url(#ct-soft)" />

      {/* entrance plinth */}
      <polygon points={t.baseLeft} fill="#20263F" />
      <polygon points={t.baseRight} fill="#181E33" />
      <polygon points={t.baseTop} fill="#2B3352" stroke="rgba(110,123,168,0.25)" strokeWidth={0.5} />

      {/* floors, bottom → top */}
      {t.floors.map((f) => {
        const r = clamp01(builtFloors - f.i);
        const floorAge = builtFloors - f.i; // grows past 1 as tower continues
        return (
          <g
            key={f.i}
            style={{
              opacity: r,
              transform: `translateY(${(1 - r) * 14}px)`,
              transition: "opacity 0.5s ease, transform 0.5s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            {/* glass faces */}
            <polygon points={f.left} fill="url(#ct-faceL)" />
            <polygon points={f.right} fill="url(#ct-faceR)" />
            {/* setback terrace */}
            {f.terrace && <polygon points={f.terrace} fill="#323A5C" stroke="rgba(110,123,168,0.3)" strokeWidth={0.5} />}

            {/* bloom behind lit panes */}
            <g filter="url(#ct-bloom)" opacity={0.55}>
              {f.panesLeft.map((w, j) =>
                floorAge > paneThreshold(f.i, j) ? <polygon key={`bl${j}`} points={w} fill={DUSK.paneOn} /> : null
              )}
              {f.panesRight.map((w, j) =>
                floorAge > paneThreshold(f.i, j + PANES_PER_FACE) ? <polygon key={`br${j}`} points={w} fill={DUSK.paneOn} /> : null
              )}
            </g>

            {/* curtain-wall panes */}
            {f.panesLeft.map((w, j) => {
              const on = floorAge > paneThreshold(f.i, j);
              return <polygon key={`l${j}`} points={w} fill={on ? "url(#ct-pane-on)" : DUSK.paneOff} style={{ transition: "fill 0.5s ease" }} />;
            })}
            {f.panesRight.map((w, j) => {
              const on = floorAge > paneThreshold(f.i, j + PANES_PER_FACE);
              return <polygon key={`r${j}`} points={w} fill={on ? "url(#ct-pane-on)" : DUSK.paneOff} opacity={on ? 0.82 : 1} style={{ transition: "fill 0.5s ease" }} />;
            })}

            {/* sun-side edge highlight */}
            <line x1={f.edge.x1} y1={f.edge.y1} x2={f.edge.x2} y2={f.edge.y2} stroke={DUSK.towerEdge} strokeWidth={0.9} opacity={0.55} />

            {/* construction state: slab edge while the floor is incomplete */}
            {r > 0.02 && r < 0.96 && (
              <polygon points={f.topOutline} fill="none" stroke="rgba(245,239,228,0.35)" strokeWidth={0.8} strokeDasharray="3 3" opacity={1 - r} />
            )}
          </g>
        );
      })}

      {/* roof + crown beacon */}
      <g style={{ opacity: roofReveal, transform: `translateY(${(1 - roofReveal) * 12}px)`, transition: "opacity 0.5s ease, transform 0.5s ease" }}>
        <polygon points={t.roof} fill="#39426A" stroke="rgba(110,123,168,0.35)" strokeWidth={0.6} />
        {/* beacon mast */}
        <line x1={t.roofApex.x} y1={t.roofApex.y - 16} x2={t.roofApex.x} y2={t.roofApex.y + 6} stroke="#4A5378" strokeWidth={1.4} />
        {locked && (
          <>
            <circle cx={t.roofApex.x} cy={t.roofApex.y - 17} r={7} fill={DUSK.paneOn} opacity={0.35} filter="url(#ct-soft)" />
            <circle cx={t.roofApex.x} cy={t.roofApex.y - 17} r={2.2} fill={DUSK.paneOnHot} className="lp-beacon" />
          </>
        )}
      </g>
    </svg>
  );
}
