'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Phone, PieChart, Briefcase, BarChart2,
  Target, AlertCircle, Plus,
} from 'lucide-react'
import { AgentWorkspace } from '@/features/agents/shared/components/AgentWorkspace'
import { bg, surf, bdr, ink, muted, green } from '@/features/agents/shared/constants/colors'

const accent = green

const SUSI_DELIVERABLES = [
  { type: 'sales_script',      icon: FileText,  label: 'Sales Script',      description: 'Discovery questions, pitch, objection handling' },
  { type: 'call_playbook',     icon: Phone,     label: 'Call Playbook',     description: 'Pre-call prep for a specific deal' },
  { type: 'pipeline_report',   icon: PieChart,  label: 'Pipeline Report',   description: 'Stage analysis, velocity & recommended actions' },
  { type: 'proposal',          icon: Briefcase, label: 'Proposal',          description: 'Branded proposal with ROI estimate' },
  { type: 'win_loss_analysis', icon: BarChart2, label: 'Win/Loss Analysis', description: 'Deal patterns, objection themes, competitive signals' },
]

const SUGGESTED = [
  'Design a cold outreach sequence for my product',
  'Help me qualify this lead better',
  'What should my sales process look like?',
  'How do I handle price objections?',
  'Build a discovery call script',
  'How do I scale from founder-led sales?',
]

const STAGES = [
  { id: 'lead',        label: 'Lead',        color: '#6B7280' },
  { id: 'qualified',   label: 'Qualified',   color: '#2563EB' },
  { id: 'proposal',    label: 'Proposal',    color: '#D97706' },
  { id: 'negotiating', label: 'Negotiating', color: '#7C3AED' },
  { id: 'won',         label: 'Won',         color: '#16A34A' },
  { id: 'lost',        label: 'Lost',        color: '#DC2626' },
] as const

type StageId = typeof STAGES[number]['id']

interface Deal {
  id: string; company: string; contact_name?: string
  contact_title?: string; stage: StageId; value?: number
  next_action?: string
}

interface Reminder {
  id: string; company: string; contact_name?: string
  next_action?: string; label: string; isOverdue: boolean
}

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`
  return `$${n}`
}

function StageBadge({ stage }: { stage: StageId }) {
  const s = STAGES.find(x => x.id === stage)
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
      background: (s?.color ?? '#6B7280') + '18', color: s?.color ?? '#6B7280', textTransform: 'capitalize' }}>
      {s?.label ?? stage}
    </span>
  )
}

function DealCard({ deal, onMove, onChat }: {
  deal: Deal
  onMove: (id: string, stage: StageId) => void
  onChat: (msg: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 10, padding: '12px 14px', marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{deal.company}</p>
          {deal.contact_name && <p style={{ fontSize: 11, color: muted, marginTop: 1 }}>{deal.contact_name}{deal.contact_title ? ` · ${deal.contact_title}` : ''}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {deal.value && <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>{fmt$(deal.value)}</span>}
          <StageBadge stage={deal.stage} />
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${bdr}` }}>
              {deal.next_action && <p style={{ fontSize: 11, color: muted, marginBottom: 8 }}><span style={{ fontWeight: 600, color: ink }}>Next: </span>{deal.next_action}</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                {STAGES.filter(s => s.id !== deal.stage).map(s => (
                  <button key={s.id} onClick={() => onMove(deal.id, s.id)}
                    style={{ padding: '3px 9px', borderRadius: 5, fontSize: 10, fontWeight: 600, border: `1px solid ${bdr}`, background: bg, color: s.color, cursor: 'pointer', fontFamily: 'inherit' }}>
                    → {s.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onChat(`Help me follow up on my deal with ${deal.company}${deal.contact_name ? ` (${deal.contact_name})` : ''}. Stage: ${deal.stage}.${deal.next_action ? ` Planned next action: ${deal.next_action}` : ''}`)}
                style={{ padding: '5px 12px', borderRadius: 6, background: ink, color: bg, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
                Ask Susi
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SusiPipelinePanel({ onSend, accent: a }: { onSend: (text: string) => void; accent: string }) {
  const [deals, setDeals]               = useState<Deal[]>([])
  const [reminders, setReminders]       = useState<Reminder[]>([])
  const [loading, setLoading]           = useState(true)
  const [pipelineFilter, setPipelineFilter] = useState<StageId | 'all'>('all')

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/agents/deals').then(r => r.ok ? r.json() : null),
      fetch('/api/agents/deals/reminders').then(r => r.ok ? r.json() : null),
    ]).then(([dealsRes, remRes]) => {
      if (dealsRes.status === 'fulfilled' && dealsRes.value?.deals) setDeals(dealsRes.value.deals)
      if (remRes.status === 'fulfilled' && remRes.value?.reminders) setReminders(remRes.value.reminders)
    }).finally(() => setLoading(false))
  }, [])

  const moveDeal = useCallback(async (dealId: string, stage: StageId) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage } : d))
    await fetch('/api/agents/deals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: dealId, stage }) })
  }, [])

  const active = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost')
  const pipelineValue = active.reduce((s, d) => s + (d.value ?? 0), 0)
  const filteredDeals = pipelineFilter === 'all' ? deals : deals.filter(d => d.stage === pipelineFilter)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, marginBottom: 4 }}>Pipeline</h2>
            <p style={{ fontSize: 12, color: muted }}>{deals.length} total deals · {fmt$(pipelineValue)} active value</p>
          </div>
          <button onClick={() => onSend('Help me add a new deal to the pipeline')}
            style={{ padding: '7px 14px', borderRadius: 8, background: ink, color: bg, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={12} /> Add deal
          </button>
        </div>

        {reminders.length > 0 && (
          <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: '12px 14px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <AlertCircle size={11} style={{ display: 'inline', marginRight: 5, color: '#D97706' }} />
              Follow-up Reminders
            </p>
            {reminders.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{r.company}</span>
                  {r.contact_name && <span style={{ fontSize: 11, color: muted }}> · {r.contact_name}</span>}
                  <span style={{ fontSize: 10, marginLeft: 6, padding: '2px 6px', borderRadius: 4, background: r.isOverdue ? '#FEE2E2' : '#FEF3C7', color: r.isOverdue ? '#B91C1C' : '#92400E', fontWeight: 600 }}>{r.label}</span>
                  {r.next_action && <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>{r.next_action}</p>}
                </div>
                <button onClick={() => onSend(`Help me follow up on my deal with ${r.company}${r.next_action ? `. Next action: ${r.next_action}` : ''}`)}
                  style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#F59E0B', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
                  Follow Up
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
          {STAGES.map(s => {
            const count = deals.filter(d => d.stage === s.id).length
            const value = deals.filter(d => d.stage === s.id).reduce((sum, d) => sum + (d.value ?? 0), 0)
            return (
              <button key={s.id} onClick={() => setPipelineFilter(pipelineFilter === s.id ? 'all' : s.id)}
                style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${pipelineFilter === s.id ? s.color : bdr}`, background: pipelineFilter === s.id ? s.color + '10' : bg, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.label}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: ink, marginTop: 2 }}>{count}</p>
                {value > 0 && <p style={{ fontSize: 10, color: muted, marginTop: 1 }}>{fmt$(value)}</p>}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: muted, fontSize: 13 }}>Loading pipeline…</div>
        ) : filteredDeals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Target size={28} style={{ color: bdr, marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: muted, marginBottom: 8 }}>No deals yet</p>
            <button onClick={() => onSend('Help me add a new deal to the pipeline')} style={{ padding: '8px 20px', borderRadius: 8, background: ink, color: bg, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>Add first deal</button>
          </div>
        ) : (
          filteredDeals.map(deal => (
            <DealCard key={deal.id} deal={deal} onMove={moveDeal} onChat={onSend} />
          ))
        )}
      </div>
    </div>
  )
}

export default function SusiWorkspace() {
  return (
    <AgentWorkspace
      agentId="susi"
      name="Susi"
      role="CRO · Sales"
      emoji="📞"
      accent={accent}
      badge="AI SDR"
      deliverables={SUSI_DELIVERABLES}
      suggestedPrompts={SUGGESTED}
      customPanel={{
        id: 'pipeline',
        label: 'Pipeline',
        icon: Target,
        render: ({ workspace, accent: a }) => <SusiPipelinePanel onSend={workspace.send} accent={a} />,
      }}
    />
  )
}
