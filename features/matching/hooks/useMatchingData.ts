'use client'

/**
 * useMatchingData
 * Fetches investors, founder sector/stage, and connection statuses.
 */

import { useState, useEffect } from 'react'
import { MatchingInvestor } from '../types/matching.types'
import { loadMatchingData } from '../services/matching.service'

export function useMatchingData(founderQScore: number) {
  const [investors,        setInvestors]        = useState<MatchingInvestor[]>([])
  const [founderSector,    setFounderSector]    = useState('saas')
  const [founderStage,     setFounderStage]     = useState('mvp')
  const [loadingInvestors, setLoadingInvestors] = useState(true)
  // Distinguishes a genuinely empty match list from a failed /api/investors fetch that only
  // looks empty — see loadMatchingData's investorsFetchFailed.
  const [matchingError,    setMatchingError]    = useState(false)

  useEffect(() => {
    loadMatchingData(founderQScore)
      .then(({ investors, founderSector, founderStage, investorsFetchFailed }) => {
        setInvestors(investors)
        setFounderSector(founderSector)
        setFounderStage(founderStage)
        setMatchingError(investorsFetchFailed)
      })
      .catch(err => {
        console.error('Matching load error:', err)
        setMatchingError(true)
      })
      .finally(() => setLoadingInvestors(false))
  }, [founderQScore])

  return { investors, setInvestors, founderSector, founderStage, loadingInvestors, matchingError }
}
