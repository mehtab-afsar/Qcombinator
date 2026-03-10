/**
 * Q-Score RAG Answer Evaluator
 *
 * Uses an LLM-as-judge to evaluate the substance and specificity of founder
 * assessment answers. Replaces character-count heuristics with true semantic
 * quality scoring.
 *
 * Single LLM call per assessment — evaluates all text fields at once.
 * Falls back to heuristic estimates if the LLM call fails.
 */

import { callOpenRouter } from '@/lib/openrouter';
import { AssessmentData } from '../types/qscore.types';
import { SemanticEvaluation, AnswerQualityScores, MarketValidation } from './types';
import {
  retrieveScoringRubrics,
  retrieveBenchmarkContext,
  inferSector,
} from './retrieval';

// ─────────────────────────────────────────────────────────────────────────────
// HEURISTIC FALLBACKS (used when LLM evaluation fails)
// ─────────────────────────────────────────────────────────────────────────────

/** Estimate quality from text length + specificity signals (fallback only) */
function heuristicQuality(text: string | undefined, minGoodLength = 150): number {
  if (!text || text.trim().length === 0) return 5;

  const len = text.trim().length;
  // Specificity signals: numbers, dates, names, percentages, dollar amounts
  const specificityPattern =
    /\b(\d+%|\$[\d,]+|\d+[KMB]|\d{1,2}\/\d{4}|Q[1-4] \d{4}|[A-Z][a-z]+ [A-Z][a-z]+|[A-Z]{2,}\b)/g;
  const specificityMatches = (text.match(specificityPattern) || []).length;

  let score = 20; // base
  if (len >= minGoodLength) score += 20;
  if (len >= minGoodLength * 2) score += 15;
  score += Math.min(specificityMatches * 8, 30);

  // Negative: AI hallmark phrases
  const aiPhrases = [
    'leveraging', 'synerg', 'paradigm', 'holistic', 'seamlessly', 'scalable and robust',
    'state-of-the-art', 'best-in-class', 'world-class', 'disruptive innovation',
  ];
  const aiCount = aiPhrases.filter(p => text.toLowerCase().includes(p)).length;
  score -= aiCount * 5;

  return Math.max(5, Math.min(95, score));
}

/** Build heuristic fallback scores from assessment data */
function buildHeuristicScores(data: AssessmentData): AnswerQualityScores {
  return {
    problemStory: heuristicQuality(data.problemStory, 200),
    advantageExplanation: heuristicQuality(data.advantageExplanation, 150),
    customerQuote: heuristicQuality(data.customerQuote, 100),
    customerSurprise: heuristicQuality(data.customerSurprise, 100),
    failedBelief: heuristicQuality(data.failedBelief, 100),
    failedDiscovery: heuristicQuality(data.failedDiscovery, 100),
    icpDescription: heuristicQuality(data.gtm?.icpDescription, 150),
    messagingResults: heuristicQuality(data.gtm?.messagingResults, 100),
  };
}

/** Build heuristic market validation from raw numbers */
function buildHeuristicMarketValidation(data: AssessmentData): MarketValidation {
  const conv = data.conversionRate ?? 0;
  const ltv = data.lifetimeValue ?? 0;
  const cac = data.costPerAcquisition ?? 0;
  const ratio = cac > 0 ? ltv / cac : 0;

  return {
    tamRealistic: 'realistic',
    conversionRateRealistic:
      conv > 10 ? 'unrealistic' : conv >= 0.5 ? 'realistic' : 'optimistic',
    ltvCacRealistic:
      ratio > 20 ? 'unrealistic' : ratio >= 3 ? 'realistic' : 'optimistic',
    benchmarkContext: 'Benchmark data unavailable — using heuristic fallback.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

/** Build the fields object to include in the LLM evaluation prompt */
function extractEvaluationFields(data: AssessmentData): Record<string, string> {
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
// MARKET VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/** Validate market claims against retrieved benchmarks using LLM */
async function validateMarketClaims(
  data: AssessmentData,
  benchmarkContext: string
): Promise<MarketValidation> {
  const conv = data.conversionRate ?? null;
  const ltv = data.lifetimeValue ?? null;
  const cac = data.costPerAcquisition ?? null;
  const ratio = ltv && cac && cac > 0 ? (ltv / cac).toFixed(1) : null;

  // If no market data, return neutral
  if (!conv && !ltv && !cac) {
    return {
      tamRealistic: 'realistic',
      conversionRateRealistic: 'realistic',
      ltvCacRealistic: 'realistic',
      benchmarkContext: 'No market metrics provided.',
    };
  }

  const prompt = `You are a startup investor evaluating market assumptions.

FOUNDER'S MARKET METRICS:
- Conversion Rate: ${conv !== null ? conv + '%' : 'not provided'}
- LTV: ${ltv !== null ? '$' + ltv : 'not provided'}
- CAC: ${cac !== null ? '$' + cac : 'not provided'}
- LTV:CAC Ratio: ${ratio ?? 'not calculable'}

INDUSTRY BENCHMARKS:
${benchmarkContext}

Evaluate each metric as "realistic", "optimistic", or "unrealistic" based on the benchmarks.
Return ONLY valid JSON, no explanation:
{
  "tamRealistic": "realistic" | "optimistic" | "unrealistic",
  "conversionRateRealistic": "realistic" | "optimistic" | "unrealistic",
  "ltvCacRealistic": "realistic" | "optimistic" | "unrealistic"
}`;

  try {
    const raw = await callOpenRouter(
      [{ role: 'user', content: prompt }],
      { maxTokens: 150, temperature: 0.1 }
    );
    const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const valid = (v: unknown): v is 'realistic' | 'optimistic' | 'unrealistic' =>
      v === 'realistic' || v === 'optimistic' || v === 'unrealistic';

    return {
      tamRealistic: valid(parsed.tamRealistic) ? parsed.tamRealistic : 'realistic',
      conversionRateRealistic: valid(parsed.conversionRateRealistic) ? parsed.conversionRateRealistic : 'realistic',
      ltvCacRealistic: valid(parsed.ltvCacRealistic) ? parsed.ltvCacRealistic : 'realistic',
      benchmarkContext,
    };
  } catch {
    return buildHeuristicMarketValidation(data);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ANSWER QUALITY EVALUATION (core RAG step)
// ─────────────────────────────────────────────────────────────────────────────

/** Default scores for missing fields */
const DEFAULT_FIELD_SCORE = 15;

/** Parse the LLM's quality score JSON response into typed scores */
function parseQualityScores(
  raw: string,
  fields: Record<string, string>
): AnswerQualityScores {
  const fallback = (fieldName: keyof AnswerQualityScores, data?: Record<string, string>) => {
    if (data && data[fieldName]) return heuristicQuality(data[fieldName]);
    return DEFAULT_FIELD_SCORE;
  };

  try {
    const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const clamp = (v: unknown): number => {
      const n = typeof v === 'number' ? v : parseInt(String(v), 10);
      return isNaN(n) ? DEFAULT_FIELD_SCORE : Math.max(0, Math.min(100, n));
    };

    return {
      problemStory: parsed.problemStory !== undefined ? clamp(parsed.problemStory) : fallback('problemStory', fields),
      advantageExplanation: parsed.advantageExplanation !== undefined ? clamp(parsed.advantageExplanation) : fallback('advantageExplanation', fields),
      customerQuote: parsed.customerQuote !== undefined ? clamp(parsed.customerQuote) : fallback('customerQuote', fields),
      customerSurprise: parsed.customerSurprise !== undefined ? clamp(parsed.customerSurprise) : fallback('customerSurprise', fields),
      failedBelief: parsed.failedBelief !== undefined ? clamp(parsed.failedBelief) : fallback('failedBelief', fields),
      failedDiscovery: parsed.failedDiscovery !== undefined ? clamp(parsed.failedDiscovery) : fallback('failedDiscovery', fields),
      icpDescription: parsed.icpDescription !== undefined ? clamp(parsed.icpDescription) : fallback('icpDescription', fields),
      messagingResults: parsed.messagingResults !== undefined ? clamp(parsed.messagingResults) : fallback('messagingResults', fields),
    };
  } catch {
    // Full fallback
    return {
      problemStory: fallback('problemStory', fields),
      advantageExplanation: fallback('advantageExplanation', fields),
      customerQuote: fallback('customerQuote', fields),
      customerSurprise: fallback('customerSurprise', fields),
      failedBelief: fallback('failedBelief', fields),
      failedDiscovery: fallback('failedDiscovery', fields),
      icpDescription: fallback('icpDescription', fields),
      messagingResults: fallback('messagingResults', fields),
    };
  }
}

/**
 * Build the LLM evaluation prompt with retrieved rubric context.
 */
function buildEvaluationPrompt(
  fields: Record<string, string>,
  rubricContext: string
): string {
  const fieldEntries = Object.entries(fields)
    .map(([k, v]) => `[${k}]: "${v.slice(0, 600)}"`)
    .join('\n\n');

  return `You are an expert startup investor scoring founder assessment answers.

SCORING RUBRICS (use these as your benchmark):
${rubricContext}

FOUNDER'S ANSWERS:
${fieldEntries}

Score each answer from 0–100 based on SUBSTANCE and SPECIFICITY, not length:
- 0–30: Generic, vague, could apply to any startup, or clearly AI-generated
- 31–60: Somewhat specific, some real details but missing depth
- 61–80: Specific, verifiable details, shows genuine experience
- 81–100: Highly specific, concrete data (names, numbers, dates), compelling narrative

Only include fields in your response that were provided above.
Return ONLY valid JSON with scores for the provided fields:
{
  "problemStory": <number>,
  "advantageExplanation": <number>,
  "customerQuote": <number>,
  "customerSurprise": <number>,
  "failedBelief": <number>,
  "failedDiscovery": <number>,
  "icpDescription": <number>,
  "messagingResults": <number>
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate founder assessment answers using RAG + LLM-as-judge.
 *
 * Steps:
 * 1. Extract text fields from assessment data
 * 2. Retrieve scoring rubrics from knowledge base
 * 3. Call LLM to score each field 0–100 for substance/specificity
 * 4. Retrieve market benchmarks and validate market claims
 * 5. Return SemanticEvaluation (or fallback if LLM fails)
 *
 * This replaces character-count heuristics in dimension calculators.
 */
export async function evaluateAssessmentAnswers(
  data: AssessmentData
): Promise<SemanticEvaluation> {
  const fields = extractEvaluationFields(data);
  const sector = inferSector(data);

  // If no text fields to evaluate, return heuristics immediately
  if (Object.keys(fields).length === 0) {
    return {
      answerQuality: buildHeuristicScores(data),
      marketValidation: buildHeuristicMarketValidation(data),
      retrievedChunkIds: [],
      evaluatedAt: new Date(),
      success: false,
      errorMessage: 'No text fields to evaluate',
    };
  }

  // Retrieve relevant scoring rubrics for the fields being evaluated
  const rubricContext = retrieveScoringRubrics(Object.keys(fields));

  // Retrieve market benchmark context for validation
  const benchmarkContext = retrieveBenchmarkContext(sector, 'market');

  // Track which chunks were used
  const retrievedChunkIds: string[] = [];

  try {
    // 1. Evaluate answer quality (single LLM call)
    const evaluationPrompt = buildEvaluationPrompt(fields, rubricContext);

    const [qualityRaw, marketValidation] = await Promise.all([
      callOpenRouter(
        [{ role: 'user', content: evaluationPrompt }],
        { maxTokens: 300, temperature: 0.1 }
      ),
      validateMarketClaims(data, benchmarkContext),
    ]);

    const answerQuality = parseQualityScores(qualityRaw, fields);

    return {
      answerQuality,
      marketValidation,
      retrievedChunkIds,
      evaluatedAt: new Date(),
      success: true,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn('[RAG evaluator] LLM evaluation failed, using heuristics:', errorMessage);

    return {
      answerQuality: buildHeuristicScores(data),
      marketValidation: buildHeuristicMarketValidation(data),
      retrievedChunkIds,
      evaluatedAt: new Date(),
      success: false,
      errorMessage,
    };
  }
}

/**
 * Quick heuristic-only evaluation (no LLM call).
 * Used for rate-limiting or cost-saving fallback.
 */
export function evaluateAssessmentHeuristic(data: AssessmentData): SemanticEvaluation {
  return {
    answerQuality: buildHeuristicScores(data),
    marketValidation: buildHeuristicMarketValidation(data),
    retrievedChunkIds: [],
    evaluatedAt: new Date(),
    success: true, // heuristic = always succeeds
  };
}
