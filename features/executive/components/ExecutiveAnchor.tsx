'use client'

/**
 * CANVAS_SPEC §4.1 — the cockpit's Anchor: identity + status, at a glance.
 * "Patel · Chief Growth Officer · owns your market & GTM score · running P001."
 *
 * No Q-Score number/dimension here on purpose — see ExecutiveRead.tsx's own docstring: the
 * codebase has no single canonical executive→dimension mapping yet, and a status line is not
 * the place to invent one. `ExecutiveRead` (already on this page) carries the overall score;
 * this carries who they are and what they're doing right now, both facts the Registry already
 * knows for certain.
 *
 * Generic over `executive`/`program` (CANVAS_SPEC §6) — zero Patel-specific branching, so this
 * renders correctly for all 5 executives from the same component.
 */

import { ink, muted } from '@/lib/constants/colors'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { EXECUTIVE_DOODLE } from '../lib/executive-doodle'
import type { ExecutiveSummary, ProgramInstance } from '../types/executive.types'

export function ExecutiveAnchor({
  executive, program,
}: {
  executive: ExecutiveSummary
  /** The active Program this executive owns in the current mandate, or null — genuinely idle. */
  program: ProgramInstance | null
}) {
  const Doodle = EXECUTIVE_DOODLE[executive.id]
  const domains = executive.domains.join(' & ')
  const status = program ? `running ${program.objective}` : 'no active program yet'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {Doodle && (
        <div style={{ width: 48, height: 48, flexShrink: 0 }}>
          <Doodle color={ink} />
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <h2 style={{
          fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em',
          color: ink, margin: 0,
        }}>
          {executive.name}
        </h2>
        <p style={{ color: muted, fontSize: 14, margin: '4px 0 0' }}>
          {domains ? `${domains} · ` : ''}{status}
        </p>
      </div>
    </div>
  )
}
