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

export function SAFENoteRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    investor?: string
    company?: string
    principalAmount?: string | number
    valuationCap?: string | number
    discountRate?: string | number
    proRataRights?: boolean | string
    mfnClause?: boolean | string
    conversionTriggers?: string[]
    maturityDate?: string
    keyTerms?: { term: string; description: string }[]
    riskFactors?: string[]
    signatoryBlock?: { party: string; name?: string; title?: string; date?: string }[]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Legal disclaimer */}
      <div style={{ padding: '8px 12px', background: `${amber}10`, border: `1px solid ${amber}30`, borderRadius: 8 }}>
        <p style={{ fontSize: 11, color: amber, fontWeight: 600 }}>
          This is a draft SAFE note for review purposes only. Not legal or financial advice — consult qualified legal counsel before execution.
        </p>
      </div>

      {/* Financial Terms Hero */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {d.principalAmount !== undefined && (
          <div style={{ padding: '14px', background: `${green}08`, border: `1.5px solid ${green}30`, borderRadius: 12, textAlign: 'center' }}>
            <p style={{ fontSize: 24, fontWeight: 800, color: green, lineHeight: 1 }}>{String(d.principalAmount)}</p>
            <p style={{ fontSize: 10, color: muted, marginTop: 4 }}>Principal Amount</p>
          </div>
        )}
        {d.valuationCap !== undefined && (
          <div style={{ padding: '14px', background: `${blue}08`, border: `1.5px solid ${blue}30`, borderRadius: 12, textAlign: 'center' }}>
            <p style={{ fontSize: 24, fontWeight: 800, color: blue, lineHeight: 1 }}>{String(d.valuationCap)}</p>
            <p style={{ fontSize: 10, color: muted, marginTop: 4 }}>Valuation Cap</p>
          </div>
        )}
        {d.discountRate !== undefined && (
          <div style={{ padding: '14px', background: `${amber}08`, border: `1.5px solid ${amber}30`, borderRadius: 12, textAlign: 'center' }}>
            <p style={{ fontSize: 24, fontWeight: 800, color: amber, lineHeight: 1 }}>{String(d.discountRate)}</p>
            <p style={{ fontSize: 10, color: muted, marginTop: 4 }}>Discount Rate</p>
          </div>
        )}
      </div>

      {/* Parties & Details */}
      <div style={{ display: 'flex', gap: 10 }}>
        {d.investor && (
          <div style={{ flex: 1, padding: '10px 12px', background: `${blue}06`, border: `1px solid ${blue}20`, borderRadius: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 4 }}>Investor</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{d.investor}</p>
          </div>
        )}
        {d.company && (
          <div style={{ flex: 1, padding: '10px 12px', background: `${green}06`, border: `1px solid ${green}20`, borderRadius: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: green, marginBottom: 4 }}>Company</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{d.company}</p>
          </div>
        )}
      </div>

      {/* Terms Flags */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {d.proRataRights !== undefined && (
          <span style={pill(d.proRataRights === true || d.proRataRights === 'yes' ? green : muted)}>
            Pro-Rata: {d.proRataRights === true || d.proRataRights === 'yes' ? 'Yes' : String(d.proRataRights)}
          </span>
        )}
        {d.mfnClause !== undefined && (
          <span style={pill(d.mfnClause === true || d.mfnClause === 'yes' ? green : muted)}>
            MFN: {d.mfnClause === true || d.mfnClause === 'yes' ? 'Yes' : String(d.mfnClause)}
          </span>
        )}
        {d.maturityDate && (
          <span style={pill(muted)}>Maturity: {d.maturityDate}</span>
        )}
      </div>

      {/* Conversion Triggers */}
      {d.conversionTriggers && d.conversionTriggers.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Conversion Triggers</p>
          {d.conversionTriggers.map((ct, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span style={{ color: blue, fontWeight: 700, flexShrink: 0 }}>→</span>
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{ct}</p>
            </div>
          ))}
        </CardContent></Card>
      )}

      {/* Risk Factors */}
      {d.riskFactors && d.riskFactors.length > 0 && (
        <div style={{ padding: '12px 14px', background: `${amber}08`, border: `1px solid ${amber}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: amber, marginBottom: 8 }}>Risk Factors</p>
          {d.riskFactors.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span style={{ color: amber, fontWeight: 700, flexShrink: 0 }}>!</span>
              <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{r}</p>
            </div>
          ))}
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
