/**
 * Go-to-Market (GTM) Dimension Scorer
 * Sources: NEW GTM section (to be added to assessment)
 * Scoring: ICP clarity (35), channel validation (35), messaging (30)
 */

import { AssessmentData } from '../../types/qscore.types';

export function calculateGTMScore(data: AssessmentData): {
  score: number;
  rawPoints: number;
  maxPoints: number;
} {
  let points = 0;
  const maxPoints = 100;

  // If no GTM data provided, return default score
  if (!data.gtm) {
    return {
      score: 50, // Default middle score if section not completed
      rawPoints: 50,
      maxPoints: 100
    };
  }

  const gtmData = data.gtm;

  // 1. ICP Clarity (35 points)
  // Clear definition of ideal customer profile
  const icpLength = gtmData.icpDescription?.length || 0;
  const hasDetailedICP = icpLength >= 200;
  const hasModerateICP = icpLength >= 100;
  const hasSomeICP = icpLength >= 50;

  if (hasDetailedICP) points += 35; // Very detailed (200+ chars)
  else if (hasModerateICP) points += 25; // Moderate detail (100-200 chars)
  else if (hasSomeICP) points += 15; // Basic definition
  else points += 5; // Minimal

  // 2. Channel Testing & Validation (35 points)
  const channelsTried = gtmData.channelsTried?.length || 0;
  const channelResults = gtmData.channelResults?.length || 0;
  const hasCAC = gtmData.currentCAC !== undefined && gtmData.currentCAC > 0;

  // Channels tried (15 pts)
  if (channelsTried >= 3) points += 15; // Tested 3+ channels
  else if (channelsTried >= 2) points += 12; // Tested 2 channels
  else if (channelsTried >= 1) points += 8; // Tested 1 channel
  else points += 3; // No channels tested

  // Channel results tracked (10 pts)
  if (channelResults >= 3) points += 10; // Tracked 3+ channels
  else if (channelResults >= 2) points += 8; // Tracked 2 channels
  else if (channelResults >= 1) points += 5; // Tracked 1 channel
  else points += 0; // No tracking

  // CAC validation (10 pts)
  if (hasCAC && gtmData.targetCAC) {
    const cacRatio = gtmData.currentCAC! / gtmData.targetCAC;
    if (cacRatio <= 1) points += 10; // Met target
    else if (cacRatio <= 1.5) points += 7; // Within 50% of target
    else if (cacRatio <= 2) points += 4; // Within 2x target
    else points += 2; // > 2x target
  } else if (hasCAC) {
    points += 5; // Has CAC but no target
  }

  // 3. Messaging & Positioning (30 points)
  const messagingTested = gtmData.messagingTested;
  const hasResults = gtmData.messagingResults && gtmData.messagingResults.length > 50;

  if (messagingTested && hasResults) {
    points += 30; // Tested with detailed results
  } else if (messagingTested) {
    points += 20; // Tested but minimal documentation
  } else {
    points += 10; // Not tested yet
  }

  // Normalize to 0-100 scale
  const score = Math.min(Math.round((points / maxPoints) * 100), 100);

  return {
    score,
    rawPoints: points,
    maxPoints
  };
}
