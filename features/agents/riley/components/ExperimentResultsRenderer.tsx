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

const VERDICT_COLOR: Record<string, string> = {
  ship: green, 'ship it': green,
  kill: red, 'kill it': red,
  iterate: amber,
}

const SIGNIFICANCE_COLOR = (confident: boolean) => confident ? green : amber
const SIGNIFICANCE_LABEL = (confident: boolean) => confident ? 'Statistically Significant' : 'Not Yet Significant'

export function ExperimentResultsRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    hypothesis?: string
    variants?: {
      name: string
      description: string
      sampleSize: string
      result: string
    }[]
    results?: {
      winner?: string
      lift?: string
      pValue?: string
      confidenceLevel?: string
      revenueImpact?: string
    }
    whatWelearned?: string
    decision?: {
      verdict?: string
      rationale?: string
      nextExperiment?: string
    }
    implementationNotes?: string
  }

  const pVal = d.results?.pValue ? parseFloat(d.results.pValue) : undefined
  const confidenceNum = d.results?.confidenceLevel ? parseFloat(d.results.confidenceLevel) : undefined
  const isSignificant = (pVal !== undefined && pVal < 0.05) || (confidenceNum !== undefined && confidenceNum >= 95)

  const verdictKey = d.decision?.verdict?.toLowerCase() ?? ''
  const verdictColor = VERDICT_COLOR[verdictKey] ?? muted

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Hypothesis — Callout Box */}
      {d.hypothesis && (
        <div style={{ padding: '14px 16px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: blue, marginBottom: 8 }}>Hypothesis</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: ink, lineHeight: 1.6, fontStyle: 'italic' }}>&quot;{d.hypothesis}&quot;</p>
        </div>
      )}

      {/* Variants — Side-by-Side Comparison Cards */}
      {d.variants && d.variants.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Variants</p>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(d.variants.length, 2)}, 1fr)`, gap: 8 }}>
            {d.variants.map((v, i) => {
              const isWinner = d.results?.winner && v.name.toLowerCase().includes(d.results.winner.toLowerCase())
              const cardColor = isWinner ? green : i === 0 ? muted : blue
              return (
                <div key={i} style={{ padding: '12px 14px', background: `${cardColor}08`, border: `2px solid ${isWinner ? green : muted}${isWinner ? '40' : '20'}`, borderRadius: 12, position: 'relative' }}>
                  {isWinner && (
                    <div style={{ position: 'absolute', top: -9, right: 10, padding: '2px 8px', background: green, borderRadius: 999, fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: '0.08em' }}>
                      WINNER
                    </div>
                  )}
                  <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 5 }}>{v.name}</p>
                  <p style={{ fontSize: 11, color: muted, lineHeight: 1.5, marginBottom: 10 }}>{v.description}</p>
                  <div style={{ borderTop: `1px solid ${muted}20`, paddingTop: 8 }}>
                    <p style={{ fontSize: 22, fontWeight: 800, color: isWinner ? green : ink }}>{v.result}</p>
                    <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>n={v.sampleSize}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Results — Winner + Lift + Significance */}
      {d.results && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Results</p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
            {/* Lift — Big Number */}
            {d.results.lift && (
              <div style={{ padding: '10px 16px', background: `${green}10`, border: `1px solid ${green}25`, borderRadius: 12, textAlign: 'center' }}>
                <p style={{ fontSize: 36, fontWeight: 900, color: green, lineHeight: 1 }}>{d.results.lift}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Lift</p>
              </div>
            )}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {d.results.winner && (
                <div>
                  <p style={{ fontSize: 10, color: muted, marginBottom: 2 }}>Winner</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: green }}>{d.results.winner}</p>
                </div>
              )}
              {d.results.revenueImpact && (
                <div>
                  <p style={{ fontSize: 10, color: muted, marginBottom: 2 }}>Revenue Impact</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: ink }}>{d.results.revenueImpact}</p>
                </div>
              )}
            </div>
          </div>
          {/* Statistical Significance Badge */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              padding: '5px 12px', borderRadius: 8,
              background: `${SIGNIFICANCE_COLOR(isSignificant)}15`,
              border: `1px solid ${SIGNIFICANCE_COLOR(isSignificant)}40`,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: SIGNIFICANCE_COLOR(isSignificant) }}>
                {SIGNIFICANCE_LABEL(isSignificant)}
              </p>
            </div>
            {d.results.pValue && (
              <span style={pill(muted)}>p={d.results.pValue}</span>
            )}
            {d.results.confidenceLevel && (
              <span style={pill(SIGNIFICANCE_COLOR(isSignificant))}>{d.results.confidenceLevel} confidence</span>
            )}
          </div>
        </CardContent></Card>
      )}

      {/* What We Learned — Key Insight */}
      {d.whatWelearned && (
        <div style={{ padding: '12px 16px', background: `${amber}08`, border: `1px solid ${amber}25`, borderRadius: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: amber, marginBottom: 8 }}>What We Learned</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.7 }}>{d.whatWelearned}</p>
        </div>
      )}

      {/* Decision — Large Verdict Badge */}
      {d.decision && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Decision</p>
          {d.decision.verdict && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '10px 24px', borderRadius: 12, marginBottom: 10,
              background: `${verdictColor}15`, border: `2px solid ${verdictColor}50`,
            }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: verdictColor, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                {d.decision.verdict}
              </p>
            </div>
          )}
          {d.decision.rationale && (
            <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, marginBottom: 8 }}>{d.decision.rationale}</p>
          )}
          {d.decision.nextExperiment && (
            <div style={{ padding: '10px 14px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Next Experiment</p>
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{d.decision.nextExperiment}</p>
            </div>
          )}
        </CardContent></Card>
      )}

      {/* Implementation Notes */}
      {d.implementationNotes && (
        <div style={{ padding: '10px 14px', background: `${muted}06`, border: `1px solid ${muted}20`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Implementation Notes</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.implementationNotes}</p>
        </div>
      )}
    </div>
  )
}
