'use client'

/**
 * S001 — the Strategy Session. The founder sets their direction (F07).
 *
 * Deliberately a plain form. The workbook's S001 is a six-step LLM executive
 * session; that arrives later. F07's job is to capture mission, priorities and
 * goals, version them, and feed F08 — so this page is exactly that and nothing
 * more (CLAUDE.md §7: one feature at a time).
 *
 * Thin by design: it renders state and calls the API. No executive reasoning
 * lives here (CLAUDE.md §2).
 */

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue, green, red } from '@/lib/constants/colors'

interface Strategy {
  id: string
  version: number
  mission: string | null
  priorities: string[]
  goals: string[]
  createdAt: string
}

const MAX_ITEMS = 10

export default function StrategyPage() {
  const [mission, setMission] = useState('')
  const [priorities, setPriorities] = useState<string[]>([])
  const [goals, setGoals] = useState<string[]>([])
  const [history, setHistory] = useState<Strategy[]>([])
  const [version, setVersion] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/strategy')
      if (res.status === 404) {
        // The flag is off — the new model is not switched on for this deployment.
        setError('The Executive model is not enabled.')
        return
      }
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      if (data.strategy) {
        setMission(data.strategy.mission ?? '')
        setPriorities(data.strategy.priorities ?? [])
        setGoals(data.strategy.goals ?? [])
        setVersion(data.strategy.version)
      }
      setHistory(data.history ?? [])
    } catch {
      setError('Could not load your strategy.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mission: mission.trim() || undefined,
          priorities: priorities.filter(p => p.trim()),
          goals: goals.filter(g => g.trim()),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        // 409 = another save landed first. Say so plainly rather than silently
        // discarding what they typed.
        setError(data.error ?? 'Could not save.')
        return
      }
      setVersion(data.strategy.version)
      setSaved(true)
      await load()
    } catch {
      setError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const isComplete = mission.trim().length > 0 && priorities.some(p => p.trim())

  if (loading) {
    return (
      <div style={{ background: bg, minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Loader2 size={20} color={muted} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ color: ink, fontSize: 28, fontWeight: 600, margin: 0 }}>Your direction</h1>
        <p style={{ color: muted, fontSize: 15, marginTop: 8, lineHeight: 1.6 }}>
          Set this once. Your executive team works to it — you change it by coming back here,
          not by approving every step.
          {version !== null && (
            <span style={{ color: muted }}> Currently on version {version}.</span>
          )}
        </p>

        {error && (
          <div style={{
            background: '#FEF2F2', border: `1px solid ${red}`, color: red,
            borderRadius: 8, padding: '12px 14px', marginTop: 20, fontSize: 14,
          }}>
            {error}
          </div>
        )}

        <Section title="Mission" hint="What are you building, and for whom?">
          <textarea
            value={mission}
            onChange={e => setMission(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="We help mid-market procurement teams cut manual overhead."
            style={{
              width: '100%', background: bg, border: `1px solid ${bdr}`, borderRadius: 8,
              padding: 12, color: ink, fontSize: 15, fontFamily: 'inherit', resize: 'vertical',
            }}
          />
        </Section>

        <Section title="Priorities" hint="The few things that matter most right now.">
          <ListEditor items={priorities} onChange={setPriorities} placeholder="Win 10 design partners" />
        </Section>

        <Section title="Goals" hint="What you are aiming at.">
          <ListEditor items={goals} onChange={setGoals} placeholder="£40k MRR by Q4" />
        </Section>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 28 }}>
          <button
            onClick={() => void save()}
            disabled={saving}
            style={{
              background: blue, color: '#fff', border: 'none', borderRadius: 8,
              padding: '11px 22px', fontSize: 15, fontWeight: 500,
              cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : version === null ? 'Save direction' : 'Save new version'}
          </button>

          {saved && <span style={{ color: green, fontSize: 14 }}>Saved as version {version}.</span>}

          {!isComplete && !saved && (
            // F07 saves partial drafts happily; F08 is where incompleteness bites.
            <span style={{ color: muted, fontSize: 13 }}>
              A mission and at least one priority are needed before a contract can be drafted.
            </span>
          )}
        </div>

        {history.length > 1 && (
          <div style={{ marginTop: 40, borderTop: `1px solid ${bdr}`, paddingTop: 20 }}>
            <h2 style={{ color: ink, fontSize: 15, fontWeight: 600, margin: 0 }}>History</h2>
            <p style={{ color: muted, fontSize: 13, marginTop: 4 }}>
              Nothing is overwritten. Every version you have set is kept.
            </p>
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {history.map(h => (
                <div key={h.id} style={{
                  background: surf, border: `1px solid ${bdr}`, borderRadius: 8,
                  padding: '10px 12px', fontSize: 13, color: muted,
                  display: 'flex', justifyContent: 'space-between', gap: 12,
                }}>
                  <span style={{ color: ink }}>
                    v{h.version}{h.version === version && ' · current'}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.mission || 'No mission set'}
                  </span>
                  <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, hint, children }: {
  title: string; hint: string; children: React.ReactNode
}) {
  return (
    <div style={{ marginTop: 28 }}>
      <label style={{ color: ink, fontSize: 15, fontWeight: 600 }}>{title}</label>
      <p style={{ color: muted, fontSize: 13, margin: '2px 0 10px' }}>{hint}</p>
      {children}
    </div>
  )
}

function ListEditor({ items, onChange, placeholder }: {
  items: string[]; onChange: (next: string[]) => void; placeholder: string
}) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8 }}>
          <input
            value={item}
            maxLength={500}
            onChange={e => onChange(items.map((v, j) => (j === i ? e.target.value : v)))}
            placeholder={placeholder}
            style={{
              flex: 1, background: bg, border: `1px solid ${bdr}`, borderRadius: 8,
              padding: '10px 12px', color: ink, fontSize: 14, fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            aria-label="Remove"
            style={{
              background: 'none', border: `1px solid ${bdr}`, borderRadius: 8,
              width: 38, cursor: 'pointer', color: muted,
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
      {items.length < MAX_ITEMS && (
        <button
          onClick={() => onChange([...items, ''])}
          style={{
            background: 'none', border: `1px dashed ${bdr}`, borderRadius: 8,
            padding: '9px 12px', color: muted, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, justifySelf: 'start',
          }}
        >
          <Plus size={14} /> Add
        </button>
      )}
    </div>
  )
}
