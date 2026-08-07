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
import { muted } from '@/lib/constants/colors'
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
  // Phase 1 of the cockpit build — which card (if any) the founder just clicked into, so its
  // siblings can dim while it leads the transition (ExecutiveCard's own entrance animation).
  const [leavingId, setLeavingId] = useState<string | null>(null)

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
    <div>
      {/* UX_SPEC §5: "around it: the five executives" — a quiet caption, not a bordered/shadowed
          SectionCard, so this reads as part of the same zone as ScoreAnchor above it, not a
          separate boxed section several scrolls down. */}
      <p style={{
        color: muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: 0.4, textAlign: 'center', margin: '0 0 12px',
      }}>
        Your team
      </p>
      <motion.div
        variants={containerVariants}
        initial={reveal ? 'hidden' : false}
        animate="show"
        style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12,
          maxWidth: 800, margin: '0 auto',
        }}
      >
        {cards.map(c => (
          <motion.div key={c.executive.id} variants={cardVariants} style={{ flex: '0 1 260px' }}>
            <ExecutiveCard
              data={c}
              dimmed={leavingId !== null && leavingId !== c.executive.id}
              onEnter={() => setLeavingId(c.executive.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
