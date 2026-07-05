/**
 * Procedural isometric building geometry for "The Rise" hero.
 * All hand-computed 2:1 isometric polygons — no 3D engine, no external assets.
 * The building stacks N floors; each floor contributes a side band, and the
 * top floor gets a roof (top face). Windows are parallelograms on each face.
 */

export const CX = 200;      // horizontal centre (viewBox 400 wide)
export const W = 66;        // iso half-width of the footprint
export const FH = 34;       // floor height in screen px
export const Y_BASE = 366;  // apex y of the foundation's top face
export const FLOOR_COUNT = 6;

const p = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`;

/** Rectangle on a parallelogram face defined by origin + two edge vectors. */
function windowPoly(
  ox: number, oy: number,
  ux: number, uy: number,   // "along the top edge" vector
  vx: number, vy: number,   // "downward" vector
  u0: number, u1: number, v0: number, v1: number
): string {
  const at = (u: number, v: number) => p(ox + ux * u + vx * v, oy + uy * u + vy * v);
  return [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)].join(" ");
}

export interface FloorGeo {
  i: number;
  left: string;
  right: string;
  leftWindows: string[];
  rightWindows: string[];
  labelY: number;   // vertical anchor for the milestone label
}

export interface BuildingGeo {
  floors: FloorGeo[];
  roof: string;        // top face of the highest floor
  baseTop: string;
  baseLeft: string;
  baseRight: string;
  groundCx: number;
  groundCy: number;
  groundRx: number;
  groundRy: number;
}

export function buildBuilding(): BuildingGeo {
  const floors: FloorGeo[] = [];

  for (let i = 0; i < FLOOR_COUNT; i++) {
    const a = Y_BASE - (i + 1) * FH; // apex of this floor's roofline

    const LT = { x: CX - W, y: a + W / 2 };
    const MT = { x: CX,     y: a + W };
    const RT = { x: CX + W, y: a + W / 2 };
    const MB = { x: CX,     y: a + W + FH };
    const LB = { x: CX - W, y: a + W / 2 + FH };
    const RB = { x: CX + W, y: a + W / 2 + FH };

    const left = [LT, MT, MB, LB].map((q) => p(q.x, q.y)).join(" ");
    const right = [MT, RT, RB, MB].map((q) => p(q.x, q.y)).join(" ");

    // window bands: two per face
    const leftWindows = [
      windowPoly(LT.x, LT.y, MT.x - LT.x, MT.y - LT.y, LB.x - LT.x, LB.y - LT.y, 0.20, 0.44, 0.30, 0.72),
      windowPoly(LT.x, LT.y, MT.x - LT.x, MT.y - LT.y, LB.x - LT.x, LB.y - LT.y, 0.56, 0.80, 0.30, 0.72),
    ];
    const rightWindows = [
      windowPoly(MT.x, MT.y, RT.x - MT.x, RT.y - MT.y, MB.x - MT.x, MB.y - MT.y, 0.20, 0.44, 0.30, 0.72),
      windowPoly(MT.x, MT.y, RT.x - MT.x, RT.y - MT.y, MB.x - MT.x, MB.y - MT.y, 0.56, 0.80, 0.30, 0.72),
    ];

    floors.push({ i, left, right, leftWindows, rightWindows, labelY: a + W / 2 + FH / 2 });
  }

  // roof = top face of the highest floor
  const aTop = Y_BASE - FLOOR_COUNT * FH;
  const roof = [
    p(CX, aTop),
    p(CX + W, aTop + W / 2),
    p(CX, aTop + W),
    p(CX - W, aTop + W / 2),
  ].join(" ");

  // foundation — a wider, short block at the base
  const W2 = W + 12;
  const FBH = 15;
  const baseTop = [
    p(CX, Y_BASE),
    p(CX + W2, Y_BASE + W2 / 2),
    p(CX, Y_BASE + W2),
    p(CX - W2, Y_BASE + W2 / 2),
  ].join(" ");
  const baseLeft = [
    p(CX - W2, Y_BASE + W2 / 2),
    p(CX, Y_BASE + W2),
    p(CX, Y_BASE + W2 + FBH),
    p(CX - W2, Y_BASE + W2 / 2 + FBH),
  ].join(" ");
  const baseRight = [
    p(CX, Y_BASE + W2),
    p(CX + W2, Y_BASE + W2 / 2),
    p(CX + W2, Y_BASE + W2 / 2 + FBH),
    p(CX, Y_BASE + W2 + FBH),
  ].join(" ");

  return {
    floors,
    roof,
    baseTop,
    baseLeft,
    baseRight,
    groundCx: CX,
    groundCy: Y_BASE + W2 + FBH + 6,
    groundRx: W2 + 26,
    groundRy: 16,
  };
}
