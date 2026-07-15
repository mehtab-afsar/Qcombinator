'use client'

/**
 * The Executive Command View (F09) — `/founder/executive`.
 *
 * The founder's window into the autonomous system: their mandate, who is working
 * to it, and the briefings each cycle produces.
 *
 * ⚠️ VISIBILITY AND COMMAND — NOT APPROVAL. There is exactly ONE confirmation in
 * this product, and it happens once, here, when the mandate is first set
 * (ADR-002: no proposed status, no sign-off gate, no waiting state). After that
 * the founder redirects by issuing a NEW MANDATE — never by approving a cycle.
 *
 * If a future change adds "approve this week's work" to this page, it has
 * rebuilt the gate the PRD deliberately removed. The only other checkpoint in the
 * whole system is just-in-time approval on irreversible external Actions, at the
 * Connector boundary (Story 3) — not here.
 *
 * Thin: renders state, calls the API. No executive reasoning (CLAUDE.md §2).
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2 } from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue, red } from '@/lib/constants/colors'
import { MandateCard } from '@/features/executive/components/MandateCard'
import { BriefingsPanel } from '@/features/executive/components/BriefingsPanel'
import {
  resolveMandateState,
  type Contract,
  type ProgramInstance,
  type Strategy,
} from '@/features/executive/types/executive.types'

export default function ExecutivePage() {
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [contract, setContract] = useState<Contract | null>(null)
  const [programs, setPrograms] = useState<ProgramInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [disabled, setDisabled] = useState(false)

  const load = useCallback(async () => {
    try {
      const [sRes, cRes] = await Promise.all([fetch('/api/strategy'), fetch('/api/contracts')])

      if (sRes.status === 404 || cRes.status === 404) {
        // The flag is off — the new model is not switched on here.
        setDisabled(true)
        return
      }
      if (sRes.ok) setStrategy((await sRes.json()).strategy)
      if (cRes.ok) {
        const data = await cRes.json()
        setContract(data.contract)
        setPrograms(data.programs ?? [])
      }
    } catch {
      setError('Could not load your mandate.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function post(url: string, body?: unknown) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json()
      if (!res.ok) {
        // 409s are expected disagreement — an incomplete strategy, a lost race.
        // The founder should read the reason, not a generic failure.
        setError(data.error ?? 'Something went wrong.')
        return
      }
      await load()
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div style={{ background: bg, minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Loader2 size={20} color={muted} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (disabled) {
    return (
      <Shell>
        <h1 style={{ color: ink, fontSize: 28, fontWeight: 600, margin: 0 }}>Executive team</h1>
        <p style={{ color: muted, fontSize: 15, marginTop: 10 }}>
          This isn’t switched on yet.
        </p>
      </Shell>
    )
  }

  const state = resolveMandateState(strategy, contract)

  return (
    <Shell>
      <h1 style={{ color: ink, fontSize: 28, fontWeight: 600, margin: 0 }}>Executive team</h1>
      <p style={{ color: muted, fontSize: 15, marginTop: 8, lineHeight: 1.6, maxWidth: 620 }}>
        {state === 'confirmed'
          ? 'Your team is operating to this mandate. You don’t approve their work each week — you redirect them by setting a new mandate.'
          : 'Set the direction once. Your executive team works to it from there.'}
      </p>

      {error && (
        <div style={{
          background: '#FEF2F2', border: `1px solid ${red}`, color: red,
          borderRadius: 8, padding: '12px 14px', marginTop: 20, fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {state === 'no_strategy' && (
        <Step
          title="Set your direction"
          body="Your mandate is built from your strategy — mission, priorities, goals. It takes a few minutes."
          action={<Link href="/founder/strategy" style={primaryLink}>Set your direction <ArrowRight size={15} /></Link>}
        />
      )}

      {state === 'no_contract' && (
        <Step
          title="Draft your mandate"
          body="Turn your direction into an executive contract — what your team will work on, and how success is measured."
          action={
            <button onClick={() => void post('/api/contracts', { action: 'draft' })} disabled={busy} style={primaryBtn(busy)}>
              {busy ? 'Drafting…' : 'Draft my mandate'}
            </button>
          }
        />
      )}

      {contract && (state === 'draft' || state === 'confirmed') && (
        <div style={{ marginTop: 24 }}>
          <MandateCard contract={contract} programs={programs} />

          {state === 'draft' && (
            <div style={{ marginTop: 20 }}>
              <p style={{ color: muted, fontSize: 14, lineHeight: 1.6, maxWidth: 620, margin: '0 0 12px' }}>
                {/* THE one confirmation in this product (ADR-002). Said plainly, because
                    the founder is handing over autonomy and should know it. */}
                Confirming this puts your team to work. They’ll run to it without asking
                again — you change direction by setting a new mandate, not by approving
                each week.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => void post('/api/contracts', { action: 'confirm', contractId: contract.id })}
                  disabled={busy}
                  style={primaryBtn(busy)}
                >
                  {busy ? 'Confirming…' : 'Confirm this mandate'}
                </button>
                <button
                  onClick={() => void post('/api/contracts', { action: 'draft' })}
                  disabled={busy}
                  style={secondaryBtn}
                >
                  Redraft
                </button>
              </div>
            </div>
          )}

          {state === 'confirmed' && (
            <div style={{ marginTop: 20 }}>
              <button
                onClick={() => void post('/api/contracts/new-epoch')}
                disabled={busy}
                style={secondaryBtn}
              >
                {busy ? 'Working…' : 'Issue a new mandate'}
              </button>
              <p style={{ color: muted, fontSize: 13, marginTop: 8, maxWidth: 620, lineHeight: 1.6 }}>
                {/* ADR-003, in the founder's language. */}
                This starts a new epoch. Your current mandate is kept exactly as it is —
                nothing is overwritten, and you can always see what you were operating
                under, and when.
              </p>
            </div>
          )}
        </div>
      )}

      {state === 'confirmed' && <BriefingsPanel />}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>{children}</div>
    </div>
  )
}

function Step({ title, body, action }: { title: string; body: string; action: React.ReactNode }) {
  return (
    <div style={{
      background: surf, border: `1px solid ${bdr}`, borderRadius: 12,
      padding: 24, marginTop: 24,
    }}>
      <h2 style={{ color: ink, fontSize: 17, fontWeight: 600, margin: 0 }}>{title}</h2>
      <p style={{ color: muted, fontSize: 14, margin: '8px 0 16px', lineHeight: 1.6, maxWidth: 560 }}>{body}</p>
      {action}
    </div>
  )
}

const primaryBtn = (busy: boolean): React.CSSProperties => ({
  background: blue, color: '#fff', border: 'none', borderRadius: 8,
  padding: '11px 22px', fontSize: 15, fontWeight: 500,
  cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
})

const secondaryBtn: React.CSSProperties = {
  background: 'none', color: ink, border: `1px solid ${bdr}`, borderRadius: 8,
  padding: '11px 22px', fontSize: 15, cursor: 'pointer',
}

const primaryLink: React.CSSProperties = {
  ...primaryBtn(false),
  display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none',
}
