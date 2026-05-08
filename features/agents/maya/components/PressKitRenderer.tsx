'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ink, muted, green, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}


function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/)
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%', background: `${blue}20`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, fontWeight: 700, color: blue, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

export function PressKitRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    companyOverview?: string
    founderBios?: { name: string; title?: string; bio?: string }[]
    productDescription?: string
    keyStats?: { stat: string; value: string | number }[]
    mediaBoilerplate?: string
    pressContacts?: { name: string; email?: string; role?: string }[]
    recentMilestones?: string[]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Company overview hero */}
      {d.companyOverview && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={{ fontSize: 14, color: ink, lineHeight: 1.7, fontWeight: 500 }}>{d.companyOverview}</p>
        </CardContent></Card>
      )}

      {/* Key Stats grid */}
      {d.keyStats && d.keyStats.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Key Stats</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
            {d.keyStats.map((s, i) => (
              <div key={i} style={{
                padding: '12px 10px', background: `${blue}06`, borderRadius: 10,
                border: `1px solid ${blue}20`, textAlign: 'center' as const,
              }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: blue, lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
                <p style={{ fontSize: 10, color: muted, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{s.stat}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Product Description */}
      {d.productDescription && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Product</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.productDescription}</p>
        </CardContent></Card>
      )}

      {/* Founder Bios */}
      {d.founderBios && d.founderBios.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Founder Bios</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {d.founderBios.map((founder, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Initials name={founder.name} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: ink, lineHeight: 1.3 }}>{founder.name}</p>
                  {founder.title && <p style={{ fontSize: 11, color: blue, fontWeight: 600, marginBottom: 4 }}>{founder.title}</p>}
                  {founder.bio && <p style={{ fontSize: 12, color: muted, lineHeight: 1.6 }}>{founder.bio}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Recent Milestones */}
      {d.recentMilestones && d.recentMilestones.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Recent Milestones</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.recentMilestones.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: green, marginTop: 4, flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{m}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Media Boilerplate */}
      {d.mediaBoilerplate && (
        <Card><CardContent className="pt-4 pb-4">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={sectionHead}>Media Boilerplate</p>
            <span style={{ fontSize: 10, color: muted, fontStyle: 'italic' }}>Copy for press use</span>
          </div>
          <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: 12, color: ink, lineHeight: 1.7, fontStyle: 'italic' }}>{d.mediaBoilerplate}</p>
          </div>
        </CardContent></Card>
      )}

      {/* Press Contacts */}
      {d.pressContacts && d.pressContacts.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Press Contacts</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.pressContacts.map((contact, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: `${green}06`, borderRadius: 8 }}>
                <Initials name={contact.name} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{contact.name}</p>
                  {contact.role && <p style={{ fontSize: 10, color: muted }}>{contact.role}</p>}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} style={{ fontSize: 11, color: blue, textDecoration: 'none' }}>
                      {contact.email}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

    </div>
  )
}
