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
import { AlertCircle, TrendingUp } from 'lucide-react'
import { bg, red, alpha } from '@/lib/constants/colors'
import { useQScore } from '@/features/qscore/hooks/useQScore'
import { PageHeader } from '@/features/shared/components/PageHeader'
import { EmptyState } from '@/features/shared/components/EmptyState'
import { PageIconLoader } from '@/features/shared/components/Spinner'
import { fetchWithTimeout, isTimeoutError } from '@/features/shared/lib/fetchWithTimeout'
import { ActivationGate } from '@/features/executive/components/ActivationGate'
import { ExecutiveTabBar } from '@/features/executive/components/ExecutiveTabBar'
import { PageContainer } from '@/features/shared/components/PageContainer'
import { Unveiling } from '@/features/executive/components/unveiling/Unveiling'
import {
  resolveJourneyState,
  type Contract,
  type JourneyState,
  type ProgramInstance,
  type Strategy,
} from '@/features/executive/types/executive.types'

function subtitleFor(state: JourneyState): string {
  switch (state) {
    case 'no_score':
      return 'Before your team can work, they need to know where you stand.'
    case 'no_strategy':
    case 'no_contract':
    case 'draft':
      return 'Set the direction your team will operate to.'
    case 'confirmed':
      return 'Your team is operating to this mandate. You don’t approve their work each week — you redirect them by setting a new mandate.'
    default:
      return ''
  }
}

export default function ExecutivePage() {
  const { qScore, loading: qScoreLoading } = useQScore()
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [contract, setContract] = useState<Contract | null>(null)
  const [programs, setPrograms] = useState<ProgramInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [timedOut, setTimedOut] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [disabled, setDisabled] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setTimedOut(false)
    try {
      const [sRes, cRes] = await Promise.all([fetchWithTimeout('/api/strategy'), fetchWithTimeout('/api/contracts')])

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
    } catch (err) {
      if (isTimeoutError(err)) setTimedOut(true)
      else setError('Could not load your mandate.')
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

  if (loading || qScoreLoading) {
    return <PageIconLoader label="Loading…" />
  }

  if (timedOut) {
    return (
      <Shell>
        <EmptyState
          icon={AlertCircle}
          title="This is taking longer than expected"
          body="We couldn't load your executive team in time."
          action={{ label: 'Try again', onClick: () => void load() }}
        />
      </Shell>
    )
  }

  if (disabled) {
    return (
      <Shell>
        <EmptyState title="This isn’t switched on yet." />
      </Shell>
    )
  }

  const hasScore = (qScore?.overall ?? 0) > 0
  const state = resolveJourneyState(hasScore, strategy, contract)

  return (
    <Shell>
      <PageHeader title="Executive team" subtitle={subtitleFor(state)} />

      <ExecutiveTabBar />

      {error && (
        <div style={{
          background: alpha(red, 0.08), border: `1px solid ${red}`, color: red,
          borderRadius: 8, padding: '12px 14px', marginBottom: 20, fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {state === 'no_score' && (
        <EmptyState
          icon={TrendingUp}
          title="Get your Q-Score"
          body="Your CEO reads your Q-Score to draft the direction they'd propose — without it, there's nothing for your team to work from."
          action={{ label: 'Get your Q-Score', href: '/founder/profile-builder' }}
        />
      )}

      {/* F07 "the unveiling" — one continuous descent (read -> direction -> mandate ->
          team -> confirm), no screen-jumps between what used to be three separate
          places (a strategy form, a draft-mandate page, a team page). Resumes at the
          right layer itself from strategy/contract — see Unveiling's entryStep(). */}
      {(state === 'no_strategy' || state === 'no_contract' || state === 'draft') && (
        <div style={{ marginTop: 24 }}>
          <Unveiling strategy={strategy} contract={contract} onDone={load} />
        </div>
      )}

      {/* The payoff screen — Q-Score at the centre, the team around it. ActivationGate decides
          whether the founder is watching the very first cycle build (F09 Activation) or
          landing on the steady-state Command View; everything below the mandate there (roster,
          actions, rhythm, briefings, connectors) is composed inside CommandView, not rebuilt
          (CLAUDE.md §2). */}
      {contract && state === 'confirmed' && (
        <div style={{ marginTop: 24 }}>
          <ActivationGate
            contract={contract}
            programs={programs}
            busy={busy}
            onChangeDirection={() => void post('/api/contracts/new-epoch')}
          />
        </div>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
      <PageContainer>{children}</PageContainer>
    </div>
  )
}

