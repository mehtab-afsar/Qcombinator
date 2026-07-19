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

import { useCallback, useEffect, useState } from 'react'
import { surf, bdr, ink, muted, blue } from '@/lib/constants/colors'

interface Briefing {
  id: string
  programId: string | null
  verdict: string
  body: unknown
  createdAt: string
}

/** Best-effort read of a human summary from the (F10-defined) body. */
function bodySummary(body: unknown): string | null {
  if (body && typeof body === 'object' && 'summary' in body) {
    const s = (body as { summary: unknown }).summary
    if (typeof s === 'string' && s.trim()) return s
  }
  return null
}

export function BriefingsPanel() {
  const [briefings, setBriefings] = useState<Briefing[] | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/briefings')
      if (!res.ok) { setFailed(true); return }
      const data = await res.json()
      setBriefings(data.briefings ?? [])
    } catch {
      setFailed(true)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const card = {
    background: surf, border: `1px dashed ${bdr}`, borderRadius: 12,
    padding: 24, marginTop: 20,
  } as const

  // Empty state (no rhythm has run yet) — and the loading/failed states share its honest copy.
  if (failed || briefings === null || briefings.length === 0) {
    return (
      <div style={card}>
        <h2 style={{ color: ink, fontSize: 17, fontWeight: 600, margin: 0 }}>Briefings</h2>
        <p style={{ color: muted, fontSize: 14, marginTop: 8, lineHeight: 1.6, maxWidth: 560 }}>
          Once your executive team starts running, each cycle produces a short briefing here —
          what changed, what it concluded, and where your attention is needed.
          Nothing has run yet.
        </p>
      </div>
    )
  }

  const [latest, ...older] = briefings

  return (
    <div style={{
      background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: 24, marginTop: 20,
    }}>
      <h2 style={{ color: ink, fontSize: 17, fontWeight: 600, margin: 0 }}>Briefings</h2>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: ink, fontSize: 15, fontWeight: 600 }}>{latest.verdict}</span>
          <span style={{ color: muted, fontSize: 13, whiteSpace: 'nowrap' }}>
            {new Date(latest.createdAt).toLocaleDateString()}
          </span>
        </div>
        {bodySummary(latest.body) && (
          <p style={{ color: muted, fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
            {bodySummary(latest.body)}
          </p>
        )}
      </div>

      {older.length > 0 && (
        <div style={{ marginTop: 20, borderTop: `1px solid ${bdr}`, paddingTop: 14 }}>
          <p style={{ color: muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, margin: 0 }}>
            Earlier
          </p>
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            {older.map(b => (
              <div key={b.id} style={{
                display: 'flex', justifyContent: 'space-between', gap: 12,
                fontSize: 13, color: muted,
              }}>
                <span style={{ color: ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.verdict}
                </span>
                <span style={{ whiteSpace: 'nowrap' }}>{new Date(b.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ color: blue, fontSize: 13, marginTop: 16 }}>
        Briefings point to what changed — the full detail always lives in your Assets.
      </p>
    </div>
  )
}
