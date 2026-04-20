import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

// GET /api/investor/profile
export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('investor_profiles')
      .select('full_name, firm_name, thesis, sectors, stages, ai_personalization')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({ profile })
  } catch (err) {
    log.error('GET /api/investor/profile', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
