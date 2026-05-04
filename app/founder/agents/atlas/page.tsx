'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, ChevronRight, Trash2, Plus, RefreshCw, BarChart3, Globe, Eye, TrendingUp, FileText } from 'lucide-react'
import { AgentWorkspace } from '@/features/agents/shared/components/AgentWorkspace'
import { bg, surf, bdr, ink, muted } from '@/features/agents/shared/constants/colors'

const accent = '#0EA5E9'

const ATLAS_DELIVERABLES = [
  { type: 'competitive_matrix',  icon: BarChart3,  label: 'Competitive Matrix',  description: 'Feature comparison, positioning map, white space' },
  { type: 'battle_card',         icon: Shield,     label: 'Battle Card',         description: 'How to beat a specific competitor in a deal' },
  { type: 'market_map',          icon: Globe,      label: 'Market Map',          description: 'All players on two positioning axes' },
  { type: 'competitor_weekly',   icon: Eye,        label: 'Weekly Intel Digest', description: 'Changes detected across tracked competitors' },
  { type: 'win_loss_analysis',   icon: TrendingUp, label: 'Win/Loss Analysis',   description: 'Deal patterns and recommended positioning' },
  { type: 'review_intelligence', icon: FileText,   label: 'Review Intelligence', description: 'Competitor weaknesses from G2/Capterra reviews' },
]

const SUGGESTED = [
  'Who are my top 3 competitors and how do I beat them?',
  'Build a battle card against [competitor]',
  'Map the competitive landscape for my market',
  'What are customers complaining about in competitor reviews?',
  'Generate a weekly competitive intelligence digest',
  'Where is the white space in my market?',
]

const THREAT_LEVELS = [
  { id: 'critical', label: 'Critical', color: '#DC2626' },
  { id: 'high',     label: 'High',     color: '#D97706' },
  { id: 'medium',   label: 'Medium',   color: '#2563EB' },
  { id: 'watch',    label: 'Watch',    color: muted },
] as const

type ThreatLevel = typeof THREAT_LEVELS[number]['id']

interface Competitor {
  id: string; name: string; website?: string
  threat: ThreatLevel; notes?: string; last_updated?: string
}

function CompetitorCard({ competitor, onDelete, onUpdate, onAnalyse }: {
  competitor: Competitor
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<Competitor>) => void
  onAnalyse: (name: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(competitor.notes ?? '')
  const threat = THREAT_LEVELS.find(t => t.id === competitor.threat)!

  return (
    <div style={{ borderRadius: 12, background: surf, border: `1px solid ${bdr}`, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer' }}
        onClick={() => setExpanded(p => !p)}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${threat.color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Shield size={15} color={threat.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>{competitor.name}</p>
          {competitor.website && <p style={{ fontSize: 11, color: muted, margin: 0 }}>{competitor.website}</p>}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: threat.color, background: `${threat.color}18`,
          border: `1px solid ${threat.color}30`, borderRadius: 4, padding: '2px 7px', flexShrink: 0 }}>
          {threat.label}
        </span>
        <ChevronRight size={14} color={muted} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${bdr}` }}>
          <div style={{ display: 'flex', gap: 6, marginTop: 12, marginBottom: 12 }}>
            {THREAT_LEVELS.map(t => (
              <button key={t.id} onClick={() => onUpdate(competitor.id, { threat: t.id })}
                style={{ flex: 1, padding: '5px 0', borderRadius: 6, fontSize: 10, fontWeight: 700,
                  background: competitor.threat === t.id ? `${t.color}22` : 'transparent',
                  border: `1px solid ${competitor.threat === t.id ? t.color : bdr}`,
                  color: competitor.threat === t.id ? t.color : muted, cursor: 'pointer' }}>
                {t.label}
              </button>
            ))}
          </div>
          <textarea value={notes} rows={2}
            onChange={e => setNotes(e.target.value)}
            onBlur={() => onUpdate(competitor.id, { notes })}
            placeholder="Key differentiators, known weaknesses, deal patterns…"
            style={{ width: '100%', resize: 'none', background: bg, border: `1px solid ${bdr}`,
              borderRadius: 8, padding: '8px 10px', fontSize: 12, color: ink, fontFamily: 'inherit',
              outline: 'none', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => onAnalyse(`Build a battle card against ${competitor.name}`)}
              style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: accent, border: 'none',
                color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Build Battle Card
            </button>
            <button onClick={() => onAnalyse(`Research latest news and moves for ${competitor.name}`)}
              style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: `${accent}18`,
                border: `1px solid ${accent}44`, color: accent, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Scan Now
            </button>
            <button onClick={() => onDelete(competitor.id)}
              style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent',
                border: `1px solid ${bdr}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={13} color={muted} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AtlasCompetitorsPanel({ onSend, accent }: { onSend: (text: string) => void; accent: string }) {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSite, setNewSite] = useState('')
  const [newThreat, setNewThreat] = useState<ThreatLevel>('medium')

  useEffect(() => {
    fetch('/api/agents/competitors').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.competitors) {
        setCompetitors(d.competitors.map((c: Record<string, unknown>) => ({
          id: c.id as string, name: c.name as string, website: c.website as string | undefined,
          threat: (c.threat_level ?? 'medium') as ThreatLevel,
          notes: c.notes as string | undefined, last_updated: c.updated_at as string | undefined,
        })))
      }
    }).finally(() => setLoading(false))
  }, [])

  async function addCompetitor() {
    if (!newName.trim()) return
    const res = await fetch('/api/agents/competitors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), website: newSite.trim() || undefined, threat_level: newThreat }),
    })
    if (res.ok) {
      const { competitor } = await res.json()
      setCompetitors(p => [...p, { id: competitor.id, name: competitor.name, website: competitor.website, threat: newThreat }])
    }
    setNewName(''); setNewSite(''); setNewThreat('medium'); setAdding(false)
  }

  async function deleteCompetitor(id: string) {
    setCompetitors(p => p.filter(c => c.id !== id))
    await fetch(`/api/agents/competitors/${id}`, { method: 'DELETE' })
  }

  async function updateCompetitor(id: string, patch: Partial<Competitor>) {
    setCompetitors(p => p.map(c => c.id === id ? { ...c, ...patch } : c))
    await fetch(`/api/agents/competitors/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threat_level: patch.threat, notes: patch.notes }),
    })
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0 }}>Tracked Competitors</h2>
            <p style={{ fontSize: 12, color: muted, marginTop: 3 }}>Atlas monitors these continuously</p>
          </div>
          <button onClick={() => setAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8, background: accent, border: 'none',
            color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={13} /> Add Competitor
          </button>
        </div>

        <AnimatePresence>
          {adding && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ padding: '16px', borderRadius: 12, background: surf, border: `1px solid ${accent}44`, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 12 }}>Add Competitor</p>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Company name *"
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: 'none', fontFamily: 'inherit' }} />
                <input value={newSite} onChange={e => setNewSite(e.target.value)} placeholder="website.com"
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${bdr}`,
                    background: bg, fontSize: 12, color: ink, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {THREAT_LEVELS.map(t => (
                  <button key={t.id} onClick={() => setNewThreat(t.id)}
                    style={{ flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: newThreat === t.id ? `${t.color}22` : 'transparent',
                      border: `1px solid ${newThreat === t.id ? t.color : bdr}`,
                      color: newThreat === t.id ? t.color : muted, cursor: 'pointer' }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addCompetitor} disabled={!newName.trim()}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: accent, border: 'none',
                    color: '#fff', fontSize: 12, fontWeight: 600, cursor: newName.trim() ? 'pointer' : 'default',
                    opacity: newName.trim() ? 1 : 0.5 }}>
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
        ) : competitors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: muted }}>
            <Shield size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No competitors tracked yet — add your first one above</p>
          </div>
        ) : (
          THREAT_LEVELS.map(level => {
            const bucket = competitors.filter(c => c.threat === level.id)
            if (!bucket.length) return null
            return (
              <div key={level.id} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: level.color }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: level.color, letterSpacing: '0.06em' }}>
                    {level.label.toUpperCase()} ({bucket.length})
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {bucket.map(c => (
                    <CompetitorCard key={c.id} competitor={c}
                      onDelete={deleteCompetitor}
                      onUpdate={updateCompetitor}
                      onAnalyse={prompt => onSend(prompt)} />
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

export default function AtlasWorkspace() {
  return (
    <AgentWorkspace
      agentId="atlas"
      name="Atlas"
      role="CCO · Competitive Intelligence"
      emoji="🛡️"
      accent={accent}
      badge="COMPETITIVE INTEL"
      deliverables={ATLAS_DELIVERABLES}
      suggestedPrompts={SUGGESTED}
      customPanel={{
        id: 'competitors',
        label: 'Competitors',
        icon: Shield,
        badge: undefined,
        render: ({ workspace, accent: a }) => <AtlasCompetitorsPanel onSend={workspace.send} accent={a} />,
      }}
    />
  )
}
