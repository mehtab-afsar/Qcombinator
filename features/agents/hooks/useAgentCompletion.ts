'use client'

/**
 * useAgentCompletion
 * Returns which agents have been used and which are recommended based on Q-Score.
 */

import { useState, useEffect } from 'react'
import { fetchAgentHubData } from '../services/agents-hub.service'

export function useAgentCompletion() {
  const [completedAgents, setCompletedAgents] = useState<Set<string>>(new Set())
  const [recommendedIds,  setRecommendedIds]  = useState<string[]>([])
  const [loaded,          setLoaded]          = useState(false)

  useEffect(() => {
    fetchAgentHubData()
      .then(({ completedAgentIds, recommendedIds }) => {
        setCompletedAgents(completedAgentIds)
        setRecommendedIds(recommendedIds)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  return { completedAgents, recommendedIds, loaded }
}
