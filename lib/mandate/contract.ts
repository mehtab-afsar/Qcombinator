/**
 * S002 — the Executive Contract. The founder's mandate.
 *
 * Draft → confirm → (later) a new epoch supersedes it. Never edited (ADR-003).
 *
 * This is the mandate the Operating Rhythm obeys: only Programs listed in the
 * current confirmed contract's `activePrograms` may run. Everything Story 2 does
 * is legal only because of a row in this table.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getProgram, ProgramNotFoundError, type ProgramId } from '@/lib/registry'
import { getCurrentStrategy, isStrategyComplete, type StrategySession } from './strategy'
import { log } from '@/lib/logger'

export type ContractStatus = 'draft' | 'confirmed' | 'superseded'

export interface ExecutiveContract {
  id: string
  founderId: string
  strategyId: string
  /** Counts CONFIRMED mandates. Drafts do not burn one (ADR-022). */
  epoch: number
  /** Counts rows, including redrafts (ADR-022). */
  version: number
  isCurrent: boolean
  status: ContractStatus
  priorities: string[]
  successMetrics: string[]
  responsibilities: Array<{ executive: string; mandate: string }>
  activePrograms: ProgramId[]
  previousContractId: string | null
  confirmedAt: string | null
  createdAt: string
}

export interface ProgramInstance {
  id: string
  contractId: string
  templateId: ProgramId
  owner: string
  objective: string
  successMetric: string
  status: 'active' | 'paused' | 'complete'
}

interface ContractRow {
  id: string; founder_id: string; strategy_id: string
  epoch: number; version: number; is_current: boolean; status: ContractStatus
  priorities: unknown; success_metrics: unknown; responsibilities: unknown; active_programs: unknown
  previous_contract_id: string | null; confirmed_at: string | null; created_at: string
}

function toContract(row: ContractRow): ExecutiveContract {
  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
  return {
    id: row.id,
    founderId: row.founder_id,
    strategyId: row.strategy_id,
    epoch: row.epoch,
    version: row.version,
    isCurrent: row.is_current,
    status: row.status,
    priorities: arr<string>(row.priorities),
    successMetrics: arr<string>(row.success_metrics),
    responsibilities: arr<{ executive: string; mandate: string }>(row.responsibilities),
    activePrograms: arr<ProgramId>(row.active_programs),
    previousContractId: row.previous_contract_id,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
  }
}

export class ContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContractError'
  }
}

/** The founder's current contract — draft or confirmed — or null. */
export async function getCurrentContract(
  supabase: SupabaseClient,
  founderId: string,
): Promise<ExecutiveContract | null> {
  const { data, error } = await supabase
    .from('executive_contracts')
    .select('*')
    .eq('founder_id', founderId)
    .eq('is_current', true)
    .maybeSingle()

  if (error) throw new ContractError(`Failed to read contract: ${error.message}`)
  return data ? toContract(data as ContractRow) : null
}

export async function getContractHistory(
  supabase: SupabaseClient,
  founderId: string,
): Promise<ExecutiveContract[]> {
  const { data, error } = await supabase
    .from('executive_contracts')
    .select('*')
    .eq('founder_id', founderId)
    .order('version', { ascending: false })

  if (error) throw new ContractError(`Failed to read contract history: ${error.message}`)
  return (data ?? []).map(r => toContract(r as ContractRow))
}

/** Programs activated by a contract. */
export async function getProgramsForContract(
  supabase: SupabaseClient,
  contractId: string,
): Promise<ProgramInstance[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('contract_id', contractId)

  if (error) throw new ContractError(`Failed to read programs: ${error.message}`)
  return (data ?? []).map(r => {
    const row = r as Record<string, unknown>
    return {
      id: row.id as string,
      contractId: row.contract_id as string,
      templateId: row.template_id as ProgramId,
      owner: row.owner as string,
      objective: row.objective as string,
      successMetric: row.success_metric as string,
      status: row.status as ProgramInstance['status'],
    }
  })
}

/**
 * Every Program id must resolve in the code Registry.
 *
 * ⚠️ THE SEAM. `programs.template_id` points at a Registry entry, but the Registry
 * is TypeScript (ADR-010), so Postgres cannot enforce it with a foreign key. If
 * this check is skipped, a contract can activate 'P999' and the Rhythm will
 * discover it at 3am, mid-cycle, for one founder. Validate here or not at all.
 */
function assertProgramsExist(programIds: readonly string[]): void {
  if (programIds.length === 0) {
    throw new ContractError('A contract must activate at least one program')
  }
  for (const id of programIds) {
    try {
      getProgram(id)
    } catch (err) {
      if (err instanceof ProgramNotFoundError) {
        throw new ContractError(
          `Cannot activate '${id}': no such program in the Registry`,
        )
      }
      throw err
    }
  }
}

export interface ContractDraft {
  priorities: string[]
  successMetrics: string[]
  responsibilities: Array<{ executive: string; mandate: string }>
  activePrograms: ProgramId[]
}

/**
 * Build a draft mandate from the founder's Strategy.
 *
 * ⚠️ DETERMINISTIC FOR NOW — F08b swaps in the real S002 LLM call via
 * composeMandatePrompt(). The lifecycle (draft → confirm → epoch) is the part
 * that must be right first, and it is testable only if generation is predictable.
 * Everything downstream of this function is final; only its innards change.
 */
export function buildDraft(strategy: StrategySession): ContractDraft {
  if (!isStrategyComplete(strategy)) {
    // F07's edge case, landing here as designed: a partial Strategy saves happily,
    // and gets blocked at the Contract — not at the founder's keyboard.
    throw new ContractError(
      'Your strategy needs a mission and at least one priority before a contract can be drafted.',
    )
  }

  const p001 = getProgram('P001')

  return {
    priorities: strategy.priorities,
    successMetrics: strategy.goals.length > 0 ? strategy.goals : [p001.successMetric],
    responsibilities: [{ executive: p001.owner, mandate: p001.objective }],
    // Only P001 is seeded (F05). When more Programs exist, S002 chooses; until
    // then this is the only honest answer.
    activePrograms: ['P001'],
  }
}

/**
 * Save a draft contract as the founder's new current version.
 *
 * Retire-then-insert, like the Strategy. `version` always advances; `epoch` only
 * advances past a CONFIRMED contract — redrafting an unconfirmed one reuses the
 * epoch, because nothing has operated under it yet (ADR-022).
 */
export async function createDraft(
  supabase: SupabaseClient,
  founderId: string,
): Promise<ExecutiveContract> {
  const strategy = await getCurrentStrategy(supabase, founderId)
  if (!strategy) {
    throw new ContractError('Set your direction first — there is no strategy to build a mandate from.')
  }

  const draft = buildDraft(strategy)
  assertProgramsExist(draft.activePrograms)

  const existing = await getCurrentContract(supabase, founderId)

  if (existing) {
    const { error } = await supabase
      .from('executive_contracts')
      .update({ is_current: false, status: existing.status === 'confirmed' ? 'superseded' : existing.status })
      .eq('id', existing.id)
      .eq('is_current', true)

    if (error) throw new ContractError(`Failed to retire contract v${existing.version}: ${error.message}`)
  }

  // ADR-022 in one line: a draft governs nothing, so it burns no epoch.
  const epoch = existing?.status === 'confirmed' ? existing.epoch + 1 : (existing?.epoch ?? 1)

  const { data, error } = await supabase
    .from('executive_contracts')
    .insert({
      founder_id: founderId,
      strategy_id: strategy.id,
      epoch,
      version: (existing?.version ?? 0) + 1,
      is_current: true,
      status: 'draft',
      priorities: draft.priorities,
      success_metrics: draft.successMetrics,
      responsibilities: draft.responsibilities,
      active_programs: draft.activePrograms,
      previous_contract_id: existing?.id ?? null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      log.warn('contract draft lost a concurrent race', { founderId })
      throw new ContractError('Another change completed first. Reload your mandate and try again.')
    }
    throw new ContractError(`Failed to create draft contract: ${error.message}`)
  }

  return toContract(data as ContractRow)
}

/**
 * Confirm a draft. This is the moment the mandate becomes real and Programs
 * start running.
 *
 * Delegates to the `confirm_executive_contract` Postgres function so the status
 * flip and the Program inserts are ONE transaction. Two client calls could leave
 * a confirmed mandate activating nothing — and the Rhythm would then run nothing,
 * every week, silently. Everything would look fine.
 */
export async function confirmContract(
  supabase: SupabaseClient,
  founderId: string,
  contractId: string,
): Promise<{ contract: ExecutiveContract; programs: ProgramInstance[] }> {
  const contract = await getCurrentContract(supabase, founderId)
  if (!contract || contract.id !== contractId) {
    throw new ContractError('That is not your current contract.')
  }
  if (contract.status !== 'draft') {
    throw new ContractError(`Only a draft can be confirmed (this one is ${contract.status}).`)
  }

  assertProgramsExist(contract.activePrograms)

  const programs = contract.activePrograms.map(id => {
    const template = getProgram(id)
    return {
      template_id: template.id,
      owner: template.owner,
      objective: template.objective,
      success_metric: template.successMetric,
    }
  })

  const { data, error } = await supabase.rpc('confirm_executive_contract', {
    p_contract_id: contractId,
    p_programs: programs,
  })

  if (error) throw new ContractError(`Failed to confirm contract: ${error.message}`)

  return {
    contract: toContract(data as ContractRow),
    programs: await getProgramsForContract(supabase, contractId),
  }
}

/**
 * Issue a new mandate — the only way to change direction (ADR-003).
 *
 * There is no edit. The confirmed contract is superseded and retained; a new
 * draft opens the next epoch. "Immutable" is not a style preference: it is what
 * makes "what were we operating under, when" answerable a year later.
 */
export async function newEpoch(
  supabase: SupabaseClient,
  founderId: string,
): Promise<ExecutiveContract> {
  const current = await getCurrentContract(supabase, founderId)
  if (!current) {
    throw new ContractError('There is no mandate to supersede.')
  }
  if (current.status !== 'confirmed') {
    throw new ContractError(
      'Your current mandate is still a draft — confirm or redraft it rather than starting a new epoch.',
    )
  }
  return createDraft(supabase, founderId)
}

/**
 * Mandate integrity: may this Program run?
 *
 * The check Story 2's Rhythm (F10) calls before every execution. A Program runs
 * only if the founder's CONFIRMED, CURRENT contract lists it. A draft mandates
 * nothing.
 */
export function mayProgramRun(
  contract: ExecutiveContract | null,
  programId: ProgramId,
): boolean {
  if (!contract) return false
  if (contract.status !== 'confirmed' || !contract.isCurrent) return false
  return contract.activePrograms.includes(programId)
}
