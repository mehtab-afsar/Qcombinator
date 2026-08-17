/**
 * GET /api/assets — every Asset across the founder's active Programs, one call.
 *
 * Stage 3's artefact-centric home: the Command View leads with these five documents, not a
 * mandate card. Parallel to the existing single-asset app/api/assets/[id]/route.ts — that route
 * is untouched; this is the list a home surface needs instead of a five-request waterfall.
 *
 * Thin: resolve active Programs from the current contract, resolve their Registry asset ids,
 * one batched read, return each Registry-named with its current version or null (not yet
 * generated — the same honest-not-broken treatment already used for idle executives).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { newModelOff } from '@/lib/api/response'
import { getCurrentContract } from '@/lib/mandate/contract'
import { getCurrentAssetsForProgram, getVersionCounts } from '@/lib/assets/versioning'
import { getProgram, getAsset } from '@/lib/registry'
import { log } from '@/lib/logger'
import { getAnchorFounderId } from '@/lib/team/founder-permissions'

export async function GET(): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const supabase = await createClient()

    // Team data anchors to the startup owner's founder_id, not whichever teammate is
    // logged in — see getAnchorFounderId's own doc comment.
    const anchorId = await getAnchorFounderId(auth.user.id, supabase)
    if (!anchorId) return NextResponse.json({ error: 'No workspace found' }, { status: 400 })

    const contract = await getCurrentContract(supabase, anchorId)
    if (!contract || contract.status !== 'confirmed') {
      return NextResponse.json({ assets: [] })
    }

    // Deduped, Registry-resolved, degrading exactly as buildProgress does: an active Program id
    // the Registry no longer knows must not 500 this route. ownerByAssetId piggybacks on the
    // same walk — F09's artifact organization needs to know who made each document, and the
    // Registry already has the answer (an Asset's owning Program's owner), so this is free.
    const assetIds = new Set<string>()
    const ownerByAssetId = new Map<string, string>()
    // Known narrow gap: a shared Asset (AssetDef.sharedWith, e.g. AS004 under both P001 and
    // P002) only ever gets ONE entry here — whichever Program is processed last in
    // contract.activePrograms wins. It'll show under exactly one Program tab, not both.
    // Fixing that means deciding whether a shared Asset should render twice, which is a real
    // product question, not a bug to silently patch here — left as a known follow-up.
    const programByAssetId = new Map<string, string>()
    for (const templateId of contract.activePrograms) {
      let program
      try { program = getProgram(templateId) } catch { continue }
      for (const assetId of program.assets) {
        assetIds.add(assetId)
        ownerByAssetId.set(assetId, program.owner)
        programByAssetId.set(assetId, templateId)
      }
    }

    const [versions, versionCounts] = await Promise.all([
      getCurrentAssetsForProgram(supabase, anchorId, [...assetIds]),
      getVersionCounts(supabase, anchorId, [...assetIds]),
    ])
    const versionByAssetId = new Map(versions.map(v => [v.assetId, v]))

    const assets = [...assetIds].map(id => {
      const def = getAsset(id)
      return {
        id: def.id,
        name: def.name,
        outputSchema: def.outputSchema,
        executiveId: ownerByAssetId.get(id) ?? null,
        programTemplateId: programByAssetId.get(id) ?? null,
        asset: versionByAssetId.get(id) ?? null,
        versionCount: versionCounts.get(id) ?? 0,
      }
    })

    return NextResponse.json({ assets })
  } catch (err) {
    log.error('GET /api/assets', { err })
    return NextResponse.json({ error: 'Failed to load assets' }, { status: 500 })
  }
}
