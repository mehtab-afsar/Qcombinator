/**
 * usePersonalizedMatching Hook
 * Fetches investor config and applies it to rank founders
 */

import { useState, useEffect } from 'react'
import { getRankedMatches } from '@/lib/services/deal-matching.service'
import type { InvestorConfig } from '@/lib/constants/investor-config/types'
import type { FounderProfile } from '@/lib/services/deal-matching.service'

interface PersonalizedMatch {
  founder: FounderProfile
  matchScore: number
  percentile?: number
}

interface UsePersonalizedMatchingResult {
  config: InvestorConfig | null
  rankedMatches: PersonalizedMatch[]
  loading: boolean
  error: string | null
}

export function usePersonalizedMatching(
  founders: FounderProfile[]
): UsePersonalizedMatchingResult {
  const [config, setConfig] = useState<InvestorConfig | null>(null)
  const [rankedMatches, setRankedMatches] = useState<PersonalizedMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAndApplyConfig = async () => {
      try {
        // Fetch investor's config
        const configRes = await fetch('/api/investor/config')
        if (!configRes.ok) {
          throw new Error('Failed to fetch investor config')
        }
        const investorConfig = (await configRes.json()) as InvestorConfig
        setConfig(investorConfig)

        // Apply config to rank founders
        if (founders.length === 0) {
          setRankedMatches([])
          return
        }

        const matches = getRankedMatches(founders, investorConfig)

        // Calculate percentiles for visualization
        const maxScore = matches.length > 0 ? matches[0].matchScore : 100
        const minScore = matches.length > 0 ? matches[matches.length - 1].matchScore : 0
        const scoreRange = maxScore - minScore || 1

        const matchesWithPercentiles = matches.map((match, _index) => ({
          ...match,
          percentile: Math.round(((maxScore - match.matchScore) / scoreRange) * 100),
        }))

        setRankedMatches(matchesWithPercentiles)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        setRankedMatches([])
      } finally {
        setLoading(false)
      }
    }

    fetchAndApplyConfig()
  }, [founders])

  return { config, rankedMatches, loading, error }
}
