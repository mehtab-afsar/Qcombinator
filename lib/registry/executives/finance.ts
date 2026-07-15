import type { Executive } from '../types'

/**
 * Finance (CFO).
 *
 * Workbook Executive Registry: `A006 | Chief Financial Officer, CFO | Finance |
 * S006`. PRD §7.1 roster: owns P023–P029, folds in `felix` and `leo`.
 *
 * `programs: []` — P023–P029 have asset names only, no ids, and no actions at all
 * in the workbook. Not seedable without inventing data.
 */
export const FINANCE: Executive = {
  id: 'finance',
  name: 'Chief Financial Officer',
  motto: 'I keep the company alive and fundable.',
  domains: ['Finance'],
  programs: [],
  systemPromptRef: 'S006',
  inheritsFrom: ['felix', 'leo'],
}
