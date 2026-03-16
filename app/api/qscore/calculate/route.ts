import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { calculatePRDQScore } from '@/features/qscore/calculators/prd-aligned-qscore';
import { AssessmentData, calculateGrade } from '@/features/qscore/types/qscore.types';
import { detectBluffSignals, applyBluffPenalty, createEvidenceConflictSignals } from '@/features/qscore/utils/bluff-detection';
import type { EnhancedSemanticEvaluation } from '@/features/qscore/rag/types';
import { runRAGScoring } from '@/features/qscore/rag/rag-orchestrator';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runIQScoring } from '@/features/iq/calculators/iq-orchestrator';
import { fetchQScoreThresholds, fetchDimensionWeights } from '@/features/qscore/services/threshold-config';
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
      .select('sector')
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
    ]);

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
    const bluffSignals = detectBluffSignals(assessmentData as AssessmentData);

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

    // Calculate percentile (compare to cohort)
    const percentile = await calculatePercentile(qScore.overall, user.id, supabase);

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
        // Store semantic eval result for debugging / future analytics
        // (stored under ai_actions.rag_eval so it doesn't break existing schema)
        ai_actions: { rag_eval: semanticEval },
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

    // ── Cohort scoring — compute percentile-based dimension scores ─────────────
    // Uses every founder's raw metric values to rank this founder relative to cohort.
    // Returns null when cohort is too small (< 100) — tier scoring stays as-is.
    const cohortScores = await computeCohortScores(
      adminForConfig,
      user.id,
      sectorKey,
      qScore.breakdown
    );

    // ── Fire-and-forget: save metric snapshot + IQ scoring ────────────────────
    // The snapshot feeds the cohort scorer for all future calculations.
    // Runs after the score is saved so qscore_history_id is available.
    void (async () => {
      try {
        const rawMetrics = extractMetrics(assessmentData as Record<string, unknown>);
        const dimScores = {
          market:     qScore.breakdown.market.score,
          product:    qScore.breakdown.product.score,
          goToMarket: qScore.breakdown.goToMarket.score,
          financial:  qScore.breakdown.financial.score,
          team:       qScore.breakdown.team.score,
          traction:   qScore.breakdown.traction.score,
        };
        await saveMetricSnapshot(
          adminForConfig,
          user.id,
          savedScore?.id ?? null,
          sectorKey,
          rawMetrics,
          dimScores,
          qScore.overall
        );
      } catch (snapshotErr) {
        console.warn('[Q-Score] Metric snapshot failed:', snapshotErr);
      }
    })();

    // ── Fire-and-forget IQ scoring (never blocks the Q-Score response) ────────
    const adminClientForIQ = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    );

    void (async () => {
      try {
        // Load latest artifacts for IQ resolver
        const { data: arts } = await adminClientForIQ
          .from('agent_artifacts')
          .select('agent_id, artifact_type, content')
          .eq('user_id', user.id)
          .in('artifact_type', ['financial_summary', 'hiring_plan', 'competitive_matrix'])
          .order('created_at', { ascending: false });

        const artifactBundle: Record<string, Record<string, unknown> | null> = {
          financial: null, hiring: null, competitive: null,
        };
        for (const art of (arts ?? []) as Array<{ artifact_type: string; content: Record<string, unknown> }>) {
          if (art.artifact_type === 'financial_summary' && !artifactBundle.financial) artifactBundle.financial = art.content;
          if (art.artifact_type === 'hiring_plan' && !artifactBundle.hiring) artifactBundle.hiring = art.content;
          if (art.artifact_type === 'competitive_matrix' && !artifactBundle.competitive) artifactBundle.competitive = art.content;
        }

        const { data: founderProfile } = await adminClientForIQ
          .from('founder_profiles')
          .select('sector, stage')
          .eq('user_id', user.id)
          .single();

        await runIQScoring({
          userId: user.id,
          supabase: adminClientForIQ,
          assessment: assessmentData as AssessmentData,
          artifacts: artifactBundle,
          profile: founderProfile ? { sector: founderProfile.sector, stage: founderProfile.stage } : null,
          skipTavily: false,
        });
      } catch (iqErr) {
        console.warn('[Q-Score] IQ scoring fire-and-forget failed:', iqErr);
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
  supabase: SupabaseClient
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
    allScores.forEach((record: { user_id: string; overall_score: number }) => {
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
