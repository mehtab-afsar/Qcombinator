/**
 * Card configuration for "Today's Focus" section
 * Maps each card to stages, dimensions, and impact
 */

export type CardId = 'team' | 'subscription' | 'trends' | 'investorMatch' | 'agentChat'
export type Priority = 'critical' | 'high' | 'optional'
export type Stage = 'building' | 'launching' | 'scaling'
export type Dimension = 'marketReadiness' | 'marketPotential' | 'ipDefensibility' | 'founderTeam' | 'structuralImpact' | 'financials'

export interface CardConfig {
  id: CardId
  title: string
  description: string
  icon: string
  color: string
  bgColor: string
  href: string

  // Which stages this card is relevant for
  applicableStages: Stage[]

  // Which Q-Score dimension(s) this card helps with
  boosts: Dimension[]

  // Estimated impact points
  impactPoints: number

  // Priority for this stage
  getPriority: (stage: Stage) => Priority
}

export const CARD_CONFIGS: Record<CardId, CardConfig> = {
  team: {
    id: 'team',
    title: 'Invite your co-founder',
    description: 'Build credibility with investors. Teams are 3x more likely to close funding.',
    icon: 'Users',
    color: '#3B82F6',
    bgColor: 'rgba(59,130,246,0.1)',
    href: '/founder/settings?tab=team',
    applicableStages: ['building', 'launching', 'scaling'],
    boosts: ['founderTeam'],
    impactPoints: 8,
    getPriority: (stage: Stage) => stage === 'building' ? 'high' : 'optional',
  },

  subscription: {
    id: 'subscription',
    title: 'Unlock Premium',
    description: '$29/month • Unlimited agent chats, Q-Score updates, and investor connections',
    icon: 'Zap',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.1)',
    href: '/founder/billing',
    applicableStages: ['launching', 'scaling'],
    boosts: [], // Doesn't boost Q-Score, but enables features
    impactPoints: 0,
    getPriority: (_stage: Stage) => 'optional',
  },

  trends: {
    id: 'trends',
    title: 'Explore trending startups',
    description: 'See which startups in your industry are raising most and attracting top talent.',
    icon: 'TrendingUp',
    color: '#22C55E',
    bgColor: 'rgba(34,197,94,0.1)',
    href: '/founder/marketplace',
    applicableStages: ['building', 'launching', 'scaling'],
    boosts: ['marketPotential'],
    impactPoints: 5,
    getPriority: (stage: Stage) => stage === 'building' ? 'high' : 'optional',
  },

  investorMatch: {
    id: 'investorMatch',
    title: 'Investor matches',
    description: 'Complete your Q-Score profile to see investors interested in your startup.',
    icon: 'Target',
    color: '#A855F7',
    bgColor: 'rgba(168,85,247,0.1)',
    href: '/founder/matches',
    applicableStages: ['launching', 'scaling'],
    boosts: [],
    impactPoints: 0,
    getPriority: (stage: Stage) => stage === 'scaling' ? 'critical' : 'high',
  },

  agentChat: {
    id: 'agentChat',
    title: 'Chat with AI advisors',
    description: 'Ask Patel, Felix, or Maya to refine your pitch, Q-Score profile, and fundraising strategy.',
    icon: 'Sparkles',
    color: '#FB923C',
    bgColor: 'rgba(251,146,60,0.1)',
    href: '/founder/agents',
    applicableStages: ['building', 'launching', 'scaling'],
    boosts: ['marketReadiness', 'founderTeam'],
    impactPoints: 12,
    getPriority: (stage: Stage) => stage === 'launching' ? 'critical' : 'high',
  },
}

/**
 * Get relevant cards for a given stage, ranked by priority + weakest dimension
 */
export function getRelevantCards(
  stage: Stage,
  weakestDimension: Dimension | null,
  dismissedCardIds: Partial<Record<CardId, number>>
): CardConfig[] {
  // Filter cards applicable to this stage
  const relevant = Object.values(CARD_CONFIGS).filter(
    card => card.applicableStages.includes(stage)
  )

  // Remove cards dismissed 3+ times
  const active = relevant.filter(card => (dismissedCardIds[card.id] ?? 0) < 3)

  // Sort by:
  // 1. Priority in this stage
  // 2. Relevance to weakest dimension
  // 3. Impact points
  return active.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, optional: 2 }
    const aPriority = priorityOrder[a.getPriority(stage)]
    const bPriority = priorityOrder[b.getPriority(stage)]

    if (aPriority !== bPriority) return aPriority - bPriority

    // Boost weakest dimension first
    if (weakestDimension) {
      const aBoosts = a.boosts.includes(weakestDimension) ? 1 : 0
      const bBoosts = b.boosts.includes(weakestDimension) ? 1 : 0
      if (aBoosts !== bBoosts) return bBoosts - aBoosts
    }

    // Then by impact
    return b.impactPoints - a.impactPoints
  })
}

/**
 * Get the weakest Q-Score dimension
 */
export function getWeakestDimension(
  scores: {
    p1: number // marketReadiness
    p2: number // marketPotential
    p3: number // ipDefensibility
    p4: number // founderTeam
    p5: number // structuralImpact
    p6: number // financials
  }
): Dimension | null {
  const dims: Array<[Dimension, number]> = [
    ['marketReadiness', scores.p1],
    ['marketPotential', scores.p2],
    ['ipDefensibility', scores.p3],
    ['founderTeam', scores.p4],
    ['structuralImpact', scores.p5],
    ['financials', scores.p6],
  ]

  if (dims.every(([_, score]) => score === 0)) return null

  return dims.reduce((weakest, current) => {
    return current[1] < weakest[1] ? current : weakest
  })[0]
}
