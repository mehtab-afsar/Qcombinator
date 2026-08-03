'use client'

/**
 * The 5 Executives, always all of them, fixed Registry order — the roster that answers
 * "where did Patel go?" (nowhere — see ExecutiveCard's docstring).
 *
 * Self-fetching, like BriefingsPanel/ActionsPanel/RhythmPanel: pulls the Registry roster, the
 * latest briefing per program, and pending actions, then does the client-side JOIN by id to build
 * each card's view model. This is data composition for display, not executive reasoning
 * (CLAUDE.md §2) — the same class of work BriefingsPanel's bodySummary()/changedAssets() already
 * does; no decision gets made here, only "which already-fetched facts belong on which card."
 *
 * `programs` comes from the page as a prop (same data MandateCard already receives) rather than
 * a second /api/contracts fetch.
 */

import { useEffect, useState } from 'react'
import { ExecutiveCard, type ExecutiveCardData } from './ExecutiveCard'
import type { ExecutiveSummary, ProgramInstance } from '../types/executive.types'

interface Briefing { id: string; programId: string | null; executiveId: string | null; verdict: string; createdAt: string }
interface OwnedAction { id: string; executiveId: string | null }

export function ExecutiveRoster({ programs }: { programs: ProgramInstance[] }) {
  const [executives, setExecutives] = useState<ExecutiveSummary[] | null>(null)
  const [briefings, setBriefings] = useState<Briefing[]>([])
  const [pending, setPending] = useState<OwnedAction[]>([])

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const [execRes, briefRes, actionRes] = await Promise.all([
          fetch('/api/executives'),
          fetch('/api/briefings'),
          fetch('/api/actions'),
        ])
        if (!live) return
        if (execRes.ok) setExecutives((await execRes.json()).executives ?? [])
        if (briefRes.ok) setBriefings((await briefRes.json()).latest ?? [])
        if (actionRes.ok) setPending((await actionRes.json()).pending ?? [])
      } catch {
        if (live) setExecutives([]) // fail quiet — this is a secondary surface on a page that
                                     // already shows the mandate; do not error the whole view.
      }
    })()
    return () => { live = false }
  }, [])

  if (!executives) return null
  if (executives.length === 0) return null

  const activeByExecutive = new Map(programs.map(p => [p.owner, p]))
  const briefingByExecutive = new Map(
    briefings.filter(b => b.executiveId).map(b => [b.executiveId as string, b]),
  )

  const cards: ExecutiveCardData[] = executives.map(executive => {
    const program = activeByExecutive.get(executive.id) ?? null
    return {
      executive,
      programName: program?.objective ?? null,
      latestBriefingVerdict: briefingByExecutive.get(executive.id)?.verdict ?? null,
      pendingActionCount: pending.filter(a => a.executiveId === executive.id).length,
    }
  })

  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{
        fontSize: 12, fontWeight: 600, color: '#8A867C',
        textTransform: 'uppercase', letterSpacing: 0.6, margin: '0 0 12px',
      }}>
        Your executive team
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {cards.map(c => <ExecutiveCard key={c.executive.id} data={c} />)}
      </div>
    </div>
  )
}
