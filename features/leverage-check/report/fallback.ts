import { ARCHETYPE_COPY, DIMENSION_LEAK_COPY } from '../scoring/archetype-copy'
import { DIMENSION_LABELS } from '../scoring/questions'
import type { LeverageCheckResult } from '../scoring/calculate'
import type { ParsedReport } from './parse'

/**
 * Locally-templated short result + full report, built only from the deterministic scores — no
 * LLM call, always available. Used when routedText() throws or returns text that doesn't match
 * the expected format. Mirrors app/api/webhook/lead/route.ts's hardcoded-fallback-on-AI-failure
 * pattern: a visitor must always get SOME result.
 */
export function buildFallbackReport(result: LeverageCheckResult): ParsedReport {
  const archetype = ARCHETYPE_COPY[result.archetype]
  const weakestLabel = DIMENSION_LABELS[result.weakestDimension]
  const strongestLabel = DIMENSION_LABELS[result.strongestDimension]
  const weakestLeak = DIMENSION_LEAK_COPY[result.weakestDimension]

  const shortResult = [
    'YOUR FOUNDER LEVERAGE',
    `${result.multiple}x`,
    result.archetype,
    archetype.headline,
    '',
    'YOUR BIGGEST LEVERAGE LEAK',
    weakestLabel,
    `Right now, ${weakestLeak}`,
    '',
    "YOUR 10× OPPORTUNITY",
    `Closing that gap is the fastest way to move up from ${result.archetype.toLowerCase()}.`,
    '',
    "We've identified the moves that could create the most leverage in how you run your company.",
  ].join('\n')

  const fullReport = [
    'YOUR DIAGNOSIS',
    `${archetype.body} Your strongest dimension right now is ${strongestLabel.toLowerCase()}; your biggest constraint is ${weakestLabel.toLowerCase()} — ${weakestLeak}`,
    '',
    'YOUR LEVERAGE PROFILE',
    `Founder Dependency — ${result.dimensionScores.dependency}`,
    `Decision Leverage — ${result.dimensionScores.decision}`,
    `Execution Leverage — ${result.dimensionScores.execution}`,
    `Growth Leverage — ${result.dimensionScores.growth}`,
    `Management Leverage — ${result.dimensionScores.management}`,
    '',
    `STRONGEST LEVERAGE: ${strongestLabel}`,
    `BIGGEST LEVERAGE LEAK: ${weakestLabel} — ${weakestLeak}`,
    '',
    'THE 10× VISION',
    "10× doesn't mean working 10× harder — it means your judgement commands substantially more of the company than you personally execute. That's the operating model worth building toward.",
    '',
    'EDGE ALPHA',
    "You don't need another AI tool. You need to turn this into an operating model. Edge Alpha is designed to do exactly that.",
    '',
    'FOUNDER IN COMMAND. AGENTS IN EXECUTION. COMPANY IN MOTION.',
  ].join('\n')

  return { shortResult, fullReport, aiGenerated: false }
}
