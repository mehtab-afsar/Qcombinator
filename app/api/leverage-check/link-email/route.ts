/**
 * POST /api/leverage-check/link-email — public, anonymous. Attaches an email to an already-
 * created leverage-check submission, fired only when the visitor uses the final "Build my 10×
 * Operating Model" CTA. Separate from /submit since it's a distinct, later action against an
 * existing row, not a new submission.
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
      .from('leverage_check_submissions')
      .update({ email: parsed.data.email })
      .eq('id', parsed.data.submissionId)

    if (error) {
      log.error('leverage-check link-email: update failed', { error })
      return NextResponse.json({ error: 'Failed to save email' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('leverage-check link-email error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
