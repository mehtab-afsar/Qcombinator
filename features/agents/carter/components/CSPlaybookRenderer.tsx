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

export function CSPlaybookRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    summary?: string
    healthScoreDefinition?: {
      green?: string
      yellow?: string
      red?: string
      reviewCadence?: string
    }
    onboardingPlaybook?: {
      day1?: string
      day3?: string
      day7?: string
      day14?: string
      day30?: string
      ahamoment?: string
    }
    qbrCadence?: string
    churnInterventionProtocol?: { trigger: string; response: string; owner?: string }[]
    escalationProtocol?: { level: string; condition: string; action: string }[]
    expansionTriggers?: string[]
    metrics?: { name: string; target?: string | number; description?: string }[]
  }

  const ONBOARDING_DAYS: { key: keyof NonNullable<typeof d.onboardingPlaybook>; label: string }[] = [
    { key: 'day1', label: 'Day 1' },
    { key: 'day3', label: 'Day 3' },
    { key: 'day7', label: 'Day 7' },
    { key: 'day14', label: 'Day 14' },
    { key: 'day30', label: 'Day 30' },
  ]

  const ESC_COLORS = [amber, red, '#7C3AED']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Summary */}
      {d.summary && (
        <Card><CardContent className="pt-3 pb-3">
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.summary}</p>
        </CardContent></Card>
      )}

      {/* Health Score Definition */}
      {d.healthScoreDefinition && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Health Score Definition</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: d.healthScoreDefinition.reviewCadence ? 10 : 0 }}>
            {[
              { key: 'green', color: green, label: 'Green' },
              { key: 'yellow', color: amber, label: 'Yellow' },
              { key: 'red', color: red, label: 'Red' },
            ].map(({ key, color, label }) => {
              const content = (d.healthScoreDefinition as Record<string, string>)[key]
              if (!content) return null
              return (
                <div key={key} style={{
                  padding: '10px 12px',
                  background: `${color}10`,
                  border: `1px solid ${color}30`,
                  borderRadius: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                    <p style={{ fontSize: 11, fontWeight: 700, color }}>{label}</p>
                  </div>
                  <p style={{ fontSize: 11, color: ink, lineHeight: 1.4 }}>{content}</p>
                </div>
              )
            })}
          </div>
          {d.healthScoreDefinition.reviewCadence && (
            <p style={{ fontSize: 11, color: muted }}>Review cadence: <span style={{ color: ink, fontWeight: 600 }}>{d.healthScoreDefinition.reviewCadence}</span></p>
          )}
        </CardContent></Card>
      )}

      {/* Onboarding Timeline */}
      {d.onboardingPlaybook && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Onboarding Playbook</p>
          {d.onboardingPlaybook.ahamoment && (
            <div style={{ padding: '8px 12px', background: `${green}10`, border: `1px solid ${green}25`, borderRadius: 8, marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 2 }}>AHA MOMENT</p>
              <p style={{ fontSize: 12, color: ink }}>{d.onboardingPlaybook.ahamoment}</p>
            </div>
          )}
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            <div style={{ position: 'absolute', left: 10, top: 8, bottom: 8, width: 2, background: `${blue}25`, borderRadius: 1 }} />
            {ONBOARDING_DAYS.map(({ key, label }, _i) => {
              const content = d.onboardingPlaybook![key]
              if (!content) return null
              return (
                <div key={key} style={{ position: 'relative', marginBottom: 12, paddingLeft: 12 }}>
                  <div style={{
                    position: 'absolute', left: -14, top: 3,
                    width: 10, height: 10, borderRadius: '50%',
                    background: blue, border: '2px solid #fff',
                  }} />
                  <p style={{ fontSize: 10, fontWeight: 700, color: blue, marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{content}</p>
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* QBR Cadence */}
      {d.qbrCadence && (
        <div style={{ padding: '10px 14px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10, display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 14 }}>📅</span>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 2 }}>QBR Cadence</p>
            <p style={{ fontSize: 12, color: ink }}>{d.qbrCadence}</p>
          </div>
        </div>
      )}

      {/* Churn Intervention Protocol */}
      {d.churnInterventionProtocol && d.churnInterventionProtocol.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Churn Intervention Protocol</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.churnInterventionProtocol.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                <div style={{ padding: '8px 10px', background: `${red}07`, border: `1px solid ${red}20`, borderRadius: 6 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: red, marginBottom: 2 }}>Trigger</p>
                  <p style={{ fontSize: 11, color: ink, lineHeight: 1.4 }}>{item.trigger}</p>
                </div>
                <span style={{ fontSize: 14, color: muted }}>→</span>
                <div style={{ padding: '8px 10px', background: `${green}07`, border: `1px solid ${green}20`, borderRadius: 6 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: green, marginBottom: 2 }}>Response{item.owner ? ` (${item.owner})` : ''}</p>
                  <p style={{ fontSize: 11, color: ink, lineHeight: 1.4 }}>{item.response}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Escalation Protocol (3-level pyramid) */}
      {d.escalationProtocol && d.escalationProtocol.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Escalation Protocol</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.escalationProtocol.map((esc, i) => {
              const escColor = ESC_COLORS[Math.min(i, ESC_COLORS.length - 1)]
              return (
                <div key={i} style={{
                  padding: '10px 12px',
                  background: `${escColor}08`,
                  border: `1px solid ${escColor}25`,
                  borderRadius: 8,
                  borderLeft: `3px solid ${escColor}`,
                  marginLeft: `${i * 12}px`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: escColor }}>Level {i + 1}</p>
                    {esc.level && <span style={pill(escColor)}>{esc.level}</span>}
                  </div>
                  {esc.condition && <p style={{ fontSize: 11, color: muted, marginBottom: 3 }}>When: {esc.condition}</p>}
                  {esc.action && <p style={{ fontSize: 12, color: ink, lineHeight: 1.4 }}>→ {esc.action}</p>}
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Expansion Triggers */}
      {d.expansionTriggers && d.expansionTriggers.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Expansion Triggers</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {d.expansionTriggers.map((t, i) => (
              <span key={i} style={{
                padding: '4px 10px', borderRadius: 999,
                fontSize: 11, fontWeight: 600,
                background: `${green}12`, color: green,
                border: `1px solid ${green}25`,
              }}>✓ {t}</span>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Metrics KPI Chips */}
      {d.metrics && d.metrics.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Key Metrics</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {d.metrics.map((m, i) => (
              <div key={i} style={{
                padding: '8px 12px',
                background: `${blue}08`,
                border: `1px solid ${blue}20`,
                borderRadius: 8,
                minWidth: 90,
              }}>
                <p style={{ fontSize: 10, color: muted, marginBottom: 2 }}>{m.name}</p>
                {m.target !== undefined && <p style={{ fontSize: 15, fontWeight: 700, color: blue }}>{m.target}</p>}
                {m.description && <p style={{ fontSize: 10, color: muted, marginTop: 1 }}>{m.description}</p>}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
    </div>
  )
}
