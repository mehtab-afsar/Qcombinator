/**
 * F12 — Executive Briefings. The single reader/writer for executive_briefings — the
 * founder-facing output of each Program run (verdict + body). Routes stay thin and call
 * in here (CLAUDE.md §2).
 *
 * Append-only: a briefing is written once, never edited or deleted (the database enforces
 * this with a trigger). Writes are server-side only — the rhythm (F10) produces briefings,
 * never the founder — so persistBriefing takes a service-role client.
 *
 * Nothing in this module calls the score signal — a briefing never moves the Q-Score
 * (ADR-005). Asserted by __tests__/score-invariant.test.ts.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'

export interface Briefing {
  id: string
  founderId: string
  programId: string | null
  executionId: string | null
  contractId: string | null
  verdict: string
  body: unknown
  createdAt: string
}

/** What the rhythm supplies to publish a briefing. */
export interface PersistBriefingArgs {
  founderId: string
  programId: string
  /** The run that produced it — required (a briefing always comes from a cycle). */
  executionId: string
  /** The governing contract, for epoch stamping (ADR-022). */
  contractId?: string | null
  verdict: string
  body?: unknown
}

interface BriefingRow {
  id: string
  founder_id: string
  program_id: string | null
  execution_id: string | null
  contract_id: string | null
  verdict: string
  body: unknown
  created_at: string
}

function toBriefing(row: BriefingRow): Briefing {
  return {
    id: row.id,
    founderId: row.founder_id,
    programId: row.program_id,
    executionId: row.execution_id,
    contractId: row.contract_id,
    verdict: row.verdict,
    body: row.body ?? {},
    createdAt: row.created_at,
  }
}

export class BriefingError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'BriefingError'
    this.code = code
  }
}

/** The founder's briefings, newest first. Nothing is ever deleted, so this is the record. */
export async function getBriefings(
  supabase: SupabaseClient,
  founderId: string,
): Promise<Briefing[]> {
  const { data, error } = await supabase
    .from('executive_briefings')
    .select('*')
    .eq('founder_id', founderId)
    .order('created_at', { ascending: false })

  if (error) throw new BriefingError('read_failed', `Failed to read briefings: ${error.message}`)
  return (data ?? []).map(r => toBriefing(r as BriefingRow))
}

/**
 * From a newest-first list, keep only the most recent briefing per Program. Pure — split
 * out so it can be unit-tested without a database.
 */
export function pickLatestPerProgram(newestFirst: Briefing[]): Briefing[] {
  const seen = new Set<string>()
  const latest: Briefing[] = []
  for (const b of newestFirst) {
    const key = b.programId ?? b.id
    if (seen.has(key)) continue
    seen.add(key)
    latest.push(b)
  }
  return latest
}

/** The most recent briefing for each Program — one row per program, newest kept. */
export async function getLatestPerProgram(
  supabase: SupabaseClient,
  founderId: string,
): Promise<Briefing[]> {
  return pickLatestPerProgram(await getBriefings(supabase, founderId))
}

/** Full briefing history for one Program, newest first. */
export async function getBriefingHistory(
  supabase: SupabaseClient,
  founderId: string,
  programId: string,
): Promise<Briefing[]> {
  const { data, error } = await supabase
    .from('executive_briefings')
    .select('*')
    .eq('founder_id', founderId)
    .eq('program_id', programId)
    .order('created_at', { ascending: false })

  if (error) throw new BriefingError('read_failed', `Failed to read briefing history: ${error.message}`)
  return (data ?? []).map(r => toBriefing(r as BriefingRow))
}

/**
 * Publish a briefing (called by the rhythm, F10). A plain append-only insert; the unique
 * index on (program_id, execution_id) makes re-publishing the same run a no-op-that-errors,
 * surfaced as a typed idempotency error rather than a silent duplicate.
 *
 * MUST be given a service-role client — the table is read-only for authenticated. The caller
 * is responsible for having verified that `args.founderId` owns `args.programId`.
 */
export async function persistBriefing(
  admin: SupabaseClient,
  args: PersistBriefingArgs,
): Promise<Briefing> {
  const { data, error } = await admin
    .from('executive_briefings')
    .insert({
      founder_id: args.founderId,
      program_id: args.programId,
      execution_id: args.executionId,
      contract_id: args.contractId ?? null,
      verdict: args.verdict,
      body: args.body ?? {},
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      log.warn('briefing already published for this run', {
        founderId: args.founderId, programId: args.programId, code: error.code,
      })
      throw new BriefingError('duplicate', 'A briefing for this Program run has already been published.')
    }
    throw new BriefingError('write_failed', `Failed to publish briefing: ${error.message}`)
  }

  return toBriefing(data as BriefingRow)
}
