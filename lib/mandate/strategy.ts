/**
 * S001 — the Strategy Session. The founder's direction; the root of the mandate.
 *
 * Versioned, never overwritten. Saving a revision retires the current version and
 * inserts a new one; the old row stays exactly as it was (PRD §8, F07).
 *
 * The single writer. Routes validate and call in here — business logic lives in
 * lib/** and routes stay thin (CLAUDE.md §2).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'

export interface StrategySession {
  id: string
  founderId: string
  version: number
  isCurrent: boolean
  mission: string | null
  priorities: string[]
  goals: string[]
  previousVersionId: string | null
  createdAt: string
}

export interface StrategyInput {
  mission?: string
  priorities?: string[]
  goals?: string[]
}

/** Raw row shape. Kept local — the generated Database type has no entry for this table yet. */
interface StrategyRow {
  id: string
  founder_id: string
  version: number
  is_current: boolean
  mission: string | null
  priorities: unknown
  goals: unknown
  previous_version_id: string | null
  created_at: string
}

function toSession(row: StrategyRow): StrategySession {
  return {
    id: row.id,
    founderId: row.founder_id,
    version: row.version,
    isCurrent: row.is_current,
    mission: row.mission,
    priorities: Array.isArray(row.priorities) ? (row.priorities as string[]) : [],
    goals: Array.isArray(row.goals) ? (row.goals as string[]) : [],
    previousVersionId: row.previous_version_id,
    createdAt: row.created_at,
  }
}

export class StrategyWriteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StrategyWriteError'
  }
}

/** The founder's current Strategy, or null if they have never saved one. */
export async function getCurrentStrategy(
  supabase: SupabaseClient,
  founderId: string,
): Promise<StrategySession | null> {
  const { data, error } = await supabase
    .from('strategy_sessions')
    .select('*')
    .eq('founder_id', founderId)
    .eq('is_current', true)
    .maybeSingle()

  if (error) throw new StrategyWriteError(`Failed to read strategy: ${error.message}`)
  return data ? toSession(data as StrategyRow) : null
}

/** Full history, newest first. Nothing is ever deleted, so this is the whole record. */
export async function getStrategyHistory(
  supabase: SupabaseClient,
  founderId: string,
): Promise<StrategySession[]> {
  const { data, error } = await supabase
    .from('strategy_sessions')
    .select('*')
    .eq('founder_id', founderId)
    .order('version', { ascending: false })

  if (error) throw new StrategyWriteError(`Failed to read strategy history: ${error.message}`)
  return (data ?? []).map(r => toSession(r as StrategyRow))
}

/**
 * Save the founder's direction as a NEW current version.
 *
 * Retire-then-insert, in that order. Retiring first means that for a moment the
 * founder has no current version — which is correct: the alternative (insert
 * first) trips the partial unique index, because two current rows cannot briefly
 * exist even inside a transaction.
 *
 * ⚠️ Correctness does NOT rest on this sequence. `strategy_sessions_one_current_
 * per_founder` is a partial unique index, so if two requests race, the database
 * rejects the loser. Application ordering is the happy path; the index is the
 * guarantee. (Same lesson as agent-signal.ts, which learned it the hard way.)
 *
 * @throws StrategyWriteError — including when a concurrent save won the race.
 */
export async function saveStrategy(
  supabase: SupabaseClient,
  founderId: string,
  input: StrategyInput,
): Promise<StrategySession> {
  const existing = await getCurrentStrategy(supabase, founderId)

  if (existing) {
    const { error: retireError } = await supabase
      .from('strategy_sessions')
      .update({ is_current: false })
      .eq('id', existing.id)
      .eq('is_current', true) // no-op if someone else already retired it

    if (retireError) {
      throw new StrategyWriteError(`Failed to retire strategy v${existing.version}: ${retireError.message}`)
    }
  }

  const { data, error } = await supabase
    .from('strategy_sessions')
    .insert({
      founder_id: founderId,
      version: (existing?.version ?? 0) + 1,
      is_current: true,
      mission: input.mission ?? null,
      priorities: input.priorities ?? [],
      goals: input.goals ?? [],
      previous_version_id: existing?.id ?? null,
    })
    .select()
    .single()

  if (error) {
    // 23505 = unique_violation. Either two saves raced for is_current, or for the
    // same version number. Both mean: someone else's save landed first. Surfaced,
    // never swallowed — the founder must know their edit did not stick.
    if (error.code === '23505') {
      log.warn('strategy save lost a concurrent race', { founderId, code: error.code })
      throw new StrategyWriteError(
        'Another save completed first. Reload your strategy and try again.',
      )
    }
    throw new StrategyWriteError(`Failed to save strategy: ${error.message}`)
  }

  return toSession(data as StrategyRow)
}

/**
 * Is the Strategy complete enough to build a mandate from?
 *
 * F07's edge case: "empty → block Contract generation until complete." A partial
 * draft is saved happily; F08 refuses to generate a Contract from one. The
 * blocking belongs at the Contract, not at the founder's keyboard.
 */
export function isStrategyComplete(strategy: StrategySession | null): boolean {
  if (!strategy) return false
  return Boolean(strategy.mission?.trim()) && strategy.priorities.length > 0
}
