'use client'

/**
 * The 5 Executives, always all of them, fixed Registry order — the roster that answers
 * "where did Patel go?" (nowhere — see ExecutiveCard's docstring).
 *
 * Executives and pending actions come from the shared ExecutiveWorkspaceProvider; this still
 * self-fetches /api/briefings (no shared home for that yet) and does the client-side JOIN by id
 * to build each card's view model. This is data composition for display, not executive reasoning
 * (CLAUDE.md §2) — the same class of work BriefingsPanel's bodySummary()/changedAssets() already
 * does; no decision gets made here, only "which already-fetched facts belong on which card."
 *
 * `programs` comes from the page as a prop (same data MandateCard already receives) rather than
 * a second /api/contracts fetch.
 *
 * PRD 2 Stage 3 — this now owns composing the centre WITH the team, not just the cards.
 * CommandView's own docstring already called ScoreAnchor + this roster "one zone, grouped
 * tightly" — that was true in spirit but false in layout: it was still a vertical stack (dial,
 * then a grid below it), the exact "plain vertical stack" CommandView's docstring already
 * confesses an earlier version was guilty of. On a wide viewport this renders a genuine radial
 * arrangement (CANVAS_SPEC D2 — "score centre, agents around it") via the pure
 * `orbitPosition` helper; below the breakpoint (`useIsWide`) it falls back to exactly the same
 * flex-wrap grid this file has always rendered — a literal ring is illegible on a phone, not a
 * cut corner. `ExecutiveCard`'s own click choreography (scale, sibling-dimming, the deliberate
 * non-`layoutId` transition — see its docstring) is untouched either way; only WHERE each card
 * sits changes, never what it is.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ExecutiveCard, type ExecutiveCardData } from './ExecutiveCard'
import { ScoreAnchor } from './ScoreAnchor'
import { orbitPosition } from '../lib/orbit-layout'
import { useExecutiveWorkspace } from '../hooks/useExecutiveWorkspace'
import { useIsWide } from '@/features/shared/hooks/useIsWide'
import { ease } from '@/features/shared/tokens'
import { muted } from '@/lib/constants/colors'
import type { ProgramInstance } from '../types/executive.types'

interface Briefing { id: string; programId: string | null; executiveId: string | null; verdict: string; createdAt: string }

/** Staggered entrance for the one-time "your team assembles" reveal (CommandView). */
const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } }
const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease } },
}

// Ring geometry (wide viewport only) — clears ScoreAnchor's 176px dial plus a card's own
// footprint, with real breathing room between the score and the team (founder feedback: the
// first pass read as cramped, not spread out). Approximate by design (card height varies with
// whether a briefing verdict is present); tuned by eye, not derived from a measured layout.
const RING_RADIUS = 300
const RING_CARD_WIDTH = 240
const RING_CARD_HALF_HEIGHT = 90
const CENTRE_HALF_WIDTH = 100
const CENTRE_HALF_HEIGHT = 120

/**
 * @param reveal play the staggered assembly entrance once (CommandView's first-landing
 *   reveal). Omitted/false renders in its final state immediately — every subsequent
 *   visit, and every other place this roster is used (e.g. a draft that isn't
 *   confirmed yet doesn't render this at all).
 */
export function ExecutiveRoster({ programs, reveal = false }: { programs: ProgramInstance[]; reveal?: boolean }) {
  const { executives, loaded, actions: { pending } } = useExecutiveWorkspace()
  const [briefings, setBriefings] = useState<Briefing[]>([])
  // Phase 1 of the cockpit build — which card (if any) the founder just clicked into, so its
  // siblings can dim while it leads the transition (ExecutiveCard's own entrance animation).
  const [leavingId, setLeavingId] = useState<string | null>(null)
  const wide = useIsWide()

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const res = await fetch('/api/briefings')
        if (res.ok && live) setBriefings((await res.json()).latest ?? [])
      } catch {
        /* fail quiet — this is a secondary surface on a page that already shows the mandate */
      }
    })()
    return () => { live = false }
  }, [])

  // Same ring-stage container as the final layout, so nothing visibly jumps once the cards
  // arrive — before this, loading rendered a bare, unpositioned ScoreAnchor and then swapped to
  // the full ring a beat later, which read as "two different dashboards" (direct founder
  // feedback), not one screen finishing its load. ScoreAnchor sits at the exact same centre
  // point throughout; only the cards fading in around it is new.
  const stageHeight = (RING_RADIUS + RING_CARD_HALF_HEIGHT) * 2

  // ScoreAnchor renders regardless of the roster's own load state — it used to be rendered
  // unconditionally by CommandView, a step above this component; owning it here must not make
  // it disappear while executives are loading or if the fetch comes back empty.
  if (!loaded || executives.length === 0) {
    if (!wide) return <ScoreAnchor />
    return (
      <div style={{ position: 'relative', height: stageHeight, maxWidth: 1040, margin: '0 auto' }}>
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          marginLeft: -CENTRE_HALF_WIDTH, marginTop: -CENTRE_HALF_HEIGHT,
        }}>
          <ScoreAnchor />
        </div>
      </div>
    )
  }

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

  function renderCard(c: ExecutiveCardData) {
    return (
      <ExecutiveCard
        data={c}
        dimmed={leavingId !== null && leavingId !== c.executive.id}
        onEnter={() => setLeavingId(c.executive.id)}
      />
    )
  }

  if (wide) {
    // PRD 2 Stage 3 — "score centre, agents around it" (CANVAS_SPEC D2), for real this time.
    // Each card gets a static, absolutely-positioned wrapper (the ring geometry, via
    // orbitPosition) around an inner motion.div (the entrance animation) — kept as two nested
    // elements so framer-motion's own transform management never has to share the same style
    // property as the ring's plain left/top positioning.
    return (
      <motion.div
        variants={containerVariants}
        initial={reveal ? 'hidden' : false}
        animate="show"
        style={{ position: 'relative', height: stageHeight, maxWidth: 1040, margin: '0 auto' }}
      >
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          marginLeft: -CENTRE_HALF_WIDTH, marginTop: -CENTRE_HALF_HEIGHT,
        }}>
          <ScoreAnchor />
        </div>
        {cards.map((c, i) => {
          const { x, y } = orbitPosition(i, cards.length, RING_RADIUS)
          return (
            <div
              key={c.executive.id}
              style={{
                position: 'absolute', left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`,
                width: RING_CARD_WIDTH, marginLeft: -RING_CARD_WIDTH / 2, marginTop: -RING_CARD_HALF_HEIGHT,
              }}
            >
              <motion.div variants={cardVariants}>{renderCard(c)}</motion.div>
            </div>
          )
        })}
      </motion.div>
    )
  }

  // Narrow viewport — unchanged from before this component owned ScoreAnchor: the dial above,
  // the same 4px-gapped "one zone" spacing CommandView used to apply from the outside, then the
  // caption + flex-wrap grid exactly as they always rendered.
  return (
    <div>
      <ScoreAnchor />
      <div style={{ marginTop: 4 }}>
        {/* UX_SPEC §5: "around it: the five executives" — a quiet caption, not a bordered/shadowed
            SectionCard, so this reads as part of the same zone as ScoreAnchor above it, not a
            separate boxed section several scrolls down. Ring mode skips this label — the
            arrangement itself already reads as "the team around the score." */}
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
              {renderCard(c)}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
