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

export function ProposalRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    prospectName?: string
    contactName?: string
    date?: string
    executiveSummary?: string
    problemStatement?: string
    proposedSolution?: string
    deliverables?: string[]
    pricingTiers?: { name: string; price: string | number; description: string; recommended?: boolean }[]
    roi?: {
      timeToValue?: string
      expectedOutcome?: string
      roiEstimate?: string
    }
    socialProof?: string[]
    nextSteps?: { step: string; action: string; owner?: string; timing?: string }[]
    validUntil?: string
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header meta */}
      {(d.prospectName || d.contactName || d.date) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
          {d.prospectName && <span style={pill(blue)}>{d.prospectName}</span>}
          {d.contactName && <span style={{ fontSize: 11, color: muted }}>Attn: {d.contactName}</span>}
          {d.date && <span style={{ fontSize: 11, color: muted, marginLeft: 'auto' }}>{d.date}</span>}
        </div>
      )}

      {/* Executive Summary — prominent */}
      {d.executiveSummary && (
        <div style={{ padding: '14px 16px', background: `${blue}0a`, border: `1px solid ${blue}25`, borderRadius: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: blue, marginBottom: 8 }}>Executive Summary</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.75, fontWeight: 500 }}>{d.executiveSummary}</p>
        </div>
      )}

      {/* Problem + Solution — before/after */}
      {(d.problemStatement || d.proposedSolution) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {d.problemStatement && (
            <div style={{ padding: '12px 14px', background: `${red}08`, border: `1px solid ${red}20`, borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: red, marginBottom: 6 }}>The Problem</p>
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.65 }}>{d.problemStatement}</p>
            </div>
          )}
          {d.proposedSolution && (
            <div style={{ padding: '12px 14px', background: `${green}08`, border: `1px solid ${green}20`, borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: green, marginBottom: 6 }}>Our Solution</p>
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.65 }}>{d.proposedSolution}</p>
            </div>
          )}
        </div>
      )}

      {/* Deliverables */}
      {d.deliverables && d.deliverables.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Deliverables</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {d.deliverables.map((item, i) => (
              <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingLeft: 10 }}>✓ {item}</p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Pricing Tiers */}
      {d.pricingTiers && d.pricingTiers.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Pricing</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.pricingTiers.map((tier, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 14px',
                  background: tier.recommended ? `${blue}0e` : `transparent`,
                  border: tier.recommended ? `2px solid ${blue}50` : `1px solid ${muted}20`,
                  borderRadius: 10,
                  position: 'relative' as const,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: ink, flex: 1 }}>{tier.name}</span>
                  {tier.recommended && <span style={pill(blue)}>Recommended</span>}
                  <span style={{ fontSize: 15, fontWeight: 800, color: tier.recommended ? blue : ink }}>{String(tier.price)}</span>
                </div>
                <p style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>{tier.description}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* ROI — green tinted box */}
      {d.roi && (
        <div style={{ padding: '12px 14px', background: `${green}0a`, border: `1px solid ${green}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: green, marginBottom: 8 }}>Return on Investment</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {d.roi.timeToValue && (
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 11, color: muted, width: 110, flexShrink: 0 }}>Time to Value</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{d.roi.timeToValue}</span>
              </div>
            )}
            {d.roi.expectedOutcome && (
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 11, color: muted, width: 110, flexShrink: 0 }}>Expected Outcome</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{d.roi.expectedOutcome}</span>
              </div>
            )}
            {d.roi.roiEstimate && (
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 11, color: muted, width: 110, flexShrink: 0 }}>ROI Estimate</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: green }}>{d.roi.roiEstimate}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Social Proof */}
      {d.socialProof && d.socialProof.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Social Proof</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.socialProof.map((proof, i) => (
              <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.6, fontStyle: 'italic', borderLeft: `3px solid ${amber}40`, paddingLeft: 10 }}>&quot;{proof}&quot;</p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Next Steps — numbered timeline */}
      {d.nextSteps && d.nextSteps.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Next Steps</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' as const }}>
            {/* Vertical connector line */}
            <div style={{ position: 'absolute', left: 9, top: 20, bottom: 10, width: 2, background: `${blue}20`, zIndex: 0 }} />
            {d.nextSteps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative' as const, zIndex: 1 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, paddingBottom: 2 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 2 }}>{step.step}</p>
                  <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{step.action}</p>
                  {(step.owner || step.timing) && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {step.owner && <span style={pill(blue)}>{step.owner}</span>}
                      {step.timing && <span style={pill(amber)}>{step.timing}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Valid Until */}
      {d.validUntil && (
        <p style={{ fontSize: 11, color: muted, textAlign: 'center' as const }}>This proposal is valid until <strong style={{ color: amber }}>{d.validUntil}</strong></p>
      )}

    </div>
  )
}
