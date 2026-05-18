'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

const SEVERITY_COLOR = (n: number) => n >= 4 ? red : n >= 3 ? amber : green
const URGENCY_COLOR: Record<string, string> = { high: red, medium: amber, low: green }

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

const pill = (color: string) => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
  fontSize: 10, fontWeight: 600, background: `${color}18`, color,
})

export function PainsGainsRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    target_context?: string
    confidence?: number
    evidence_type?: string
    core_pains?: { pain: string; severity: number; current_workaround: string; cost_of_pain?: string; evidence?: string }[]
    desired_gains?: string[]
    trigger_events?: { trigger: string; urgency: string; example?: string; detection_signal?: string }[]
    proof_expectations?: string[]
    common_objections?: { objection: string; root_cause?: string; handle: string }[]
    execution_path?: { consumed_by?: string[]; enables?: string; downstream_dependency?: string; next_step_for_founder?: string }
    executive_summary?: string
    strategic_decision?: string
    what_enables?: {
      pain_precision?: string
      trigger_detection?: string
      message_grounding?: string
      objection_intelligence?: string
      learning_velocity?: string
    }
    action_plan?: { timeframe: string; action: string }[]
    learning_agenda?: {
      pain_validation?: string[]
      trigger_detection?: string[]
      persona?: string[]
      market?: string[]
      sales?: string[]
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Confidence badge */}
      {(d.confidence !== undefined || d.evidence_type) && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
          {d.evidence_type && <span style={pill(d.evidence_type === 'validated' ? green : d.evidence_type === 'inferred' ? amber : muted)}>{d.evidence_type}</span>}
          {d.confidence !== undefined && <span style={{ fontSize: 11, color: muted }}>{Math.round(d.confidence * 100)}% confidence</span>}
        </div>
      )}

      {/* Target context */}
      {d.target_context && (
        <Card><CardContent className="pt-3 pb-3">
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.target_context}</p>
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
              ['pain_precision', 'Pain Precision', amber],
              ['trigger_detection', 'Trigger Detection', blue],
              ['message_grounding', 'Message Grounding', green],
              ['objection_intelligence', 'Objection Intel', red],
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

      {/* Core Pains */}
      {d.core_pains && d.core_pains.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Core Pains</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.core_pains.map((p, i) => (
              <div key={i} style={{ padding: '10px 12px', background: `${red}08`, border: `1px solid ${red}20`, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: SEVERITY_COLOR(p.severity), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {p.severity}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{p.pain}</p>
                  {p.evidence && <span style={{ ...pill(p.evidence === 'validated' ? green : amber), marginLeft: 'auto' }}>{p.evidence}</span>}
                </div>
                {p.current_workaround && <p style={{ fontSize: 11, color: muted, lineHeight: 1.5, marginBottom: p.cost_of_pain ? 4 : 0 }}>Workaround: {p.current_workaround}</p>}
                {p.cost_of_pain && <p style={{ fontSize: 11, color: amber, lineHeight: 1.5 }}>Cost: {p.cost_of_pain}</p>}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Desired Gains */}
      {d.desired_gains && d.desired_gains.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Desired Gains</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.desired_gains.map((g, i) => (
              <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>✓ {g}</p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Trigger Events */}
      {d.trigger_events && d.trigger_events.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Trigger Events</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.trigger_events.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ ...pill(URGENCY_COLOR[t.urgency] ?? muted), flexShrink: 0, marginTop: 1 }}>{t.urgency}</span>
                <div>
                  <p style={{ fontSize: 12, color: ink, fontWeight: 600 }}>{t.trigger}</p>
                  {t.example && <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>e.g. {t.example}</p>}
                  {t.detection_signal && <p style={{ fontSize: 11, color: blue, marginTop: 2 }}>Signal: {t.detection_signal}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Proof Expectations */}
      {d.proof_expectations && d.proof_expectations.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Proof Buyers Need</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {d.proof_expectations.map((p, i) => (
              <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>→ {p}</p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Objections */}
      {d.common_objections && d.common_objections.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Common Objections</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.common_objections.map((o, i) => (
              <div key={i} style={{ borderLeft: `3px solid ${amber}`, paddingLeft: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 3 }}>{o.objection}</p>
                {o.root_cause && <p style={{ fontSize: 11, color: muted, marginBottom: 3 }}>Why: {o.root_cause}</p>}
                <p style={{ fontSize: 12, color: green }}>Handle: {o.handle}</p>
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
              ['pain_validation', 'Pain Validation'],
              ['trigger_detection', 'Trigger Detection'],
              ['persona', 'Persona'],
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
