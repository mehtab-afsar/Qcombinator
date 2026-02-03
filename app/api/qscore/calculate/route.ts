import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculatePRDQScore } from '@/lib/scoring/prd-aligned-qscore';
import { AssessmentData } from '@/lib/scoring/prd-types';

export async function POST(request: NextRequest) {
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

    // Get assessment data from request
    const { assessmentData } = await request.json();

    if (!assessmentData) {
      return NextResponse.json(
        { error: 'Assessment data is required' },
        { status: 400 }
      );
    }

    // Get previous Q-Score for trend calculation
    const { data: previousScoreData } = await supabase
      .from('qscore_history')
      .select('*')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    // Calculate new Q-Score
    const qScore = calculatePRDQScore(
      assessmentData as AssessmentData,
      previousScoreData || undefined
    );

    // Calculate percentile (compare to cohort)
    const percentile = await calculatePercentile(qScore.overall, user.id, supabase);

    // Save Q-Score to history
    const { data: savedScore, error: saveError } = await supabase
      .from('qscore_history')
      .insert({
        user_id: user.id,
        overall_score: qScore.overall,
        percentile,
        grade: qScore.grade,
        market_score: qScore.breakdown.market.score,
        product_score: qScore.breakdown.product.score,
        gtm_score: qScore.breakdown.goToMarket.score,
        financial_score: qScore.breakdown.financial.score,
        team_score: qScore.breakdown.team.score,
        traction_score: qScore.breakdown.traction.score,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving Q-Score:', saveError);
      return NextResponse.json(
        { error: 'Failed to save Q-Score' },
        { status: 500 }
      );
    }

    // Update founder profile assessment status
    await supabase
      .from('founder_profiles')
      .update({
        assessment_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return NextResponse.json({
      qScore: {
        ...qScore,
        percentile,
      },
      savedScore,
    });
  } catch (error) {
    console.error('Error calculating Q-Score:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Calculate percentile rank compared to cohort
async function calculatePercentile(
  score: number,
  userId: string,
  supabase: any
): Promise<number> {
  try {
    // Get all scores in the system
    const { data: allScores, error } = await supabase
      .from('qscore_history')
      .select('overall_score, user_id')
      .order('calculated_at', { ascending: false });

    if (error || !allScores || allScores.length === 0) {
      return 50; // Default to median if no data
    }

    // Get latest score per user (deduplicate)
    const latestScores = new Map<string, number>();
    allScores.forEach((record: any) => {
      if (!latestScores.has(record.user_id)) {
        latestScores.set(record.user_id, record.overall_score);
      }
    });

    const scores = Array.from(latestScores.values());

    // Calculate percentile: (# of scores below this score) / (total scores)
    const scoresBelow = scores.filter(s => s < score).length;
    const percentile = Math.round((scoresBelow / scores.length) * 100);

    return percentile;
  } catch (error) {
    console.error('Error calculating percentile:', error);
    return 50; // Default to median on error
  }
}
