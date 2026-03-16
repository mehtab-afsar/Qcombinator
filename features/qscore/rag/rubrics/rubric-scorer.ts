/**
 * Rubric-Aware LLM Scoring
 *
 * Splits 8 assessment fields into 2 batches by dimension affinity and scores
 * them in parallel via LLM calls with explicit rubric criteria.
 *
 * Batch A: Product fields (problemStory, customerQuote, customerSurprise, failedBelief, failedDiscovery)
 * Batch B: GTM + Team fields (icpDescription, messagingResults, advantageExplanation)
 */

import { callOpenRouter } from '@/lib/openrouter';
import { AnswerQualityScores } from '../types';
import {
  BATCH_A_FIELDS,
  BATCH_B_FIELDS,
  getRubricsForFields,
  formatRubricsForPrompt,
  type FieldRubric,
} from './rubric-data';

// ─────────────────────────────────────────────────────────────────────────────
// Prompt Builder
// ─────────────────────────────────────────────────────────────────────────────

function buildBatchPrompt(
  fields: Record<string, string>,
  rubrics: FieldRubric[]
): string {
  const rubricText = formatRubricsForPrompt(rubrics);
  const fieldEntries = Object.entries(fields)
    .map(([k, v]) => `[${k}]: "${v.slice(0, 600)}"`)
    .join('\n\n');

  return `You are an expert startup investor scoring founder assessment answers.

SCORING RUBRICS (use these as your calibration benchmark):
${rubricText}

FOUNDER'S ANSWERS:
${fieldEntries}

Score each answer from 0–100 based on the rubric tiers above.
Only score fields that appear in FOUNDER'S ANSWERS.
Return ONLY valid JSON mapping field names to numeric scores.
Example: { "problemStory": 65, "customerQuote": 42 }`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch Parser
// ─────────────────────────────────────────────────────────────────────────────

function parseBatchScores(raw: string): Record<string, number> {
  try {
    const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const result: Record<string, number> = {};
    for (const [key, val] of Object.entries(parsed)) {
      const n = typeof val === 'number' ? val : parseInt(String(val), 10);
      if (!isNaN(n)) {
        result[key] = Math.max(0, Math.min(100, n));
      }
    }
    return result;
  } catch {
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_SCORE = 15;

/**
 * Score assessment fields using structured rubrics via batched LLM calls.
 *
 * @param fields - Map of field name → founder's answer text
 * @returns AnswerQualityScores with LLM-evaluated scores (0-100)
 */
export async function scoreWithRubrics(
  fields: Record<string, string>
): Promise<{ scores: Partial<AnswerQualityScores>; success: boolean }> {
  // Split fields into batches
  const batchAFields: Record<string, string> = {};
  const batchBFields: Record<string, string> = {};

  for (const [key, value] of Object.entries(fields)) {
    if ((BATCH_A_FIELDS as readonly string[]).includes(key)) {
      batchAFields[key] = value;
    } else if ((BATCH_B_FIELDS as readonly string[]).includes(key)) {
      batchBFields[key] = value;
    }
  }

  // Get rubrics for each batch
  const batchARubrics = getRubricsForFields(BATCH_A_FIELDS);
  const batchBRubrics = getRubricsForFields(BATCH_B_FIELDS);

  // Build promises for non-empty batches
  const promises: Promise<Record<string, number>>[] = [];
  const batchConfigs: { fields: Record<string, string>; rubrics: FieldRubric[] }[] = [];

  if (Object.keys(batchAFields).length > 0) {
    batchConfigs.push({ fields: batchAFields, rubrics: batchARubrics });
  }
  if (Object.keys(batchBFields).length > 0) {
    batchConfigs.push({ fields: batchBFields, rubrics: batchBRubrics });
  }

  if (batchConfigs.length === 0) {
    return { scores: {}, success: false };
  }

  // Execute batches in parallel
  for (const config of batchConfigs) {
    const prompt = buildBatchPrompt(config.fields, config.rubrics);
    promises.push(
      callOpenRouter(
        [{ role: 'user', content: prompt }],
        { maxTokens: 200, temperature: 0.1 }
      ).then(parseBatchScores)
       .catch(() => ({})) // Per-batch graceful failure
    );
  }

  try {
    const results = await Promise.all(promises);

    // Merge all batch results
    const merged: Record<string, number> = {};
    for (const result of results) {
      Object.assign(merged, result);
    }

    // Check if we got meaningful results
    const scoredFields = Object.keys(merged).length;
    if (scoredFields === 0) {
      return { scores: {}, success: false };
    }

    // Build AnswerQualityScores (use DEFAULT_SCORE for missing fields)
    const scores: Partial<AnswerQualityScores> = {
      problemStory: merged.problemStory ?? DEFAULT_SCORE,
      advantageExplanation: merged.advantageExplanation ?? DEFAULT_SCORE,
      customerQuote: merged.customerQuote ?? DEFAULT_SCORE,
      customerSurprise: merged.customerSurprise ?? DEFAULT_SCORE,
      failedBelief: merged.failedBelief ?? DEFAULT_SCORE,
      failedDiscovery: merged.failedDiscovery ?? DEFAULT_SCORE,
      icpDescription: merged.icpDescription ?? DEFAULT_SCORE,
      messagingResults: merged.messagingResults ?? DEFAULT_SCORE,
    };

    return { scores, success: true };
  } catch {
    return { scores: {}, success: false };
  }
}
