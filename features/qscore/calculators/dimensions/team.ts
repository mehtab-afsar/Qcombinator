/**
 * Team Dimension Scorer
 * Sources: Problem Origin, Unique Advantage, Resilience sections
 *
 * RAG enhancement: LLM-evaluated substance scores for narrative fields.
 * Build time numeric threshold is DB-driven.
 */

import { AssessmentData } from '../../types/qscore.types';
import { SemanticEvaluation } from '../../rag/types';
import { ThresholdMap, scoreTiers, getTiers } from '../../services/threshold-config';
import { scoreP4FounderTeam } from '../parameters/p4-founder-team';

function semPts(qualityScore: number, maxPts: number): number {
  const q = isFinite(qualityScore) && !isNaN(qualityScore) ? qualityScore : 0;
  return Math.max(0, Math.round((Math.max(0, Math.min(100, q)) / 100) * maxPts));
}

export function calculateTeamScore(
  data: AssessmentData,
  semanticEval?: SemanticEvaluation,
  thresholds?: ThresholdMap
): { score: number; rawPoints: number; maxPoints: number } {
  let points = 0;
  const maxPoints = 100;
  const sq = semanticEval?.answerQuality;
  const t = thresholds ?? new Map();

  // 1. Domain Expertise (40 pts) — LLM-evaluated
  if (sq?.problemStory !== undefined) {
    points += semPts(sq.problemStory, 20);
  } else {
    const originLength = data.problemStory?.length || 0;
    const hasPersonalExperience = data.problemStory?.toLowerCase().includes('i ') ||
                                  data.problemStory?.toLowerCase().includes('my ') ||
                                  data.problemStory?.toLowerCase().includes('we ');
    if (originLength >= 300 && hasPersonalExperience) points += 20;
    else if (originLength >= 200 && hasPersonalExperience) points += 17;
    else if (originLength >= 150) points += 14;
    else if (originLength >= 100) points += 10;
    else if (originLength > 0) points += 5;
  }

  if (sq?.advantageExplanation !== undefined) {
    points += semPts(sq.advantageExplanation, 20);
  } else {
    const hasAdvantage = !!(data.advantageExplanation && data.advantageExplanation.length > 0);
    const advantageLength = data.advantageExplanation?.length || 0;
    const hasInsiderKnowledge = data.advantageExplanation?.toLowerCase().includes('experience') ||
                                data.advantageExplanation?.toLowerCase().includes('worked') ||
                                data.advantageExplanation?.toLowerCase().includes('industry');
    const hasNetwork = data.advantageExplanation?.toLowerCase().includes('network') ||
                       data.advantageExplanation?.toLowerCase().includes('connection') ||
                       data.advantageExplanation?.toLowerCase().includes('relationship');
    const hasTechnical = data.advantageExplanation?.toLowerCase().includes('technical') ||
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

  // 2. Team Completeness (30 pts) — structural
  const hasCofounder = data.problemStory?.toLowerCase().includes('cofounder') ||
                       data.problemStory?.toLowerCase().includes('co-founder') ||
                       data.problemStory?.toLowerCase().includes('partner') ||
                       data.problemStory?.toLowerCase().includes('founded with') ||
                       data.advantageExplanation?.toLowerCase().includes('cofounder') ||
                       data.advantageExplanation?.toLowerCase().includes('co-founder') ||
                       false;

  const teamSize: number = 1; // Default solo — field not in current assessment
  if (teamSize >= 3) points += 15;
  else if (teamSize === 2) points += 12;
  else points += 6;

  if (hasCofounder) {
    const hasRoleClarity = data.advantageExplanation?.toLowerCase().includes('ceo') ||
                           data.advantageExplanation?.toLowerCase().includes('cto') ||
                           data.advantageExplanation?.toLowerCase().includes('technical') ||
                           data.advantageExplanation?.toLowerCase().includes('business') ||
                           false;
    if (hasRoleClarity && teamSize >= 2) points += 15;
    else if (teamSize >= 2) points += 10;
    else points += 8;
  } else if (teamSize > 1) {
    points += 8;
  } else {
    points += 3;
  }

  // 3. Resilience (30 pts)

  // Failed assumptions quality (15 pts) — LLM-evaluated
  if (sq?.failedBelief !== undefined) {
    points += semPts(sq.failedBelief, 15);
  } else {
    const failedText = data.failedBelief || data.failedChange || '';
    const len = failedText.length;
    if (len >= 200) points += 15;
    else if (len >= 150) points += 13;
    else if (len >= 100) points += 10;
    else if (len >= 50) points += 7;
    else if (len > 0) points += 3;
  }

  // Build time / iteration speed (15 pts) — numeric, DB-driven
  const buildTime = data.buildTime || 0;
  const conversationCount = data.conversationCount || 0;

  if (buildTime > 0) {
    const btTiers = getTiers(t, 'team', 'build_time_days');
    if (btTiers) {
      // Use iteration bonus: full points only if conversations >= 3
      const basePoints = scoreTiers(buildTime, btTiers);
      const iterBonus = conversationCount >= 3 ? 1.0 : 0.7;
      points += Math.round(basePoints * iterBonus);
    } else {
      if (buildTime <= 7 && conversationCount >= 5) points += 15;
      else if (buildTime <= 14 && conversationCount >= 3) points += 12;
      else if (buildTime <= 30 && conversationCount >= 2) points += 9;
      else if (buildTime <= 60) points += 6;
      else points += 3;
    }
  } else if (conversationCount >= 3) {
    points += 10;
  } else {
    points += 3;
  }

  const baseRaw = isFinite(points) ? Math.round((points / maxPoints) * 100) : 0;
  const baseScore = Math.max(0, Math.min(100, baseRaw));

  // ── P4 blend (Founder / Team sub-indicators) ──────────────────────────────
  const hasP4Data = !!(data.p4 && (
    data.p4.domainYears !== undefined || data.p4.founderMarketFit ||
    data.p4.priorExits !== undefined || data.p4.teamCoverage || data.p4.teamCohesionMonths !== undefined
  ));

  if (!hasP4Data) {
    return { score: baseScore, rawPoints: Math.max(0, points), maxPoints };
  }

  const p4Result = scoreP4FounderTeam(data);
  // 55% existing team score + 45% P4 score
  const blended = Math.round(baseScore * 0.55 + p4Result.score * 0.45);
  return { score: Math.max(0, Math.min(100, blended)), rawPoints: Math.max(0, points), maxPoints };
}
