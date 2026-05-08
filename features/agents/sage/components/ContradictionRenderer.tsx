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

const SEVERITY_COLOR: Record<string, string> = { critical: red, high: red, medium: amber, low: green }

export function ContradictionRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    summary?: string
    contradictions?: {
      area: string
      agentA: string
      claimA: string
      agentB: string
      claimB: string
      severity: string
      resolution?: string
      impact?: string
    }[]
    consistencyScore?: number
    recommendation?: string
  }

  const scoreColor = (d.consistencyScore ?? 0) >= 80 ? green : (d.consistencyScore ?? 0) >= 60 ? amber : red

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Consistency Score Meter */}
      {d.consistencyScore !== undefined && (
        <div style={{
          padding: '16px 20px',
          background: `${scoreColor}10`,
          border: `1px solid ${scoreColor}30`,
          borderRadius: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: scoreColor }}>Consistency Score</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: scoreColor, lineHeight: 1.1 }}>
                {d.consistencyScore}<span style={{ fontSize: 14, fontWeight: 500, color: muted }}>/100</span>
              </p>
            </div>
            {d.contradictions && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: ink }}>{d.contradictions.length}</p>
                <p style={{ fontSize: 11, color: muted }}>Contradictions</p>
              </div>
            )}
          </div>
          <div style={{ height: 6, background: `${scoreColor}20`, borderRadius: 3 }}>
            <div style={{ height: 6, width: `${d.consistencyScore}%`, background: scoreColor, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Summary */}
      {d.summary && (
        <Card><CardContent className="pt-3 pb-3">
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.summary}</p>
        </CardContent></Card>
      )}

      {/* Contradictions */}
      {d.contradictions && d.contradictions.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Contradictions Found</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {d.contradictions.map((c, i) => {
              const sevColor = SEVERITY_COLOR[c.severity?.toLowerCase()] ?? muted
              const isCritical = c.severity?.toLowerCase() === 'critical'
              return (
                <div key={i} style={{
                  border: `2px solid ${sevColor}${isCritical ? '60' : '30'}`,
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: isCritical ? `${red}04` : undefined,
                }}>
                  {/* Header */}
                  <div style={{
                    padding: '8px 12px',
                    background: `${sevColor}12`,
                    borderBottom: `1px solid ${sevColor}20`,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    {isCritical && <span style={{ fontSize: 13 }}>⚠️</span>}
                    <p style={{ fontSize: 12, fontWeight: 700, color: ink, flex: 1 }}>{c.area}</p>
                    <span style={pill(sevColor)}>{c.severity}</span>
                  </div>
                  {/* Claims comparison */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                    <div style={{ padding: '10px 12px', borderRight: `1px solid ${muted}20` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted, marginBottom: 4 }}>{c.agentA}</p>
                      <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{c.claimA}</p>
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted, marginBottom: 4 }}>{c.agentB}</p>
                      <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{c.claimB}</p>
                    </div>
                  </div>
                  {/* Impact */}
                  {c.impact && (
                    <div style={{ padding: '6px 12px', background: `${sevColor}08`, borderTop: `1px solid ${sevColor}15` }}>
                      <p style={{ fontSize: 11, color: sevColor, lineHeight: 1.4 }}>Impact: {c.impact}</p>
                    </div>
                  )}
                  {/* Resolution */}
                  {c.resolution && (
                    <div style={{ padding: '8px 12px', background: `${green}08`, borderTop: `1px solid ${green}20` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: green, marginBottom: 3 }}>Resolution</p>
                      <p style={{ fontSize: 12, color: green, lineHeight: 1.5 }}>✓ {c.resolution}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Recommendation */}
      {d.recommendation && (
        <div style={{
          padding: '12px 16px',
          background: `${blue}08`,
          border: `1px solid ${blue}25`,
          borderRadius: 10,
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 4 }}>Recommendation</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.recommendation}</p>
        </div>
      )}
    </div>
  )
}
