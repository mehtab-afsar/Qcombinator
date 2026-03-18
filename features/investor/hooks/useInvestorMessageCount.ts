'use client'

/**
 * useInvestorMessageCount
 * Returns the count of pending investor connection requests for the Messages badge.
 */

import { useState, useEffect } from 'react'
import { fetchInvestorMessageCount } from '../services/investor-sidebar.service'

export function useInvestorMessageCount() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    fetchInvestorMessageCount()
      .then(setCount)
      .catch(() => setCount(null))
  }, [])

  return count
}
