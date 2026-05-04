'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, FileText, DollarSign, Briefcase, Shield, AlertTriangle, Plus, RefreshCw } from 'lucide-react'
import { AgentWorkspace } from '@/features/agents/shared/components/AgentWorkspace'
import { bg, surf, bdr, ink, muted } from '@/features/agents/shared/constants/colors'

const accent = '#059669'

const LEO_DELIVERABLES = [
  { type: 'legal_checklist',      icon: ClipboardList, label: 'Legal Checklist',      description: 'Prioritised legal items for current stage' },
  { type: 'nda',                  icon: FileText,       label: 'NDA',                  description: 'Mutual or one-way NDA ready for signature' },
  { type: 'safe_note',            icon: DollarSign,     label: 'SAFE Note',            description: 'YC-standard SAFE with filled terms' },
  { type: 'contractor_agreement', icon: Briefcase,      label: 'Contractor Agreement', description: 'Scope, payment, IP assignment, confidentiality' },
  { type: 'privacy_policy',       icon: Shield,         label: 'Privacy Policy',       description: 'GDPR/CCPA-compliant policy for your data flows' },
  { type: 'term_sheet_redline',   icon: AlertTriangle,  label: 'Term Sheet Redline',   description: 'Non-standard terms flagged in plain English' },
]

const SUGGESTED = [
  'What legal items do I need for my seed round?',
  'Draft an NDA for a partner conversation',
  'Generate a contractor agreement with IP assignment',
  'Review and redline this term sheet',
  'Create a privacy policy for my SaaS product',
  'What are my biggest legal risks right now?',
]

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const
type Severity = typeof SEVERITY_ORDER[number]

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#DC2626', high: '#D97706', medium: '#2563EB', low: '#6B7280',
}

interface LegalRisk {
  id: string; title: string; severity: Severity; resolved: boolean; category: string; notes?: string
}

function RiskCard({ risk, onToggleResolve, onGetHelp }: {
  risk: LegalRisk
  onToggleResolve: (id: string, resolved: boolean) => void
  onGetHelp: (title: string) => void
}) {
  const sColor = SEVERITY_COLORS[risk.severity]
  return (
    <div style={{ borderRadius: 10, background: surf, border: `1px solid ${bdr}`, padding: '13px 14px', opacity: risk.resolved ? 0.55 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: sColor, background: `${sColor}18`, border: `1px solid ${sColor}30`,
            borderRadius: 4, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{risk.severity}</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: muted, background: bg, border: `1px solid ${bdr}`,
            borderRadius: 4, padding: '2px 7px' }}>{risk.category}</span>
          {risk.resolved && (
            <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: `${accent}18`, border: `1px solid ${accent}30`,
              borderRadius: 4, padding: '2px 7px' }}>RESOLVED</span>
          )}
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0, lineHeight: 1.4 }}>{risk.title}</p>
        {risk.notes && <p style={{ fontSize: 11, color: muted, marginTop: 5, margin: '5px 0 0' }}>{risk.notes}</p>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={() => onToggleResolve(risk.id, risk.resolved)}
          style={{ flex: 1, padding: '6px 0', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            background: risk.resolved ? 'transparent' : accent, border: risk.resolved ? `1px solid ${bdr}` : 'none',
            color: risk.resolved ? muted : '#fff' }}>
          {risk.resolved ? 'Unresolve' : 'Mark Resolved'}
        </button>
        {!risk.resolved && (
          <button onClick={() => onGetHelp(risk.title)}
            style={{ flex: 1, padding: '6px 0', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: `${accent}18`, border: `1px solid ${accent}44`, color: accent }}>
            Get Help
          </button>
        )}
      </div>
    </div>
  )
}

function LeoRisksPanel({ onSend, accent }: { onSend: (text: string) => void; accent: string }) {
  const [risks, setRisks] = useState<LegalRisk[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSeverity, setNewSeverity] = useState<Severity>('medium')
  const [newCategory, setNewCategory] = useState('')

  useEffect(() => {
    fetch('/api/agents/legal-risks').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.risks) {
        setRisks(d.risks.map((r: Record<string, unknown>) => ({
          id: r.id as string, title: r.title as string, severity: (r.severity ?? 'medium') as Severity,
          resolved: Boolean(r.resolved), category: (r.category ?? '') as string, notes: r.notes as string | undefined,
        })))
      }
    }).finally(() => setLoading(false))
  }, [])

  function recompute(list: LegalRisk[]) { return list }

  async function addRisk() {
    if (!newTitle.trim() || !newCategory.trim()) return
    const res = await fetch('/api/agents/legal-risks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), severity: newSeverity, category: newCategory.trim(), resolved: false }),
    })
    if (res.ok) {
      const { risk } = await res.json()
      setRisks(p => recompute([...p, { id: risk.id ?? String(Date.now()), title: risk.title ?? newTitle.trim(),
        severity: risk.severity ?? newSeverity, resolved: false, category: risk.category ?? newCategory.trim() }]))
    }
    setNewTitle(''); setNewSeverity('medium'); setNewCategory(''); setAdding(false)
  }

  async function toggleResolve(id: string, currentResolved: boolean) {
    const next = !currentResolved
    setRisks(p => p.map(r => r.id === id ? { ...r, resolved: next } : r))
    await fetch(`/api/agents/legal-risks/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolved: next }),
    })
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0 }}>Legal Risks</h2>
            <p style={{ fontSize: 12, color: muted, marginTop: 3 }}>Track and resolve legal exposure items</p>
          </div>
          <button onClick={() => setAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8, background: accent, border: 'none',
            color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={13} /> Add Risk
          </button>
        </div>

        <AnimatePresence>
          {adding && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ padding: '16px', borderRadius: 12, background: surf, border: `1px solid ${accent}44`, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 12 }}>Add Legal Risk</p>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Risk title *"
                  style={{ flex: 2, padding: '8px 10px', borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: 'none', fontFamily: 'inherit' }} />
                <select value={newSeverity} onChange={e => setNewSeverity(e.target.value as Severity)}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
                  {SEVERITY_ORDER.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
                <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Category *"
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addRisk} disabled={!newTitle.trim() || !newCategory.trim()}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: accent, border: 'none',
                    color: '#fff', fontSize: 12, fontWeight: 600,
                    cursor: newTitle.trim() && newCategory.trim() ? 'pointer' : 'default',
                    opacity: newTitle.trim() && newCategory.trim() ? 1 : 0.5 }}>
                  Add Risk
                </button>
                <button onClick={() => setAdding(false)}
                  style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent',
                    border: `1px solid ${bdr}`, fontSize: 12, color: muted, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: muted }}>
            <RefreshCw size={18} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} /> Loading…
          </div>
        ) : risks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: muted }}>
            <AlertTriangle size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No legal risks tracked — add your first one above</p>
          </div>
        ) : (
          SEVERITY_ORDER.map(severity => {
            const group = risks.filter(r => r.severity === severity)
            if (!group.length) return null
            const sColor = SEVERITY_COLORS[severity]
            return (
              <div key={severity} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sColor, background: `${sColor}18`,
                    border: `1px solid ${sColor}30`, borderRadius: 4, padding: '3px 9px',
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>{severity}</span>
                  <span style={{ fontSize: 11, color: muted }}>
                    {group.filter(r => !r.resolved).length} open · {group.filter(r => r.resolved).length} resolved
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.map(r => (
                    <RiskCard key={r.id} risk={r}
                      onToggleResolve={toggleResolve}
                      onGetHelp={title => onSend(`Help me resolve this legal risk: ${title}`)} />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default function LeoWorkspace() {
  return (
    <AgentWorkspace
      agentId="leo"
      name="Leo"
      role="General Counsel · Legal"
      emoji="⚖️"
      accent={accent}
      badge="IN-HOUSE COUNSEL"
      deliverables={LEO_DELIVERABLES}
      suggestedPrompts={SUGGESTED}
      customPanel={{
        id: 'risks',
        label: 'Risks',
        icon: AlertTriangle,
        badge: undefined,
        render: ({ workspace, accent: a }) => <LeoRisksPanel onSend={workspace.send} accent={a} />,
      }}
    />
  )
}
