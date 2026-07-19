/**
 * GET /api/assets/:id — the founder's current version of one Asset, plus its history.
 * PUT /api/assets/:id — the founder edits an Asset directly (ADR-007): a new immutable
 *                       current version, authored_by='founder', effective immediately.
 *                       No approval, no gate, no review stage (ADR-006/007).
 *
 * :id is a Registry AssetId ('AS001'). Thin by design: validate → call
 * lib/assets/versioning.ts → return (CLAUDE.md §2). Generic route, not per-asset.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody } from '@/lib/api/validate'
import { FF_NEW_EXECUTIVE_MODEL } from '@/lib/feature-flags'
import { getCurrentAsset, getAssetHistory, persistAssetVersion } from '@/lib/assets/versioning'
import { AssetPersistenceError } from '@/lib/assets/validation'
import { getAsset } from '@/lib/registry'
import { log } from '@/lib/logger'

/**
 * Content is founder-supplied and lands in layer 3 of an LLM prompt — so it is capped
 * (CLAUDE.md §3: validate at the boundary, unbounded input is unbounded spend). markdown
 * Assets send a string; json Assets send an object. The validation gate then checks the
 * shape matches the Registry's outputSchema for this Asset.
 */
const editSchema = z.object({
  content: z.union([
    z.string().trim().min(1).max(100_000),
    z.record(z.string(), z.unknown()),
  ]),
  updateReason: z.string().trim().max(500).optional(),
})

/** New model off by default (ADR-014): the route does not exist — 404, not 403. */
function flagOff(): NextResponse | null {
  if (FF_NEW_EXECUTIVE_MODEL) return null
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

/** Map a blocked persistence to an HTTP status. */
function statusFor(code: string): number {
  if (code === 'conflict') return 409                    // lost a concurrent race
  if (code === 'write_failed' || code === 'read_failed') return 500
  return 400                                             // unknown_asset, bad_structure, …
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const off = flagOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await params

    // Resolve the Registry definition first — an unknown Asset id is a 404, and the
    // page needs the name + output format to render the right editor (ADR-010).
    let definition
    try {
      const asset = getAsset(id)
      definition = { id: asset.id, name: asset.name, outputSchema: asset.outputSchema }
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // User-scoped client on purpose — RLS is the read tenancy boundary (SELECT-own).
    const supabase = await createClient()
    const [current, history] = await Promise.all([
      getCurrentAsset(supabase, auth.user.id, id),
      getAssetHistory(supabase, auth.user.id, id),
    ])

    return NextResponse.json({ definition, asset: current, history })
  } catch (err) {
    log.error('GET /api/assets/[id]', { err })
    return NextResponse.json({ error: 'Failed to load asset' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const off = flagOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await params
    const parsed = await parseBody(req, editSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    // The write path is server-side only (the persistence function is revoked from
    // authenticated), so this uses the service-role client — scoped explicitly to the
    // VERIFIED founder, never a client-supplied id.
    const admin = createAdminClient()
    const version = await persistAssetVersion(admin, {
      founderId: auth.user.id,
      assetId: id,
      authoredBy: 'founder',
      content: parsed.data.content,
      updateReason: parsed.data.updateReason ?? null,
    })

    return NextResponse.json({ asset: version }, { status: 201 })
  } catch (err) {
    if (err instanceof AssetPersistenceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusFor(err.code) })
    }
    log.error('PUT /api/assets/[id]', { err })
    return NextResponse.json({ error: 'Failed to save asset' }, { status: 500 })
  }
}
