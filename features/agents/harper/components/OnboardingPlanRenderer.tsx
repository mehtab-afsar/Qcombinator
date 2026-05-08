'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

type WeekData = {
  theme?: string
  milestones?: string[]
  actions?: string[]
  checkIn?: string
}

const WEEK_COLORS = [blue, green, amber, red]

export function OnboardingPlanRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    type?: string
    goal?: string
    week1?: WeekData
    week2?: WeekData
    week3?: WeekData
    week4?: WeekData
    day60Milestone?: string
    day90Milestone?: string
    escalationTriggers?: string[]
    toolsAndAccess?: string[]
    keyStakeholders?: string[]
  }

  const weeks: { label: string; data: WeekData | undefined }[] = [
    { label: 'Week 1', data: d.week1 },
    { label: 'Week 2', data: d.week2 },
    { label: 'Week 3', data: d.week3 },
    { label: 'Week 4', data: d.week4 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header / Goal */}
      {(d.goal || d.type) && (
        <Card>
          <CardContent className="pt-4 pb-4">
            {d.type && <p style={{ fontSize: 10, color: muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{d.type}</p>}
            {d.goal && <p style={{ fontSize: 13, color: ink, lineHeight: 1.7 }}>{d.goal}</p>}
          </CardContent>
        </Card>
      )}

      {/* 4-Week Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {weeks.filter(w => w.data).map(({ label, data: wk }, i) => {
          const color = WEEK_COLORS[i]
          return (
            <Card key={i}>
              <CardContent className="pt-4 pb-4">
                {/* Week header with timeline dot */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    W{i + 1}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{label}</p>
                    {wk?.theme && <p style={{ fontSize: 11, color, fontWeight: 600, marginTop: 1 }}>{wk.theme}</p>}
                  </div>
                </div>

                {/* Milestones */}
                {wk?.milestones && wk.milestones.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <p style={{ ...sectionHead, marginBottom: 6 }}>Milestones</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {wk.milestones.map((m, j) => (
                        <div key={j} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 12, color, marginTop: 1 }}>☐</span>
                          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{m}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {wk?.actions && wk.actions.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <p style={{ ...sectionHead, marginBottom: 6 }}>Actions</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {wk.actions.map((a, j) => (
                        <p key={j} style={{ fontSize: 12, color: ink, paddingLeft: 8, lineHeight: 1.6 }}>→ {a}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Check-in Pull Quote */}
                {wk?.checkIn && (
                  <div style={{ marginTop: 8, padding: '8px 12px', borderLeft: `3px solid ${color}`, background: `${color}08`, borderRadius: '0 6px 6px 0' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Check-in</p>
                    <p style={{ fontSize: 11, color: ink, lineHeight: 1.6, fontStyle: 'italic' }}>{wk.checkIn}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 30/60/90 Progression */}
      {(d.week4 || d.day60Milestone || d.day90Milestone) && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>30 / 60 / 90-Day Milestones</p>
            <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
              {/* Connecting line */}
              <div style={{ position: 'absolute', top: 14, left: '5%', right: '5%', height: 2, background: `${muted}20`, zIndex: 0 }} />
              {[
                { label: '30 Days', value: d.week4?.theme ?? d.week4?.milestones?.[0], color: blue },
                { label: '60 Days', value: d.day60Milestone, color: green },
                { label: '90 Days', value: d.day90Milestone, color: amber },
              ].map((m, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6, boxShadow: `0 0 0 3px #fff` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>{i + 1}</span>
                  </div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: m.color, marginBottom: 3 }}>{m.label}</p>
                  {m.value && <p style={{ fontSize: 10, color: muted, lineHeight: 1.4, maxWidth: 90 }}>{m.value}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tools & Access */}
      {d.toolsAndAccess && d.toolsAndAccess.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Tools & Access</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {d.toolsAndAccess.map((t, i) => (
                <Badge key={i} variant="outline" style={{ fontSize: 10 }}>{t}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Stakeholders */}
      {d.keyStakeholders && d.keyStakeholders.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Key Stakeholders</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {d.keyStakeholders.map((s, i) => (
                <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10 }}>• {s}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Escalation Triggers */}
      {d.escalationTriggers && d.escalationTriggers.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Escalation Triggers</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {d.escalationTriggers.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11, color: red, fontWeight: 700, flexShrink: 0 }}>!</span>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{e}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
