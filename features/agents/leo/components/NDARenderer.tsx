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

export function NDARenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    type?: string
    parties?: string[]
    effectiveDate?: string
    disclosingParty?: string
    receivingParty?: string
    confidentialInformation?: string
    exclusions?: string[]
    obligations?: string[]
    term?: string
    returnOrDestroy?: string
    remedies?: string
    jurisdiction?: string
    keyTerms?: { term: string; description: string }[]
    signatoryBlock?: { party: string; name?: string; title?: string; date?: string }[]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Legal disclaimer */}
      <div style={{ padding: '8px 12px', background: `${amber}10`, border: `1px solid ${amber}30`, borderRadius: 8 }}>
        <p style={{ fontSize: 11, color: amber, fontWeight: 600 }}>
          This is a draft document generated for informational purposes only. Not legal advice — consult qualified legal counsel before execution.
        </p>
      </div>

      {/* Document Header */}
      <div style={{ padding: '14px 16px', background: `${blue}06`, border: `1.5px solid ${blue}25`, borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          {d.type && <span style={pill(blue)}>{d.type}</span>}
          {d.title && <h1 style={{ fontSize: 16, fontWeight: 800, color: ink, margin: 0 }}>{d.title}</h1>}
        </div>
        {d.effectiveDate && <p style={{ fontSize: 11, color: muted }}>Effective Date: {d.effectiveDate}</p>}
        {d.jurisdiction && <p style={{ fontSize: 11, color: muted }}>Jurisdiction: {d.jurisdiction}</p>}
      </div>

      {/* Parties */}
      {(d.disclosingParty || d.receivingParty || (d.parties && d.parties.length > 0)) && (
        <div style={{ display: 'flex', gap: 10 }}>
          {d.disclosingParty && (
            <div style={{ flex: 1, padding: '10px 12px', background: `${blue}06`, border: `1px solid ${blue}20`, borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 4 }}>Disclosing Party</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{d.disclosingParty}</p>
            </div>
          )}
          {d.receivingParty && (
            <div style={{ flex: 1, padding: '10px 12px', background: `${green}06`, border: `1px solid ${green}20`, borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: green, marginBottom: 4 }}>Receiving Party</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{d.receivingParty}</p>
            </div>
          )}
        </div>
      )}

      {/* Confidential Information */}
      {d.confidentialInformation && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Confidential Information</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.confidentialInformation}</p>
        </CardContent></Card>
      )}

      {/* Exclusions */}
      {d.exclusions && d.exclusions.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Exclusions</p>
          {d.exclusions.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span style={{ color: muted, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{e}</p>
            </div>
          ))}
        </CardContent></Card>
      )}

      {/* Obligations */}
      {d.obligations && d.obligations.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Obligations of Receiving Party</p>
          {d.obligations.map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span style={{ color: blue, fontWeight: 700, flexShrink: 0 }}>·</span>
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{o}</p>
            </div>
          ))}
        </CardContent></Card>
      )}

      {/* Term & Other Terms */}
      {(d.term || d.returnOrDestroy || d.remedies) && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {d.term && (
            <div style={{ flex: 1, minWidth: 140, padding: '10px 12px', background: `${muted}06`, border: `1px solid ${muted}20`, borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Term</p>
              <p style={{ fontSize: 12, color: ink }}>{d.term}</p>
            </div>
          )}
          {d.returnOrDestroy && (
            <div style={{ flex: 1, minWidth: 140, padding: '10px 12px', background: `${muted}06`, border: `1px solid ${muted}20`, borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Return / Destroy</p>
              <p style={{ fontSize: 12, color: ink }}>{d.returnOrDestroy}</p>
            </div>
          )}
          {d.remedies && (
            <div style={{ flex: 1, minWidth: 140, padding: '10px 12px', background: `${red}06`, border: `1px solid ${red}20`, borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Remedies</p>
              <p style={{ fontSize: 12, color: ink }}>{d.remedies}</p>
            </div>
          )}
        </div>
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

      {/* Signatory Block */}
      {d.signatoryBlock && d.signatoryBlock.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Signatures</p>
          <div style={{ display: 'flex', gap: 12 }}>
            {d.signatoryBlock.map((sig, i) => (
              <div key={i} style={{ flex: 1, padding: '12px 14px', border: `1px solid ${muted}30`, borderRadius: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 12 }}>{sig.party}</p>
                {sig.name && <p style={{ fontSize: 12, color: ink }}>Name: {sig.name}</p>}
                {sig.title && <p style={{ fontSize: 11, color: muted }}>Title: {sig.title}</p>}
                {sig.date && <p style={{ fontSize: 11, color: muted }}>Date: {sig.date}</p>}
                <div style={{ marginTop: 20, borderBottom: `1px solid ${muted}40`, paddingBottom: 4 }}>
                  <p style={{ fontSize: 10, color: muted }}>Signature</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
    </div>
  )
}
