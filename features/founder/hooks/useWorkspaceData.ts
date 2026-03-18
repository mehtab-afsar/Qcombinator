import { useState, useEffect } from 'react'
import { fetchWorkspaceArtifacts, WorkspaceArtifact } from '../services/workspace.service'

export function useWorkspaceData() {
  const [artifacts, setArtifacts] = useState<WorkspaceArtifact[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    fetchWorkspaceArtifacts()
      .then(setArtifacts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { artifacts, loading }
}
