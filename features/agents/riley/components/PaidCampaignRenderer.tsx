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

const PLATFORM_COLOR: Record<string, string> = {
  Google: blue, Facebook: blue, LinkedIn: blue, Meta: blue,
  Instagram: amber, Twitter: muted, TikTok: red, YouTube: red,
}

export function PaidCampaignRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    platform?: string
    objective?: string
    budget?: {
      monthly?: string
      dailyCap?: string
      cpaTarget?: string
    }
    targeting?: {
      audience?: string
      jobTitles?: string[]
      industries?: string[]
      companySize?: string
      geography?: string
      exclusions?: string[]
    }
    adGroups?: {
      name: string
      keywords: string[]
      matchType: string
      ads: {
        headline1: string
        headline2: string
        description: string
        cta: string
      }[]
    }[]
    landingPage?: string
    trackingSetup?: string[]
    weeklyOptimization?: string[]
    kpis?: {
      impressions?: string
      ctr?: string
      cpc?: string
      conversions?: string
      roas?: string
    }
  }

  const platformColor = PLATFORM_COLOR[d.platform ?? ''] ?? blue

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Platform + Objective Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {d.platform && (
          <span style={{ ...pill(platformColor), fontSize: 12, padding: '4px 12px' }}>{d.platform}</span>
        )}
        {d.objective && (
          <p style={{ fontSize: 13, color: ink, fontWeight: 600 }}>{d.objective}</p>
        )}
      </div>

      {/* Budget — 3 Stat Cards */}
      {d.budget && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Budget</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {d.budget.monthly && (
              <div style={{ padding: '10px 12px', background: `${blue}08`, border: `1px solid ${blue}20`, borderRadius: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: blue }}>{d.budget.monthly}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Monthly</p>
              </div>
            )}
            {d.budget.dailyCap && (
              <div style={{ padding: '10px 12px', background: `${amber}08`, border: `1px solid ${amber}20`, borderRadius: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: amber }}>{d.budget.dailyCap}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Daily Cap</p>
              </div>
            )}
            {d.budget.cpaTarget && (
              <div style={{ padding: '10px 12px', background: `${green}08`, border: `1px solid ${green}20`, borderRadius: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: green }}>{d.budget.cpaTarget}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>CPA Target</p>
              </div>
            )}
          </div>
        </CardContent></Card>
      )}

      {/* Targeting */}
      {d.targeting && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Targeting</p>
          {d.targeting.audience && (
            <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, marginBottom: 10 }}>{d.targeting.audience}</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.targeting.jobTitles && d.targeting.jobTitles.length > 0 && (
              <div>
                <p style={{ fontSize: 10, color: muted, marginBottom: 4, fontWeight: 600 }}>Job Titles</p>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {d.targeting.jobTitles.map((t, i) => (
                    <span key={i} style={pill(blue)}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {d.targeting.industries && d.targeting.industries.length > 0 && (
              <div>
                <p style={{ fontSize: 10, color: muted, marginBottom: 4, fontWeight: 600 }}>Industries</p>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {d.targeting.industries.map((t, i) => (
                    <span key={i} style={pill(amber)}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {d.targeting.companySize && (
                <p style={{ fontSize: 11, color: muted }}>Size: <span style={{ color: ink, fontWeight: 600 }}>{d.targeting.companySize}</span></p>
              )}
              {d.targeting.geography && (
                <p style={{ fontSize: 11, color: muted }}>Geo: <span style={{ color: ink, fontWeight: 600 }}>{d.targeting.geography}</span></p>
              )}
            </div>
            {d.targeting.exclusions && d.targeting.exclusions.length > 0 && (
              <div>
                <p style={{ fontSize: 10, color: muted, marginBottom: 4, fontWeight: 600 }}>Exclusions</p>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {d.targeting.exclusions.map((e, i) => (
                    <span key={i} style={pill(red)}>{e}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent></Card>
      )}

      {/* Ad Groups */}
      {d.adGroups && d.adGroups.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Ad Groups</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {d.adGroups.map((group, gi) => (
              <div key={gi} style={{ border: `1px solid ${muted}20`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', background: `${blue}08`, borderBottom: `1px solid ${muted}15` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: ink, flex: 1 }}>{group.name}</p>
                    <span style={pill(blue)}>{group.matchType}</span>
                  </div>
                  {group.keywords && group.keywords.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                      {group.keywords.map((k, ki) => (
                        <span key={ki} style={{ fontSize: 10, color: muted, background: `${muted}15`, padding: '1px 6px', borderRadius: 4 }}>{k}</span>
                      ))}
                    </div>
                  )}
                </div>
                {group.ads && group.ads.length > 0 && (
                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {group.ads.map((ad, ai) => (
                      <div key={ai} style={{ padding: '8px 10px', background: `${muted}06`, borderRadius: 8 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: blue, marginBottom: 2 }}>{ad.headline1} | {ad.headline2}</p>
                        <p style={{ fontSize: 11, color: ink, lineHeight: 1.5, marginBottom: 4 }}>{ad.description}</p>
                        <span style={pill(green)}>{ad.cta}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* KPIs Metrics Row */}
      {d.kpis && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>KPI Targets</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {d.kpis.impressions && (
              <div style={{ padding: '8px 12px', background: `${muted}08`, borderRadius: 8, textAlign: 'center', flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: ink }}>{d.kpis.impressions}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>Impressions</p>
              </div>
            )}
            {d.kpis.ctr && (
              <div style={{ padding: '8px 12px', background: `${blue}08`, borderRadius: 8, textAlign: 'center', flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: blue }}>{d.kpis.ctr}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>CTR</p>
              </div>
            )}
            {d.kpis.cpc && (
              <div style={{ padding: '8px 12px', background: `${amber}08`, borderRadius: 8, textAlign: 'center', flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: amber }}>{d.kpis.cpc}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>CPC</p>
              </div>
            )}
            {d.kpis.conversions && (
              <div style={{ padding: '8px 12px', background: `${green}08`, borderRadius: 8, textAlign: 'center', flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: green }}>{d.kpis.conversions}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>Conversions</p>
              </div>
            )}
            {d.kpis.roas && (
              <div style={{ padding: '8px 12px', background: `${green}12`, borderRadius: 8, textAlign: 'center', flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: green }}>{d.kpis.roas}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>ROAS</p>
              </div>
            )}
          </div>
        </CardContent></Card>
      )}

      {/* Tracking Setup Checklist */}
      {d.trackingSetup && d.trackingSetup.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Tracking Setup</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {d.trackingSetup.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${green}`, background: `${green}15`, flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{item}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Weekly Optimization Action Items */}
      {d.weeklyOptimization && d.weeklyOptimization.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Weekly Optimization</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {d.weeklyOptimization.map((item, i) => (
              <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 12, lineHeight: 1.6, borderLeft: `2px solid ${blue}40` }}>→ {item}</p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Landing Page */}
      {d.landingPage && (
        <div style={{ padding: '10px 14px', background: `${muted}08`, border: `1px solid ${muted}20`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Landing Page</p>
          <p style={{ fontSize: 12, color: blue, fontWeight: 600 }}>{d.landingPage}</p>
        </div>
      )}
    </div>
  )
}
