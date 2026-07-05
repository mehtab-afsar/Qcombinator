"use client";

import { DUSK } from "../../theme";
import { FLOOR_COUNT, FH, Y_BASE } from "./geometry";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Construction crane as a fine dark silhouette against the dusk sky, with a
 * pulsing red aviation light at the apex. The jib slews as floors rise, the
 * hook tracks the current top floor, and the whole crane fades out at lock.
 */
export function Crane({ builtFloors }: { builtFloors: number }) {
  const progress = clamp01(builtFloors / FLOOR_COUNT);
  const exit = clamp01((builtFloors - (FLOOR_COUNT - 0.6)) / 0.6);
  const opacity = (0.5 + progress * 0.5) * (1 - exit);

  const baseX = 322;
  const baseY = 402;
  const mastTop = 78;
  const slew = -6 + progress * 10;
  const hookDropTarget = Y_BASE - builtFloors * FH + 42;
  const hookY = Math.max(mastTop + 26, Math.min(hookDropTarget, baseY - 30));
  const hookX = -92;

  const steel = "#10142A"; // near-black silhouette against the dusk sky

  return (
    <svg viewBox="0 0 400 470" aria-hidden="true" style={{ width: "100%", height: "100%", display: "block", overflow: "visible", opacity, transition: "opacity 0.4s ease" }}>
      <g stroke={steel} strokeWidth={2} fill="none" strokeLinecap="round">
        {/* mast with lattice bracing */}
        <line x1={baseX} y1={baseY} x2={baseX} y2={mastTop} />
        <line x1={baseX + 8} y1={baseY} x2={baseX + 8} y2={mastTop + 8} strokeWidth={1.2} opacity={0.85} />
        {Array.from({ length: 9 }, (_, i) => (
          <g key={i} strokeWidth={0.9} opacity={0.8}>
            <line x1={baseX} y1={baseY - 10 - i * 34} x2={baseX + 8} y2={baseY - 27 - i * 34} />
            <line x1={baseX + 8} y1={baseY - 10 - i * 34} x2={baseX} y2={baseY - 27 - i * 34} />
          </g>
        ))}
        {/* slewing group */}
        <g style={{ transform: `rotate(${slew}deg)`, transformOrigin: `${baseX}px ${mastTop}px`, transition: "transform 0.5s ease" }}>
          <line x1={baseX} y1={mastTop} x2={baseX - 138} y2={mastTop + 9} />
          <line x1={baseX} y1={mastTop} x2={baseX + 42} y2={mastTop + 5} />
          <rect x={baseX + 32} y={mastTop + 5} width={13} height={9} fill={steel} stroke="none" rx={1} />
          <line x1={baseX} y1={mastTop - 20} x2={baseX - 86} y2={mastTop + 5} strokeWidth={0.9} opacity={0.9} />
          <line x1={baseX} y1={mastTop - 20} x2={baseX + 38} y2={mastTop + 3} strokeWidth={0.9} opacity={0.9} />
          <line x1={baseX} y1={mastTop} x2={baseX} y2={mastTop - 20} />
          {/* trolley + hook cable */}
          <line x1={baseX + hookX} y1={mastTop + 8} x2={baseX + hookX} y2={hookY} strokeWidth={1} />
          <path d={`M ${baseX + hookX} ${hookY} q 0 6 -4 6`} strokeWidth={1.6} />
          {/* swinging beam payload while mid-build */}
          {builtFloors > 0.4 && exit < 0.4 && (
            <rect x={baseX + hookX - 11} y={hookY + 6} width={22} height={4.5} fill={DUSK.paneOn} stroke="none" rx={1} opacity={0.95} />
          )}
        </g>
        {/* aviation warning light */}
        <circle cx={baseX} cy={mastTop - 22} r={2} fill="#FF5A5A" stroke="none" className="lp-beacon" />
      </g>
    </svg>
  );
}
