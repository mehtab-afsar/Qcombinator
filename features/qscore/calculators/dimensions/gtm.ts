/**
 * Go-to-Market (GTM) Dimension Scorer
 * Sources: GTM section (ICP, channels, messaging)
 * Scoring: ICP clarity (35), channel validation (35), messaging (30)
 *
 * RAG enhancement: replaces ICP char-count and messaging boolean with
 * LLM-evaluated substance scores that assess specificity of ICP definition
 * and richness of messaging test documentation.
 */

import { AssessmentData } from '../../types/qscore.types';
import { SemanticEvaluation } from '../../rag/types';

/** Map 0–100 quality score to a fraction of available points. Guards against NaN/Infinity. */
function semPts(qualityScore: number, maxPts: number): number {
  const q = isFinite(qualityScore) && !isNaN(qualityScore) ? qualityScore : 0;
  return Math.max(0, Math.round((Math.max(0, Math.min(100, q)) / 100) * maxPts));
}

export function calculateGTMScore(
  data: AssessmentData,
  semanticEval?: SemanticEvaluation
): {
  score: number;
  rawPoints: number;
  maxPoints: number;
} {
  let points = 0;
  const maxPoints = 100;

  // If no GTM data provided, return default score
  if (!data.gtm) {
    return { score: 50, rawPoints: 50, maxPoints: 100 };
  }

  const gtmData = data.gtm;
  const sq = semanticEval?.answerQuality;

  // ── 1. ICP Clarity (35 points) ────────────────────────────────────────────
  // RAG: LLM scores 0–100 on whether ICP includes: role/title, company size,
  //      industry, trigger event, and exclusion criteria.
  //      Score 80+ = full ICP with trigger. 40–79 = partial. <40 = vague.
  if (sq?.icpDescription !== undefined) {
    points += semPts(sq.icpDescription, 35);
  } else {
    // Fallback: original char-count heuristic
    const icpLength = gtmData.icpDescription?.length || 0;
    if (icpLength >= 200) points += 35;
    else if (icpLength >= 100) points += 25;
    else if (icpLength >= 50) points += 15;
    else points += 5;
  }

  // ── 2. Channel Testing & Validation (35 points) ──────────────────────────
  // Channels tried and CAC are numeric/structural — keep original logic

  const channelsTried = gtmData.channelsTried?.length || 0;
  const channelResults = gtmData.channelResults?.length || 0;
  const hasCAC = gtmData.currentCAC !== undefined && gtmData.currentCAC > 0;

  // Channels tried (15 pts)
  if (channelsTried >= 3) points += 15;
  else if (channelsTried >= 2) points += 12;
  else if (channelsTried >= 1) points += 8;
  else points += 3;

  // Channel results tracked (10 pts)
  if (channelResults >= 3) points += 10;
  else if (channelResults >= 2) points += 8;
  else if (channelResults >= 1) points += 5;

  // CAC validation (10 pts)
  if (hasCAC && gtmData.targetCAC) {
    const cacRatio = gtmData.currentCAC! / gtmData.targetCAC;
    if (cacRatio <= 1) points += 10;
    else if (cacRatio <= 1.5) points += 7;
    else if (cacRatio <= 2) points += 4;
    else points += 2;
  } else if (hasCAC) {
    points += 5;
  }

  // ── 3. Messaging & Positioning (30 points) ───────────────────────────────
  // RAG: LLM scores quality of messaging test documentation —
  //      does it include hypothesis, method, metric, result, action taken?
  if (sq?.messagingResults !== undefined) {
    // If tested: use semantic score to reward documentation quality (up to 30)
    // If not tested: still worth up to 10 pts for having a plan / context
    if (gtmData.messagingTested) {
      points += semPts(sq.messagingResults, 30);
    } else {
      // Not tested yet — scale 0–10 based on whether they have reasoning
      points += semPts(sq.messagingResults, 10);
    }
  } else {
    // Fallback: original boolean + char-count
    const hasResults = !!(gtmData.messagingResults && gtmData.messagingResults.length > 50);
    if (gtmData.messagingTested && hasResults) points += 30;
    else if (gtmData.messagingTested) points += 20;
    else points += 10;
  }

  // Normalize to 0-100, clamp both ends, guard NaN
  const raw = isFinite(points) ? Math.round((points / maxPoints) * 100) : 0;
  const score = Math.max(0, Math.min(100, raw));

  return { score, rawPoints: Math.max(0, points), maxPoints };
}
