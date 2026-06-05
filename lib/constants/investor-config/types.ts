/**
 * Investor Configuration Types
 * Defines the shape of investor preferences and matching weights
 */

export type InvestorType = 'angel' | 'seed-vc' | 'growth-vc' | 'corporate'
export type InvestorTier = 'free' | 'pro' | 'enterprise'

export interface DealFilters {
  stages: ('idea' | 'mvp' | 'pre-seed' | 'seed' | 'series-a')[]
  sectors: string[]
  geographies: string[]
  minQScore: number
  maxValuation: number
  minAUM: number
}

export interface MatchingWeights {
  qscore: number              // 0-100 (overall Q-Score importance)
  marketReadiness: number     // 0-100 (p1)
  marketPotential: number     // 0-100 (p2)
  ipDefensibility: number     // 0-100 (p3)
  founderTeam: number         // 0-100 (p4)
  structuralImpact: number    // 0-100 (p5)
  financials: number          // 0-100 (p6)
  customScore: number         // 0-100 (optional custom scoring)
}

export interface PipelineStage {
  id: string
  label: string
  description: string
  order: number
}

export interface InvestorPreferences {
  dealFilters: DealFilters
  matchingWeights: MatchingWeights
  dashboardKPIs: ('portfolio-value' | 'deal-pipeline' | 'returns' | 'activity')[]
  pipelineStages: PipelineStage[]
  notificationFrequency: 'realtime' | 'daily' | 'weekly' | 'monthly'
  emailDigestEnabled: boolean
  slackIntegrationEnabled: boolean
}

export interface InvestorPermissions {
  canEditWeights: boolean
  canCustomizePipeline: boolean
  canIntegrate: boolean
}

export interface InvestorConfig {
  investorType: InvestorType
  tier: InvestorTier
  preferences: InvestorPreferences
  permissions: InvestorPermissions
}
