/**
 * Real content previews for a LIVE run's steps — the fix for docs/EDGE_ALPHA_PRD.md §3
 * ("Activation — THE MISSING MOMENT"): confirming a mandate must show "real content
 * appearing, one artefact after another, streamed... required, not optional." The engine's
 * write path (lib/rhythm/run.ts) never needed to change for this — every artefact a step
 * produces is already fully queryable at read time via the same execution-scoped readers
 * assets/actions/briefings each already have (getAssetVersionsForExecution, latestPerAction,
 * getBriefingsForExecution). This module is the one place that turns those into a short,
 * honest snippet per step, so both RhythmPanel (steady-state) and ActivationScreen (first
 * cycle) read from the same source instead of each forking their own fetch strategy
 * (CLAUDE.md "one of each").
 *
 * Only ever called for a run with status === 'running' — a completed run's steps don't
 * need their previews recomputed on every poll.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getAsset, getAction } from '@/lib/registry'
import { getAssetVersionsForExecution } from '@/lib/assets/versioning'
import { latestPerAction } from '@/lib/actions/log'
import { getBriefingsForExecution } from '@/lib/briefings/briefings'
import type { RhythmRun } from './runs'
import type { ProgressStep } from './progress'

/**
 * markdown is already text; json is pretty-printed and clipped — this is a glimpse, not
 * the editor. Never fabricates a summary of arbitrary JSON without an obvious title field —
 * "say less rather than invent confidence" (lib/prompts/composer/mandate.ts's own rule,
 * applied here too).
 */
export function summarizeAssetContent(content: unknown, outputSchema: 'markdown' | 'json'): string {
  if (outputSchema === 'markdown') {
    const text = typeof content === 'string' ? content.trim() : ''
    if (!text) return 'Updated'
    const firstHeading = text.match(/^#{1,3}\s*(.+)$/m)
    const line = (firstHeading?.[1] ?? text).trim()
    return line.length > 160 ? `${line.slice(0, 160)}…` : line
  }
  if (content && typeof content === 'object') {
    const obj = content as Record<string, unknown>
    const titleKey = ['title', 'summary', 'headline'].find(k => typeof obj[k] === 'string' && (obj[k] as string).trim())
    if (titleKey) {
      const text = (obj[titleKey] as string).trim()
      return text.length > 160 ? `${text.slice(0, 160)}…` : text
    }
  }
  return 'Updated'
}

/** Built from action_log's already-redacted metadata only — never raw payload content (CLAUDE.md §3). */
export function summarizeActionMetadata(
  request: { recipientCount?: number; recipientDomains?: string[] } | null | undefined,
  actionName: string,
): string {
  const count = request?.recipientCount
  const domains = request?.recipientDomains ?? []
  if (!count) return actionName
  const who = domains.length > 0 ? ` at ${domains.join(', ')}` : ''
  return `${actionName} — ${count} recipient${count === 1 ? '' : 's'}${who}`
}

const SETTLED_STATES = new Set(['done', 'skipped'])

/**
 * One batched read per artefact kind (never per-step — the N+1 ActivationScreen used to do),
 * keyed once by run.id, mapped back onto each settled step.
 *
 * @param programs template-id -> row-id mapping (getProgramsForContract) — briefings are
 *   stored against the programs-table row id, not the Registry template id, so this is
 *   needed to match a briefing back to the step that published it.
 */
export async function buildStepPreviews(
  client: SupabaseClient,
  run: RhythmRun,
  steps: readonly ProgressStep[],
  programs: readonly { id: string; templateId: string }[],
): Promise<Map<string, string>> {
  const previews = new Map<string, string>()
  const settled = steps.filter(s => SETTLED_STATES.has(s.state))
  if (settled.length === 0) return previews

  const [assetVersions, actionEntries, briefings] = await Promise.all([
    getAssetVersionsForExecution(client, run.founderId, run.id),
    latestPerAction(client, run.founderId, run.id),
    getBriefingsForExecution(client, run.founderId, run.id),
  ])

  const assetByAssetId = new Map(assetVersions.map(v => [v.assetId, v]))
  const actionByActionId = new Map(actionEntries.map(e => [e.actionId, e]))
  const rowIdByTemplateId = new Map(programs.map(p => [p.templateId, p.id]))
  const briefingByProgramRowId = new Map(briefings.map(b => [b.programId, b]))

  for (const step of settled) {
    if (step.kind === 'asset' && step.assetId) {
      const version = assetByAssetId.get(step.assetId)
      if (!version) continue
      try {
        previews.set(step.key, summarizeAssetContent(version.content, getAsset(step.assetId).outputSchema))
      } catch { /* unknown asset id — degrade to no preview, not a broken row */ }
      continue
    }
    if (step.kind === 'briefing') {
      const rowId = rowIdByTemplateId.get(step.templateId)
      const briefing = rowId ? briefingByProgramRowId.get(rowId) : undefined
      if (briefing) previews.set(step.key, briefing.verdict)
      continue
    }
    if (step.kind === 'action' && step.actionId) {
      const entry = actionByActionId.get(step.actionId)
      if (!entry) continue
      try {
        previews.set(step.key, summarizeActionMetadata(entry.request, getAction(step.actionId).name))
      } catch { /* unknown action id — degrade to no preview, not a broken row */ }
    }
  }

  return previews
}
