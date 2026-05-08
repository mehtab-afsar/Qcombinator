'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

const pill = (color: string) => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
  fontSize: 10, fontWeight: 600, background: `${color}18`, color,
})

const PLATFORM_COLOR: Record<string, string> = {
  linkedin: blue, twitter: '#1DA1F2', instagram: '#E1306C',
  facebook: '#1877F2', youtube: red, email: amber, blog: green, tiktok: ink,
}

const MIX_COLORS = [blue, green, amber, red]
const MIX_LABELS = ['thoughtLeadership', 'productContent', 'socialProof', 'educational']

export function ContentCalendarRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    theme?: string
    channels?: string[]
    frequency?: string
    contentMix?: { thoughtLeadership?: number; productContent?: number; socialProof?: number; educational?: number }
    posts?: { week?: string | number; platform?: string; type?: string; topic?: string; hook?: string; cta?: string; publishDate?: string }[]
    seoTargets?: string[]
    distribution?: string
    kpis?: string[]
  }

  // Group posts by week
  const postsByWeek = (d.posts ?? []).reduce<Record<string, typeof d.posts>>((acc, post) => {
    const w = String(post?.week ?? 'Unscheduled')
    if (!acc[w]) acc[w] = []
    acc[w]!.push(post)
    return acc
  }, {})

  const mix = d.contentMix ?? {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header meta */}
      {(d.theme || d.frequency) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {d.theme && <span style={pill(blue)}>{d.theme}</span>}
          {d.frequency && <span style={{ fontSize: 11, color: muted }}>{d.frequency}</span>}
          {(d.channels ?? []).map((c, i) => (
            <Badge key={i} variant="outline" style={{ fontSize: 10, color: PLATFORM_COLOR[c.toLowerCase()] ?? ink }}>
              {c}
            </Badge>
          ))}
        </div>
      )}

      {/* Content Mix */}
      {d.contentMix && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Content Mix</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MIX_LABELS.map((label, i) => {
              const val = (mix as Record<string, number | undefined>)[label]
              if (val === undefined) return null
              return (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 999,
                  background: `${MIX_COLORS[i]}15`, border: `1px solid ${MIX_COLORS[i]}30`,
                }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: MIX_COLORS[i], lineHeight: 1 }}>{val}%</span>
                  <span style={{ fontSize: 10, color: MIX_COLORS[i], fontWeight: 600, textTransform: 'capitalize' as const }}>
                    {label.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Posts by Week */}
      {Object.keys(postsByWeek).length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Content Posts</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Object.entries(postsByWeek).map(([week, posts]) => (
              <div key={week}>
                <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                  Week {week}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(posts ?? []).map((post, i) => {
                    const pc = post?.platform ? (PLATFORM_COLOR[post.platform.toLowerCase()] ?? ink) : ink
                    return (
                      <div key={i} style={{
                        padding: '10px 12px', borderRadius: 10,
                        background: `${pc}08`, border: `1px solid ${pc}25`,
                        borderLeft: `3px solid ${pc}`,
                      }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' as const }}>
                          {post?.platform && (
                            <Badge variant="outline" style={{ fontSize: 10, color: pc, borderColor: `${pc}50` }}>
                              {post.platform}
                            </Badge>
                          )}
                          {post?.type && <span style={pill(amber)}>{post.type}</span>}
                          {post?.publishDate && (
                            <span style={{ fontSize: 10, color: muted, marginLeft: 'auto' }}>{post.publishDate}</span>
                          )}
                        </div>
                        {post?.topic && (
                          <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 4 }}>{post.topic}</p>
                        )}
                        {post?.hook && (
                          <p style={{ fontSize: 11, color: muted, lineHeight: 1.5, marginBottom: post.cta ? 4 : 0 }}>
                            Hook: {post.hook}
                          </p>
                        )}
                        {post?.cta && (
                          <p style={{ fontSize: 11, color: green, fontWeight: 600 }}>CTA: {post.cta}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* SEO Targets */}
      {d.seoTargets && d.seoTargets.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>SEO Targets</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {d.seoTargets.map((kw, i) => (
              <span key={i} style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 11,
                background: `${blue}12`, color: blue, border: `1px solid ${blue}30`,
              }}>{kw}</span>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Distribution + KPIs */}
      {(d.distribution || (d.kpis && d.kpis.length > 0)) && (
        <Card><CardContent className="pt-4 pb-4">
          {d.distribution && (
            <>
              <p style={sectionHead}>Distribution</p>
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, marginBottom: d.kpis ? 12 : 0 }}>{d.distribution}</p>
            </>
          )}
          {d.kpis && d.kpis.length > 0 && (
            <>
              <p style={{ ...sectionHead, marginTop: d.distribution ? 4 : 0 }}>KPIs</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {d.kpis.map((k, i) => (
                  <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>→ {k}</p>
                ))}
              </div>
            </>
          )}
        </CardContent></Card>
      )}

    </div>
  )
}
