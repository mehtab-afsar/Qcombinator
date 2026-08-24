/**
 * A Program's founder-facing display name, by Registry id (e.g. 'P001' -> 'Go-to-Market
 * Strategy'). One shared lookup rather than each multi-Program component (tab bar, overview
 * grid, briefings) redeclaring the same try/catch around getProgram (CLAUDE.md §2 — no
 * duplicated logic).
 */

import { getProgram } from '@/lib/registry'

export function programName(programTemplateId: string | null | undefined): string | null {
  if (!programTemplateId) return null
  // A Program row whose templateId the Registry no longer knows must not crash the caller —
  // same defensive fallback app/api/assets/route.ts already uses for the same reason.
  try { return getProgram(programTemplateId).name } catch { return programTemplateId }
}

/** A Program's one-line objective, by Registry id — same defensive fallback as programName. */
export function programObjective(programTemplateId: string): string | null {
  try { return getProgram(programTemplateId).objective } catch { return null }
}
