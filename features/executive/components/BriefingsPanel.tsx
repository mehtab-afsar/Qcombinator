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
import { bdr, ink, muted, blue } from '@/lib/constants/colors'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { EmptyState } from '@/features/shared/components/EmptyState'

interface Briefing {
  id: string
  programId: string | null
  /** Already returned by GET /api/briefings (lib/briefings/briefings.ts) but silently dropped
   *  here until the Command View redesign needed it to group briefings by Executive. */
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
 *    roster page, which shows the whole team's history. */
export function BriefingsPanel({ executiveId }: { executiveId?: string } = {}) {
  const [briefings, setBriefings] = useState<Briefing[] | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/briefings')
      if (!res.ok) { setFailed(true); return }
      const data = await res.json()
      const all: Briefing[] = data.briefings ?? []
      setBriefings(executiveId ? all.filter(b => b.executiveId === executiveId) : all)
    } catch {
      setFailed(true)
    }
  }, [executiveId])

  useEffect(() => { void load() }, [load])

  // The founder navigated here and a briefing was waiting — the retention signal (ADR-016).
  // Keyed by id in a ref so a re-render (the panel re-renders while the rhythm polls) cannot
  // report the same briefing as a second visit.
  const reported = useRef<Set<string>>(new Set())
  useEffect(() => {
    const newest = briefings?.[0]
    if (!newest || reported.current.has(newest.id)) return
    reported.current.add(newest.id)
    trackBriefingOpened(newest.id, newest.createdAt)
  }, [briefings])

  // Empty state (no rhythm has run yet) — and the loading/failed states share its honest copy.
  if (failed || briefings === null || briefings.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No briefings yet"
        body="Once your executive team starts running, each cycle produces a short briefing here — what changed, what it concluded, and where your attention is needed. Nothing has run yet."
      />
    )
  }

  const [latest, ...older] = briefings

  return (
    <SectionCard title="Recent briefings">
      <div style={{ marginTop: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <Link
            href={`/founder/briefings/${latest.id}`}
            style={{ color: ink, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
          >
            {latest.verdict}
          </Link>
          <span style={{ color: muted, fontSize: 13, whiteSpace: 'nowrap' }}>
            {new Date(latest.createdAt).toLocaleDateString()}
          </span>
        </div>
        {bodySummary(latest.body) && (
          <p style={{ color: muted, fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
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
