'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ink, muted, green, amber, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

const pill = (color: string): React.CSSProperties => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
  fontSize: 10, fontWeight: 600, background: `${color}18`, color,
})

export function CallPlaybookRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    contact?: {
      name?: string
      title?: string
      company?: string
      linkedinUrl?: string
    }
    dealContext?: {
      stage?: string
      value?: string | number
      lastInteraction?: string
    }
    companyResearch?: string[]
    callObjective?: string
    opener?: string
    discoveryQuestions?: string[]
    expectedObjections?: { objection: string; response: string }[]
    talkTrack?: string
    closingAsk?: string
    nextSteps?: string[]
  }

  const contact = d.contact ?? {}
  const dealCtx = d.dealContext ?? {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Contact card */}
      {(contact.name || contact.company) && (
        <Card><CardContent className="pt-4 pb-4">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              {contact.name && <p style={{ fontSize: 15, fontWeight: 700, color: ink, marginBottom: 2 }}>{contact.name}</p>}
              {contact.title && <p style={{ fontSize: 12, color: muted, marginBottom: 2 }}>{contact.title}</p>}
              {contact.company && <p style={{ fontSize: 12, color: blue, fontWeight: 600 }}>{contact.company}</p>}
              {contact.linkedinUrl && (
                <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: blue, marginTop: 4, display: 'inline-block' }}>
                  LinkedIn →
                </a>
              )}
            </div>
            {/* Deal context inline */}
            {Object.keys(dealCtx).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                {dealCtx.stage && <span style={pill(blue)}>{dealCtx.stage}</span>}
                {dealCtx.value !== undefined && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: green }}>{String(dealCtx.value)}</span>
                )}
                {dealCtx.lastInteraction && (
                  <span style={{ fontSize: 10, color: muted }}>Last: {dealCtx.lastInteraction}</span>
                )}
              </div>
            )}
          </div>
        </CardContent></Card>
      )}

      {/* Company research */}
      {d.companyResearch && d.companyResearch.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Company Research</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {d.companyResearch.map((item, i) => (
              <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingLeft: 10 }}>• {item}</p>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Call objective — highlighted box */}
      {d.callObjective && (
        <div style={{ padding: '12px 14px', background: `${blue}0d`, border: `1px solid ${blue}30`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: blue, marginBottom: 6 }}>Call Objective</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: ink, lineHeight: 1.6 }}>{d.callObjective}</p>
        </div>
      )}

      {/* Opener */}
      {d.opener && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Opener</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.7, fontStyle: 'italic' }}>&quot;{d.opener}&quot;</p>
        </CardContent></Card>
      )}

      {/* Discovery Questions */}
      {d.discoveryQuestions && d.discoveryQuestions.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Discovery Questions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.discoveryQuestions.map((q, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: 1 }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{q}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Expected Objections */}
      {d.expectedObjections && d.expectedObjections.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Expected Objections</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.expectedObjections.map((obj, i) => (
              <div key={i} style={{ borderLeft: `3px solid ${amber}`, paddingLeft: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: amber, marginBottom: 4 }}>Q: {obj.objection}</p>
                <p style={{ fontSize: 12, color: green, lineHeight: 1.6 }}>A: {obj.response}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Talk Track */}
      {d.talkTrack && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Talk Track</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.8, fontStyle: 'italic', borderLeft: `3px solid ${blue}40`, paddingLeft: 10 }}>{d.talkTrack}</p>
        </CardContent></Card>
      )}

      {/* Closing Ask */}
      {d.closingAsk && (
        <div style={{ padding: '12px 14px', background: `${green}0a`, border: `1px solid ${green}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: green, marginBottom: 6 }}>Closing Ask</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: ink, lineHeight: 1.6 }}>{d.closingAsk}</p>
        </div>
      )}

      {/* Next Steps — checkbox style */}
      {d.nextSteps && d.nextSteps.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Next Steps</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.nextSteps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${green}`, flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{step}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

    </div>
  )
}
