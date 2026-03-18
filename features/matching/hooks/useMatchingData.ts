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

  useEffect(() => {
    loadMatchingData(founderQScore)
      .then(({ investors, founderSector, founderStage }) => {
        setInvestors(investors)
        setFounderSector(founderSector)
        setFounderStage(founderStage)
      })
      .catch(err => console.error('Matching load error:', err))
      .finally(() => setLoadingInvestors(false))
  }, [founderQScore])

  return { investors, setInvestors, founderSector, founderStage, loadingInvestors }
}
