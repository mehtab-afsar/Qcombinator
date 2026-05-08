'use client'

import { Badge } from '@/components/ui/badge'
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

export function JobDescriptionRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    role?: string
    department?: string
    location?: string
    level?: string
    overview?: string
    responsibilities?: string[]
    mustHaves?: string[]
    niceToHaves?: string[]
    compensation?: { salaryRange?: string; equity?: string; benefits?: string[] }
    cultureSell?: string
    interviewProcess?: string[]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Role Header */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <p style={{ fontSize: 18, fontWeight: 700, color: ink, marginBottom: 8 }}>
            {d.role ?? d.title}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {d.department && <span style={pill(blue)}>{d.department}</span>}
            {d.level && <span style={pill(green)}>{d.level}</span>}
            {d.location && (
              <span style={{ fontSize: 11, color: muted, alignSelf: 'center' }}>
                📍 {d.location}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overview Callout */}
      {d.overview && (
        <div style={{ padding: '12px 16px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 6 }}>
            Role Overview
          </p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.7 }}>{d.overview}</p>
        </div>
      )}

      {/* Responsibilities */}
      {d.responsibilities && d.responsibilities.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Responsibilities</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {d.responsibilities.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, color: blue, marginTop: 1, flexShrink: 0 }}>☐</span>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{r}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Must-Haves */}
      {d.mustHaves && d.mustHaves.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <p style={{ ...sectionHead, marginBottom: 0 }}>Must-Haves</p>
              <span style={pill(red)}>Required</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {d.mustHaves.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 10px', background: `${red}06`, borderRadius: 7 }}>
                  <span style={{ fontSize: 13, color: red, fontWeight: 700, flexShrink: 0 }}>✱</span>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{m}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nice-to-Haves */}
      {d.niceToHaves && d.niceToHaves.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Nice-to-Haves</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {d.niceToHaves.map((n, i) => (
                <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>+ {n}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compensation */}
      {d.compensation && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Compensation</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: d.compensation.benefits ? 12 : 0 }}>
              {d.compensation.salaryRange && (
                <div style={{ padding: '10px 12px', background: `${green}08`, border: `1px solid ${green}20`, borderRadius: 8 }}>
                  <p style={{ fontSize: 10, color: muted, marginBottom: 3 }}>Base Salary</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: green }}>{d.compensation.salaryRange}</p>
                </div>
              )}
              {d.compensation.equity && (
                <div style={{ padding: '10px 12px', background: `${blue}08`, border: `1px solid ${blue}20`, borderRadius: 8 }}>
                  <p style={{ fontSize: 10, color: muted, marginBottom: 3 }}>Equity</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: blue }}>{d.compensation.equity}</p>
                </div>
              )}
            </div>
            {d.compensation.benefits && d.compensation.benefits.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {d.compensation.benefits.map((b, i) => (
                  <Badge key={i} variant="outline" style={{ fontSize: 10 }}>{b}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Culture Sell */}
      {d.cultureSell && (
        <div style={{ padding: '12px 16px', borderLeft: `3px solid ${green}`, background: `${green}06`, borderRadius: '0 8px 8px 0' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: green, marginBottom: 6 }}>
            Why Join Us
          </p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.7, fontStyle: 'italic' }}>{d.cultureSell}</p>
        </div>
      )}

      {/* Interview Process */}
      {d.interviewProcess && d.interviewProcess.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Interview Process</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {d.interviewProcess.map((step, i) => (
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

    </div>
  )
}
