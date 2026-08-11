/**
 * PRD 2 Stage 3 — the hub's radial arrangement (CANVAS_SPEC D2: "score centre, agents around
 * it"). Pure trig, no React — unit-tested directly rather than only reachable through rendering
 * ExecutiveRoster, matching this session's pattern for extracted logic (isCycleLive,
 * isActivating, scopeStepsToExecutive).
 */

/**
 * The offset (in px, relative to the centre) for the `index`-th of `total` cards on a ring of
 * the given `radius`. Cards start at the top (12 o'clock) and go clockwise, so the first
 * executive reads as the "lead" position rather than an arbitrary one.
 *
 * @param total Zero renders nothing (the caller's map produces no cards); this still returns a
 *   defined value (index 0 at the top) rather than dividing by zero, since a defensive caller
 *   should never need to special-case an empty roster just to call this safely.
 */
export function orbitPosition(index: number, total: number, radius: number): { x: number; y: number } {
  if (total <= 0) return { x: 0, y: 0 }
  const angleDeg = -90 + (360 / total) * index
  const angleRad = (angleDeg * Math.PI) / 180
  return { x: radius * Math.cos(angleRad), y: radius * Math.sin(angleRad) }
}
