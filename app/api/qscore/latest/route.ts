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

    // Query via view — includes deltas from previous_score_id join
    let latest: Record<string, unknown> | null = null;
    const { data: viewData, error: viewError } = await supabase
      .from('qscore_with_delta')
      .select('*')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    if (!viewError || viewError.code === 'PGRST116') {
      latest = viewData;
    } else {
      // View unavailable — fall back to direct table query (no delta columns)
      console.warn('qscore_with_delta view error, falling back to direct query:', viewError.message);
      const { data: directData, error: directError } = await supabase
        .from('qscore_history')
        .select('id, user_id, overall_score, percentile, grade, market_score, product_score, gtm_score, financial_score, team_score, traction_score, calculated_at, ai_actions, data_source, source_artifact_type, score_version, iq_breakdown, available_iq, track')
        .eq('user_id', user.id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      if (directError && directError.code !== 'PGRST116') {
        console.error('Error fetching Q-Score:', directError);
        return NextResponse.json({ error: 'Failed to fetch Q-Score' }, { status: 500 });
      }
      latest = directData;
    }

    if (!latest) {
      return NextResponse.json({ qScore: null });
    }

    // Extract RAG metadata from ai_actions (if available)
    const aiActions = latest.ai_actions as Record<string, Record<string, unknown>> | null;
    const ragEval = aiActions?.rag_eval;
    const ragMetadata = ragEval ? {
      scoringMethod: (ragEval.scoringMethod as string) ?? 'heuristic',
      ragConfidence: (ragEval.ragConfidence as number) ?? 0,
      evidenceSummary: (ragEval.evidenceSummary as string[]) ?? [],
    } : null;

    // ── Temporal decay (computed on read, stored score never modified) ─────
    // Scores degrade presentation-only once 90 days pass without reassessment.
    // This ensures investors see recency-adjusted signals without cron jobs.
    const daysSince = Math.floor(
      (Date.now() - new Date(latest.calculated_at as string).getTime()) / 86400000
    );
    const decayFactor =
      daysSince < 90  ? 1.00 :
      daysSince < 180 ? 0.975 :
      daysSince < 270 ? 0.95 :
      daysSince < 365 ? 0.90 : 0.80;
    const decayApplied = decayFactor < 1.0;
    const rawOverall = num(latest.overall_score);
    const effectiveOverall = decayApplied
      ? Math.max(1, Math.round(rawOverall * decayFactor))
      : rawOverall;

    // ── Score confidence interval (±X) ───────────────────────────────────────
    // Higher RAG confidence + Stripe-verified data = tighter interval.
    // Formula: ±round(10 × (1 - ragConfidence) × dataPenalty)
    // dataPenalty: 1.0 if all self-reported, 0.7 if some Stripe-verified
    const ragConf = ragMetadata?.ragConfidence ?? 0;
    const dataSource = (latest.data_source as string) ?? '';
    const hasVerifiedData = dataSource.includes('stripe') || ragConf > 0.6;
    const dataPenalty = hasVerifiedData ? 0.7 : 1.0;
    const scoreRange = Math.max(2, Math.round(10 * (1 - ragConf) * dataPenalty));

    const scoreVersion = (latest.score_version as string) ?? 'v2_iq'
    const iqBreakdown = (latest.iq_breakdown as Record<string, unknown>) ?? null
    const availableIQ = (latest.available_iq as number) ?? null
    const track = (latest.track as string) ?? null
    // partialIQ and answeredParameters are stored inside iq_breakdown by the submit route
    const partialIQ = (iqBreakdown?.partialIQ as number | undefined) ?? null
    const answeredParameters = (iqBreakdown?.answeredParameters as number | undefined) ?? null

    const qScore = {
      overall: effectiveOverall,
      rawOverall,
      decayApplied,
      decayFactor,
      daysSince,
      scoreRange, // ±N — consumers show as "72 ±5"
      percentile: latest.percentile,
      grade: latest.grade,
      change: num(latest.overall_change),
      ragMetadata,
      scoreVersion,
      iqBreakdown,
      availableIQ,
      track,
      partialIQ,
      answeredParameters,
      breakdown: {
        market: {
          score: latest.market_score,
          weight: 0.20,
          change: num(latest.market_change),
          trend: getTrend(num(latest.market_change)),
        },
        product: {
          score: latest.product_score,
          weight: 0.18,
          change: num(latest.product_change),
          trend: getTrend(num(latest.product_change)),
        },
        goToMarket: {
          score: latest.gtm_score,
          weight: 0.17,
          change: num(latest.gtm_change),
          trend: getTrend(num(latest.gtm_change)),
        },
        financial: {
          score: latest.financial_score,
          weight: 0.18,
          change: num(latest.financial_change),
          trend: getTrend(num(latest.financial_change)),
        },
        team: {
          score: latest.team_score,
          weight: 0.15,
          change: num(latest.team_change),
          trend: getTrend(num(latest.team_change)),
        },
        traction: {
          score: latest.traction_score,
          weight: 0.12,
          change: num(latest.traction_change),
          trend: getTrend(num(latest.traction_change)),
        },
      },
      calculatedAt: new Date(latest.calculated_at as string),
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

function num(v: unknown): number {
  return typeof v === 'number' ? v : 0;
}
