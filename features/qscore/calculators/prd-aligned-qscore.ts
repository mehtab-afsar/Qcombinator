/**
 * PRD-Aligned Q-Score Calculator
 * Calculates Q-Score using 6-dimension weighted model per PRD requirements
 */

import { PRDQScore, PRD_WEIGHTS, calculateGrade, AssessmentData, DimensionScore } from '../types/qscore.types';
import { calculateMarketScore } from './dimensions/market';
import { calculateProductScore } from './dimensions/product';
import { calculateGTMScore } from './dimensions/gtm';
import { calculateFinancialScore } from './dimensions/financial';
import { calculateTeamScore } from './dimensions/team';
import { calculateTractionScore } from './dimensions/traction';

/**
 * Main Q-Score calculation function
 * Maps existing 7-section assessment to PRD's 6 dimensions
 */
export function calculatePRDQScore(assessmentData: AssessmentData, previousScore?: PRDQScore): PRDQScore {
  // Calculate each dimension (0-100 scale)
  const marketResult = calculateMarketScore(assessmentData);
  const productResult = calculateProductScore(assessmentData);
  const gtmResult = calculateGTMScore(assessmentData);
  const financialResult = calculateFinancialScore(assessmentData);
  const teamResult = calculateTeamScore(assessmentData);
  const tractionResult = calculateTractionScore(assessmentData);

  // Apply PRD weights to get overall score (0-100)
  const overall = Math.round(
    marketResult.score * PRD_WEIGHTS.market +
    productResult.score * PRD_WEIGHTS.product +
    gtmResult.score * PRD_WEIGHTS.goToMarket +
    financialResult.score * PRD_WEIGHTS.financial +
    teamResult.score * PRD_WEIGHTS.team +
    tractionResult.score * PRD_WEIGHTS.traction
  );

  // Calculate trends if previous score exists
  const calculateTrend = (current: number, previous?: number): { trend: 'up' | 'down' | 'neutral', change: number } => {
    if (!previous) return { trend: 'neutral', change: 0 };
    const change = current - previous;
    if (change > 2) return { trend: 'up', change };
    if (change < -2) return { trend: 'down', change };
    return { trend: 'neutral', change };
  };

  const marketTrend = calculateTrend(marketResult.score, previousScore?.breakdown.market.score);
  const productTrend = calculateTrend(productResult.score, previousScore?.breakdown.product.score);
  const gtmTrend = calculateTrend(gtmResult.score, previousScore?.breakdown.goToMarket.score);
  const financialTrend = calculateTrend(financialResult.score, previousScore?.breakdown.financial.score);
  const teamTrend = calculateTrend(teamResult.score, previousScore?.breakdown.team.score);
  const tractionTrend = calculateTrend(tractionResult.score, previousScore?.breakdown.traction.score);

  // Build dimension scores with trends
  const breakdown = {
    market: {
      ...marketResult,
      weight: PRD_WEIGHTS.market,
      trend: marketTrend.trend,
      change: marketTrend.change
    } as DimensionScore,
    product: {
      ...productResult,
      weight: PRD_WEIGHTS.product,
      trend: productTrend.trend,
      change: productTrend.change
    } as DimensionScore,
    goToMarket: {
      ...gtmResult,
      weight: PRD_WEIGHTS.goToMarket,
      trend: gtmTrend.trend,
      change: gtmTrend.change
    } as DimensionScore,
    financial: {
      ...financialResult,
      weight: PRD_WEIGHTS.financial,
      trend: financialTrend.trend,
      change: financialTrend.change
    } as DimensionScore,
    team: {
      ...teamResult,
      weight: PRD_WEIGHTS.team,
      trend: teamTrend.trend,
      change: teamTrend.change
    } as DimensionScore,
    traction: {
      ...tractionResult,
      weight: PRD_WEIGHTS.traction,
      trend: tractionTrend.trend,
      change: tractionTrend.change
    } as DimensionScore
  };

  return {
    overall,
    percentile: null, // Will be calculated after comparing to cohort in API
    grade: calculateGrade(overall),
    breakdown,
    calculatedAt: new Date()
  };
}

/**
 * Calculate percentile ranking
 * Compares user's score to all users in similar cohort (industry/stage)
 */
export async function calculatePercentile(
  overallScore: number,
  userId: string,
  supabase: import('@supabase/supabase-js').SupabaseClient
): Promise<number> {
  try {
    // Get all scores from database (excluding current user)
    const { data: allScores, error } = await supabase
      .from('qscore_history')
      .select('overall_score')
      .neq('user_id', userId)
      .order('calculated_at', { ascending: false });

    if (error || !allScores || allScores.length === 0) {
      // Default to 50th percentile if no comparison data
      return 50;
    }

    // Count how many scores are below this score
    const scoresBelow = allScores.filter((s: { overall_score: number }) => s.overall_score < overallScore).length;
    const percentile = Math.round((scoresBelow / allScores.length) * 100);

    return percentile;
  } catch (error) {
    console.error('Error calculating percentile:', error);
    return 50; // Default fallback
  }
}

/**
 * Get improvement recommendations based on Q-Score breakdown
 */
export function getImprovementRecommendations(qScore: PRDQScore): {
  dimension: keyof PRDQScore['breakdown'];
  currentScore: number;
  potentialGain: number;
  priority: 'high' | 'medium' | 'low';
  action: string;
}[] {
  const dimensions = Object.entries(qScore.breakdown) as [keyof PRDQScore['breakdown'], DimensionScore][];

  // Sort by score (lowest first) and take top 3
  const lowestDimensions = dimensions
    .sort(([, a], [, b]) => a.score - b.score)
    .slice(0, 3);

  return lowestDimensions.map(([dimension, data]) => {
    const potentialGain = Math.round((100 - data.score) * 0.15); // 15% improvement potential
    const priority = data.score < 40 ? 'high' : data.score < 70 ? 'medium' : 'low';

    const actions: Record<string, string> = {
      market: 'Validate market size and growth assumptions with customer data',
      product: 'Conduct more customer interviews and iterate on product feedback',
      goToMarket: 'Define your ICP clearly and test 2-3 acquisition channels',
      financial: 'Build detailed financial projections and improve unit economics',
      team: 'Fill key skill gaps and document team expertise in domain',
      traction: 'Focus on customer acquisition and revenue growth metrics'
    };

    return {
      dimension,
      currentScore: data.score,
      potentialGain,
      priority,
      action: actions[dimension] || 'Work on improving this dimension'
    };
  });
}
