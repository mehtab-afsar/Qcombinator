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
import { motion } from 'framer-motion'
import { ExecutiveCard, type ExecutiveCardData } from './ExecutiveCard'
import { ease } from '@/features/shared/tokens'
import { SectionCard } from '@/features/shared/components/SectionCard'
import type { ExecutiveSummary, ProgramInstance } from '../types/executive.types'

interface Briefing { id: string; programId: string | null; executiveId: string | null; verdict: string; createdAt: string }
interface OwnedAction { id: string; executiveId: string | null }

/** Staggered entrance for the one-time "your team assembles" reveal (CommandView). */
const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } }
const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease } },
}

/**
 * @param reveal play the staggered assembly entrance once (CommandView's first-landing
 *   reveal). Omitted/false renders in its final state immediately — every subsequent
 *   visit, and every other place this roster is used (e.g. a draft that isn't
 *   confirmed yet doesn't render this at all).
 */
export function ExecutiveRoster({ programs, reveal = false }: { programs: ProgramInstance[]; reveal?: boolean }) {
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
    <SectionCard title="Your team">
      <motion.div
        variants={containerVariants}
        initial={reveal ? 'hidden' : false}
        animate="show"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}
      >
        {cards.map(c => (
          <motion.div key={c.executive.id} variants={cardVariants}>
            <ExecutiveCard data={c} />
          </motion.div>
        ))}
      </motion.div>
    </SectionCard>
  )
}
