'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Activity, AlertTriangle, BarChart3, TrendingUp, Star, ChevronRight, Plus, Trash2, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgentWorkspace } from '@/features/agents/shared/components/AgentWorkspace'
import { bg, surf, bdr, ink, muted } from '@/features/agents/shared/constants/colors'

const accent = '#16A34A'

const CARTER_DELIVERABLES = [
  { type: 'onboarding_sequence', icon: BookOpen,      label: 'Onboarding Sequence', description: 'Day 1/7/30 milestones + proactive check-ins' },
  { type: 'health_scorecard',    icon: Activity,      label: 'Health Scorecard',    description: 'Composite account health model + thresholds' },
  { type: 'churn_risk_report',   icon: AlertTriangle, label: 'Churn Risk Report',   description: 'At-risk accounts with intervention playbooks' },
  { type: 'qbr_template',        icon: BarChart3,     label: 'QBR Template',        description: 'ROI quantification + renewal defense + expansion' },
  { type: 'expansion_playbook',  icon: TrendingUp,    label: 'Expansion Playbook',  description: 'Upsell/seat expansion/referral triggers' },
  { type: 'nps_survey',          icon: Star,          label: 'NPS Survey',          description: '3-question NPS with follow-up routing' },
]

const SUGGESTED = [
  'Which customers are at risk of churning?',
  'Build an onboarding sequence for new customers',
  'Create a QBR template for enterprise accounts',
  'Design a health scorecard for my customer base',
  'Which accounts have expansion potential?',
  'How do I get customers to refer others?',
]

type AccountHealth = 'green' | 'yellow' | 'red'
type AccountStage  = 'onboarding' | 'active' | 'at-risk' | 'churned' | 'champion'

interface Account {
  id: string; company: string; contact_name?: string
  arr?: number; health: AccountHealth; stage: AccountStage
  last_contact?: string; notes?: string
}

const HEALTH_CONFIG: Record<AccountHealth, { dot: string; label: string; bg: string; border: string }> = {
  green:  { dot: '#16A34A', label: 'Healthy',  bg: '#16A34A18', border: '#16A34A30' },
  yellow: { dot: '#D97706', label: 'At Risk',  bg: '#D9770618', border: '#D9770630' },
  red:    { dot: '#DC2626', label: 'Critical', bg: '#DC262618', border: '#DC262630' },
}

const STAGE_ORDER: AccountStage[] = ['onboarding', 'active', 'at-risk', 'churned', 'champion']

function fmtArr(arr: number) {
  if (arr >= 1_000_000) return `$${(arr / 1_000_000).toFixed(1)}M`
  if (arr >= 1_000)     return `$${Math.round(arr / 1_000)}k`
  return `$${arr}`
}

function AccountCard({ account, onStageChange, onDelete, onAsk }: {
  account: Account
  onStageChange: (id: string, stage: AccountStage) => void
  onDelete:      (id: string) => void
  onAsk:         (prompt: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hcfg = HEALTH_CONFIG[account.health]

  return (
    <div style={{ borderRadius: 10, background: surf, border: `1px solid ${bdr}`, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', cursor: 'pointer' }} onClick={() => setExpanded(p => !p)}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: hcfg.dot, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>{account.company}</p>
          {account.contact_name && <p style={{ fontSize: 11, color: muted, margin: 0 }}>{account.contact_name}</p>}
        </div>
        {account.arr != null && <span style={{ fontSize: 11, fontWeight: 600, color: ink, flexShrink: 0 }}>{fmtArr(account.arr)}</span>}
        <span style={{ fontSize: 10, fontWeight: 700, color: hcfg.dot, background: hcfg.bg, border: `1px solid ${hcfg.border}`, borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>{hcfg.label}</span>
        <ChevronRight size={13} color={muted} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>
      {expanded && (
        <div style={{ padding: '0 13px 13px', borderTop: `1px solid ${bdr}` }}>
          <div style={{ display: 'flex', gap: 14, marginTop: 10, marginBottom: 10 }}>
            {account.last_contact && <p style={{ fontSize: 11, color: muted, margin: 0 }}>Last contact: <strong style={{ color: ink }}>{account.last_contact}</strong></p>}
            <p style={{ fontSize: 11, color: muted, margin: 0 }}>Stage: <strong style={{ color: ink }}>{account.stage}</strong></p>
          </div>
          {account.notes && <p style={{ fontSize: 11, color: muted, margin: '0 0 10px', fontStyle: 'italic' }}>{account.notes}</p>}
          <p style={{ fontSize: 10, fontWeight: 600, color: muted, letterSpacing: '0.06em', margin: '0 0 6px' }}>MOVE TO STAGE</p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
            {STAGE_ORDER.filter(s => s !== account.stage).map(s => (
              <button key={s} onClick={() => onStageChange(account.id, s)}
                style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'transparent', border: `1px solid ${bdr}`, color: muted, cursor: 'pointer' }}>
                {s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => onAsk(`Create a churn intervention plan for ${account.company}`)}
              style={{ flex: 1, padding: '6px 0', borderRadius: 7, background: accent, border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Plan Intervention
            </button>
            <button onClick={() => onAsk(`Prepare a QBR for ${account.company}${account.arr != null ? ` with ${fmtArr(account.arr)} ARR` : ''}`)}
              style={{ flex: 1, padding: '6px 0', borderRadius: 7, background: `${accent}18`, border: `1px solid ${accent}44`, color: accent, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Schedule QBR
            </button>
            <button onClick={() => onDelete(account.id)}
              style={{ width: 30, height: 30, borderRadius: 7, background: 'transparent', border: `1px solid ${bdr}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={12} color={muted} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CarterAccountsPanel({ onSend, accent: a }: { onSend: (text: string) => void; accent: string }) {
  const [accounts, setAccounts]         = useState<Account[]>([])
  const [loading, setLoading]           = useState(true)
  const [adding, setAdding]             = useState(false)
  const [healthFilter, setHealthFilter] = useState<AccountHealth | 'all'>('all')
  const [newCompany, setNewCompany]     = useState('')
  const [newContact, setNewContact]     = useState('')
  const [newArr, setNewArr]             = useState('')
  const [newHealth, setNewHealth]       = useState<AccountHealth>('green')
  const [newStage, setNewStage]         = useState<AccountStage>('onboarding')

  useEffect(() => {
    fetch('/api/agents/accounts').then(r => r.ok ? r.json() : null).then(d => {
      if (d) {
        const list = d.accounts ?? d ?? []
        setAccounts(list.map((a: Record<string, unknown>) => ({
          id: a.id, company: a.company, contact_name: a.contact_name,
          arr: a.arr, health: (a.health ?? 'green') as AccountHealth,
          stage: (a.stage ?? 'active') as AccountStage, last_contact: a.last_contact, notes: a.notes,
        })))
      }
    }).finally(() => setLoading(false))
  }, [])

  async function addAccount() {
    if (!newCompany.trim()) return
    const res = await fetch('/api/agents/accounts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: newCompany.trim(), contact_name: newContact.trim() || undefined, arr: newArr ? parseFloat(newArr) : undefined, health: newHealth, stage: newStage }),
    })
    if (res.ok) {
      const { account } = await res.json()
      setAccounts(p => [...p, { id: account.id, company: account.company, contact_name: account.contact_name, arr: account.arr, health: newHealth, stage: newStage }])
    }
    setNewCompany(''); setNewContact(''); setNewArr(''); setNewHealth('green'); setNewStage('onboarding'); setAdding(false)
  }

  async function changeStage(id: string, stage: AccountStage) {
    setAccounts(p => p.map(a => a.id === id ? { ...a, stage } : a))
    await fetch(`/api/agents/accounts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }) })
  }

  async function deleteAccount(id: string) {
    setAccounts(p => p.filter(a => a.id !== id))
    await fetch(`/api/agents/accounts/${id}`, { method: 'DELETE' })
  }

  const atRisk = accounts.filter(a => a.health !== 'green').length
  const totalArr = accounts.reduce((s, a) => s + (a.arr ?? 0), 0)
  const filtered = healthFilter === 'all' ? accounts : accounts.filter(a => a.health === healthFilter)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0 }}>Customer Accounts</h2>
            <p style={{ fontSize: 12, color: muted, marginTop: 3 }}>
              {accounts.length} accounts · {fmtArr(totalArr)} ARR{atRisk > 0 ? ` · ${atRisk} at risk` : ''}
            </p>
          </div>
          <button onClick={() => setAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: a, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={13} /> Add Account
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {(['all', 'green', 'yellow', 'red'] as const).map(h => (
            <button key={h} onClick={() => setHealthFilter(h)}
              style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: healthFilter === h ? (h === 'all' ? ink : HEALTH_CONFIG[h].bg) : 'transparent',
                border: `1px solid ${healthFilter === h ? (h === 'all' ? ink : HEALTH_CONFIG[h].dot) : bdr}`,
                color: healthFilter === h ? (h === 'all' ? bg : HEALTH_CONFIG[h].dot) : muted }}>
              {h === 'all' ? 'All' : HEALTH_CONFIG[h].label}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {adding && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ padding: 16, borderRadius: 12, background: surf, border: `1px solid ${a}44`, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 12 }}>Add Account</p>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <input autoFocus value={newCompany} onChange={e => setNewCompany(e.target.value)} placeholder="Company *"
                  style={{ flex: 2, padding: '8px 10px', borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 12, color: ink, outline: 'none', fontFamily: 'inherit' }} />
                <input value={newContact} onChange={e => setNewContact(e.target.value)} placeholder="Contact name"
                  style={{ flex: 2, padding: '8px 10px', borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 12, color: ink, outline: 'none', fontFamily: 'inherit' }} />
                <input value={newArr} onChange={e => setNewArr(e.target.value)} placeholder="ARR ($)"
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 12, color: ink, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addAccount} disabled={!newCompany.trim()}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: a, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: newCompany.trim() ? 'pointer' : 'default', opacity: newCompany.trim() ? 1 : 0.5 }}>
                  Add
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
          <div style={{ textAlign: 'center', padding: '60px 0', color: muted, fontSize: 13 }}>Loading accounts…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: muted }}>
            <Users size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No accounts yet — add your first customer above</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(account => (
              <AccountCard key={account.id} account={account} onStageChange={changeStage} onDelete={deleteAccount} onAsk={onSend} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CarterWorkspace() {
  return (
    <AgentWorkspace
      agentId="carter"
      name="Carter"
      role="CCO · Customer Success"
      emoji="🤝"
      accent={accent}
      badge="CUSTOMER OS"
      deliverables={CARTER_DELIVERABLES}
      suggestedPrompts={SUGGESTED}
      customPanel={{
        id: 'accounts',
        label: 'Accounts',
        icon: Users,
        render: ({ workspace, accent: a }) => <CarterAccountsPanel onSend={workspace.send} accent={a} />,
      }}
    />
  )
}
