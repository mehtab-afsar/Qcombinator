'use client'

/**
 * Layer 1 — the read (UX_SPEC_the_frame.md §3.1). Morgan states what the Q-Score
 * shows. Not a question. Streamed live — `text` grows as tokens arrive from
 * useStreamedProposal; purely presentational, no fetching of its own.
 */

import { FONT_SERIF } from '@/features/onboarding/theme'
import { ink, muted } from '@/lib/constants/colors'

export function TheRead({ text, streaming }: { text: string; streaming: boolean }) {
  if (!text && !streaming) return null
  return (
    <p style={{ fontFamily: FONT_SERIF, fontSize: 18, lineHeight: 1.75, color: ink, margin: 0 }}>
      {text}
      {streaming && <span style={{ color: muted }}>▍</span>}
    </p>
  )
}
