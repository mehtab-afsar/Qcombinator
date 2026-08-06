/**
 * POST /api/assets/:id/direct — F09 Stage 4: direct an executive to rework this one Asset.
 *
 * Separate route from the sibling PUT on /api/assets/:id (that one is irreversibly the
 * founder-raw-edit path per its own docstring — a different verb-shaped action gets its own
 * route, not an overloaded body field). :id is a Registry AssetId. Thin: validate → call
 * lib/rhythm/direct.ts → return (CLAUDE.md §2).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody } from '@/lib/api/validate'
import { newModelOff } from '@/lib/api/response'
import { directAssetRework } from '@/lib/rhythm/direct'
import { RhythmError } from '@/lib/rhythm/errors'
import { JudgementError } from '@/lib/rhythm/judge'
import { AssetPersistenceError } from '@/lib/assets/validation'
import { getAsset, type AssetId } from '@/lib/registry'
import { log } from '@/lib/logger'

// Free-text into a prompt — capped at the boundary, same discipline as the founder-edit path
// (app/api/assets/[id]/route.ts's editSchema).
const bodySchema = z.object({
  instruction: z.string().trim().min(1).max(2_000),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await params
    try {
      getAsset(id)
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const parsed = await parseBody(req, bodySchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    // Service-role client: generateAssetContent's persistence call is revoked from
    // authenticated (same reason /api/rhythm/run uses it) — the caller is verified above, and
    // directAssetRework itself re-derives the founder's contract/Programs, never trusting a
    // client-supplied scope.
    const admin = createAdminClient()
    const version = await directAssetRework(admin, {
      founderId: auth.user.id,
      assetId: id as AssetId,
      instruction: parsed.data.instruction,
    })

    return NextResponse.json({ asset: version }, { status: 201 })
  } catch (err) {
    if (err instanceof RhythmError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    if (err instanceof JudgementError) {
      return NextResponse.json({ error: 'Could not generate a rework of this document. Try again.' }, { status: 502 })
    }
    if (err instanceof AssetPersistenceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.code === 'conflict' ? 409 : 500 })
    }
    log.error('POST /api/assets/[id]/direct', { err })
    return NextResponse.json({ error: 'Failed to direct a rework' }, { status: 500 })
  }
}
