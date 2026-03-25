import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { calculatePRDQScore } from '@/features/qscore/calculators/prd-aligned-qscore';
import { AssessmentData, calculateGrade } from '@/features/qscore/types/qscore.types';
import { detectBluffSignals, applyBluffPenalty, createEvidenceConflictSignals } from '@/features/qscore/utils/bluff-detection';
import type { EnhancedSemanticEvaluation } from '@/features/qscore/rag/types';
import { runRAGScoring } from '@/features/qscore/rag/rag-orchestrator';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runGTMDiagnostics } from '@/features/qscore/diagnostics/gtm-diagnostics';
import { fetchQScoreThresholds, fetchDimensionWeights } from '@/features/qscore/services/threshold-config';
import { loadKnowledgeBase } from '@/features/qscore/rag/retrieval';
import {
  saveMetricSnapshot,
  computeCohortScores,
  extractMetrics,
} from '@/features/qscore/services/cohort-scorer';

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

    // ── Load DB thresholds + sector weights (1h cache) ─────────────────────
    const { data: founderProfileForWeights } = await supabase
      .from('founder_profiles')
      .select('sector, stripe_account_id')
      .eq('user_id', user.id)
      .single();

    const adminForConfig = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    );

    const sectorKey = (() => {
      const s = (founderProfileForWeights?.sector ?? '').toLowerCase();
      if (s.includes('deep') || s.includes('hardware')) return 'deeptech';
      if (s.includes('health') || s.includes('bio')) return 'healthtech';
      if (s.includes('fin') || s.includes('payment')) return 'fintech';
      if (s.includes('climate') || s.includes('clean')) return 'climatetech';
      if (s.includes('consumer')) return 'consumer';
      if (s.includes('edu')) return 'edtech';
      return 'default';
    })();

    const [qscoreThresholds, dimensionWeights] = await Promise.all([
      fetchQScoreThresholds(adminForConfig),
      fetchDimensionWeights(adminForConfig, sectorKey),
      loadKnowledgeBase(adminForConfig), // DB-backed knowledge chunks (1h cache)
    ]);

    // ── Build data-source map before scoring ───────────────────────────────
    // Marks key numeric fields with their provenance so the calculator can apply
    // source multipliers (Stripe 1.0×, document 0.85×, self-reported 0.55×).
    const stripeConnected = !!(founderProfileForWeights?.stripe_account_id);
    const data = assessmentData as AssessmentData;
    const dataSourceMap: import('@/features/qscore/types/qscore.types').DataSourceMap = {};

    if (stripeConnected) {
      // Financial fields — Stripe verifies these
      if (data.financial?.mrr)         dataSourceMap.mrr         = 'stripe';
      if (data.financial?.arr)         dataSourceMap.arr         = 'stripe';
      if (data.financial?.monthlyBurn) dataSourceMap.monthlyBurn = 'stripe';
      if (data.financial?.runway)      dataSourceMap.runway      = 'stripe';
    } else {
      // No external source — mark populated financial fields as self_reported
      if (data.financial?.mrr)         dataSourceMap.mrr         = 'self_reported';
      if (data.financial?.arr)         dataSourceMap.arr         = 'self_reported';
      if (data.financial?.monthlyBurn) dataSourceMap.monthlyBurn = 'self_reported';
      if (data.financial?.runway)      dataSourceMap.runway      = 'self_reported';
    }

    // Market fields are always self-reported until LinkedIn enrichment (Phase 2)
    if (data.targetCustomers)    dataSourceMap.targetCustomers    = 'self_reported';
    if (data.lifetimeValue)      dataSourceMap.lifetimeValue      = 'self_reported';
    if (data.conversionRate)     dataSourceMap.conversionRate     = 'self_reported';
    if (data.costPerAcquisition) dataSourceMap.costPerAcquisition = 'self_reported';

    // Attach to assessmentData for the calculator
    (assessmentData as AssessmentData).dataSourceMap = dataSourceMap;

    // ── RAG: Enhanced semantic evaluation ──────────────────────────────────
    // Runs 3-layer RAG pipeline: rubric scoring → evidence lookup → benchmark
    // validation. Falls back gracefully to heuristics on any failure.
    const ragStart = Date.now();
    const semanticEval = await runRAGScoring(assessmentData as AssessmentData, user.id);
    const ragLatencyMs = Date.now() - ragStart;
    if (!semanticEval.success) {
      console.warn('[Q-Score RAG] Semantic eval failed, using heuristics:', semanticEval.errorMessage);
    }

    // Fire-and-forget RAG execution log — never block the scoring response
    const enhanced = semanticEval as EnhancedSemanticEvaluation;
    void createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    ).from('rag_execution_logs').insert({
      user_id:                 user.id,
      scoring_method:          enhanced.scoringMethod ?? 'heuristic',
      rag_confidence:          enhanced.ragConfidence ?? 0,
      latency_ms:              ragLatencyMs,
      answer_quality:          enhanced.answerQuality ?? null,
      evidence_corroborations: (enhanced.evidenceSummary ?? []).filter((s: string) => s.startsWith('✓')).length,
      evidence_conflicts:      (enhanced.evidenceSummary ?? []).filter((s: string) => s.startsWith('✗')).length,
      error_msg:               semanticEval.success ? null : ((semanticEval as { errorMessage?: string }).errorMessage ?? 'unknown error'),
    });

    // Calculate new Q-Score — with DB thresholds + sector weights + RAG
    const qScore = calculatePRDQScore(
      assessmentData as AssessmentData,
      previousScoreData || undefined,
      semanticEval,
      qscoreThresholds,
      dimensionWeights
    );

    // Run bluff detection — penalize inflated/AI-generated inputs
    const bluffSignals = detectBluffSignals(assessmentData as AssessmentData, dataSourceMap);

    // Add evidence conflict signals from RAG layer (if any)
    if (enhanced.evidenceSummary?.some(s => s.startsWith('✗'))) {
      // Extract conflict details from the evidence summary
      const conflictSummaries = enhanced.evidenceSummary.filter(s => s.startsWith('✗'));
      const conflictSignals = createEvidenceConflictSignals(
        conflictSummaries.map(s => ({
          claim: s.slice(3, 83),
          evidence: s,
          artifactType: 'agent_artifact',
        }))
      );
      bluffSignals.push(...conflictSignals);
    }

    if (bluffSignals.length > 0) {
      qScore.overall = applyBluffPenalty(qScore.overall, bluffSignals);
      qScore.grade = calculateGrade(qScore.overall);
    }

    // ── Apply verified score_evidence boosts ───────────────────────────────
    // Founders can attach verified proof (LOI, Stripe screenshot, patent) — boost
    // those dimension scores before calculating the final overall.
    const { data: verifiedEvidence } = await supabase
      .from('score_evidence')
      .select('dimension, points_awarded')
      .eq('user_id', user.id)
      .eq('status', 'verified');

    if (verifiedEvidence && verifiedEvidence.length > 0) {
      // Sum points per dimension
      const evidenceBoosts: Record<string, number> = {};
      for (const e of verifiedEvidence) {
        if (e.dimension && (e.points_awarded ?? 0) > 0) {
          evidenceBoosts[e.dimension] = (evidenceBoosts[e.dimension] ?? 0) + (e.points_awarded ?? 0);
        }
      }
      // Apply to breakdown (dimension key 'gtm' maps to 'goToMarket' in breakdown)
      const dimMap: Record<string, keyof typeof qScore.breakdown> = {
        market:    'market',
        product:   'product',
        gtm:       'goToMarket',
        goToMarket:'goToMarket',
        financial: 'financial',
        team:      'team',
        traction:  'traction',
      };
      let boosted = false;
      for (const [dim, pts] of Object.entries(evidenceBoosts)) {
        const key = dimMap[dim];
        if (key && qScore.breakdown[key]) {
          qScore.breakdown[key].score = Math.min(100, qScore.breakdown[key].score + pts);
          boosted = true;
        }
      }
      if (boosted) {
        // Recalculate overall using the sector weights already embedded in breakdown
        qScore.overall = Math.min(100, Math.round(
          qScore.breakdown.market.score     * (qScore.breakdown.market.weight     ?? 0.20) +
          qScore.breakdown.product.score    * (qScore.breakdown.product.weight    ?? 0.18) +
          qScore.breakdown.goToMarket.score * (qScore.breakdown.goToMarket.weight ?? 0.17) +
          qScore.breakdown.financial.score  * (qScore.breakdown.financial.weight  ?? 0.18) +
          qScore.breakdown.team.score       * (qScore.breakdown.team.weight       ?? 0.15) +
          qScore.breakdown.traction.score   * (qScore.breakdown.traction.weight   ?? 0.12),
        ));
        qScore.grade = calculateGrade(qScore.overall);
      }
    }

    // Calculate percentile (compare to cohort)
    const percentile = await calculatePercentile(qScore.overall, user.id, supabase);

    // ── Compute cohort scores + GTM diagnostics before INSERT so they persist ──
    const [cohortScores, gtmDiagnostics] = await Promise.all([
      computeCohortScores(adminForConfig, user.id, sectorKey, qScore.breakdown),
      Promise.resolve(runGTMDiagnostics(assessmentData as AssessmentData)),
    ]);

    // Save Q-Score to history (include previous_score_id to form a chain)
    const { data: savedScore, error: saveError } = await supabase
      .from('qscore_history')
      .insert({
        user_id: user.id,
        previous_score_id: previousScoreData?.id ?? null,
        overall_score: qScore.overall,
        percentile,
        grade: qScore.grade,
        market_score: qScore.breakdown.market.score,
        product_score: qScore.breakdown.product.score,
        gtm_score: qScore.breakdown.goToMarket.score,
        financial_score: qScore.breakdown.financial.score,
        team_score: qScore.breakdown.team.score,
        traction_score: qScore.breakdown.traction.score,
        assessment_data: assessmentData,
        ai_actions: { rag_eval: semanticEval },
        cohort_scores:   cohortScores   ?? null,
        gtm_diagnostics: gtmDiagnostics ?? null,
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

    // Update founder profile assessment status + signal strength + integrity index
    const { computeSignalSnapshot } = await import('@/features/qscore/services/signal-strength');
    const { signalStrength, integrityIndex } = computeSignalSnapshot(
      assessmentData as Record<string, unknown>,
      stripeConnected,
      bluffSignals.filter(s => s.severity === 'high').length,
      (enhanced.evidenceSummary ?? []).filter((s: string) => s.startsWith('✗')).length,
      0, // stripe delta flags checked at connect time
    );

    await supabase
      .from('founder_profiles')
      .update({
        assessment_completed: true,
        signal_strength:      signalStrength,
        integrity_index:      integrityIndex,
        updated_at:           new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // ── Fire-and-forget: save metric snapshot + IQ scoring ────────────────────
    // The snapshot feeds the cohort scorer for all future calculations.
    // Runs after the score is saved so qscore_history_id is available.
    void (async () => {
      const rawMetrics = extractMetrics(assessmentData as Record<string, unknown>);
      const dimScores = {
        market:     qScore.breakdown.market.score,
        product:    qScore.breakdown.product.score,
        goToMarket: qScore.breakdown.goToMarket.score,
        financial:  qScore.breakdown.financial.score,
        team:       qScore.breakdown.team.score,
        traction:   qScore.breakdown.traction.score,
      };
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await saveMetricSnapshot(
            adminForConfig, user.id, savedScore?.id ?? null,
            sectorKey, rawMetrics, dimScores, qScore.overall
          );
          break;
        } catch (snapshotErr) {
          if (attempt === 2) console.error('[Q-Score] Metric snapshot failed after retry:', snapshotErr);
          else await new Promise(r => setTimeout(r, 1000));
        }
      }
    })();

    // ── Fire-and-forget: IQ Score computation ─────────────────────────────────
    // Runs async so it never delays the Q-Score response.
    void (async () => {
      try {
        const { computeIQScore, saveIQScore } = await import('@/features/iq/calculators/iq-calculator');
        // Fetch previous IQ score id for chain
        const { data: prevIQ } = await adminForConfig
          .from('iq_scores')
          .select('id')
          .eq('user_id', user.id)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .single();
        const iqResult = await computeIQScore(adminForConfig, assessmentData as AssessmentData, sectorKey);
        await saveIQScore(adminForConfig, user.id, iqResult, prevIQ?.id ?? null, sectorKey);
      } catch (iqErr) {
        console.warn('[Q-Score] IQ Score computation failed:', iqErr);
      }
    })();

    // ── Fire-and-forget: momentum + behavioural scoring ───────────────────────
    void (async () => {
      try {
        const { updateMomentum } = await import('@/features/qscore/services/momentum');
        const { computeBehaviouralScore } = await import('@/features/qscore/services/behavioural-scoring');
        await Promise.all([
          updateMomentum(adminForConfig, user.id, founderProfileForWeights?.sector ?? null),
          computeBehaviouralScore(adminForConfig, user.id),
        ]);

        // Gate visibility when signal_strength < 40
        const freshProfile = await adminForConfig
          .from('founder_profiles')
          .select('signal_strength')
          .eq('user_id', user.id)
          .single();
        const ss = freshProfile.data?.signal_strength ?? null;
        if (ss !== null) {
          await adminForConfig
            .from('founder_profiles')
            .update({ visibility_gated: ss < 40 })
            .eq('user_id', user.id);
        }
      } catch (bhErr) {
        console.warn('[Q-Score] Momentum/behavioural update failed:', bhErr);
      }
    })();

    return NextResponse.json({
      qScore: {
        ...qScore,
        percentile,
        // cohortScores is null until MIN_COHORT_SIZE (30) founders have scored.
        // When present, these are percentile-based scores (0–100) per dimension.
        cohortScores,
      },
      savedScore,
      // Diagnostics — included so the frontend can show the causal link:
      // "Your GTM score is 42 because your ICP Clarity is weak (D1 score: 28)"
      // and route to: /founder/agents/patel?challenge=gtm
      diagnostics: {
        gtm: gtmDiagnostics,
        dataSourceMap,
        stripeConnected,
      },
    });
  } catch (error) {
    console.error('Error calculating Q-Score:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Calculate percentile rank compared to cohort via SQL RPC.
// Uses DISTINCT ON per user in Postgres — O(log n) vs previous O(n) JS scan.
async function calculatePercentile(
  score: number,
  _userId: string,
  supabase: SupabaseClient
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('compute_qscore_percentile', {
      target_score: Math.round(score),
    });
    if (error) {
      console.error('[Percentile] RPC error:', error);
      return 50;
    }
    return (data as number) ?? 50;
  } catch (err) {
    console.error('[Percentile] Error:', err);
    return 50;
  }
}
