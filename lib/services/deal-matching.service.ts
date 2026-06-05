/**
 * Deal Matching Service
 * Calculates personalized match scores and filters based on investor config
 */

import type { InvestorConfig } from '@/lib/constants/investor-config/types'

export interface FounderProfile {
  id: string
  stage: 'idea' | 'mvp' | 'pre-seed' | 'seed' | 'series-a'
  industry: string
  location: string
  valuation: number
  qscore: {
    overall: number
    p1: number  // marketReadiness
    p2: number  // marketPotential
    p3: number  // ipDefensibility
    p4: number  // founderTeam
    p5: number  // structuralImpact
    p6: number  // financials
  }
}

/**
 * Calculate personalized match score for a founder
 * using investor's configured weights
 */
export function calculateMatchScore(
  founder: FounderProfile,
  investorConfig: InvestorConfig
): number {
  const w = investorConfig.preferences.matchingWeights

  // Weighted average of Q-Score dimensions
  const weightedSum =
    founder.qscore.overall * w.qscore +
    founder.qscore.p1 * w.marketReadiness +
    founder.qscore.p2 * w.marketPotential +
    founder.qscore.p3 * w.ipDefensibility +
    founder.qscore.p4 * w.founderTeam +
    founder.qscore.p5 * w.structuralImpact +
    founder.qscore.p6 * w.financials

  const totalWeight =
    w.qscore +
    w.marketReadiness +
    w.marketPotential +
    w.ipDefensibility +
    w.founderTeam +
    w.structuralImpact +
    w.financials

  if (totalWeight === 0) return founder.qscore.overall

  return Math.round((weightedSum / totalWeight) * 100) / 100
}

/**
 * Filter founders by investor's deal criteria
 * Returns only founders matching all filter criteria
 */
export function filterByPreferences(
  founders: FounderProfile[],
  investorConfig: InvestorConfig
): FounderProfile[] {
  const f = investorConfig.preferences.dealFilters

  return founders.filter(founder => {
    // Check stages
    if (f.stages.length > 0 && !f.stages.includes(founder.stage)) {
      return false
    }

    // Check Q-Score minimum
    if (founder.qscore.overall < f.minQScore) {
      return false
    }

    // Check valuation maximum
    if (founder.valuation > f.maxValuation) {
      return false
    }

    // Check sectors (if specified)
    if (f.sectors.length > 0 && !f.sectors.includes(founder.industry)) {
      return false
    }

    // Check geographies (if specified)
    if (f.geographies.length > 0 && !f.geographies.includes(founder.location)) {
      return false
    }

    return true
  })
}

/**
 * Get ranked list of founders matching investor criteria
 * Filtered by preferences, then sorted by personalized match score
 */
export function getRankedMatches(
  founders: FounderProfile[],
  investorConfig: InvestorConfig
): { founder: FounderProfile; matchScore: number }[] {
  const filtered = filterByPreferences(founders, investorConfig)

  return filtered
    .map(founder => ({
      founder,
      matchScore: calculateMatchScore(founder, investorConfig),
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
}
