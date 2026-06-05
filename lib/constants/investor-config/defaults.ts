/**
 * Investor Configuration Defaults
 * Pre-built templates for 4 investor types
 */

import type { InvestorConfig } from './types'

export const INVESTOR_DEFAULTS: Record<'angel' | 'seed-vc' | 'growth-vc' | 'corporate', InvestorConfig> = {
  angel: {
    investorType: 'angel',
    tier: 'free',
    preferences: {
      dealFilters: {
        stages: ['idea', 'mvp', 'pre-seed'],
        sectors: [],
        geographies: [],
        minQScore: 0,
        maxValuation: 50_000_000,
        minAUM: 0,
      },
      matchingWeights: {
        qscore: 40,
        marketReadiness: 15,
        marketPotential: 15,
        ipDefensibility: 10,
        founderTeam: 60,
        structuralImpact: 10,
        financials: 0,
        customScore: 20,
      },
      dashboardKPIs: ['portfolio-value', 'deal-pipeline', 'activity'],
      pipelineStages: [
        { id: 'sourced', label: 'Sourced', description: 'Intro\'d by network', order: 1 },
        { id: 'screening', label: 'Screening', description: 'Quick review', order: 2 },
        { id: 'meeting', label: 'Meeting', description: 'Founder conversation', order: 3 },
        { id: 'term-sheet', label: 'Term Sheet', description: 'Sent offer', order: 4 },
        { id: 'invested', label: 'Invested', description: 'Closed', order: 5 },
      ],
      notificationFrequency: 'realtime',
      emailDigestEnabled: false,
      slackIntegrationEnabled: false,
    },
    permissions: {
      canEditWeights: true,
      canCustomizePipeline: false,
      canIntegrate: false,
    },
  },

  'seed-vc': {
    investorType: 'seed-vc',
    tier: 'pro',
    preferences: {
      dealFilters: {
        stages: ['pre-seed', 'seed'],
        sectors: [],
        geographies: [],
        minQScore: 50,
        maxValuation: 50_000_000,
        minAUM: 0,
      },
      matchingWeights: {
        qscore: 80,
        marketReadiness: 30,
        marketPotential: 40,
        ipDefensibility: 20,
        founderTeam: 50,
        structuralImpact: 30,
        financials: 10,
        customScore: 0,
      },
      dashboardKPIs: ['portfolio-value', 'deal-pipeline', 'returns', 'activity'],
      pipelineStages: [
        { id: 'inbound', label: 'Inbound', description: 'Application received', order: 1 },
        { id: 'pitch', label: 'Pitch Received', description: 'Deck reviewed', order: 2 },
        { id: 'screening', label: 'Screening', description: 'Initial review', order: 3 },
        { id: 'deep-dive', label: 'Deep Dive', description: 'Detailed due diligence', order: 4 },
        { id: 'partners-review', label: 'Partners Review', description: 'Investment committee', order: 5 },
        { id: 'term-sheet', label: 'Term Sheet', description: 'Formal offer', order: 6 },
        { id: 'legal', label: 'Legal', description: 'Document review', order: 7 },
        { id: 'invested', label: 'Invested', description: 'Wired', order: 8 },
      ],
      notificationFrequency: 'daily',
      emailDigestEnabled: true,
      slackIntegrationEnabled: true,
    },
    permissions: {
      canEditWeights: true,
      canCustomizePipeline: true,
      canIntegrate: true,
    },
  },

  'growth-vc': {
    investorType: 'growth-vc',
    tier: 'pro',
    preferences: {
      dealFilters: {
        stages: ['seed', 'series-a'],
        sectors: [],
        geographies: [],
        minQScore: 70,
        maxValuation: Infinity,
        minAUM: 0,
      },
      matchingWeights: {
        qscore: 100,
        marketReadiness: 50,
        marketPotential: 60,
        ipDefensibility: 40,
        founderTeam: 30,
        structuralImpact: 50,
        financials: 80,
        customScore: 0,
      },
      dashboardKPIs: ['portfolio-value', 'returns', 'deal-pipeline'],
      pipelineStages: [
        { id: 'sourced', label: 'Sourced', description: '', order: 1 },
        { id: 'screening', label: 'Screening', description: '', order: 2 },
        { id: 'due-diligence', label: 'Due Diligence', description: '', order: 3 },
        { id: 'final-review', label: 'Final Review', description: '', order: 4 },
        { id: 'investment-committee', label: 'IC Review', description: '', order: 5 },
        { id: 'documents', label: 'Documents', description: '', order: 6 },
        { id: 'closed', label: 'Closed', description: '', order: 7 },
      ],
      notificationFrequency: 'daily',
      emailDigestEnabled: true,
      slackIntegrationEnabled: true,
    },
    permissions: {
      canEditWeights: true,
      canCustomizePipeline: true,
      canIntegrate: true,
    },
  },

  corporate: {
    investorType: 'corporate',
    tier: 'enterprise',
    preferences: {
      dealFilters: {
        stages: ['seed', 'series-a'],
        sectors: ['b2b', 'enterprise'],
        geographies: [],
        minQScore: 60,
        maxValuation: Infinity,
        minAUM: 0,
      },
      matchingWeights: {
        qscore: 70,
        marketReadiness: 60,
        marketPotential: 50,
        ipDefensibility: 70,
        founderTeam: 40,
        structuralImpact: 70,
        financials: 50,
        customScore: 0,
      },
      dashboardKPIs: ['portfolio-value', 'returns', 'deal-pipeline', 'activity'],
      pipelineStages: [
        { id: 'sourced', label: 'Sourced', description: 'Strategic opportunity identified', order: 1 },
        { id: 'screening', label: 'Screening', description: 'Strategic fit assessment', order: 2 },
        { id: 'due-diligence', label: 'Due Diligence', description: 'Full diligence process', order: 3 },
        { id: 'strategic-review', label: 'Strategic Review', description: 'Business unit alignment', order: 4 },
        { id: 'legal-compliance', label: 'Legal & Compliance', description: 'Internal approval process', order: 5 },
        { id: 'deal-structure', label: 'Deal Structure', description: 'Terms negotiation', order: 6 },
        { id: 'closed', label: 'Closed', description: 'Acquisition complete', order: 7 },
      ],
      notificationFrequency: 'daily',
      emailDigestEnabled: true,
      slackIntegrationEnabled: true,
    },
    permissions: {
      canEditWeights: true,
      canCustomizePipeline: true,
      canIntegrate: true,
    },
  },
}
