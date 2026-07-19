/**
 * B8 / ADR-028 — what feeds a cycle: the delta digest.
 *
 * Collects founder activity since the last COMPLETED run — asset edits (ADR-007), evidence
 * uploads, Q-Score changes, metric updates — and renders it as the Composer's
 * "New Information This Cycle" field. Without new input, an existing asset is NOT
 * regenerated (the skip in run.ts), which is what makes the no-change briefing reachable.
 *
 * Every signal here requires founder action; a passive founder therefore produces honest
 * no-change cycles. Whether an autonomous external signal is needed is an open pilot
 * question, recorded in ADR-028 — not solved here.
 *
 * Reads only. The old-model tables (agent_artifacts, qscore_history, founder_metric_snapshots)
 * are queried, never written (ADR-014 freeze intact; ADR-005 untouched — reading the score is
 * not moving it).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getAsset } from '@/lib/registry'
import { log } from '@/lib/logger'

export interface CycleSignals {
  /** Assets the founder edited directly since the last completed run (ADR-007). */
  founderEdits: Array<{ assetId: string; createdAt: string }>
  /** Evidence/documents added since (old-model Company Builder artefacts). */
  uploads: Array<{ artifactType: string; title: string; createdAt: string }>
  /** Q-Score movement across the window, if any recalculation happened. */
  qscore: { from: number | null; to: number; at: string } | null
  /** Metric snapshots recorded since. */
  metricUpdates: Array<{ at: string }>
}

export interface CycleDelta {
  /** The rendered "New Information This Cycle" text, or undefined when nothing happened. */
  digest: string | undefined
  /** True when any founder signal exists — the regeneration gate. */
  hasNewInput: boolean
}

const safeAssetName = (assetId: string): string => {
  try { return getAsset(assetId).name } catch { return assetId }
}

const day = (iso: string): string => iso.slice(0, 10)

/** Pure: signals → digest text. Split out so it is testable without a database. */
export function buildDigest(signals: CycleSignals): CycleDelta {
  const lines: string[] = []

  for (const edit of signals.founderEdits) {
    lines.push(`- The founder directly edited ${edit.assetId} (${safeAssetName(edit.assetId)}) on ${day(edit.createdAt)} — their edit is the current version and reflects changed thinking.`)
  }
  if (signals.uploads.length > 0) {
    const kinds = signals.uploads.map(u => `${u.artifactType}${u.title ? ` ("${u.title}")` : ''}`).join(', ')
    lines.push(`- ${signals.uploads.length} new document(s)/evidence added: ${kinds}.`)
  }
  if (signals.qscore) {
    const from = signals.qscore.from !== null ? `${signals.qscore.from} → ` : ''
    lines.push(`- The Q-Score moved: ${from}${signals.qscore.to} (recalculated ${day(signals.qscore.at)}).`)
  }
  if (signals.metricUpdates.length > 0) {
    lines.push(`- Company metrics were updated ${signals.metricUpdates.length} time(s), most recently ${day(signals.metricUpdates[0].at)}.`)
  }

  if (lines.length === 0) return { digest: undefined, hasNewInput: false }
  return { digest: lines.join('\n'), hasNewInput: true }
}

/**
 * Read the founder's activity since `sinceIso` (the last completed run's start; null on the
 * first ever cycle, when everything is new anyway because no assets exist yet).
 *
 * A read failure in any one signal degrades to that signal being absent — a broken side-table
 * must not kill the cycle — but it is logged, never silent.
 */
export async function collectCycleDelta(
  admin: SupabaseClient,
  founderId: string,
  sinceIso: string | null,
): Promise<CycleDelta> {
  const since = sinceIso ?? '1970-01-01T00:00:00Z'
  const signals: CycleSignals = { founderEdits: [], uploads: [], qscore: null, metricUpdates: [] }

  try {
    const { data, error } = await admin
      .from('asset_versions')
      .select('asset_id, created_at')
      .eq('founder_id', founderId)
      .eq('authored_by', 'founder')
      .gt('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw error
    signals.founderEdits = (data ?? []).map(r => ({ assetId: r.asset_id as string, createdAt: r.created_at as string }))
  } catch (err) {
    log.warn('delta: founder edits unreadable', { founderId, err: (err as Error)?.message })
  }

  try {
    const { data, error } = await admin
      .from('agent_artifacts')
      .select('artifact_type, title, created_at')
      .eq('user_id', founderId)
      .gt('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw error
    signals.uploads = (data ?? []).map(r => ({
      artifactType: r.artifact_type as string, title: (r.title as string) ?? '', createdAt: r.created_at as string,
    }))
  } catch (err) {
    log.warn('delta: artefacts unreadable', { founderId, err: (err as Error)?.message })
  }

  try {
    const { data, error } = await admin
      .from('qscore_history')
      .select('overall_score, calculated_at')
      .eq('user_id', founderId)
      .gt('calculated_at', since)
      .order('calculated_at', { ascending: false })
      .limit(2)
    if (error) throw error
    if (data && data.length > 0) {
      signals.qscore = {
        to: data[0].overall_score as number,
        from: data.length > 1 ? (data[1].overall_score as number) : null,
        at: data[0].calculated_at as string,
      }
    }
  } catch (err) {
    log.warn('delta: qscore unreadable', { founderId, err: (err as Error)?.message })
  }

  try {
    const { data, error } = await admin
      .from('founder_metric_snapshots')
      .select('calculated_at')
      .eq('user_id', founderId)
      .gt('calculated_at', since)
      .order('calculated_at', { ascending: false })
      .limit(5)
    if (error) throw error
    signals.metricUpdates = (data ?? []).map(r => ({ at: r.calculated_at as string }))
  } catch (err) {
    log.warn('delta: metric snapshots unreadable', { founderId, err: (err as Error)?.message })
  }

  return buildDigest(signals)
}
