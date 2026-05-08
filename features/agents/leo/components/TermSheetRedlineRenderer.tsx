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

export function TermSheetRedlineRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    termSheetDate?: string
    investor?: string
    company?: string
    summary?: string
    analysis?: {
      term: string
      theirProposal?: string
      recommendation?: string
      riskLevel?: string
      suggestedRedline?: string
      rationale?: string
    }[]
    acceptableTerms?: string[]
    redFlags?: string[]
    negotiationStrategy?: string
    overallAssessment?: string
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Legal disclaimer */}
      <div style={{ padding: '8px 12px', background: `${amber}10`, border: `1px solid ${amber}30`, borderRadius: 8 }}>
        <p style={{ fontSize: 11, color: amber, fontWeight: 600 }}>
          This redline analysis is for informational purposes only. Not legal advice — engage qualified legal counsel for final term sheet negotiations.
        </p>
      </div>

      {/* Header */}
      <div style={{ padding: '14px 16px', background: `${blue}06`, border: `1.5px solid ${blue}25`, borderRadius: 12 }}>
        {d.title && <h1 style={{ fontSize: 16, fontWeight: 800, color: ink, marginBottom: 6 }}>{d.title}</h1>}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {d.investor && <p style={{ fontSize: 11, color: muted }}>Investor: <strong style={{ color: ink }}>{d.investor}</strong></p>}
          {d.company && <p style={{ fontSize: 11, color: muted }}>Company: <strong style={{ color: ink }}>{d.company}</strong></p>}
          {d.termSheetDate && <p style={{ fontSize: 11, color: muted }}>Date: {d.termSheetDate}</p>}
        </div>
        {d.summary && <p style={{ fontSize: 12, color: ink, marginTop: 8, lineHeight: 1.5 }}>{d.summary}</p>}
      </div>

      {/* Analysis Comparison Table */}
      {d.analysis && d.analysis.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Term-by-Term Analysis</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.analysis.map((a, i) => {
              const rc = RISK_COLOR[a.riskLevel?.toLowerCase() ?? ''] ?? muted
              return (
                <div key={i} style={{ border: `1.5px solid ${rc}30`, borderRadius: 10, overflow: 'hidden' }}>
                  {/* Term header */}
                  <div style={{ padding: '8px 12px', background: `${rc}10`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: ink, flex: 1 }}>{a.term}</p>
                    {a.riskLevel && <span style={pill(rc)}>{a.riskLevel} risk</span>}
                    {a.recommendation && <span style={pill(a.recommendation === 'accept' ? green : a.recommendation === 'reject' ? red : amber)}>{a.recommendation}</span>}
                  </div>
                  {/* Proposal vs Redline */}
                  <div style={{ display: 'flex', gap: 0 }}>
                    {a.theirProposal && (
                      <div style={{ flex: 1, padding: '10px 12px', borderRight: `1px solid ${muted}20` }}>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: red, marginBottom: 4 }}>Their Proposal</p>
                        <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{a.theirProposal}</p>
                      </div>
                    )}
                    {a.suggestedRedline && (
                      <div style={{ flex: 1, padding: '10px 12px' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: green, marginBottom: 4 }}>Suggested Redline</p>
                        <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{a.suggestedRedline}</p>
                      </div>
                    )}
                  </div>
                  {/* Rationale */}
                  {a.rationale && (
                    <div style={{ padding: '8px 12px', borderTop: `1px solid ${muted}15`, background: `${muted}04` }}>
                      <p style={{ fontSize: 11, color: muted, lineHeight: 1.5, fontStyle: 'italic' }}>Rationale: {a.rationale}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Acceptable Terms / Red Flags */}
      {((d.acceptableTerms && d.acceptableTerms.length > 0) || (d.redFlags && d.redFlags.length > 0)) && (
        <div style={{ display: 'flex', gap: 10 }}>
          {d.acceptableTerms && d.acceptableTerms.length > 0 && (
            <div style={{ flex: 1, padding: '12px 14px', background: `${green}08`, border: `1px solid ${green}25`, borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: green, marginBottom: 8 }}>Acceptable Terms</p>
              {d.acceptableTerms.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                  <span style={{ color: green, fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{t}</p>
                </div>
              ))}
            </div>
          )}
          {d.redFlags && d.redFlags.length > 0 && (
            <div style={{ flex: 1, padding: '12px 14px', background: `${red}08`, border: `1px solid ${red}25`, borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: red, marginBottom: 8 }}>Red Flags</p>
              {d.redFlags.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                  <span style={{ color: red, fontWeight: 700, flexShrink: 0 }}>✗</span>
                  <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{f}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Negotiation Strategy Callout */}
      {d.negotiationStrategy && (
        <div style={{ padding: '14px 16px', background: `${blue}08`, border: `1.5px solid ${blue}30`, borderRadius: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: blue, marginBottom: 8 }}>Negotiation Strategy</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.7 }}>{d.negotiationStrategy}</p>
        </div>
      )}

      {/* Overall Assessment */}
      {d.overallAssessment && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Overall Assessment</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.7 }}>{d.overallAssessment}</p>
        </CardContent></Card>
      )}
    </div>
  )
}
