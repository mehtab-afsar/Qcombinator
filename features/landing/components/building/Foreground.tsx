"use client";

import { L } from "../../theme";

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={13} rx={9} ry={3} fill={L.alpha(L.ink, 0.08)} />
      <line x1={0} y1={12} x2={0} y2={2} stroke={L.alpha("#7A6E58", 0.9)} strokeWidth={2} />
      <circle cx={0} cy={-6} r={9} fill="#9DBB8F" />
      <circle cx={-6} cy={-1} r={6.5} fill="#8FAF81" />
      <circle cx={6} cy={-2} r={7} fill="#A8C49A" />
    </g>
  );
}

/**
 * Street-level life in front of the tower: iso plaza lines and a handful of
 * trees. Sits on the nearest parallax layer so it moves fastest under cursor.
 */
export function Foreground() {
  return (
    <svg viewBox="0 0 400 470" aria-hidden="true" style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}>
      {/* plaza street lines (iso diamonds radiating from the base) */}
      <g stroke={L.alpha(L.ink, 0.10)} strokeWidth={1.2} fill="none">
        <polyline points="24,430 200,342 376,430" />
        <polyline points="66,452 200,385 334,452" />
        <line x1={112} y1={386} x2={64} y2={410} />
        <line x1={288} y1={386} x2={336} y2={410} />
      </g>
      {/* trees flanking the plaza */}
      <Tree x={70} y={420} s={1.05} />
      <Tree x={122} y={441} s={0.85} />
      <Tree x={286} y={443} s={0.9} />
      <Tree x={334} y={419} s={1.1} />
      <Tree x={38} y={396} s={0.7} />
    </svg>
  );
}
