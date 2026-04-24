'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

const pill = (color: string) => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
  fontSize: 10, fontWeight: 600, background: `${color}18`, color,
})

interface MessagePillar { pillar: string; claim: string; proof: string; objection_handle: string }
interface ChannelMessage { channel: string; tone?: string; opening?: string; body_structure?: string; example?: string }
interface Foundation { positioning_statement?: string; value_proposition?: string; elevator_pitch?: string }

export function PositioningRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    confidence?: number
    evidence_type?: string
    foundation?: Foundation
    message_pillars?: MessagePillar[]
    icp_variants?: { hero_headline?: string; sub_headline?: string; outbound_hook?: string; voicemail_script?: string; cta?: string }
    channel_messages?: ChannelMessage[]
    forbidden_claims?: string[]
    competitive_differentiation?: string
    execution_path?: { consumed_by?: string[]; enables?: string; downstream_dependency?: string; next_step_for_founder?: string }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Confidence */}
      {(d.confidence !== undefined || d.evidence_type) && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
          {d.evidence_type && <span style={pill(d.evidence_type === 'validated' ? green : d.evidence_type === 'inferred' ? amber : muted)}>{d.evidence_type}</span>}
          {d.confidence !== undefined && <span style={{ fontSize: 11, color: muted }}>{Math.round(d.confidence * 100)}% confidence</span>}
        </div>
      )}

      {/* Foundation */}
      {d.foundation && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Foundation</p>
          {d.foundation.positioning_statement && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Positioning Statement</p>
              <p style={{ fontSize: 13, color: ink, lineHeight: 1.7, fontStyle: 'italic' }}>{d.foundation.positioning_statement}</p>
            </div>
          )}
          {d.foundation.value_proposition && (
            <div style={{ marginBottom: 12, padding: '10px 14px', background: `${blue}08`, borderRadius: 8, border: `1px solid ${blue}20` }}>
              <p style={{ fontSize: 10, color: blue, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Value Proposition</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: ink, lineHeight: 1.6 }}>{d.foundation.value_proposition}</p>
            </div>
          )}
          {d.foundation.elevator_pitch && (
            <div>
              <p style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Elevator Pitch</p>
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.7 }}>{d.foundation.elevator_pitch}</p>
            </div>
          )}
        </CardContent></Card>
      )}

      {/* Message Pillars */}
      {d.message_pillars && d.message_pillars.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Message Pillars</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {d.message_pillars.map((p, i) => (
              <div key={i} style={{ borderLeft: `3px solid ${blue}`, paddingLeft: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: blue, marginBottom: 4 }}>{p.pillar}</p>
                <p style={{ fontSize: 12, color: ink, marginBottom: 4 }}>"{p.claim}"</p>
                {p.proof && <p style={{ fontSize: 11, color: green, marginBottom: 4 }}>Proof: {p.proof}</p>}
                {p.objection_handle && <p style={{ fontSize: 11, color: amber }}>Handles: {p.objection_handle}</p>}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* ICP Variants — copy for different channels */}
      {d.icp_variants && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Channel Copy</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Hero Headline', value: d.icp_variants.hero_headline, accent: ink },
              { label: 'Sub-Headline', value: d.icp_variants.sub_headline, accent: muted },
              { label: 'Outbound Hook', value: d.icp_variants.outbound_hook, accent: blue },
              { label: 'Voicemail Script', value: d.icp_variants.voicemail_script, accent: '#7C3AED' },
              { label: 'Primary CTA', value: d.icp_variants.cta, accent: green },
            ].filter(x => x.value).map(({ label, value, accent }) => (
              <div key={label} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${accent}25`, background: `${accent}06` }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{value}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Channel Messages */}
      {d.channel_messages && d.channel_messages.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Channel Messages</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {d.channel_messages.map((cm, i) => (
              <div key={i}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                  <Badge variant="outline" style={{ fontSize: 10 }}>{cm.channel}</Badge>
                  {cm.tone && <span style={{ fontSize: 10, color: muted }}>{cm.tone}</span>}
                </div>
                {cm.opening && <p style={{ fontSize: 11, fontWeight: 600, color: ink, marginBottom: 4 }}>Opening: {cm.opening}</p>}
                {cm.body_structure && <p style={{ fontSize: 11, color: muted, marginBottom: 6 }}>Structure: {cm.body_structure}</p>}
                {cm.example && (
                  <pre style={{ fontSize: 11, color: ink, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: `${blue}06`, border: `1px solid ${blue}15`, borderRadius: 8, padding: '10px 12px', fontFamily: 'inherit', lineHeight: 1.6 }}>
                    {cm.example}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Forbidden Claims */}
      {d.forbidden_claims && d.forbidden_claims.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Never Say These</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {d.forbidden_claims.map((c, i) => (
              <span key={i} style={{ padding: '3px 10px', borderRadius: 999, background: `${red}10`, color: red, fontSize: 11, fontWeight: 500, textDecoration: 'line-through' }}>
                {c}
              </span>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Competitive Differentiation */}
      {d.competitive_differentiation && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Competitive Defensibility</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.7 }}>{d.competitive_differentiation}</p>
        </CardContent></Card>
      )}

      {/* Execution Path */}
      {d.execution_path && (
        <div style={{ padding: '12px 14px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 6 }}>Execution Path</p>
          {d.execution_path.enables && <p style={{ fontSize: 12, color: ink, marginBottom: 4 }}>Enables: {d.execution_path.enables}</p>}
          {d.execution_path.next_step_for_founder && <p style={{ fontSize: 11, color: ink, fontStyle: 'italic', marginBottom: 6 }}>{d.execution_path.next_step_for_founder}</p>}
          {d.execution_path.consumed_by && d.execution_path.consumed_by.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {d.execution_path.consumed_by.map((a, i) => <Badge key={i} variant="outline" style={{ fontSize: 10 }}>{a}</Badge>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
