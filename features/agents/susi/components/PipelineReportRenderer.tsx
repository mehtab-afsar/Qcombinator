'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

const pill = (color: string): React.CSSProperties => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
  fontSize: 10, fontWeight: 600, background: `${color}18`, color,
})

const statBox = (accent: string): React.CSSProperties => ({
  padding: '10px 12px',
  background: `${accent}08`,
  border: `1px solid ${accent}20`,
  borderRadius: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
})

export function PipelineReportRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    summary?: string
    metrics?: {
      totalDeals?: number
      totalValue?: string | number
      weightedValue?: string | number
      averageDealSize?: string | number
      averageSalesCycle?: string | number
      closeRate?: string | number
      monthlyTarget?: string | number
      forecastVsTarget?: string | number
    }
    stageBreakdown?: { stage: string; count: number; value: string | number; avgDaysInStage?: number }[]
    staleDeals?: { company: string; stage: string; daysStale: number; recommendedAction: string }[]
    topOpportunities?: { company: string; value: string | number; stage: string; nextAction: string; closeDate?: string }[]
    recommendations?: string[]
  }

  const metrics = d.metrics ?? {}

  const metricPairs: { label: string; value: string | number | undefined; accent: string }[] = [
    { label: 'Total Deals',       value: metrics.totalDeals,        accent: blue },
    { label: 'Total Value',       value: metrics.totalValue,        accent: green },
    { label: 'Weighted Value',    value: metrics.weightedValue,     accent: green },
    { label: 'Avg Deal Size',     value: metrics.averageDealSize,   accent: blue },
    { label: 'Avg Sales Cycle',   value: metrics.averageSalesCycle, accent: amber },
    { label: 'Close Rate',        value: metrics.closeRate,         accent: green },
    { label: 'Monthly Target',    value: metrics.monthlyTarget,     accent: amber },
    { label: 'Forecast vs Target',value: metrics.forecastVsTarget,  accent: blue },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Summary */}
      {d.summary && (
        <Card><CardContent className="pt-3 pb-3">
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.summary}</p>
        </CardContent></Card>
      )}

      {/* Metrics grid */}
      {Object.keys(metrics).length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Pipeline Metrics</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {metricPairs.map(({ label, value, accent }) =>
              value !== undefined ? (
                <div key={label} style={statBox(accent)}>
                  <span style={{ fontSize: 10, color: muted, fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: ink }}>{String(value)}</span>
                </div>
              ) : null
            )}
          </div>
        </CardContent></Card>
      )}

      {/* Stage Breakdown */}
      {d.stageBreakdown && d.stageBreakdown.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Stage Breakdown</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.stageBreakdown.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: `${blue}06`, borderRadius: 8, border: `1px solid ${blue}15` }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{s.stage}</span>
                </div>
                <span style={pill(blue)}>{s.count} deal{s.count !== 1 ? 's' : ''}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: green }}>{String(s.value)}</span>
                {s.avgDaysInStage !== undefined && (
                  <span style={{ fontSize: 10, color: muted }}>{s.avgDaysInStage}d avg</span>
                )}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Stale Deals */}
      {d.staleDeals && d.staleDeals.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Stale Deals</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.staleDeals.map((deal, i) => (
              <div key={i} style={{ padding: '10px 12px', background: `${amber}08`, border: `1px solid ${amber}25`, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: ink, flex: 1 }}>{deal.company}</span>
                  <span style={pill(amber)}>{deal.stage}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: red }}>{deal.daysStale}d stale</span>
                </div>
                <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>→ {deal.recommendedAction}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Top Opportunities */}
      {d.topOpportunities && d.topOpportunities.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Top Opportunities</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.topOpportunities.map((opp, i) => (
              <div key={i} style={{ padding: '10px 12px', background: `${green}08`, border: `1px solid ${green}20`, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: ink, flex: 1 }}>{opp.company}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: green }}>{String(opp.value)}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 5, flexWrap: 'wrap' as const }}>
                  <span style={pill(blue)}>{opp.stage}</span>
                  {opp.closeDate && <span style={pill(muted)}>Close: {opp.closeDate}</span>}
                </div>
                <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>Next: {opp.nextAction}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Recommendations */}
      {d.recommendations && d.recommendations.length > 0 && (
        <div style={{ padding: '12px 14px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: blue, marginBottom: 8 }}>Recommendations</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.recommendations.map((r, i) => (
              <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>
                <span style={{ fontWeight: 700, color: blue, marginRight: 6 }}>{i + 1}.</span>{r}
              </p>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
