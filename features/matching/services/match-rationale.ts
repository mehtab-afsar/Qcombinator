/**
 * AI Match Rationale
 *
 * Generates a 2-3 sentence explanation of why a specific investor is a strong
 * fit for a founder's startup. Fast/cheap model tier, short output.
 *
 * Called on-demand when a founder expands an investor card or clicks Connect. The result is
 * cached by the caller (app/api/connections/rationale/route.ts, in founder_match_explanations)
 * — this function is pure generation and knows nothing about caching.
 */

import { composeAdhocPrompt } from '@/lib/prompts/compose'
import { routedText } from '@/lib/llm/router'

export interface MatchRationaleInput {
  investorName: string
  investorFirm: string
  investorThesis: string
  investorSectors: string[]
  investorStages: string[]
  investorPortfolio: string[]
  matchScore: number
  founderSector: string
  founderStage: string
  founderQScore: number
  startupOneLiner?: string
}

const INSTRUCTIONS = `You are a startup fundraising advisor. Write a 2-3 sentence explanation of why this investor is a strong match for this founder. Be specific, concrete, and reference the actual data below. Do not use filler phrases like "great fit" — explain *why*.

Write 2-3 sentences. Start with the strongest alignment reason. End with what the investor could specifically add beyond capital.`

export async function generateMatchRationale(input: MatchRationaleInput): Promise<string> {
  const {
    investorName, investorFirm, investorThesis, investorSectors,
    investorStages, investorPortfolio, matchScore,
    founderSector, founderStage, founderQScore, startupOneLiner,
  } = input

  const data = `Investor: ${investorName} (${investorFirm})
Thesis: ${investorThesis || 'Not specified'}
Sectors: ${investorSectors.join(', ')}
Stages: ${investorStages.join(', ')}
Notable portfolio: ${investorPortfolio.slice(0, 3).join(', ') || 'N/A'}

Founder startup: ${startupOneLiner || 'N/A'}
Sector: ${founderSector}
Stage: ${founderStage}
Q-Score: ${founderQScore}/100
Match score: ${matchScore}%`

  try {
    const messages = composeAdhocPrompt({
      sourceRef: 'connections/rationale',
      instructions: INSTRUCTIONS,
      data,
    })
    const rationale = await routedText('summarisation', messages, { maxTokens: 200 })
    return rationale.trim()
  } catch {
    // Deterministic fallback
    const sectorMatch = investorSectors.some(s =>
      s.toLowerCase().includes(founderSector.toLowerCase()) ||
      founderSector.toLowerCase().includes(s.toLowerCase())
    )
    return [
      sectorMatch
        ? `${investorName} focuses specifically on ${founderSector} companies, making this a direct sector fit.`
        : `${investorName} at ${investorFirm} invests at the ${founderStage} stage which aligns with your current phase.`,
      investorPortfolio.length > 0
        ? `Their portfolio includes ${investorPortfolio.slice(0, 2).join(' and ')}, showing pattern recognition in your space.`
        : `Their ${matchScore}% match score reflects stage and check size alignment.`,
    ].join(' ')
  }
}
