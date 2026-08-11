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
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={style}>
      <line x1="18" y1="38" x2="82" y2="38" stroke={color} strokeWidth="11" strokeLinecap="round" />
      <line x1="18" y1="62" x2="58" y2="62" stroke={color} strokeWidth="11" strokeLinecap="round" />
    </svg>
  );
}
