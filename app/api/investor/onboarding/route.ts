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

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Investor onboarding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
