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

export function ReferralProgramRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    programName?: string
    mechanic?: {
      type?: string
      referrerIncentive?: string
      refereeIncentive?: string
      trigger?: string
    }
    viralCoefficient?: {
      current?: string
      target?: string
      explanation?: string
    }
    integrationPoints?: string[]
    copyTemplates?: {
      referralEmailSubject?: string
      referralEmailBody?: string
      inAppMessage?: string
      socialShareText?: string
    }
    trackingSetup?: string[]
    launchPlan?: string[]
    successMetrics?: {
      week4Target?: string
      month3Target?: string
      kTarget?: string
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Program Name — Branded Header */}
      {d.programName && (
        <div style={{ padding: '16px 20px', background: `linear-gradient(135deg, ${green}12, ${blue}12)`, border: `1px solid ${green}25`, borderRadius: 14, textAlign: 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: green, marginBottom: 6 }}>Referral Program</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: ink }}>{d.programName}</p>
          {d.mechanic?.type && <span style={{ ...pill(blue), marginTop: 8, display: 'inline-block' }}>{d.mechanic.type}</span>}
        </div>
      )}

      {/* Mechanic — Two-Sided Incentive Flow */}
      {d.mechanic && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Referral Mechanic</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            {/* Referrer */}
            <div style={{ flex: 1, padding: '12px 14px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10, textAlign: 'center' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: blue, marginBottom: 8 }}>Referrer Gets</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: ink, lineHeight: 1.4 }}>{d.mechanic.referrerIncentive ?? '—'}</p>
            </div>
            {/* Arrow */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: muted, fontSize: 18, fontWeight: 700 }}>→</div>
            {/* Referee */}
            <div style={{ flex: 1, padding: '12px 14px', background: `${green}08`, border: `1px solid ${green}25`, borderRadius: 10, textAlign: 'center' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: green, marginBottom: 8 }}>New User Gets</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: ink, lineHeight: 1.4 }}>{d.mechanic.refereeIncentive ?? '—'}</p>
            </div>
          </div>
          {d.mechanic.trigger && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: `${amber}08`, border: `1px solid ${amber}25`, borderRadius: 8 }}>
              <p style={{ fontSize: 11, color: amber, fontWeight: 600 }}>Trigger: <span style={{ color: ink, fontWeight: 400 }}>{d.mechanic.trigger}</span></p>
            </div>
          )}
        </CardContent></Card>
      )}

      {/* Viral Coefficient */}
      {d.viralCoefficient && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Viral Coefficient</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, padding: '10px 12px', background: `${red}08`, borderRadius: 10, textAlign: 'center' }}>
              <p style={{ fontSize: 28, fontWeight: 800, color: red, lineHeight: 1 }}>{d.viralCoefficient.current ?? '—'}</p>
              <p style={{ fontSize: 10, color: muted, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Current K</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 20, color: muted, fontWeight: 700 }}>→</div>
            <div style={{ flex: 1, padding: '10px 12px', background: `${green}08`, borderRadius: 10, textAlign: 'center' }}>
              <p style={{ fontSize: 28, fontWeight: 800, color: green, lineHeight: 1 }}>{d.viralCoefficient.target ?? '—'}</p>
              <p style={{ fontSize: 10, color: muted, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Target K</p>
            </div>
          </div>
          {d.viralCoefficient.explanation && (
            <p style={{ fontSize: 11, color: muted, lineHeight: 1.6 }}>{d.viralCoefficient.explanation}</p>
          )}
        </CardContent></Card>
      )}

      {/* Copy Templates — Styled as editable text fields */}
      {d.copyTemplates && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Copy Templates</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.copyTemplates.referralEmailSubject && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: muted, marginBottom: 4 }}>Email Subject</p>
                <div style={{ padding: '8px 12px', background: `${muted}06`, border: `1px solid ${muted}25`, borderRadius: 8, fontFamily: 'monospace', fontSize: 12, color: ink }}>
                  {d.copyTemplates.referralEmailSubject}
                </div>
              </div>
            )}
            {d.copyTemplates.referralEmailBody && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: muted, marginBottom: 4 }}>Email Body</p>
                <div style={{ padding: '10px 12px', background: `${muted}06`, border: `1px solid ${muted}25`, borderRadius: 8, fontFamily: 'monospace', fontSize: 11, color: ink, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {d.copyTemplates.referralEmailBody}
                </div>
              </div>
            )}
            {d.copyTemplates.inAppMessage && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: muted, marginBottom: 4 }}>In-App Message</p>
                <div style={{ padding: '8px 12px', background: `${blue}06`, border: `1px solid ${blue}20`, borderRadius: 8, fontSize: 12, color: ink, lineHeight: 1.5 }}>
                  {d.copyTemplates.inAppMessage}
                </div>
              </div>
            )}
            {d.copyTemplates.socialShareText && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: muted, marginBottom: 4 }}>Social Share</p>
                <div style={{ padding: '8px 12px', background: `${green}06`, border: `1px solid ${green}20`, borderRadius: 8, fontSize: 12, color: ink, lineHeight: 1.5 }}>
                  {d.copyTemplates.socialShareText}
                </div>
              </div>
            )}
          </div>
        </CardContent></Card>
      )}

      {/* Integration Points */}
      {d.integrationPoints && d.integrationPoints.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Integration Points</p>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {d.integrationPoints.map((pt, i) => (
              <span key={i} style={pill(blue)}>{pt}</span>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Tracking Setup */}
      {d.trackingSetup && d.trackingSetup.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Tracking Setup</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {d.trackingSetup.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${green}`, background: `${green}15`, flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{item}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Launch Plan — Numbered Steps */}
      {d.launchPlan && d.launchPlan.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Launch Plan</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.launchPlan.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: 999, background: blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: 1 }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingTop: 2 }}>{step}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Success Metrics — Target Chips */}
      {d.successMetrics && (
        <div style={{ padding: '12px 14px', background: `${green}08`, border: `1px solid ${green}25`, borderRadius: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: green, marginBottom: 10 }}>Success Targets</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {d.successMetrics.week4Target && (
              <div style={{ padding: '8px 14px', background: '#fff', border: `1px solid ${green}30`, borderRadius: 8, textAlign: 'center' }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: green }}>{d.successMetrics.week4Target}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>Week 4</p>
              </div>
            )}
            {d.successMetrics.month3Target && (
              <div style={{ padding: '8px 14px', background: '#fff', border: `1px solid ${blue}30`, borderRadius: 8, textAlign: 'center' }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: blue }}>{d.successMetrics.month3Target}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>Month 3</p>
              </div>
            )}
            {d.successMetrics.kTarget && (
              <div style={{ padding: '8px 14px', background: '#fff', border: `1px solid ${amber}30`, borderRadius: 8, textAlign: 'center' }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: amber }}>{d.successMetrics.kTarget}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>Viral K Target</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
