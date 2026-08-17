'use client'

/**
 * Sub-navigation state for one executive's own Programs — Overview, then one tab per Program.
 * Extracted from page.tsx once it grew past CLAUDE.md's ~300-line ceiling; this is derived state
 * plus one URL-writing callback, no rendering, so a hook is the natural split (not a component).
 *
 * `?program=` is the same linkable/refresh-safe URL-param pattern this page's own `?asset=`
 * already uses, and the same idea app/founder/settings/page.tsx applies with `?tab=`.
 *
 * Defaults to Overview when there's more than one Program; defaults to the single Program
 * directly when there's exactly one, so a single-Program executive's page behaves exactly as it
 * did before Programs got sub-navigation at all — no tab bar, no Overview grid, just that
 * Program's panels.
 */

import { useCallback } from 'react'
import { useRouter, type ReadonlyURLSearchParams } from 'next/navigation'
import { OVERVIEW_TAB } from '../components/ProgramTabBar'
import type { ProgramInstance } from '../types/executive.types'

export function useProgramTabs(programs: ProgramInstance[], searchParams: ReadonlyURLSearchParams) {
  const router = useRouter()

  const activeProgramId = searchParams.get('program')
    ?? (programs.length > 1 ? OVERVIEW_TAB : (programs[0]?.id ?? OVERVIEW_TAB))

  const selectProgram = useCallback((id: string) => {
    router.push(`?program=${encodeURIComponent(id)}`, { scroll: false })
  }, [router])

  const activeProgram = programs.find(p => p.id === activeProgramId) ?? programs[0] ?? null
  const showOverviewGrid = programs.length > 1 && activeProgramId === OVERVIEW_TAB
  // Only narrow the panels below when there's genuinely more than one Program to narrow between
  // — a single-Program executive's panels stay exactly as unscoped as they've always been.
  const panelProgramTemplateId = programs.length > 1 ? activeProgram?.templateId : undefined

  return { activeProgramId, selectProgram, activeProgram, showOverviewGrid, panelProgramTemplateId }
}
