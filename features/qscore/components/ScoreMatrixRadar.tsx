"use client";

/**
 * Q-Score Matrix — hexagon/radar view of the 6 P1-P6 dimensions.
 *
 * Replaces the old horizontal-bar list on the founder dashboard. Axes are drawn in fixed
 * P1..P6 order (not sorted by score) — a radar's vertex positions have to stay put between
 * renders, or the shape reflows every time a score changes and the chart is unreadable.
 * Clicking a vertex sets the same `selectedDimension` state the dashboard's existing "how to
 * improve" expansion panel already reads — this component only owns the drawing.
 *
 * Deliberately carries NO text at all — no dimension name, no score number. Two rounds of SVG
 * text positioned outward from a vertex (anchored by angle, offset by radius) ended up
 * misaligned against the card's actual box in practice even after the numbers only got fixed to
 * pass the math on paper. The dashboard renders a labeled list with real numbers right beside
 * this chart — that's where every number lives now. This draws the shape and nothing else, so
 * there's no text layout left to get wrong.
 *
 * Also deliberately no inner grid rings or axis spokes radiating from the center — that reads
 * as a "spider web" (every ring + every spoke crossing at the middle) rather than a score shape.
 * Just one boundary hexagon (the 100% edge, for scale reference) and the filled data polygon.
 */

import { motion } from "framer-motion";
import { bdr, ink, white, alpha } from "@/lib/constants/colors";
import type { DimensionTuple, DimensionId } from "@/features/qscore/utils/resolveDimensions";

const ORDER: DimensionId[] = ["p1", "p2", "p3", "p4", "p5", "p6"];
const SIZE = 240;
const CENTER = SIZE / 2;
const RADIUS = 100;
// A score of exactly 0 would otherwise plot its vertex at (radius 0) — the shared center point,
// on top of every other 0-score vertex regardless of which of the 6 axes it's on. With more than
// one weak dimension that collapses the hexagon into a shape with fewer distinguishable sides
// (several axes folding into the same center point) instead of 6 spread-out vertices. Flooring
// the plotted radius keeps every vertex on its own axis, visibly distinct, never at dead center.
const MIN_RADIUS_FRACTION = 0.1;

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

interface ScoreMatrixRadarProps {
  dims: DimensionTuple[];
  colorFor: (score: number) => string;
  selected: string | null;
  onSelect: (id: string) => void;
}

export function ScoreMatrixRadar({ dims, colorFor, selected, onSelect }: ScoreMatrixRadarProps) {
  const byId = new Map(dims);

  const dataPoints = ORDER.map((id, i) => {
    const score = byId.get(id)?.score ?? 0;
    const r = Math.max(MIN_RADIUS_FRACTION, score / 100) * RADIUS;
    return { id, score, ...polar(r, i * 60) };
  });
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ") + " Z";

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%" style={{ display: "block" }}>
      {/* boundary — the single 100% edge, for scale reference only */}
      <path d={ringPath(RADIUS)} fill="none" stroke={bdr} strokeWidth={1} />

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

      {/* vertices */}
      {dataPoints.map(p => {
        const isSelected = selected === p.id;
        const color = colorFor(p.score);
        return (
          <g key={p.id} onClick={() => onSelect(p.id)} style={{ cursor: "pointer" }}>
            {/* generous invisible hit area around the small visible dot */}
            <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
            <circle cx={p.x} cy={p.y} r={isSelected ? 6 : 4} fill={color} stroke={white} strokeWidth={1.5} />
            {isSelected && <circle cx={p.x} cy={p.y} r={9} fill="none" stroke={ink} strokeWidth={1} />}
          </g>
        );
      })}
    </svg>
  );
}
