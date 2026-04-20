import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

// Handles the OAuth redirect from Google (and any other provider).
// Exchanges the code for a session, then routes the user by role.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? null

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    log.error('GET /auth/callback', { err: error })
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  // Honor explicit ?next= (only relative paths)
  if (next && next.startsWith('/')) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  // Route by role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  const { data: investorProfile } = await supabase
    .from('investor_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (investorProfile) {
    return NextResponse.redirect(`${origin}/investor/dashboard`)
  }

  const { data: founderProfile } = await supabase
    .from('founder_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (founderProfile) {
    return NextResponse.redirect(`${origin}/founder/dashboard`)
  }

  // New user with no profile — send to founder onboarding
  return NextResponse.redirect(`${origin}/founder/onboarding`)
}
