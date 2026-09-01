/**
 * POST /api/qscore-lite/link-email — public, anonymous. Attaches an email to an already-created
 * Q-Score Lite lookup, fired only when the visitor uses the results page's email CTA. Byte-for-
 * byte the same shape as app/api/leverage-check/link-email/route.ts, targeting
 * qscore_lite_lookups instead.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminClient } from '@/lib/supabase/server'
import { parseBody } from '@/lib/api/validate'
import { log } from '@/lib/logger'

const bodySchema = z.object({
  submissionId: z.string().uuid(),
  email: z.string().email().max(320),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, bodySchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const admin = getAdminClient()
    const { error } = await admin
      .from('qscore_lite_lookups')
      .update({ email: parsed.data.email })
      .eq('id', parsed.data.submissionId)

    if (error) {
      log.error('qscore-lite link-email: update failed', { error })
      return NextResponse.json({ error: 'Failed to save email' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('qscore-lite link-email error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
