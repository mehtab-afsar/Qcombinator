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

const SEVERITY_COLOR: Record<string, string> = { critical: red, high: red, medium: amber, low: green }

export function CrisisPlaybookRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    scenario?: string
    severity?: string
    immediateActions?: {
      step: number
      action: string
      owner: string
      timeframe: string
    }[]
    communicationPlan?: {
      internal?: string
      customers?: string
      press?: string
      investors?: string
    }
    recoverySteps?: string[]
    postMortemChecklist?: string[]
    lessonsLearned?: string[]
  }

  const sevColor = SEVERITY_COLOR[d.severity?.toLowerCase() ?? ''] ?? red
  const isCritical = d.severity?.toLowerCase() === 'critical'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* CRITICAL Banner */}
      <div style={{
        padding: '14px 18px',
        background: isCritical ? `${red}12` : `${sevColor}10`,
        border: `2px solid ${sevColor}${isCritical ? '50' : '30'}`,
        borderRadius: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: d.scenario ? 8 : 0 }}>
          {isCritical && <span style={{ fontSize: 20 }}>🚨</span>}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: sevColor }}>
                {d.severity ?? 'CRISIS'} INCIDENT
              </p>
              <span style={pill(sevColor)}>{d.severity?.toUpperCase()}</span>
            </div>
            {d.title && <p style={{ fontSize: 15, fontWeight: 700, color: ink, marginTop: 2 }}>{d.title}</p>}
          </div>
        </div>
        {d.scenario && (
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, borderTop: `1px solid ${sevColor}20`, paddingTop: 8 }}>{d.scenario}</p>
        )}
      </div>

      {/* Immediate Actions — Emergency Checklist */}
      {d.immediateActions && d.immediateActions.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={{ ...sectionHead, color: red }}>Immediate Actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.immediateActions.map((action, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '10px 12px',
                background: `${red}06`,
                border: `1px solid ${red}20`,
                borderRadius: 8,
                borderLeft: `3px solid ${red}`,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: red, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0,
                }}>
                  {action.step}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: ink, lineHeight: 1.4 }}>{action.action}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    {action.owner && <span style={{ fontSize: 10, color: muted }}>Owner: <span style={{ color: ink, fontWeight: 600 }}>{action.owner}</span></span>}
                    {action.timeframe && <span style={{ fontSize: 10, color: amber, fontWeight: 600 }}>⏱ {action.timeframe}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Communication Plan */}
      {d.communicationPlan && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Communication Plan</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { key: 'internal', label: 'Internal', icon: '🏢', color: blue },
              { key: 'customers', label: 'Customers', icon: '👥', color: green },
              { key: 'press', label: 'Press / Media', icon: '📰', color: amber },
              { key: 'investors', label: 'Investors', icon: '💼', color: '#7C3AED' },
            ].map(({ key, label, icon, color }) => {
              const content = (d.communicationPlan as Record<string, string>)[key]
              if (!content) return null
              return (
                <div key={key} style={{
                  padding: '10px 12px',
                  background: `${color}08`,
                  border: `1px solid ${color}25`,
                  borderRadius: 8,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color, marginBottom: 4 }}>{icon} {label}</p>
                  <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{content}</p>
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Recovery Steps */}
      {d.recoverySteps && d.recoverySteps.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Recovery Steps</p>
          <div style={{ position: 'relative', paddingLeft: 20 }}>
            <div style={{ position: 'absolute', left: 8, top: 6, bottom: 6, width: 2, background: `${amber}30`, borderRadius: 1 }} />
            {d.recoverySteps.map((step, i) => (
              <div key={i} style={{ position: 'relative', marginBottom: 10, paddingLeft: 16 }}>
                <div style={{
                  position: 'absolute', left: -14, top: 2,
                  width: 10, height: 10, borderRadius: '50%',
                  background: amber, border: `2px solid #fff`,
                }} />
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{step}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Post-Mortem Checklist */}
      {d.postMortemChecklist && d.postMortemChecklist.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Post-Mortem Checklist</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {d.postMortemChecklist.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 3,
                  border: `2px solid ${muted}50`,
                  flexShrink: 0, marginTop: 2,
                }} />
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{item}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Lessons Learned */}
      {d.lessonsLearned && d.lessonsLearned.length > 0 && (
        <div style={{ padding: '12px 14px', background: `${green}08`, border: `1px solid ${green}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: green, marginBottom: 6 }}>Lessons Learned</p>
          {d.lessonsLearned.map((l, i) => (
            <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.5, paddingLeft: 8 }}>✓ {l}</p>
          ))}
        </div>
      )}
    </div>
  )
}
