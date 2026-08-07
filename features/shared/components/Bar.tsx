import { ink, bdr, green, amber, red } from '@/lib/constants/colors'

interface BarProps {
  label: string
  used: number
  limit: number | null
}

/** A usage progress bar — "X of Y", turning amber/red as it fills, green/no-fill when unlimited. */
export function Bar({ label, used, limit }: BarProps) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const color = !limit ? green : pct >= 90 ? red : pct >= 70 ? amber : ink

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: ink }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color }}>
          {limit === null ? 'Unlimited' : `${used} of ${limit}`}
        </span>
      </div>
      <div style={{ height: 3, background: bdr, borderRadius: 999, overflow: 'hidden' }}>
        {limit !== null && (
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, transition: 'width .5s ease' }} />
        )}
      </div>
    </div>
  )
}
