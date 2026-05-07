/**
 * RAG Scoring Orchestrator
 *
 * Central entry point that replaces the direct `evaluateAssessmentAnswers()` call
 * in `calculate/route.ts`. Orchestrates all 3 RAG layers:
 *
 *   Layer 1: Semantic Rubric Scoring (rubric-scorer.ts)
 *   Layer 2: Internal Evidence RAG (evidence/ — pgvector cross-referencing)
 *   Layer 3: Benchmark RAG (benchmarks/ — sector-specific benchmarks)
 *
 * Falls back gracefully to the existing evaluateAssessmentAnswers() on any failure.
 */

import { AssessmentData } from '../types/qscore.types';
import {
  evaluateAssessmentAnswers,
  evaluateAssessmentHeuristic,
} from './answer-evaluator';
import { scoreWithRubrics } from './rubrics/rubric-scorer';
import { blendScores, calculateRAGConfidence } from './score-blender';
import { assembleEvidenceContext } from './evidence/context-assembler';
import { adjustScoresWithEvidence } from './evidence/evidence-scorer';
import type { EnhancedSemanticEvaluation } from './types';
import { log } from '@/lib/logger'

// ─────────────────────────────────────────────────────────────────────────────
// Field Extraction (mirrors answer-evaluator.ts)
// ─────────────────────────────────────────────────────────────────────────────

function extractFields(data: AssessmentData): Record<string, string> {
  const fields: Record<string, string> = {};
  if (data.problemStory?.trim()) fields.problemStory = data.problemStory.trim();
  if (data.advantageExplanation?.trim()) fields.advantageExplanation = data.advantageExplanation.trim();
  if (data.customerQuote?.trim()) fields.customerQuote = data.customerQuote.trim();
  if (data.customerSurprise?.trim()) fields.customerSurprise = data.customerSurprise.trim();
  if (data.failedBelief?.trim()) fields.failedBelief = data.failedBelief.trim();
  if (data.failedDiscovery?.trim()) fields.failedDiscovery = data.failedDiscovery.trim();
  if (data.gtm?.icpDescription?.trim()) fields.icpDescription = data.gtm.icpDescription.trim();
  if (data.gtm?.messagingResults?.trim()) fields.messagingResults = data.gtm.messagingResults.trim();
  return fields;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────

/** Non-blocking: log per-dimension RAG scores to rag_execution_logs */
async function logDimensionScores(
  userId: string,
  scoringMethod: string,
  ragConfidence: number,
  blendedQuality: Record<string, number>,
  latencyMs: number,
): Promise<void> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const rows = Object.entries(blendedQuality).map(([dimension, score]) => ({
      user_id:        userId,
      dimension,
      final_score:    score,
      scoring_method: scoringMethod,
      rag_confidence: ragConfidence,
      latency_ms:     latencyMs,
    }));
    if (rows.length > 0) {
      void supabase.from('rag_execution_logs').insert(rows);
    }
  } catch {
    // Non-critical
  }
}

/**
 * Run the full RAG scoring pipeline.
 *
 * Flow:
 * 1. Extract text fields from assessment
 * 2. Run rubric-aware LLM scoring (batched, parallel)
 * 3. Get heuristic scores as baseline
 * 4. Blend RAG + heuristic based on confidence
 * 5. Run evidence cross-reference (pgvector search against user's artifacts)
 * 6. Run market validation with benchmarks (via existing evaluator)
 * 7. Return EnhancedSemanticEvaluation
 *
 * Falls back entirely to evaluateAssessmentAnswers() on critical failure.
 *
 * @param data - Assessment form data
 * @param userId - Optional user ID for evidence lookup (Phase 2)
 */
export async function runRAGScoring(
  data: AssessmentData,
  userId?: string
): Promise<EnhancedSemanticEvaluation> {
  const fields = extractFields(data);

  // No text fields → immediate heuristic fallback
  if (Object.keys(fields).length === 0) {
    const heuristic = evaluateAssessmentHeuristic(data);
    return {
      ...heuristic,
      ragConfidence: 0,
      scoringMethod: 'heuristic',
    };
  }

  const t0 = Date.now();

  try {
    // Run in parallel:
    // 1. Rubric-aware LLM scoring (Layer 1)
    // 2. Existing evaluator (heuristic + market validation)
    // 3. Evidence context (Layer 2 — currently stub)
    const [rubricResult, baselineEval, evidenceContext] = await Promise.all([
      scoreWithRubrics(fields),
      evaluateAssessmentAnswers(data),
      userId ? assembleEvidenceContext(userId, data) : Promise.resolve({
        corroborations: [],
        conflicts: [],
        unverified: 'all' as const,
        confidence: 0,
      }),
    ]);

    // Calculate RAG confidence based on rubric scoring success
    const ragConfidence = rubricResult.success
      ? calculateRAGConfidence(rubricResult.scores, Object.keys(fields).length)
      : 0;

    // Blend rubric scores with heuristic baseline
    let blendedQuality = rubricResult.success
      ? blendScores(rubricResult.scores, baselineEval.answerQuality, ragConfidence)
      : baselineEval.answerQuality;

    // Apply evidence adjustments (corroboration boosts, conflict penalties)
    const { adjusted: evidenceAdjusted, evidenceSummary } =
      adjustScoresWithEvidence(blendedQuality, evidenceContext);
    blendedQuality = evidenceAdjusted;

    // Determine scoring method
    const scoringMethod = !rubricResult.success
      ? 'heuristic' as const
      : ragConfidence > 0.3
        ? 'blended' as const
        : 'heuristic' as const;

    // Fire-and-forget per-dimension RAG logging
    if (userId) {
      void logDimensionScores(userId, scoringMethod, ragConfidence, blendedQuality as unknown as Record<string, number>, Date.now() - t0);
    }

    return {
      answerQuality: blendedQuality,
      marketValidation: baselineEval.marketValidation,
      retrievedChunkIds: baselineEval.retrievedChunkIds,
      evaluatedAt: new Date(),
      success: true,
      ragConfidence,
      evidenceSummary: evidenceSummary.length > 0 ? evidenceSummary : undefined,
      scoringMethod,
    };
  } catch (err) {
    // Critical failure — fall back entirely to existing evaluator
    const errorMessage = err instanceof Error ? err.message : String(err);
    log.warn('[RAG orchestrator] Failed, falling back to base evaluator:', errorMessage);

    try {
      const fallback = await evaluateAssessmentAnswers(data);
      return {
        ...fallback,
        ragConfidence: 0,
        scoringMethod: 'heuristic',
      };
    } catch {
      // Even the base evaluator failed — return pure heuristics
      const heuristic = evaluateAssessmentHeuristic(data);
      return {
        ...heuristic,
        ragConfidence: 0,
        scoringMethod: 'heuristic',
      };
    }
  }
}
