import type { Executive } from '../types'

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
   * Only P001 is seeded, so only P001 is listed — and that is the honest choice.
   *
   * PRD §7.1 has Growth owning P001–P008, and the workbook defines all eight. But
   * `validateRegistry()` fails at load on any Program id that does not resolve, so
   * listing P002–P008 here would either break the build or force us to seed seven
   * Programs nobody needs until Story 2+ (CLAUDE.md §7: no speculative work).
   *
   * Adding P002 later is: write `p002-brand.ts`, add its id here. No route, no
   * migration, no engine change. That is the claim F05 exists to make good on,
   * and __tests__/registry.test.ts proves it with a fixture.
   */
  programs: ['P001'],

  /** Layer 1 of the Composer — the Executive System Prompt (ADR-012). */
  systemPromptRef: 'S003',

  inheritsFrom: ['patel', 'susi', 'maya', 'atlas', 'riley', 'carter'],
}
