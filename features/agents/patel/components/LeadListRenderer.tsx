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

interface Lead {
  name?: string
  title?: string
  company?: string
  industry?: string
  email?: string
  linkedin?: string
  signal?: string
  score?: number
  icp_segment?: string
}

export function LeadListRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    icp_id?: string
    total_count?: number
    segment?: string
    persona?: string
    trigger_used?: string
    executive_summary?: string
    leads?: Lead[]
    qualification_criteria?: string[]
    next_actions?: string[]
    enrichment_source?: string
  }

  const leads = d.leads ?? []
  const avgScore = leads.length
    ? Math.round(leads.reduce((s, l) => s + (l.score ?? 0), 0) / leads.length)
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header stats */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {d.total_count !== undefined && (
          <div style={{ padding: '8px 14px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10, textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: blue, lineHeight: 1 }}>{d.total_count}</p>
            <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>Leads</p>
          </div>
        )}
        {avgScore !== null && (
          <div style={{ padding: '8px 14px', background: `${green}08`, border: `1px solid ${green}25`, borderRadius: 10, textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: green, lineHeight: 1 }}>{avgScore}</p>
            <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>Avg Score</p>
          </div>
        )}
        {d.enrichment_source && (
          <span style={{ ...pill(muted), alignSelf: 'center' }}>via {d.enrichment_source}</span>
        )}
      </div>

      {/* Context */}
      {(d.segment || d.persona || d.trigger_used) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {d.segment && <span style={pill(blue)}>Segment: {d.segment}</span>}
          {d.persona && <span style={pill(amber)}>Persona: {d.persona}</span>}
          {d.trigger_used && <span style={pill(green)}>Trigger: {d.trigger_used}</span>}
        </div>
      )}

      {/* Executive Summary */}
      {d.executive_summary && (
        <div style={{ padding: '14px 16px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue, marginBottom: 8 }}>Summary</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.75 }}>{d.executive_summary}</p>
        </div>
      )}

      {/* Qualification criteria */}
      {d.qualification_criteria && d.qualification_criteria.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Qualification Criteria</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {d.qualification_criteria.map((c, i) => (
              <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>
                <span style={{ color: green, fontWeight: 700, marginRight: 6 }}>✓</span>{c}
              </p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Lead table */}
      {leads.length > 0 && (
        <Card><CardContent className="pt-4 pb-2">
          <p style={sectionHead}>{leads.length} Leads</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leads.map((lead, i) => {
              const score = lead.score ?? 0
              const scoreColor = score >= 80 ? green : score >= 60 ? amber : muted
              return (
                <div key={i} style={{ padding: '10px 12px', border: `1px solid ${muted}20`, borderRadius: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {/* Score badge */}
                  {lead.score !== undefined && (
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${scoreColor}18`, border: `1.5px solid ${scoreColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: scoreColor, flexShrink: 0 }}>
                      {lead.score}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{lead.name ?? 'Unknown'}</p>
                      {lead.icp_segment && <span style={pill(blue)}>{lead.icp_segment}</span>}
                    </div>
                    {(lead.title || lead.company) && (
                      <p style={{ fontSize: 11, color: muted, marginBottom: 3 }}>
                        {[lead.title, lead.company].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {lead.industry && <p style={{ fontSize: 10, color: muted, marginBottom: 3 }}>Industry: {lead.industry}</p>}
                    {lead.signal && (
                      <p style={{ fontSize: 11, color: amber, lineHeight: 1.4 }}>Signal: {lead.signal}</p>
                    )}
                    {lead.email && (
                      <p style={{ fontSize: 10, color: blue, marginTop: 4 }}>{lead.email}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Next actions */}
      {d.next_actions && d.next_actions.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Next Actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.next_actions.map((action, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingTop: 2 }}>{action}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

    </div>
  )
}
