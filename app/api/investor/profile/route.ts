import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/investor/profile
// Returns the current investor's profile, including ai_personalization.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('investor_profiles')
      .select('full_name, firm_name, thesis, sectors, stages, ai_personalization')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('Investor profile GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
