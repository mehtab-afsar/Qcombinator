import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { fetchIndicatorConfig, invalidateConfigCache } from '@/features/iq/calculators/indicator-scorer';

/** GET /api/iq/indicators — public read of all 25 indicator configs */
export async function GET() {
  try {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    );

    const configs = await fetchIndicatorConfig(serviceClient);
    return NextResponse.json({ indicators: configs });
  } catch (error) {
    console.error('[IQ Indicators GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/iq/indicators — admin-only threshold update.
 * Body: { code: '1.1', score1Max?: number, score3Max?: number, score5Min?: number, higherIsBetter?: boolean }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check — only service-role calls or admin users
    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { code, score1Max, score3Max, score5Min, higherIsBetter, isActive, benchmarkSource, notes } = body;

    if (!code) {
      return NextResponse.json({ error: 'indicator code is required' }, { status: 400 });
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    );

    // Build update object — only include fields that were provided
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (score1Max !== undefined) updates.score_1_max = score1Max;
    if (score3Max !== undefined) updates.score_3_max = score3Max;
    if (score5Min !== undefined) updates.score_5_min = score5Min;
    if (higherIsBetter !== undefined) updates.higher_is_better = higherIsBetter;
    if (isActive !== undefined) updates.is_active = isActive;
    if (benchmarkSource !== undefined) updates.benchmark_source = benchmarkSource;
    if (notes !== undefined) updates.notes = notes;

    const { data: updated, error: updateError } = await serviceClient
      .from('iq_indicators')
      .update(updates)
      .eq('code', code)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Invalidate in-memory config cache so next scoring uses new values
    invalidateConfigCache();

    return NextResponse.json({ updated });
  } catch (error) {
    console.error('[IQ Indicators PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
