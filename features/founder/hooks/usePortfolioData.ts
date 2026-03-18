'use client'

/**
 * usePortfolioData
 * Fetches Q-Score, artifacts, evidence, and analytics for the portfolio page.
 */

import { useState, useEffect } from 'react'
import { fetchPortfolioData, PortfolioData } from '../services/portfolio.service'

export function usePortfolioData() {
  const [data,    setData]    = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPortfolioData()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}
