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

const SENTIMENT_COLOR: Record<string, string> = {
  positive: green, negative: red, mixed: amber, neutral: muted,
}

export function ReviewIntelligenceRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    period?: string
    competitorsAnalyzed?: number | string | string[]
    keyFindings?: { competitor: string; theme?: string; sentiment?: string; customerQuotes?: string[]; ourOpportunity?: string }[]
    commonComplaints?: { complaint: string; frequency?: string | number; affectedCompetitors?: string[]; ourAdvantage?: string }[]
    praisePatterns?: { praise: string; competitor?: string; howWeCompete?: string }[]
    recommendations?: string[]
  }

  const analyzedList = Array.isArray(d.competitorsAnalyzed)
    ? d.competitorsAnalyzed
    : d.competitorsAnalyzed
      ? [String(d.competitorsAnalyzed)]
      : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header meta */}
      {(d.period || analyzedList.length > 0) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
          {d.period && <span style={pill(blue)}>{d.period}</span>}
          {typeof d.competitorsAnalyzed === 'number' && (
            <span style={{ fontSize: 11, color: muted }}>{d.competitorsAnalyzed} competitors analyzed</span>
          )}
          {analyzedList.filter(c => typeof c === 'string' && isNaN(Number(c))).map((c, i) => (
            <Badge key={i} variant="outline" style={{ fontSize: 10 }}>{c}</Badge>
          ))}
        </div>
      )}

      {/* Key Findings */}
      {d.keyFindings && d.keyFindings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={sectionHead}>Key Findings</p>
          {d.keyFindings.map((finding, i) => {
            const sc = SENTIMENT_COLOR[finding.sentiment?.toLowerCase() ?? ''] ?? muted
            return (
              <Card key={i}><CardContent className="pt-0 pb-4">
                {/* Sentiment-colored header bar */}
                <div style={{
                  margin: '0 -24px', padding: '8px 24px', marginBottom: 10,
                  background: `${sc}15`, borderBottom: `1px solid ${sc}25`,
                  display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  <Badge variant="outline" style={{ fontSize: 10, fontWeight: 700, color: sc, borderColor: `${sc}50` }}>
                    {finding.competitor}
                  </Badge>
                  {finding.theme && <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{finding.theme}</span>}
                  {finding.sentiment && <span style={{ ...pill(sc), marginLeft: 'auto' }}>{finding.sentiment}</span>}
                </div>

                {/* Customer Quotes */}
                {finding.customerQuotes && finding.customerQuotes.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: finding.ourOpportunity ? 10 : 0 }}>
                    {finding.customerQuotes.map((quote, qi) => (
                      <p key={qi} style={{
                        fontSize: 11, color: muted, lineHeight: 1.6, fontStyle: 'italic',
                        paddingLeft: 10, borderLeft: `2px solid ${sc}40`,
                      }}>
                        &quot;{quote}&quot;
                      </p>
                    ))}
                  </div>
                )}

                {/* Our Opportunity */}
                {finding.ourOpportunity && (
                  <div style={{ padding: '6px 10px', background: `${green}08`, borderRadius: 6, border: `1px solid ${green}25` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: green, marginBottom: 2 }}>Our Opportunity</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{finding.ourOpportunity}</p>
                  </div>
                )}
              </CardContent></Card>
            )
          })}
        </div>
      )}

      {/* Common Complaints */}
      {d.commonComplaints && d.commonComplaints.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Common Complaints</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.commonComplaints.map((complaint, i) => (
              <div key={i} style={{ borderLeft: `3px solid ${red}`, paddingLeft: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: ink, flex: 1 }}>{complaint.complaint}</p>
                  {complaint.frequency && <span style={pill(red)}>Freq: {complaint.frequency}</span>}
                </div>
                {complaint.affectedCompetitors && complaint.affectedCompetitors.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginBottom: complaint.ourAdvantage ? 6 : 0 }}>
                    {complaint.affectedCompetitors.map((c, ci) => (
                      <Badge key={ci} variant="outline" style={{ fontSize: 10, color: muted }}>{c}</Badge>
                    ))}
                  </div>
                )}
                {complaint.ourAdvantage && (
                  <p style={{ fontSize: 11, color: green, fontWeight: 600 }}>Our Advantage: {complaint.ourAdvantage}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Praise Patterns */}
      {d.praisePatterns && d.praisePatterns.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Praise Patterns — Strengths to Beat</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.praisePatterns.map((pattern, i) => (
              <div key={i} style={{ padding: '8px 10px', background: `${amber}08`, borderRadius: 8, border: `1px solid ${amber}20` }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: pattern.howWeCompete ? 6 : 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: ink, flex: 1 }}>{pattern.praise}</p>
                  {pattern.competitor && <span style={pill(amber)}>{pattern.competitor}</span>}
                </div>
                {pattern.howWeCompete && (
                  <p style={{ fontSize: 11, color: green }}>How we compete: {pattern.howWeCompete}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Recommendations */}
      {d.recommendations && d.recommendations.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Recommendations</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.recommendations.map((rec, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${blue}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: blue, flexShrink: 0 }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{rec}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

    </div>
  )
}
