import { useState, useEffect } from 'react'
import { fetchActivityFeed, ActivityRow } from '../services/activity.service'

export function useActivity() {
  const [rows,    setRows]    = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [userId,  setUserId]  = useState<string | null>(null)
  const [redirectToLogin, setRedirectToLogin] = useState(false)

  useEffect(() => {
    fetchActivityFeed()
      .then(({ rows: r, userId: uid }) => {
        if (uid === null) { setRedirectToLogin(true); return }
        setRows(r)
        setUserId(uid)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { rows, loading, userId, redirectToLogin }
}
