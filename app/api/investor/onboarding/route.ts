import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody, investorOnboardingSchema } from '@/lib/api/validate'
import { log } from '@/lib/logger'

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
          onboarding_completed: true,
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

    return NextResponse.json({ success: true, profile })
  } catch (err) {
    log.error('POST /api/investor/onboarding', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
