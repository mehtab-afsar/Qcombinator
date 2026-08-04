'use client'

/**
 * S001 — the Strategy Session. The founder sets their direction (F07).
 *
 * ⚠️ PROPOSE, DON'T ASK. A blank mission/priorities/goals form asks the founder
 * to do the executive team's job before the team exists. S001 is a CEO reading
 * the founder's real Q-Score and drafting a direction to react to — this page now
 * runs that for real (F07b, lib/mandate/generate.ts's generateStrategyProposal)
 * for a brand-new founder, and lands on the exact same editable fields either way.
 *
 * A founder who already has a Strategy skips straight to editing it — proposing
 * again over something they already set would be presumptuous, not helpful.
 * A founder who opts out, or whose proposal fails (LLM outage), gets the same
 * blank editable form this page always had — nobody is ever fully blocked.
 *
 * The save path is UNCHANGED: POST /api/strategy, whether the fields arrived
 * blank, AI-drafted, or founder-edited. Thin by design (CLAUDE.md §2).
 */

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue, green, red } from '@/lib/constants/colors'
import { FONT_SERIF } from '@/features/onboarding/theme'

interface Strategy {
  id: string
  version: number
  mission: string | null
  priorities: string[]
  goals: string[]
  currentTraction: string | null
  createdAt: string
}

const MAX_ITEMS = 10

export default function StrategyPage() {
  const [mission, setMission] = useState('')
  const [priorities, setPriorities] = useState<string[]>([])
  const [goals, setGoals] = useState<string[]>([])
  const [currentTraction, setCurrentTraction] = useState('')
  const [history, setHistory] = useState<Strategy[]>([])
  const [version, setVersion] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Pre-Strategy state: 'intro' offers the proposal, 'edit' is the form (blank,
  // proposed, or already-saved). A returning founder skips straight to 'edit'.
  const [mode, setMode] = useState<'intro' | 'edit'>('edit')
  const [proposing, setProposing] = useState(false)
  const [proposeError, setProposeError] = useState<string | null>(null)
  const [document, setDocument] = useState<string | null>(null)

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
        setCurrentTraction(data.strategy.currentTraction ?? '')
        setVersion(data.strategy.version)
        setMode('edit')
      } else {
        // Brand new — offer the proposal instead of a cold form.
        setMode('intro')
      }
      setHistory(data.history ?? [])
    } catch {
      setError('Could not load your strategy.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function propose() {
    setProposing(true)
    setProposeError(null)
    try {
      const res = await fetch('/api/strategy/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentTraction: currentTraction.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        // Expected — no score yet, or the model is unavailable. Fall through to
        // the blank form rather than strand the founder on an error screen.
        setProposeError(data.error ?? 'Could not draft a proposal.')
        setMode('edit')
        return
      }
      setMission(data.proposal.mission)
      setPriorities(data.proposal.priorities)
      setGoals(data.proposal.goals)
      setDocument(data.proposal.document)
      setMode('edit')
    } catch {
      setProposeError('Could not reach the server.')
      setMode('edit')
    } finally {
      setProposing(false)
    }
  }

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
          currentTraction: currentTraction.trim() || undefined,
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

  if (mode === 'intro') {
    return (
      <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h1 style={{ color: ink, fontSize: 28, fontWeight: 600, margin: 0 }}>Your direction</h1>
          <p style={{ color: muted, fontSize: 15, marginTop: 8, lineHeight: 1.6 }}>
            Your CEO has read your Q-Score. Before they propose a direction, tell them
            anything about where things stand today that the score alone won&rsquo;t show —
            this is optional.
          </p>

          <textarea
            value={currentTraction}
            onChange={e => setCurrentTraction(e.target.value)}
            maxLength={1_000}
            rows={3}
            placeholder="e.g. 11 pilots, 4 paying, targeting mid-market procurement teams"
            style={{
              width: '100%', background: surf, border: `1px solid ${bdr}`, borderRadius: 8,
              padding: 12, color: ink, fontSize: 15, fontFamily: 'inherit', resize: 'vertical',
              marginTop: 20,
            }}
          />

          {proposeError && (
            <p style={{ color: muted, fontSize: 13, marginTop: 12 }}>
              {proposeError} You can still set your direction directly below.
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button
              onClick={() => void propose()}
              disabled={proposing}
              style={{
                background: blue, color: '#fff', border: 'none', borderRadius: 8,
                padding: '11px 22px', fontSize: 15, fontWeight: 500,
                cursor: proposing ? 'default' : 'pointer', opacity: proposing ? 0.6 : 1,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              {proposing && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {proposing ? 'Reading your Q-Score…' : 'Draft my direction'}
            </button>
            <button
              onClick={() => setMode('edit')}
              disabled={proposing}
              style={{
                background: 'none', color: muted, border: `1px solid ${bdr}`, borderRadius: 8,
                padding: '11px 22px', fontSize: 15, cursor: proposing ? 'default' : 'pointer',
              }}
            >
              I&rsquo;ll write it myself
            </button>
          </div>
        </div>
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

        {document && (
          <div style={{
            background: surf, border: `1px solid ${bdr}`, borderRadius: 4,
            padding: 24, marginTop: 20,
          }}>
            <span style={{ color: muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Your CEO&rsquo;s read
            </span>
            <p style={{
              fontFamily: FONT_SERIF, color: ink, fontSize: 15, lineHeight: 1.75,
              margin: '10px 0 0', whiteSpace: 'pre-wrap', maxHeight: 340, overflowY: 'auto',
            }}>
              {document}
            </p>
            <p style={{ color: muted, fontSize: 13, marginTop: 14 }}>
              The fields below are drafted from this — edit anything before you save.
            </p>
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

        <Section title="Current traction" hint="Optional — anything the score alone won't show.">
          <textarea
            value={currentTraction}
            onChange={e => setCurrentTraction(e.target.value)}
            maxLength={1_000}
            rows={2}
            placeholder="e.g. 11 pilots, 4 paying"
            style={{
              width: '100%', background: bg, border: `1px solid ${bdr}`, borderRadius: 8,
              padding: 12, color: ink, fontSize: 15, fontFamily: 'inherit', resize: 'vertical',
            }}
          />
        </Section>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 28, flexWrap: 'wrap' }}>
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

          {version === null && (
            <button
              onClick={() => { setDocument(null); setProposeError(null); setMode('intro') }}
              disabled={saving || proposing}
              style={{
                background: 'none', color: muted, border: `1px solid ${bdr}`, borderRadius: 8,
                padding: '11px 22px', fontSize: 15, cursor: 'pointer',
              }}
            >
              {document ? 'Try a different read' : 'Have my CEO propose one'}
            </button>
          )}

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
