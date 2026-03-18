import { useState, useEffect } from 'react'
import { loadInvestorSettings, InvestorSettingsData } from '../services/investor-settings.service'

export function useInvestorSettings() {
  const [settings, setSettings] = useState<InvestorSettingsData | null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    loadInvestorSettings()
      .then(s => { if (s) setSettings(s) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { settings, loading, setSettings }
}
