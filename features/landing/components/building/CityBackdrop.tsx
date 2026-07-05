"use client";

import { useMemo } from "react";
import { DUSK } from "../../theme";
import { buildNeighborBlock, type NeighborGeo } from "./geometry";

/**
 * The city at dusk: silhouette towers with atmospheric-perspective haze.
 * Far row is lighter + blurred (distance); mid row darker and sharper.
 * A sparse scatter of small cool windows keeps the city alive but dim —
 * only the hero tower blazes.
 */
export function CityBackdrop({ row }: { row: "back" | "mid" }) {
  const towers = useMemo(() => {
    if (row === "back") {
      return [
        { cx: 64,  hw: 26, h: 118 },
        { cx: 148, hw: 32, h: 172 },
        { cx: 238, hw: 24, h: 104 },
        { cx: 462, hw: 30, h: 186 },
        { cx: 552, hw: 24, h: 112 },
        { cx: 636, hw: 30, h: 148 },
      ].map((t) => buildNeighborBlock(t.cx, 322, t.hw, t.h));
    }
    return [
      { cx: 158, hw: 44, h: 150 },
      { cx: 232, hw: 34, h: 98  },
      { cx: 476, hw: 38, h: 120 },
      { cx: 556, hw: 46, h: 178 },
    ].map((t) => buildNeighborBlock(t.cx, 348, t.hw, t.h));
  }, [row]);

  const isBack = row === "back";
  // atmospheric perspective: farther = lighter + hazier
  const faceL = isBack ? DUSK.cityFar : DUSK.cityMid;
  const faceR = isBack ? "#333B58" : "#1D2440";
  const faceT = isBack ? "#454E6E" : "#2B3352";

  return (
    <svg viewBox="0 0 700 470" aria-hidden="true" style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}>
      {isBack && (
        <defs>
          <filter id="city-haze" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>
      )}
      <g filter={isBack ? "url(#city-haze)" : undefined} opacity={isBack ? 0.85 : 1}>
        {towers.map((t, i) => (
          <g key={i}>
            <polygon points={t.left} fill={faceL} />
            <polygon points={t.right} fill={faceR} />
            <polygon points={t.top} fill={faceT} />
            <SparseWindows tower={t} seed={i * 7 + (isBack ? 0 : 3)} dim={isBack} />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** A handful of small cool-white lit windows per tower, deterministic. */
function SparseWindows({ tower, seed, dim }: { tower: NeighborGeo; seed: number; dim: boolean }) {
  // reuse the band polys as anchor strips; light 2-4 tiny slivers along them
  const strips = [...tower.leftWindows, ...tower.rightWindows];
  const lit: { points: string; o: number }[] = [];
  strips.forEach((s, i) => {
    const h = (seed * 53 + i * 29) % 11;
    if (h < 4) lit.push({ points: s, o: dim ? 0.16 + (h % 3) * 0.05 : 0.24 + (h % 3) * 0.08 });
  });
  return (
    <>
      {lit.map((w, i) => (
        <polygon key={i} points={w.points} fill={DUSK.cityWin} opacity={w.o} />
      ))}
    </>
  );
}
