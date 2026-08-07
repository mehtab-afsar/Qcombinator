/**
 * CANVAS_SPEC §4.6's chat rail — the deterministic guard for "initiate," the only branch with a
 * real side effect (triggering a rhythm run). A probabilistic classifier deciding whether to fire
 * a side effect is an unnecessary risk when a phrase match costs nothing and is auditable — see
 * the plan's own reasoning. Everything that doesn't match falls through to the LLM query/decline
 * path, which never has a side effect to begin with.
 *
 * Pure, no IO — directly unit-tested against a phrase table.
 */

const INITIATE_PATTERNS = [
  /\brun (the )?cycle\b/i,
  /\brun (this|it) now\b/i,
  /\bstart (the )?cycle\b/i,
  /\brun now\b/i,
]

export function matchesInitiateIntent(message: string): boolean {
  return INITIATE_PATTERNS.some(p => p.test(message))
}
