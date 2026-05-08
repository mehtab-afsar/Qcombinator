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

export function ExpansionPlaybookRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    account?: string
    expansionSignals?: string[]
    recommendedExpansion?: {
      type: string
      recommendation: string
      price?: string | number
      justification?: string
    }
    talkTrack?: {
      opener?: string
      valueFrame?: string
      objectionHandler?: string
    }
    timing?: string
    successCriteria?: string[]
    nextSteps?: { step: string; owner?: string; date?: string }[]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Account Header */}
      {(d.account || d.title) && (
        <div style={{ padding: '12px 16px', background: `${green}08`, border: `1px solid ${green}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: green, marginBottom: 2 }}>Expansion Playbook</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: ink }}>{d.account ?? d.title}</p>
        </div>
      )}

      {/* Expansion Signals */}
      {d.expansionSignals && d.expansionSignals.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Expansion Signals</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {d.expansionSignals.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: green, fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{s}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Recommended Expansion */}
      {d.recommendedExpansion && (
        <div style={{
          padding: '14px 18px',
          background: `${green}10`,
          border: `2px solid ${green}35`,
          borderRadius: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: green }}>Recommended Expansion</p>
            <span style={pill(green)}>{d.recommendedExpansion.type}</span>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: ink, marginBottom: 6 }}>{d.recommendedExpansion.recommendation}</p>
          {d.recommendedExpansion.price !== undefined && (
            <p style={{ fontSize: 16, fontWeight: 800, color: green, marginBottom: 6 }}>{d.recommendedExpansion.price}</p>
          )}
          {d.recommendedExpansion.justification && (
            <p style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>{d.recommendedExpansion.justification}</p>
          )}
        </div>
      )}

      {/* Talk Track */}
      {d.talkTrack && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Talk Track</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.talkTrack.opener && (
              <div style={{ padding: '10px 14px', background: `${blue}07`, border: `1px solid ${blue}20`, borderRadius: 8, borderLeft: `3px solid ${blue}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: blue, marginBottom: 4 }}>OPENER</p>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, fontStyle: 'italic' }}>&quot;{d.talkTrack.opener}&quot;</p>
              </div>
            )}
            {d.talkTrack.valueFrame && (
              <div style={{ padding: '10px 14px', background: `${green}07`, border: `1px solid ${green}20`, borderRadius: 8, borderLeft: `3px solid ${green}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 4 }}>VALUE FRAME</p>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, fontStyle: 'italic' }}>&quot;{d.talkTrack.valueFrame}&quot;</p>
              </div>
            )}
            {d.talkTrack.objectionHandler && (
              <div style={{ padding: '10px 14px', background: `${amber}07`, border: `1px solid ${amber}20`, borderRadius: 8, borderLeft: `3px solid ${amber}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: amber, marginBottom: 4 }}>OBJECTION HANDLER</p>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, fontStyle: 'italic' }}>&quot;{d.talkTrack.objectionHandler}&quot;</p>
              </div>
            )}
          </div>
        </CardContent></Card>
      )}

      {/* Timing */}
      {d.timing && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', background: `${amber}08`, border: `1px solid ${amber}25`, borderRadius: 10,
        }}>
          <span style={{ fontSize: 14 }}>⏱</span>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: amber, marginBottom: 2 }}>Timing</p>
            <p style={{ fontSize: 12, color: ink }}>{d.timing}</p>
          </div>
        </div>
      )}

      {/* Success Criteria */}
      {d.successCriteria && d.successCriteria.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Success Criteria</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {d.successCriteria.map((c, i) => (
              <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.5 }}>→ {c}</p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Next Steps */}
      {d.nextSteps && d.nextSteps.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Next Steps</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.nextSteps.map((ns, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', background: `${blue}06`, border: `1px solid ${blue}15`, borderRadius: 6 }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, background: blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.4 }}>{ns.step}</p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                    {ns.owner && <p style={{ fontSize: 10, color: muted }}>Owner: {ns.owner}</p>}
                    {ns.date && <p style={{ fontSize: 10, color: amber }}>Due: {ns.date}</p>}
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
