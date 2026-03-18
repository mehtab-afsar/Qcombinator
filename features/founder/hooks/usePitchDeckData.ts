import { useState, useEffect, useCallback } from 'react'
import { fetchPitchDeckArtifacts, PitchDeckData } from '../services/pitch-deck.service'

export function usePitchDeckData() {
  const [data,       setData]       = useState<PitchDeckData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const result = await fetchPitchDeckArtifacts()
      setData(result)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load(false) }, [load])

  return { data, loading, refreshing, refresh: () => load(true) }
}
