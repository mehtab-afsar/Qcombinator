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

const RISK_COLOR: Record<string, string> = {
  high: red, medium: amber, low: green, critical: red,
}

export function IPAuditRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    summary?: string
    filings?: { type: string; name?: string; status?: string; filedDate?: string; jurisdiction?: string; notes?: string }[]
    openSourceRisks?: { library: string; license: string; severity: string; issue?: string; recommendation?: string }[]
    ownershipGaps?: { description: string; affectedAsset?: string; priority?: string; action?: string }[]
    priorityActions?: { action: string; timeline?: string; owner?: string }[]
    overallRiskLevel?: string
  }

  const riskColor = RISK_COLOR[d.overallRiskLevel?.toLowerCase() ?? ''] ?? muted

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Risk Level Header */}
      <div style={{ padding: '14px 16px', background: `${riskColor}08`, border: `2px solid ${riskColor}30`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: riskColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{d.overallRiskLevel ?? '?'}</span>
        </div>
        <div>
          {d.title && <h1 style={{ fontSize: 15, fontWeight: 800, color: ink, marginBottom: 4 }}>{d.title}</h1>}
          {d.summary && <p style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>{d.summary}</p>}
        </div>
      </div>

      {/* IP Filings Table */}
      {d.filings && d.filings.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>IP Filings</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${muted}30` }}>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: muted, fontWeight: 600, fontSize: 10 }}>Type</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: muted, fontWeight: 600, fontSize: 10 }}>Name</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: muted, fontWeight: 600, fontSize: 10 }}>Status</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: muted, fontWeight: 600, fontSize: 10 }}>Jurisdiction</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: muted, fontWeight: 600, fontSize: 10 }}>Filed</th>
              </tr>
            </thead>
            <tbody>
              {d.filings.map((f, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${muted}15` }}>
                  <td style={{ padding: '6px 8px' }}><span style={pill(blue)}>{f.type}</span></td>
                  <td style={{ padding: '6px 8px', color: ink, fontWeight: 600 }}>{f.name ?? '—'}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={pill(f.status?.toLowerCase() === 'granted' || f.status?.toLowerCase() === 'registered' ? green : f.status?.toLowerCase() === 'pending' ? amber : muted)}>
                      {f.status ?? '—'}
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px', color: muted, fontSize: 11 }}>{f.jurisdiction ?? '—'}</td>
                  <td style={{ padding: '6px 8px', color: muted, fontSize: 11 }}>{f.filedDate ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {/* Open Source Risks */}
      {d.openSourceRisks && d.openSourceRisks.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Open Source Risks</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.openSourceRisks.map((r, i) => {
              const sc = RISK_COLOR[r.severity?.toLowerCase() ?? ''] ?? muted
              return (
                <div key={i} style={{ padding: '10px 12px', background: `${sc}06`, border: `1px solid ${sc}25`, borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: ink }}>{r.library}</span>
                    <span style={pill(muted)}>{r.license}</span>
                    <span style={{ ...pill(sc), marginLeft: 'auto' }}>{r.severity}</span>
                  </div>
                  {r.issue && <p style={{ fontSize: 11, color: muted, marginBottom: 3 }}>Issue: {r.issue}</p>}
                  {r.recommendation && <p style={{ fontSize: 11, color: green }}>Fix: {r.recommendation}</p>}
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Ownership Gaps */}
      {d.ownershipGaps && d.ownershipGaps.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Ownership Gaps</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.ownershipGaps.map((g, i) => (
              <div key={i} style={{ borderLeft: `3px solid ${amber}`, paddingLeft: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 3 }}>{g.description}</p>
                {g.affectedAsset && <p style={{ fontSize: 11, color: muted }}>Asset: {g.affectedAsset}</p>}
                {g.priority && <span style={pill(RISK_COLOR[g.priority?.toLowerCase() ?? ''] ?? muted)}>{g.priority}</span>}
                {g.action && <p style={{ fontSize: 11, color: blue, marginTop: 4 }}>Action: {g.action}</p>}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Priority Actions */}
      {d.priorityActions && d.priorityActions.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Priority Actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.priorityActions.map((pa, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: `${red}06`, border: `1px solid ${red}20`, borderRadius: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: red, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{pa.action}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                    {pa.timeline && <p style={{ fontSize: 10, color: amber }}>{pa.timeline}</p>}
                    {pa.owner && <p style={{ fontSize: 10, color: muted }}>Owner: {pa.owner}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
    </div>
  )
}
