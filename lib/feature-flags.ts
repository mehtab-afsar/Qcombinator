/**
 * Feature Flags
 *
 * All flags use NEXT_PUBLIC_FF_<NAME> env vars.
 * Defaults match the PRD section 7 table.
 *
 * Server-safe: reads from process.env.
 * Client-safe: only NEXT_PUBLIC_ prefixed vars are exposed.
 */

function flag(name: string, defaultValue: boolean): boolean {
  const val = process.env[`NEXT_PUBLIC_FF_${name}`]
  if (val === undefined) return defaultValue
  return val === 'true' || val === '1'
}

/** 5.1 — SSE streaming for agent chat */
export const FF_STREAMING_CHAT = flag('STREAMING_CHAT', true)

/** 5.2 — task-complexity model selection */
export const FF_MODEL_ROUTING = flag('MODEL_ROUTING', true)

/** 5.3 — cross-agent sub-call delegation */
export const FF_CROSS_AGENT_ORCHESTRATION = flag('CROSS_AGENT_ORCHESTRATION', true)

/** 5.4 — 2-pass artifact quality self-critique */
export const FF_ARTIFACT_SELF_CRITIQUE = flag('ARTIFACT_SELF_CRITIQUE', true)

/** 5.5 — Q-Score unlock recommender */
export const FF_AI_SCORE_INTELLIGENCE = flag('AI_SCORE_INTELLIGENCE', true)

/** 5.6 — AI investor match rationale */
export const FF_AI_INVESTOR_MATCHING = flag('AI_INVESTOR_MATCHING', true)

/** 5.7 — fire-and-poll async artifact generation */
export const FF_ASYNC_ARTIFACT_GENERATION = flag('ASYNC_ARTIFACT_GENERATION', true)

/** 5.8 — context token budget compression */
export const FF_AGENT_CONTEXT_COMPRESSION = flag('AGENT_CONTEXT_COMPRESSION', true)

/** 5.9 — coordinator/worker typed task graph + mid-loop delegate_to_agent */
export const FF_COORDINATOR_WORKFLOW = flag('COORDINATOR_WORKFLOW', true)

/**
 * The Executive model — Registry / Composer / Mandate / Rhythm / Asset-versioning / Connectors.
 *
 * Default ON. This flag's original job (ADR-014: keep the old agent model running unaffected
 * while the new one was built alongside it, off by default) ended the moment the old model was
 * actually deleted (ADR-034, 4 Aug 2026) — there is no longer an alternative to protect, and this
 * is now the only founder-facing product in the repo. Requiring an env var to turn on the only
 * thing that exists was leftover migration caution, not a real safety property.
 *
 * The one place this still matters: app/api/cron/rhythm checks it as a second, redundant gate
 * before the autonomous weekly cycle runs — but that route's REAL safety gate is CRON_SECRET
 * failing closed (ADR-017) when unset, which happens first and independently. Setting
 * NEXT_PUBLIC_FF_NEW_EXECUTIVE_MODEL=false remains available as an emergency kill switch if
 * ever needed; it just isn't required for the product to work.
 */
export const FF_NEW_EXECUTIVE_MODEL = flag('NEW_EXECUTIVE_MODEL', true)
