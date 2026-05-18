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

interface CohortRow {
  cohort?: string
  day7?: number
  day30?: number
  day90?: number
  size?: number
  notes?: string
}

interface RetentionDriver {
  driver: string
  impact?: string
  segment?: string
}

interface ChurnRisk {
  segment: string
  risk_level?: string
  signal?: string
  recommended_action?: string
}

export function RetentionReportRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    period?: string
    executive_summary?: string
    overall_day7?: number
    overall_day30?: number
    overall_day90?: number
    nps_score?: number
    top_retained_segment?: string
    retention_drivers?: RetentionDriver[]
    churn_risks?: ChurnRisk[]
    cohort_data?: CohortRow[]
    activation_bottleneck?: string
    recommended_interventions?: { intervention: string; expected_impact?: string; priority?: string }[]
    learning_questions?: string[]
  }

  const retentionColor = (pct: number | undefined) =>
    pct === undefined ? muted : pct >= 60 ? green : pct >= 35 ? amber : red

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Period */}
      {d.period && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={pill(muted)}>{d.period}</span>
        </div>
      )}

      {/* Retention KPI row */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: 'Day 7', value: d.overall_day7 },
          { label: 'Day 30', value: d.overall_day30 },
          { label: 'Day 90', value: d.overall_day90 },
        ].filter(m => m.value !== undefined).map((m, i) => (
          <div key={i} style={{ flex: 1, padding: '10px 12px', background: `${retentionColor(m.value)}08`, border: `1px solid ${retentionColor(m.value)}25`, borderRadius: 10, textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: retentionColor(m.value), lineHeight: 1 }}>{m.value}%</p>
            <p style={{ fontSize: 10, color: muted, marginTop: 3 }}>{m.label} Retention</p>
          </div>
        ))}
        {d.nps_score !== undefined && (
          <div style={{ flex: 1, padding: '10px 12px', background: `${d.nps_score >= 50 ? green : d.nps_score >= 20 ? amber : red}08`, border: `1px solid ${d.nps_score >= 50 ? green : d.nps_score >= 20 ? amber : red}25`, borderRadius: 10, textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: d.nps_score >= 50 ? green : d.nps_score >= 20 ? amber : red, lineHeight: 1 }}>{d.nps_score}</p>
            <p style={{ fontSize: 10, color: muted, marginTop: 3 }}>NPS</p>
          </div>
        )}
      </div>

      {/* Top retained segment */}
      {d.top_retained_segment && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: muted }}>Best segment:</span>
          <span style={pill(green)}>{d.top_retained_segment}</span>
        </div>
      )}

      {/* Executive Summary */}
      {d.executive_summary && (
        <div style={{ padding: '14px 16px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 8 }}>Executive Summary</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.75 }}>{d.executive_summary}</p>
        </div>
      )}

      {/* Retention drivers */}
      {d.retention_drivers && d.retention_drivers.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Retention Drivers</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.retention_drivers.map((dr, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: `${green}05`, border: `1px solid ${green}15`, borderRadius: 8 }}>
                <span style={{ color: green, fontSize: 14, flexShrink: 0, marginTop: 1 }}>↑</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: ink, fontWeight: 600 }}>{dr.driver}</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                    {dr.impact && <span style={pill(green)}>{dr.impact} impact</span>}
                    {dr.segment && <span style={pill(blue)}>{dr.segment}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Churn risks */}
      {d.churn_risks && d.churn_risks.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Churn Risks</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.churn_risks.map((cr, i) => {
              const riskColor = cr.risk_level?.toLowerCase() === 'high' ? red : cr.risk_level?.toLowerCase() === 'medium' ? amber : muted
              return (
                <div key={i} style={{ padding: '10px 12px', background: `${riskColor}05`, border: `1px solid ${riskColor}20`, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{cr.segment}</p>
                    {cr.risk_level && <span style={pill(riskColor)}>{cr.risk_level} risk</span>}
                  </div>
                  {cr.signal && <p style={{ fontSize: 11, color: muted, marginBottom: cr.recommended_action ? 4 : 0 }}>Signal: {cr.signal}</p>}
                  {cr.recommended_action && <p style={{ fontSize: 11, color: blue }}>Action: {cr.recommended_action}</p>}
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Cohort table */}
      {d.cohort_data && d.cohort_data.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Cohort Data</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  {['Cohort', 'Size', 'Day 7', 'Day 30', 'Day 90'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '4px 8px', color: muted, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${muted}20` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.cohort_data.map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px 8px', color: ink, fontWeight: 600 }}>{row.cohort ?? `Cohort ${i + 1}`}</td>
                    <td style={{ padding: '6px 8px', color: muted }}>{row.size ?? '—'}</td>
                    {([row.day7, row.day30, row.day90] as (number | undefined)[]).map((v, j) => (
                      <td key={j} style={{ padding: '6px 8px', fontWeight: 600, color: retentionColor(v) }}>{v !== undefined ? `${v}%` : '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      )}

      {/* Activation bottleneck */}
      {d.activation_bottleneck && (
        <div style={{ padding: '12px 14px', background: `${amber}08`, border: `1px solid ${amber}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: amber, marginBottom: 6 }}>Activation Bottleneck</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.activation_bottleneck}</p>
        </div>
      )}

      {/* Recommended interventions */}
      {d.recommended_interventions && d.recommended_interventions.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Recommended Interventions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.recommended_interventions.map((item, i) => {
              const prColor = item.priority?.toLowerCase() === 'high' ? red : item.priority?.toLowerCase() === 'medium' ? amber : muted
              return (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', border: `1px solid ${muted}20`, borderRadius: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <p style={{ fontSize: 12, color: ink, lineHeight: 1.5, fontWeight: 600, flex: 1, paddingRight: 8 }}>{item.intervention}</p>
                      {item.priority && <span style={pill(prColor)}>{item.priority}</span>}
                    </div>
                    {item.expected_impact && <p style={{ fontSize: 11, color: green, marginTop: 3 }}>Expected: {item.expected_impact}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Learning questions */}
      {d.learning_questions && d.learning_questions.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Open Questions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {d.learning_questions.map((q, i) => (
              <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>→ {q}</p>
            ))}
          </div>
        </CardContent></Card>
      )}

    </div>
  )
}
