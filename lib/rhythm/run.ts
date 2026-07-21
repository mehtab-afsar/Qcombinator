/**
 * F10 — the Operating Rhythm. A cycle is a resumable state machine, not one long call: each
 * step (`runNextStep`) does exactly ONE Claude call — one asset or one briefing — persists
 * progress, and returns. `runCycle` is a thin wrapper that loops steps synchronously (tests,
 * local/dev, the trial harness); production HTTP entry points call `runNextStep` once per
 * invocation and self-chain (see `app/api/rhythm/step/route.ts`), so no single invocation ever
 * has to survive more than ~one Claude call regardless of hosting tier.
 *
 * Nothing here calls the score signal (ADR-005).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getCurrentContract, getProgramsForContract, type ExecutiveContract, type ProgramInstance } from '@/lib/mandate/contract'
import { getCurrentStrategy } from '@/lib/mandate/strategy'
import { getProgram, type AssetId } from '@/lib/registry'
import { getCurrentAsset } from '@/lib/assets/versioning'
import { AssetPersistenceError } from '@/lib/assets/validation'
import { generateBriefing } from '@/lib/briefings/generate'
import { BriefingError } from '@/lib/briefings/briefings'
import type { CompanyContext } from '@/lib/prompts/compose'
import { log } from '@/lib/logger'
import { createOrResumeRun, finishRun, getLastCompletedRun, getRun, recordStep, type RhythmRun } from './runs'
import { generateAssetContent } from './judge'
import { collectCycleDelta } from './delta'
import { weekCycleKey } from './cycle-key'

export class RhythmError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RhythmError'
  }
}

export interface RunCycleArgs {
  founderId: string
  /** Defaults to the current ISO week. An override is for dev testing only. */
  cycleKey?: string
}

interface StageStatus {
  assets: string
  briefing: string
  error?: string
  /** Chunking bookkeeping: asset ids this run has already decided (generated OR skipped). */
  assetsDone: string[]
  /** How many of assetsDone were actually generated (vs skipped) — decides 'completed' vs 'skipped'. */
  assetsGenerated: number
}
export interface CycleResult {
  runId: string
  cycleKey: string
  status: 'completed' | 'failed'
  stages: Record<string, StageStatus>
}
export interface StepResult {
  done: boolean
}

/** Compact Company Context from Strategy + Contract. (Q-Score is a v1 omission — see F10_DESIGN.) */
async function buildContext(
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

/** The program's current Asset versions, as strings, for the compose context. */
async function currentAssetsFor(
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

/** Everything one step needs, computed the same way whichever program/asset it lands on. */
interface StepContext {
  contract: ExecutiveContract
  baseContext: CompanyContext & { newInformation?: string }
  /** The regeneration gate (ADR-028) — an existing asset is skipped unless this is true. */
  hasNewInput: boolean
  programs: ProgramInstance[]
}

async function buildStepContext(admin: SupabaseClient, run: RhythmRun): Promise<StepContext> {
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

function newStage(): StageStatus {
  return { assets: 'pending', briefing: 'pending', assetsDone: [], assetsGenerated: 0 }
}

/**
 * Advance a run by exactly ONE unit of work — one asset generation or one briefing generation —
 * then persist and return. Safe to call repeatedly from separate invocations (an HTTP step
 * route, a retried trigger): "what's next" is a pure function of the run's persisted `stages`,
 * so a duplicate call for a step already recorded just moves on to the next one, and a genuine
 * duplicate LLM attempt for the SAME asset still hits the existing unique constraint on
 * `asset_versions(asset_id, execution_id)` (a clean 23505) rather than double-writing.
 *
 * @throws RhythmError if the run row doesn't exist or the mandate is no longer confirmed.
 */
export async function runNextStep(admin: SupabaseClient, runId: string): Promise<StepResult> {
  const run = await getRun(admin, runId)
  if (!run) throw new RhythmError(`Run ${runId} not found.`)
  if (run.status !== 'running') return { done: true } // already terminal — nothing to do

  const { contract, baseContext, hasNewInput, programs } = await buildStepContext(admin, run)
  const stages = { ...(run.stages as Record<string, StageStatus>) }

  for (const program of programs) {
    const stage = stages[program.templateId] ?? newStage()
    stages[program.templateId] = stage

    if (stage.assets === 'pending') {
      const assetIds = getProgram(program.templateId).assets
      const nextAssetId = assetIds.find(id => !stage.assetsDone.includes(id))

      if (nextAssetId) {
        const currentAssets = await currentAssetsFor(admin, run.founderId, assetIds)
        try {
          // ADR-028 (amending ADR-008 at the asset level): an existing asset with NO new
          // founder input is not regenerated — rewriting identical inputs is model variance,
          // not maintenance. A missing asset is always generated (first cycle).
          if (currentAssets[nextAssetId] === undefined || hasNewInput) {
            await generateAssetContent(admin, {
              founderId: run.founderId,
              program,
              assetId: nextAssetId,
              executionId: run.id,
              contractId: contract.id,
              activePrograms: contract.activePrograms,
              context: { ...baseContext, currentAssets },
            })
            stage.assetsGenerated++
          }
          stage.assetsDone.push(nextAssetId)
          await recordStep(admin, run.id, stages)
          return { done: false }
        } catch (err) {
          if (err instanceof AssetPersistenceError && err.code === 'conflict') {
            // The unique constraint on asset_versions(asset_id, execution_id) did its job: a
            // duplicate/retried step attempt for this SAME asset lost the write race, which
            // means the asset for this execution already exists — not a failure, just this
            // step arriving second. Move on rather than poisoning the whole program.
            stage.assetsDone.push(nextAssetId)
            await recordStep(admin, run.id, stages)
            return { done: false }
          }
          stage.assets = 'failed'
          stage.briefing = 'blocked' // the dependent stage never ran — blocked, not failed
          stage.error = (err as Error)?.message ?? 'unknown error'
          log.warn('rhythm asset step failed', { programId: program.templateId, runId, err: stage.error })
          await recordStep(admin, run.id, stages)
          continue // next program; this one's briefing cannot proceed
        }
      }

      // Every asset for this program has been decided (generated or skipped) — no LLM call
      // happened on this pass, so it's safe to fall straight into the briefing check below
      // within the same step. 'skipped' is honest: nothing needed doing.
      stage.assets = stage.assetsGenerated > 0 ? 'completed' : 'skipped'
    }

    if (stage.assets === 'failed') continue // briefing already marked 'blocked' above

    if (stage.briefing === 'pending') {
      try {
        // The Briefing depends on the Assets — it derives "what changed" from run.id.
        // Pass both ids explicitly: the Registry template id AND the programs-row UUID (B1).
        await generateBriefing(admin, {
          founderId: run.founderId,
          templateId: program.templateId,
          programRowId: program.id,
          executionId: run.id,
          contractId: contract.id,
          context: baseContext,
        })
        stage.briefing = 'completed'
      } catch (err) {
        if (err instanceof BriefingError && err.code === 'duplicate') {
          // Same reasoning as the asset conflict above: the unique index on
          // (program_id, execution_id) means a duplicate/retried step lost the race, not that
          // publishing failed — this run's briefing already exists.
          stage.briefing = 'completed'
        } else {
          stage.briefing = 'failed'
          stage.error = (err as Error)?.message ?? 'unknown error'
          log.warn('rhythm briefing step failed', { programId: program.templateId, runId, err: stage.error })
        }
      }
      await recordStep(admin, run.id, stages)
      return { done: false }
    }
  }

  // Every program's assets and briefing are in a terminal state — the run is done.
  const anyFailed = Object.values(stages).some(s => s.assets === 'failed' || s.briefing === 'failed')
  await finishRun(admin, run.id, { status: anyFailed ? 'failed' : 'completed', stages })
  return { done: true }
}

/**
 * Run a full cycle for a founder synchronously, looping `runNextStep` to completion. Used by
 * tests, local/dev, and the trial harness; production HTTP entry points call `runNextStep`
 * once per invocation instead (see `app/api/rhythm/step/route.ts`) so that no single
 * invocation has to survive more than ~one Claude call.
 *
 * @throws RhythmError when there is no confirmed mandate; CycleAlreadyRanError (from
 *         createOrResumeRun) when this week already completed — both surfaced, never swallowed.
 */
export async function runCycle(admin: SupabaseClient, args: RunCycleArgs): Promise<CycleResult> {
  const cycleKey = args.cycleKey ?? weekCycleKey(new Date())

  const contract = await getCurrentContract(admin, args.founderId)
  if (!contract || contract.status !== 'confirmed') {
    // ADR-002/ADR-008: only a confirmed mandate authorises a cycle. A draft mandates nothing.
    throw new RhythmError('No confirmed mandate — there is nothing to run.')
  }

  // Create (or resume) the run FIRST — a duplicate completed week fails here, before any LLM
  // spend (idempotency).
  const run = await createOrResumeRun(admin, { founderId: args.founderId, contractId: contract.id, cycleKey })

  let step: StepResult = { done: false }
  while (!step.done) {
    step = await runNextStep(admin, run.id)
  }

  const finished = await getRun(admin, run.id)
  if (!finished || finished.status === 'running') {
    throw new RhythmError(`Run ${run.id} did not reach a terminal status.`)
  }
  return {
    runId: finished.id,
    cycleKey: finished.cycleKey,
    status: finished.status,
    stages: finished.stages as Record<string, StageStatus>,
  }
}
