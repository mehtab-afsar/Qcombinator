'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { blue, muted, green, amber, red, ink, bdr, surf } from '../../shared/constants/colors'
import { Lock, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react'
import { PATEL_DIMENSIONS, PATEL_INDICATORS } from '@/lib/constants/patel-indicators'
import type { PatelScores, PatelConfidence, DeliverableKey } from '@/lib/constants/patel-indicators'

interface DiagnosticData {
  scores: PatelScores
  confidence: PatelConfidence
  d1: boolean; d2: boolean; d3: boolean; d4: boolean
}

const scoreColor = (n: number) => n >= 4 ? green : n >= 3 ? amber : red

const CONF_COLOR: Record<string, string> = {
  validated: green,
  inferred: amber,
  assumed: red,
}

function Dots({ score }: { score?: number }) {
  const c = score ? scoreColor(score) : bdr
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <div key={n} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: score && n <= score ? c : bdr,
        }} />
      ))}
    </div>
  )
}

function DimSection({
  label, deliverable, indicatorIds, scores, confidence, done, locked,
}: {
  label: string
  deliverable: DeliverableKey
  indicatorIds: string[]
  scores: PatelScores
  confidence: PatelConfidence
  done: boolean
  locked: boolean
}) {
  const [open, setOpen] = useState(false)
  const scored = indicatorIds.filter(id => scores[id] !== undefined).length
  const avg = scored > 0 ? indicatorIds.reduce((a, id) => a + (scores[id] ?? 0), 0) / scored : 0
  const hdrColor = scored === 0 ? muted : scoreColor(avg)

  // Short label: strip the "P1.x " prefix, e.g. "P1.1 ICP Quality" → "ICP Quality"
  const shortLabel = label.replace(/^P1\.\d\s+/, '')

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', background: 'none', border: 'none', padding: '7px 0',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {open
            ? <ChevronDown size={9} style={{ color: muted, flexShrink: 0 }} />
            : <ChevronRight size={9} style={{ color: muted, flexShrink: 0 }} />}
          <span style={{ fontSize: 10, fontWeight: 600, color: hdrColor }}>
            {shortLabel}
          </span>
        </div>

        {/* Right side: deliverable pill + score count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 9, color: muted }}>{scored}/5</span>
          {done
            ? <CheckCircle2 size={10} style={{ color: green }} />
            : locked
              ? <Lock size={10} style={{ color: muted, opacity: 0.4 }} />
              : <div style={{ width: 8, height: 8, borderRadius: '50%', border: `1.5px solid ${blue}` }} />
          }
        </div>
      </button>

      {open && (
        <div style={{ paddingBottom: 6, paddingLeft: 14 }}>
          {indicatorIds.map(id => {
            const ind = PATEL_INDICATORS[id]
            const score = scores[id]
            const conf = confidence[id]

            return (
              <div key={id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 4, paddingBottom: 4,
                borderBottom: `1px solid ${bdr}`,
              }}>
                <span style={{
                  fontSize: 9, color: score !== undefined ? ink : muted,
                  flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  paddingRight: 6,
                }}>
                  {ind.name}
                </span>
                {score !== undefined ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <Dots score={score} />
                    {conf && CONF_COLOR[conf] && (
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: CONF_COLOR[conf],
                        flexShrink: 0,
                      }} />
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: 8, color: muted }}>—</span>
                )}
              </div>
            )
          })}

          {/* Deliverable label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingTop: 6 }}>
            <span style={{
              fontSize: 9,
              color: locked ? muted : done ? green : blue,
              opacity: locked ? 0.5 : 1,
            }}>
              {deliverable} {done ? '· done' : locked ? '· locked' : '· ready'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export function DiagnosticSidebar({ userId }: { userId: string }) {
  const [data, setData] = useState<DiagnosticData | null>(null)

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    Promise.all([
      supabase.from('patel_diagnostic_scores').select('scores, confidence').eq('user_id', userId).single(),
      supabase.from('agent_artifacts').select('artifact_type').eq('user_id', userId)
        .in('artifact_type', ['icp_document', 'pains_gains_triggers', 'buyer_journey', 'positioning_messaging']),
    ]).then(([s, a]) => {
      const types = new Set((a.data ?? []).map(r => r.artifact_type))
      setData({
        scores: (s.data?.scores ?? {}) as PatelScores,
        confidence: (s.data?.confidence ?? {}) as PatelConfidence,
        d1: types.has('icp_document'),
        d2: types.has('pains_gains_triggers'),
        d3: types.has('buyer_journey'),
        d4: types.has('positioning_messaging'),
      })
    })
  }, [userId])

  const ds = data ? {
    D1: { done: data.d1, locked: false },
    D2: { done: data.d2, locked: !data.d1 },
    D3: { done: data.d3, locked: !data.d1 || !data.d2 },
    D4: { done: data.d4, locked: !data.d1 || !data.d2 || !data.d3 },
  } : null

  return (
    <div style={{
      width: 176, minWidth: 176,
      borderRight: `1px solid ${bdr}`,
      background: surf,
      overflowY: 'auto',
      padding: '14px 12px',
    }}>

      {/* Header */}
      <p style={{
        fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.13em', color: muted, marginBottom: 2,
      }}>
        GTM Diagnostic
      </p>
      <p style={{ fontSize: 9, color: muted, marginBottom: 10 }}>
        Tap a dimension to expand
      </p>

      {/* Legend inline — one line */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
        {[['Validated', green], ['Inferred', amber], ['Assumed', red]].map(([l, c]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
            <span style={{ fontSize: 8, color: muted }}>{l}</span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${bdr}` }}>
        {data && ds ? (
          PATEL_DIMENSIONS.map((dim) => {
            const status = ds[dim.deliverable]
            return (
              <div key={dim.key} style={{ borderBottom: `1px solid ${bdr}` }}>
                <DimSection
                  label={dim.label}
                  deliverable={dim.deliverable}
                  indicatorIds={dim.indicatorIds}
                  scores={data.scores}
                  confidence={data.confidence}
                  done={status.done}
                  locked={status.locked}
                />
              </div>
            )
          })
        ) : (
          // Skeleton
          <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[70, 55, 65, 50].map((w, i) => (
              <div key={i} style={{ height: 28, borderRadius: 4, background: bdr, width: `${w}%`, opacity: 0.35 }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
