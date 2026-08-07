import { CSSProperties, ReactNode } from 'react'
import { blue, green, amber, red, muted, surf, bdr, purple, cyan, pink, indigo, alpha } from '@/features/shared/tokens'

export type BadgeVariant = 'blue' | 'green' | 'amber' | 'red' | 'neutral' | 'purple' | 'cyan' | 'pink' | 'indigo'

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  blue:    { bg: alpha(blue, 0.08),   color: blue,    border: alpha(blue, 0.35)   },
  green:   { bg: alpha(green, 0.08),  color: green,   border: alpha(green, 0.35) },
  amber:   { bg: alpha(amber, 0.08),  color: amber,   border: alpha(amber, 0.35) },
  red:     { bg: alpha(red, 0.08),    color: red,     border: alpha(red, 0.35)   },
  neutral: { bg: surf,                color: muted,   border: bdr                },
  purple:  { bg: alpha(purple, 0.08), color: purple,  border: alpha(purple, 0.35)},
  // Owner-attribution colors (F09 artifact organization) — one per executive, reusing
  // already-defined palette tokens that had no assigned purpose until now.
  cyan:    { bg: alpha(cyan, 0.08),   color: cyan,    border: alpha(cyan, 0.35)  },
  pink:    { bg: alpha(pink, 0.08),   color: pink,    border: alpha(pink, 0.35) },
  indigo:  { bg: alpha(indigo, 0.08), color: indigo,  border: alpha(indigo, 0.35)},
}

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  dot?: boolean
  /** Overrides just the dot's color, independent of variant — e.g. a neutral pill
   *  ("Demo data —", muted text) with an amber/cyan status dot doing the signaling. */
  dotColor?: string
  style?: CSSProperties
}

export function Badge({ children, variant = 'neutral', dot = false, dotColor, style }: BadgeProps) {
  const s = VARIANT_STYLES[variant]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: dot ? 5 : 0,
      padding: '2px 8px', borderRadius: 9999,
      fontSize: 10, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      lineHeight: 1.6, flexShrink: 0,
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor ?? s.color, flexShrink: 0 }} />}
      {children}
    </span>
  )
}

/** Score badge: colour scales with value (green ≥75, amber ≥55, else red) */
export function ScoreBadge({ score, label = 'Q' }: { score: number; label?: string }) {
  const variant: BadgeVariant = score >= 75 ? 'green' : score >= 55 ? 'amber' : 'red'
  return <Badge variant={variant}>{label}{score}</Badge>
}
