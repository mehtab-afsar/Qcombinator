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

const GRADE_COLOR: Record<string, string> = { A: green, B: blue, C: amber, D: red, F: red }
const STATUS_COLOR: Record<string, string> = { strong: green, adequate: blue, developing: amber, weak: red }

export function InvestorReadinessRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    overallScore?: number
    grade?: string
    dimensions?: {
      name: string
      score: number
      status: string
      findings: string[]
      actions: string[]
    }[]
    investorPerception?: string
    keyStrengths?: string[]
    criticalGaps?: string[]
    recommendedNextRaiseTimeline?: string
    narrativeSummary?: string
  }

  const gradeColor = GRADE_COLOR[d.grade ?? ''] ?? muted

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header: Score + Grade */}
      {(d.overallScore !== undefined || d.grade) && (
        <div style={{
          padding: '18px 20px',
          background: `${gradeColor}10`,
          border: `1px solid ${gradeColor}30`,
          borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          {d.grade && (
            <div style={{
              width: 56, height: 56, borderRadius: 12,
              background: gradeColor, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {d.grade}
            </div>
          )}
          <div>
            {d.overallScore !== undefined && (
              <p style={{ fontSize: 28, fontWeight: 800, color: gradeColor, lineHeight: 1 }}>
                {d.overallScore}<span style={{ fontSize: 14, fontWeight: 500, color: muted }}>/100</span>
              </p>
            )}
            <p style={{ fontSize: 12, color: muted, marginTop: 2 }}>Investor Readiness Score</p>
          </div>
          {d.investorPerception && (
            <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, marginLeft: 8 }}>{d.investorPerception}</p>
          )}
        </div>
      )}

      {/* Key Strengths */}
      {d.keyStrengths && d.keyStrengths.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Key Strengths</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {d.keyStrengths.map((s, i) => (
              <p key={i} style={{ fontSize: 12, color: green, paddingLeft: 10, lineHeight: 1.6 }}>✓ {s}</p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Critical Gaps */}
      {d.criticalGaps && d.criticalGaps.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Critical Gaps</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {d.criticalGaps.map((g, i) => (
              <p key={i} style={{ fontSize: 12, color: red, paddingLeft: 10, lineHeight: 1.6 }}>✗ {g}</p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Dimensions */}
      {d.dimensions && d.dimensions.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Dimension Breakdown</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.dimensions.map((dim, i) => {
              const statusColor = STATUS_COLOR[dim.status?.toLowerCase()] ?? muted
              return (
                <div key={i} style={{
                  padding: '12px 14px',
                  background: `${statusColor}08`,
                  border: `1px solid ${statusColor}25`,
                  borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{
                      minWidth: 36, height: 22, borderRadius: 6,
                      background: statusColor, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff',
                    }}>
                      {dim.score}
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink, flex: 1 }}>{dim.name}</p>
                    <span style={pill(statusColor)}>{dim.status}</span>
                  </div>
                  {/* Score bar */}
                  <div style={{ height: 4, background: `${statusColor}20`, borderRadius: 2, marginBottom: 8 }}>
                    <div style={{ height: 4, width: `${dim.score}%`, background: statusColor, borderRadius: 2 }} />
                  </div>
                  {dim.findings && dim.findings.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted, marginBottom: 4 }}>Findings</p>
                      {dim.findings.map((f, j) => (
                        <p key={j} style={{ fontSize: 11, color: ink, lineHeight: 1.5, paddingLeft: 8 }}>• {f}</p>
                      ))}
                    </div>
                  )}
                  {dim.actions && dim.actions.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted, marginBottom: 4 }}>Actions</p>
                      {dim.actions.map((a, j) => (
                        <p key={j} style={{ fontSize: 11, color: blue, lineHeight: 1.5, paddingLeft: 8 }}>→ {a}</p>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Raise Timeline */}
      {d.recommendedNextRaiseTimeline && (
        <div style={{
          padding: '12px 16px',
          background: `${blue}08`,
          border: `1px solid ${blue}25`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>📅</span>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 2 }}>Recommended Raise Timeline</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{d.recommendedNextRaiseTimeline}</p>
          </div>
        </div>
      )}

      {/* Narrative Summary */}
      {d.narrativeSummary && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Narrative Summary</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.7 }}>{d.narrativeSummary}</p>
        </CardContent></Card>
      )}
    </div>
  )
}
