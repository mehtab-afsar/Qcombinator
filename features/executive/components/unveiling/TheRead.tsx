'use client'

/**
 * Layer 1 — the read (UX_SPEC_the_frame.md §3.1). Morgan states what the Q-Score
 * shows. Not a question. Streamed live — `text` grows as tokens arrive from
 * useStreamedProposal; purely presentational, no fetching of its own.
 */

import { useEffect, useState } from 'react'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { ink, muted } from '@/lib/constants/colors'
import { Spinner } from '@/features/shared/components/Spinner'

// The six steps the model is actually writing behind the spinner, in order —
// see lib/prompts/executives/ceo/s001.ts's Step 1-6 headings. A silent 60-90s
// wait behind a generic "Working through your mandate…" reads as frozen; naming
// what's actually happening (even without real per-step progress signal, which
// the stream doesn't expose) gives the founder something to track.
const MANDATE_STEPS = [
  'Reading your company situation…',
  'Reviewing constraints…',
  'Setting strategic priorities…',
  'Weighing strategic pathways…',
  'Modelling scenarios…',
  'Shaping the recommendation…',
]

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
  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    if (!(streaming && readDone)) { setStepIdx(0); return }
    const timer = setInterval(() => setStepIdx(i => (i + 1) % MANDATE_STEPS.length), 8000)
    return () => clearInterval(timer)
  }, [streaming, readDone])

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
          <span style={{ color: muted, fontSize: 14 }}>{MANDATE_STEPS[stepIdx]}</span>
        </div>
      )}
    </>
  )
}
