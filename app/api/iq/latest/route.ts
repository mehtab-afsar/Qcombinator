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
      return NextResponse.json({ iqScore: null });
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
