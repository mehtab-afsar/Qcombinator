/**
 * F09 Stage 4 — direct an executive about one Asset (PRD §4: "a scoped command, never open
 * chat"). Not a second engine: this calls the SAME generateAssetContent (lib/rhythm/judge.ts)
 * the weekly Operating Rhythm calls — same composition, sanitisation, retry, persistence — with
 * the founder's instruction carried as `context.newInformation` and NO execution id: a directed
 * rework is a one-off, not a step in any operating_rhythm_runs row. (Found live: a synthesized
 * `direct_<uuid>` id was tried first and rejected twice over — it wasn't a valid uuid, and even
 * a real one would have failed the FK to operating_rhythm_runs, which no ad-hoc action has a row
 * in. See migration 20260804000008 for why a fake run row was rejected as the fix instead.)
 *
 * ⚠️ NOT ADR-034's adviser chat (this is one instruction → one new document version, no thread,
 * no reply). NOT an Action — this can only ever rework a document; there is no path from here
 * into lib/actions/**, so ADR-004's approval gate is never in reach to begin with.
 *
 * Provenance stays authored_by='program' — Patel still holds the pen, now steered by the founder
 * rather than the weekly cycle. What actually changes is recorded in update_reason, which the
 * existing asset history UI already renders.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getCurrentContract, getProgramsForContract } from '@/lib/mandate/contract'
import { listProgramsForAsset, type AssetId } from '@/lib/registry'
import type { AssetVersion } from '@/lib/assets/versioning'
import { buildContext } from './context'
import { generateAssetContent } from './judge'
import { RhythmError } from './errors'

export interface DirectAssetReworkArgs {
  founderId: string
  assetId: AssetId
  instruction: string
}

export async function directAssetRework(
  admin: SupabaseClient,
  args: DirectAssetReworkArgs,
): Promise<AssetVersion> {
  const contract = await getCurrentContract(admin, args.founderId)
  if (!contract || contract.status !== 'confirmed') {
    throw new RhythmError('No confirmed mandate — there is nothing to direct.')
  }

  // The Registry says which Program(s) may write this Asset; the founder's own mandate says
  // which of those are actually active right now. An Asset with no active owning Program here
  // is one the current mandate doesn't produce — it isn't in scope to direct.
  const allowedProgramIds = listProgramsForAsset(args.assetId)
  const templateId = contract.activePrograms.find(id => allowedProgramIds.includes(id))
  if (!templateId) {
    throw new RhythmError(`${args.assetId} is not produced by any Program in your current mandate.`)
  }

  const programs = await getProgramsForContract(admin, contract.id)
  const program = programs.find(p => p.templateId === templateId && p.status === 'active')
  if (!program) {
    throw new RhythmError(`${templateId} is not active — there is nothing to direct.`)
  }

  const baseContext = await buildContext(admin, args.founderId, contract)

  return generateAssetContent(admin, {
    founderId: args.founderId,
    program,
    assetId: args.assetId,
    executionId: null,
    contractId: contract.id,
    activePrograms: contract.activePrograms,
    context: { ...baseContext, newInformation: args.instruction },
    updateReason: `Directed: ${args.instruction}`,
  })
}
