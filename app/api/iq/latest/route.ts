import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/iq/latest
 *
 * Returns the most recent IQ Score for the authenticated user.
 * IQ Scores are computed asynchronously after Q-Score calculations,
 * so this may return { iqScore: null, calculating: true } if no row exists yet.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: row, error } = await supabase
      .from('iq_scores')
      .select('id, overall_score, normalized_score, grade, parameter_scores, indicators_used, indicators_excluded, scoring_method, sector, calculated_at, previous_score_id')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    if (error?.code === 'PGRST116' || !row) {
      // No IQ score calculated yet
      return NextResponse.json({ iqScore: null, calculating: false });
    }

    if (error) {
      console.error('[IQ latest] DB error:', error);
      return NextResponse.json({ error: 'Failed to fetch IQ Score' }, { status: 500 });
    }

    // Compute delta from previous row
    let delta: number | null = null;
    if (row.previous_score_id) {
      const { data: prev } = await supabase
        .from('iq_scores')
        .select('normalized_score')
        .eq('id', row.previous_score_id)
        .single();
      if (prev) delta = row.normalized_score - prev.normalized_score;
    }

    return NextResponse.json({
      iqScore: {
        id:                 row.id,
        overallScore:       row.overall_score,
        normalizedScore:    row.normalized_score,
        grade:              row.grade,
        parameterScores:    row.parameter_scores,
        indicatorsUsed:     row.indicators_used,
        indicatorsExcluded: row.indicators_excluded,
        scoringMethod:      row.scoring_method,
        sector:             row.sector,
        calculatedAt:       row.calculated_at,
        delta,
      },
      calculating: false,
    });
  } catch (err) {
    console.error('[IQ latest] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
