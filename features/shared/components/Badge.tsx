import { CSSProperties, ReactNode } from 'react'
import { blue, green, amber, red, muted, surf, bdr } from '@/features/shared/tokens'

export type BadgeVariant = 'blue' | 'green' | 'amber' | 'red' | 'neutral' | 'purple'

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  blue:    { bg: '#EFF6FF', color: blue,    border: '#BFDBFE' },
  green:   { bg: '#F0FDF4', color: green,   border: '#86EFAC' },
  amber:   { bg: '#FFFBEB', color: amber,   border: '#FDE68A' },
  red:     { bg: '#FEF2F2', color: red,     border: '#FECACA' },
  neutral: { bg: surf,      color: muted,   border: bdr       },
  purple:  { bg: '#F5F3FF', color: '#7C3AED', border: '#C4B5FD' },
}

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  dot?: boolean
  style?: CSSProperties
}

export function Badge({ children, variant = 'neutral', dot = false, style }: BadgeProps) {
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
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />}
      {children}
    </span>
  )
}

/** Score badge: colour scales with value (green ≥75, amber ≥55, else red) */
export function ScoreBadge({ score, label = 'Q' }: { score: number; label?: string }) {
  const variant: BadgeVariant = score >= 75 ? 'green' : score >= 55 ? 'amber' : 'red'
  return <Badge variant={variant}>{label}{score}</Badge>
}
