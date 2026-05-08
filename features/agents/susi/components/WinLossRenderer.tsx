'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

const pill = (color: string): React.CSSProperties => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
  fontSize: 10, fontWeight: 600, background: `${color}18`, color,
})

const FREQ_COLOR = (f: number | string): string => {
  const n = typeof f === 'string' ? parseFloat(f) : f
  if (n >= 0.6) return red
  if (n >= 0.35) return amber
  return muted
}

export function WinLossRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    summary?: string
    winRate?: string | number
    dealsAnalyzed?: { won?: number; lost?: number; total?: number }
    winPatterns?: { pattern: string; frequency: string | number; implication: string }[]
    lossPatterns?: { pattern: string; frequency: string | number; implication: string }[]
    competitorAnalysis?: { competitor: string; lossCount: number; mainReason: string; response: string }[]
    commonObjections?: { objection: string; frequency: string | number; currentHandling: string; betterResponse: string }[]
    dealSizeInsight?: string
    stageLossAnalysis?: { stage: string; lossRate: string | number; reason: string; fix: string }[]
    recommendations?: string[]
  }

  const deals = d.dealsAnalyzed ?? {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Win rate hero */}
      {d.winRate !== undefined && (
        <div style={{ padding: '16px 18px', background: `${green}0a`, border: `1px solid ${green}25`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: muted, marginBottom: 4 }}>Win Rate</p>
            <p style={{ fontSize: 36, fontWeight: 800, color: green, lineHeight: 1 }}>{String(d.winRate)}</p>
          </div>
          {(deals.won !== undefined || deals.lost !== undefined || deals.total !== undefined) && (
            <div style={{ display: 'flex', gap: 12, marginLeft: 8 }}>
              {deals.won !== undefined && (
                <div style={{ textAlign: 'center' as const }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: green }}>{deals.won}</p>
                  <p style={{ fontSize: 10, color: muted }}>Won</p>
                </div>
              )}
              {deals.lost !== undefined && (
                <div style={{ textAlign: 'center' as const }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: red }}>{deals.lost}</p>
                  <p style={{ fontSize: 10, color: muted }}>Lost</p>
                </div>
              )}
              {deals.total !== undefined && (
                <div style={{ textAlign: 'center' as const }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: ink }}>{deals.total}</p>
                  <p style={{ fontSize: 10, color: muted }}>Total</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {d.summary && (
        <Card><CardContent className="pt-3 pb-3">
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.summary}</p>
        </CardContent></Card>
      )}

      {/* Win Patterns */}
      {d.winPatterns && d.winPatterns.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Win Patterns</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.winPatterns.map((p, i) => (
              <div key={i} style={{ padding: '10px 12px', background: `${green}08`, border: `1px solid ${green}20`, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: ink, flex: 1 }}>{p.pattern}</p>
                  <span style={pill(green)}>{typeof p.frequency === 'number' ? `${Math.round(p.frequency * 100)}%` : String(p.frequency)}</span>
                </div>
                <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{p.implication}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Loss Patterns */}
      {d.lossPatterns && d.lossPatterns.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Loss Patterns</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.lossPatterns.map((p, i) => (
              <div key={i} style={{ padding: '10px 12px', background: `${red}08`, border: `1px solid ${red}20`, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: ink, flex: 1 }}>{p.pattern}</p>
                  <span style={pill(FREQ_COLOR(p.frequency))}>{typeof p.frequency === 'number' ? `${Math.round(p.frequency * 100)}%` : String(p.frequency)}</span>
                </div>
                <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{p.implication}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Competitor Analysis */}
      {d.competitorAnalysis && d.competitorAnalysis.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Competitor Analysis</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.competitorAnalysis.map((comp, i) => (
              <div key={i} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${amber}25`, background: `${amber}06` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: ink, flex: 1 }}>{comp.competitor}</p>
                  <span style={{ fontSize: 11, fontWeight: 600, color: red }}>{comp.lossCount} loss{comp.lossCount !== 1 ? 'es' : ''}</span>
                </div>
                <p style={{ fontSize: 11, color: amber, marginBottom: 4, lineHeight: 1.4 }}>Why lost: {comp.mainReason}</p>
                <p style={{ fontSize: 11, color: green, lineHeight: 1.4 }}>Response: {comp.response}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Common Objections — improvement cards */}
      {d.commonObjections && d.commonObjections.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Common Objections — Better Responses</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.commonObjections.map((obj, i) => (
              <div key={i} style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${muted}15` }}>
                <div style={{ padding: '8px 12px', background: `${amber}08`, borderBottom: `1px solid ${amber}15` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: ink, flex: 1 }}>{obj.objection}</p>
                    <span style={pill(FREQ_COLOR(obj.frequency))}>{typeof obj.frequency === 'number' ? `${Math.round(obj.frequency * 100)}%` : String(obj.frequency)}</span>
                  </div>
                </div>
                <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: red, marginBottom: 3 }}>Current</p>
                    <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{obj.currentHandling}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: green, marginBottom: 3 }}>Better</p>
                    <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{obj.betterResponse}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Deal Size Insight */}
      {d.dealSizeInsight && (
        <div style={{ padding: '10px 14px', background: `${blue}08`, border: `1px solid ${blue}20`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: blue, marginBottom: 4 }}>Deal Size Insight</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.dealSizeInsight}</p>
        </div>
      )}

      {/* Stage Loss Analysis */}
      {d.stageLossAnalysis && d.stageLossAnalysis.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Stage Loss Analysis</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.stageLossAnalysis.map((s, i) => (
              <div key={i} style={{ padding: '10px 12px', background: `${red}06`, border: `1px solid ${red}15`, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={pill(red)}>{s.stage}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: red }}>{typeof s.lossRate === 'number' ? `${Math.round(s.lossRate * 100)}% loss rate` : String(s.lossRate)}</span>
                </div>
                <p style={{ fontSize: 11, color: muted, marginBottom: 4, lineHeight: 1.4 }}>Why: {s.reason}</p>
                <p style={{ fontSize: 11, color: green, lineHeight: 1.4 }}>Fix: {s.fix}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Recommendations — bold numbered list */}
      {d.recommendations && d.recommendations.length > 0 && (
        <div style={{ padding: '12px 14px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: blue, marginBottom: 8 }}>Recommendations</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.recommendations.map((r, i) => (
              <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>
                <strong style={{ color: blue }}>{i + 1}. </strong>{r}
              </p>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
