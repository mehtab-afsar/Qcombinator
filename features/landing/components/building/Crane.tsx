"use client";

import { L } from "../../theme";
import { FLOOR_COUNT, FH, Y_BASE } from "./geometry";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Isometric construction crane beside the hero tower. The jib slews slowly as
 * floors rise, the hook cable follows the current top floor, and the whole
 * crane fades out once the building locks (construction complete).
 */
export function Crane({ builtFloors }: { builtFloors: number }) {
  const progress = clamp01(builtFloors / FLOOR_COUNT);
  // fade out during the lock phase (last half-floor)
  const exit = clamp01((builtFloors - (FLOOR_COUNT - 0.6)) / 0.6);
  const opacity = (0.25 + progress * 0.75) * (1 - exit);

  // crane sits to the right of the tower
  const baseX = 318;
  const baseY = 402;
  const mastTop = 96;
  // jib slews a few degrees as construction proceeds
  const slew = -6 + progress * 10;
  // hook tracks the current top of the tower
  const hookDropTarget = Y_BASE - builtFloors * FH + 42;
  const hookY = Math.max(mastTop + 26, Math.min(hookDropTarget, baseY - 30));
  const jibReach = -128; // toward the tower
  const hookX = -86;

  const steel = L.alpha(L.ink, 0.55);

  return (
    <svg viewBox="0 0 400 470" aria-hidden="true" style={{ width: "100%", height: "100%", display: "block", overflow: "visible", opacity, transition: "opacity 0.4s ease" }}>
      <g stroke={steel} strokeWidth={2.5} fill="none" strokeLinecap="round">
        {/* mast with cross-bracing */}
        <line x1={baseX} y1={baseY} x2={baseX} y2={mastTop} />
        <line x1={baseX + 9} y1={baseY} x2={baseX + 9} y2={mastTop + 8} strokeWidth={1.5} opacity={0.6} />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={i} x1={baseX} y1={baseY - 14 - i * 42} x2={baseX + 9} y2={baseY - 34 - i * 42} strokeWidth={1.2} opacity={0.5} />
        ))}
        {/* slewing group: jib + counter-jib + tie bars + hook cable */}
        <g style={{ transform: `rotate(${slew}deg)`, transformOrigin: `${baseX}px ${mastTop}px`, transition: "transform 0.5s ease" }}>
          {/* jib toward the tower */}
          <line x1={baseX} y1={mastTop} x2={baseX + jibReach} y2={mastTop + 10} />
          {/* counter-jib */}
          <line x1={baseX} y1={mastTop} x2={baseX + 44} y2={mastTop + 6} />
          <rect x={baseX + 34} y={mastTop + 6} width={14} height={10} fill={steel} stroke="none" rx={1.5} />
          {/* apex tie bars */}
          <line x1={baseX} y1={mastTop - 18} x2={baseX + jibReach * 0.62} y2={mastTop + 6} strokeWidth={1.2} opacity={0.7} />
          <line x1={baseX} y1={mastTop - 18} x2={baseX + 40} y2={mastTop + 4} strokeWidth={1.2} opacity={0.7} />
          <line x1={baseX} y1={mastTop} x2={baseX} y2={mastTop - 18} />
          {/* hook cable + hook */}
          <line x1={baseX + hookX} y1={mastTop + 9} x2={baseX + hookX} y2={hookY} strokeWidth={1.4} />
          <path d={`M ${baseX + hookX} ${hookY} q 0 7 -5 7`} strokeWidth={2} />
          {/* swinging beam payload while mid-build */}
          {builtFloors > 0.4 && exit < 0.4 && (
            <rect x={baseX + hookX - 12} y={hookY + 7} width={24} height={5} fill={L.windowOn} stroke="none" rx={1.5} opacity={0.9} />
          )}
        </g>
      </g>
    </svg>
  );
}
