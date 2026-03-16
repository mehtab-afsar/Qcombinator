/**
 * Go-to-Market (GTM) Dimension Scorer
 * Sources: GTM section (ICP, channels, messaging)
 *
 * RAG enhancement: replaces ICP char-count and messaging boolean with
 * LLM-evaluated substance scores.
 * Numeric thresholds are DB-driven via ThresholdMap.
 */

import { AssessmentData } from '../../types/qscore.types';
import { SemanticEvaluation } from '../../rag/types';
import { ThresholdMap, scoreTiers, getTiers } from '../../services/threshold-config';

function semPts(qualityScore: number, maxPts: number): number {
  const q = isFinite(qualityScore) && !isNaN(qualityScore) ? qualityScore : 0;
  return Math.max(0, Math.round((Math.max(0, Math.min(100, q)) / 100) * maxPts));
}

export function calculateGTMScore(
  data: AssessmentData,
  semanticEval?: SemanticEvaluation,
  thresholds?: ThresholdMap
): { score: number; rawPoints: number; maxPoints: number } {
  let points = 0;
  const maxPoints = 100;

  if (!data.gtm) return { score: 50, rawPoints: 50, maxPoints: 100 };

  const gtmData = data.gtm;
  const sq = semanticEval?.answerQuality;
  const t = thresholds ?? new Map();

  // 1. ICP Clarity (35 pts) — LLM-evaluated
  if (sq?.icpDescription !== undefined) {
    points += semPts(sq.icpDescription, 35);
  } else {
    const icpLength = gtmData.icpDescription?.length || 0;
    if (icpLength >= 200) points += 35;
    else if (icpLength >= 100) points += 25;
    else if (icpLength >= 50) points += 15;
    else points += 5;
  }

  // 2. Channel Testing (35 pts) — numeric, DB-driven
  const channelsTried = gtmData.channelsTried?.length || 0;
  const channelResults = gtmData.channelResults?.length || 0;
  const hasCAC = gtmData.currentCAC !== undefined && gtmData.currentCAC > 0;

  // Channels tried (15 pts)
  const ctTiers = getTiers(t, 'gtm', 'channels_tried_count');
  if (ctTiers) {
    points += scoreTiers(channelsTried, ctTiers);
  } else {
    if (channelsTried >= 3) points += 15;
    else if (channelsTried >= 2) points += 12;
    else if (channelsTried >= 1) points += 8;
    else points += 3;
  }

  // Channel results (10 pts)
  const crTiers = getTiers(t, 'gtm', 'channel_results_count');
  if (crTiers) {
    points += scoreTiers(channelResults, crTiers);
  } else {
    if (channelResults >= 3) points += 10;
    else if (channelResults >= 2) points += 8;
    else if (channelResults >= 1) points += 5;
  }

  // CAC ratio (10 pts)
  if (hasCAC && gtmData.targetCAC) {
    const cacRatio = gtmData.currentCAC! / gtmData.targetCAC;
    const cacTiers = getTiers(t, 'gtm', 'cac_ratio');
    if (cacTiers) {
      points += scoreTiers(cacRatio, cacTiers);
    } else {
      if (cacRatio <= 1) points += 10;
      else if (cacRatio <= 1.5) points += 7;
      else if (cacRatio <= 2) points += 4;
      else points += 2;
    }
  } else if (hasCAC) {
    points += 5;
  }

  // 3. Messaging & Positioning (30 pts) — LLM-evaluated
  if (sq?.messagingResults !== undefined) {
    if (gtmData.messagingTested) {
      points += semPts(sq.messagingResults, 30);
    } else {
      points += semPts(sq.messagingResults, 10);
    }
  } else {
    const hasResults = !!(gtmData.messagingResults && gtmData.messagingResults.length > 50);
    if (gtmData.messagingTested && hasResults) points += 30;
    else if (gtmData.messagingTested) points += 20;
    else points += 10;
  }

  const raw = isFinite(points) ? Math.round((points / maxPoints) * 100) : 0;
  return { score: Math.max(0, Math.min(100, raw)), rawPoints: Math.max(0, points), maxPoints };
}
