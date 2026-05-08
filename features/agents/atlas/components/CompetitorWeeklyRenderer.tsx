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

const URGENCY_COLOR: Record<string, string> = { high: red, critical: red, medium: amber, low: green }

export function CompetitorWeeklyRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    headline?: string
    topMoves?: { competitor: string; move: string; implication?: string; urgency?: string }[]
    pricingAlerts?: string[]
    hiringSignals?: string[]
    fundingActivity?: string[]
    reviewIntelligence?: string[]
    opportunities?: string[]
    recommendedActions?: { action: string; owner?: string; deadline?: string }[]
    quietCompetitors?: string[]
    watchList?: string[]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Headline */}
      {d.headline && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={{ fontSize: 14, fontWeight: 700, color: ink, lineHeight: 1.5 }}>{d.headline}</p>
        </CardContent></Card>
      )}

      {/* Top Moves */}
      {d.topMoves && d.topMoves.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Top Moves This Week</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.topMoves.map((move, i) => {
              const uc = URGENCY_COLOR[move.urgency?.toLowerCase() ?? ''] ?? muted
              return (
                <div key={i} style={{
                  borderLeft: `4px solid ${uc}`,
                  paddingLeft: 12, paddingTop: 4, paddingBottom: 4,
                }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <Badge variant="outline" style={{ fontSize: 10, fontWeight: 700, color: uc, borderColor: `${uc}50` }}>
                      {move.competitor}
                    </Badge>
                    {move.urgency && <span style={pill(uc)}>{move.urgency}</span>}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: move.implication ? 4 : 0 }}>{move.move}</p>
                  {move.implication && (
                    <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>Implication: {move.implication}</p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Pricing Alerts */}
      {d.pricingAlerts && d.pricingAlerts.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Pricing Alerts</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {d.pricingAlerts.map((alert, i) => (
              <p key={i} style={{ fontSize: 12, color: red, paddingLeft: 10, lineHeight: 1.6 }}>⚠ {alert}</p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Hiring + Funding signals */}
      {((d.hiringSignals && d.hiringSignals.length > 0) || (d.fundingActivity && d.fundingActivity.length > 0)) && (
        <Card><CardContent className="pt-4 pb-4">
          {d.hiringSignals && d.hiringSignals.length > 0 && (
            <>
              <p style={sectionHead}>Hiring Signals</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: d.fundingActivity && d.fundingActivity.length > 0 ? 12 : 0 }}>
                {d.hiringSignals.map((s, i) => (
                  <span key={i} style={{ ...pill(amber), marginBottom: 2 }}>{s}</span>
                ))}
              </div>
            </>
          )}
          {d.fundingActivity && d.fundingActivity.length > 0 && (
            <>
              <p style={sectionHead}>Funding Activity</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {d.fundingActivity.map((f, i) => (
                  <span key={i} style={{ ...pill(blue), marginBottom: 2 }}>{f}</span>
                ))}
              </div>
            </>
          )}
        </CardContent></Card>
      )}

      {/* Review Intelligence */}
      {d.reviewIntelligence && d.reviewIntelligence.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Review Intelligence</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {d.reviewIntelligence.map((r, i) => (
              <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>→ {r}</p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Opportunities */}
      {d.opportunities && d.opportunities.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Opportunities</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {d.opportunities.map((o, i) => (
              <p key={i} style={{ fontSize: 12, color: green, paddingLeft: 10, lineHeight: 1.6 }}>✓ {o}</p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Recommended Actions */}
      {d.recommendedActions && d.recommendedActions.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Recommended Actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.recommendedActions.map((ra, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: `${blue}06`, borderRadius: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: ink, fontWeight: 600, marginBottom: 4 }}>{ra.action}</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                    {ra.owner && <span style={pill(amber)}>Owner: {ra.owner}</span>}
                    {ra.deadline && <span style={pill(red)}>Due: {ra.deadline}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Quiet Competitors + Watch List */}
      {((d.quietCompetitors && d.quietCompetitors.length > 0) || (d.watchList && d.watchList.length > 0)) && (
        <Card><CardContent className="pt-4 pb-4">
          {d.quietCompetitors && d.quietCompetitors.length > 0 && (
            <>
              <p style={sectionHead}>Quiet Competitors</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: d.watchList && d.watchList.length > 0 ? 12 : 0 }}>
                {d.quietCompetitors.map((c, i) => (
                  <span key={i} style={pill(muted)}>{c}</span>
                ))}
              </div>
            </>
          )}
          {d.watchList && d.watchList.length > 0 && (
            <>
              <p style={sectionHead}>Watch List</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {d.watchList.map((w, i) => (
                  <span key={i} style={pill(amber)}>{w}</span>
                ))}
              </div>
            </>
          )}
        </CardContent></Card>
      )}

    </div>
  )
}
