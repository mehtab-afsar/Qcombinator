/**
 * PRD 2 Stage 3 — the document workspace panel visually grows out of the clicked ArtifactCard
 * rather than sliding in from the screen edge (CANVAS_SPEC §5, "preserve the sense of place").
 *
 * A manual FLIP-style expand, not a `layoutId` shared-element morph: the clicked card does NOT
 * unmount when the panel opens (the whole document grid stays visible behind it), so a shared
 * `layoutId` between the two would have two simultaneously-mounted elements claiming the same
 * id — ambiguous, not the clean handoff `layoutId` is built for. This is plain geometry instead:
 * pure, no DOMRect/browser dependency, unit-tested directly.
 */

export interface Rect { top: number; left: number; width: number; height: number }

interface BoxGeometry { top: number; left: number; width: number; height: number; opacity: number; borderRadius: number }

export interface PanelOriginAnimation { initial: BoxGeometry; animate: BoxGeometry }

/**
 * @param rect the clicked card's own bounding rect, captured at click time. Null when there is
 *   no origin to grow from (a direct/deep-linked `?asset=` load, or reduced motion) — the caller
 *   falls back to a plain slide-in instead of animating from a meaningless (0,0).
 * @param panelWidth the panel's actual rendered width (mirrors its `min(640px, 100vw)` CSS).
 */
export function panelOriginAnimation(
  rect: Rect | null,
  panelWidth: number,
  viewportWidth: number,
  viewportHeight: number,
): PanelOriginAnimation | null {
  if (!rect) return null
  return {
    initial: { top: rect.top, left: rect.left, width: rect.width, height: rect.height, opacity: 0.6, borderRadius: 10 },
    animate: { top: 0, left: viewportWidth - panelWidth, width: panelWidth, height: viewportHeight, opacity: 1, borderRadius: 0 },
  }
}
