'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

export function FundraisingNarrativeRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    investmentThesis?: string
    problem?: string
    solution?: string
    traction?: { headline?: string; metrics?: Record<string, string | number> }
    market?: { tam?: string | number; sam?: string | number; som?: string | number }
    businessModel?: string
    whyNow?: string
    team?: string
    ask?: { amount?: string | number; use?: string; milestones?: string[] }
    closingHook?: string
  }

  const tractionMetrics = d.traction?.metrics ? Object.entries(d.traction.metrics) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Investment Thesis Callout */}
      {d.investmentThesis && (
        <div style={{ padding: '16px 18px', background: `${blue}08`, border: `2px solid ${blue}35`, borderRadius: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: blue, marginBottom: 8 }}>Investment Thesis</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: ink, lineHeight: 1.6 }}>{d.investmentThesis}</p>
        </div>
      )}

      {/* Problem / Solution two-panel */}
      {(d.problem || d.solution) && (
        <div style={{ display: 'flex', gap: 10 }}>
          {d.problem && (
            <div style={{ flex: 1, padding: '12px 14px', background: `${red}08`, border: `1px solid ${red}25`, borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: red, marginBottom: 6 }}>Problem</p>
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.problem}</p>
            </div>
          )}
          {d.solution && (
            <div style={{ flex: 1, padding: '12px 14px', background: `${green}08`, border: `1px solid ${green}25`, borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: green, marginBottom: 6 }}>Solution</p>
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.solution}</p>
            </div>
          )}
        </div>
      )}

      {/* Traction */}
      {d.traction && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Traction</p>
          {d.traction.headline && <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 10 }}>{d.traction.headline}</p>}
          {tractionMetrics.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {tractionMetrics.map(([key, val], i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 800, color: green, lineHeight: 1 }}>{String(val)}</p>
                  <p style={{ fontSize: 10, color: muted, marginTop: 3 }}>{key}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
      )}

      {/* Market Size — nested text ovals */}
      {d.market && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Market Size</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.market.tam && (
              <div style={{ padding: '10px 14px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 50, textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: muted }}>TAM (Total Addressable)</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: blue }}>{String(d.market.tam)}</p>
              </div>
            )}
            {d.market.sam && (
              <div style={{ padding: '10px 14px', background: `${green}08`, border: `1px solid ${green}25`, borderRadius: 50, textAlign: 'center', margin: '0 16px' }}>
                <p style={{ fontSize: 11, color: muted }}>SAM (Serviceable)</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: green }}>{String(d.market.sam)}</p>
              </div>
            )}
            {d.market.som && (
              <div style={{ padding: '10px 14px', background: `${amber}08`, border: `1px solid ${amber}25`, borderRadius: 50, textAlign: 'center', margin: '0 32px' }}>
                <p style={{ fontSize: 11, color: muted }}>SOM (Obtainable)</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: amber }}>{String(d.market.som)}</p>
              </div>
            )}
          </div>
        </CardContent></Card>
      )}

      {/* Business Model */}
      {d.businessModel && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Business Model</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.businessModel}</p>
        </CardContent></Card>
      )}

      {/* Why Now */}
      {d.whyNow && (
        <div style={{ padding: '10px 14px', background: `${amber}08`, border: `1px solid ${amber}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: amber, marginBottom: 4 }}>Why Now</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.whyNow}</p>
        </div>
      )}

      {/* Team */}
      {d.team && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Team</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.team}</p>
        </CardContent></Card>
      )}

      {/* Ask */}
      {d.ask && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>The Ask</p>
          {d.ask.amount && (
            <p style={{ fontSize: 28, fontWeight: 800, color: blue, marginBottom: 8 }}>{String(d.ask.amount)}</p>
          )}
          {d.ask.use && <p style={{ fontSize: 12, color: ink, marginBottom: 8 }}>Use of funds: {d.ask.use}</p>}
          {d.ask.milestones && d.ask.milestones.length > 0 && (
            <div>
              <p style={{ fontSize: 10, color: muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Milestones</p>
              {d.ask.milestones.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4 }}>
                  <span style={{ color: green, fontWeight: 700, flexShrink: 0 }}>→</span>
                  <p style={{ fontSize: 12, color: ink }}>{m}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
      )}

      {/* Closing Hook */}
      {d.closingHook && (
        <div style={{ padding: '12px 16px', background: `${blue}06`, border: `1px solid ${blue}20`, borderRadius: 10 }}>
          <p style={{ fontSize: 14, color: ink, fontStyle: 'italic', lineHeight: 1.6, textAlign: 'center' }}>&quot;{d.closingHook}&quot;</p>
        </div>
      )}
    </div>
  )
}
