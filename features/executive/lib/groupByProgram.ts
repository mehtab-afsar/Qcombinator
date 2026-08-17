/**
 * Group any executive-scoped item (an Asset, an Action, a Briefing) by the Registry Program that
 * owns it, so a page with multiple Programs can show "GTM's things" separately from "Pricing's
 * things" instead of one flat pile.
 *
 * One small shared helper rather than each panel writing its own filter/reduce (CLAUDE.md §2 —
 * frontend stays thin, no invented logic per panel). Every API route this reads from
 * (/api/assets, /api/actions, /api/briefings) resolves the same field name, `programTemplateId`
 * — a Registry Program id like 'P001', already joined server-side from whatever DB-row id the
 * underlying table actually stores.
 */

export interface GroupableByProgram {
  programTemplateId: string | null
}

/** Items whose Program is unknown/unresolvable are bucketed here, never silently dropped. */
export const UNASSIGNED_PROGRAM = 'unassigned'

export function groupByProgram<T extends GroupableByProgram>(
  items: readonly T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = item.programTemplateId ?? UNASSIGNED_PROGRAM
    const bucket = groups.get(key)
    if (bucket) bucket.push(item)
    else groups.set(key, [item])
  }
  return groups
}

/** Convenience for a single Program's items — the common case in a Program-scoped panel. */
export function itemsForProgram<T extends GroupableByProgram>(
  items: readonly T[],
  programTemplateId: string,
): T[] {
  return items.filter(item => item.programTemplateId === programTemplateId)
}
