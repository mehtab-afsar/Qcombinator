'use client'

import { bdr, ink, muted, blue } from '@/lib/constants/colors'

interface Props {
  label:     string
  used:      number
  limit:     number | null  // null = unlimited
  compact?:  boolean        // small pill vs full bar
}

export function UsageMeter({ label, used, limit, compact = false }: Props) {
  const unlimited = limit === null
  const pct       = unlimited ? 0 : Math.min(used / limit, 1)
  const near       = !unlimited && pct >= 0.8
  const over       = !unlimited && used >= limit

  const barColor = over ? '#DC2626' : near ? '#D97706' : blue
  const textColor = over ? '#DC2626' : near ? '#D97706' : muted

  if (compact) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 999,
        background: over ? '#FEF2F2' : near ? '#FFFBEB' : `${blue}10`,
        border: `1px solid ${over ? '#FECACA' : near ? '#FDE68A' : blue + '25'}`,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: textColor }}>
          {label}: {unlimited ? '∞' : `${used}/${limit}`}
        </span>
        {!unlimited && (
          <div style={{ width: 40, height: 4, background: bdr, borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: barColor, borderRadius: 999, width: `${pct * 100}%`, transition: 'width 0.3s' }} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: ink }}>{label}</span>
        <span style={{ fontSize: 12, color: textColor, fontWeight: over || near ? 600 : 400 }}>
          {unlimited
            ? 'Unlimited'
            : over
              ? `${used}/${limit} — limit reached`
              : near
                ? `${used}/${limit} — running low`
                : `${used} / ${limit}`
          }
        </span>
      </div>
      {!unlimited && (
        <div style={{ height: 6, background: bdr, borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: barColor, borderRadius: 999,
            width: `${pct * 100}%`, transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
      )}
      {unlimited && (
        <div style={{ height: 6, background: `${blue}20`, borderRadius: 999 }} />
      )}
    </div>
  )
}
