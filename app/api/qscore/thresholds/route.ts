import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { fetchQScoreThresholds, invalidateQScoreThresholdCache } from '@/features/qscore/services/threshold-config';

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

/** GET /api/qscore/thresholds — all active tiers + dimension weights */
export async function GET() {
  try {
    const sc = service();

    const [thresholdMap, weightsData] = await Promise.all([
      fetchQScoreThresholds(sc),
      sc.from('qscore_dimension_weights').select('*').order('sector').order('dimension'),
    ]);

    // Convert Map to plain object for JSON
    const thresholds: Record<string, unknown[]> = {};
    for (const [key, tiers] of thresholdMap.entries()) {
      thresholds[key] = tiers;
    }

    return NextResponse.json({ thresholds, weights: weightsData.data ?? [] });
  } catch (error) {
    console.error('[QScore Thresholds GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/qscore/thresholds — admin update a single tier row
 * Body: { dimension, metric, tierRank, minValue?, maxValue?, points?, label?, isActive? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('founder_profiles').select('role').eq('user_id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { dimension, metric, tierRank, minValue, maxValue, points, label, isActive } = body;

    if (!dimension || !metric || tierRank == null) {
      return NextResponse.json({ error: 'dimension, metric, tierRank required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (minValue !== undefined) updates.min_value = minValue;
    if (maxValue !== undefined) updates.max_value = maxValue;
    if (points !== undefined) updates.points = points;
    if (label !== undefined) updates.label = label;
    if (isActive !== undefined) updates.is_active = isActive;

    const { data: updated, error } = await service()
      .from('qscore_thresholds')
      .update(updates)
      .eq('dimension', dimension)
      .eq('metric', metric)
      .eq('tier_rank', tierRank)
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });

    invalidateQScoreThresholdCache();
    return NextResponse.json({ updated });
  } catch (error) {
    console.error('[QScore Thresholds PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/qscore/thresholds/weights — update a dimension weight
 * Body: { sector, dimension, weight }
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('founder_profiles').select('role').eq('user_id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { sector, dimension, weight } = await request.json();
    if (!sector || !dimension || weight == null) {
      return NextResponse.json({ error: 'sector, dimension, weight required' }, { status: 400 });
    }

    const { data: updated, error } = await service()
      .from('qscore_dimension_weights')
      .update({ weight, updated_at: new Date().toISOString() })
      .eq('sector', sector)
      .eq('dimension', dimension)
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });

    invalidateQScoreThresholdCache();
    return NextResponse.json({ updated });
  } catch (error) {
    console.error('[QScore Weights PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
