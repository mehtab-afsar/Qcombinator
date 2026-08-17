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
   * P001–P008 are all seeded — PRD §7.1's full Growth roster, complete.
   *
   * P002 through P008 were each added exactly the way F05 claims: write the
   * Program's file, add its id here, done — no route, no migration, no engine
   * change. __tests__/registry.test.ts's fixture proved this shape before this
   * file changed. P007 and P008 are the two whose Program Prompt had to be
   * authored rather than ported (see lib/prompts/executives/growth/programs/
   * p007.ts and p008.ts) — that only changed where the prompt's words came
   * from, not this procedure.
   */
  programs: ['P001', 'P002', 'P003', 'P004', 'P005', 'P006', 'P007', 'P008'],

  /** Layer 1 of the Composer — the Executive System Prompt (ADR-012). */
  systemPromptRef: 'S003',

  inheritsFrom: ['patel', 'susi', 'maya', 'atlas', 'riley', 'carter'],
}
