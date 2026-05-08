'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ink, muted, blue } from '../../shared/constants/colors'


export function BoardDeckRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    quarter?: string
    keyMessage?: string
    slides?: {
      slideTitle: string
      content?: {
        bullets?: string[]
        metric?: { value: string | number; label?: string; subtext?: string }
        chart?: string
        narrative?: string
      }
    }[]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Deck header */}
      <div style={{ padding: '16px 18px', background: `${blue}08`, border: `1.5px solid ${blue}25`, borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: d.keyMessage ? 8 : 0 }}>
          {d.quarter && <Badge variant="outline" style={{ fontSize: 11, fontWeight: 700 }}>{d.quarter}</Badge>}
          {d.title && <h1 style={{ fontSize: 17, fontWeight: 800, color: ink, margin: 0 }}>{d.title}</h1>}
        </div>
        {d.keyMessage && (
          <p style={{ fontSize: 13, color: ink, fontStyle: 'italic', lineHeight: 1.5, borderLeft: `3px solid ${blue}`, paddingLeft: 10 }}>
            &quot;{d.keyMessage}&quot;
          </p>
        )}
      </div>

      {/* Slides */}
      {d.slides && d.slides.map((slide, i) => (
        <Card key={i}><CardContent className="pt-4 pb-4">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: blue, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {i + 1}
            </div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: ink, margin: 0, paddingTop: 4 }}>{slide.slideTitle}</h2>
          </div>

          {slide.content && (
            <div style={{ paddingLeft: 38 }}>
              {/* Large metric */}
              {slide.content.metric && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 32, fontWeight: 800, color: blue, lineHeight: 1 }}>{String(slide.content.metric.value)}</p>
                  {slide.content.metric.label && <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>{slide.content.metric.label}</p>}
                  {slide.content.metric.subtext && <p style={{ fontSize: 11, color: ink, marginTop: 4 }}>{slide.content.metric.subtext}</p>}
                </div>
              )}

              {/* Bullets */}
              {slide.content.bullets && slide.content.bullets.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {slide.content.bullets.map((b, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: blue, fontWeight: 700, fontSize: 14, flexShrink: 0, lineHeight: 1.4 }}>·</span>
                      <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{b}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Chart placeholder / text */}
              {slide.content.chart && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: `${muted}10`, border: `1px dashed ${muted}40`, borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: muted, fontStyle: 'italic' }}>Chart: {slide.content.chart}</p>
                </div>
              )}

              {/* Narrative */}
              {slide.content.narrative && (
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.7, marginTop: 8 }}>{slide.content.narrative}</p>
              )}
            </div>
          )}
        </CardContent></Card>
      ))}
    </div>
  )
}
