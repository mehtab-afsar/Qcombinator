/**
 * F10 — assembling the Company Context a cycle reasons from.
 *
 * Split out of run.ts, which reached the file-size limit when the circuit breaker landed. These
 * are the two "gather what the model needs to see" helpers; run.ts keeps the orchestration.
 *
 * Reads only — nothing here writes, and nothing here calls the score signal (ADR-005).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getCurrentContract,
  getProgramsForContract,
  type ExecutiveContract,
  type ProgramInstance,
} from '@/lib/mandate/contract'
import { getCurrentStrategy } from '@/lib/mandate/strategy'
import type { AssetId } from '@/lib/registry'
import { getCurrentAsset } from '@/lib/assets/versioning'
import type { CompanyContext } from '@/lib/prompts/compose'
import { getComparableCohortContext } from '@/lib/comparables/retrieve'
import { getMarketSignalContext } from '@/lib/comparables/market-signals'
import { getStripeMetricsContext } from '@/lib/connectors/context'
import { getLatestScoreSummary, getScoreHistory } from '@/features/qscore/services/latest-score'
import { collectCycleDelta } from './delta'
import { getLastCompletedRun, type RhythmRun } from './runs'
import { RhythmError } from './errors'

/**
 * Compact Company Context from Strategy + Contract, plus anonymized comparable-cohort stats
 * (lib/comparables/retrieve.ts — RAG Phase 1), recent sector-matched market news
 * (lib/comparables/market-signals.ts — RAG Phase 3), and the founder's own current Q-Score
 * summary + a short trend (features/qscore/services/latest-score.ts) — read-only, a separate
 * diagnostic never written from here.
 */
export async function buildContext(
  admin: SupabaseClient,
  founderId: string,
  contract: ExecutiveContract,
): Promise<CompanyContext> {
  const strategy = await getCurrentStrategy(admin, founderId)
  const strategyText = strategy
    ? [
        strategy.mission ?? '',
        strategy.priorities.length ? `Priorities: ${strategy.priorities.join('; ')}` : '',
        strategy.goals.length ? `Goals: ${strategy.goals.join('; ')}` : '',
      ].filter(Boolean).join('\n')
    : undefined
  const contractText = [
    contract.priorities.length ? `Priorities: ${contract.priorities.join('; ')}` : '',
    contract.successMetrics.length ? `Success metrics: ${contract.successMetrics.join('; ')}` : '',
    `Active programs: ${contract.activePrograms.join(', ')}`,
  ].filter(Boolean).join('\n')
  const comparableCohort = await getComparableCohortContext(admin, founderId).catch(() => null)
  const marketSignals = await getMarketSignalContext(admin, founderId).catch(() => null)
  // The founder's own verified revenue (ADR-038). A plain read of columns Stripe's connector
  // already synced onto founder_profiles — no call to Stripe, so this adds no external
  // dependency, latency or spend to a cycle. Living in buildContext means the founder-triggered
  // "Direct the AI" rework (lib/rhythm/direct.ts) gets it for free too, since that calls this
  // same builder.
  const stripeMetrics = await getStripeMetricsContext(admin, founderId).catch(() => null)
  // A founder not yet scored must never block a cycle — both reads tolerate no data.
  const [scoreSummary, scoreHistory] = await Promise.all([
    getLatestScoreSummary(admin, founderId).catch(() => null),
    getScoreHistory(admin, founderId).catch(() => []),
  ])
  return {
    strategy: strategyText,
    contract: contractText,
    // The real date — without it, run 4's documents invented "May 2024/2025".
    currentDate: new Date().toISOString().slice(0, 10),
    comparableCohort: comparableCohort ?? undefined,
    marketSignals: marketSignals ?? undefined,
    stripeMetrics: stripeMetrics ?? undefined,
    qScore: scoreSummary
      ? { ...scoreSummary, history: scoreHistory.length > 0 ? scoreHistory : undefined }
      : undefined,
  }
}

/**
 * The program's current Asset versions, as strings, for the compose context.
 *
 * Re-read on EVERY step, not snapshotted once per cycle: assets generated earlier in the same
 * cycle must be visible to later ones. Run 4's AS004 contradicted AS001 by 10x on the ICP's
 * procurement spend precisely because every asset saw the same frozen pre-loop snapshot.
 */
export async function currentAssetsFor(
  admin: SupabaseClient,
  founderId: string,
  assetIds: readonly AssetId[],
): Promise<Partial<Record<AssetId, string>>> {
  const map: Partial<Record<AssetId, string>> = {}
  for (const assetId of assetIds) {
    const version = await getCurrentAsset(admin, founderId, assetId)
    if (version) map[assetId] = typeof version.content === 'string' ? version.content : JSON.stringify(version.content)
  }
  return map
}

// ─── The per-step context ────────────────────────────────────────────────────

/** Everything one step needs, computed the same way whichever program/asset it lands on. */
export interface StepContext {
  contract: ExecutiveContract
  baseContext: CompanyContext & { newInformation?: string }
  /** The regeneration gate (ADR-028) — an existing asset is skipped unless this is true. */
  hasNewInput: boolean
  programs: ProgramInstance[]
}

/**
 * Put the contract's Programs into the ONE authoritative run order: `contract.activePrograms`.
 *
 * getProgramsForContract issues a bare SELECT with no ORDER BY, and Postgres guarantees nothing
 * about the order of such a result — it can shift with a plan change, a vacuum, or an updated
 * row. lib/rhythm/progress.ts's view of "which step is running" walks `activePrograms` instead,
 * so the two agreed only by luck. When they disagree the founder is shown the wrong step as
 * active, which — before the ownership fix in lib/rhythm/streaming.ts — meant another
 * executive's live document text rendered under their own.
 *
 * A Program not named in activePrograms sorts last, deterministically, and is never dropped:
 * losing a Program from a run would be a far worse failure than running it late.
 *
 * Deliberately not solved with `.order('created_at')` on the query: confirm_executive_contract
 * inserts every row in one statement so timestamps can tie, and it would establish a second
 * ordering authority alongside activePrograms (CLAUDE.md §4, one source of truth per fact).
 */
export function orderPrograms(
  programs: readonly ProgramInstance[],
  activePrograms: readonly string[],
): ProgramInstance[] {
  const rank = new Map(activePrograms.map((id, i) => [id, i]))
  return [...programs].sort(
    (a, b) =>
      (rank.get(a.templateId) ?? Number.MAX_SAFE_INTEGER) -
      (rank.get(b.templateId) ?? Number.MAX_SAFE_INTEGER),
  )
}

export async function buildStepContext(admin: SupabaseClient, run: RhythmRun): Promise<StepContext> {
  const contract = await getCurrentContract(admin, run.founderId)
  if (!contract || contract.status !== 'confirmed') {
    // The mandate could in principle be un-confirmed mid-run (rare); a step must fail loudly
    // rather than silently generate against a contract that's no longer authoritative.
    throw new RhythmError('No confirmed mandate — there is nothing to run.')
  }
  // ADR-028 — the delta digest: what the founder actually did since the last COMPLETED cycle.
  // This run isn't completed yet, so recomputing it on every step of the SAME run is stable —
  // it can't see itself.
  const lastCompleted = await getLastCompletedRun(admin, run.founderId)
  const delta = await collectCycleDelta(admin, run.founderId, lastCompleted?.startedAt ?? null)
  const baseContext = { ...(await buildContext(admin, run.founderId, contract)), newInformation: delta.digest }
  const programs = orderPrograms(
    (await getProgramsForContract(admin, contract.id)).filter(p => p.status === 'active'),
    contract.activePrograms,
  )
  return { contract, baseContext, hasNewInput: delta.hasNewInput, programs }
}

