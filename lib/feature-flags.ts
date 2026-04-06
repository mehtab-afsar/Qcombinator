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

/** 5.5 — IQ Score unlock recommender */
export const FF_AI_SCORE_INTELLIGENCE = flag('AI_SCORE_INTELLIGENCE', true)

/** 5.6 — AI investor match rationale */
export const FF_AI_INVESTOR_MATCHING = flag('AI_INVESTOR_MATCHING', true)

/** 5.7 — fire-and-poll async artifact generation */
export const FF_ASYNC_ARTIFACT_GENERATION = flag('ASYNC_ARTIFACT_GENERATION', true)

/** 5.8 — context token budget compression */
export const FF_AGENT_CONTEXT_COMPRESSION = flag('AGENT_CONTEXT_COMPRESSION', true)

/** 5.9 — coordinator/worker typed task graph execution */
export const FF_COORDINATOR_WORKFLOW = flag('COORDINATOR_WORKFLOW', false)
