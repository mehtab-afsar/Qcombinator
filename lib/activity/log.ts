/**
 * CANVAS_SPEC §4.5 — one executive's Activity Log: "everything the executive has done. A plain
 * feed: documents written, actions prepared/taken, cycles run, founder edits used."
 *
 * A read over three already-append-only tables (asset_versions, action_log,
 * executive_briefings) — no new tables, no new engine (CANVAS_SPEC §7: "It's a view over
 * existing data"). "Cycles run" isn't a separate entry kind here — a cycle's only founder-
 * visible effects ARE the documents/actions/briefings it produced, which this already surfaces;
 * adding a redundant "cycle ran" row would just repeat what's already on the feed.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { attachOwners, type ActionLogEntry, type ActionStatus } from '@/lib/actions/log'
import type { ProgramInstance } from '@/lib/mandate/contract'
import { assetLabel, actionLabel } from '@/lib/registry/labels'

export type ActivityKind = 'asset' | 'action' | 'briefing'

export interface ActivityEntry {
  /** Stable key for React — prefixed by kind since the three source tables' ids can collide. */
  id: string
  kind: ActivityKind
  label: string
  /** A short, human status/summary line — never the full body (that's what opening the item is for). */
  detail: string | null
  createdAt: string
}

/** Enough to feel complete without becoming its own scroll-forever surface — this is a glance,
 *  not the system of record (asset_versions/action_log/executive_briefings already are that). */
const MAX_ENTRIES = 50

interface AssetVersionRow {
  id: string
  asset_id: string
  version: number
  authored_by: 'program' | 'founder'
  update_reason: string | null
  created_at: string
}

interface BriefingRow {
  id: string
  verdict: string
  created_at: string
}

interface ActionLogRow {
  id: string
  founder_id: string
  program_id: string | null
  execution_id: string | null
  action_id: string
  provider: string | null
  irreversible: boolean
  status: ActionStatus
  payload_hash: string | null
  payload_ref: string | null
  request: unknown
  result: unknown
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

function toActionEntry(r: ActionLogRow): ActionLogEntry {
  return {
    id: r.id,
    founderId: r.founder_id,
    programId: r.program_id,
    executionId: r.execution_id,
    actionId: r.action_id,
    provider: r.provider,
    irreversible: r.irreversible,
    status: r.status,
    payloadHash: r.payload_hash,
    payloadRef: r.payload_ref ?? null,
    request: (r.request && typeof r.request === 'object' ? r.request : {}) as Record<string, unknown>,
    result: (r.result && typeof r.result === 'object' ? r.result : null) as Record<string, unknown> | null,
    approvedBy: r.approved_by,
    approvedAt: r.approved_at,
    createdAt: r.created_at,
  }
}

/**
 * Collapse an action's row-per-status-change history (append-only — pending_approval, then a
 * SEPARATE approved row, then a separate executed row) down to one feed entry per attempt, the
 * latest status winning. Identity is (actionId, executionId) — the same key the execution
 * unique index and the approval flow use (lib/actions/log.ts's own pendingApprovals) — NOT
 * actionId alone (lib/actions/log.ts's dedupeLatestByActionId), which would hide that the same
 * Action ran again in a later cycle. Exported for a direct unit test, pure — no IO.
 */
export function dedupeActionAttempts(newestFirst: readonly ActionLogEntry[]): ActionLogEntry[] {
  const seen = new Set<string>()
  return newestFirst.filter(e => {
    const key = `${e.actionId}:${e.executionId ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function describeActionStatus(status: ActionStatus): string {
  switch (status) {
    case 'executed': return 'sent'
    case 'pending_approval': return 'waiting on you'
    case 'approved': return 'approved'
    case 'sending': return 'sending'
    case 'declined': return 'declined'
    case 'failed': return 'failed'
    default: return status
  }
}

/**
 * One executive's activity, newest first. `programs` is the caller's already-fetched contract
 * programs (the same data /api/rhythm/run's GET already has) — not re-derived here, so this
 * never differs from what the rest of the page believes is active.
 */
export async function getActivityForExecutive(
  client: SupabaseClient,
  founderId: string,
  executiveId: string,
  programs: readonly Pick<ProgramInstance, 'id' | 'templateId' | 'owner'>[],
): Promise<ActivityEntry[]> {
  const ownedProgramIds = programs.filter(p => p.owner === executiveId).map(p => p.id)

  const [assetRes, actionRes, briefingRes] = await Promise.all([
    client
      .from('asset_versions')
      .select('id, asset_id, version, authored_by, update_reason, created_at')
      .eq('founder_id', founderId)
      .eq('executive_id', executiveId)
      .order('created_at', { ascending: false })
      .limit(MAX_ENTRIES),
    ownedProgramIds.length > 0
      ? client
          .from('action_log')
          .select('*')
          .eq('founder_id', founderId)
          .in('program_id', ownedProgramIds)
          .order('created_at', { ascending: false })
          .limit(MAX_ENTRIES)
      : Promise.resolve({ data: [] as ActionLogRow[], error: null }),
    client
      .from('executive_briefings')
      .select('id, verdict, created_at')
      .eq('founder_id', founderId)
      .eq('executive_id', executiveId)
      .order('created_at', { ascending: false })
      .limit(MAX_ENTRIES),
  ])

  if (assetRes.error) throw new Error(`Failed to read asset activity: ${assetRes.error.message}`)
  if (actionRes.error) throw new Error(`Failed to read action activity: ${actionRes.error.message}`)
  if (briefingRes.error) throw new Error(`Failed to read briefing activity: ${briefingRes.error.message}`)

  const assets: ActivityEntry[] = ((assetRes.data ?? []) as AssetVersionRow[]).map(r => ({
    id: `asset:${r.id}`,
    kind: 'asset',
    label: assetLabel(r.asset_id),
    detail: r.authored_by === 'founder' ? 'you edited this' : (r.update_reason ?? `v${r.version}`),
    createdAt: r.created_at,
  }))

  const actionEntries = dedupeActionAttempts(((actionRes.data ?? []) as ActionLogRow[]).map(toActionEntry))
  const actions: ActivityEntry[] = attachOwners(actionEntries, programs).map(e => ({
    id: `action:${e.id}`,
    kind: 'action',
    label: actionLabel(e.actionId),
    detail: describeActionStatus(e.status),
    createdAt: e.createdAt,
  }))

  const briefings: ActivityEntry[] = ((briefingRes.data ?? []) as BriefingRow[]).map(r => ({
    id: `briefing:${r.id}`,
    kind: 'briefing',
    label: 'Executive briefing',
    detail: r.verdict.length > 140 ? `${r.verdict.slice(0, 140)}…` : r.verdict,
    createdAt: r.created_at,
  }))

  return [...assets, ...actions, ...briefings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_ENTRIES)
}
