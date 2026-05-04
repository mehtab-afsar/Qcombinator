'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Target, Users, Search, BarChart3, FlaskConical, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgentWorkspace } from '@/features/agents/shared/components/AgentWorkspace'
import { bg, surf, bdr, ink, muted } from '@/features/agents/shared/constants/colors'

const accent = '#EA580C'

const RILEY_DELIVERABLES = [
  { type: 'growth_model',       icon: TrendingUp,   label: 'Growth Model',       description: 'Channel strategy, CAC targets, MoM growth projections' },
  { type: 'ad_campaign',        icon: Target,       label: 'Ad Campaign',        description: 'Campaign structure, ad copy variants, bidding strategy' },
  { type: 'referral_program',   icon: Users,        label: 'Referral Program',   description: 'Two-sided incentive, mechanic, viral coefficient model' },
  { type: 'seo_brief',          icon: Search,       label: 'SEO Brief',          description: 'Keyword clusters mapped to ICP pain points' },
  { type: 'experiment_backlog', icon: FlaskConical, label: 'Experiment Backlog', description: 'Prioritised growth experiments with hypotheses' },
  { type: 'growth_report',      icon: BarChart3,    label: 'Growth Report',      description: 'CAC, MoM growth, channel ROAS, top experiments this month' },
]

const SUGGESTED = [
  'What growth channel should I focus on first?',
  'Build a Google Ads campaign for my product',
  'Design a referral program with viral mechanics',
  'Create a prioritised experiment backlog',
  "What's my CAC and how do I compress it?",
  'Build a 90-day growth model',
]

const EXP_STATUSES = [
  { id: 'backlog', label: 'Backlog', color: '#6B7280' },
  { id: 'running', label: 'Running', color: '#16A34A' },
  { id: 'won',     label: 'Won',     color: '#2563EB' },
  { id: 'killed',  label: 'Killed',  color: '#DC2626' },
] as const

const CHANNELS = ['Paid', 'SEO', 'Referral', 'Content', 'Product', 'Email', 'Other'] as const

type ExpStatus = typeof EXP_STATUSES[number]['id']
type Channel   = typeof CHANNELS[number]

interface Experiment {
  id: string; hypothesis: string; metric: string
  status: ExpStatus; channel?: string; result?: string; created_at: string
}

function ExperimentCard({ experiment, onStatusChange, onDelete }: {
  experiment:    Experiment
  onStatusChange:(id: string, status: ExpStatus) => void
  onDelete:      (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const nextStatuses = EXP_STATUSES.filter(s => s.id !== experiment.status)

  return (
    <div style={{ borderRadius: 10, background: surf, border: `1px solid ${bdr}`, overflow: 'hidden', marginBottom: 8 }}>
      <div style={{ padding: '11px 13px', cursor: 'pointer' }} onClick={() => setExpanded(p => !p)}>
        <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: '0 0 6px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {experiment.hypothesis}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: muted, background: bg, border: `1px solid ${bdr}`, borderRadius: 4, padding: '2px 6px', fontWeight: 500 }}>📏 {experiment.metric}</span>
          {experiment.channel && <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: `${accent}18`, border: `1px solid ${accent}30`, borderRadius: 4, padding: '2px 6px' }}>{experiment.channel}</span>}
          {experiment.status === 'running' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#16A34A', fontWeight: 600 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />Running</span>}
          {experiment.status === 'won'     && <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 700 }}>✓ Won</span>}
          {experiment.status === 'killed'  && <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 700 }}>× Killed</span>}
          <ChevronRight size={12} color={muted} style={{ marginLeft: 'auto', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
        </div>
        {(experiment.status === 'won' || experiment.status === 'killed') && experiment.result && (
          <p style={{ fontSize: 11, color: muted, margin: '6px 0 0', borderTop: `1px solid ${bdr}`, paddingTop: 6 }}>{experiment.result}</p>
        )}
      </div>
      {expanded && (
        <div style={{ padding: '0 13px 13px', borderTop: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: muted, letterSpacing: '0.06em', margin: '10px 0 6px' }}>MOVE TO</p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
            {nextStatuses.map(s => (
              <button key={s.id} onClick={() => onStatusChange(experiment.id, s.id)}
                style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'transparent', border: `1px solid ${s.color}`, color: s.color, cursor: 'pointer' }}>
                {s.label}
              </button>
            ))}
          </div>
          <button onClick={() => onDelete(experiment.id)}
            style={{ width: 30, height: 30, borderRadius: 7, background: 'transparent', border: `1px solid ${bdr}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={12} color={muted} />
          </button>
        </div>
      )}
    </div>
  )
}

function RileyExperimentsPanel({ onSend, accent: a }: { onSend: (text: string) => void; accent: string }) {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading]         = useState(true)
  const [adding, setAdding]           = useState(false)
  const [statusFilter, setStatusFilter] = useState<ExpStatus | 'all'>('all')
  const [newHypothesis, setNewHypothesis] = useState('')
  const [newMetric, setNewMetric]         = useState('')
  const [newChannel, setNewChannel]       = useState<Channel | ''>('')

  useEffect(() => {
    fetch('/api/agents/experiments').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.experiments) {
        setExperiments(d.experiments.map((e: Record<string, unknown>) => ({
          id: e.id, hypothesis: e.hypothesis, metric: e.metric,
          status: (e.status ?? 'backlog') as ExpStatus, channel: e.channel, result: e.result, created_at: e.created_at,
        })))
      }
    }).finally(() => setLoading(false))
  }, [])

  async function addExperiment() {
    if (!newHypothesis.trim() || !newMetric.trim()) return
    const res = await fetch('/api/agents/experiments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hypothesis: newHypothesis.trim(), metric: newMetric.trim(), channel: newChannel || undefined, status: 'backlog' }),
    })
    if (res.ok) {
      const { experiment } = await res.json()
      setExperiments(p => [...p, { id: experiment.id, hypothesis: newHypothesis.trim(), metric: newMetric.trim(), channel: newChannel || undefined, status: 'backlog', created_at: new Date().toISOString() }])
    }
    setNewHypothesis(''); setNewMetric(''); setNewChannel(''); setAdding(false)
  }

  async function changeStatus(id: string, status: ExpStatus) {
    setExperiments(p => p.map(e => e.id === id ? { ...e, status } : e))
    await fetch(`/api/agents/experiments/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
  }

  async function deleteExperiment(id: string) {
    setExperiments(p => p.filter(e => e.id !== id))
    await fetch(`/api/agents/experiments/${id}`, { method: 'DELETE' })
  }

  const running = experiments.filter(e => e.status === 'running').length
  const won     = experiments.filter(e => e.status === 'won').length
  const backlog = experiments.filter(e => e.status === 'backlog').length
  const filtered = statusFilter === 'all' ? experiments : experiments.filter(e => e.status === statusFilter)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0 }}>Growth Experiments</h2>
            <p style={{ fontSize: 12, color: muted, marginTop: 3 }}>{running} running · {won} won · {backlog} in backlog</p>
          </div>
          <button onClick={() => setAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: a, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={13} /> Add Experiment
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {(['all', ...EXP_STATUSES.map(s => s.id)] as const).map(id => {
            const meta = id === 'all' ? null : EXP_STATUSES.find(s => s.id === id)!
            const active = statusFilter === id
            return (
              <button key={id} onClick={() => setStatusFilter(id as typeof statusFilter)}
                style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: active ? (meta ? `${meta.color}22` : ink) : 'transparent',
                  border: `1px solid ${active ? (meta?.color ?? ink) : bdr}`,
                  color: active ? (meta?.color ?? bg) : muted }}>
                {id === 'all' ? 'All' : meta!.label}
              </button>
            )
          })}
        </div>

        <AnimatePresence>
          {adding && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ padding: 16, borderRadius: 12, background: surf, border: `1px solid ${a}44`, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 12 }}>Add Experiment</p>
              <textarea autoFocus value={newHypothesis} onChange={e => setNewHypothesis(e.target.value)}
                placeholder="Hypothesis: If we [action], then [metric] will [change] because [reason] *"
                rows={2}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 12, color: ink, outline: 'none', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <input value={newMetric} onChange={e => setNewMetric(e.target.value)} placeholder="Success metric *"
                  style={{ flex: 2, padding: '8px 10px', borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 12, color: ink, outline: 'none', fontFamily: 'inherit' }} />
                <select value={newChannel} onChange={e => setNewChannel(e.target.value as Channel | '')}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 12, color: ink, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
                  <option value="">Channel</option>
                  {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addExperiment} disabled={!newHypothesis.trim() || !newMetric.trim()}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: a, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: newHypothesis.trim() && newMetric.trim() ? 'pointer' : 'default', opacity: newHypothesis.trim() && newMetric.trim() ? 1 : 0.5 }}>
                  Add to Backlog
                </button>
                <button onClick={() => setAdding(false)}
                  style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', border: `1px solid ${bdr}`, fontSize: 12, color: muted, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: muted, fontSize: 13 }}>Loading experiments…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: muted }}>
            <FlaskConical size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No experiments yet — add your first hypothesis above</p>
            <button onClick={() => onSend('Create a prioritised growth experiment backlog for my startup')}
              style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, background: a, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              Generate with Riley
            </button>
          </div>
        ) : (
          filtered.map(exp => (
            <ExperimentCard key={exp.id} experiment={exp} onStatusChange={changeStatus} onDelete={deleteExperiment} />
          ))
        )}
      </div>
    </div>
  )
}

export default function RileyWorkspace() {
  return (
    <AgentWorkspace
      agentId="riley"
      name="Riley"
      role="CGO · Growth"
      emoji="🚀"
      accent={accent}
      badge="GROWTH ENGINE"
      deliverables={RILEY_DELIVERABLES}
      suggestedPrompts={SUGGESTED}
      customPanel={{
        id: 'experiments',
        label: 'Experiments',
        icon: FlaskConical,
        render: ({ workspace, accent: a }) => <RileyExperimentsPanel onSend={workspace.send} accent={a} />,
      }}
    />
  )
}
