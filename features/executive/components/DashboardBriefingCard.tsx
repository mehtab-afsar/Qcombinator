'use client'

/**
 * F04 surface for F12 — the latest Executive Briefing, shown compactly on the founder
 * Dashboard. Self-contained and self-gating: it fetches /api/briefings, which 404s when
 * FF_NEW_EXECUTIVE_MODEL is off, so this renders **nothing** in production today. The live
 * dashboard is unaffected until the new model is switched on.
 *
 * Read-only: it links through to the Command View for the full briefing (ADR-007). No
 * approve/dismiss/acknowledge control (ADR-002).
 */

import { useEffect, useState } from 'react'
import { surf, bdr, ink, muted, blue } from '@/lib/constants/colors'

interface Briefing { id: string; verdict: string; createdAt: string }

export function DashboardBriefingCard() {
  const [latest, setLatest] = useState<Briefing | null>(null)

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const res = await fetch('/api/briefings')
        if (!res.ok) return // 404 = flag off → render nothing
        const data = await res.json()
        const first = (data.latest ?? data.briefings ?? [])[0]
        if (live && first) setLatest(first)
      } catch { /* stay hidden on any error — this is a secondary surface */ }
    })()
    return () => { live = false }
  }, [])

  if (!latest) return null

  return (
    <a href="/founder/executive" style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: surf, border: `1px solid ${bdr}`, borderRadius: 12,
        padding: '14px 18px', marginBottom: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ color: muted, fontSize: 12 }}>Latest briefing</span>
          <p style={{
            color: ink, fontSize: 14, fontWeight: 500, margin: '2px 0 0',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {latest.verdict}
          </p>
        </div>
        <span style={{ color: blue, fontSize: 13, whiteSpace: 'nowrap' }}>View →</span>
      </div>
    </a>
  )
}
