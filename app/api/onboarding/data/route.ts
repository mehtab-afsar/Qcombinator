import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET: Returns the user's onboarding extracted data
 * Used by the assessment page to pre-populate fields
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('founder_profiles')
      .select('onboarding_extracted_data')
      .eq('user_id', user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ extractedData: {} });
    }

    return NextResponse.json({
      extractedData: profile.onboarding_extracted_data || {},
    });
  } catch (error) {
    console.error('Error fetching onboarding data:', error);
    return NextResponse.json({ extractedData: {} });
  }
}
