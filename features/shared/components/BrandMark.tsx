import { ink } from '@/lib/constants/colors';

interface BrandMarkProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

/**
 * The Edge Alpha mark — two parallel strokes, one long one short. Pure inline SVG (no image
 * file) so it scales cleanly from favicon to hero size and recolors per context via `color`.
 */
export function BrandMark({ size = 28, color = ink, style }: BrandMarkProps) {
  // flexShrink: 0 — an SVG's default `overflow: hidden` makes its flex-basis resolve to 0 for
  // shrink purposes, so as a flex child next to a wider sibling (e.g. a name label competing for
  // space in a collapsing sidebar rail) it gets crushed to a sliver instead of clipping the
  // sibling. Avatar (features/shared/components/Avatar.tsx) already sets this; this mark didn't.
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ flexShrink: 0, ...style }}>
      <line x1="18" y1="38" x2="82" y2="38" stroke={color} strokeWidth="11" strokeLinecap="round" />
      <line x1="18" y1="62" x2="58" y2="62" stroke={color} strokeWidth="11" strokeLinecap="round" />
    </svg>
  );
}
