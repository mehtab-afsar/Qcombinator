/**
 * What happens once a founder's profile has real company data, shared by both signup paths:
 * email/password (app/api/auth/signup) and Google OAuth (app/api/auth/complete-profile).
 *
 * Split out so the two routes can't drift — before this, OAuth sign-ups never got the LLM
 * text cleanup, the portfolio auto-link, or the welcome notification, purely because the
 * OAuth path was added later and this logic lived inline in the email/password route.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'
import { routedText } from '@/lib/llm/router'
import { trackFounderSignedUp } from '@/lib/analytics'

/** Tidy the founder's own words — typos and grammar only, never rewritten meaning. */
export async function enrichOnboardingText(
  userId: string,
  problemStatement: string | undefined,
  targetCustomer: string | undefined,
  supabase: SupabaseClient,
): Promise<void> {
  if (!problemStatement && !targetCustomer) return

  const prompt = `You are cleaning startup onboarding responses. Fix typos and grammar only — preserve the founder's meaning exactly. Do not add, remove, or reinterpret ideas.

Problem statement (raw): "${problemStatement ?? ''}"
Ideal customer (raw): "${targetCustomer ?? ''}"

Return ONLY valid JSON, no markdown fences:
{
  "problemStatementCleaned": "...",
  "targetCustomerCleaned": "...",
  "problemSummary": "One clear sentence: what they build and who it's for."
}`

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('LLM enrichment timeout')), 8_000)
  )
  try {
    const raw = await Promise.race([
      routedText('extraction', [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Clean and summarise.' },
      ]),
      timeout,
    ])
    const cleaned = JSON.parse(
      raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    ) as { problemStatementCleaned?: string; targetCustomerCleaned?: string; problemSummary?: string }
    await supabase.rpc('merge_startup_profile_data', {
      p_user_id: userId,
      p_patch: {
        problemStatementCleaned: cleaned.problemStatementCleaned ?? undefined,
        targetCustomerCleaned:   cleaned.targetCustomerCleaned   ?? undefined,
        problemSummary:          cleaned.problemSummary          ?? undefined,
      },
    })
  } catch (err) {
    log.warn('Onboarding text enrichment failed — raw text retained', {
      userId,
      err: err instanceof Error ? err.message : String(err),
    })
  }
}

/** Link a newly onboarded founder to an investor who pre-added their email to a portfolio. */
export async function autoLinkPortfolioByEmail(
  userId: string,
  email: string,
  founderProfileId: string,
  supabase: SupabaseClient,
): Promise<void> {
  try {
    const { data: match } = await supabase
      .from('investor_portfolio_companies')
      .select('id, investor_user_id, company_name')
      .eq('founder_email', email.toLowerCase())
      .eq('invite_status', 'not_sent')
      .limit(1)
      .single()

    if (!match) return

    const { data: investorProfile } = await supabase
      .from('investor_profiles')
      .select('id')
      .eq('user_id', match.investor_user_id)
      .single()

    await Promise.all([
      supabase
        .from('investor_portfolio_companies')
        .update({ founder_user_id: userId, invite_status: 'accepted', joined_at: new Date().toISOString() })
        .eq('id', match.id),

      supabase
        .from('founder_profiles')
        .update({ portfolio_investor_id: investorProfile?.id ?? null })
        .eq('id', founderProfileId),

      supabase
        .from('investor_pipeline')
        .upsert({ investor_user_id: match.investor_user_id, founder_user_id: userId, stage: 'portfolio' },
                 { onConflict: 'investor_user_id,founder_user_id' }),

      // 'accepted' (not 'pending') — per the connection_requests status state machine
      // (app/api/investor/connections/route.ts), this status is specifically for
      // auto-created connections like this one. The investor already expressed intent by
      // pre-adding this company to their portfolio; the other three mutations above already
      // treat the relationship as live (invite_status: 'accepted', pipeline stage: 'portfolio')
      // — creating this row as 'pending' would leave it the only piece not matching that.
      supabase
        .from('connection_requests')
        .upsert(
          { founder_id: userId, investor_id: match.investor_user_id, status: 'accepted', personal_message: 'Auto-linked via portfolio email match', founder_qscore: 0 },
          { onConflict: 'founder_id,investor_id', ignoreDuplicates: true }
        ),

      supabase.from('notifications').insert({
        user_id:  match.investor_user_id,
        type:     'message',
        title:    `${match.company_name} just joined Edge Alpha`,
        body:     'They signed up organically and were auto-linked to your portfolio.',
        metadata: { founder_user_id: userId },
      }),
    ])
  } catch (err) {
    log.warn('[onboarding] autoLinkPortfolioByEmail failed (non-fatal)', { userId, err })
  }
}

/** The welcome notification + signup analytics event — the two purely cosmetic side effects. */
export async function notifyAndTrackSignup(
  userId: string,
  fullName: string,
  method: 'email' | 'google',
  supabase: SupabaseClient,
): Promise<void> {
  void Promise.resolve().then(() => trackFounderSignedUp(userId, { method }))
  await supabase.from('notifications').insert({
    user_id:  userId,
    type:     'qscore_update',
    title:    `Welcome to Edge Alpha, ${fullName.split(' ')[0]}!`,
    body:     'Your profile is set up. Complete your Q-Score profile to appear in investor deal flow.',
    metadata: { action: 'profile-builder', href: '/founder/profile-builder' },
    read:     false,
  })
}
