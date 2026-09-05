/**
 * POST /api/analytics/document-opened — a founder actually opened a generated Asset version or
 * Briefing. The in-app-queryable half of "did this land" that PostHog's briefing_opened can't
 * answer on its own (no query-back path exists anywhere in this codebase — see
 * docs/EDGE_ALPHA_HONEST_AUDIT.md). Thin by design (CLAUDE.md §2): validate -> look up the real
 * row -> insert. Never trusts asset_id/program_id from the client — both are re-derived
 * server-side from the row documentId actually points to, which doubles as the ownership check.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody, uuidSchema } from '@/lib/api/validate'
import { newModelOff } from '@/lib/api/response'
import { getAnchorFounderId } from '@/lib/team/founder-permissions'
import { log } from '@/lib/logger'

const bodySchema = z.object({
  documentType: z.enum(['asset_version', 'briefing']),
  documentId: uuidSchema,
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const parsed = await parseBody(req, bodySchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { documentType, documentId } = parsed.data

    // User-scoped client just to resolve the team anchor — RLS is not relied on for the
    // lookups below, since those need the service-role client to bypass select-own policies
    // for a teammate reading under the workspace owner's founder_id (see getAnchorFounderId).
    const supabase = await createClient()
    const anchorId = await getAnchorFounderId(auth.user.id, supabase)
    if (!anchorId) return NextResponse.json({ error: 'No workspace found' }, { status: 400 })

    const admin = createAdminClient()

    let assetId: string | null = null
    let programId: string | null = null

    if (documentType === 'asset_version') {
      const { data } = await admin
        .from('asset_versions')
        .select('asset_id, program_id')
        .eq('id', documentId)
        .eq('founder_id', anchorId)
        .maybeSingle()
      if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      assetId = data.asset_id
      programId = data.program_id
    } else {
      const { data } = await admin
        .from('executive_briefings')
        .select('program_id')
        .eq('id', documentId)
        .eq('founder_id', anchorId)
        .maybeSingle()
      if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      programId = data.program_id
    }

    const { error } = await admin.from('document_open_events').insert({
      founder_id: anchorId,
      document_type: documentType,
      document_id: documentId,
      asset_id: assetId,
      program_id: programId,
    })
    if (error) {
      log.error('POST /api/analytics/document-opened: insert failed', { error })
      return NextResponse.json({ error: 'Failed to record' }, { status: 500 })
    }

    return NextResponse.json({}, { status: 201 })
  } catch (err) {
    log.error('POST /api/analytics/document-opened', { err })
    return NextResponse.json({ error: 'Failed to record' }, { status: 500 })
  }
}
