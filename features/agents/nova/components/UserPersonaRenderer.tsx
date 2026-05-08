'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

const pill = (color: string) => ({
  display: 'inline-block', padding: '2px 10px', borderRadius: 999,
  fontSize: 11, fontWeight: 500, background: `${color}14`, color,
})

export function UserPersonaRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    name?: string
    tagline?: string
    demographics?: Record<string, string>
    psychographics?: { motivations?: string[]; frustrations?: string[]; goals?: string[] }
    dayInLife?: string
    jobsToBeDone?: string[]
    quoteFromResearch?: string
    productUsage?: { useCases?: string[]; frequency?: string; favoriteFeatures?: string[] }
    segmentSize?: string
    acquisitionChannel?: string
  }

  const initial = (d.name ?? '?').charAt(0).toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Persona Card — Avatar + Name + Tagline */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            {/* Avatar */}
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg, ${blue}, ${green})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{initial}</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: ink, marginBottom: 3 }}>{d.name}</p>
              {d.tagline && <p style={{ fontSize: 12, color: muted, fontStyle: 'italic', lineHeight: 1.5 }}>{d.tagline}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {d.segmentSize && <span style={pill(blue)}>Segment: {d.segmentSize}</span>}
                {d.acquisitionChannel && <span style={pill(green)}>via {d.acquisitionChannel}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demographics — Pill Row */}
      {d.demographics && Object.keys(d.demographics).length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Demographics</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(d.demographics).map(([key, value], i) => (
                <div key={i} style={{ display: 'inline-flex', gap: 0, borderRadius: 999, overflow: 'hidden', border: `1px solid ${muted}25` }}>
                  <span style={{ padding: '3px 8px', fontSize: 10, fontWeight: 600, color: muted, background: `${muted}10`, textTransform: 'capitalize' }}>{key}</span>
                  <span style={{ padding: '3px 10px', fontSize: 11, color: ink, background: 'transparent' }}>{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Psychographics — 3 sections */}
      {d.psychographics && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { label: 'Motivations', items: d.psychographics.motivations, color: green, icon: '→' },
            { label: 'Frustrations', items: d.psychographics.frustrations, color: red, icon: '✕' },
            { label: 'Goals', items: d.psychographics.goals, color: blue, icon: '◎' },
          ].map((section, i) => section.items && section.items.length > 0 ? (
            <div key={i} style={{ padding: '10px 12px', background: `${section.color}07`, border: `1px solid ${section.color}25`, borderRadius: 8 }}>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: section.color, marginBottom: 7 }}>
                {section.label}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {section.items.map((item, j) => (
                  <p key={j} style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>
                    <span style={{ color: section.color, marginRight: 4 }}>{section.icon}</span>{item}
                  </p>
                ))}
              </div>
            </div>
          ) : null)}
        </div>
      )}

      {/* Day in Life */}
      {d.dayInLife && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>A Day in Their Life</p>
            <p style={{ fontSize: 12, color: ink, lineHeight: 1.8 }}>{d.dayInLife}</p>
          </CardContent>
        </Card>
      )}

      {/* Research Quote */}
      {d.quoteFromResearch && (
        <div style={{ padding: '12px 16px', borderLeft: `4px solid ${blue}`, background: `${blue}06`, borderRadius: '0 8px 8px 0' }}>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.8, fontStyle: 'italic' }}>
            &ldquo;{d.quoteFromResearch}&rdquo;
          </p>
        </div>
      )}

      {/* Jobs to Be Done */}
      {d.jobsToBeDone && d.jobsToBeDone.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Jobs to Be Done</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {d.jobsToBeDone.map((j, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 12, color: amber, fontWeight: 700, flexShrink: 0 }}>✦</span>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{j}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Usage */}
      {d.productUsage && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Product Usage</p>
            {d.productUsage.frequency && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 10, color: muted }}>Frequency:</span>
                <span style={{ ...pill(blue), fontSize: 11 }}>{d.productUsage.frequency}</span>
              </div>
            )}
            {d.productUsage.useCases && d.productUsage.useCases.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 10, color: muted, fontWeight: 600, marginBottom: 5 }}>Use Cases</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {d.productUsage.useCases.map((uc, i) => (
                    <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.5 }}>✓ {uc}</p>
                  ))}
                </div>
              </div>
            )}
            {d.productUsage.favoriteFeatures && d.productUsage.favoriteFeatures.length > 0 && (
              <div>
                <p style={{ fontSize: 10, color: muted, fontWeight: 600, marginBottom: 5 }}>Favorite Features</p>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {d.productUsage.favoriteFeatures.map((f, i) => (
                    <Badge key={i} variant="outline" style={{ fontSize: 10 }}>{f}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  )
}
