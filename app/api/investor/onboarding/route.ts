import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody, investorOnboardingSchema } from '@/lib/api/validate'
import { log } from '@/lib/logger'
import { embedText } from '@/features/qscore/scoring/embeddings/embedder'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const parsed = await parseBody(request, investorOnboardingSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const {
      firstName = '', lastName = '', email,
      phone, linkedin,
      firmName, firmType, firmSize, aum, website, location,
      checkSize, stages, sectors, geography,
      thesis, dealFlow, decisionProcess, timeline,
    } = parsed.data

    const fullName = [firstName, lastName].filter(Boolean).join(' ') || (email ? email.split('@')[0] : 'Investor')

    const supabase = await createClient()

    // Pull the email_confirm_token from auth user metadata (set at signup)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const confirmToken = authUser?.user_metadata?.email_confirm_token as string | undefined ?? null

    const { data: profile, error } = await supabase
      .from('investor_profiles')
      .upsert(
        {
          user_id:             user.id,
          full_name:           fullName,
          email:               email || null,
          phone:               phone    || null,
          linkedin_url:        linkedin || null,
          firm_name:           firmName || null,
          firm_type:           firmType || null,
          firm_size:           firmSize || null,
          aum:                 aum      || null,
          website:             website  || null,
          location:            location || null,
          check_sizes:         checkSize       || [],
          stages:              stages          || [],
          sectors:             sectors         || [],
          geography:           geography       || [],
          thesis:              thesis          || null,
          deal_flow_strategy:  dealFlow        || null,
          decision_process:    decisionProcess || null,
          monthly_deal_volume: timeline        || null,
          subscription_tier:    'pro',
          onboarding_completed: true,
          email_confirm_token: confirmToken,    // migrate token from auth metadata to profile row
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) {
      log.error('investor/onboarding upsert failed', { err: error, userId: user.id })
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
    }

    // Also set role = 'investor' on founder_profiles if the user has one
    await supabase
      .from('founder_profiles')
      .update({ role: 'investor' })
      .eq('user_id', user.id)

    // Create / upsert demo_investors entry so founders can discover + connect with this investor
    try {
      const { data: existingDemoInv } = await supabase
        .from('investor_profiles')
        .select('demo_investor_id')
        .eq('user_id', user.id)
        .single()

      if (!existingDemoInv?.demo_investor_id) {
        const { data: demoRow } = await supabase
          .from('demo_investors')
          .insert({
            name:          fullName,
            firm:          firmName  || 'Independent',
            title:         'Partner',
            location:      location  || 'United States',
            check_sizes:   checkSize || [],
            stages:        stages    || [],
            sectors:       sectors   || [],
            geography:     geography || [],
            thesis:        thesis    || null,
            portfolio:     [],
            response_rate: 80,
            is_active:     true,
          })
          .select('id')
          .single()

        if (demoRow?.id) {
          await supabase
            .from('investor_profiles')
            .update({ demo_investor_id: demoRow.id })
            .eq('user_id', user.id)
        }
      } else {
        await supabase
          .from('demo_investors')
          .update({
            name:      fullName,
            firm:      firmName  || 'Independent',
            location:  location  || 'United States',
            check_sizes: checkSize || [],
            stages:      stages    || [],
            sectors:     sectors   || [],
            geography:   geography || [],
            thesis:      thesis    || null,
          })
          .eq('id', existingDemoInv.demo_investor_id)
      }
    } catch (demoErr) {
      log.warn('demo_investors upsert failed (non-fatal)', { err: demoErr, userId: user.id })
    }

    // fire-and-forget: embed investor thesis for semantic matching with founders
    // Stored in investor_profiles.thesis_embedding and used by /api/matching/scores
    if (process.env.VOYAGE_API_KEY && thesis) {
      void (async () => {
        try {
          const summary = [
            `Thesis: ${thesis}`,
            firmName && `Firm: ${firmName}`,
            sectors && sectors.length > 0 && `Sectors: ${sectors.join(', ')}`,
            stages && stages.length > 0 && `Stages: ${stages.join(', ')}`,
            checkSize && checkSize.length > 0 && `Check size: ${checkSize.join(', ')}`,
          ].filter(Boolean).join('\n')
          if (summary.length < 30) return
          const embedding = await embedText(summary)
          await supabase.from('investor_profiles')
            .update({ thesis_embedding: JSON.stringify(embedding) })
            .eq('user_id', user.id)
        } catch (err) {
          log.warn('[investor/onboarding] thesis embedding failed (non-fatal)', { userId: user.id, err })
        }
      })()
    }

    return NextResponse.json({ success: true, profile })
  } catch (err) {
    log.error('POST /api/investor/onboarding', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
