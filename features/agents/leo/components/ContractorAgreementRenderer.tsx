'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

const importantBox = (color: string) => ({
  padding: '12px 14px', background: `${color}08`, border: `1.5px solid ${color}30`, borderRadius: 10,
})

export function ContractorAgreementRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    parties?: { contractor?: string; company?: string }
    effectiveDate?: string
    services?: string[]
    deliverables?: string[]
    paymentTerms?: { rate?: string | number; schedule?: string; method?: string; currency?: string }
    ipAssignment?: string
    confidentiality?: string
    nonCompete?: string
    termination?: string
    governingLaw?: string
    keyTerms?: { term: string; description: string }[]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Legal disclaimer */}
      <div style={{ padding: '8px 12px', background: `${amber}10`, border: `1px solid ${amber}30`, borderRadius: 8 }}>
        <p style={{ fontSize: 11, color: amber, fontWeight: 600 }}>
          Draft agreement for informational purposes only. Not legal advice — consult qualified legal counsel before execution.
        </p>
      </div>

      {/* Header */}
      <div style={{ padding: '14px 16px', background: `${blue}06`, border: `1.5px solid ${blue}25`, borderRadius: 12 }}>
        {d.title && <h1 style={{ fontSize: 16, fontWeight: 800, color: ink, marginBottom: 6 }}>{d.title}</h1>}
        {d.effectiveDate && <p style={{ fontSize: 11, color: muted }}>Effective Date: {d.effectiveDate}</p>}
        {d.governingLaw && <p style={{ fontSize: 11, color: muted }}>Governing Law: {d.governingLaw}</p>}
      </div>

      {/* Parties */}
      {d.parties && (
        <div style={{ display: 'flex', gap: 10 }}>
          {d.parties.company && (
            <div style={{ flex: 1, padding: '10px 12px', background: `${blue}06`, border: `1px solid ${blue}20`, borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 4 }}>Company</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{d.parties.company}</p>
            </div>
          )}
          {d.parties.contractor && (
            <div style={{ flex: 1, padding: '10px 12px', background: `${green}06`, border: `1px solid ${green}20`, borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: green, marginBottom: 4 }}>Contractor</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{d.parties.contractor}</p>
            </div>
          )}
        </div>
      )}

      {/* Services & Deliverables */}
      {((d.services && d.services.length > 0) || (d.deliverables && d.deliverables.length > 0)) && (
        <div style={{ display: 'flex', gap: 10 }}>
          {d.services && d.services.length > 0 && (
            <Card style={{ flex: 1 }}><CardContent className="pt-4 pb-4">
              <p style={sectionHead}>Services</p>
              {d.services.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                  <span style={{ color: blue, fontWeight: 700, flexShrink: 0, fontSize: 14 }}>☐</span>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{s}</p>
                </div>
              ))}
            </CardContent></Card>
          )}
          {d.deliverables && d.deliverables.length > 0 && (
            <Card style={{ flex: 1 }}><CardContent className="pt-4 pb-4">
              <p style={sectionHead}>Deliverables</p>
              {d.deliverables.map((dl, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                  <span style={{ color: green, fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{dl}</p>
                </div>
              ))}
            </CardContent></Card>
          )}
        </div>
      )}

      {/* Payment Terms — highlighted */}
      {d.paymentTerms && (
        <div style={{ ...importantBox(green) }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: green, marginBottom: 8 }}>Payment Terms</p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {d.paymentTerms.rate && (
              <div>
                <p style={{ fontSize: 20, fontWeight: 800, color: green }}>{String(d.paymentTerms.rate)}</p>
                <p style={{ fontSize: 10, color: muted }}>Rate</p>
              </div>
            )}
            {d.paymentTerms.currency && <div><p style={{ fontSize: 14, fontWeight: 700, color: ink }}>{d.paymentTerms.currency}</p><p style={{ fontSize: 10, color: muted }}>Currency</p></div>}
            {d.paymentTerms.schedule && <div style={{ flex: 1 }}><p style={{ fontSize: 10, color: muted, marginBottom: 2 }}>Schedule</p><p style={{ fontSize: 12, color: ink }}>{d.paymentTerms.schedule}</p></div>}
            {d.paymentTerms.method && <div style={{ flex: 1 }}><p style={{ fontSize: 10, color: muted, marginBottom: 2 }}>Method</p><p style={{ fontSize: 12, color: ink }}>{d.paymentTerms.method}</p></div>}
          </div>
        </div>
      )}

      {/* IP Assignment — important box */}
      {d.ipAssignment && (
        <div style={{ ...importantBox(red) }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: red, marginBottom: 6 }}>IP Assignment</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.ipAssignment}</p>
        </div>
      )}

      {/* Confidentiality — important box */}
      {d.confidentiality && (
        <div style={{ ...importantBox(blue) }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 6 }}>Confidentiality</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.confidentiality}</p>
        </div>
      )}

      {/* Non-Compete */}
      {d.nonCompete && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Non-Compete</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.nonCompete}</p>
        </CardContent></Card>
      )}

      {/* Termination */}
      {d.termination && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Termination</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.termination}</p>
        </CardContent></Card>
      )}

      {/* Key Terms */}
      {d.keyTerms && d.keyTerms.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Key Terms</p>
          {d.keyTerms.map((kt, i) => (
            <div key={i} style={{ borderLeft: `3px solid ${blue}`, paddingLeft: 10, marginBottom: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{kt.term}</p>
              <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{kt.description}</p>
            </div>
          ))}
        </CardContent></Card>
      )}
    </div>
  )
}
