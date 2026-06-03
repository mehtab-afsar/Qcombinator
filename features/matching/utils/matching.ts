/**
 * Matching utilities — pure functions, no React
 */

import { DBInvestor, MatchingInvestor, ConnectionStatus } from '../types/matching.types'

/**
 * Computes a 0-100 match score from founder context vs investor preferences.
 * When vectorScore (0-1) is provided, blends 60% vector + 40% formula.
 */
export function computeMatchScore(
  row: DBInvestor,
  founderQScore: number,
  founderSector: string,
  founderStage: string,
  vectorScore?: number,
): number {
  let score = 40

  const investorSectors = (row.sectors ?? []).map(s => s.toLowerCase())
  const sectorAliases: Record<string, string[]> = {
    'ai-ml':     ['ai/ml', 'ai', 'ml', 'artificial intelligence', 'machine learning', 'deep tech'],
    saas:        ['saas', 'b2b saas', 'software', 'enterprise software'],
    healthtech:  ['healthtech', 'health', 'medtech', 'digital health', 'biotech'],
    fintech:     ['fintech', 'finance', 'financial services', 'wealthtech'],
    climate:     ['climate', 'cleantech', 'sustainability', 'energy'],
    marketplace: ['marketplace', 'platform', 'two-sided marketplace'],
    consumer:    ['consumer', 'd2c', 'e-commerce'],
    edtech:      ['edtech', 'education', 'learning'],
  }
  const founderAliases = sectorAliases[founderSector.toLowerCase()] ?? [founderSector.toLowerCase()]
  const sectorMatch = investorSectors.some(s =>
    founderAliases.some(alias => s.includes(alias) || alias.includes(s))
  )
  if (sectorMatch) score += 30

  const investorStages = (row.stages ?? []).map(s => s.toLowerCase())
  const stageAliases: Record<string, string[]> = {
    idea:     ['pre-seed', 'idea', 'pre seed', 'concept'],
    mvp:      ['pre-seed', 'seed', 'mvp'],
    launched: ['seed', 'series a', 'launched'],
    scaling:  ['series a', 'series b', 'growth', 'scaling'],
  }
  const founderStageAliases = stageAliases[founderStage.toLowerCase()] ?? [founderStage.toLowerCase()]
  const stageMatch = investorStages.some(s =>
    founderStageAliases.some(alias => s.includes(alias) || alias.includes(s))
  )
  if (stageMatch) score += 20

  if (founderQScore >= 80)      score += 10
  else if (founderQScore >= 65) score += 7
  else if (founderQScore >= 50) score += 3

  const responseBonus = Math.round(((row.response_rate - 50) / 100) * 5)
  score += Math.max(0, responseBonus)

  const formulaScore = Math.min(score, 100)

  // When a vector similarity score is available, blend 60% semantic + 40% formula
  if (vectorScore !== undefined) {
    const vectorScaled = vectorScore * 100  // 0-1 → 0-100
    return Math.round(0.6 * vectorScaled + 0.4 * formulaScore)
  }

  return formulaScore
}

/** Maps a DB investor row to the UI MatchingInvestor shape. */
export function mapInvestor(
  row: DBInvestor,
  founderQScore: number,
  founderSector: string,
  founderStage: string,
  connectionStatus: ConnectionStatus = 'none',
  vectorScore?: number,
): MatchingInvestor {
  return {
    id:              row.id,
    type:            row.type,
    name:            row.name,
    firm:            row.firm,
    title:           row.title ?? '',
    matchScore:      computeMatchScore(row, founderQScore, founderSector, founderStage, vectorScore),
    investmentFocus: (row.sectors ?? []).slice(0, 3),
    stages:          row.stages ?? [],
    checkSize:       (row.check_sizes ?? [])[0] ?? 'Varies',
    location:        row.location,
    portfolio:       (row.portfolio ?? []).slice(0, 3),
    responseRate:    row.response_rate,
    thesis:          row.thesis ?? '',
    connectionStatus,
  }
}
