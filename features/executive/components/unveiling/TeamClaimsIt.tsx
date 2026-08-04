'use client'

/**
 * Layer 4 — the team claims it (UX_SPEC_the_frame.md §3.4).
 *
 * Each executive who owns a piece of the mandate steps forward with one line of
 * what they take on — contract.responsibilities joined against /api/executives for
 * real names, exactly what MandateCard's "Who takes this on" list already reads.
 * Deliberately NOT <ExecutiveRoster/> — that's the Command View's fuller card grid
 * (programs, briefings, pending actions); here it's one line each, active only —
 * idle executives are reserved for the Command View, not shown claiming nothing.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ink, muted } from '@/lib/constants/colors'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { ease } from '@/features/shared/tokens'
import type { Contract, ExecutiveSummary } from '../../types/executive.types'

const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.15 } } }
const lineVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
}

export function TeamClaimsIt({ contract }: { contract: Contract }) {
  const [executives, setExecutives] = useState<ExecutiveSummary[]>([])

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const res = await fetch('/api/executives')
        if (res.ok && live) setExecutives((await res.json()).executives ?? [])
      } catch {
        /* Falls back to the raw Registry id below — still true, just less readable. */
      }
    })()
    return () => { live = false }
  }, [])

  const nameById = new Map(executives.map(e => [e.id, e.name]))

  if (contract.responsibilities.length === 0) return null

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      {contract.responsibilities.map((r, i) => (
        <motion.p key={i} variants={lineVariants} style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: ink }}>
          <span style={{ fontFamily: FONT_SERIF, fontWeight: 500 }}>{nameById.get(r.executive) ?? r.executive}</span>
          <span style={{ color: muted }}> takes on </span>
          {r.mandate}
        </motion.p>
      ))}
    </motion.div>
  )
}
