'use client'

import { surf, bdr, ink, muted } from '@/lib/constants/colors'

/**
 * Executive Briefings — the founder-facing output of each cycle.
 *
 * ⚠️ A HONEST PLACEHOLDER. Briefings are F12 and the Operating Rhythm that
 * produces them is F10 — both Story 2. Neither exists.
 *
 * F09's edge case says: no Briefing yet → "first cycle runs [date]". **No date is
 * shown**, deliberately. There is no rhythm, so there is no next cycle, and any
 * date printed here would be a lie the product tells a founder on the first screen
 * they ever see. Saying "not yet" is worth more than a plausible fiction.
 */
export function BriefingsPanel() {
  return (
    <div style={{
      background: surf, border: `1px dashed ${bdr}`, borderRadius: 12, padding: 24, marginTop: 20,
    }}>
      <h2 style={{ color: ink, fontSize: 17, fontWeight: 600, margin: 0 }}>Briefings</h2>
      <p style={{ color: muted, fontSize: 14, marginTop: 8, lineHeight: 1.6, maxWidth: 560 }}>
        Once your executive team starts running, each cycle produces a short briefing here —
        what changed, what it concluded, and where your attention is needed.
        Nothing has run yet.
      </p>
    </div>
  )
}
