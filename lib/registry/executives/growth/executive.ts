import type { Executive } from '../../types'

/**
 * Growth — the first executive proven end to end (PRD §7.1 roster).
 *
 * Workbook Executive Registry: `A003 | Patel (Chief Growth Officer) CGO |
 * Growth | Marketing & Sales | S003`. Motto from the Program Registry header:
 * "I exist to create growth."
 *
 * `inheritsFrom` folds the old personas in as specialists, called through the
 * existing `lib/agents/delegation.ts` (PRD §7.1). Those files stay frozen — this
 * records the mapping, it does not touch them.
 */
export const GROWTH: Executive = {
  id: 'growth',
  name: 'Patel (Chief Growth Officer)',
  motto: 'I exist to create growth.',
  domains: ['Marketing & Sales'],

  /**
   * P001, P002, P003, P005, P006, P008 are seeded — PRD §7.1's full Growth
   * roster, minus P007 and P004 (both merged elsewhere — see below).
   *
   * P002 through P008 were each added exactly the way F05 claims: write the
   * Program's file, add its id here, done — no route, no migration, no engine
   * change. __tests__/registry.test.ts's fixture proved this shape before this
   * file changed. P008 is the one whose Program Prompt had to be authored
   * rather than ported (see lib/prompts/executives/growth/programs/p008.ts) —
   * that only changed where the prompt's words came from, not this procedure.
   *
   * P007 — Pricing & Packaging — was merged INTO P001 (Phase 10 Part 3,
   * program consolidation): pricing decisions are inseparable from
   * go-to-market strategy, and running them as two separate Programs under
   * the same Executive added a seam with no real boundary behind it. P001's
   * own id, handle and Program Prompt ref are unchanged; P001 now also
   * generates the four ex-P007 Actions and maintains AS017.
   *
   * P004 — Sales Enablement — was merged INTO P005 (Phase 10 Part 3, same
   * consolidation): P005 is the more developed "AI SDR" Program (a real
   * nine-action pipeline), so it was kept as the surviving id/handle rather
   * than P004's four generic actions. P005's own id, handle and Program
   * Prompt ref are unchanged; P005 now also generates the four ex-P004
   * Actions and maintains AS013/AS014.
   *
   * Neither `P007` nor `P004` exists anywhere in this Registry anymore — do
   * not resurrect either as a standalone Program.
   */
  programs: ['P001', 'P002', 'P003', 'P005', 'P006', 'P008'],

  /** Layer 1 of the Composer — the Executive System Prompt (ADR-012). */
  systemPromptRef: 'S003',

  inheritsFrom: ['patel', 'susi', 'maya', 'atlas', 'riley', 'carter'],
}
