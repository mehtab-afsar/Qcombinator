'use client'

/**
 * Layer 5 — one heavy confirm (UX_SPEC_the_frame.md §3.5 / §4).
 *
 * THE one confirmation in this product (ADR-002) — said plainly, because the
 * founder is handing over autonomy and should know it. Calls the existing
 * POST /api/contracts {action:'confirm'} — no new backend. "Refine" re-drafts
 * (idempotent-safe, same createDraft retire-and-reinsert logic); "revise direction"
 * steps back to the nudge exchange rather than a separate page (no screen-jumps).
 */

import { ink, muted, bdr, blue, white } from '@/lib/constants/colors'

export function OneConfirm({
  busy, onConfirm, onRefine, onRevise,
}: {
  busy: boolean
  onConfirm: () => void
  onRefine: () => void
  onRevise: () => void
}) {
  return (
    <div>
      <p style={{ color: muted, fontSize: 14, lineHeight: 1.6, maxWidth: 560, margin: '0 0 16px' }}>
        {/* THE one confirmation in this product (ADR-002). */}
        Confirming this puts your team to work. They&rsquo;ll run to it without asking
        again — you change direction by coming back here, which starts a new mandate,
        never an edit.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <button
          onClick={onConfirm}
          disabled={busy}
          style={{
            background: blue, color: white, border: 'none', borderRadius: 8,
            padding: '11px 22px', fontSize: 15, fontWeight: 500,
            cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Confirming…' : 'Confirm mandate'}
        </button>
        <button
          onClick={onRefine}
          disabled={busy}
          style={{
            background: 'none', color: ink, border: `1px solid ${bdr}`, borderRadius: 8,
            padding: '11px 22px', fontSize: 15, cursor: busy ? 'default' : 'pointer',
          }}
        >
          Refine
        </button>
        <button
          onClick={onRevise}
          disabled={busy}
          style={{
            background: 'none', border: 'none', color: muted, fontSize: 13,
            textDecoration: 'underline', cursor: busy ? 'default' : 'pointer', padding: 0,
          }}
        >
          Revise direction
        </button>
      </div>
    </div>
  )
}
