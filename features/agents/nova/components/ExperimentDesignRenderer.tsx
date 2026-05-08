'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ink, muted, green, amber, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

const pill = (color: string) => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
  fontSize: 10, fontWeight: 600, background: `${color}18`, color,
})

export function ExperimentDesignRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    hypothesis?: string
    successMetric?: string
    primaryMetric?: string
    guardrailMetrics?: string[]
    variants?: { name: string; description?: string; trafficSplit?: string | number }[]
    sampleSizePlan?: { required?: string | number; estimated_weeks?: string | number; power?: string | number; significance?: string | number }
    implementationPlan?: string[]
    risks?: string[]
    stakeholders?: string[]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Hypothesis Callout */}
      {d.hypothesis && (
        <div style={{ padding: '14px 16px', background: `${blue}08`, border: `1.5px solid ${blue}30`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 8 }}>
            Hypothesis
          </p>
          <p style={{ fontSize: 14, color: ink, lineHeight: 1.8, fontStyle: 'italic' }}>&ldquo;{d.hypothesis}&rdquo;</p>
        </div>
      )}

      {/* Metrics */}
      {(d.successMetric || d.primaryMetric || (d.guardrailMetrics && d.guardrailMetrics.length > 0)) && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Metrics</p>
            {(d.successMetric || d.primaryMetric) && (
              <div style={{ padding: '8px 12px', background: `${green}08`, border: `1px solid ${green}25`, borderRadius: 8, marginBottom: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: green, marginBottom: 3 }}>Primary / Success Metric</p>
                <p style={{ fontSize: 12, color: ink }}>{d.primaryMetric ?? d.successMetric}</p>
              </div>
            )}
            {d.guardrailMetrics && d.guardrailMetrics.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: muted, marginBottom: 6 }}>Guardrail Metrics</p>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {d.guardrailMetrics.map((g, i) => (
                    <Badge key={i} variant="outline" style={{ fontSize: 10 }}>{g}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Variants — side by side */}
      {d.variants && d.variants.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Variants</p>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(d.variants.length, 3)}, 1fr)`, gap: 8 }}>
              {d.variants.map((v, i) => {
                const color = i === 0 ? muted : i === 1 ? blue : green
                return (
                  <div key={i} style={{ padding: '10px 12px', border: `1.5px solid ${color}35`, borderRadius: 8, background: `${color}06` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color }}>{v.name}</p>
                      {v.trafficSplit !== undefined && (
                        <span style={pill(color)}>{v.trafficSplit}{typeof v.trafficSplit === 'number' ? '%' : ''}</span>
                      )}
                    </div>
                    {v.description && <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{v.description}</p>}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Size Plan — Key Numbers */}
      {d.sampleSizePlan && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Sample Size Plan</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                { label: 'Sample Required', value: d.sampleSizePlan.required, color: blue },
                { label: 'Est. Duration', value: d.sampleSizePlan.estimated_weeks ? `${d.sampleSizePlan.estimated_weeks} wks` : undefined, color: green },
                { label: 'Statistical Power', value: d.sampleSizePlan.power ? `${d.sampleSizePlan.power}${typeof d.sampleSizePlan.power === 'number' ? '%' : ''}` : undefined, color: amber },
                { label: 'Significance', value: d.sampleSizePlan.significance ? `α ${d.sampleSizePlan.significance}` : undefined, color: muted },
              ].filter(n => n.value !== undefined).map((num, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '10px 8px', background: `${num.color}08`, borderRadius: 8, border: `1px solid ${num.color}20` }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: num.color, marginBottom: 3 }}>{num.value}</p>
                  <p style={{ fontSize: 9, color: muted, lineHeight: 1.3 }}>{num.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Implementation Plan */}
      {d.implementationPlan && d.implementationPlan.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Implementation Plan</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {d.implementationPlan.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingTop: 3 }}>{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risks */}
      {d.risks && d.risks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {d.risks.map((risk, i) => (
            <div key={i} style={{ padding: '10px 14px', background: `${amber}08`, border: `1px solid ${amber}30`, borderRadius: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 12, color: amber, fontWeight: 700, flexShrink: 0 }}>⚠</span>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{risk}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stakeholders */}
      {d.stakeholders && d.stakeholders.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Stakeholders</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {d.stakeholders.map((s, i) => (
                <Badge key={i} variant="outline" style={{ fontSize: 10 }}>{s}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
