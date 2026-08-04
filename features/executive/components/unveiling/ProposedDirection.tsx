'use client'

/**
 * Layer 2 — the proposed direction (UX_SPEC_the_frame.md §3.2). A one-line
 * statement the founder reacts to — never a blank box. "Nudge this" is the only
 * way to change it; there is no free-text mission field here or anywhere in the
 * unveiling.
 */

import { ink, blue, bdr, muted, white } from '@/lib/constants/colors'
import { FONT_SERIF } from '@/features/onboarding/theme'

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
        <button
          onClick={onAccept}
          disabled={busy}
          style={{
            background: blue, color: white, border: 'none', borderRadius: 8,
            padding: '10px 20px', fontSize: 14, fontWeight: 500,
            cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Working…' : 'Sounds right'}
        </button>
        <button
          onClick={onNudgeClick}
          disabled={busy}
          style={{
            background: 'none', border: `1px solid ${bdr}`, color: muted, borderRadius: 8,
            padding: '10px 20px', fontSize: 14, cursor: busy ? 'default' : 'pointer',
          }}
        >
          Nudge this
        </button>
      </div>
    </div>
  )
}
