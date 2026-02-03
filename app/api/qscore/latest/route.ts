import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get latest Q-Score
    const { data: latestScore, error: scoreError } = await supabase
      .from('qscore_history')
      .select('*')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    if (scoreError && scoreError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is expected for new users
      console.error('Error fetching Q-Score:', scoreError);
      return NextResponse.json(
        { error: 'Failed to fetch Q-Score' },
        { status: 500 }
      );
    }

    // If no Q-Score exists, return null
    if (!latestScore) {
      return NextResponse.json({ qScore: null });
    }

    // Get previous score for trend calculation
    const { data: previousScore } = await supabase
      .from('qscore_history')
      .select('overall_score, market_score, product_score, gtm_score, financial_score, team_score, traction_score')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(2);

    let change = 0;
    let dimensionChanges = {};

    if (previousScore && previousScore.length === 2) {
      const current = previousScore[0];
      const previous = previousScore[1];

      change = current.overall_score - previous.overall_score;

      dimensionChanges = {
        market: current.market_score - previous.market_score,
        product: current.product_score - previous.product_score,
        goToMarket: current.gtm_score - previous.gtm_score,
        financial: current.financial_score - previous.financial_score,
        team: current.team_score - previous.team_score,
        traction: current.traction_score - previous.traction_score,
      };
    }

    // Format response to match PRDQScore interface
    const qScore = {
      overall: latestScore.overall_score,
      percentile: latestScore.percentile,
      grade: latestScore.grade,
      breakdown: {
        market: {
          score: latestScore.market_score,
          weight: 0.20,
          change: dimensionChanges.market || 0,
          trend: getTrend(dimensionChanges.market || 0),
        },
        product: {
          score: latestScore.product_score,
          weight: 0.18,
          change: dimensionChanges.product || 0,
          trend: getTrend(dimensionChanges.product || 0),
        },
        goToMarket: {
          score: latestScore.gtm_score,
          weight: 0.17,
          change: dimensionChanges.goToMarket || 0,
          trend: getTrend(dimensionChanges.goToMarket || 0),
        },
        financial: {
          score: latestScore.financial_score,
          weight: 0.18,
          change: dimensionChanges.financial || 0,
          trend: getTrend(dimensionChanges.financial || 0),
        },
        team: {
          score: latestScore.team_score,
          weight: 0.15,
          change: dimensionChanges.team || 0,
          trend: getTrend(dimensionChanges.team || 0),
        },
        traction: {
          score: latestScore.traction_score,
          weight: 0.12,
          change: dimensionChanges.traction || 0,
          trend: getTrend(dimensionChanges.traction || 0),
        },
      },
      calculatedAt: new Date(latestScore.calculated_at),
      change,
    };

    return NextResponse.json({ qScore });
  } catch (error) {
    console.error('Error fetching latest Q-Score:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getTrend(change: number): 'up' | 'down' | 'neutral' {
  if (change > 2) return 'up';
  if (change < -2) return 'down';
  return 'neutral';
}
