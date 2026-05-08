'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ink, muted, green, red, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

const pill = (color: string) => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
  fontSize: 10, fontWeight: 600, background: `${color}18`, color,
})

export function PrivacyPolicyRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    effectiveDate?: string
    dataTypes?: { type: string; description?: string; purpose?: string; sensitive?: boolean }[]
    dataSharing?: { recipient: string; purpose?: string; safeguards?: string }[]
    userRights?: string[]
    retentionPeriods?: { dataType: string; period: string }[]
    cookiePolicy?: string
    gdprCompliance?: { applicable: boolean; basis?: string; dpo?: string }
    ccpaCompliance?: { applicable: boolean; details?: string }
    contactInfo?: string
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', background: `${blue}06`, border: `1.5px solid ${blue}25`, borderRadius: 12 }}>
        {d.title && <h1 style={{ fontSize: 16, fontWeight: 800, color: ink, marginBottom: 4 }}>{d.title}</h1>}
        {d.effectiveDate && <p style={{ fontSize: 11, color: muted }}>Effective Date: {d.effectiveDate}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {d.gdprCompliance?.applicable && (
            <span style={pill(green)}>GDPR Compliant</span>
          )}
          {d.ccpaCompliance?.applicable && (
            <span style={pill(blue)}>CCPA Compliant</span>
          )}
        </div>
      </div>

      {/* Data Types Table */}
      {d.dataTypes && d.dataTypes.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Data We Collect</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${muted}30` }}>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: muted, fontWeight: 600, fontSize: 10 }}>Data Type</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: muted, fontWeight: 600, fontSize: 10 }}>Purpose</th>
                <th style={{ textAlign: 'center', padding: '4px 8px', color: muted, fontWeight: 600, fontSize: 10 }}>Sensitive</th>
              </tr>
            </thead>
            <tbody>
              {d.dataTypes.map((dt, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${muted}15` }}>
                  <td style={{ padding: '6px 8px' }}>
                    <p style={{ color: ink, fontWeight: 600 }}>{dt.type}</p>
                    {dt.description && <p style={{ fontSize: 10, color: muted }}>{dt.description}</p>}
                  </td>
                  <td style={{ padding: '6px 8px', color: muted, fontSize: 11 }}>{dt.purpose ?? '—'}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    {dt.sensitive
                      ? <span style={pill(red)}>Yes</span>
                      : <span style={pill(muted)}>No</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {/* User Rights Checklist */}
      {d.userRights && d.userRights.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Your Rights</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.userRights.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: green, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>✓</span>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{r}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Data Sharing */}
      {d.dataSharing && d.dataSharing.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Data Sharing</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.dataSharing.map((ds, i) => (
              <div key={i} style={{ padding: '8px 12px', background: `${muted}06`, border: `1px solid ${muted}20`, borderRadius: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{ds.recipient}</p>
                {ds.purpose && <p style={{ fontSize: 11, color: muted }}>Purpose: {ds.purpose}</p>}
                {ds.safeguards && <p style={{ fontSize: 11, color: green }}>Safeguards: {ds.safeguards}</p>}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Retention Periods */}
      {d.retentionPeriods && d.retentionPeriods.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Retention Periods</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {d.retentionPeriods.map((rp, i) => (
              <div key={i} style={{ padding: '8px 12px', background: `${blue}06`, border: `1px solid ${blue}20`, borderRadius: 8, minWidth: 120 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: ink }}>{rp.dataType}</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: blue }}>{rp.period}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Cookie Policy */}
      {d.cookiePolicy && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Cookie Policy</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.cookiePolicy}</p>
        </CardContent></Card>
      )}

      {/* GDPR Details */}
      {d.gdprCompliance?.applicable && (
        <div style={{ padding: '10px 14px', background: `${green}06`, border: `1px solid ${green}25`, borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={pill(green)}>GDPR</span>
            <p style={{ fontSize: 11, fontWeight: 700, color: green }}>Compliance Details</p>
          </div>
          {d.gdprCompliance.basis && <p style={{ fontSize: 12, color: ink }}>Legal Basis: {d.gdprCompliance.basis}</p>}
          {d.gdprCompliance.dpo && <p style={{ fontSize: 11, color: muted }}>DPO: {d.gdprCompliance.dpo}</p>}
        </div>
      )}

      {/* CCPA Details */}
      {d.ccpaCompliance?.applicable && (
        <div style={{ padding: '10px 14px', background: `${blue}06`, border: `1px solid ${blue}25`, borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={pill(blue)}>CCPA</span>
            <p style={{ fontSize: 11, fontWeight: 700, color: blue }}>Compliance Details</p>
          </div>
          {d.ccpaCompliance.details && <p style={{ fontSize: 12, color: ink }}>{d.ccpaCompliance.details}</p>}
        </div>
      )}

      {/* Contact */}
      {d.contactInfo && (
        <div style={{ padding: '10px 14px', background: `${muted}06`, border: `1px solid ${muted}20`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted, marginBottom: 4 }}>Contact / Questions</p>
          <p style={{ fontSize: 12, color: ink }}>{d.contactInfo}</p>
        </div>
      )}
    </div>
  )
}
