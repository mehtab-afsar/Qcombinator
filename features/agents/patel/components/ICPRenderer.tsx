'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Separator } from '@/components/ui/separator'
import { bg, surf, bdr, ink, muted, blue, green, amber, red } from '../../shared/constants/colors'

// ── Types ────────────────────────────────────────────────────────────────────

interface Segment {
  code: string; industry: string; company_type: string
  geography: string; structural_context: string; is_primary: boolean
}
interface PersonaSnapshot {
  name: string; role_context: string
  day_in_life: string[]; keeps_up_at_night: string[]
  top_frustrations: string[]; what_success_looks_like: string[]
  decision_lens: string
}
interface Persona {
  code: string; title_cluster: string[]; role_type: string
  core_pain: string; primary_kpi: string; snapshot?: PersonaSnapshot
}
interface TriggerItem { trigger: string; time_bound: boolean; signal: string }
interface Variant { id: string; label: string }
interface Objection { type: string; objection: string; counter: string }
interface ICPData {
  title?: string; icp_id?: string; summary?: string
  confidence?: number; evidence_type?: string
  segments?: Segment[]
  personas?: Persona[]
  trigger_taxonomy?: TriggerItem[]
  value_angle?: { primary: string; maps_to: string }
  experiment_design?: { variable: string; variants: Variant[] }
  hypothesis?: string
  objections?: Objection[]
  success_metrics?: { primary: string; secondary: string; tertiary: string }
  failure_mode?: { why_might_not_convert: string; assumption_to_validate: string }
  buyerPersona?: { title?: string; role?: string; seniority?: string; dayInLife?: string; goals?: string[]; frustrations?: string[] }
  firmographics?: { companySize?: string; industry?: string[]; revenue?: string; geography?: string[]; techStack?: string[] }
  painPoints?: { pain: string; severity: string; currentSolution: string }[]
  buyingTriggers?: string[]
  channels?: { channel: string; priority: string; rationale: string }[]
  qualificationCriteria?: string[]
  execution_path?: Record<string, unknown>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const sH: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

const label = (l: string) => (
  <p style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{l}</p>
)

const evidenceColors: Record<string, string> = { validated: green, inferred: amber, assumed: muted }
const valueMapColors: Record<string, string>  = { money: green, risk: amber, survival: red }
const sevColor: Record<string, string>        = { high: red, medium: amber, low: green }
const objTypeColors: Record<string, string>   = {
  budget: amber, inertia: muted, competition: red, timing: blue, complexity: '#7C3AED',
}
const objTypeLabels: Record<string, string>   = {
  budget: 'Budget', inertia: 'Inertia', competition: 'Competition',
  timing: 'Timing', complexity: 'Complexity',
}

// ─────────────────────────────────────────────────────────────────────────────

export function ICPRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as ICPData

  const [activeSeg, setActiveSeg] = useState(0)
  const [expandSnap, setExpandSnap] = useState<string[]>([])

  // Lead enrichment state
  type Lead = { name: string; email: string; title: string | null; confidence: number; linkedin: string | null }
  const [showEnrich, setShowEnrich]   = useState(false)
  const [enrichDomain, setEnrichDomain] = useState('')
  const [enrichKey, setEnrichKey]     = useState('')
  const [enriching, setEnriching]     = useState(false)
  const [enrichLeads, setEnrichLeads] = useState<Lead[] | null>(null)
  const [enrichOrg, setEnrichOrg]     = useState('')
  const [enrichError, setEnrichError] = useState<string | null>(null)
  const [copiedLeads, setCopiedLeads] = useState(false)
  const [addedToSeq, setAddedToSeq]   = useState(false)

  async function handleEnrich() {
    if (!enrichDomain.trim() || enriching) return
    setEnriching(true); setEnrichError(null); setEnrichLeads(null)
    try {
      const res = await fetch('/api/agents/patel/enrich', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: enrichDomain.trim(), hunterApiKey: enrichKey.trim() || undefined }),
      })
      const r = await res.json()
      if (res.ok) { setEnrichLeads(r.leads); setEnrichOrg(r.organization ?? enrichDomain) }
      else setEnrichError(r.error ?? 'Enrichment failed')
    } catch { setEnrichError('Network error') }
    finally { setEnriching(false) }
  }

  function copyLeadsAsCSV() {
    if (!enrichLeads?.length) return
    const csv = ['name,email,company,title', ...enrichLeads.map(l => `${l.name},${l.email},${enrichOrg},${l.title ?? ''}`)].join('\n')
    navigator.clipboard.writeText(csv).catch(() => {})
    setCopiedLeads(true); setTimeout(() => setCopiedLeads(false), 2000)
  }

  const confidencePct = d.confidence != null ? Math.round(d.confidence * 100) : null
  const confColor = confidencePct != null ? (confidencePct >= 75 ? green : confidencePct >= 50 ? amber : red) : muted

  const hasNewSchema = !!(d.segments?.length || d.personas?.length || d.trigger_taxonomy?.length || d.experiment_design || d.failure_mode)

  return (
    <div className="flex flex-col gap-3">

      {/* ── 1. HERO STRIP ─────────────────────────────────────────────────── */}
      {(d.title || d.icp_id || d.summary || confidencePct != null) && (
        <Card style={{ border: `1px solid ${bdr}` }}>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col gap-2">
              {/* Title row */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <p style={{ fontSize: 16, fontWeight: 700, color: ink, lineHeight: 1.3 }}>
                  {d.title ?? 'Ideal Customer Profile'}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {d.icp_id && (
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 5, background: surf ?? '#f5f5f5', border: `1px solid ${bdr}`, color: muted }}>
                      {d.icp_id}
                    </span>
                  )}
                  {d.evidence_type && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 5, border: `1px solid ${evidenceColors[d.evidence_type] ?? muted}`, color: evidenceColors[d.evidence_type] ?? muted }}>
                      {d.evidence_type}
                    </span>
                  )}
                  {d.value_angle?.maps_to && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: valueMapColors[d.value_angle.maps_to] + '18', color: valueMapColors[d.value_angle.maps_to], border: `1px solid ${valueMapColors[d.value_angle.maps_to]}40` }}>
                      ↑ {d.value_angle.maps_to}
                    </span>
                  )}
                </div>
              </div>

              {/* Confidence bar */}
              {confidencePct != null && (
                <div className="flex items-center gap-3">
                  <div style={{ flex: 1, height: 5, background: bdr, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${confidencePct}%`, height: '100%', background: confColor, borderRadius: 99, transition: 'width 0.4s ease' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: confColor, minWidth: 36 }}>{confidencePct}%</span>
                </div>
              )}

              {/* Value angle label */}
              {d.value_angle?.primary && (
                <p style={{ fontSize: 12, color: muted, fontStyle: 'italic' }}>
                  Core value angle: <span style={{ color: ink, fontStyle: 'normal', fontWeight: 500 }}>{d.value_angle.primary}</span>
                </p>
              )}

              {/* Summary */}
              {d.summary && (
                <>
                  <Separator />
                  <p style={{ fontSize: 13, lineHeight: 1.65, color: ink }}>{d.summary}</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 2. SEGMENT SELECTOR ───────────────────────────────────────────── */}
      {d.segments && d.segments.length > 0 && (
        <Card style={{ border: `1px solid ${bdr}` }}>
          <CardContent className="pt-4 pb-4">
            <p style={sH}>Target Segments</p>
            {d.segments.length > 1 && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {d.segments.map((seg, i) => (
                  <button
                    key={seg.code}
                    onClick={() => setActiveSeg(i)}
                    style={{
                      padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: activeSeg === i ? ink : 'transparent',
                      color: activeSeg === i ? bg : muted,
                      border: `1px solid ${activeSeg === i ? ink : bdr}`,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {seg.code}
                    {seg.is_primary && (
                      <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: green, color: '#fff', fontWeight: 700 }}>PRIMARY</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {(() => {
              const seg = d.segments[activeSeg]
              if (!seg) return null
              return (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { l: 'Industry', v: seg.industry },
                      { l: 'Company Type', v: seg.company_type },
                      { l: 'Geography', v: seg.geography },
                      { l: 'Segment Code', v: seg.code },
                    ].filter(x => x.v).map(({ l, v }) => (
                      <div key={l}>
                        {label(l)}
                        <p style={{ fontSize: 13, color: ink, fontWeight: 500 }}>{v}</p>
                      </div>
                    ))}
                  </div>
                  {seg.structural_context && (
                    <div style={{ background: surf ?? '#f9f9f9', borderRadius: 8, padding: '10px 12px', border: `1px solid ${bdr}` }}>
                      {label('Structural Context')}
                      <p style={{ fontSize: 12, color: ink, lineHeight: 1.55 }}>{seg.structural_context}</p>
                    </div>
                  )}
                  {seg.is_primary && d.segments!.length > 1 && (
                    <div className="flex items-center gap-2">
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: green }} />
                      <p style={{ fontSize: 11, color: green, fontWeight: 600 }}>Primary segment — lead GTM execution here</p>
                    </div>
                  )}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* ── 3. PERSONA CARD ───────────────────────────────────────────────── */}
      {d.personas && d.personas.length > 0 && d.personas.map((persona, pi) => (
        <Card key={pi} style={{ border: `1px solid ${bdr}` }}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
              <div>
                <p style={sH}>Buyer Persona {d.personas!.length > 1 ? `· ${persona.code}` : ''}</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>
                  {persona.title_cluster?.join(' / ') ?? persona.code}
                </p>
                {persona.role_type && (
                  <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>{persona.role_type}</p>
                )}
              </div>
              {persona.primary_kpi && (
                <div style={{ background: surf ?? '#f9f9f9', border: `1px solid ${bdr}`, borderRadius: 8, padding: '8px 12px', maxWidth: 220 }}>
                  {label('Judged On (KPI)')}
                  <p style={{ fontSize: 12, color: ink, fontWeight: 600 }}>{persona.primary_kpi}</p>
                </div>
              )}
            </div>

            {persona.core_pain && (
              <div style={{ background: red + '0d', border: `1px solid ${red}30`, borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                {label('Core Pain')}
                <p style={{ fontSize: 13, color: ink, lineHeight: 1.55 }}>{persona.core_pain}</p>
              </div>
            )}

            {persona.snapshot && (
              <>
                <div style={{ borderTop: `1px solid ${bdr}`, marginBottom: 10, paddingTop: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: muted, marginBottom: 2 }}>
                    Persona Snapshot — <span style={{ color: ink }}>{persona.snapshot.name}</span>
                    {persona.snapshot.role_context && <span style={{ color: muted, fontWeight: 400 }}> · {persona.snapshot.role_context}</span>}
                  </p>
                </div>
                <Accordion type="multiple" value={expandSnap} onValueChange={setExpandSnap} className="flex flex-col gap-1">
                  {persona.snapshot.day_in_life?.length > 0 && (
                    <AccordionItem value={`dil-${pi}`} className="border rounded-xl overflow-hidden">
                      <AccordionTrigger className="px-4 py-2.5 hover:no-underline">
                        <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>Day in the Life</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-3">
                        <div className="flex flex-col gap-1">
                          {persona.snapshot.day_in_life.map((b, i) => (
                            <p key={i} style={{ fontSize: 12, color: muted, lineHeight: 1.55 }}>• {b}</p>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {persona.snapshot.keeps_up_at_night?.length > 0 && (
                    <AccordionItem value={`kn-${pi}`} className="border rounded-xl overflow-hidden">
                      <AccordionTrigger className="px-4 py-2.5 hover:no-underline">
                        <span style={{ fontSize: 12, fontWeight: 600, color: red }}>Keeps Up at Night</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-3">
                        <div className="flex flex-col gap-1">
                          {persona.snapshot.keeps_up_at_night.map((b, i) => (
                            <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.55 }}>• {b}</p>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {persona.snapshot.top_frustrations?.length > 0 && (
                    <AccordionItem value={`fr-${pi}`} className="border rounded-xl overflow-hidden">
                      <AccordionTrigger className="px-4 py-2.5 hover:no-underline">
                        <span style={{ fontSize: 12, fontWeight: 600, color: amber }}>Top Frustrations</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-3">
                        <div className="flex flex-col gap-1">
                          {persona.snapshot.top_frustrations.map((b, i) => (
                            <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.55 }}>• {b}</p>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {persona.snapshot.what_success_looks_like?.length > 0 && (
                    <AccordionItem value={`ws-${pi}`} className="border rounded-xl overflow-hidden">
                      <AccordionTrigger className="px-4 py-2.5 hover:no-underline">
                        <span style={{ fontSize: 12, fontWeight: 600, color: green }}>What Success Looks Like</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-3">
                        <div className="flex flex-col gap-1">
                          {persona.snapshot.what_success_looks_like.map((b, i) => (
                            <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.55 }}>• {b}</p>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {persona.snapshot.decision_lens && (
                    <AccordionItem value={`dl-${pi}`} className="border rounded-xl overflow-hidden">
                      <AccordionTrigger className="px-4 py-2.5 hover:no-underline">
                        <span style={{ fontSize: 12, fontWeight: 600, color: blue }}>Decision Lens</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-3">
                        <p style={{ fontSize: 12, color: ink, lineHeight: 1.55 }}>{persona.snapshot.decision_lens}</p>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Old buyer persona — only shown when new personas don't exist */}
      {!hasNewSchema && d.buyerPersona && (
        <Card style={{ border: `1px solid ${bdr}` }}>
          <CardContent className="pt-4 pb-4">
            <p style={sH}>Buyer Persona</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { l: 'Title', v: d.buyerPersona.title },
                { l: 'Role', v: d.buyerPersona.role },
                { l: 'Seniority', v: d.buyerPersona.seniority },
              ].filter(x => x.v).map(({ l, v }) => (
                <div key={l}>{label(l)}<p style={{ fontSize: 13, color: ink }}>{v}</p></div>
              ))}
            </div>
            {d.buyerPersona.dayInLife && (
              <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 8 }}>{d.buyerPersona.dayInLife}</p>
            )}
            {d.buyerPersona.goals && d.buyerPersona.goals.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: green, marginBottom: 4 }}>Goals</p>
                {d.buyerPersona.goals.map((g, i) => (
                  <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>• {g}</p>
                ))}
              </div>
            )}
            {d.buyerPersona.frustrations && d.buyerPersona.frustrations.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: red, marginBottom: 4 }}>Frustrations</p>
                {d.buyerPersona.frustrations.map((f, i) => (
                  <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>• {f}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 4. TRIGGER TAXONOMY ───────────────────────────────────────────── */}
      {d.trigger_taxonomy && d.trigger_taxonomy.length > 0 && (
        <Card style={{ border: `1px solid ${bdr}` }}>
          <CardContent className="pt-4 pb-4">
            <p style={sH}>Trigger Taxonomy</p>
            <div className="flex flex-col gap-2">
              {d.trigger_taxonomy.map((t, i) => (
                <div key={i} style={{ padding: '10px 12px', background: surf ?? '#f9f9f9', borderRadius: 8, border: `1px solid ${bdr}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink, lineHeight: 1.4 }}>{t.trigger}</p>
                    {t.time_bound && (
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: blue + '18', color: blue, border: `1px solid ${blue}40`, flexShrink: 0, fontWeight: 600 }}>
                        ⏱ Time-bound
                      </span>
                    )}
                  </div>
                  {t.signal && (
                    <div className="flex items-start gap-1.5 mt-1.5">
                      <span style={{ fontSize: 10, color: muted, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>Signal:</span>
                      <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{t.signal}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 5. EXPERIMENT DESIGN ──────────────────────────────────────────── */}
      {d.experiment_design && (
        <Card style={{ border: `1px solid ${bdr}` }}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <p style={{ ...sH, marginBottom: 0 }}>Experiment Design</p>
              {d.experiment_design.variable && (
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: '#7C3AED18', color: '#7C3AED', border: '1px solid #7C3AED40', fontWeight: 600 }}>
                  Variable: {d.experiment_design.variable}
                </span>
              )}
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(d.experiment_design.variants?.length ?? 1, 3)}, 1fr)` }}>
              {(d.experiment_design.variants ?? []).map((v) => (
                <div key={v.id} style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${bdr}`, background: surf ?? '#f9f9f9' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 4 }}>Variant {v.id}</p>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{v.label}</p>
                </div>
              ))}
            </div>
            {d.hypothesis && (
              <div style={{ marginTop: 12, borderLeft: `3px solid #7C3AED`, paddingLeft: 12, paddingTop: 6, paddingBottom: 6 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Hypothesis</p>
                <p style={{ fontSize: 13, color: ink, lineHeight: 1.6, fontStyle: 'italic' }}>{d.hypothesis}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hypothesis standalone (if no experiment_design) */}
      {d.hypothesis && !d.experiment_design && (
        <div style={{ borderLeft: `3px solid #7C3AED`, paddingLeft: 14, paddingTop: 6, paddingBottom: 6 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Hypothesis</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6, fontStyle: 'italic' }}>{d.hypothesis}</p>
        </div>
      )}

      {/* ── 6. OBJECTION MAP ──────────────────────────────────────────────── */}
      {d.objections && d.objections.length > 0 && (
        <Card style={{ border: `1px solid ${bdr}` }}>
          <CardContent className="pt-4 pb-4">
            <p style={sH}>Objection Map</p>
            <Accordion type="multiple" className="flex flex-col gap-1">
              {d.objections.map((obj, i) => (
                <AccordionItem key={i} value={`obj-${i}`} className="border rounded-xl overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3 w-full">
                      <span style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 5, fontWeight: 700, flexShrink: 0,
                        background: (objTypeColors[obj.type] ?? muted) + '18',
                        color: objTypeColors[obj.type] ?? muted,
                        border: `1px solid ${(objTypeColors[obj.type] ?? muted)}40`,
                      }}>
                        {objTypeLabels[obj.type] ?? obj.type}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: ink, textAlign: 'left' }}>{obj.objection}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3">
                    <div style={{ paddingTop: 4 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Counter</p>
                      <p style={{ fontSize: 12, color: ink, lineHeight: 1.55 }}>{obj.counter}</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* ── 7. SUCCESS METRICS ────────────────────────────────────────────── */}
      {d.success_metrics && (
        <Card style={{ border: `1px solid ${bdr}` }}>
          <CardContent className="pt-4 pb-4">
            <p style={sH}>Success Metrics</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { rank: 'Primary', val: d.success_metrics.primary, c: green },
                { rank: 'Secondary', val: d.success_metrics.secondary, c: blue },
                { rank: 'Tertiary', val: d.success_metrics.tertiary, c: muted },
              ].map(({ rank, val, c }) => (
                <div key={rank} style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${c}40`, background: c + '0d' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: c, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{rank}</p>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{val}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 8. FAILURE MODE ───────────────────────────────────────────────── */}
      {d.failure_mode && (
        <div style={{ border: `1.5px solid ${amber}`, borderRadius: 10, padding: '12px 16px', background: amber + '0a' }}>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontSize: 14 }}>⚠</span>
            <p style={{ fontSize: 11, fontWeight: 700, color: amber, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Failure Mode</p>
          </div>
          {d.failure_mode.why_might_not_convert && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 3 }}>Why it might not convert</p>
              <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.failure_mode.why_might_not_convert}</p>
            </div>
          )}
          {d.failure_mode.assumption_to_validate && (
            <div>
              <p style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 3 }}>Assumption to validate</p>
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.55, fontWeight: 500 }}>{d.failure_mode.assumption_to_validate}</p>
            </div>
          )}
        </div>
      )}

      {/* ── 9. PAIN POINTS ────────────────────────────────────────────────── */}
      {d.painPoints && d.painPoints.length > 0 && (
        <div>
          <p style={sH}>Pain Points</p>
          <Accordion type="multiple" className="flex flex-col gap-1">
            {d.painPoints.map((pp, i) => (
              <AccordionItem key={i} value={`pp-${i}`} className="border rounded-xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-3 w-full">
                    <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>{pp.pain}</span>
                    <Badge variant="outline" style={{ color: sevColor[pp.severity] || muted, borderColor: sevColor[pp.severity] || muted, marginLeft: 'auto' }}>
                      {pp.severity}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3">
                  <p style={{ fontSize: 11, color: muted }}>Current solution: {pp.currentSolution}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {/* ── 10. BUYING TRIGGERS ───────────────────────────────────────────── */}
      {d.buyingTriggers && d.buyingTriggers.length > 0 && (
        <Card style={{ border: `1px solid ${bdr}` }}>
          <CardContent className="pt-4 pb-4">
            <p style={sH}>Buying Triggers</p>
            <div className="flex flex-col gap-1.5">
              {d.buyingTriggers.map((t, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span style={{ fontSize: 11, color: muted, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{t}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 11. CHANNELS ──────────────────────────────────────────────────── */}
      {d.channels && d.channels.length > 0 && (
        <Card style={{ border: `1px solid ${bdr}` }}>
          <CardContent className="pt-4 pb-4">
            <p style={sH}>Recommended Channels</p>
            <div className="flex flex-col gap-3">
              {d.channels.map((ch, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>{ch.channel}</span>
                    <Badge variant={ch.priority === 'primary' ? 'default' : 'secondary'}>{ch.priority}</Badge>
                  </div>
                  <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{ch.rationale}</p>
                  {i < d.channels!.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 12. QUALIFICATION CRITERIA ────────────────────────────────────── */}
      {d.qualificationCriteria && d.qualificationCriteria.length > 0 && (
        <Card style={{ border: `1px solid ${bdr}` }}>
          <CardContent className="pt-4 pb-4">
            <p style={sH}>Qualification Criteria</p>
            <div className="flex flex-col gap-1">
              {d.qualificationCriteria.map((q, i) => (
                <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>✓ {q}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 13. FIRMOGRAPHICS ─────────────────────────────────────────────── */}
      {d.firmographics && (
        <Card style={{ border: `1px solid ${bdr}` }}>
          <CardContent className="pt-4 pb-4">
            <p style={sH}>Firmographics</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {d.firmographics.companySize && (
                <div>{label('Company Size')}<p style={{ fontSize: 13, color: ink }}>{d.firmographics.companySize}</p></div>
              )}
              {d.firmographics.revenue && (
                <div>{label('Revenue')}<p style={{ fontSize: 13, color: ink }}>{d.firmographics.revenue}</p></div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(d.firmographics.industry ?? []).map(t => <Badge key={t} variant="outline">{t}</Badge>)}
              {(d.firmographics.geography ?? []).map(t => <Badge key={t} variant="outline">{t}</Badge>)}
              {(d.firmographics.techStack ?? []).map(t => <Badge key={t} variant="secondary" style={{ fontSize: 10 }}>{t}</Badge>)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 14. HUNTER.IO LEAD ENRICHMENT ─────────────────────────────────── */}
      <Card style={{ border: `1px solid ${bdr}` }}>
        <CardContent className="pt-4 pb-4">
          <div className="flex justify-between items-start" style={{ marginBottom: showEnrich || enrichLeads ? 14 : 0 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Suggested Leads (Hunter.io)</p>
              <p style={{ fontSize: 11, color: muted }}>Enter a company domain — Patel finds decision-maker emails matching your ICP.</p>
            </div>
            <button
              onClick={() => { setShowEnrich(p => !p); setEnrichLeads(null); setEnrichError(null) }}
              style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: ink, color: bg, fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
            >
              {showEnrich ? 'Close' : 'Find Leads'}
            </button>
          </div>

          {showEnrich && !enrichLeads && (
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-2">
                <input
                  value={enrichDomain} onChange={e => setEnrichDomain(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleEnrich() }}
                  placeholder="acme.com"
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, outline: 'none' }}
                />
                <button onClick={handleEnrich} disabled={!enrichDomain.trim() || enriching}
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                  {enriching ? 'Searching…' : 'Search'}
                </button>
              </div>
              <div>
                <p style={{ fontSize: 10, color: muted, marginBottom: 4 }}>Hunter API Key (optional — uses shared key if blank)</p>
                <input value={enrichKey} onChange={e => setEnrichKey(e.target.value)}
                  placeholder="Leave blank to use Edge Alpha's key (25 searches/mo)"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${bdr}`, background: bg, fontSize: 12, color: ink, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {enrichError && <p style={{ fontSize: 12, color: red }}>{enrichError}</p>}
            </div>
          )}

          {enrichLeads && (
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{enrichLeads.length} leads at {enrichOrg}</p>
                <div className="flex gap-2">
                  <button onClick={copyLeadsAsCSV} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${bdr}`, background: bg, fontSize: 11, fontWeight: 600, color: copiedLeads ? green : ink, cursor: 'pointer' }}>
                    {copiedLeads ? '✓ Copied' : 'Copy as CSV'}
                  </button>
                  <button
                    onClick={() => {
                      if (!enrichLeads?.length) return
                      const csv = ['name,email,company,title', ...enrichLeads.map(l => `${l.name},${l.email},${enrichOrg},${l.title ?? ''}`)].join('\n')
                      sessionStorage.setItem('patel_enriched_leads', csv)
                      setAddedToSeq(true); setTimeout(() => setAddedToSeq(false), 3000)
                    }}
                    style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: addedToSeq ? green : ink, color: bg, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {addedToSeq ? '✓ Added to Outreach!' : 'Add to Outreach Sequence ↓'}
                  </button>
                  <button onClick={() => { setEnrichLeads(null); setShowEnrich(true) }} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${bdr}`, background: bg, fontSize: 11, color: muted, cursor: 'pointer' }}>
                    New search
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {enrichLeads.map((lead, _i) => (
                  <div key={i} className="flex justify-between items-center" style={{ padding: '8px 12px', background: bg, borderRadius: 8, border: `1px solid ${bdr}` }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{lead.name}</p>
                      <p style={{ fontSize: 11, color: muted }}>{lead.email}{lead.title ? ` · ${lead.title}` : ''}</p>
                    </div>
                    <Badge variant="outline">{lead.confidence}%</Badge>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 10, color: muted, marginTop: 8 }}>Copy as CSV to paste into the Outreach Sequence sender above →</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
