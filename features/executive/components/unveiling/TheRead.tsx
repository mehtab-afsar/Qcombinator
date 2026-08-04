'use client'

/**
 * Layer 1 — the read (UX_SPEC_the_frame.md §3.1). Morgan states what the Q-Score
 * shows. Not a question. Streamed live — `text` grows as tokens arrive from
 * useStreamedProposal; purely presentational, no fetching of its own.
 */

import { FONT_SERIF } from '@/features/onboarding/theme'
import { ink, muted } from '@/lib/constants/colors'
import { Spinner } from '@/features/shared/components/Spinner'

export function TheRead({
  text, streaming, readDone,
}: {
  text: string
  streaming: boolean
  /** True once the read paragraph is fully typed but the connection is still open,
   *  silently generating the six-step document behind it — without this the founder
   *  has nothing to distinguish "still typing" from a frozen page. */
  readDone: boolean
}) {
  if (!text && !streaming) return null
  return (
    <>
      <p style={{ fontFamily: FONT_SERIF, fontSize: 18, lineHeight: 1.75, color: ink, margin: 0 }}>
        {text}
        {streaming && !readDone && <span style={{ color: muted }}>▍</span>}
      </p>
      {streaming && readDone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <Spinner size="sm" color={muted} />
          <span style={{ color: muted, fontSize: 14 }}>Working through your mandate…</span>
        </div>
      )}
    </>
  )
}
