'use client'

/**
 * Sub-navigation between an executive's own Programs — Overview, then one tab per Program.
 *
 * Only rendered when an executive owns more than one Program (page.tsx's own call). Every other
 * executive today (0 or 1 Program) sees no UI change at all — this is what makes the design
 * generic rather than Growth-specific: the day a second Product/Ops/Finance Program is seeded,
 * this tab bar appears for that executive automatically, with zero new code.
 *
 * Wraps the app's one shared tab primitive, `TabNav` (its own docstring: "not a second tab
 * primitive" — CLAUDE.md "one of each"). Client-side state synced to a `?program=` URL param,
 * the same pattern `app/founder/settings/page.tsx` already uses for its own tabs, and the same
 * idea this page's own `?asset=` param already applies one level up (page.tsx's own comment:
 * "linkable/refresh-safe... preserve the sense of place").
 *
 * Reads Program names via programLabel.ts, straight from `@/lib/registry` — safe client-side
 * (pure config, no I/O, no server-only marker) — rather than adding a `name` field to
 * /api/contracts's response just for this.
 */

import { TabNav } from '@/features/shared/components/TabNav'
import { programName } from '../lib/programLabel'
import type { ProgramInstance } from '../types/executive.types'

export const OVERVIEW_TAB = 'overview'

interface ProgramTabBarProps {
  programs: ProgramInstance[]
  activeProgramId: string
  onChange: (id: string) => void
}

export function ProgramTabBar({ programs, activeProgramId, onChange }: ProgramTabBarProps) {
  if (programs.length <= 1) return null

  const tabs = [
    { id: OVERVIEW_TAB, label: 'Overview' },
    ...programs.map(p => ({ id: p.id, label: programName(p.templateId) ?? p.templateId })),
  ]

  return <TabNav tabs={tabs} active={activeProgramId} onChange={onChange} style={{ marginBottom: 16 }} />
}
