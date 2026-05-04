'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, UserPlus, Star, Plus, Trash2, ChevronRight, Briefcase, Award, ClipboardList, BookOpen, RefreshCw } from 'lucide-react'
import { AgentWorkspace } from '@/features/agents/shared/components/AgentWorkspace'
import { bg, surf, bdr, ink, muted } from '@/features/agents/shared/constants/colors'

const accent = '#0891B2'

const HARPER_DELIVERABLES = [
  { type: 'hiring_plan',         icon: ClipboardList, label: 'Hiring Plan',         description: 'Next 3 hires, org structure, comp bands, timeline' },
  { type: 'job_description',     icon: Briefcase,     label: 'Job Description',     description: 'Role with 30/60/90 outcomes, requirements, equity' },
  { type: 'interview_scorecard', icon: Star,          label: 'Interview Scorecard', description: 'Competencies, questions, rubric, red flags' },
  { type: 'offer_letter',        icon: Award,         label: 'Offer Letter',        description: 'Personalised offer with cash, equity, benefits' },
  { type: 'onboarding_plan',     icon: BookOpen,      label: 'Onboarding Plan',     description: 'Day 1 checklist, 30/60/90 milestones, first project' },
  { type: 'comp_benchmark',      icon: Users,         label: 'Comp Benchmark',      description: 'Market data for role + stage with equity context' },
]

const SUGGESTED = [
  'What should my next 3 hires be?',
  'Write a job description for a Senior Engineer',
  'What\'s the market comp for a Head of Sales?',
  'Build an interview scorecard for an AE',
  'Draft an offer letter for my engineering hire',
  'Create a 30/60/90 onboarding plan',
]

const HIRE_STAGES = [
  { id: 'sourcing',      label: 'Sourcing',     color: '#6B7280' },
  { id: 'screening',    label: 'Screening',    color: '#2563EB' },
  { id: 'interviewing', label: 'Interviewing', color: '#7C3AED' },
  { id: 'offer',        label: 'Offer',        color: '#D97706' },
  { id: 'hired',        label: 'Hired',        color: '#16A34A' },
  { id: 'rejected',     label: 'Rejected',     color: '#DC2626' },
] as const

type HireStage = typeof HIRE_STAGES[number]['id']

interface Candidate {
  id: string; name: string; role: string; stage: HireStage
  score?: number; source?: string; notes?: string; created_at: string
}

function CandidateCard({ candidate, onStageChange, onDelete, onAsk }: {
  candidate: Candidate
  onStageChange: (id: string, stage: HireStage) => void
  onDelete: (id: string) => void
  onAsk: (prompt: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const stage = HIRE_STAGES.find(s => s.id === candidate.stage)!
  const nextStages = HIRE_STAGES.filter(s => s.id !== candidate.stage && s.id !== 'rejected')

  return (
    <div style={{ borderRadius: 10, background: surf, border: `1px solid ${bdr}`, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', cursor: 'pointer' }}
        onClick={() => setExpanded(p => !p)}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          fontSize: 13, fontWeight: 700, color: accent }}>
          {candidate.name.slice(0, 1).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>{candidate.name}</p>
          <p style={{ fontSize: 11, color: muted, margin: 0 }}>{candidate.role}</p>
        </div>
        {candidate.score && (
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            {[1,2,3,4,5].map(n => (
              <Star key={n} size={10} color={n <= candidate.score! ? '#D97706' : bdr} fill={n <= candidate.score! ? '#D97706' : 'none'} />
            ))}
          </div>
        )}
        <span style={{ fontSize: 10, fontWeight: 700, color: stage.color, background: `${stage.color}18`,
          border: `1px solid ${stage.color}30`, borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
          {stage.label}
        </span>
        <ChevronRight size={13} color={muted}
          style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>

      {expanded && (
        <div style={{ padding: '0 13px 13px', borderTop: `1px solid ${bdr}` }}>
          {candidate.source && (
            <p style={{ fontSize: 11, color: muted, marginTop: 10, marginBottom: 8 }}>Source: {candidate.source}</p>
          )}
          <p style={{ fontSize: 10, fontWeight: 600, color: muted, letterSpacing: '0.06em', margin: '10px 0 6px' }}>MOVE TO</p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
            {nextStages.map(s => (
              <button key={s.id} onClick={() => onStageChange(candidate.id, s.id)}
                style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                  background: 'transparent', border: `1px solid ${s.color}`, color: s.color, cursor: 'pointer' }}>
                {s.label}
              </button>
            ))}
            <button onClick={() => onStageChange(candidate.id, 'rejected')}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                background: 'transparent', border: '1px solid #DC2626', color: '#DC2626', cursor: 'pointer' }}>
              Reject
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => onAsk(`Build an interview scorecard for ${candidate.name} applying for ${candidate.role}`)}
              style={{ flex: 1, padding: '6px 0', borderRadius: 7, background: accent, border: 'none',
                color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Build Scorecard
            </button>
            <button onClick={() => onAsk(`Draft an offer letter for ${candidate.name} for the ${candidate.role} role`)}
              style={{ flex: 1, padding: '6px 0', borderRadius: 7, background: `${accent}18`,
                border: `1px solid ${accent}44`, color: accent, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Draft Offer
            </button>
            <button onClick={() => onDelete(candidate.id)}
              style={{ width: 30, height: 30, borderRadius: 7, background: 'transparent',
                border: `1px solid ${bdr}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={12} color={muted} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function HarperPipelinePanel({ onSend, accent }: { onSend: (text: string) => void; accent: string }) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newSource, setNewSource] = useState('')
  const [stageFilter, setStageFilter] = useState<HireStage | 'all'>('all')

  useEffect(() => {
    fetch('/api/agents/candidates').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.candidates) {
        setCandidates(d.candidates.map((c: Record<string, unknown>) => ({
          id: c.id as string, name: c.name as string, role: c.role as string,
          stage: (c.stage ?? 'sourcing') as HireStage,
          score: c.score as number | undefined, source: c.source as string | undefined,
          notes: c.notes as string | undefined, created_at: c.created_at as string,
        })))
      }
    }).finally(() => setLoading(false))
  }, [])

  async function addCandidate() {
    if (!newName.trim() || !newRole.trim()) return
    const res = await fetch('/api/agents/candidates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), role: newRole.trim(), source: newSource.trim() || undefined, stage: 'sourcing' }),
    })
    if (res.ok) {
      const { candidate } = await res.json()
      setCandidates(p => [...p, { ...candidate, stage: 'sourcing' as HireStage, created_at: new Date().toISOString() }])
    }
    setNewName(''); setNewRole(''); setNewSource(''); setAdding(false)
  }

  async function updateStage(id: string, stage: HireStage) {
    setCandidates(p => p.map(c => c.id === id ? { ...c, stage } : c))
    await fetch(`/api/agents/candidates/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }),
    })
  }

  async function deleteCandidate(id: string) {
    setCandidates(p => p.filter(c => c.id !== id))
    await fetch(`/api/agents/candidates/${id}`, { method: 'DELETE' })
  }

  const visible = stageFilter === 'all' ? candidates : candidates.filter(c => c.stage === stageFilter)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0 }}>Hiring Pipeline</h2>
            <p style={{ fontSize: 12, color: muted, marginTop: 3 }}>Track candidates across all open roles</p>
          </div>
          <button onClick={() => setAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8, background: accent, border: 'none',
            color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={13} /> Add Candidate
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={() => setStageFilter('all')}
            style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: stageFilter === 'all' ? ink : 'transparent',
              border: `1px solid ${stageFilter === 'all' ? ink : bdr}`,
              color: stageFilter === 'all' ? '#fff' : muted }}>
            All ({candidates.length})
          </button>
          {HIRE_STAGES.map(s => {
            const count = candidates.filter(c => c.stage === s.id).length
            return (
              <button key={s.id} onClick={() => setStageFilter(s.id)}
                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  background: stageFilter === s.id ? `${s.color}22` : 'transparent',
                  border: `1px solid ${stageFilter === s.id ? s.color : bdr}`,
                  color: stageFilter === s.id ? s.color : muted }}>
                {s.label} {count > 0 ? `(${count})` : ''}
              </button>
            )
          })}
        </div>

        <AnimatePresence>
          {adding && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ padding: '16px', borderRadius: 12, background: surf, border: `1px solid ${accent}44`, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 12 }}>Add Candidate</p>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name *"
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: 'none', fontFamily: 'inherit' }} />
                <input value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="Role *"
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: 'none', fontFamily: 'inherit' }} />
                <input value={newSource} onChange={e => setNewSource(e.target.value)} placeholder="Source (optional)"
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addCandidate} disabled={!newName.trim() || !newRole.trim()}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: accent, border: 'none',
                    color: '#fff', fontSize: 12, fontWeight: 600,
                    cursor: newName.trim() && newRole.trim() ? 'pointer' : 'default',
                    opacity: newName.trim() && newRole.trim() ? 1 : 0.5 }}>
                  Add
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
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: muted }}>
            <UserPlus size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>
              {stageFilter === 'all' ? 'No candidates yet — add your first one above' : `No candidates in ${stageFilter}`}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visible.map(c => (
              <CandidateCard key={c.id} candidate={c}
                onStageChange={updateStage}
                onDelete={deleteCandidate}
                onAsk={prompt => onSend(prompt)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function HarperWorkspace() {
  return (
    <AgentWorkspace
      agentId="harper"
      name="Harper"
      role="CPO · Talent & Hiring"
      emoji="👥"
      accent={accent}
      badge="TALENT ENGINE"
      deliverables={HARPER_DELIVERABLES}
      suggestedPrompts={SUGGESTED}
      customPanel={{
        id: 'pipeline',
        label: 'Pipeline',
        icon: UserPlus,
        badge: undefined,
        render: ({ workspace, accent: a }) => <HarperPipelinePanel onSend={workspace.send} accent={a} />,
      }}
    />
  )
}
