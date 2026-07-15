import type { Executive } from '../types'

/**
 * Operations (COO).
 *
 * Workbook Executive Registry: `A005 | Chief Operations Officer, COO |
 * Operations | S005`. PRD §7.1 roster: owns P009–P014, folds in `harper`.
 *
 * `programs: []` — P009–P014 are the closest to seedable of the non-Growth
 * Programs (the Asset Registry does give them AS019–AS042), but the workbook's
 * two sheets disagree about which Assets exist: the Program Registry lists P009's
 * assets as "Founder Dashboard, Monthly Review Report, KPI Dashboard, Q-Score
 * Trend, Executive Summary" while the Asset Registry defines only three of those
 * with ids. Seeding on top of that contradiction would bake it in. Resolve the
 * workbook first, then seed.
 */
export const OPERATIONS: Executive = {
  id: 'operations',
  name: 'Chief Operations Officer',
  motto: 'I make the company run.',
  domains: ['Operations'],
  programs: [],
  systemPromptRef: 'S005',
  inheritsFrom: ['harper'],
}
