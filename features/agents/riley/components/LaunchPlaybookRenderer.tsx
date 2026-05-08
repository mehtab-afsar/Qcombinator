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

const PHASE_COLORS = [muted, muted, amber, amber, red, green, blue]

export function LaunchPlaybookRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    platform?: string
    launchDate?: string
    timeline?: {
      phase: string
      actions: string[]
    }[]
    assetChecklist?: string[]
    communityStrategy?: string
    productHuntSpecific?: {
      hunter?: string
      tagline?: string
      firstComment?: string
      upvoteTarget?: string
    }
    pressOutreach?: string[]
    successMetrics?: {
      day1?: string
      week1?: string
      month1?: string
    }
    contingency?: string
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Launch Date — Prominent with Countdown Feel */}
      {(d.launchDate || d.platform) && (
        <div style={{ padding: '16px 20px', background: `linear-gradient(135deg, ${red}12, ${amber}10)`, border: `2px solid ${red}30`, borderRadius: 14, textAlign: 'center' }}>
          {d.platform && <span style={{ ...pill(blue), marginBottom: 8, display: 'inline-block' }}>{d.platform}</span>}
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: red, marginBottom: 4 }}>Launch Date</p>
          <p style={{ fontSize: 28, fontWeight: 900, color: ink, letterSpacing: '-0.02em' }}>{d.launchDate ?? 'TBD'}</p>
        </div>
      )}

      {/* Timeline — Vertical Phase Sequence */}
      {d.timeline && d.timeline.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Launch Timeline</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {d.timeline.map((phase, i) => {
              const color = PHASE_COLORS[i] ?? muted
              const isLast = i === d.timeline!.length - 1
              return (
                <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: isLast ? 0 : 16, position: 'relative' }}>
                  {/* Line */}
                  {!isLast && (
                    <div style={{ position: 'absolute', left: 10, top: 22, bottom: 0, width: 2, background: `${color}30` }} />
                  )}
                  {/* Dot */}
                  <div style={{ width: 22, height: 22, borderRadius: 999, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, marginTop: 1 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 999, background: '#fff' }} />
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 5 }}>{phase.phase}</p>
                    {phase.actions && phase.actions.map((action, ai) => (
                      <p key={ai} style={{ fontSize: 11, color: muted, lineHeight: 1.5, paddingLeft: 8, borderLeft: `2px solid ${color}30`, marginBottom: 3 }}>{action}</p>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Asset Checklist */}
      {d.assetChecklist && d.assetChecklist.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Asset Checklist</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {d.assetChecklist.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 15, height: 15, borderRadius: 3, border: `2px solid ${blue}60`, flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{item}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Product Hunt Section */}
      {d.productHuntSpecific && (
        <Card><CardContent className="pt-4 pb-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>🚀</span>
            <p style={sectionHead}>Product Hunt</p>
          </div>
          {d.productHuntSpecific.hunter && (
            <p style={{ fontSize: 11, color: muted, marginBottom: 8 }}>Hunter: <span style={{ color: ink, fontWeight: 600 }}>{d.productHuntSpecific.hunter}</span></p>
          )}
          {d.productHuntSpecific.upvoteTarget && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ ...pill(amber), fontSize: 11 }}>Target: {d.productHuntSpecific.upvoteTarget} upvotes</span>
            </div>
          )}
          {/* Tagline Preview Box */}
          {d.productHuntSpecific.tagline && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, color: muted, fontWeight: 600, marginBottom: 4 }}>Tagline</p>
              <div style={{ padding: '10px 14px', background: `${amber}08`, border: `1px solid ${amber}30`, borderRadius: 10 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: ink }}>{d.productHuntSpecific.tagline}</p>
              </div>
            </div>
          )}
          {/* First Comment Preview */}
          {d.productHuntSpecific.firstComment && (
            <div>
              <p style={{ fontSize: 10, color: muted, fontWeight: 600, marginBottom: 4 }}>First Comment (Founder&apos;s Post)</p>
              <div style={{ padding: '10px 14px', background: `${muted}06`, border: `1px solid ${muted}20`, borderRadius: 10, borderLeft: `3px solid ${blue}` }}>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{d.productHuntSpecific.firstComment}</p>
              </div>
            </div>
          )}
        </CardContent></Card>
      )}

      {/* Community Strategy */}
      {d.communityStrategy && (
        <Card><CardContent className="pt-3 pb-3">
          <p style={sectionHead}>Community Strategy</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.communityStrategy}</p>
        </CardContent></Card>
      )}

      {/* Press Outreach */}
      {d.pressOutreach && d.pressOutreach.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Press Outreach</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {d.pressOutreach.map((item, i) => (
              <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 12, lineHeight: 1.5, borderLeft: `2px solid ${blue}40` }}>→ {item}</p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Success Metrics — Milestone Chips */}
      {d.successMetrics && (
        <div style={{ padding: '12px 14px', background: `${green}08`, border: `1px solid ${green}25`, borderRadius: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: green, marginBottom: 10 }}>Success Milestones</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {d.successMetrics.day1 && (
              <div style={{ padding: '8px 14px', background: '#fff', border: `1px solid ${amber}30`, borderRadius: 8, textAlign: 'center', flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: amber }}>{d.successMetrics.day1}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>Day 1</p>
              </div>
            )}
            {d.successMetrics.week1 && (
              <div style={{ padding: '8px 14px', background: '#fff', border: `1px solid ${blue}30`, borderRadius: 8, textAlign: 'center', flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: blue }}>{d.successMetrics.week1}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>Week 1</p>
              </div>
            )}
            {d.successMetrics.month1 && (
              <div style={{ padding: '8px 14px', background: '#fff', border: `1px solid ${green}30`, borderRadius: 8, textAlign: 'center', flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: green }}>{d.successMetrics.month1}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>Month 1</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contingency */}
      {d.contingency && (
        <div style={{ padding: '12px 14px', background: `${amber}08`, border: `1px solid ${amber}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: amber, marginBottom: 6 }}>Contingency Plan</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.contingency}</p>
        </div>
      )}
    </div>
  )
}
