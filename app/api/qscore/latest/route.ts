import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Single query via view — includes deltas from previous_score_id join
    const { data: latest, error } = await supabase
      .from('qscore_with_delta')
      .select('*')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching Q-Score:', error);
      return NextResponse.json({ error: 'Failed to fetch Q-Score' }, { status: 500 });
    }

    if (!latest) {
      return NextResponse.json({ qScore: null });
    }

    const qScore = {
      overall: latest.overall_score,
      percentile: latest.percentile,
      grade: latest.grade,
      change: latest.overall_change ?? 0,
      breakdown: {
        market: {
          score: latest.market_score,
          weight: 0.20,
          change: latest.market_change ?? 0,
          trend: getTrend(latest.market_change ?? 0),
        },
        product: {
          score: latest.product_score,
          weight: 0.18,
          change: latest.product_change ?? 0,
          trend: getTrend(latest.product_change ?? 0),
        },
        goToMarket: {
          score: latest.gtm_score,
          weight: 0.17,
          change: latest.gtm_change ?? 0,
          trend: getTrend(latest.gtm_change ?? 0),
        },
        financial: {
          score: latest.financial_score,
          weight: 0.18,
          change: latest.financial_change ?? 0,
          trend: getTrend(latest.financial_change ?? 0),
        },
        team: {
          score: latest.team_score,
          weight: 0.15,
          change: latest.team_change ?? 0,
          trend: getTrend(latest.team_change ?? 0),
        },
        traction: {
          score: latest.traction_score,
          weight: 0.12,
          change: latest.traction_change ?? 0,
          trend: getTrend(latest.traction_change ?? 0),
        },
      },
      calculatedAt: new Date(latest.calculated_at),
    };

    return NextResponse.json({ qScore });
  } catch (error) {
    console.error('Error fetching latest Q-Score:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getTrend(change: number): 'up' | 'down' | 'neutral' {
  if (change > 2) return 'up';
  if (change < -2) return 'down';
  return 'neutral';
}
