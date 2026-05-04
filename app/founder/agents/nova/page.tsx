'use client'
import { useState, useEffect } from 'react'
import { FileText, Users, Target, BarChart3, Lightbulb, TrendingUp, Activity, RefreshCw } from 'lucide-react'
import { AgentWorkspace } from '@/features/agents/shared/components/AgentWorkspace'
import { surf, bdr, ink, muted } from '@/features/agents/shared/constants/colors'

const accent = '#7C3AED'

const NOVA_DELIVERABLES = [
  { type: 'pmf_survey',       icon: FileText,   label: 'PMF Survey',      description: 'Sean Ellis-style survey to measure fit' },
  { type: 'interview_script', icon: Users,      label: 'Interview Script', description: 'JTBD discovery interview questions' },
  { type: 'product_roadmap',  icon: Target,     label: 'Product Roadmap', description: 'Now/Next/Later outcome-based plan' },
  { type: 'feature_priority', icon: BarChart3,  label: 'Feature Priority', description: 'RICE/ICE scoring for backlog items' },
  { type: 'assumption_map',   icon: Lightbulb,  label: 'Assumption Map',  description: 'Riskiest assumptions ranked + validation plan' },
  { type: 'pivot_analysis',   icon: TrendingUp, label: 'Pivot/Persevere', description: 'Evidence-based pivot vs stay decision' },
]

const SUGGESTED = [
  'What are my riskiest product assumptions?',
  'Generate a PMF survey for my product',
  'Help me design a discovery interview script',
  'Build a RICE-scored feature priority list',
  'Should I pivot or persevere based on my metrics?',
  'Create a Now/Next/Later roadmap',
]

const PMF_SIGNALS = [
  { key: 'retention_d7',     label: 'Day 7 Retention',      suffix: '%', benchmark: 25, benchmarkLabel: 'benchmark' },
  { key: 'retention_d30',    label: 'Day 30 Retention',     suffix: '%', benchmark: 10, benchmarkLabel: 'benchmark' },
  { key: 'nps',              label: 'NPS Score',             suffix: '',  benchmark: 40, benchmarkLabel: 'good NPS' },
  { key: 'dau_mau',          label: 'DAU/MAU Ratio',         suffix: '%', benchmark: 20, benchmarkLabel: 'healthy' },
  { key: 'very_disappointed', label: '% Very Disappointed',  suffix: '%', benchmark: 40, benchmarkLabel: 'PMF threshold' },
] as const

interface SignalMetrics {
  retention_d7: number | null; retention_d30: number | null; nps: number | null
  dau_mau: number | null; very_disappointed: number | null
}

function pmfStrength(m: SignalMetrics): { label: string; color: string } {
  const scores: number[] = []
  if (m.retention_d7   != null) scores.push(m.retention_d7   >= 25 ? 1 : m.retention_d7 >= 15 ? 0.5 : 0)
  if (m.retention_d30  != null) scores.push(m.retention_d30  >= 10 ? 1 : m.retention_d30 >= 5  ? 0.5 : 0)
  if (m.nps            != null) scores.push(m.nps             >= 40 ? 1 : m.nps >= 20           ? 0.5 : 0)
  if (m.very_disappointed != null) scores.push(m.very_disappointed >= 40 ? 1 : m.very_disappointed >= 25 ? 0.5 : 0)
  if (!scores.length) return { label: 'No Data', color: muted }
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  if (avg >= 0.8) return { label: 'Strong PMF', color: '#16A34A' }
  if (avg >= 0.5) return { label: 'Weak PMF',   color: '#D97706' }
  return { label: 'Pre-PMF', color: '#DC2626' }
}

function SignalRow({ label, value, suffix, benchmark, benchmarkLabel, onChange }: {
  label: string; value: number | null; suffix: string; benchmark: number; benchmarkLabel: string; onChange: (v: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value ?? ''))

  function commit() {
    const n = parseFloat(draft.replace(/[^0-9.-]/g, ''))
    onChange(isNaN(n) ? null : n)
    setEditing(false)
  }

  const isGood = value != null && value >= benchmark
  const barW   = value != null ? Math.min(100, (value / (benchmark * 2)) * 100) : 0

  return (
    <div style={{ padding: '12px 14px', borderRadius: 10, background: surf, border: `1px solid ${bdr}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{label}</span>
        {editing ? (
          <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            style={{ width: 70, fontSize: 13, fontWeight: 700, textAlign: 'right', background: 'transparent',
              border: `1px solid ${accent}`, borderRadius: 4, padding: '2px 6px', outline: 'none', color: ink }} />
        ) : (
          <button onClick={() => { setDraft(String(value ?? '')); setEditing(true) }}
            style={{ fontSize: 13, fontWeight: 700, color: value == null ? muted : isGood ? '#16A34A' : '#DC2626',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {value == null ? 'Add' : `${value}${suffix}`}
          </button>
        )}
      </div>
      <div style={{ height: 4, borderRadius: 2, background: bdr, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${barW}%`, borderRadius: 2,
          background: isGood ? '#16A34A' : value != null ? '#D97706' : bdr, transition: 'width 0.4s' }} />
      </div>
      <p style={{ fontSize: 10, color: muted, marginTop: 4 }}>
        Target: {benchmark}{suffix} {benchmarkLabel}
        {value != null && !isGood && <span style={{ color: '#D97706', fontWeight: 600 }}> — below threshold</span>}
        {value != null && isGood  && <span style={{ color: '#16A34A', fontWeight: 600 }}> — above target ✓</span>}
      </p>
    </div>
  )
}

function NovaSignalsPanel({ onSend, accent }: { onSend: (text: string) => void; accent: string }) {
  const [signals, setSignals] = useState<SignalMetrics>({
    retention_d7: null, retention_d30: null, nps: null, dau_mau: null, very_disappointed: null,
  })
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/agents/goals?agentId=nova').then(r => r.ok ? r.json() : null).then(d => {
      if (d) {
        const snap = d.goals?.[0]?.state_snapshot ?? {}
        setSignals({
          retention_d7:      snap.retention_d7      ?? null,
          retention_d30:     snap.retention_d30     ?? null,
          nps:               snap.nps               ?? null,
          dau_mau:           snap.dau_mau           ?? null,
          very_disappointed: snap.very_disappointed ?? null,
        })
      }
    }).finally(() => setLoading(false))
  }, [])

  async function saveSignals() {
    await fetch('/api/agents/startup-state', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(signals) })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const strength = pmfStrength(signals)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0 }}>PMF Signals</h2>
            <p style={{ fontSize: 12, color: muted, marginTop: 3 }}>Click any value to update — Nova uses these to calibrate advice</p>
          </div>
          <button onClick={saveSignals} style={{ padding: '7px 16px', borderRadius: 8, background: accent, border: 'none',
            color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>

        <div style={{ padding: '14px 18px', borderRadius: 12, marginBottom: 20,
          background: `${strength.color}12`, border: `1px solid ${strength.color}30`,
          display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: strength.color, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: strength.color, margin: 0 }}>{strength.label}</p>
            <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>
              {strength.label === 'Strong PMF' ? 'Signals look healthy — focus on scaling' :
               strength.label === 'Weak PMF'   ? 'Mixed signals — identify the weakest link' :
               strength.label === 'Pre-PMF'    ? 'Below thresholds — focus on finding fit before scaling' :
               'Add your metrics to see your PMF assessment'}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: muted }}>
            <RefreshCw size={18} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} /> Loading…
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {PMF_SIGNALS.map(f => (
              <SignalRow key={f.key} label={f.label}
                value={signals[f.key as keyof SignalMetrics]}
                suffix={f.suffix} benchmark={f.benchmark} benchmarkLabel={f.benchmarkLabel}
                onChange={v => setSignals(p => ({ ...p, [f.key]: v }))} />
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Pivot or Persevere?',  prompt: 'Analyse my PMF signals and advise whether I should pivot or persevere' },
            { label: 'Identify gaps',         prompt: 'Which PMF signals are weakest and what should I fix first?' },
            { label: 'Interview 5 users',     prompt: 'Generate a JTBD discovery interview script to improve my PMF signals' },
            { label: 'Build retention loop',  prompt: 'Design a retention loop to improve my Day 7 and Day 30 retention' },
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

export default function NovaWorkspace() {
  return (
    <AgentWorkspace
      agentId="nova"
      name="Nova"
      role="CPO · Product Strategy & PMF"
      emoji="🔬"
      accent={accent}
      badge="PMF SIGNAL"
      deliverables={NOVA_DELIVERABLES}
      suggestedPrompts={SUGGESTED}
      customPanel={{
        id: 'signals',
        label: 'Signals',
        icon: Activity,
        badge: undefined,
        render: ({ workspace, accent: a }) => <NovaSignalsPanel onSend={workspace.send} accent={a} />,
      }}
    />
  )
}
