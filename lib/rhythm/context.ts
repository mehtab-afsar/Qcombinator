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
import { collectCycleDelta } from './delta'
import { getLastCompletedRun, type RhythmRun } from './runs'
import { RhythmError } from './errors'

/** Compact Company Context from Strategy + Contract. (Q-Score is a v1 omission — see F10_DESIGN.) */
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
  return {
    strategy: strategyText,
    contract: contractText,
    // The real date — without it, run 4's documents invented "May 2024/2025".
    currentDate: new Date().toISOString().slice(0, 10),
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
  const programs = (await getProgramsForContract(admin, contract.id)).filter(p => p.status === 'active')
  return { contract, baseContext, hasNewInput: delta.hasNewInput, programs }
}

