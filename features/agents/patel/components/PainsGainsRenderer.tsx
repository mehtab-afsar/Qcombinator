'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { bg, bdr, ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

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
    trigger_events?: { trigger: string; urgency: string; example?: string }[]
    proof_expectations?: string[]
    common_objections?: { objection: string; root_cause?: string; handle: string }[]
    execution_path?: { consumed_by?: string[]; enables?: string; downstream_dependency?: string; next_step_for_founder?: string }
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
