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

const URGENCY_COLOR: Record<string, string> = { critical: red, high: red, medium: amber, low: green }

export function CustomerHealthReportRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    summary?: string
    overallHealthScore?: number
    metrics?: {
      totalAccounts?: number
      greenAccounts?: number
      yellowAccounts?: number
      redAccounts?: number
      averageNps?: number
      currentChurnRate?: number | string
      nrr?: number | string
    }
    atRiskAccounts?: {
      company: string
      healthScore: number
      riskSignals: string[]
      urgency: string
      recommendedIntervention: string
      owner?: string
    }[]
    expansionOpportunities?: {
      company: string
      signal: string
      recommendedUpgrade: string
      talkTrack?: string
    }[]
    npsThemes?: {
      promoters?: string[]
      detractors?: string[]
    }
    weeklyActions?: string[]
  }

  const scoreColor = (d.overallHealthScore ?? 0) >= 80 ? green : (d.overallHealthScore ?? 0) >= 60 ? amber : red

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Health Score Traffic Light */}
      {d.overallHealthScore !== undefined && (
        <div style={{
          padding: '16px 20px',
          background: `${scoreColor}10`,
          border: `1px solid ${scoreColor}30`,
          borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            {[green, amber, red].map((c, idx) => (
              <div key={idx} style={{
                width: 12, height: 12, borderRadius: '50%', background: c,
                opacity: c === scoreColor ? 1 : 0.2,
              }} />
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: scoreColor }}>Overall Health Score</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: scoreColor, lineHeight: 1.1 }}>
              {d.overallHealthScore}<span style={{ fontSize: 14, fontWeight: 500, color: muted }}>/100</span>
            </p>
          </div>
          {/* Account counts */}
          {d.metrics && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {d.metrics.greenAccounts !== undefined && (
                <div style={{ textAlign: 'center', padding: '6px 10px', background: `${green}15`, borderRadius: 8 }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: green }}>{d.metrics.greenAccounts}</p>
                  <p style={{ fontSize: 10, color: muted }}>Green</p>
                </div>
              )}
              {d.metrics.yellowAccounts !== undefined && (
                <div style={{ textAlign: 'center', padding: '6px 10px', background: `${amber}15`, borderRadius: 8 }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: amber }}>{d.metrics.yellowAccounts}</p>
                  <p style={{ fontSize: 10, color: muted }}>Yellow</p>
                </div>
              )}
              {d.metrics.redAccounts !== undefined && (
                <div style={{ textAlign: 'center', padding: '6px 10px', background: `${red}15`, borderRadius: 8 }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: red }}>{d.metrics.redAccounts}</p>
                  <p style={{ fontSize: 10, color: muted }}>Red</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Key Metrics Row */}
      {d.metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { label: 'Total Accounts', value: d.metrics.totalAccounts, color: ink },
            { label: 'Avg NPS', value: d.metrics.averageNps, color: (d.metrics.averageNps ?? 0) >= 50 ? green : (d.metrics.averageNps ?? 0) >= 20 ? amber : red },
            { label: 'Churn Rate', value: d.metrics.currentChurnRate, color: red },
            { label: 'NRR', value: d.metrics.nrr ? `${d.metrics.nrr}%` : undefined, color: (Number(d.metrics.nrr ?? 0)) >= 100 ? green : amber },
          ].filter(m => m.value !== undefined).map((m, i) => (
            <div key={i} style={{
              padding: '10px 12px',
              background: `${m.color}08`,
              border: `1px solid ${m.color}20`,
              borderRadius: 8, textAlign: 'center',
            }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: m.color }}>{m.value}</p>
              <p style={{ fontSize: 10, color: muted }}>{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {d.summary && (
        <Card><CardContent className="pt-3 pb-3">
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.summary}</p>
        </CardContent></Card>
      )}

      {/* At-Risk Accounts */}
      {d.atRiskAccounts && d.atRiskAccounts.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>At-Risk Accounts</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.atRiskAccounts.map((acct, i) => {
              const urgencyColor = URGENCY_COLOR[acct.urgency?.toLowerCase()] ?? amber
              return (
                <div key={i} style={{
                  padding: '10px 12px',
                  background: `${urgencyColor}07`,
                  border: `1px solid ${urgencyColor}25`,
                  borderRadius: 8,
                  borderLeft: `3px solid ${urgencyColor}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink, flex: 1 }}>{acct.company}</p>
                    <span style={{ fontSize: 11, fontWeight: 700, color: urgencyColor }}>{acct.healthScore}</span>
                    <span style={pill(urgencyColor)}>{acct.urgency}</span>
                  </div>
                  {acct.riskSignals && acct.riskSignals.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                      {acct.riskSignals.map((s, j) => (
                        <span key={j} style={{ fontSize: 10, color: muted, background: `${muted}15`, padding: '1px 6px', borderRadius: 4 }}>{s}</span>
                      ))}
                    </div>
                  )}
                  <p style={{ fontSize: 11, color: blue, lineHeight: 1.4 }}>→ {acct.recommendedIntervention}</p>
                  {acct.owner && <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>Owner: {acct.owner}</p>}
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Expansion Opportunities */}
      {d.expansionOpportunities && d.expansionOpportunities.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Expansion Opportunities</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.expansionOpportunities.map((opp, i) => (
              <div key={i} style={{
                padding: '10px 12px',
                background: `${green}08`,
                border: `1px solid ${green}25`,
                borderRadius: 8,
                borderLeft: `3px solid ${green}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: ink, flex: 1 }}>{opp.company}</p>
                  <Badge variant="outline" style={{ fontSize: 10, color: green, borderColor: green }}>{opp.recommendedUpgrade}</Badge>
                </div>
                <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>{opp.signal}</p>
                {opp.talkTrack && <p style={{ fontSize: 11, color: ink, fontStyle: 'italic', lineHeight: 1.4 }}>&quot;{opp.talkTrack}&quot;</p>}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* NPS Themes */}
      {d.npsThemes && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>NPS Themes</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {d.npsThemes.promoters && d.npsThemes.promoters.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 5 }}>Promoters</p>
                {d.npsThemes.promoters.map((t, i) => (
                  <p key={i} style={{ fontSize: 11, color: ink, paddingLeft: 8, lineHeight: 1.5 }}>✓ {t}</p>
                ))}
              </div>
            )}
            {d.npsThemes.detractors && d.npsThemes.detractors.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: red, marginBottom: 5 }}>Detractors</p>
                {d.npsThemes.detractors.map((t, i) => (
                  <p key={i} style={{ fontSize: 11, color: ink, paddingLeft: 8, lineHeight: 1.5 }}>✗ {t}</p>
                ))}
              </div>
            )}
          </div>
        </CardContent></Card>
      )}

      {/* Weekly Actions */}
      {d.weeklyActions && d.weeklyActions.length > 0 && (
        <div style={{ padding: '12px 14px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 6 }}>Weekly Actions</p>
          {d.weeklyActions.map((a, i) => (
            <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.5, paddingLeft: 8 }}>→ {a}</p>
          ))}
        </div>
      )}
    </div>
  )
}
