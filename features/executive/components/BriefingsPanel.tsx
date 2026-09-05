'use client'

/**
 * Executive Briefings — the founder-facing output of each cycle (F12).
 *
 * Fetches real briefings from /api/briefings and shows the latest prominently with a
 * history list. Until the rhythm (F10) has run, there are none — and it says so plainly
 * rather than inventing a next-cycle date (a lie on the first screen a founder sees).
 *
 * Client boundary: this fetches via the API and never imports lib/mandate|registry|prompts.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Inbox } from 'lucide-react'
import { trackBriefingOpened } from '@/lib/analytics-client'
import { bdr, ink, muted, blue, green, alpha } from '@/lib/constants/colors'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { programName } from '../lib/programLabel'
import { useCycleLive } from '../lib/useCycleLive'
import { recordDocumentOpened } from '../lib/documentOpens'

interface Briefing {
  id: string
  /** The underlying database row id — not the Registry Program code. Use programTemplateId. */
  programId: string | null
  /** The Registry Program id, e.g. 'P001' — resolved server-side (lib/briefings/briefings.ts's
   *  attachProgramTemplateId). Null only if unresolvable. */
  programTemplateId: string | null
  executiveId: string | null
  verdict: string
  body: unknown
  createdAt: string
}

interface ChangedAsset { assetId: string; name?: string }

/** Best-effort read of a human summary from the (F10-defined) body. */
function bodySummary(body: unknown): string | null {
  if (body && typeof body === 'object' && 'summary' in body) {
    const s = (body as { summary: unknown }).summary
    if (typeof s === 'string' && s.trim()) return s
  }
  return null
}

/** The Asset versions this briefing describes — links through to them (ADR-007). */
function changedAssets(body: unknown): ChangedAsset[] {
  if (body && typeof body === 'object' && 'changedAssets' in body) {
    const list = (body as { changedAssets: unknown }).changedAssets
    if (Array.isArray(list)) {
      return list.filter((a): a is ChangedAsset =>
        Boolean(a) && typeof a === 'object' && typeof (a as ChangedAsset).assetId === 'string')
    }
  }
  return []
}

/** @param executiveId scope to one executive's briefings — the detail page. Omitted on the
 *    roster page, which shows the whole team's history.
 *  @param programTemplateId narrow further to one Program (e.g. 'P001') on a multi-Program
 *    executive's page. Additive — omitted means "every Program this executive owns," the same
 *    behavior this panel always had. When set, each entry's own Program label is hidden (every
 *    row already belongs to the same one); when unset and more than one Program is present in
 *    the results, each entry shows which Program wrote it. */
export function BriefingsPanel({
  executiveId, programTemplateId,
}: { executiveId?: string; programTemplateId?: string } = {}) {
  const [briefings, setBriefings] = useState<Briefing[] | null>(null)
  const [failed, setFailed] = useState(false)
  // A cycle finishing is exactly when a new briefing exists server-side — without this, a
  // founder watching RhythmPanel's own step counter finish sees nothing appear here until a
  // manual reload (Gap A). `generation` bumps on every live transition (cycle start OR finish);
  // reacting to both is harmless (a start has nothing new yet) and keeps this one effect simple.
  const { generation } = useCycleLive()

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/briefings')
      if (!res.ok) { setFailed(true); return }
      const data = await res.json()
      const all: Briefing[] = data.briefings ?? []
      setBriefings(all.filter(b =>
        (!executiveId || b.executiveId === executiveId)
        && (!programTemplateId || b.programTemplateId === programTemplateId),
      ))
    } catch {
      setFailed(true)
    }
  }, [executiveId, programTemplateId])

  useEffect(() => { void load() }, [load, generation])

  // The founder navigated here and a briefing was waiting — the retention signal (ADR-016).
  // Keyed by id in a ref so a re-render (the panel re-renders while the rhythm polls) cannot
  // report the same briefing as a second visit.
  const reported = useRef<Set<string>>(new Set())
  useEffect(() => {
    const newest = briefings?.[0]
    if (!newest || reported.current.has(newest.id)) return
    reported.current.add(newest.id)
    trackBriefingOpened(newest.id, newest.createdAt)
    recordDocumentOpened('briefing', newest.id)
  }, [briefings])

  // Empty state (no rhythm has run yet) — and the loading/failed states share it. A greyed
  // preview of a real filled briefing's shape (see app/founder/briefings/[id]/page.tsx),
  // not just an apology — so "nothing yet" also previews what's coming.
  if (failed || briefings === null || briefings.length === 0) {
    return <EmptyBriefingPreview />
  }

  const [latest, ...older] = briefings

  return (
    <SectionCard title="Recent briefings" style={{ background: alpha(green, 0.04) }}>
      <div style={{ marginTop: 0 }}>
        {/* UX_SPEC §6: serif for the executive's own voice, the same rule already applied in
            ActionsPanel/RhythmPanel this session — a briefing's verdict is the team speaking
            directly to the founder, the clearest instance of that voice on this whole page. */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <Link
            href={`/founder/briefings/${latest.id}`}
            style={{ color: ink, fontFamily: FONT_SERIF, fontSize: 16, fontWeight: 500, textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
          >
            {latest.verdict}
          </Link>
          <span style={{ color: muted, fontSize: 13, whiteSpace: 'nowrap', textAlign: 'right' }}>
            {!programTemplateId && programName(latest.programTemplateId) && (
              <span style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                {programName(latest.programTemplateId)}
              </span>
            )}
            {new Date(latest.createdAt).toLocaleDateString()}
          </span>
        </div>
        {bodySummary(latest.body) && (
          <p style={{ color: muted, fontFamily: FONT_SERIF, fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
            {bodySummary(latest.body)}
          </p>
        )}
        {changedAssets(latest.body).length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ color: muted, fontSize: 12 }}>Assets updated:</span>
            {changedAssets(latest.body).map(a => (
              <a key={a.assetId} href={`/founder/assets/${a.assetId}`}
                style={{
                  color: blue, fontSize: 12, textDecoration: 'none',
                  border: `1px solid ${bdr}`, borderRadius: 6, padding: '2px 8px',
                }}>
                {a.name ?? a.assetId}
              </a>
            ))}
          </div>
        )}
      </div>

      {older.length > 0 && (
        <div style={{ marginTop: 20, borderTop: `1px solid ${bdr}`, paddingTop: 14 }}>
          <p style={{ color: muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, margin: 0 }}>
            Earlier
          </p>
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            {older.map(b => (
              <Link
                key={b.id}
                href={`/founder/briefings/${b.id}`}
                style={{
                  display: 'flex', justifyContent: 'space-between', gap: 12,
                  fontSize: 13, color: muted, textDecoration: 'none',
                }}
              >
                <span style={{ color: ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {!programTemplateId && programName(b.programTemplateId) && (
                    <span style={{ color: muted, fontWeight: 600, marginRight: 6 }}>
                      {programName(b.programTemplateId)} ·
                    </span>
                  )}
                  {b.verdict}
                </span>
                <span style={{ whiteSpace: 'nowrap' }}>{new Date(b.createdAt).toLocaleDateString()}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <p style={{ color: blue, fontSize: 13, marginTop: 16 }}>
        Briefings point to what changed — the full detail always lives in your Assets.
      </p>
    </SectionCard>
  )
}

/** Skeleton lines standing in for real prose — never real content, just the shape of it. */
function GreyLine({ width }: { width: number }) {
  return <div style={{ height: 8, width: `${width}%`, borderRadius: 4, background: alpha(bdr, 1) }} />
}

function EmptyBriefingPreview() {
  return (
    <div style={{
      border: `1.5px dashed ${bdr}`, borderRadius: 16, padding: '32px 28px', textAlign: 'left',
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20,
        background: alpha(blue, 0.08), fontSize: 11, fontWeight: 600, color: blue,
        textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 16,
      }}>
        <Inbox size={11} /> No briefings yet
      </div>

      <h3 style={{
        fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 500, lineHeight: 1.4,
        color: alpha(ink, 0.4), margin: 0,
      }}>
        This is roughly what one will look like — a verdict in one line, then why.
      </h3>

      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <GreyLine width={90} />
        <GreyLine width={70} />
        <GreyLine width={80} />
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        {[0, 1].map(i => (
          <div key={i} style={{
            height: 20, width: 92, borderRadius: 6, border: `1px solid ${bdr}`, background: alpha(bdr, 0.4),
          }} />
        ))}
      </div>

      <p style={{ color: muted, fontSize: 13, marginTop: 20, lineHeight: 1.6 }}>
        Once your executive team starts running, each cycle produces a short briefing here — what
        changed, what it concluded, and where your attention is needed. Nothing has run yet.
      </p>
    </div>
  )
}
