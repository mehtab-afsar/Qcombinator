import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const {
      // Step 1 — Personal Info
      firstName,
      lastName,
      email,
      phone,
      linkedin,

      // Step 2 — Firm Info
      firmName,
      firmType,
      firmSize,
      aum,
      website,
      location,

      // Step 3 — Investment Profile
      checkSize,
      stages,
      sectors,
      geography,

      // Step 4 — Thesis & Process
      thesis,
      dealFlow,
      decisionProcess,
      timeline,
    } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name and email are required' },
        { status: 400 }
      );
    }

    // Upsert so re-submitting the form updates rather than duplicates
    const { data: profile, error } = await supabase
      .from('investor_profiles')
      .upsert(
        {
          user_id: user.id,
          full_name: `${firstName} ${lastName}`,
          email,
          phone: phone || null,
          linkedin_url: linkedin || null,

          firm_name: firmName || null,
          firm_type: firmType || null,
          firm_size: firmSize || null,
          aum: aum || null,
          website: website || null,
          location: location || null,

          check_sizes: checkSize || [],
          stages: stages || [],
          sectors: sectors || [],
          geography: geography || [],

          thesis: thesis || null,
          deal_flow_strategy: dealFlow || null,
          decision_process: decisionProcess || null,
          monthly_deal_volume: timeline || null,

          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving investor profile:', error);
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
    }

    // Also set role = 'investor' on founder_profiles if the user has one
    // (handles the case where they signed up via the same auth flow)
    await supabase
      .from('founder_profiles')
      .update({ role: 'investor' })
      .eq('user_id', user.id);

    // Create / upsert a demo_investors entry so founders can discover + connect with this investor.
    // demo_investor_id is the bridge between connection_requests and this real investor's account.
    try {
      // Check if a demo_investors entry already exists for this investor (re-onboarding case)
      const { data: existingDemoInv } = await supabase
        .from('investor_profiles')
        .select('demo_investor_id')
        .eq('user_id', user.id)
        .single()

      if (!existingDemoInv?.demo_investor_id) {
        // Create a new demo_investors row from the investor's profile data
        const { data: demoRow } = await supabase
          .from('demo_investors')
          .insert({
            name:         `${firstName} ${lastName}`,
            firm:         firmName || 'Independent',
            title:        'Partner',
            location:     location || 'United States',
            check_sizes:  checkSize || [],
            stages:       stages || [],
            sectors:      sectors || [],
            geography:    geography || [],
            thesis:       thesis || null,
            portfolio:    [],
            response_rate: 80,
          })
          .select('id')
          .single()

        if (demoRow?.id) {
          // Store the demo_investor_id back on the investor_profile
          await supabase
            .from('investor_profiles')
            .update({ demo_investor_id: demoRow.id })
            .eq('user_id', user.id)
        }
      } else {
        // Update the existing demo_investors row with fresh data
        await supabase
          .from('demo_investors')
          .update({
            name:        `${firstName} ${lastName}`,
            firm:        firmName || 'Independent',
            location:    location || 'United States',
            check_sizes: checkSize || [],
            stages:      stages || [],
            sectors:     sectors || [],
            geography:   geography || [],
            thesis:      thesis || null,
          })
          .eq('id', existingDemoInv.demo_investor_id)
      }
    } catch (demoErr) {
      // Non-fatal — investor profile still saved
      console.error('demo_investors upsert error:', demoErr)
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Investor onboarding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
