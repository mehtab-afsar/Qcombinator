'use client'

/**
 * usePendingConnections
 * Returns the count of pending connection requests for the Messages badge.
 */

import { useState, useEffect } from 'react'
import { fetchPendingConnectionCount } from '../services/sidebar.service'

export function usePendingConnections() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    fetchPendingConnectionCount()
      .then(setCount)
      .catch(() => setCount(null))
  }, [])

  return count
}
