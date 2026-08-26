'use client'

/**
 * The ~90-second wait while S002 drafts the mandate (lib/mandate/generate.ts's TIMEOUT_MS is
 * 150s; a real generation measured ~77s). By this layer everything above has unmounted —
 * TheRead renders only at step 1, ProposedDirection only at step 2 — so what sat here before was
 * a 16px spinner and one line of muted text on an otherwise empty page, for a minute and a half.
 * Founder feedback, verbatim: "i just see small loader, i looks ugly".
 *
 * Three changes, none of them a new pattern:
 *  - the accepted direction stays on screen, so the page still has its subject in it;
 *  - the four stages become a forward-only checklist instead of one caption cycling every 2.2s
 *    (~10 full cycles over a real draft, which reads as stuck rather than as working). The visual
 *    language is Thread.tsx's: blue = reached, bdr = not yet;
 *  - the wait is named. A long wait you were told about is patience; the same wait unannounced is
 *    a hang.
 *
 * The stage timings are presentational pacing, NOT real progress — the stream exposes none
 * (composer/mandate.ts asks the model for the document whole, then a JSON tail). Same honest
 * device TheRead already uses for its own silent stretch. The last stage is deliberately reached
 * early enough to hold: a checklist that finishes while the page keeps waiting is worse than one
 * still moving.
 */

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { ink, muted, blue, bdr } from '@/lib/constants/colors'
import { Spinner } from '@/features/shared/components/Spinner'

/** `at` = seconds elapsed when this stage becomes the active one. The last one holds. */
export const STAGES = [
  { at: 0, label: 'Reading your direction' },
  { at: 14, label: 'Weighing your objectives' },
  { at: 34, label: 'Choosing a pathway' },
  { at: 58, label: 'Assigning your team' },
] as const

/**
 * The highest stage whose threshold has passed. Monotonic in `elapsed` by construction — the
 * property that matters, since a checklist that can step backwards is worse than no checklist.
 */
export function activeStageIndex(elapsed: number): number {
  return STAGES.reduce((acc, stage, i) => (elapsed >= stage.at ? i : acc), 0)
}

export function MandateDrafting({ mission }: { mission?: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const activeIdx = activeStageIndex(elapsed)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {mission && (
        <p style={{
          fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 500, color: ink,
          lineHeight: 1.5, margin: 0,
        }}>
          &ldquo;{mission}&rdquo;
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {STAGES.map((stage, i) => {
          const done = i < activeIdx
          const active = i === activeIdx
          return (
            <div key={stage.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 16, height: 16, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {done && <Check size={13} color={blue} strokeWidth={2.5} />}
                {active && <Spinner size="sm" color={blue} />}
                {!done && !active && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', border: `1px solid ${bdr}` }} />
                )}
              </span>
              <span style={{
                fontSize: 14,
                color: done ? muted : active ? ink : bdr,
                transition: 'color 0.4s ease',
              }}>
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: 13, color: muted, margin: 0, lineHeight: 1.7, maxWidth: 460 }}>
        This takes about a minute and a half. It&rsquo;s reasoning through your objectives, the
        pathways open to you and the risk in each &mdash; not filling in a template.
      </p>
    </div>
  )
}
