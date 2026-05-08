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

const bigNum: React.CSSProperties = {
  fontSize: 22, fontWeight: 700, color: ink, lineHeight: 1.1,
}

const label: React.CSSProperties = {
  fontSize: 10, color: muted, marginTop: 2,
}

export function FinancialModelRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    assumptions?: {
      currentMrr?: string | number
      currentBurn?: string | number
      currentHeadcount?: number
      avgDealSize?: string | number
      salesCycleMonths?: number
      grossMargin?: string | number
    }
    scenarios?: {
      base?: { description?: string; month6Mrr?: string | number; month12Mrr?: string | number; month18Mrr?: string | number; burnAtMonth12?: string | number; runway?: string; breakeven?: string }
      bull?: { description?: string; month12Mrr?: string | number; month18Mrr?: string | number; runway?: string }
      bear?: { description?: string; month12Mrr?: string | number; runway?: string; requiredAction?: string }
    }
    keyMilestones?: { month: number | string; milestone: string; mrr?: string | number; headcount?: number }[]
    hiringPlan?: { role: string; month: string | number; cost: string | number; rationale?: string }[]
    fundraisingRecommendation?: { shouldRaise?: boolean; timing?: string; amount?: string | number; rationale?: string }
  }

  const scenarioCards = [
    { key: 'base', label: 'Base Case', color: blue, s: d.scenarios?.base },
    { key: 'bull', label: 'Bull Case', color: green, s: d.scenarios?.bull },
    { key: 'bear', label: 'Bear Case', color: red, s: d.scenarios?.bear },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Assumptions */}
      {d.assumptions && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Model Assumptions</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {d.assumptions.currentMrr !== undefined && (
              <div><p style={bigNum}>{d.assumptions.currentMrr}</p><p style={label}>Current MRR</p></div>
            )}
            {d.assumptions.currentBurn !== undefined && (
              <div><p style={bigNum}>{d.assumptions.currentBurn}</p><p style={label}>Monthly Burn</p></div>
            )}
            {d.assumptions.currentHeadcount !== undefined && (
              <div><p style={bigNum}>{d.assumptions.currentHeadcount}</p><p style={label}>Headcount</p></div>
            )}
            {d.assumptions.avgDealSize !== undefined && (
              <div><p style={bigNum}>{d.assumptions.avgDealSize}</p><p style={label}>Avg Deal Size</p></div>
            )}
            {d.assumptions.salesCycleMonths !== undefined && (
              <div><p style={bigNum}>{d.assumptions.salesCycleMonths}mo</p><p style={label}>Sales Cycle</p></div>
            )}
            {d.assumptions.grossMargin !== undefined && (
              <div><p style={bigNum}>{d.assumptions.grossMargin}</p><p style={label}>Gross Margin</p></div>
            )}
          </div>
        </CardContent></Card>
      )}

      {/* Scenarios side by side */}
      {d.scenarios && (
        <div style={{ display: 'flex', gap: 10 }}>
          {scenarioCards.map(({ key, label: lbl, color, s }) => s && (
            <div key={key} style={{ flex: 1, padding: '12px 14px', background: `${color}08`, border: `1.5px solid ${color}30`, borderRadius: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{lbl}</p>
              {s.description && <p style={{ fontSize: 11, color: muted, marginBottom: 8, lineHeight: 1.5 }}>{s.description}</p>}
              {(s as Record<string, unknown>).month12Mrr !== undefined && (
                <div style={{ marginBottom: 6 }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: ink }}>{String((s as Record<string, unknown>).month12Mrr)}</p>
                  <p style={label}>MRR @ Mo.12</p>
                </div>
              )}
              {(s as Record<string, unknown>).month18Mrr !== undefined && (
                <div style={{ marginBottom: 6 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: ink }}>{String((s as Record<string, unknown>).month18Mrr)}</p>
                  <p style={label}>MRR @ Mo.18</p>
                </div>
              )}
              {s.runway && <p style={{ fontSize: 11, color: ink }}>Runway: <strong>{s.runway}</strong></p>}
              {Boolean((s as Record<string, unknown>).breakeven) && <p style={{ fontSize: 11, color: green }}>Breakeven: {String((s as Record<string, unknown>).breakeven)}</p>}
              {Boolean((s as Record<string, unknown>).requiredAction) && <p style={{ fontSize: 11, color: red, marginTop: 6, fontStyle: 'italic' }}>{String((s as Record<string, unknown>).requiredAction)}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Key Milestones */}
      {d.keyMilestones && d.keyMilestones.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Key Milestones</p>
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {d.keyMilestones.map((m, i) => (
              <div key={i} style={{ flex: 1, minWidth: 100, textAlign: 'center', position: 'relative', padding: '0 8px' }}>
                {i < d.keyMilestones!.length - 1 && (
                  <div style={{ position: 'absolute', top: 11, left: '50%', right: '-50%', height: 2, background: `${blue}30`, zIndex: 0 }} />
                )}
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: blue, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', position: 'relative', zIndex: 1 }}>
                  {m.month}
                </div>
                <p style={{ fontSize: 11, fontWeight: 600, color: ink, marginBottom: 3 }}>{m.milestone}</p>
                {m.mrr && <p style={{ fontSize: 10, color: green }}>{String(m.mrr)}</p>}
                {m.headcount && <p style={{ fontSize: 10, color: muted }}>{m.headcount} ppl</p>}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Hiring Plan */}
      {d.hiringPlan && d.hiringPlan.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Hiring Plan</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${muted}30` }}>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: muted, fontWeight: 600, fontSize: 10 }}>Role</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: muted, fontWeight: 600, fontSize: 10 }}>Month</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: muted, fontWeight: 600, fontSize: 10 }}>Cost</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: muted, fontWeight: 600, fontSize: 10 }}>Rationale</th>
              </tr>
            </thead>
            <tbody>
              {d.hiringPlan.map((h, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${muted}15` }}>
                  <td style={{ padding: '6px 8px', color: ink, fontWeight: 600 }}>{h.role}</td>
                  <td style={{ padding: '6px 8px', color: muted }}>Mo. {h.month}</td>
                  <td style={{ padding: '6px 8px', color: amber }}>{String(h.cost)}</td>
                  <td style={{ padding: '6px 8px', color: muted, fontSize: 11 }}>{h.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {/* Fundraising Recommendation */}
      {d.fundraisingRecommendation && (
        <div style={{ padding: '14px 16px', background: `${blue}08`, border: `1.5px solid ${blue}30`, borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue }}>Fundraising Recommendation</p>
            {d.fundraisingRecommendation.shouldRaise !== undefined && (
              <span style={pill(d.fundraisingRecommendation.shouldRaise ? green : red)}>
                {d.fundraisingRecommendation.shouldRaise ? 'Raise Now' : 'Wait'}
              </span>
            )}
          </div>
          {d.fundraisingRecommendation.amount && (
            <p style={{ fontSize: 18, fontWeight: 700, color: ink, marginBottom: 4 }}>{String(d.fundraisingRecommendation.amount)}</p>
          )}
          {d.fundraisingRecommendation.timing && (
            <p style={{ fontSize: 12, color: muted, marginBottom: 6 }}>Timing: {d.fundraisingRecommendation.timing}</p>
          )}
          {d.fundraisingRecommendation.rationale && (
            <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.fundraisingRecommendation.rationale}</p>
          )}
        </div>
      )}
    </div>
  )
}
