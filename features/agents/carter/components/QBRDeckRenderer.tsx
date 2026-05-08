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

const TIER_COLOR: Record<string, string> = { enterprise: '#7C3AED', strategic: blue, growth: green, starter: muted }
const STATUS_COLOR: Record<string, string> = { achieved: green, partial: amber, missed: red, 'on track': green, 'at risk': amber }

export function QBRDeckRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    account?: {
      company: string
      contact?: string
      tier?: string
      renewalDate?: string
      arr?: string | number
    }
    quarterSummary?: string
    goalsVsOutcomes?: {
      goal: string
      outcome: string
      status: string
    }[]
    usageHighlights?: string[]
    roiDelivered?: string
    nextQuarterPlan?: { goal: string; owner?: string; metric?: string }[]
    expansionOpportunity?: string
    risksAndMitigations?: { risk: string; mitigation: string }[]
  }

  const tierColor = TIER_COLOR[d.account?.tier?.toLowerCase() ?? ''] ?? muted

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Account Header */}
      {d.account && (
        <div style={{
          padding: '16px 20px',
          background: `${tierColor}08`,
          border: `1px solid ${tierColor}25`,
          borderRadius: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: ink }}>{d.account.company}</p>
              {d.account.contact && <p style={{ fontSize: 12, color: muted, marginTop: 2 }}>{d.account.contact}</p>}
            </div>
            {d.account.tier && <span style={pill(tierColor)}>{d.account.tier}</span>}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {d.account.arr !== undefined && (
              <div>
                <p style={{ fontSize: 10, color: muted }}>ARR</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: green }}>{d.account.arr}</p>
              </div>
            )}
            {d.account.renewalDate && (
              <div>
                <p style={{ fontSize: 10, color: muted }}>Renewal</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>{d.account.renewalDate}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quarter Summary */}
      {d.quarterSummary && (
        <Card><CardContent className="pt-3 pb-3">
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.quarterSummary}</p>
        </CardContent></Card>
      )}

      {/* Goals vs Outcomes */}
      {d.goalsVsOutcomes && d.goalsVsOutcomes.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Goals vs. Outcomes</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', fontSize: 10, color: muted, fontWeight: 600, paddingBottom: 6, borderBottom: `1px solid ${muted}20` }}>Goal</th>
                <th style={{ textAlign: 'left', fontSize: 10, color: muted, fontWeight: 600, paddingBottom: 6, borderBottom: `1px solid ${muted}20` }}>Outcome</th>
                <th style={{ textAlign: 'right', fontSize: 10, color: muted, fontWeight: 600, paddingBottom: 6, borderBottom: `1px solid ${muted}20` }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {d.goalsVsOutcomes.map((row, i) => {
                const statusColor = STATUS_COLOR[row.status?.toLowerCase()] ?? muted
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? `${statusColor}04` : undefined }}>
                    <td style={{ fontSize: 12, color: ink, padding: '8px 0 8px 4px', borderBottom: `1px solid ${muted}10`, verticalAlign: 'top', lineHeight: 1.4 }}>{row.goal}</td>
                    <td style={{ fontSize: 12, color: ink, padding: '8px 8px', borderBottom: `1px solid ${muted}10`, verticalAlign: 'top', lineHeight: 1.4 }}>{row.outcome}</td>
                    <td style={{ textAlign: 'right', padding: '8px 0', borderBottom: `1px solid ${muted}10`, verticalAlign: 'top' }}>
                      <span style={pill(statusColor)}>{row.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {/* ROI Delivered */}
      {d.roiDelivered && (
        <div style={{
          padding: '16px 18px',
          background: `${green}10`,
          border: `2px solid ${green}30`,
          borderRadius: 12,
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: green, marginBottom: 6 }}>ROI Delivered</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: ink, lineHeight: 1.6 }}>{d.roiDelivered}</p>
        </div>
      )}

      {/* Usage Highlights */}
      {d.usageHighlights && d.usageHighlights.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Usage Highlights</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {d.usageHighlights.map((h, i) => (
              <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.5 }}>✓ {h}</p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Next Quarter Plan */}
      {d.nextQuarterPlan && d.nextQuarterPlan.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Next Quarter Plan</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.nextQuarterPlan.map((item, i) => (
              <div key={i} style={{
                padding: '10px 12px',
                background: `${blue}07`,
                border: `1px solid ${blue}20`,
                borderRadius: 8,
              }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 4 }}>{item.goal}</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  {item.metric && <p style={{ fontSize: 11, color: green }}>📊 {item.metric}</p>}
                  {item.owner && <p style={{ fontSize: 11, color: muted }}>Owner: {item.owner}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Expansion Opportunity */}
      {d.expansionOpportunity && (
        <div style={{
          padding: '12px 16px',
          background: `${green}08`,
          border: `1px solid ${green}25`,
          borderRadius: 10,
          borderLeft: `3px solid ${green}`,
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: green, marginBottom: 4 }}>Expansion Opportunity</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.expansionOpportunity}</p>
        </div>
      )}

      {/* Risks and Mitigations */}
      {d.risksAndMitigations && d.risksAndMitigations.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Risks & Mitigations</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.risksAndMitigations.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                <div style={{ padding: '8px 10px', background: `${red}07`, border: `1px solid ${red}20`, borderRadius: 6 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: red, marginBottom: 2 }}>Risk</p>
                  <p style={{ fontSize: 11, color: ink }}>{item.risk}</p>
                </div>
                <span style={{ fontSize: 14, color: muted }}>→</span>
                <div style={{ padding: '8px 10px', background: `${blue}07`, border: `1px solid ${blue}20`, borderRadius: 6 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: blue, marginBottom: 2 }}>Mitigation</p>
                  <p style={{ fontSize: 11, color: ink }}>{item.mitigation}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
    </div>
  )
}
