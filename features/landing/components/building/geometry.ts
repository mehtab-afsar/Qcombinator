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

// ─── Cinematic tower (dusk realism pass) ─────────────────────────────────────
// Stepped skyscraper massing: podium (floors 0-1) → shaft (2-4) → crown (5).
// Dense curtain-wall panes per face; lit panes ignite in deterministic
// pseudo-random order as floors complete.

const MASSING_W = [78, 78, 58, 58, 58, 40]; // iso half-width per floor

export interface CineFloor {
  i: number;
  w: number;
  left: string;
  right: string;
  /** Exposed setback terrace on top of this floor (null when the floor above is same width). */
  terrace: string | null;
  /** This floor's own roofline diamond — used for the construction-slab outline. */
  topOutline: string;
  panesLeft: string[];
  panesRight: string[];
  /** Sun-side vertical edge highlight (front centre column). */
  edge: { x1: number; y1: number; x2: number; y2: number };
}

export interface CineTower {
  floors: CineFloor[];
  roof: string;
  roofApex: { x: number; y: number };
  baseTop: string;
  baseLeft: string;
  baseRight: string;
  groundCx: number;
  groundCy: number;
  groundRx: number;
  groundRy: number;
}

function diamond(cx: number, apexY: number, w: number): string {
  return [p(cx, apexY), p(cx + w, apexY + w / 2), p(cx, apexY + w), p(cx - w, apexY + w / 2)].join(" ");
}

/** Grid of panes on one parallelogram face (origin + u/v edge vectors). */
function paneGrid(
  ox: number, oy: number,
  ux: number, uy: number,
  vx: number, vy: number,
  cols: number, rows: number
): string[] {
  const panes: string[] = [];
  const mu = 0.07, mv = 0.14;          // face margins
  const gu = 0.035, gv = 0.10;         // gaps between panes
  const cw = (1 - 2 * mu - (cols - 1) * gu) / cols;
  const ch = (1 - 2 * mv - (rows - 1) * gv) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u0 = mu + c * (cw + gu);
      const v0 = mv + r * (ch + gv);
      panes.push(windowPoly(ox, oy, ux, uy, vx, vy, u0, u0 + cw, v0, v0 + ch));
    }
  }
  return panes;
}

/** Deterministic per-pane ignition threshold in [0.55, 1.1] of floor progress. */
export function paneThreshold(floor: number, pane: number): number {
  const h = ((floor * 131 + pane * 67) % 97) / 97;
  return 0.55 + h * 0.55;
}

export const PANE_COLS = 5;
export const PANE_ROWS = 3;

export function buildCinematicTower(): CineTower {
  const floors: CineFloor[] = [];

  for (let i = 0; i < FLOOR_COUNT; i++) {
    const w = MASSING_W[i];
    const a = Y_BASE - (i + 1) * FH;

    const LT = { x: CX - w, y: a + w / 2 };
    const MT = { x: CX,     y: a + w };
    const RT = { x: CX + w, y: a + w / 2 };
    const MB = { x: CX,     y: a + w + FH };
    const LB = { x: CX - w, y: a + w / 2 + FH };
    const RB = { x: CX + w, y: a + w / 2 + FH };

    const left = [LT, MT, MB, LB].map((q) => p(q.x, q.y)).join(" ");
    const right = [MT, RT, RB, MB].map((q) => p(q.x, q.y)).join(" ");

    // setback terrace: exposed portion of this floor's top when the next floor steps in
    const wNext = i + 1 < FLOOR_COUNT ? MASSING_W[i + 1] : null;
    const terrace = wNext !== null && wNext < w ? diamond(CX, a, w) : null;

    floors.push({
      i, w, left, right, terrace,
      topOutline: diamond(CX, a, w),
      panesLeft: paneGrid(LT.x, LT.y, MT.x - LT.x, MT.y - LT.y, LB.x - LT.x, LB.y - LT.y, PANE_COLS, PANE_ROWS),
      panesRight: paneGrid(MT.x, MT.y, RT.x - MT.x, RT.y - MT.y, MB.x - MT.x, MB.y - MT.y, PANE_COLS, PANE_ROWS),
      edge: { x1: MT.x, y1: MT.y, x2: MB.x, y2: MB.y },
    });
  }

  const wTop = MASSING_W[FLOOR_COUNT - 1];
  const aTop = Y_BASE - FLOOR_COUNT * FH;

  // wider entrance plinth
  const W2 = MASSING_W[0] + 12;
  const FBH = 13;

  return {
    floors,
    roof: diamond(CX, aTop, wTop),
    roofApex: { x: CX, y: aTop },
    baseTop: diamond(CX, Y_BASE, W2),
    baseLeft: [p(CX - W2, Y_BASE + W2 / 2), p(CX, Y_BASE + W2), p(CX, Y_BASE + W2 + FBH), p(CX - W2, Y_BASE + W2 / 2 + FBH)].join(" "),
    baseRight: [p(CX, Y_BASE + W2), p(CX + W2, Y_BASE + W2 / 2), p(CX + W2, Y_BASE + W2 / 2 + FBH), p(CX, Y_BASE + W2 + FBH)].join(" "),
    groundCx: CX,
    groundCy: Y_BASE + W2 + FBH + 6,
    groundRx: W2 + 30,
    groundRy: 16,
  };
}

// ─── Neighbor towers (the rest of the market — never lit) ────────────────────

export interface NeighborGeo {
  left: string;
  right: string;
  top: string;
  leftWindows: string[];
  rightWindows: string[];
}

/**
 * A simplified isometric tower for the surrounding city. `cx` is the tower's
 * horizontal centre, `groundY` the apex of its base at street level, `hw` the
 * iso half-width and `height` the shaft height in px.
 */
export function buildNeighborBlock(cx: number, groundY: number, hw: number, height: number): NeighborGeo {
  const a = groundY - height; // apex of the roofline

  const LT = { x: cx - hw, y: a + hw / 2 };
  const MT = { x: cx,      y: a + hw };
  const RT = { x: cx + hw, y: a + hw / 2 };
  const MB = { x: cx,      y: groundY + hw };
  const LB = { x: cx - hw, y: groundY + hw / 2 };
  const RB = { x: cx + hw, y: groundY + hw / 2 };

  const left = [LT, MT, MB, LB].map((q) => p(q.x, q.y)).join(" ");
  const right = [MT, RT, RB, MB].map((q) => p(q.x, q.y)).join(" ");
  const top = [
    p(cx, a),
    p(cx + hw, a + hw / 2),
    p(cx, a + hw),
    p(cx - hw, a + hw / 2),
  ].join(" ");

  // sparse unlit window strips (2-3 bands per face depending on height)
  const bands = Math.max(2, Math.min(4, Math.floor(height / 34)));
  const leftWindows: string[] = [];
  const rightWindows: string[] = [];
  for (let bIdx = 0; bIdx < bands; bIdx++) {
    const v0 = 0.12 + (bIdx / bands) * 0.78;
    const v1 = v0 + 0.10;
    leftWindows.push(
      windowPoly(LT.x, LT.y, MT.x - LT.x, MT.y - LT.y, LB.x - LT.x, LB.y - LT.y, 0.22, 0.78, v0, v1)
    );
    rightWindows.push(
      windowPoly(MT.x, MT.y, RT.x - MT.x, RT.y - MT.y, MB.x - MT.x, MB.y - MT.y, 0.22, 0.78, v0, v1)
    );
  }

  return { left, right, top, leftWindows, rightWindows };
}
