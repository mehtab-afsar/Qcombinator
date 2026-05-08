'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

const pill = (color: string) => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
  fontSize: 10, fontWeight: 600, background: `${color}18`, color,
})

function scoreColor(score: number) {
  if (score >= 75) return green
  if (score >= 50) return amber
  return red
}

function trendArrow(trend?: string | number) {
  if (!trend) return null
  const t = String(trend)
  if (t.startsWith('+') || t.includes('up')) return { symbol: '↑', color: green }
  if (t.startsWith('-') || t.includes('down')) return { symbol: '↓', color: red }
  return { symbol: '→', color: muted }
}

export function BrandHealthRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    period?: string
    overallScore?: number
    mentionVolume?: { total?: number | string; trend?: string | number }
    sentimentBreakdown?: { positive?: number; neutral?: number; negative?: number }
    shareOfVoice?: { competitor: string; percentage: number }[]
    topContent?: { piece: string; reach?: number | string; engagement?: number | string }[]
    recommendations?: string[]
  }

  const score = d.overallScore ?? 0
  const sc = scoreColor(score)
  const sentiment = d.sentimentBreakdown ?? {}
  const totalSentiment = (sentiment.positive ?? 0) + (sentiment.neutral ?? 0) + (sentiment.negative ?? 0)
  const arrow = trendArrow(d.mentionVolume?.trend)

  // Sort share of voice descending for stacked bar
  const sov = (d.shareOfVoice ?? []).slice().sort((a, b) => b.percentage - a.percentage)
  const sovColors = [blue, amber, green, red, muted]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Health Score hero */}
      <Card><CardContent className="pt-4 pb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'center' as const }}>
            <p style={{ fontSize: 48, fontWeight: 900, color: sc, lineHeight: 1 }}>{score}</p>
            <p style={{ fontSize: 10, color: muted, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>Health Score</p>
          </div>
          <div style={{ flex: 1 }}>
            {d.period && <p style={{ fontSize: 11, color: muted, marginBottom: 6 }}>Period: {d.period}</p>}
            {d.mentionVolume && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: ink }}>{d.mentionVolume.total ?? 0}</span>
                <div>
                  <p style={{ fontSize: 10, color: muted }}>Total Mentions</p>
                  {arrow && (
                    <p style={{ fontSize: 11, color: arrow.color, fontWeight: 600 }}>
                      {arrow.symbol} {d.mentionVolume.trend}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent></Card>

      {/* Sentiment Breakdown */}
      {d.sentimentBreakdown && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Sentiment Breakdown</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Positive', value: sentiment.positive ?? 0, color: green },
              { label: 'Neutral', value: sentiment.neutral ?? 0, color: muted },
              { label: 'Negative', value: sentiment.negative ?? 0, color: red },
            ].map(({ label, value, color }) => {
              const pct = totalSentiment > 0 ? Math.round((value / totalSentiment) * 100) : value
              return (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color }}>{label}</span>
                    <span style={{ fontSize: 11, color }}>{pct}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: '#f3f4f6', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 999, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Share of Voice */}
      {sov.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Share of Voice</p>
          {/* Stacked bar */}
          <div style={{ height: 24, borderRadius: 6, overflow: 'hidden', display: 'flex', marginBottom: 10 }}>
            {sov.map((item, i) => (
              <div key={i} style={{
                width: `${item.percentage}%`, background: sovColors[i % sovColors.length],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', minWidth: 2,
              }}>
                {item.percentage >= 6 && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' as const, paddingInline: 4 }}>
                    {item.percentage}%
                  </span>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
            {sov.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: sovColors[i % sovColors.length] }} />
                <span style={{ fontSize: 11, color: muted }}>{item.competitor}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: ink }}>{item.percentage}%</span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Top Content */}
      {d.topContent && d.topContent.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Top Content</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.topContent.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', borderBottom: i < (d.topContent?.length ?? 0) - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: `${blue}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: blue, flexShrink: 0 }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: 12, color: ink, flex: 1 }}>{item.piece}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {item.reach && <span style={pill(blue)}>Reach: {item.reach}</span>}
                  {item.engagement && <span style={pill(green)}>Eng: {item.engagement}</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Recommendations */}
      {d.recommendations && d.recommendations.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Recommendations</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.recommendations.map((rec, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${green}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: green, flexShrink: 0 }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{rec}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

    </div>
  )
}
