'use client'

/**
 * One Executive, as a visible entity — the centerpiece of the Command View redesign.
 *
 * ⚠️ WHY THIS EXISTS. Patel (the Growth Executive) was never deleted — he's fully present in the
 * Registry (`lib/registry/executives/growth/executive.ts`, name "Patel (Chief Growth Officer)") — but
 * nothing in the UI ever showed any of the 5 executives' names anywhere. The whole Command View
 * read as one undifferentiated mandate box because the people running it were invisible. This
 * card is where they reappear.
 *
 * Deliberately NOT a chat entry point. The old product's Patel was someone you talked to; this
 * Patel is someone whose work you read. Clicking through goes to a status page
 * (`/founder/executive/[executiveId]`), never a conversation.
 *
 * Two honest states, same shape: active (a Program is running) and idle (none is, today true for
 * 4 of 5 executives). Idle is shown quieter, never hidden and never faked busy.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { ink, muted, bdr, bg, alpha, amber } from '@/lib/constants/colors'
import { radius } from '@/features/shared/tokens'
import { Badge } from '@/features/shared/components/Badge'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { EXECUTIVE_DOODLE } from '../lib/executive-doodle'
import type { ExecutiveSummary } from '../types/executive.types'

// Phase 1 of the cockpit build (CANVAS_SPEC §9 step 2) — "spatial and delightful" without a
// true cross-route shared-element morph (see the plan: no prior layoutId usage in this repo,
// so a self-contained choreography on each side of the navigation is the lower-risk read of
// D2's "pan/zoom feel"). Long enough to register, short enough not to feel like a delay.
const ENTER_MS = 180

export interface ExecutiveCardData {
  executive: ExecutiveSummary
  /** The active Program this executive owns in the current mandate, or null — genuinely idle. */
  programName: string | null
  latestBriefingVerdict: string | null
  pendingActionCount: number
}

export function ExecutiveCard({
  data, dimmed = false, onEnter,
}: {
  data: ExecutiveCardData
  /** true while a SIBLING card is mid-entrance — dims this one so the clicked card reads as
   *  the thing the founder is actually moving toward (ExecutiveRoster's `leavingId`). */
  dimmed?: boolean
  /** Fired the instant this card is clicked, before navigation — lets the roster dim siblings. */
  onEnter?: () => void
}) {
  const router = useRouter()
  const [entering, setEntering] = useState(false)
  const { executive, programName, latestBriefingVerdict, pendingActionCount } = data
  const active = programName !== null
  const needsFounder = pendingActionCount > 0
  const Doodle = EXECUTIVE_DOODLE[executive.id]
  const href = `/founder/executive/${executive.id}`
  const baseOpacity = active ? 1 : 0.72 // idle: quieter, never hidden

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // New-tab/copy-link/middle-click keep normal <a> behavior — only a plain primary click
    // gets the choreographed entrance before the route actually changes.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    setEntering(true)
    onEnter?.()
    setTimeout(() => router.push(href), ENTER_MS)
  }

  return (
    <motion.a
      href={href}
      onClick={handleClick}
      initial={false}
      animate={{
        opacity: entering ? 1 : dimmed ? baseOpacity * 0.4 : baseOpacity,
        scale: entering ? 1.03 : 1,
      }}
      // A restrained two-layer elevation (tight contact shadow + soft ambient spread) — the
      // same rgba(0,0,0,…) convention AssetWorkspacePanel.tsx already uses for its own shadow,
      // not a new shadow language. Deepens slightly on hover so the ring itself reads as
      // interactive, not just each card individually.
      whileHover={{ boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 10px 24px rgba(0,0,0,0.08)' }}
      transition={{ duration: ENTER_MS / 1000, ease: 'easeOut' }}
      style={{
        display: 'block', textDecoration: 'none',
        background: bg,
        border: `1px solid ${needsFounder ? amber : active ? ink : bdr}`,
        borderRadius: radius.lg,
        padding: '20px 22px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 6px 16px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {Doodle && (
            <div style={{ width: 32, height: 32, flexShrink: 0 }}>
              <Doodle color={ink} />
            </div>
          )}
          <h3 style={{
            fontFamily: FONT_SERIF, fontSize: 17, fontWeight: 500, letterSpacing: '-0.01em',
            color: ink, margin: 0,
          }}>
            {executive.name}
          </h3>
        </div>
        {needsFounder && (
          <Badge variant="amber">
            {pendingActionCount === 1 ? 'Needs you' : `Needs you · ${pendingActionCount}`}
          </Badge>
        )}
      </div>

      <p style={{ color: muted, fontSize: 13, fontStyle: 'italic', margin: '4px 0 0' }}>
        &ldquo;{executive.motto}&rdquo;
      </p>

      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${alpha(bdr, 0.8)}` }}>
        {active ? (
          <>
            <p style={{ color: ink, fontSize: 13, fontWeight: 600, margin: 0 }}>{programName}</p>
            {latestBriefingVerdict && (
              <p style={{
                color: muted, fontSize: 13, margin: '4px 0 0', lineHeight: 1.5,
                overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {latestBriefingVerdict}
              </p>
            )}
          </>
        ) : (
          <p style={{ color: muted, fontSize: 13, margin: 0 }}>No active program yet</p>
        )}
      </div>

      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 14,
        color: muted, fontSize: 12, fontWeight: 500,
      }}>
        View <ArrowRight size={11} />
      </span>
    </motion.a>
  )
}
