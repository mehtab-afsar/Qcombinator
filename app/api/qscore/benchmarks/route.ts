import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/qscore/benchmarks
 *
 * Returns per-dimension cohort percentile ranks for the authenticated founder.
 * Uses latest qscore_history row per user across all founders.
 *
 * Response: { market: 35, product: 72, goToMarket: 28, financial: 45, team: 80, traction: 38, overall: 41 }
 * All values = percentage of founders scoring BELOW this user (higher = better).
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all users' latest score rows (one per user, ordered by most recent first)
    const { data: allRows, error } = await supabase
      .from('qscore_history')
      .select('user_id, overall_score, market_score, product_score, gtm_score, financial_score, team_score, traction_score, calculated_at')
      .order('calculated_at', { ascending: false });

    if (error || !allRows || allRows.length === 0) {
      return NextResponse.json({ benchmarks: null });
    }

    // De-duplicate: keep only the latest row per user
    const latestByUser = new Map<string, typeof allRows[0]>();
    for (const row of allRows) {
      if (!latestByUser.has(row.user_id)) {
        latestByUser.set(row.user_id, row);
      }
    }
    const cohort = Array.from(latestByUser.values());

    // Current user's scores
    const mine = latestByUser.get(user.id);
    if (!mine) return NextResponse.json({ benchmarks: null });

    type ScoreRow = { overall_score: number; market_score: number; product_score: number; gtm_score: number; financial_score: number; team_score: number; traction_score: number };

    function pct(myScore: number, col: keyof ScoreRow): number {
      const scores = cohort.map(r => ((r as unknown as ScoreRow)[col]) ?? 0);
      const below  = scores.filter(s => s < myScore).length;
      return Math.round((below / scores.length) * 100);
    }

    const m = mine as unknown as ScoreRow;
    const benchmarks = {
      overall:    pct(m.overall_score   ?? 0, 'overall_score'),
      market:     pct(m.market_score    ?? 0, 'market_score'),
      product:    pct(m.product_score   ?? 0, 'product_score'),
      goToMarket: pct(m.gtm_score       ?? 0, 'gtm_score'),
      financial:  pct(m.financial_score ?? 0, 'financial_score'),
      team:       pct(m.team_score      ?? 0, 'team_score'),
      traction:   pct(m.traction_score  ?? 0, 'traction_score'),
      cohortSize: cohort.length,
    };

    return NextResponse.json({ benchmarks });
  } catch (err) {
    console.error('Benchmarks error:', err);
    return NextResponse.json({ benchmarks: null });
  }
}
