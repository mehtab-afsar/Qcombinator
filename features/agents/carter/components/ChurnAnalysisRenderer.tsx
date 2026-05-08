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

export function ChurnAnalysisRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    summary?: string
    churnRate?: {
      current: number | string
      lastMonth: number | string
      trend: string
      benchmark?: number | string
    }
    churnBySegment?: { segment: string; rate: number | string; count?: number }[]
    churnTiming?: { period: string; percentage: number | string; insight?: string }[]
    topChurnReasons?: { reason: string; percentage?: number | string; isFixable?: boolean }[]
    reactivationOpportunities?: { company: string; reason: string; potential?: string }[]
    preventionPlaybook?: { trigger: string; intervention: string; owner?: string }[]
    recommendations?: string[]
  }

  const churnTrend = d.churnRate?.trend?.toLowerCase()
  const trendUp = churnTrend === 'up' || churnTrend === 'increasing'
  const trendDown = churnTrend === 'down' || churnTrend === 'decreasing'
  const trendColor = trendUp ? red : trendDown ? green : amber
  const trendArrow = trendUp ? '↑' : trendDown ? '↓' : '→'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Churn Rate Header */}
      {d.churnRate && (
        <div style={{
          padding: '16px 20px',
          background: `${trendColor}10`,
          border: `1px solid ${trendColor}30`,
          borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: trendColor }}>Current Churn Rate</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <p style={{ fontSize: 32, fontWeight: 800, color: trendColor, lineHeight: 1.1 }}>{d.churnRate.current}</p>
              <span style={{ fontSize: 20, fontWeight: 700, color: trendColor }}>{trendArrow}</span>
            </div>
            <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>Last month: {d.churnRate.lastMonth}</p>
          </div>
          {d.churnRate.benchmark && (
            <div style={{ marginLeft: 'auto', textAlign: 'right', padding: '8px 12px', background: `${blue}10`, borderRadius: 8 }}>
              <p style={{ fontSize: 11, color: muted }}>Benchmark</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: blue }}>{d.churnRate.benchmark}</p>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {d.summary && (
        <Card><CardContent className="pt-3 pb-3">
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.summary}</p>
        </CardContent></Card>
      )}

      {/* Churn by Segment */}
      {d.churnBySegment && d.churnBySegment.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Churn by Segment</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', fontSize: 10, color: muted, fontWeight: 600, paddingBottom: 6, borderBottom: `1px solid ${muted}20` }}>Segment</th>
                <th style={{ textAlign: 'right', fontSize: 10, color: muted, fontWeight: 600, paddingBottom: 6, borderBottom: `1px solid ${muted}20` }}>Rate</th>
                <th style={{ textAlign: 'right', fontSize: 10, color: muted, fontWeight: 600, paddingBottom: 6, borderBottom: `1px solid ${muted}20` }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {d.churnBySegment.map((seg, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 12, color: ink, padding: '6px 0', borderBottom: `1px solid ${muted}10` }}>{seg.segment}</td>
                  <td style={{ fontSize: 12, fontWeight: 700, color: red, textAlign: 'right', padding: '6px 0', borderBottom: `1px solid ${muted}10` }}>{seg.rate}</td>
                  <td style={{ fontSize: 11, color: muted, textAlign: 'right', padding: '6px 0', borderBottom: `1px solid ${muted}10` }}>{seg.count ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {/* Churn Timing Funnel */}
      {d.churnTiming && d.churnTiming.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Churn Timing</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.churnTiming.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 11, color: muted, width: 64, flexShrink: 0 }}>{t.period}</p>
                <div style={{ flex: 1, height: 18, background: `${amber}15`, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(Number(t.percentage) || 0, 100)}%`,
                    background: amber, borderRadius: 4,
                    display: 'flex', alignItems: 'center', paddingLeft: 6,
                  }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>{t.percentage}%</p>
                  </div>
                </div>
                {t.insight && <p style={{ fontSize: 10, color: muted, width: 100, flexShrink: 0 }}>{t.insight}</p>}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Top Churn Reasons */}
      {d.topChurnReasons && d.topChurnReasons.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Top Churn Reasons</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.topChurnReasons.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.4 }}>{r.reason}</p>
                  {r.percentage !== undefined && (
                    <div style={{ height: 4, background: `${red}20`, borderRadius: 2, marginTop: 4 }}>
                      <div style={{ height: 4, width: `${Math.min(Number(r.percentage) || 0, 100)}%`, background: red, borderRadius: 2 }} />
                    </div>
                  )}
                </div>
                {r.percentage !== undefined && <p style={{ fontSize: 11, fontWeight: 700, color: red, flexShrink: 0 }}>{r.percentage}%</p>}
                {r.isFixable !== undefined && (
                  <span style={pill(r.isFixable ? green : muted)}>{r.isFixable ? 'fixable' : 'structural'}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Prevention Playbook */}
      {d.preventionPlaybook && d.preventionPlaybook.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Prevention Playbook</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.preventionPlaybook.map((play, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                <div style={{ padding: '8px 10px', background: `${amber}08`, border: `1px solid ${amber}20`, borderRadius: 6 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: amber, marginBottom: 2 }}>Trigger</p>
                  <p style={{ fontSize: 11, color: ink }}>{play.trigger}</p>
                </div>
                <span style={{ fontSize: 14, color: muted }}>→</span>
                <div style={{ padding: '8px 10px', background: `${green}08`, border: `1px solid ${green}20`, borderRadius: 6 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: green, marginBottom: 2 }}>Intervention{play.owner ? ` (${play.owner})` : ''}</p>
                  <p style={{ fontSize: 11, color: ink }}>{play.intervention}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Reactivation Opportunities */}
      {d.reactivationOpportunities && d.reactivationOpportunities.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Reactivation Opportunities</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.reactivationOpportunities.map((opp, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: ink, flex: 1 }}>{opp.company}</p>
                <p style={{ fontSize: 11, color: muted }}>{opp.reason}</p>
                {opp.potential && <span style={pill(blue)}>{opp.potential}</span>}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Recommendations */}
      {d.recommendations && d.recommendations.length > 0 && (
        <div style={{ padding: '12px 14px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 6 }}>Recommendations</p>
          {d.recommendations.map((r, i) => (
            <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.5, paddingLeft: 8 }}>→ {r}</p>
          ))}
        </div>
      )}
    </div>
  )
}
