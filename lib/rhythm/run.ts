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
import { getCurrentContract } from '@/lib/mandate/contract'
import { getProgram, getAction } from '@/lib/registry'
import { AssetPersistenceError } from '@/lib/assets/validation'
import { generateBriefing } from '@/lib/briefings/generate'
import { BriefingError } from '@/lib/briefings/briefings'
import { log } from '@/lib/logger'
import { trackCycleCompleted, trackCycleFailed } from '@/lib/analytics'
import { currentAssetsFor } from './context'
import { claimStepBudget } from './budget'
import { buildStepContext } from './context'
import { RhythmError } from './errors'

// Re-exported: `@/lib/rhythm/run` is the established public path for this type.
export { RhythmError }
import { generateAction } from '@/lib/actions/generate'
import { AlreadyExecutedError, latestPerAction } from '@/lib/actions/log'
import { getFounderContactsContext } from '@/lib/contacts/context'
import type { CompanyContext } from '@/lib/prompts/types'
import { createOrResumeRun, finishRun, getRun, recordStep } from './runs'
import { generateAssetContent } from './judge'
import { weekCycleKey } from './cycle-key'

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
  /**
   * F14. OPTIONAL on purpose: a run already in flight when Actions shipped has a stage object
   * with no `actions` key, and a required field would make every read of it `undefined` —
   * silently skipping every Action for that run. Always read through `actionsPhase()`.
   */
  actions?: string
  actionsDone?: string[]
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

function newStage(): StageStatus {
  return {
    assets: 'pending', briefing: 'pending', assetsDone: [], assetsGenerated: 0,
    actions: 'pending', actionsDone: [],
  }
}

/**
 * The Actions phase's state, defaulted for runs that predate it.
 *
 * `stages[templateId] ?? newStage()` only defaults a MISSING PROGRAM. A run created before
 * Actions shipped has a stage object that exists but has no `actions` key — so a bare
 * `stage.actions === 'pending'` would be false and every Action would be silently skipped for
 * that run. Reading through here is what makes a mid-flight deploy safe.
 */
function actionsPhase(stage: StageStatus): { status: string; done: string[] } {
  return { status: stage.actions ?? 'pending', done: stage.actionsDone ?? [] }
}

/**
 * AI SDR Milestone 1 — real chaining. When `actionId` declares `ActionDef.dependsOn`, look up
 * that Action's own result within THIS execution and return it as a `CompanyContext` addition;
 * otherwise return an empty object, so a spread at the call site is a no-op for every Action
 * that doesn't chain (i.e. everything except the handful of AI SDR steps that opt in).
 *
 * Only ever reads a result that's actually there. A dependency still `pending_approval` (an
 * irreversible Action, not yet approved) has no `result` yet — silently omitted rather than
 * blocking or erroring, since Milestone 1 is scoped to fully-autonomous chains; Milestone 2
 * covers the approval-pause case.
 *
 * Exported so this reads-from-`result` rule is unit-tested directly, matching resultSummary
 * (app/api/actions/route.ts) rather than only reachable through the full runNextStep path.
 */
export async function dependencyContextFor(
  admin: SupabaseClient,
  founderId: string,
  executionId: string,
  actionId: string,
): Promise<Pick<CompanyContext, 'dependencyResult'>> {
  const dependsOn = getAction(actionId).dependsOn
  if (!dependsOn) return {}

  const entries = await latestPerAction(admin, founderId, executionId)
  const entry = entries.find(e => e.actionId === dependsOn)
  const text = entry?.result?.summary
  if (typeof text !== 'string' || !text.trim()) return {}

  return { dependencyResult: { actionId: dependsOn, label: getAction(dependsOn).name, text } }
}

/**
 * A founder's own real contact list, but ONLY for the Actions that actually send email —
 * `getAction(actionId).connector === 'gmail'` (today: `interview_customers`, P001, and
 * `generate_personalized_outreach`, P005; nothing else). Empty object for every Asset, every
 * Briefing, and every other Action — deliberately NOT part of `baseContext`, which is reused
 * unchanged across all of those. Real PII belongs only where it's actually needed; a founder's
 * contact reaching a persisted Asset document (with no link back to the source row to know it
 * needs cleanup if the contact is later deleted) would be a second, silent copy of their data.
 *
 * Slack (`post_team_update`) is intentionally excluded even though it's also `irreversible` +
 * `connector` — a team update has no reason to reference the founder's prospect list at all.
 */
export async function founderContactsContextFor(
  admin: SupabaseClient,
  founderId: string,
  actionId: string,
): Promise<Pick<CompanyContext, 'founderContacts'>> {
  if (getAction(actionId).connector !== 'gmail') return {}

  const text = await getFounderContactsContext(admin, founderId).catch(() => null)
  return text ? { founderContacts: text } : {}
}

/**
 * Advance a run by exactly ONE unit of work — one asset generation or one briefing generation —
 * then persist and return. Safe to call repeatedly from separate invocations (an HTTP step
 * route, a retried trigger): "what's next" is a pure function of the run's persisted `stages`,
 * so a duplicate call for a step already recorded just moves on to the next one, and a genuine
 * duplicate LLM attempt for the SAME asset still hits the existing unique constraint on
 * `asset_versions(asset_id, execution_id)` (a clean 23505) rather than double-writing.
 *
 * @param onDelta PRD 2 Stage 2 — when supplied, threaded through to generateAssetContent ONLY
 *   when this step turns out to be an asset generation (never briefings/actions — the PRD's own
 *   "Patel is building your ICP profiles…" language is specifically about documents). Every
 *   existing caller (the step-chain route) passes nothing, so this step behaves identically to
 *   before for the unattended case — additive, not a second code path.
 * @throws RhythmError if the run row doesn't exist or the mandate is no longer confirmed.
 */
export async function runNextStep(
  admin: SupabaseClient,
  runId: string,
  onDelta?: (text: string) => void,
): Promise<StepResult> {
  const run = await getRun(admin, runId)
  if (!run) throw new RhythmError(`Run ${runId} not found.`)
  if (run.status !== 'running') return { done: true } // already terminal — nothing to do

  const { contract, baseContext, hasNewInput, programs } = await buildStepContext(admin, run)
  const stages = { ...(run.stages as Record<string, StageStatus>) }

  // The one place every entry point (step route, manual run, cron) must pass through before
  // reaching the model — structural coverage rather than the same guard repeated three times.
  const stopped = await claimStepBudget(admin, run, programs, stages)
  if (stopped) return stopped

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
              onDelta,
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

    // Mirrors the assets-failure guard above: a program whose briefing failed must not still
    // attempt Actions — they're meant to follow FROM the briefing (PRD §7.4), and generating
    // them anyway would leave a founder with new actions to approve on a cycle whose "what
    // changed" summary never got written. 'blocked', same vocabulary as a blocked briefing,
    // never silently left 'pending' forever.
    if (stage.briefing === 'failed') {
      stage.actions = 'blocked'
      continue
    }

    // ── F14 — Actions, one per step, after the Briefing ────────────────────────────
    // Placed here because the docs put Action creation inside the per-Program loop after the
    // Briefing (PRD §7.4; Featureinventory UC-10 step 4 tags this exact point "(Story 3)").
    //
    // GENERATION happens here; APPROVAL and external execution do not. An irreversible Action is
    // recorded `pending_approval` and the cycle moves on — a cycle must never block waiting for
    // a human, or "runs unattended" stops being true.
    const actions = actionsPhase(stage)
    if (actions.status === 'pending') {
      const actionIds = getProgram(program.templateId).actions
      const nextActionId = actionIds.find(id => !actions.done.includes(id))

      if (nextActionId) {
        try {
          // AI SDR Milestone 1 — a no-op spread for every Action except the handful that declare
          // ActionDef.dependsOn (see dependencyContextFor's own docstring).
          const chained = await dependencyContextFor(admin, run.founderId, run.id, nextActionId)
          // A no-op spread for every Action except the Gmail-send ones (see
          // founderContactsContextFor's own docstring for why this stays out of baseContext).
          const contacts = await founderContactsContextFor(admin, run.founderId, nextActionId)
          await generateAction(admin, {
            founderId: run.founderId,
            program,
            actionId: nextActionId,
            executionId: run.id,
            activePrograms: contract.activePrograms,
            context: { ...baseContext, ...chained, ...contacts },
          })
        } catch (err) {
          if (err instanceof AlreadyExecutedError) {
            // The unique index caught a duplicate/retried step — this Action already ran for
            // this execution. Progress, not failure; same reasoning as the asset conflict above.
            log.warn('action already executed for this run', { actionId: nextActionId, runId })
          } else {
            stage.actions = 'failed'
            stage.error = (err as Error)?.message ?? 'unknown error'
            log.warn('rhythm action step failed', { programId: program.templateId, runId, err: stage.error })
            await recordStep(admin, run.id, stages)
            continue // next program; this one's remaining Actions do not run
          }
        }
        stage.actionsDone = [...actions.done, nextActionId]
        await recordStep(admin, run.id, stages)
        return { done: false }
      }

      // Every Action decided. No LLM call happened on this pass, so falling through to the
      // terminal check below in the same step costs nothing.
      stage.actions = 'completed'
    }
  }

  // Every program's assets, briefing and actions are in a terminal state — the run is done.
  const anyFailed = Object.values(stages).some(
    s => s.assets === 'failed' || s.briefing === 'failed' || s.actions === 'failed',
  )
  await finishRun(admin, run.id, { status: anyFailed ? 'failed' : 'completed', stages })

  // Counted from the run record rather than from local variables: this function returns after ONE
  // step, so a per-call tally would only ever describe the last step of a chained cycle.
  const done = Object.values(stages)
  if (anyFailed) {
    trackCycleFailed(run.founderId, { reason: 'stage_failed', steps: run.stepCount ?? 0 })
  } else {
    trackCycleCompleted(run.founderId, {
      programs: done.length,
      steps: run.stepCount ?? 0,
      durationMs: Date.parse(new Date().toISOString()) - Date.parse(run.startedAt),
      assets: done.reduce((n, st) => n + (st.assetsDone?.length ?? 0), 0),
      actions: done.reduce((n, st) => n + (st.actionsDone?.length ?? 0), 0),
    })
  }
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
