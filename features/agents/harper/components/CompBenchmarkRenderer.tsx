'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ink, muted, green, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

const pill = (color: string) => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
  fontSize: 10, fontWeight: 600, background: `${color}18`, color,
})

export function CompBenchmarkRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    role?: string
    location?: string
    stage?: string
    marketData?: { percentile: string; baseSalary?: string; totalComp?: string; equityRange?: string }[]
    benchmarkSummary?: string
    ourBandRecommendation?: { base?: string; equity?: string; total?: string }
    peers?: string[]
    keyFindings?: string[]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <p style={{ fontSize: 16, fontWeight: 700, color: ink, marginBottom: 6 }}>{d.role ?? d.title}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {d.location && <span style={pill(muted)}>{d.location}</span>}
            {d.stage && <span style={pill(blue)}>{d.stage}</span>}
          </div>
          {d.benchmarkSummary && (
            <p style={{ fontSize: 12, color: muted, marginTop: 8, lineHeight: 1.6 }}>{d.benchmarkSummary}</p>
          )}
        </CardContent>
      </Card>

      {/* Market Data Percentile Table */}
      {d.marketData && d.marketData.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Market Data</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Percentile', 'Base Salary', 'Total Comp', 'Equity Range'].map((h, i) => (
                      <th key={i} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '6px 10px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted, borderBottom: `1px solid ${muted}20` }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.marketData.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : `${muted}04` }}>
                      <td style={{ padding: '9px 10px', fontSize: 12, fontWeight: 700, color: blue }}>
                        {row.percentile}
                      </td>
                      <td style={{ padding: '9px 10px', fontSize: 12, color: ink, textAlign: 'right' }}>
                        {row.baseSalary ?? '—'}
                      </td>
                      <td style={{ padding: '9px 10px', fontSize: 12, color: ink, textAlign: 'right' }}>
                        {row.totalComp ?? '—'}
                      </td>
                      <td style={{ padding: '9px 10px', fontSize: 12, color: ink, textAlign: 'right' }}>
                        {row.equityRange ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Our Band Recommendation — highlighted blue */}
      {d.ourBandRecommendation && (
        <div style={{ padding: '14px 16px', background: `${blue}08`, border: `1.5px solid ${blue}35`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 10 }}>
            Our Recommended Band
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'Base', value: d.ourBandRecommendation.base },
              { label: 'Equity', value: d.ourBandRecommendation.equity },
              { label: 'Total', value: d.ourBandRecommendation.total },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '8px 6px', background: '#fff', borderRadius: 8, border: `1px solid ${blue}20` }}>
                <p style={{ fontSize: 10, color: muted, marginBottom: 3 }}>{item.label}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: blue }}>{item.value ?? '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Peer Comparison */}
      {d.peers && d.peers.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Peer Companies</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {d.peers.map((p, i) => (
                <Badge key={i} variant="outline" style={{ fontSize: 10 }}>{p}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Findings */}
      {d.keyFindings && d.keyFindings.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Key Findings</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {d.keyFindings.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 5, background: `${green}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: green, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingTop: 2 }}>{f}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
