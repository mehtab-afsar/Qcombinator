'use client'
import { useState, useEffect } from 'react'
import { BarChart3, PieChart, FileText, Layers, CreditCard, TrendingUp, RefreshCw } from 'lucide-react'
import { AgentWorkspace } from '@/features/agents/shared/components/AgentWorkspace'
import { surf, bdr, ink, muted, amber } from '@/features/agents/shared/constants/colors'

const accent = amber

const FELIX_DELIVERABLES = [
  { type: 'financial_summary',     icon: BarChart3,  label: 'Financial Summary',     description: 'MRR, ARR, burn, runway snapshot' },
  { type: 'financial_model',       icon: PieChart,   label: 'Financial Model',        description: '12/24-month P&L + cash flow model' },
  { type: 'investor_update',       icon: FileText,   label: 'Investor Update',        description: 'Monthly progress email to investors' },
  { type: 'board_deck',            icon: Layers,     label: 'Board Deck',             description: 'Quarterly board presentation' },
  { type: 'cap_table_summary',     icon: CreditCard, label: 'Cap Table Summary',      description: 'Ownership breakdown + dilution analysis' },
  { type: 'fundraising_narrative', icon: TrendingUp, label: 'Fundraising Narrative',  description: 'Seed / Series A story + ask' },
]

const SUGGESTED = [
  'Build a 12-month financial model',
  'What\'s my current burn rate and runway?',
  'Draft an investor update for this month',
  'Model out a Series A fundraise scenario',
  'Analyze my unit economics',
  'When should I start my next fundraise?',
]

const METRIC_FIELDS = [
  { key: 'mrr',            label: 'MRR',         prefix: '$', suffix: '' },
  { key: 'arr',            label: 'ARR',          prefix: '$', suffix: '' },
  { key: 'burn_rate',      label: 'Monthly Burn', prefix: '$', suffix: '' },
  { key: 'runway_months',  label: 'Runway',       prefix: '',  suffix: ' mo' },
  { key: 'revenue_growth', label: 'MoM Growth',   prefix: '',  suffix: '%' },
  { key: 'gross_margin',   label: 'Gross Margin', prefix: '',  suffix: '%' },
] as const

interface FinancialMetrics {
  mrr: number | null; arr: number | null; burn_rate: number | null
  runway_months: number | null; revenue_growth: number | null; gross_margin: number | null
}

function fmtVal(val: number | null, prefix: string, suffix: string) {
  if (val == null) return '—'
  const abs = Math.abs(val)
  let str: string
  if (prefix === '$' && abs >= 1_000_000) str = `${(val / 1_000_000).toFixed(1)}M`
  else if (prefix === '$' && abs >= 1_000) str = `${(val / 1_000).toFixed(0)}k`
  else str = String(val)
  return `${prefix}${str}${suffix}`
}

function runwayColor(months: number | null) {
  if (months == null) return muted
  if (months <= 3) return '#DC2626'
  if (months <= 6) return '#D97706'
  return '#16A34A'
}

function MetricRow({ label, value, prefix, suffix, onChange }: {
  label: string; value: number | null; prefix: string; suffix: string; onChange: (v: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value ?? ''))

  function commit() {
    const n = parseFloat(draft.replace(/[^0-9.-]/g, ''))
    onChange(isNaN(n) ? null : n)
    setEditing(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: 8, background: surf, border: `1px solid ${bdr}` }}>
      <span style={{ fontSize: 12, color: muted, fontWeight: 500 }}>{label}</span>
      {editing ? (
        <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          style={{ width: 90, fontSize: 13, fontWeight: 700, color: ink, background: 'transparent',
            border: `1px solid ${accent}`, borderRadius: 4, padding: '2px 6px', textAlign: 'right', outline: 'none' }} />
      ) : (
        <button onClick={() => { setDraft(String(value ?? '')); setEditing(true) }}
          style={{ fontSize: 13, fontWeight: 700, color: value == null ? muted : ink,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          {fmtVal(value, prefix, suffix)}
        </button>
      )}
    </div>
  )
}

function FelixFinancialsPanel({ onSend, accent }: { onSend: (text: string) => void; accent: string }) {
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    mrr: null, arr: null, burn_rate: null, runway_months: null, revenue_growth: null, gross_margin: null,
  })
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/agents/goals?agentId=felix').then(r => r.ok ? r.json() : null).then(d => {
      if (d) {
        const snap = d.goals?.[0]?.state_snapshot ?? {}
        setMetrics({
          mrr: snap.mrr ?? null, arr: snap.arr ?? null, burn_rate: snap.burn_rate ?? null,
          runway_months: snap.runway_months ?? null, revenue_growth: snap.revenue_growth ?? null,
          gross_margin: snap.gross_margin ?? null,
        })
      }
    }).finally(() => setLoading(false))
  }, [])

  async function saveMetrics() {
    await fetch('/api/agents/startup-state', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metrics) })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0 }}>Financial Snapshot</h2>
            <p style={{ fontSize: 12, color: muted, marginTop: 3 }}>Update your metrics — Felix uses these in every response</p>
          </div>
          <button onClick={saveMetrics} style={{ padding: '7px 16px', borderRadius: 8, background: accent, border: 'none',
            color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: muted }}>
            <RefreshCw size={18} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} /> Loading metrics…
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
            {METRIC_FIELDS.map(f => (
              <MetricRow key={f.key} label={f.label}
                value={metrics[f.key as keyof FinancialMetrics]}
                prefix={f.prefix} suffix={f.suffix}
                onChange={v => setMetrics(p => ({ ...p, [f.key]: v }))} />
            ))}
          </div>
        )}

        {metrics.runway_months != null && (
          <div style={{ padding: '16px 18px', borderRadius: 12, background: surf, border: `1px solid ${bdr}`, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>Runway</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: runwayColor(metrics.runway_months) }}>
                {metrics.runway_months} months
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: bdr, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(100, (metrics.runway_months / 24) * 100)}%`,
                background: runwayColor(metrics.runway_months), transition: 'width 0.4s ease' }} />
            </div>
            <p style={{ fontSize: 11, color: muted, marginTop: 6 }}>
              {metrics.runway_months <= 3  ? '⚠️ Raise immediately — critical runway' :
               metrics.runway_months <= 6  ? '⚠️ Start fundraise process now' :
               metrics.runway_months <= 12 ? 'Plan your next round in the next 3–6 months' :
               'Strong runway — focus on growth'}
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Build 12-month model',    prompt: 'Build a 12-month financial model based on my metrics' },
            { label: 'Calculate unit economics', prompt: 'Calculate and explain my unit economics (LTV, CAC, payback)' },
            { label: 'Draft investor update',    prompt: 'Draft a monthly investor update based on my latest metrics' },
            { label: 'Model fundraise scenarios',prompt: 'Model Series A fundraise scenarios at different valuations' },
          ].map(a => (
            <button key={a.label} onClick={() => onSend(a.prompt)}
              style={{ padding: '12px 14px', borderRadius: 10, background: `${accent}0D`,
                border: `1px solid ${accent}30`, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: accent }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function FelixWorkspace() {
  return (
    <AgentWorkspace
      agentId="felix"
      name="Felix"
      role="CFO · Financial Modeling & Fundraising"
      emoji="💰"
      accent={accent}
      badge="LIVE MODEL"
      deliverables={FELIX_DELIVERABLES}
      suggestedPrompts={SUGGESTED}
      customPanel={{
        id: 'financials',
        label: 'Financials',
        icon: BarChart3,
        badge: undefined,
        render: ({ workspace, accent: a }) => <FelixFinancialsPanel onSend={workspace.send} accent={a} />,
      }}
    />
  )
}
