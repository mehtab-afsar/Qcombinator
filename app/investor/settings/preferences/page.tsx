'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Save, RotateCcw } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useToast } from '@/features/shared/hooks/useToast'
import { INVESTOR_DEFAULTS } from '@/lib/constants/investor-config/defaults'
import type { InvestorType, InvestorConfig } from '@/lib/constants/investor-config/types'
import { bg, surf, bdr, ink, muted, blue } from '@/lib/constants/colors'

export default function InvestorPreferencesPage() {
  const _router = useRouter()
  const { user: _user } = useAuth()
  const { toast } = useToast()
  const showToast = useCallback(
    (msg: string, variant: 'success' | 'error' | 'info' | 'warning' = 'info') => toast[variant](msg),
    [toast]
  )

  const [investorType, setInvestorType] = useState<InvestorType>('seed-vc')
  const [config, setConfig] = useState<InvestorConfig>(INVESTOR_DEFAULTS['seed-vc'])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch existing config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/investor/config')
        if (res.ok) {
          const data = await res.json()
          setInvestorType(data.investorType)
          setConfig(data)
        } else {
          showToast('Failed to load configuration', 'error')
        }
      } catch (error) {
        console.error('Error fetching config:', error)
        showToast('Failed to load configuration', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [showToast])

  // When investor type changes, load new defaults
  const handleTypeChange = (newType: InvestorType) => {
    setInvestorType(newType)
    setConfig(INVESTOR_DEFAULTS[newType])
  }

  // Reset to defaults
  const handleReset = () => {
    if (confirm('Reset all preferences to defaults?')) {
      setConfig(INVESTOR_DEFAULTS[investorType])
      showToast('Preferences reset to defaults', 'info')
    }
  }

  // Save config
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/investor/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investorType,
          preferences: config.preferences,
        }),
      })

      if (res.ok) {
        showToast('Preferences saved successfully', 'success')
      } else {
        showToast('Failed to save preferences', 'error')
      }
    } catch (error) {
      console.error('Error saving config:', error)
      showToast('Failed to save preferences', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 32 }}>
        <div style={{ opacity: 0.5 }}>Loading preferences...</div>
      </div>
    )
  }

  const INVESTOR_TYPES: { type: InvestorType; label: string; tier: string }[] = [
    { type: 'angel', label: 'Angel Investor', tier: 'Free' },
    { type: 'seed-vc', label: 'Seed VC', tier: 'Pro' },
    { type: 'growth-vc', label: 'Growth VC', tier: 'Pro' },
    { type: 'corporate', label: 'Corporate', tier: 'Enterprise' },
  ]

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: muted, textTransform: 'uppercase', margin: 0 }}>
            Settings
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 300, color: ink, margin: '8px 0 6px' }}>
            Deal Flow Preferences
          </h1>
          <p style={{ fontSize: 14, color: muted, margin: 0 }}>
            Customize how QCombinator matches and ranks founders for you
          </p>
        </div>

        {/* Investor Type Selection */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: ink, marginBottom: 16 }}>
            Investor Profile
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
            }}
          >
            {INVESTOR_TYPES.map(({ type, label, tier }) => (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                style={{
                  padding: 16,
                  border: investorType === type ? `2px solid ${blue}` : `1px solid ${bdr}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  background: investorType === type ? `${blue}08` : '#fff',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 600, color: ink, margin: '0 0 4px' }}>
                  {label}
                </h3>
                <p style={{ fontSize: 12, color: muted, margin: 0 }}>
                  {tier}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Deal Filters */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: ink, marginBottom: 16 }}>
            Deal Filters
          </h2>
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${bdr}`, padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
              {/* Minimum Q-Score */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ink, marginBottom: 8 }}>
                  Minimum Q-Score
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={config.preferences.dealFilters.minQScore}
                    onChange={e =>
                      setConfig({
                        ...config,
                        preferences: {
                          ...config.preferences,
                          dealFilters: {
                            ...config.preferences.dealFilters,
                            minQScore: Number(e.target.value),
                          },
                        },
                      })
                    }
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: ink, minWidth: 40 }}>
                    {config.preferences.dealFilters.minQScore}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: muted, margin: '6px 0 0' }}>
                  Only show founders with Q-Score ≥ {config.preferences.dealFilters.minQScore}
                </p>
              </div>

              {/* Max Valuation */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ink, marginBottom: 8 }}>
                  Maximum Valuation
                </label>
                <input
                  type="number"
                  value={config.preferences.dealFilters.maxValuation === Infinity ? '' : config.preferences.dealFilters.maxValuation / 1_000_000}
                  onChange={e => {
                    const val = e.target.value === '' ? Infinity : Number(e.target.value) * 1_000_000
                    setConfig({
                      ...config,
                      preferences: {
                        ...config.preferences,
                        dealFilters: {
                          ...config.preferences.dealFilters,
                          maxValuation: val,
                        },
                      },
                    })
                  }}
                  placeholder="Unlimited"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${bdr}`,
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
                <p style={{ fontSize: 11, color: muted, margin: '6px 0 0' }}>in millions USD</p>
              </div>
            </div>

            {/* Preferred Stages */}
            <div style={{ marginTop: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ink, marginBottom: 8 }}>
                Preferred Stages
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                {['idea', 'mvp', 'pre-seed', 'seed', 'series-a'].map(stage => (
                  <label key={stage} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={config.preferences.dealFilters.stages.includes(stage as never)}
                      onChange={e => {
                        const newStages = e.target.checked
                          ? [...config.preferences.dealFilters.stages, stage as never]
                          : config.preferences.dealFilters.stages.filter(s => s !== stage)
                        setConfig({
                          ...config,
                          preferences: {
                            ...config.preferences,
                            dealFilters: {
                              ...config.preferences.dealFilters,
                              stages: newStages,
                            },
                          },
                        })
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 13, color: ink, textTransform: 'capitalize' }}>
                      {stage === 'pre-seed' ? 'Pre-Seed' : stage.charAt(0).toUpperCase() + stage.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Matching Weights */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: ink, marginBottom: 16 }}>
            Q-Score Weights
          </h2>
          <p style={{ fontSize: 13, color: muted, marginBottom: 20 }}>
            Configure how much each Q-Score dimension matters for your deal sourcing (0-100 scale)
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24,
            }}
          >
            {[
              { key: 'founderTeam', label: 'Founder & Team' },
              { key: 'marketReadiness', label: 'Market Readiness' },
              { key: 'marketPotential', label: 'Market Potential' },
              { key: 'ipDefensibility', label: 'IP & Defensibility' },
              { key: 'structuralImpact', label: 'Structural Impact' },
              { key: 'financials', label: 'Financials' },
            ].map(({ key, label }) => (
              <div
                key={key}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: `1px solid ${bdr}`,
                  padding: 16,
                }}
              >
                <label style={{ display: 'block', marginBottom: 12 }}>
                  <strong style={{ fontSize: 13, color: ink }}>{label}</strong>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={config.preferences.matchingWeights[key as keyof typeof config.preferences.matchingWeights]}
                    onChange={e =>
                      setConfig({
                        ...config,
                        preferences: {
                          ...config.preferences,
                          matchingWeights: {
                            ...config.preferences.matchingWeights,
                            [key]: Number(e.target.value),
                          },
                        },
                      })
                    }
                    style={{ width: '100%', marginTop: 8 }}
                  />
                </label>
                <p style={{ fontSize: 12, color: muted, margin: '8px 0 0' }}>
                  Weight: <strong>{config.preferences.matchingWeights[key as keyof typeof config.preferences.matchingWeights]}</strong> / 100
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Dashboard KPIs */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: ink, marginBottom: 16 }}>
            Dashboard Metrics
          </h2>
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${bdr}`, padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {['portfolio-value', 'deal-pipeline', 'returns', 'activity'].map(kpi => (
                <label key={kpi} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config.preferences.dashboardKPIs.includes(kpi as never)}
                    onChange={e => {
                      const newKPIs = e.target.checked
                        ? [...config.preferences.dashboardKPIs, kpi as never]
                        : config.preferences.dashboardKPIs.filter(k => k !== kpi)
                      setConfig({
                        ...config,
                        preferences: {
                          ...config.preferences,
                          dashboardKPIs: newKPIs,
                        },
                      })
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 13, color: ink }}>
                    {kpi.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 8,
              border: `1px solid ${bdr}`,
              background: '#fff',
              color: muted,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = surf)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#fff')}
          >
            <RotateCcw style={{ height: 14, width: 14 }} />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              background: blue,
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            <Save style={{ height: 14, width: 14 }} />
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}
