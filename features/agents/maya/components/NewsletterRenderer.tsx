'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

export function NewsletterRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    issueNumber?: number | string
    subject?: string
    previewText?: string
    hook?: string
    sections?: { sectionTitle?: string; content?: string; cta?: string }[]
    productUpdate?: string
    footerCta?: string
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Email header preview */}
      <Card><CardContent className="pt-4 pb-4">
        <div style={{ padding: '12px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: red }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: amber }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: green }} />
            <span style={{ fontSize: 10, color: muted, marginLeft: 8 }}>Email Preview</span>
            {d.issueNumber && (
              <Badge variant="outline" style={{ marginLeft: 'auto', fontSize: 10 }}>Issue #{d.issueNumber}</Badge>
            )}
          </div>
          {d.subject && (
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 4, lineHeight: 1.4 }}>
              Subject: {d.subject}
            </p>
          )}
          {d.previewText && (
            <p style={{ fontSize: 11, color: muted, lineHeight: 1.5, fontStyle: 'italic' }}>
              {d.previewText}
            </p>
          )}
        </div>
      </CardContent></Card>

      {/* Hook */}
      {d.hook && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Opening Hook</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.7, fontStyle: 'italic', borderLeft: `3px solid ${blue}`, paddingLeft: 12 }}>
            {d.hook}
          </p>
        </CardContent></Card>
      )}

      {/* Product Update — highlighted */}
      {d.productUpdate && (
        <div style={{ padding: '12px 14px', background: `${green}10`, border: `1px solid ${green}30`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: green, marginBottom: 6 }}>
            Product Update
          </p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{d.productUpdate}</p>
        </div>
      )}

      {/* Newsletter Sections */}
      {d.sections && d.sections.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Newsletter Sections</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {d.sections.map((section, i) => (
              <div key={i} style={{ borderBottom: i < (d.sections?.length ?? 0) - 1 ? '1px solid #f3f4f6' : 'none', paddingBottom: i < (d.sections?.length ?? 0) - 1 ? 14 : 0 }}>
                {section.sectionTitle && (
                  <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 6 }}>{section.sectionTitle}</p>
                )}
                {section.content && (
                  <p style={{ fontSize: 12, color: muted, lineHeight: 1.7, marginBottom: section.cta ? 8 : 0 }}>
                    {section.content}
                  </p>
                )}
                {section.cta && (
                  <div style={{
                    display: 'inline-block', padding: '5px 14px', borderRadius: 999,
                    background: blue, color: '#fff', fontSize: 11, fontWeight: 600,
                    cursor: 'default',
                  }}>
                    {section.cta}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Footer CTA */}
      {d.footerCta && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Footer CTA</p>
          <div style={{
            padding: '12px 16px', background: `${blue}10`, border: `1px solid ${blue}30`,
            borderRadius: 10, textAlign: 'center' as const,
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: blue }}>{d.footerCta}</p>
          </div>
        </CardContent></Card>
      )}

    </div>
  )
}
