import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { getAdminClient } from '@/lib/supabase/server'
import { parseBody, completeProfileSchema } from '@/lib/api/validate'
import { log } from '@/lib/logger'
import { mapStage, mapIndustry, mapRevenue } from '@/features/founder/services/signup-mappings.service'
import { enrichOnboardingText, autoLinkPortfolioByEmail, notifyAndTrackSignup } from '@/features/founder/services/complete-onboarding.service'

/**
 * Finishes onboarding for a founder who signed up with Google.
 *
 * A Google sign-up already has an authenticated session and a founder_profiles STUB — created by
 * /auth/callback the moment they authenticate (name + email from Google, onboarding_completed:
 * false, so they aren't orphaned if they close the tab mid-form). This route fills in the company
 * fields (steps 2–5 of onboarding) and flips the row to complete.
 *
 * Deliberately NOT app/api/auth/signup: that route creates a brand-new account with a password —
 * calling it for someone already authenticated via Google would try to register their email a
 * second time and collide.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const parsed = await parseBody(req, completeProfileSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const {
      startupName, companyName, website, industry, stage,
      revenueStatus, fundingStatus, teamSize,
      problemStatement, targetCustomer, location, tagline,
    } = parsed.data

    const admin = getAdminClient()

    const { data: existing, error: fetchErr } = await admin
      .from('founder_profiles')
      .select('id, full_name, onboarding_completed')
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (fetchErr || !existing) {
      // No stub means they didn't come through the OAuth callback — nothing to complete.
      return NextResponse.json({ error: 'No profile found for this account. Try signing in again.' }, { status: 404 })
    }
    if (existing.onboarding_completed) {
      return NextResponse.json({ error: 'Onboarding is already complete.' }, { status: 409 })
    }

    const baseStartupName = companyName || startupName || null
    const uniqueStartupName = baseStartupName ? `${baseStartupName}-${auth.user.id.slice(0, 6)}` : null

    const { data: profile, error: updateErr } = await admin
      .from('founder_profiles')
      .update({
        startup_name:       uniqueStartupName,
        industry:           mapIndustry(industry),
        stage:              mapStage(stage),
        company_name:       companyName || startupName || null,
        website:            website || null,
        revenue_status:     mapRevenue(revenueStatus),
        funding_status:     fundingStatus || null,
        team_size:          teamSize || null,
        founder_name:       existing.full_name, // no separate name collected — Google's is authoritative
        tagline:            tagline || null,
        location:           location || null,
        onboarding_completed:   true,
        registration_completed: true,
      })
      .eq('user_id', auth.user.id)
      .select()
      .single()

    if (updateErr || !profile) {
      log.error('[complete-profile] founder_profiles update failed', { userId: auth.user.id, err: updateErr })
      return NextResponse.json({ error: 'Could not save your profile. Please try again.' }, { status: 500 })
    }

    // Same side effects as email/password signup — see features/founder/services/complete-onboarding.service.ts.
    void enrichOnboardingText(auth.user.id, problemStatement, targetCustomer, admin)
    if (auth.user.email) {
      void autoLinkPortfolioByEmail(auth.user.id, auth.user.email, profile.id, admin)
    }
    void notifyAndTrackSignup(auth.user.id, existing.full_name ?? 'Founder', 'google')

    return NextResponse.json({ message: 'Profile completed', user: { id: auth.user.id } }, { status: 200 })
  } catch (err) {
    log.error('[complete-profile] unexpected error', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
