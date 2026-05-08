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

const SEVERITY_COLOR: Record<string, string> = { high: red, critical: red, medium: amber, low: green }
const EFFORT_COLOR: Record<string, string> = { high: red, medium: amber, low: green }

function scoreColor(score: number) {
  if (score >= 80) return green
  if (score >= 60) return amber
  return red
}

export function SEOAuditRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    summary?: string
    overallScore?: number
    topKeywords?: { keyword: string; searchVolume?: number | string; difficulty?: number | string; currentRank?: number | string; opportunity?: string }[]
    contentGaps?: { topic: string; intent?: string; competitorRanking?: string }[]
    technicalIssues?: { issue: string; severity?: string; fix?: string }[]
    priorityActions?: { action: string; estimatedImpact?: string; effort?: string }[]
    quickWins?: string[]
  }

  const score = d.overallScore ?? 0
  const sc = scoreColor(score)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Score hero */}
      <Card><CardContent className="pt-4 pb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Ring-style score */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
            background: `conic-gradient(${sc} ${score * 3.6}deg, #e5e7eb ${score * 3.6}deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 0 6px white inset`,
          }}>
            <div style={{
              width: 58, height: 58, borderRadius: '50%', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column',
            }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: sc, lineHeight: 1 }}>{score}</span>
              <span style={{ fontSize: 9, color: muted, fontWeight: 600 }}>/100</span>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: ink, marginBottom: 4 }}>SEO Health Score</p>
            {d.summary && <p style={{ fontSize: 12, color: muted, lineHeight: 1.6 }}>{d.summary}</p>}
          </div>
        </div>
      </CardContent></Card>

      {/* Top Keywords table */}
      {d.topKeywords && d.topKeywords.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Top Keywords</p>
          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid #e5e7eb` }}>
                  {['Keyword', 'Volume', 'Difficulty', 'Current Rank', 'Opportunity'].map(h => (
                    <th key={h} style={{ textAlign: 'left' as const, padding: '4px 8px', color: muted, fontWeight: 600, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.topKeywords.map((kw, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid #f3f4f6` }}>
                    <td style={{ padding: '6px 8px', color: ink, fontWeight: 600 }}>{kw.keyword}</td>
                    <td style={{ padding: '6px 8px', color: muted }}>{kw.searchVolume ?? '—'}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={pill(
                        Number(kw.difficulty) >= 70 ? red : Number(kw.difficulty) >= 40 ? amber : green
                      )}>{kw.difficulty ?? '—'}</span>
                    </td>
                    <td style={{ padding: '6px 8px', color: muted }}>{kw.currentRank ?? '—'}</td>
                    <td style={{ padding: '6px 8px' }}>
                      {kw.opportunity && <span style={pill(blue)}>{kw.opportunity}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      )}

      {/* Content Gaps */}
      {d.contentGaps && d.contentGaps.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Content Gaps</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.contentGaps.map((gap, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: `${amber}08`, borderRadius: 8, border: `1px solid ${amber}20` }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 2 }}>{gap.topic}</p>
                  {gap.intent && <span style={pill(blue)}>{gap.intent}</span>}
                </div>
                {gap.competitorRanking && (
                  <p style={{ fontSize: 10, color: muted, flexShrink: 0 }}>Competitor: {gap.competitorRanking}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Technical Issues */}
      {d.technicalIssues && d.technicalIssues.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Technical Issues</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.technicalIssues.map((issue, i) => {
              const sc = SEVERITY_COLOR[issue.severity?.toLowerCase() ?? ''] ?? muted
              return (
                <div key={i} style={{ borderLeft: `3px solid ${sc}`, paddingLeft: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: ink, flex: 1 }}>{issue.issue}</p>
                    {issue.severity && <span style={pill(sc)}>{issue.severity}</span>}
                  </div>
                  {issue.fix && <p style={{ fontSize: 11, color: green }}>Fix: {issue.fix}</p>}
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Priority Actions */}
      {d.priorityActions && d.priorityActions.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Priority Actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.priorityActions.map((pa, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: `${blue}06`, borderRadius: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: ink, fontWeight: 600, marginBottom: 4 }}>{pa.action}</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {pa.estimatedImpact && <span style={pill(green)}>Impact: {pa.estimatedImpact}</span>}
                    {pa.effort && <span style={pill(EFFORT_COLOR[pa.effort.toLowerCase()] ?? muted)}>Effort: {pa.effort}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Quick Wins */}
      {d.quickWins && d.quickWins.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Quick Wins</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(Array.isArray(d.quickWins) ? d.quickWins : [d.quickWins]).map((win, i) => (
              <p key={i} style={{ fontSize: 12, color: green, paddingLeft: 10, lineHeight: 1.6 }}>✓ {win}</p>
            ))}
          </div>
        </CardContent></Card>
      )}

    </div>
  )
}
