"use client";

/**
 * Q-Score Matrix — hexagon/radar view of the 6 P1-P6 dimensions.
 *
 * Replaces the old horizontal-bar list on the founder dashboard. Axes are drawn in fixed
 * P1..P6 order (not sorted by score) — a radar's vertex positions have to stay put between
 * renders, or the shape reflows every time a score changes and the chart is unreadable.
 * Clicking a vertex/label sets the same `selectedDimension` state the dashboard's existing
 * "how to improve" expansion panel already reads — this component only owns the drawing.
 */

import { motion } from "framer-motion";
import { bdr, muted, ink, white, alpha } from "@/lib/constants/colors";
import type { DimensionTuple, DimensionId } from "@/features/qscore/utils/resolveDimensions";

const ORDER: DimensionId[] = ["p1", "p2", "p3", "p4", "p5", "p6"];
const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 74;
const RINGS = [0.25, 0.5, 0.75, 1];

function polar(r: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}

function ringPath(r: number): string {
  return ORDER.map((_, i) => {
    const { x, y } = polar(r, i * 60);
    return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ") + " Z";
}

/** Label anchor flips at the left/right hexagon points so text grows away from the shape. */
function labelAnchor(angleDeg: number): "start" | "middle" | "end" {
  if (angleDeg === 0 || angleDeg === 180) return "middle";
  return angleDeg > 0 && angleDeg < 180 ? "start" : "end";
}

interface ScoreMatrixRadarProps {
  dims: DimensionTuple[];
  labels: Record<string, string>;
  colorFor: (score: number) => string;
  selected: string | null;
  onSelect: (id: string) => void;
}

export function ScoreMatrixRadar({ dims, labels, colorFor, selected, onSelect }: ScoreMatrixRadarProps) {
  const byId = new Map(dims);

  const dataPoints = ORDER.map((id, i) => {
    const score = byId.get(id)?.score ?? 0;
    return { id, score, ...polar((score / 100) * RADIUS, i * 60) };
  });
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ") + " Z";

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE + 26}`} width="100%" style={{ maxWidth: 260, display: "block", margin: "0 auto", overflow: "visible" }}>
      {/* background rings */}
      {RINGS.map(level => (
        <path key={level} d={ringPath(RADIUS * level)} fill="none" stroke={bdr} strokeWidth={1} />
      ))}
      {/* axes */}
      {ORDER.map((id, i) => {
        const edge = polar(RADIUS, i * 60);
        return <line key={id} x1={CENTER} y1={CENTER} x2={edge.x} y2={edge.y} stroke={bdr} strokeWidth={1} />;
      })}

      {/* data shape */}
      <motion.path
        d={dataPath}
        fill={alpha(ink, 0.06)}
        stroke={ink}
        strokeWidth={1.5}
        strokeLinejoin="round"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
      />

      {/* vertices + labels */}
      {dataPoints.map((p, i) => {
        const angle = i * 60;
        const anchor = labelAnchor(angle);
        const labelPt = polar(RADIUS + 22, angle);
        const isSelected = selected === p.id;
        const color = colorFor(p.score);
        return (
          <g key={p.id} onClick={() => onSelect(p.id)} style={{ cursor: "pointer" }}>
            {/* generous invisible hit area around the small visible dot */}
            <circle cx={p.x} cy={p.y} r={12} fill="transparent" />
            <circle cx={p.x} cy={p.y} r={isSelected ? 5 : 3.5} fill={color} stroke={white} strokeWidth={1.5} />
            <text
              x={labelPt.x}
              y={labelPt.y - 4}
              textAnchor={anchor}
              fontSize={9}
              fontWeight={isSelected ? 700 : 500}
              fill={isSelected ? ink : muted}
              style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
            >
              {labels[p.id]}
            </text>
            <text
              x={labelPt.x}
              y={labelPt.y + 9}
              textAnchor={anchor}
              fontSize={12}
              fontWeight={700}
              fontFamily="monospace"
              fill={color}
            >
              {p.score}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
