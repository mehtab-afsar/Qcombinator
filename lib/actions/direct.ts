/**
 * Run ONE Action now, because the founder asked — the sibling of `lib/rhythm/direct.ts`.
 *
 * Not a second engine. It calls the same `generateAction` the Operating Rhythm calls, with the
 * same composition, the same narrow context injectors and the same audit trail, differing only in
 * that it belongs to no cycle: `executionId` is null, exactly as a directed Asset rework carries
 * none. (`lib/rhythm/direct.ts`'s own docstring records why a synthesised `direct_<uuid>` was
 * rejected: it isn't a valid uuid, and even a real one would fail the FK to
 * operating_rhythm_runs, which no ad-hoc run has a row in.)
 *
 * ⚠️ IT REFUSES ANYTHING IRREVERSIBLE, and that refusal is the whole safety story. `lib/rhythm/
 * direct.ts` can claim "there is no path from here into lib/actions, so ADR-004's gate is never
 * in reach" because it structurally cannot reach a Connector. This file CAN, so the same
 * guarantee has to be enforced rather than asserted: an Action with `irreversible: true` is
 * turned away before `generateAction` is called. The consequence is that nothing reached from
 * here can ever send, spend or publish — approval still belongs exclusively to the cycle path and
 * its existing boundary.
 *
 * It is idempotent through `dedupeKey` rather than through `execution_id`, which it has none of:
 * action_log's per-run unique index is partial (`WHERE execution_id IS NOT NULL`) and so does not
 * apply here at all. See supabase/migrations/20260904000002_action_log_dedupe_key.sql.
 *
 * ⚠️ IT RE-DERIVES EVERYTHING FROM THE CONTRACT, never from the caller. Which Program owns the
 * Action, whether that Program is active, whether a mandate is even confirmed — all read fresh
 * here. A route hands over a founder id and an Action id and nothing else that matters.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getCurrentContract, getProgramsForContract } from '@/lib/mandate/contract'
import { getAction, listProgramsForAction, type ActionId } from '@/lib/registry'
import { buildContext } from '@/lib/rhythm/context'
import {
  founderContactsContextFor,
  leadsContextFor,
  pulledDataContextFor,
  outreachRepliesContextFor,
} from '@/lib/rhythm/action-context'
import { generateAction } from './generate'
import { findByDedupeKey, AlreadyExecutedError, type ActionLogEntry } from './log'

export class DirectActionError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'DirectActionError'
    this.code = code
  }
}

export interface DirectActionArgs {
  founderId: string
  actionId: ActionId
  /** Idempotency for a run with no execution_id — see GenerateActionArgs.dedupeKey. */
  dedupeKey?: string
}

export async function directActionRun(
  admin: SupabaseClient,
  args: DirectActionArgs,
): Promise<ActionLogEntry> {
  // ⚠️ FIRST, before any lookup or model call. An irreversible Action reached from here would
  // bypass the cycle's approval boundary entirely.
  if (getAction(args.actionId).irreversible) {
    throw new DirectActionError(
      'not_directable',
      'That action sends something outside the company, so it only runs through the approval flow.',
    )
  }

  // Idempotency, cheaply. The unique index on (founder_id, dedupe_key) is what makes a repeat
  // correct; this is what makes it free. generateAction calls the model before it writes, so
  // without this a double click pays Anthropic twice and only then collides on the insert.
  if (args.dedupeKey) {
    const already = await findByDedupeKey(admin, args.founderId, args.dedupeKey)
    if (already) throw new AlreadyExecutedError(args.actionId)
  }

  const contract = await getCurrentContract(admin, args.founderId)
  if (!contract || contract.status !== 'confirmed') {
    throw new DirectActionError('no_mandate', 'No confirmed mandate — there is nothing to run.')
  }

  // The Registry says which Program(s) own this Action; the founder's own mandate says which of
  // those are active. An Action with no active owning Program is not in scope to run.
  const allowedProgramIds = listProgramsForAction(args.actionId)
  const templateId = contract.activePrograms.find(id => allowedProgramIds.includes(id))
  if (!templateId) {
    throw new DirectActionError(
      'not_in_mandate',
      `${args.actionId} is not part of any Program in your current mandate.`,
    )
  }

  const programs = await getProgramsForContract(admin, contract.id)
  const program = programs.find(p => p.templateId === templateId && p.status === 'active')
  if (!program) {
    throw new DirectActionError('program_inactive', `${templateId} is not active.`)
  }

  const baseContext = await buildContext(admin, args.founderId, contract)
  // The same narrow injectors the cycle uses — so a directed run sees exactly what the scheduled
  // one would, including the replies that prompted the founder to click in the first place.
  //
  // `dependencyContextFor` is deliberately NOT among these. It threads a prior step's result from
  // within THIS execution, and an ad-hoc run has no execution — there is no earlier step to chain
  // from. Passing a placeholder id would query for a row that cannot exist and quietly return
  // nothing, which is the same outcome by accident rather than by decision.
  const [contacts, leads, pulled, replies] = await Promise.all([
    founderContactsContextFor(admin, args.founderId, args.actionId).catch(() => ({})),
    leadsContextFor(admin, args.founderId, args.actionId).catch(() => ({})),
    pulledDataContextFor(admin, args.founderId, args.actionId).catch(() => ({})),
    outreachRepliesContextFor(admin, args.founderId, args.actionId).catch(() => ({})),
  ])

  return generateAction(admin, {
    founderId: args.founderId,
    program,
    actionId: args.actionId,
    executionId: null,
    activePrograms: contract.activePrograms,
    context: { ...baseContext, ...contacts, ...leads, ...pulled, ...replies },
    dedupeKey: args.dedupeKey,
  })
}
