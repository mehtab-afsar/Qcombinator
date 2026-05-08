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

const IMPACT_COLOR: Record<string, string> = {
  high: red,
  medium: amber,
  low: green,
}

const PRIORITY_COLOR = (score: number) => score >= 8 ? red : score >= 5 ? amber : green

export function ProductInsightRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    period?: string
    executiveSummary?: string
    topInsights?: { insight: string; supporting_data?: string; action?: string; impact?: string }[]
    frictionPoints?: { area: string; description?: string; affectedSegment?: string; priorityScore?: number }[]
    usagePatterns?: { topFeatures?: string[]; underusedFeatures?: string[]; powerUserBehaviors?: string[] }
    recommendations?: string[]
  }

  const sortedFriction = d.frictionPoints
    ? [...d.frictionPoints].sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Period */}
      {d.period && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={pill(muted)}>{d.period}</span>
        </div>
      )}

      {/* Executive Summary Callout */}
      {d.executiveSummary && (
        <div style={{ padding: '14px 16px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 8 }}>
            Executive Summary
          </p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.8 }}>{d.executiveSummary}</p>
        </div>
      )}

      {/* Top Insights */}
      {d.topInsights && d.topInsights.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Top Insights</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {d.topInsights.map((ins, i) => {
                const impactColor = IMPACT_COLOR[(ins.impact ?? '').toLowerCase()] ?? muted
                return (
                  <div key={i} style={{ padding: '10px 12px', border: `1px solid ${muted}20`, borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, flex: 1, paddingRight: 8 }}>{ins.insight}</p>
                      {ins.impact && <span style={pill(impactColor)}>{ins.impact}</span>}
                    </div>
                    {ins.supporting_data && (
                      <p style={{ fontSize: 11, color: muted, marginBottom: ins.action ? 5 : 0, lineHeight: 1.5 }}>
                        Data: {ins.supporting_data}
                      </p>
                    )}
                    {ins.action && (
                      <p style={{ fontSize: 11, color: blue, lineHeight: 1.5 }}>
                        Action: {ins.action}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Friction Points — severity ordered */}
      {sortedFriction.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Friction Points</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sortedFriction.map((fp, i) => {
                const score = fp.priorityScore ?? 0
                const color = PRIORITY_COLOR(score)
                return (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: `${color}06`, border: `1px solid ${color}20`, borderRadius: 8 }}>
                    {fp.priorityScore !== undefined && (
                      <div style={{ width: 26, height: 26, borderRadius: 6, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {fp.priorityScore}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 2 }}>{fp.area}</p>
                      {fp.description && <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{fp.description}</p>}
                      {fp.affectedSegment && <p style={{ fontSize: 10, color: muted, marginTop: 3 }}>Segment: {fp.affectedSegment}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Patterns — 3 columns */}
      {d.usagePatterns && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Usage Patterns</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: 'Top Features', items: d.usagePatterns.topFeatures, color: green },
                { label: 'Underused', items: d.usagePatterns.underusedFeatures, color: amber },
                { label: 'Power User Behaviors', items: d.usagePatterns.powerUserBehaviors, color: blue },
              ].map((col, i) => col.items && col.items.length > 0 ? (
                <div key={i} style={{ padding: '8px 10px', background: `${col.color}07`, borderRadius: 8, border: `1px solid ${col.color}20` }}>
                  <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: col.color, marginBottom: 6 }}>
                    {col.label}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {col.items.map((item, j) => (
                      <p key={j} style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>• {item}</p>
                    ))}
                  </div>
                </div>
              ) : null)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {d.recommendations && d.recommendations.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Priority Actions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {d.recommendations.map((rec, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingTop: 2 }}>{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
