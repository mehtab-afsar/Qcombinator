'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ink, muted, green, amber, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

const pill = (color: string) => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
  fontSize: 10, fontWeight: 600, background: `${color}18`, color,
})

export function InvestorUpdateRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    subject?: string
    headline?: string
    metrics?: {
      mrr?: string | number
      mrrGrowth?: string | number
      arr?: string | number
      customers?: string | number
      burn?: string | number
      runway?: string
      highlights?: string[]
    }
    wins?: string[]
    challenges?: string[]
    asks?: { ask: string; context?: string }[]
    nextMonthFocus?: string
    narrative?: string
    teamUpdates?: string
  }

  const metricItems = d.metrics ? [
    { label: 'MRR', value: d.metrics.mrr, color: green },
    { label: 'MRR Growth', value: d.metrics.mrrGrowth, color: green },
    { label: 'ARR', value: d.metrics.arr, color: blue },
    { label: 'Customers', value: d.metrics.customers, color: blue },
    { label: 'Burn', value: d.metrics.burn, color: amber },
    { label: 'Runway', value: d.metrics.runway, color: ink },
  ].filter(m => m.value !== undefined) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Email Header */}
      <div style={{ padding: '16px 18px', background: `${blue}08`, border: `1px solid ${blue}20`, borderRadius: 12 }}>
        {d.subject && (
          <p style={{ fontSize: 10, color: muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Subject</p>
        )}
        {d.subject && <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 8 }}>{d.subject}</p>}
        {d.headline && <h1 style={{ fontSize: 20, fontWeight: 800, color: ink, lineHeight: 1.3, margin: 0 }}>{d.headline}</h1>}
      </div>

      {/* Metrics Grid */}
      {metricItems.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Key Metrics</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {metricItems.map((m, i) => (
              <div key={i} style={{ padding: '10px 12px', background: `${m.color}08`, border: `1px solid ${m.color}25`, borderRadius: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: m.color === ink ? ink : m.color }}>{String(m.value)}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>{m.label}</p>
              </div>
            ))}
          </div>
          {d.metrics?.highlights && d.metrics.highlights.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {d.metrics.highlights.map((h, i) => (
                <Badge key={i} variant="outline" style={{ fontSize: 10 }}>{h}</Badge>
              ))}
            </div>
          )}
        </CardContent></Card>
      )}

      {/* Wins & Challenges */}
      {((d.wins && d.wins.length > 0) || (d.challenges && d.challenges.length > 0)) && (
        <div style={{ display: 'flex', gap: 10 }}>
          {d.wins && d.wins.length > 0 && (
            <Card style={{ flex: 1 }}><CardContent className="pt-4 pb-4">
              <p style={sectionHead}>Wins</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {d.wins.map((w, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: green, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>✓</span>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{w}</p>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          )}
          {d.challenges && d.challenges.length > 0 && (
            <Card style={{ flex: 1 }}><CardContent className="pt-4 pb-4">
              <p style={sectionHead}>Challenges</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {d.challenges.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: amber, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>!</span>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{c}</p>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          )}
        </div>
      )}

      {/* Narrative */}
      {d.narrative && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Narrative</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.7 }}>{d.narrative}</p>
        </CardContent></Card>
      )}

      {/* Asks */}
      {d.asks && d.asks.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Asks</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.asks.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: `${blue}08`, border: `1px solid ${blue}20`, borderRadius: 8 }}>
                <span style={{ ...pill(blue), flexShrink: 0 }}>{i + 1}</span>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{a.ask}</p>
                  {a.context && <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>{a.context}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Next Month Focus */}
      {d.nextMonthFocus && (
        <div style={{ padding: '10px 14px', background: `${green}08`, border: `1px solid ${green}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: green, marginBottom: 4 }}>Next Month Focus</p>
          <p style={{ fontSize: 12, color: ink }}>{d.nextMonthFocus}</p>
        </div>
      )}

      {/* Team Updates */}
      {d.teamUpdates && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Team Updates</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.teamUpdates}</p>
        </CardContent></Card>
      )}
    </div>
  )
}
