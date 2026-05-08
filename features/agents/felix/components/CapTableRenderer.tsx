'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ink, muted, green, amber, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

const pill = (color: string) => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
  fontSize: 10, fontWeight: 600, background: `${color}18`, color,
})

const TYPE_COLOR: Record<string, string> = {
  founder: blue, investor: green, employee: amber, advisor: muted, option: muted,
}

export function CapTableRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    totalShares?: string | number
    preMoney?: string | number
    postMoney?: string | number
    shareholders?: { name: string; type?: string; shares: number | string; percentage: number | string; vestingSchedule?: string }[]
    optionPool?: { authorized?: number | string; issued?: number | string; available?: number | string }
    dilutionScenarios?: { scenario: string; newInvestor?: string; investmentAmount?: string | number; founderDilution?: string | number; newCap?: string | number }[]
    nextRoundProjection?: string
  }

  const getPercentNum = (p: number | string | undefined) => {
    if (p === undefined) return 0
    const s = String(p).replace('%', '')
    return parseFloat(s) || 0
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Pre/Post Money */}
      {(d.preMoney || d.postMoney || d.totalShares) && (
        <div style={{ display: 'flex', gap: 10 }}>
          {d.preMoney && (
            <div style={{ flex: 1, padding: '12px 14px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10, textAlign: 'center' }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: blue }}>{String(d.preMoney)}</p>
              <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>Pre-Money Valuation</p>
            </div>
          )}
          {d.postMoney && (
            <div style={{ flex: 1, padding: '12px 14px', background: `${green}08`, border: `1px solid ${green}25`, borderRadius: 10, textAlign: 'center' }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: green }}>{String(d.postMoney)}</p>
              <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>Post-Money Valuation</p>
            </div>
          )}
          {d.totalShares && (
            <div style={{ flex: 1, padding: '12px 14px', background: `${muted}08`, border: `1px solid ${muted}25`, borderRadius: 10, textAlign: 'center' }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: ink }}>{String(d.totalShares)}</p>
              <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>Total Shares</p>
            </div>
          )}
        </div>
      )}

      {/* Shareholders Table */}
      {d.shareholders && d.shareholders.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Shareholders</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.shareholders.map((s, i) => {
              const pct = getPercentNum(s.percentage)
              const color = TYPE_COLOR[s.type?.toLowerCase() ?? ''] ?? muted
              return (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: ink, flex: 1 }}>{s.name}</span>
                    {s.type && <span style={pill(color)}>{s.type}</span>}
                    <span style={{ fontSize: 12, fontWeight: 700, color: ink }}>{String(s.percentage)}</span>
                  </div>
                  <div style={{ height: 4, background: `${color}18`, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 4 }} />
                  </div>
                  {s.vestingSchedule && (
                    <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>Vesting: {s.vestingSchedule}</p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Option Pool */}
      {d.optionPool && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Option Pool</p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            {d.optionPool.authorized !== undefined && (
              <div><p style={{ fontSize: 14, fontWeight: 700, color: ink }}>{String(d.optionPool.authorized)}</p><p style={{ fontSize: 10, color: muted }}>Authorized</p></div>
            )}
            {d.optionPool.issued !== undefined && (
              <div><p style={{ fontSize: 14, fontWeight: 700, color: amber }}>{String(d.optionPool.issued)}</p><p style={{ fontSize: 10, color: muted }}>Issued</p></div>
            )}
            {d.optionPool.available !== undefined && (
              <div><p style={{ fontSize: 14, fontWeight: 700, color: green }}>{String(d.optionPool.available)}</p><p style={{ fontSize: 10, color: muted }}>Available</p></div>
            )}
          </div>
          {d.optionPool.authorized && d.optionPool.issued && (
            <div style={{ height: 6, background: `${green}18`, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min((getPercentNum(d.optionPool.issued) / getPercentNum(d.optionPool.authorized)) * 100, 100)}%`,
                background: amber, borderRadius: 6,
              }} />
            </div>
          )}
          <p style={{ fontSize: 10, color: muted, marginTop: 4 }}>Used vs Available</p>
        </CardContent></Card>
      )}

      {/* Dilution Scenarios */}
      {d.dilutionScenarios && d.dilutionScenarios.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Dilution Scenarios</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.dilutionScenarios.map((sc, i) => (
              <div key={i} style={{ padding: '10px 12px', background: `${muted}06`, border: `1px solid ${muted}20`, borderRadius: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 6 }}>{sc.scenario}</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {sc.newInvestor && <div><p style={{ fontSize: 11, color: blue }}>{sc.newInvestor}</p><p style={{ fontSize: 10, color: muted }}>Investor</p></div>}
                  {sc.investmentAmount && <div><p style={{ fontSize: 11, color: green }}>{String(sc.investmentAmount)}</p><p style={{ fontSize: 10, color: muted }}>Investment</p></div>}
                  {sc.founderDilution && <div><p style={{ fontSize: 11, color: amber }}>{String(sc.founderDilution)}</p><p style={{ fontSize: 10, color: muted }}>Founder Dilution</p></div>}
                  {sc.newCap && <div><p style={{ fontSize: 11, color: ink }}>{String(sc.newCap)}</p><p style={{ fontSize: 10, color: muted }}>New Cap</p></div>}
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Next Round Projection */}
      {d.nextRoundProjection && (
        <div style={{ padding: '10px 14px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 4 }}>Next Round Projection</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.nextRoundProjection}</p>
        </div>
      )}
    </div>
  )
}
