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

interface Variant {
  name?: string
  label?: string
  description?: string
  sent?: number
  replies?: number
  meetings?: number
  reply_rate?: number
  meeting_rate?: number
  confidence?: number
  winner?: boolean
}

export function ABTestResultRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    run_id?: string
    icp_id?: string
    experiment_variable?: string
    hypothesis?: string
    test_period?: string
    executive_summary?: string
    variants?: Variant[]
    winning_variant?: string
    statistical_confidence?: number
    winning_insight?: string
    why_it_won?: string
    what_this_changes?: string
    recommended_scale_action?: string
    next_variable_to_test?: string
    learning_agenda_update?: string[]
    failure_mode_check?: string
  }

  const winner = d.variants?.find(v => v.winner || v.name === d.winning_variant || v.label === d.winning_variant)
  const confidence = d.statistical_confidence ?? winner?.confidence

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Meta */}
      {(d.run_id || d.icp_id || d.test_period) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {d.run_id && <span style={pill(muted)}>Run: {d.run_id}</span>}
          {d.icp_id && <span style={pill(blue)}>ICP: {d.icp_id}</span>}
          {d.test_period && <span style={pill(muted)}>{d.test_period}</span>}
          {d.experiment_variable && <span style={pill(amber)}>Variable: {d.experiment_variable}</span>}
        </div>
      )}

      {/* Hypothesis */}
      {d.hypothesis && (
        <div style={{ padding: '12px 14px', background: `${blue}06`, border: `1px solid ${blue}20`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 6 }}>Hypothesis</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.65, fontStyle: 'italic' }}>{d.hypothesis}</p>
        </div>
      )}

      {/* Variant comparison */}
      {d.variants && d.variants.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Variant Comparison</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.variants.map((v, i) => {
              const isWinner = v.winner || v.name === d.winning_variant || v.label === d.winning_variant
              const rr = v.reply_rate ?? (v.sent && v.replies ? Math.round((v.replies / v.sent) * 100) : null)
              const mr = v.meeting_rate ?? (v.sent && v.meetings ? Math.round((v.meetings / v.sent) * 100) : null)
              return (
                <div key={i} style={{ padding: '12px 14px', border: `2px solid ${isWinner ? green : muted + '30'}`, borderRadius: 10, background: isWinner ? `${green}04` : 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 3 }}>{v.label ?? v.name ?? `Variant ${i + 1}`}</p>
                      {v.description && <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{v.description}</p>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                      {isWinner && <span style={pill(green)}>Winner</span>}
                      {rr !== null && <span style={pill(rr >= 8 ? green : rr >= 4 ? amber : red)}>{rr}% reply</span>}
                      {mr !== null && <span style={pill(blue)}>{mr}% meeting</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {v.sent !== undefined && <p style={{ fontSize: 11, color: muted }}>Sent: <strong style={{ color: ink }}>{v.sent}</strong></p>}
                    {v.replies !== undefined && <p style={{ fontSize: 11, color: muted }}>Replies: <strong style={{ color: ink }}>{v.replies}</strong></p>}
                    {v.meetings !== undefined && <p style={{ fontSize: 11, color: muted }}>Meetings: <strong style={{ color: ink }}>{v.meetings}</strong></p>}
                  </div>
                </div>
              )
            })}
          </div>
          {confidence !== undefined && (
            <p style={{ fontSize: 11, color: muted, marginTop: 10, textAlign: 'right' }}>
              Statistical confidence: <strong style={{ color: confidence >= 90 ? green : confidence >= 70 ? amber : red }}>{confidence}%</strong>
            </p>
          )}
        </CardContent></Card>
      )}

      {/* Winning insight */}
      {(d.winning_insight || d.why_it_won) && (
        <div style={{ borderLeft: '4px solid #16A34A', paddingLeft: 16, paddingTop: 10, paddingBottom: 10, background: `${green}05`, borderRadius: '0 8px 8px 0' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: green, marginBottom: 6 }}>Why It Won</p>
          {d.winning_insight && <p style={{ fontSize: 13, fontWeight: 600, color: ink, lineHeight: 1.65, marginBottom: d.why_it_won ? 8 : 0 }}>{d.winning_insight}</p>}
          {d.why_it_won && <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.why_it_won}</p>}
        </div>
      )}

      {/* What this changes */}
      {d.what_this_changes && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>What This Changes</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.75 }}>{d.what_this_changes}</p>
        </CardContent></Card>
      )}

      {/* Scale action */}
      {d.recommended_scale_action && (
        <div style={{ padding: '12px 14px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 6 }}>Recommended Scale Action</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.recommended_scale_action}</p>
        </div>
      )}

      {/* Next test */}
      {d.next_variable_to_test && (
        <div style={{ padding: '12px 14px', background: `${amber}08`, border: `1px solid ${amber}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: amber, marginBottom: 6 }}>Next Variable to Test</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.next_variable_to_test}</p>
        </div>
      )}

      {/* Learning agenda update */}
      {d.learning_agenda_update && d.learning_agenda_update.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Learning Agenda Update</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {d.learning_agenda_update.map((item, i) => (
              <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>→ {item}</p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Failure mode check */}
      {d.failure_mode_check && (
        <div style={{ padding: '12px 14px', background: `${red}06`, border: `1px solid ${red}20`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: red, marginBottom: 6 }}>Failure Mode Check</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.failure_mode_check}</p>
        </div>
      )}

    </div>
  )
}
