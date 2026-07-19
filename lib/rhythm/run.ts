/**
 * F10 — the Operating Rhythm. One cycle: create the run row (fail-fast on a duplicate week),
 * then for each contract-active Program, regenerate its Assets (F11) and publish a Briefing
 * (F12), recording each stage. Internal/reversible only — no external actions in v1 (Story 3).
 *
 * The single orchestrator; the manual route and the cron both call runCycle. Nothing here
 * calls the score signal (ADR-005).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getCurrentContract, getProgramsForContract, type ExecutiveContract } from '@/lib/mandate/contract'
import { getCurrentStrategy } from '@/lib/mandate/strategy'
import { getProgram, type AssetId } from '@/lib/registry'
import { getCurrentAsset } from '@/lib/assets/versioning'
import { generateBriefing } from '@/lib/briefings/generate'
import type { CompanyContext } from '@/lib/prompts/compose'
import { log } from '@/lib/logger'
import { createRun, finishRun, getLastCompletedRun } from './runs'
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

interface StageStatus { assets: string; briefing: string; error?: string }
export interface CycleResult {
  runId: string
  cycleKey: string
  status: 'completed' | 'failed'
  stages: Record<string, StageStatus>
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
  return { strategy: strategyText, contract: contractText }
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

/**
 * Run one cycle for a founder. Service-role client required.
 *
 * @throws RhythmError when there is no confirmed mandate; CycleAlreadyRanError (from createRun)
 *         when this week already ran — both surfaced, never swallowed.
 */
export async function runCycle(admin: SupabaseClient, args: RunCycleArgs): Promise<CycleResult> {
  const cycleKey = args.cycleKey ?? weekCycleKey(new Date())

  const contract = await getCurrentContract(admin, args.founderId)
  if (!contract || contract.status !== 'confirmed') {
    // ADR-002/ADR-008: only a confirmed mandate authorises a cycle. A draft mandates nothing.
    throw new RhythmError('No confirmed mandate — there is nothing to run.')
  }

  // Create the run FIRST — a duplicate week fails here, before any LLM spend (idempotency).
  const run = await createRun(admin, { founderId: args.founderId, contractId: contract.id, cycleKey })

  // ADR-028 — the delta digest: what the founder actually did since the last completed cycle.
  // This is what each cycle reasons FROM; without it, regeneration is model variance.
  const lastCompleted = await getLastCompletedRun(admin, args.founderId)
  const delta = await collectCycleDelta(admin, args.founderId, lastCompleted?.startedAt ?? null)

  const baseContext = {
    ...(await buildContext(admin, args.founderId, contract)),
    newInformation: delta.digest,
  }
  const programs = (await getProgramsForContract(admin, contract.id)).filter(p => p.status === 'active')

  const stages: Record<string, StageStatus> = {}
  let anyFailed = false

  // Sequential in v1 (parallelism is a deferred optimisation). One program's failure is
  // caught and recorded; the others still run (resilience, per UC-10 step 5).
  for (const program of programs) {
    const stage: StageStatus = { assets: 'pending', briefing: 'pending' }
    stages[program.templateId] = stage

    // B4 — two separate catches so the stage that failed is NAMED 'failed', never left
    // looking 'pending'. The founder-facing stages jsonb must not contradict the run status.
    try {
      const assetIds = getProgram(program.templateId).assets
      const currentAssets = await currentAssetsFor(admin, args.founderId, assetIds)

      let generated = 0
      for (const assetId of assetIds) {
        // ADR-028 (amending ADR-008 at the asset level): an existing asset with NO new
        // founder input is not regenerated — rewriting identical inputs is model variance,
        // not maintenance. A missing asset is always generated (first cycle). This skip is
        // what makes the "no material change" briefing reachable rather than decorative.
        if (currentAssets[assetId] !== undefined && !delta.hasNewInput) continue

        await generateAssetContent(admin, {
          founderId: args.founderId,
          program,
          assetId,
          executionId: run.id,
          contractId: contract.id,
          activePrograms: contract.activePrograms,
          context: { ...baseContext, currentAssets },
        })
        generated++
      }
      // 'skipped' is honest: nothing needed doing. 'completed' would imply work happened.
      stage.assets = generated > 0 ? 'completed' : 'skipped'
    } catch (err) {
      anyFailed = true
      stage.assets = 'failed'
      stage.briefing = 'blocked' // the dependent stage never ran — blocked, not failed
      stage.error = (err as Error)?.message ?? 'unknown error'
      log.warn('rhythm assets failed', { programId: program.templateId, cycleKey, err: stage.error })
      continue // next program; this one's briefing cannot proceed
    }

    try {
      // The Briefing depends on the Assets — it derives "what changed" from run.id.
      // Pass both ids explicitly: the Registry template id AND the programs-row UUID (B1).
      await generateBriefing(admin, {
        founderId: args.founderId,
        templateId: program.templateId,
        programRowId: program.id,
        executionId: run.id,
        contractId: contract.id,
        context: baseContext,
      })
      stage.briefing = 'completed'
    } catch (err) {
      anyFailed = true
      stage.briefing = 'failed'
      stage.error = (err as Error)?.message ?? 'unknown error'
      log.warn('rhythm briefing failed', { programId: program.templateId, cycleKey, err: stage.error })
    }
  }

  const status = anyFailed ? 'failed' : 'completed'
  await finishRun(admin, run.id, { status, stages })
  return { runId: run.id, cycleKey, status, stages }
}
