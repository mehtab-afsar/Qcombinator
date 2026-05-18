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

const STAGE_COLORS = [muted, amber, blue, '#7C3AED', green]

interface Stage {
  name: string
  buyer_state?: string
  buyer_action?: string
  gtm_touchpoint?: string
  friction?: string
  trust_signal?: string
}

export function BuyerJourneyRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    entry_condition?: string
    confidence?: number
    evidence_type?: string
    stages?: Stage[]
    buyer_roles?: { role: string; description: string }[]
    decision_criteria?: string[]
    pilot_path?: string
    drop_off_risks?: { stage: string; risk: string; mitigation: string }[]
    execution_path?: { consumed_by?: string[]; enables?: string; downstream_dependency?: string; next_step_for_founder?: string }
    executive_summary?: string
    strategic_decision?: string
    what_enables?: {
      stage_visibility?: string
      friction_reduction?: string
      content_strategy?: string
      timing_precision?: string
      learning_velocity?: string
    }
    action_plan?: { timeframe: string; action: string }[]
    learning_agenda?: {
      stage_progression?: string[]
      friction_points?: string[]
      trust_signals?: string[]
      market?: string[]
      sales?: string[]
    }
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

      {/* Entry condition */}
      {d.entry_condition && (
        <Card><CardContent className="pt-3 pb-3">
          <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Entry Condition</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.entry_condition}</p>
        </CardContent></Card>
      )}

      {/* Executive Summary */}
      {d.executive_summary && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Executive Summary</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.75 }}>{d.executive_summary}</p>
        </CardContent></Card>
      )}

      {/* Strategic Decision */}
      {d.strategic_decision && (
        <div style={{ borderLeft: '4px solid #7C3AED', paddingLeft: 16, paddingTop: 10, paddingBottom: 10, background: '#faf8ff', borderRadius: '0 8px 8px 0', margin: '2px 0' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7C3AED', marginBottom: 6 }}>Strategic Decision</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: ink, lineHeight: 1.65 }}>{d.strategic_decision}</p>
        </div>
      )}

      {/* What This Enables */}
      {d.what_enables && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>What This Deliverable Enables</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {([
              ['stage_visibility', 'Stage Visibility', blue],
              ['friction_reduction', 'Friction Reduction', red],
              ['content_strategy', 'Content Strategy', green],
              ['timing_precision', 'Timing Precision', amber],
              ['learning_velocity', 'Learning Velocity', muted],
            ] as [string, string, string][]).filter(([k]) => d.what_enables![k as keyof typeof d.what_enables]).map(([k, lbl, color]) => (
              <div key={k} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color, background: `${color}15`, padding: '2px 8px', borderRadius: 99, minWidth: 140, textAlign: 'center' }}>{lbl}</span>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.55 }}>{d.what_enables![k as keyof typeof d.what_enables]}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Action Plan */}
      {d.action_plan && d.action_plan.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Founder Action Plan</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.action_plan.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: muted, background: `${muted}15`, padding: '2px 8px', borderRadius: 99, marginTop: 1 }}>{item.timeframe}</span>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.55 }}>{item.action}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Stage table */}
      {d.stages && d.stages.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Journey Stages</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.stages.map((s, i) => (
              <div key={i} style={{ borderLeft: `3px solid ${STAGE_COLORS[i % STAGE_COLORS.length]}`, paddingLeft: 12, paddingTop: 4, paddingBottom: 4 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: STAGE_COLORS[i % STAGE_COLORS.length], marginBottom: 6 }}>{i + 1}. {s.name}</p>
                {s.buyer_state && <p style={{ fontSize: 11, color: muted, marginBottom: 3 }}>State: {s.buyer_state}</p>}
                {s.buyer_action && <p style={{ fontSize: 11, color: ink, marginBottom: 3 }}>Action: {s.buyer_action}</p>}
                {s.gtm_touchpoint && <p style={{ fontSize: 11, color: blue, marginBottom: 3 }}>GTM: {s.gtm_touchpoint}</p>}
                {s.friction && <p style={{ fontSize: 11, color: red, marginBottom: 3 }}>Friction: {s.friction}</p>}
                {s.trust_signal && <p style={{ fontSize: 11, color: green }}>Trust signal: {s.trust_signal}</p>}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Buyer roles */}
      {d.buyer_roles && d.buyer_roles.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Buyer Roles</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.buyer_roles.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Badge variant="outline" style={{ fontSize: 10, flexShrink: 0 }}>{r.role}</Badge>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{r.description}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Decision criteria */}
      {d.decision_criteria && d.decision_criteria.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Decision Criteria (priority order)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {d.decision_criteria.map((c, i) => (
              <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>
                <span style={{ fontWeight: 700, color: muted, marginRight: 6 }}>{i + 1}.</span>{c}
              </p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Pilot path */}
      {d.pilot_path && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Pilot / POC Path</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.pilot_path}</p>
        </CardContent></Card>
      )}

      {/* Drop-off risks */}
      {d.drop_off_risks && d.drop_off_risks.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Drop-Off Risks</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.drop_off_risks.map((r, i) => (
              <div key={i} style={{ padding: '8px 12px', background: `${red}06`, border: `1px solid ${red}15`, borderRadius: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: red, marginBottom: 4 }}>Stage: {r.stage}</p>
                <p style={{ fontSize: 11, color: ink, marginBottom: 4 }}>Risk: {r.risk}</p>
                <p style={{ fontSize: 11, color: green }}>Mitigation: {r.mitigation}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Learning Agenda */}
      {d.learning_agenda && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Learning Agenda</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {([
              ['stage_progression', 'Stage Progression'],
              ['friction_points', 'Friction Points'],
              ['trust_signals', 'Trust Signals'],
              ['market', 'Market'],
              ['sales', 'Sales'],
            ] as [string, string][]).filter(([k]) => (d.learning_agenda![k as keyof typeof d.learning_agenda] as string[] | undefined)?.length).map(([k, lbl]) => (
              <div key={k}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted, marginBottom: 4 }}>{lbl}</p>
                {(d.learning_agenda![k as keyof typeof d.learning_agenda] as string[]).map((q, i) => (
                  <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.55, marginBottom: 2 }}>→ {q}</p>
                ))}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Execution Path */}
      {d.execution_path && (
        <div style={{ padding: '12px 14px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 6 }}>Execution Path</p>
          {d.execution_path.enables && <p style={{ fontSize: 12, color: ink, marginBottom: 4 }}>Enables: {d.execution_path.enables}</p>}
          {d.execution_path.downstream_dependency && <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Next: {d.execution_path.downstream_dependency}</p>}
          {d.execution_path.next_step_for_founder && <p style={{ fontSize: 11, color: ink, fontStyle: 'italic' }}>{d.execution_path.next_step_for_founder}</p>}
          {d.execution_path.consumed_by && d.execution_path.consumed_by.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
              {d.execution_path.consumed_by.map((a, i) => <Badge key={i} variant="outline" style={{ fontSize: 10 }}>{a}</Badge>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
