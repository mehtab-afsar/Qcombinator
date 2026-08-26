/**
 * Which layer of the Unveiling a founder resumes into, from the state already resolved by the
 * page — never a fresh decision, and never a re-ask of one already saved (UX_SPEC §5).
 *
 * Pure, and in its own module rather than beside the component: importing it from Unveiling.tsx
 * drags the whole reading tree behind it, react-markdown included, which is ESM and not
 * transformed for tests. Same reasoning as scope-progress.ts and unveiling-draft.ts next door.
 */

import type { Contract, Strategy } from '../types/executive.types'

export type UnveilingStep = 1 | 2 | 3 | 4 | 5

export function entryStep(strategy: Strategy | null, contract: Contract | null): UnveilingStep {
  if (contract) return 4 // a drafted mandate implies a committed direction
  if (strategy) return 3
  return 1
}
