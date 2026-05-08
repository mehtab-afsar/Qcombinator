'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}


const REC_COLOR: Record<string, string> = {
  'strong hire': green,
  'hire': blue,
  'no hire': amber,
  'strong no hire': red,
}

function Stars({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ fontSize: 13, color: i < score ? amber : `${muted}40` }}>★</span>
      ))}
    </div>
  )
}

export function InterviewScorecardRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    role?: string
    candidate?: string
    interviewDate?: string
    competencies?: {
      name: string
      questions?: string[]
      rubric?: { exceptional?: string; strong?: string; acceptable?: string; concern?: string }
      score?: number
      notes?: string
    }[]
    overallRecommendation?: string
    keyStrengths?: string[]
    keyWeaknesses?: string[]
    nextSteps?: string[]
  }

  const recKey = (d.overallRecommendation ?? '').toLowerCase()
  const recColor = REC_COLOR[recKey] ?? muted

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: ink }}>{d.candidate ?? 'Candidate'}</p>
              <p style={{ fontSize: 12, color: muted, marginTop: 2 }}>{d.role}</p>
              {d.interviewDate && <p style={{ fontSize: 11, color: muted, marginTop: 1 }}>{d.interviewDate}</p>}
            </div>
            {d.overallRecommendation && (
              <div style={{ padding: '8px 16px', borderRadius: 8, background: `${recColor}18`, border: `1.5px solid ${recColor}40`, textAlign: 'center' }}>
                <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: recColor, marginBottom: 2 }}>Recommendation</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: recColor, textTransform: 'capitalize' }}>{d.overallRecommendation}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Competencies */}
      {d.competencies && d.competencies.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={sectionHead}>Competency Scores</p>
          {d.competencies.map((c, i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-4">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{c.name}</p>
                  {c.score !== undefined && <Stars score={c.score} />}
                </div>

                {c.questions && c.questions.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ ...sectionHead, marginBottom: 6 }}>Questions</p>
                    {c.questions.map((q, j) => (
                      <p key={j} style={{ fontSize: 11, color: muted, lineHeight: 1.6, paddingLeft: 8, marginBottom: 2 }}>Q{j + 1}: {q}</p>
                    ))}
                  </div>
                )}

                {c.rubric && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {c.rubric.exceptional && (
                      <div style={{ padding: '6px 8px', background: `${green}08`, borderRadius: 6 }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: green, marginBottom: 2 }}>EXCEPTIONAL</p>
                        <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{c.rubric.exceptional}</p>
                      </div>
                    )}
                    {c.rubric.strong && (
                      <div style={{ padding: '6px 8px', background: `${blue}08`, borderRadius: 6 }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: blue, marginBottom: 2 }}>STRONG</p>
                        <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{c.rubric.strong}</p>
                      </div>
                    )}
                    {c.rubric.acceptable && (
                      <div style={{ padding: '6px 8px', background: `${amber}08`, borderRadius: 6 }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: amber, marginBottom: 2 }}>ACCEPTABLE</p>
                        <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{c.rubric.acceptable}</p>
                      </div>
                    )}
                    {c.rubric.concern && (
                      <div style={{ padding: '6px 8px', background: `${red}08`, borderRadius: 6 }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: red, marginBottom: 2 }}>CONCERN</p>
                        <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{c.rubric.concern}</p>
                      </div>
                    )}
                  </div>
                )}

                {c.notes && (
                  <p style={{ fontSize: 11, color: muted, fontStyle: 'italic', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${muted}18`, lineHeight: 1.6 }}>
                    Notes: {c.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Strengths & Weaknesses */}
      {(d.keyStrengths || d.keyWeaknesses) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {d.keyStrengths && d.keyStrengths.length > 0 && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <p style={sectionHead}>Key Strengths</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {d.keyStrengths.map((s, i) => (
                    <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>
                      <span style={{ color: green, fontWeight: 700, marginRight: 4 }}>+</span>{s}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {d.keyWeaknesses && d.keyWeaknesses.length > 0 && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <p style={sectionHead}>Key Weaknesses</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {d.keyWeaknesses.map((w, i) => (
                    <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>
                      <span style={{ color: red, fontWeight: 700, marginRight: 4 }}>−</span>{w}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Next Steps */}
      {d.nextSteps && d.nextSteps.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p style={sectionHead}>Next Steps</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {d.nextSteps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${blue}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: blue, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingTop: 2 }}>{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
