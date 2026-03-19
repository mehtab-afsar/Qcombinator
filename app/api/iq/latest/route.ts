import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadLatestIQScore } from '@/features/iq/calculators/iq-orchestrator';
import { fetchIndicatorConfig } from '@/features/iq/calculators/indicator-scorer';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    );

    const [iqScore, configs] = await Promise.all([
      loadLatestIQScore(user.id, serviceClient),
      fetchIndicatorConfig(serviceClient),
    ]);

    if (!iqScore) {
      // Check if a Q-Score was just calculated (< 30s ago) — IQ write may still be in flight
      const { data: recentQScore } = await serviceClient
        .from('qscore_history')
        .select('calculated_at')
        .eq('user_id', user.id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      const calculating =
        !!recentQScore &&
        Date.now() - new Date(recentQScore.calculated_at).getTime() < 30_000;

      return NextResponse.json({ iqScore: null, calculating });
    }

    // Enrich indicator names from config
    const configMap = new Map(configs.map(c => [c.code, c]));
    const enriched = {
      ...iqScore,
      indicators: iqScore.indicators.map(ind => ({
        ...ind,
        name: configMap.get(ind.code)?.name ?? ind.code,
        unit: configMap.get(ind.code)?.unit ?? '',
      })),
    };

    return NextResponse.json({ iqScore: enriched });
  } catch (error) {
    console.error('[IQ Latest] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
