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

const statBox = (value: string | number, label: string, color: string) => (
  <div style={{ flex: 1, padding: '10px 12px', background: `${color}08`, border: `1px solid ${color}25`, borderRadius: 10, textAlign: 'center' }}>
    <p style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
    <p style={{ fontSize: 10, color: muted, marginTop: 3 }}>{label}</p>
  </div>
)

interface VariantResult {
  variant?: string
  label?: string
  sent?: number
  replies?: number
  meetings?: number
  reply_rate?: number
  meeting_rate?: number
  winner?: boolean
}

interface ObjectionCount {
  objection: string
  count: number
  mitigation?: string
}

export function CampaignReportRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    run_id?: string
    icp_id?: string
    campaign_period?: string
    executive_summary?: string
    contacts_reached?: number
    total_replies?: number
    total_meetings?: number
    overall_reply_rate?: number
    overall_meeting_rate?: number
    experiment_variable?: string
    hypothesis?: string
    variant_results?: VariantResult[]
    winning_variant?: string
    winning_insight?: string
    objection_frequency?: ObjectionCount[]
    segment_performance?: { segment: string; reply_rate: number; meetings: number; notes?: string }[]
    learning_summary?: string
    recommended_next_campaign?: string
    action_plan?: string[]
  }

  const replyRate = d.overall_reply_rate ?? (
    d.contacts_reached && d.total_replies
      ? Math.round((d.total_replies / d.contacts_reached) * 100)
      : null
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Meta tags */}
      {(d.run_id || d.icp_id || d.campaign_period) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {d.run_id && <span style={pill(muted)}>Run: {d.run_id}</span>}
          {d.icp_id && <span style={pill(blue)}>ICP: {d.icp_id}</span>}
          {d.campaign_period && <span style={pill(muted)}>{d.campaign_period}</span>}
        </div>
      )}

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 8 }}>
        {d.contacts_reached !== undefined && statBox(d.contacts_reached, 'Contacted', muted)}
        {d.total_replies !== undefined && statBox(d.total_replies, 'Replies', blue)}
        {d.total_meetings !== undefined && statBox(d.total_meetings, 'Meetings', green)}
        {replyRate !== null && statBox(`${replyRate}%`, 'Reply Rate', replyRate >= 8 ? green : replyRate >= 4 ? amber : red)}
      </div>

      {/* Executive Summary */}
      {d.executive_summary && (
        <div style={{ padding: '14px 16px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 8 }}>Executive Summary</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.75 }}>{d.executive_summary}</p>
        </div>
      )}

      {/* Experiment variable */}
      {d.experiment_variable && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Experiment</p>
          <p style={{ fontSize: 12, color: muted, marginBottom: 6 }}>Variable tested: <strong style={{ color: ink }}>{d.experiment_variable}</strong></p>
          {d.hypothesis && <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, fontStyle: 'italic' }}>Hypothesis: {d.hypothesis}</p>}
        </CardContent></Card>
      )}

      {/* Variant results */}
      {d.variant_results && d.variant_results.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Variant Results</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.variant_results.map((v, i) => {
              const rr = v.reply_rate ?? (v.sent && v.replies ? Math.round((v.replies / v.sent) * 100) : null)
              const isWinner = v.winner || v.variant === d.winning_variant
              return (
                <div key={i} style={{ padding: '10px 14px', border: `1.5px solid ${isWinner ? green : muted + '30'}`, borderRadius: 10, background: isWinner ? `${green}05` : 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{v.label ?? v.variant ?? `Variant ${i + 1}`}</p>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {isWinner && <span style={pill(green)}>Winner</span>}
                      {rr !== null && <span style={pill(rr >= 8 ? green : rr >= 4 ? amber : red)}>{rr}% reply</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {v.sent !== undefined && <p style={{ fontSize: 11, color: muted }}>Sent: {v.sent}</p>}
                    {v.replies !== undefined && <p style={{ fontSize: 11, color: muted }}>Replies: {v.replies}</p>}
                    {v.meetings !== undefined && <p style={{ fontSize: 11, color: muted }}>Meetings: {v.meetings}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Winning insight */}
      {d.winning_insight && (
        <div style={{ borderLeft: '4px solid #16A34A', paddingLeft: 16, paddingTop: 10, paddingBottom: 10, background: `${green}05`, borderRadius: '0 8px 8px 0' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: green, marginBottom: 6 }}>Key Insight</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: ink, lineHeight: 1.65 }}>{d.winning_insight}</p>
        </div>
      )}

      {/* Objection frequency */}
      {d.objection_frequency && d.objection_frequency.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Objection Frequency</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...d.objection_frequency].sort((a, b) => b.count - a.count).map((obj, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: `${red}05`, border: `1px solid ${red}15`, borderRadius: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {obj.count}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: ink, fontWeight: 600 }}>{obj.objection}</p>
                  {obj.mitigation && <p style={{ fontSize: 11, color: green, marginTop: 3 }}>→ {obj.mitigation}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Segment performance */}
      {d.segment_performance && d.segment_performance.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Segment Performance</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.segment_performance.map((seg, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', border: `1px solid ${muted}20`, borderRadius: 8 }}>
                <p style={{ flex: 1, fontSize: 12, fontWeight: 600, color: ink }}>{seg.segment}</p>
                <span style={pill(seg.reply_rate >= 8 ? green : seg.reply_rate >= 4 ? amber : red)}>{seg.reply_rate}% reply</span>
                <span style={pill(blue)}>{seg.meetings} meetings</span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Learning summary */}
      {d.learning_summary && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>What We Learned</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.75 }}>{d.learning_summary}</p>
        </CardContent></Card>
      )}

      {/* Next campaign */}
      {d.recommended_next_campaign && (
        <div style={{ padding: '12px 14px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 6 }}>Recommended Next Campaign</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.recommended_next_campaign}</p>
        </div>
      )}

      {/* Action plan */}
      {d.action_plan && d.action_plan.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Action Plan</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.action_plan.map((action, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingTop: 2 }}>{action}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

    </div>
  )
}
