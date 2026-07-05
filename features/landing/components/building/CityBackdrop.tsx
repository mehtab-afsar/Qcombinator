"use client";

import { useMemo } from "react";
import { L } from "../../theme";
import { buildNeighborBlock } from "./geometry";

/**
 * The rest of the market: grey, unlit towers. Drawn in a 700-wide viewBox and
 * mounted in a container exactly 175% of the hero box, so both SVGs share the
 * same scale factor and the ground lines align.
 *
 * `row="back"` → pale horizon silhouettes. `row="mid"` → warm-grey neighbors
 * flanking the hero, windows visibly unlit. Only the hero tower earns light.
 */
export function CityBackdrop({ row }: { row: "back" | "mid" }) {
  const towers = useMemo(() => {
    if (row === "back") {
      // horizon silhouettes — center gap left for the hero (cx ≈ 350)
      return [
        { cx: 64,  hw: 26, h: 100 },
        { cx: 148, hw: 32, h: 148 },
        { cx: 238, hw: 24, h: 92  },
        { cx: 462, hw: 30, h: 160 },
        { cx: 552, hw: 24, h: 98  },
        { cx: 636, hw: 30, h: 128 },
      ].map((t) => buildNeighborBlock(t.cx, 322, t.hw, t.h));
    }
    // mid row: flanking neighbors, clearly shorter than the finished hero
    return [
      { cx: 158, hw: 44, h: 132 },
      { cx: 232, hw: 34, h: 86  },
      { cx: 476, hw: 38, h: 104 },
      { cx: 556, hw: 46, h: 158 },
    ].map((t) => buildNeighborBlock(t.cx, 348, t.hw, t.h));
  }, [row]);

  const isBack = row === "back";
  const faceL = isBack ? L.alpha(L.muted, 0.15) : L.alpha("#B7AD9E", 0.55);
  const faceR = isBack ? L.alpha(L.muted, 0.21) : L.alpha("#A79D8C", 0.55);
  const faceT = isBack ? L.alpha(L.muted, 0.11) : L.alpha("#CEC5B5", 0.6);
  const win = L.alpha(L.ink, 0.10);

  return (
    <svg viewBox="0 0 700 470" aria-hidden="true" style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}>
      {towers.map((t, i) => (
        <g key={i}>
          <polygon points={t.left} fill={faceL} />
          <polygon points={t.right} fill={faceR} />
          <polygon points={t.top} fill={faceT} />
          {!isBack && t.leftWindows.map((w, j) => <polygon key={`l${j}`} points={w} fill={win} />)}
          {!isBack && t.rightWindows.map((w, j) => <polygon key={`r${j}`} points={w} fill={win} />)}
        </g>
      ))}
    </svg>
  );
}
