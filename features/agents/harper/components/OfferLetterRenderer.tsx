'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ink, muted, green, amber, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

export function OfferLetterRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    candidateName?: string
    role?: string
    department?: string
    startDate?: string
    reportingTo?: string
    compensation?: {
      baseSalary?: string
      equityGrant?: string
      equityVesting?: string
      signingBonus?: string
    }
    benefits?: string[]
    workLocation?: string
    offerExpiry?: string
    conditions?: string[]
    excitement?: string
    signatoryBlock?: { name?: string; title?: string; company?: string }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Warm Intro */}
      {d.excitement && (
        <div style={{ padding: '14px 16px', background: `${green}08`, border: `1px solid ${green}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: green, marginBottom: 8 }}>
            Congratulations, {d.candidateName ?? 'Candidate'}!
          </p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.8, fontStyle: 'italic' }}>{d.excitement}</p>
        </div>
      )}

      {/* Role Details */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <p style={{ fontSize: 16, fontWeight: 700, color: ink, marginBottom: 8 }}>{d.role}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {d.department && (
              <div>
                <p style={{ fontSize: 10, color: muted, marginBottom: 2 }}>Department</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{d.department}</p>
              </div>
            )}
            {d.startDate && (
              <div>
                <p style={{ fontSize: 10, color: muted, marginBottom: 2 }}>Start Date</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{d.startDate}</p>
              </div>
            )}
            {d.reportingTo && (
              <div>
                <p style={{ fontSize: 10, color: muted, marginBottom: 2 }}>Reporting To</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{d.reportingTo}</p>
              </div>
            )}
            {d.workLocation && (
              <div>
                <p style={{ fontSize: 10, color: muted, marginBottom: 2 }}>Location</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{d.workLocation}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compensation Table */}
      {d.compensation && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Compensation</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: `1px solid ${muted}25`, borderRadius: 8, overflow: 'hidden' }}>
              {[
                { label: 'Base Salary', value: d.compensation.baseSalary, color: green },
                { label: 'Equity Grant', value: d.compensation.equityGrant, color: blue },
                { label: 'Equity Vesting', value: d.compensation.equityVesting, color: blue },
                { label: 'Signing Bonus', value: d.compensation.signingBonus, color: amber },
              ].filter(r => r.value).map((row, i, arr) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < arr.length - 1 ? `1px solid ${muted}18` : 'none', background: i % 2 === 0 ? 'transparent' : `${muted}05` }}>
                  <p style={{ fontSize: 12, color: muted }}>{row.label}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Benefits */}
      {d.benefits && d.benefits.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Benefits</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {d.benefits.map((b, i) => (
                <Badge key={i} variant="outline" style={{ fontSize: 10 }}>{b}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conditions */}
      {d.conditions && d.conditions.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Conditions of Offer</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {d.conditions.map((c, i) => (
                <p key={i} style={{ fontSize: 11, color: muted, lineHeight: 1.6, paddingLeft: 10 }}>• {c}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offer Expiry — prominent */}
      {d.offerExpiry && (
        <div style={{ padding: '10px 16px', background: `${amber}10`, border: `1.5px solid ${amber}35`, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: amber }}>Offer Expires</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: amber }}>{d.offerExpiry}</p>
        </div>
      )}

      {/* Signatory Block */}
      {d.signatoryBlock && (
        <div style={{ padding: '14px 16px', borderTop: `1px solid ${muted}20`, marginTop: 4 }}>
          <p style={{ fontSize: 11, color: muted, marginBottom: 10 }}>On behalf of {d.signatoryBlock.company ?? 'the company'}:</p>
          <div style={{ display: 'inline-block', paddingTop: 32, borderTop: `1.5px solid ${ink}` }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{d.signatoryBlock.name}</p>
            <p style={{ fontSize: 11, color: muted }}>{d.signatoryBlock.title}</p>
          </div>
        </div>
      )}

    </div>
  )
}
