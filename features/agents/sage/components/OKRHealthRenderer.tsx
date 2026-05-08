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

const HEALTH_COLOR: Record<string, string> = { green: green, yellow: amber, red: red, on_track: green, at_risk: amber, behind: red }
const STATUS_COLOR: Record<string, string> = { 'on track': green, 'at risk': amber, behind: red, complete: green }

export function OKRHealthRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    overallHealth?: string
    weekInQuarter?: number
    summary?: string
    objectives?: {
      objective: string
      health: string
      confidence: number
      keyResults: {
        kr: string
        target: string
        current: string
        progress: number
        status: string
      }[]
      blockers?: string[]
      weeklyWin?: string
    }[]
    topBlockers?: string[]
    atRiskObjectives?: string[]
    recommendations?: string[]
  }

  const healthColor = HEALTH_COLOR[d.overallHealth?.toLowerCase() ?? ''] ?? muted
  const totalWeeks = 13
  const weekPct = d.weekInQuarter ? Math.min((d.weekInQuarter / totalWeeks) * 100, 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Health Indicator + Week Progress */}
      <div style={{
        padding: '16px 20px',
        background: `${healthColor}10`,
        border: `1px solid ${healthColor}30`,
        borderRadius: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          {/* Traffic Light */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            {['green', 'yellow', 'red'].map(c => (
              <div key={c} style={{
                width: 12, height: 12, borderRadius: '50%',
                background: HEALTH_COLOR[c],
                opacity: d.overallHealth?.toLowerCase() === c || (c === 'yellow' && d.overallHealth?.toLowerCase() === 'amber') ? 1 : 0.2,
              }} />
            ))}
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: healthColor }}>Overall Health</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: healthColor, textTransform: 'capitalize' }}>{d.overallHealth ?? '—'}</p>
          </div>
          {d.weekInQuarter !== undefined && (
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: ink }}>W{d.weekInQuarter}</p>
              <p style={{ fontSize: 11, color: muted }}>of 13</p>
            </div>
          )}
        </div>
        {/* Week progress bar */}
        {d.weekInQuarter !== undefined && (
          <div>
            <p style={{ fontSize: 10, color: muted, marginBottom: 4 }}>Quarter Progress</p>
            <div style={{ height: 6, background: `${blue}20`, borderRadius: 3 }}>
              <div style={{ height: 6, width: `${weekPct}%`, background: blue, borderRadius: 3 }} />
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {d.summary && (
        <Card><CardContent className="pt-3 pb-3">
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.summary}</p>
        </CardContent></Card>
      )}

      {/* Top Blockers */}
      {d.topBlockers && d.topBlockers.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Top Blockers</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {d.topBlockers.map((b, i) => (
              <p key={i} style={{ fontSize: 12, color: red, paddingLeft: 10, lineHeight: 1.5 }}>⚑ {b}</p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Objectives */}
      {d.objectives && d.objectives.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Objectives</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {d.objectives.map((obj, i) => {
              const objHealthColor = HEALTH_COLOR[obj.health?.toLowerCase()] ?? muted
              return (
                <div key={i} style={{
                  padding: '12px 14px',
                  background: `${objHealthColor}07`,
                  border: `1px solid ${objHealthColor}25`,
                  borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: objHealthColor, marginTop: 4, flexShrink: 0 }} />
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink, flex: 1, lineHeight: 1.4 }}>{obj.objective}</p>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <span style={pill(objHealthColor)}>{obj.health}</span>
                      {obj.confidence !== undefined && (
                        <span style={{ fontSize: 10, color: muted, alignSelf: 'center' }}>{obj.confidence}% conf.</span>
                      )}
                    </div>
                  </div>

                  {/* Key Results */}
                  {obj.keyResults && obj.keyResults.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 18, marginBottom: 6 }}>
                      {obj.keyResults.map((kr, j) => {
                        const krStatusColor = STATUS_COLOR[kr.status?.toLowerCase()] ?? muted
                        return (
                          <div key={j}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                              <p style={{ fontSize: 11, color: ink, flex: 1, lineHeight: 1.4 }}>{kr.kr}</p>
                              <span style={pill(krStatusColor)}>{kr.status}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ flex: 1, height: 4, background: `${krStatusColor}20`, borderRadius: 2 }}>
                                <div style={{ height: 4, width: `${Math.min(kr.progress ?? 0, 100)}%`, background: krStatusColor, borderRadius: 2 }} />
                              </div>
                              <p style={{ fontSize: 10, color: muted, whiteSpace: 'nowrap' }}>{kr.current} / {kr.target}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Weekly Win */}
                  {obj.weeklyWin && (
                    <p style={{ fontSize: 11, color: green, paddingLeft: 18, marginBottom: 4 }}>✓ {obj.weeklyWin}</p>
                  )}

                  {/* Blockers */}
                  {obj.blockers && obj.blockers.length > 0 && (
                    <div style={{ paddingLeft: 18 }}>
                      {obj.blockers.map((b, j) => (
                        <p key={j} style={{ fontSize: 11, color: red, lineHeight: 1.4 }}>⚑ {b}</p>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* At-Risk Objectives */}
      {d.atRiskObjectives && d.atRiskObjectives.length > 0 && (
        <div style={{ padding: '12px 14px', background: `${amber}08`, border: `1px solid ${amber}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: amber, marginBottom: 6 }}>At-Risk Objectives</p>
          {d.atRiskObjectives.map((o, i) => (
            <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.5, paddingLeft: 8 }}>⚠ {o}</p>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {d.recommendations && d.recommendations.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Recommendations</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {d.recommendations.map((r, i) => (
              <p key={i} style={{ fontSize: 12, color: blue, paddingLeft: 10, lineHeight: 1.6 }}>→ {r}</p>
            ))}
          </div>
        </CardContent></Card>
      )}
    </div>
  )
}
