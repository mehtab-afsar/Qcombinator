'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

const pill = (color: string) => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
  fontSize: 10, fontWeight: 600, background: `${color}18`, color,
})

const STATUS_COLOR: Record<string, string> = {
  'in progress': blue,
  'planned': green,
  'blocked': red,
  'on hold': amber,
  'shipped': green,
  'discovery': muted,
}

type NowItem = { initiative: string; owner?: string; rationale?: string; riceScore?: number | string; status?: string }
type NextItem = { initiative: string; rationale?: string; dependency?: string }
type LaterItem = { initiative: string; rationale?: string }

export function RoadmapRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    vision?: string
    now?: NowItem[]
    next?: NextItem[]
    later?: LaterItem[]
    dependencies?: string[]
    themes?: string[]
  }

  const COLUMNS = [
    { key: 'now' as const, label: 'Now', color: blue, items: d.now ?? [] },
    { key: 'next' as const, label: 'Next', color: green, items: d.next ?? [] },
    { key: 'later' as const, label: 'Later', color: amber, items: d.later ?? [] },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Theme Chips */}
      {d.themes && d.themes.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {d.themes.map((t, i) => (
            <span key={i} style={{ ...pill(blue), fontSize: 11 }}>{t}</span>
          ))}
        </div>
      )}

      {/* Vision */}
      {d.vision && (
        <div style={{ padding: '14px 16px', background: `${blue}08`, border: `1.5px solid ${blue}30`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 8 }}>
            Vision
          </p>
          <p style={{ fontSize: 14, fontWeight: 500, color: ink, lineHeight: 1.7 }}>{d.vision}</p>
        </div>
      )}

      {/* Now / Next / Later Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {COLUMNS.map(({ label, color, items }) => (
          <div key={label}>
            {/* Column Header */}
            <div style={{ padding: '6px 10px', background: `${color}15`, borderRadius: '8px 8px 0 0', marginBottom: 0, textAlign: 'center', border: `1px solid ${color}30`, borderBottom: 'none' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</p>
            </div>
            {/* Items */}
            <div style={{ border: `1px solid ${color}25`, borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
              {items.length === 0 ? (
                <div style={{ padding: '14px 12px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: muted }}>No items</p>
                </div>
              ) : items.map((item, i) => {
                const nowItem = item as NowItem
                const statusColor = nowItem.status ? (STATUS_COLOR[nowItem.status.toLowerCase()] ?? muted) : undefined
                return (
                  <div key={i} style={{ padding: '10px 12px', borderBottom: i < items.length - 1 ? `1px solid ${muted}15` : 'none', background: i % 2 === 0 ? 'transparent' : `${muted}03` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4, marginBottom: 3 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, lineHeight: 1.4, flex: 1 }}>{item.initiative}</p>
                      {statusColor && nowItem.status && (
                        <span style={{ ...pill(statusColor), fontSize: 9, flexShrink: 0 }}>{nowItem.status}</span>
                      )}
                    </div>
                    {nowItem.riceScore !== undefined && (
                      <p style={{ fontSize: 10, color: muted, marginBottom: 2 }}>RICE: <span style={{ fontWeight: 700, color: blue }}>{nowItem.riceScore}</span></p>
                    )}
                    {nowItem.owner && (
                      <p style={{ fontSize: 10, color: muted, marginBottom: 2 }}>Owner: {nowItem.owner}</p>
                    )}
                    {(item as NextItem).dependency && (
                      <p style={{ fontSize: 10, color: amber, marginBottom: 2 }}>Deps: {(item as NextItem).dependency}</p>
                    )}
                    {item.rationale && (
                      <p style={{ fontSize: 10, color: muted, lineHeight: 1.5, marginTop: 2 }}>{item.rationale}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Dependencies */}
      {d.dependencies && d.dependencies.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Dependencies</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {d.dependencies.map((dep, i) => (
                <Badge key={i} variant="outline" style={{ fontSize: 10 }}>{dep}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
