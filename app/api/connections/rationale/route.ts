import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMatchRationale } from '@/features/matching/services/match-rationale'

/**
 * POST /api/connections/rationale
 * Body: MatchRationaleInput
 * Returns: { rationale: string }
 *
 * Called on-demand when founder expands an investor card.
 * Caches result in connection_requests.match_metadata when a connection is saved.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const rationale = await generateMatchRationale(body)
    return NextResponse.json({ rationale })
  } catch (err) {
    console.error('[connections/rationale]', err)
    return NextResponse.json({ rationale: '' }, { status: 200 })
  }
}
