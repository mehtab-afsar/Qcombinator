/**
 * Team Dimension Scorer
 * Sources: Problem Origin, Unique Advantage, Resilience sections
 * Scoring: Domain expertise (40), team completeness (30), resilience (30)
 *
 * RAG enhancement: uses LLM-evaluated substance scores for narrative fields
 * instead of character-count and fragile keyword detection.
 */

import { AssessmentData } from '../../types/qscore.types';
import { SemanticEvaluation } from '../../rag/types';

/** Map 0–100 quality score to a fraction of available points. Guards against NaN/Infinity. */
function semPts(qualityScore: number, maxPts: number): number {
  const q = isFinite(qualityScore) && !isNaN(qualityScore) ? qualityScore : 0;
  return Math.max(0, Math.round((Math.max(0, Math.min(100, q)) / 100) * maxPts));
}

export function calculateTeamScore(
  data: AssessmentData,
  semanticEval?: SemanticEvaluation
): {
  score: number;
  rawPoints: number;
  maxPoints: number;
} {
  let points = 0;
  const maxPoints = 100;
  const sq = semanticEval?.answerQuality;

  // ── 1. Domain Expertise (40 points) ──────────────────────────────────────

  // Origin story quality (20 pts)
  // RAG: LLM evaluates whether story shows personal pain, specific role/company,
  //      quantified impact — vs. generic "I noticed a market gap" observer stories
  if (sq?.problemStory !== undefined) {
    points += semPts(sq.problemStory, 20);
  } else {
    // Fallback: original heuristics
    const originLength = data.problemStory?.length || 0;
    const hasPersonalExperience =
      data.problemStory?.toLowerCase().includes('i ') ||
      data.problemStory?.toLowerCase().includes('my ') ||
      data.problemStory?.toLowerCase().includes('we ');

    if (originLength >= 300 && hasPersonalExperience) points += 20;
    else if (originLength >= 200 && hasPersonalExperience) points += 17;
    else if (originLength >= 150) points += 14;
    else if (originLength >= 100) points += 10;
    else if (originLength > 0) points += 5;
  }

  // Unique advantage / unfair edge (20 pts)
  // RAG: LLM evaluates whether the advantage is structural (distribution, data,
  //      network effects, IP) vs. motivational ("we move fast")
  if (sq?.advantageExplanation !== undefined) {
    points += semPts(sq.advantageExplanation, 20);
  } else {
    // Fallback: original keyword heuristics
    const hasAdvantage = !!(data.advantageExplanation && data.advantageExplanation.length > 0);
    const advantageLength = data.advantageExplanation?.length || 0;
    const hasInsiderKnowledge =
      data.advantageExplanation?.toLowerCase().includes('experience') ||
      data.advantageExplanation?.toLowerCase().includes('worked') ||
      data.advantageExplanation?.toLowerCase().includes('industry');
    const hasNetwork =
      data.advantageExplanation?.toLowerCase().includes('network') ||
      data.advantageExplanation?.toLowerCase().includes('connection') ||
      data.advantageExplanation?.toLowerCase().includes('relationship');
    const hasTechnical =
      data.advantageExplanation?.toLowerCase().includes('technical') ||
      data.advantageExplanation?.toLowerCase().includes('engineer') ||
      data.advantageExplanation?.toLowerCase().includes('built');

    if (hasAdvantage) {
      const advantageCount = [hasInsiderKnowledge, hasNetwork, hasTechnical].filter(Boolean).length;
      if (advantageLength >= 200 && advantageCount >= 2) points += 20;
      else if (advantageLength >= 150 && advantageCount >= 2) points += 17;
      else if (advantageLength >= 100 && advantageCount >= 1) points += 14;
      else if (advantageLength >= 100) points += 10;
      else points += 5;
    } else {
      points += 2;
    }
  }

  // ── 2. Team Completeness (30 points) ─────────────────────────────────────
  // Team completeness is structural — keep original logic (does a co-founder exist)

  const hasCofounder =
    data.problemStory?.toLowerCase().includes('cofounder') ||
    data.problemStory?.toLowerCase().includes('co-founder') ||
    data.problemStory?.toLowerCase().includes('partner') ||
    data.problemStory?.toLowerCase().includes('founded with') ||
    data.advantageExplanation?.toLowerCase().includes('cofounder') ||
    data.advantageExplanation?.toLowerCase().includes('co-founder') ||
    false;

  const teamSize: number = 1; // Default to solo — field not in current assessment

  // Team size and composition (30 pts)
  if (teamSize >= 3) points += 15;
  else if (teamSize === 2) points += 12;
  else points += 6;

  // Complementary skills evidence (15 pts)
  if (hasCofounder) {
    const hasRoleClarity =
      data.advantageExplanation?.toLowerCase().includes('ceo') ||
      data.advantageExplanation?.toLowerCase().includes('cto') ||
      data.advantageExplanation?.toLowerCase().includes('technical') ||
      data.advantageExplanation?.toLowerCase().includes('business') ||
      false;

    if (hasRoleClarity && teamSize >= 2) points += 15;
    else if (teamSize >= 2) points += 10;
    else points += 8; // co-founder signal found in text
  } else if (teamSize > 1) {
    points += 8;
  } else {
    points += 3;
  }

  // ── 3. Resilience (30 points) ─────────────────────────────────────────────

  // Failed assumptions quality (15 pts)
  // RAG: LLM evaluates whether failures are specific & documented vs. vague
  if (sq?.failedBelief !== undefined) {
    points += semPts(sq.failedBelief, 15);
  } else {
    const failedAssumptionsText = data.failedBelief || data.failedChange || '';
    const assumptionsLength = failedAssumptionsText.length;
    if (assumptionsLength >= 200) points += 15;
    else if (assumptionsLength >= 150) points += 13;
    else if (assumptionsLength >= 100) points += 10;
    else if (assumptionsLength >= 50) points += 7;
    else if (assumptionsLength > 0) points += 3;
  }

  // Learning velocity / iteration speed (15 pts) — numeric, no semantic needed
  const buildTime = data.buildTime || 0;
  const iterationCount = data.conversationCount || 0;

  if (buildTime > 0) {
    if (buildTime <= 7 && iterationCount >= 5) points += 15;
    else if (buildTime <= 14 && iterationCount >= 3) points += 12;
    else if (buildTime <= 30 && iterationCount >= 2) points += 9;
    else if (buildTime <= 60) points += 6;
    else points += 3;
  } else if (iterationCount >= 3) {
    points += 10;
  } else {
    points += 3;
  }

  // Normalize to 0-100, clamp both ends, guard NaN
  const raw = isFinite(points) ? Math.round((points / maxPoints) * 100) : 0;
  const score = Math.max(0, Math.min(100, raw));

  return { score, rawPoints: Math.max(0, points), maxPoints };
}
