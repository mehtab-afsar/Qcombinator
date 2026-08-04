'use client'

/**
 * Layer 2 — the proposed direction (UX_SPEC_the_frame.md §3.2). A one-line
 * statement the founder reacts to — never a blank box. "Nudge this" is the only
 * way to change it; there is no free-text mission field here or anywhere in the
 * unveiling.
 */

import { ink } from '@/lib/constants/colors'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { Button } from '@/features/shared/components/Button'

export function ProposedDirection({
  mission, onAccept, onNudgeClick, busy,
}: {
  mission: string
  onAccept: () => void
  onNudgeClick: () => void
  busy: boolean
}) {
  return (
    <div>
      <p style={{
        fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 500, color: ink,
        lineHeight: 1.5, margin: '0 0 18px',
      }}>
        “{mission}”
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Button variant="primary" loading={busy} onClick={onAccept}>
          Sounds right
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onNudgeClick}>
          Nudge this
        </Button>
      </div>
    </div>
  )
}
