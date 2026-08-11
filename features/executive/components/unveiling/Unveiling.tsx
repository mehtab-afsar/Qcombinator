'use client'

/**
 * F07 "The Unveiling" (UX_SPEC_the_frame.md §3) — one continuous descent, no
 * screen-jumps, five layers: the read -> the proposed direction -> the mandate
 * hardens -> the team claims it -> one confirm. Replaces the old propose-and-edit
 * strategy form entirely; there is no mission/priorities/goals text box anywhere
 * in this component.
 *
 * Resumes at the right layer from the SAME resolveJourneyState data the page
 * already fetched — never restarts a decision already saved (§5 of the plan).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { red } from '@/lib/constants/colors'
import { useStreamedProposal, type StreamedProposal } from '../../hooks/useStreamedProposal'
import { loadUnveilingDraft, saveUnveilingDraft, clearUnveilingDraft } from '../../lib/unveiling-draft'
import { Thread } from './Thread'
import { TheRead } from './TheRead'
import { ProposedDirection } from './ProposedDirection'
import { NudgeExchange } from './NudgeExchange'
import { MandateReveal } from './MandateReveal'
import { OneConfirm } from './OneConfirm'
import type { Contract, Strategy } from '../../types/executive.types'

type Step = 1 | 2 | 3 | 4 | 5

interface Committed { mission: string; priorities: string[]; goals: string[] }

export function entryStep(strategy: Strategy | null, contract: Contract | null): Step {
  if (contract) return 4
  if (strategy) return 3
  return 1
}

export function Unveiling({
  strategy, contract, onDone,
}: {
  strategy: Strategy | null
  contract: Contract | null
  onDone: () => void | Promise<void>
}) {
  // A tab reload/remount while reviewing "The direction" (step 2) used to lose everything and
  // restart at "The read" — nothing about that step was saved anywhere until Accept is clicked.
  // If the server-derived entryStep would land on step 1 but a draft survived in sessionStorage
  // (unveiling-draft.ts), resume from it instead of re-triggering a fresh AI proposal.
  const [step, setStep] = useState<Step>(() => {
    const es = entryStep(strategy, contract)
    return es === 1 && loadUnveilingDraft() ? 2 : es
  })
  const [localContract, setLocalContract] = useState<Contract | null>(contract)
  const [committed, setCommitted] = useState<Committed | null>(
    strategy ? { mission: strategy.mission ?? '', priorities: strategy.priorities, goals: strategy.goals } : null,
  )
  // Layer 2's current candidate — proposed or nudged, not yet saved.
  const [candidate, setCandidate] = useState<StreamedProposal | null>(() =>
    entryStep(strategy, contract) === 1 ? loadUnveilingDraft() : null,
  )
  const [nudging, setNudging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Bumped on every fresh commit — forces MandateReveal to remount and re-draft
  // instead of reusing a stale contract from a direction that's no longer current.
  const [attempt, setAttempt] = useState(0)

  const { streaming, readText, readDone, proposal, error: proposeError, run } = useStreamedProposal()
  const startedProposing = useRef(false)

  // Step 1: the read starts the moment we land here with nothing saved yet — no
  // input asked first ("propose, don't ask" — UX_SPEC §1.2).
  useEffect(() => {
    if (step === 1 && !startedProposing.current) {
      startedProposing.current = true
      void run('/api/strategy/propose', {})
    }
  }, [step, run])

  useEffect(() => {
    if (proposal && step === 1) {
      setCandidate(proposal)
      setStep(2)
    }
  }, [proposal, step])

  // Persists the moment there's something worth resuming — the initial proposal arriving, or a
  // nudge revision (both already flow through setCandidate). Cleared once saveAndCommit succeeds
  // below, at which point the server-persisted strategy is what a reload should resume from.
  useEffect(() => {
    if (step === 2 && candidate) saveUnveilingDraft(candidate)
  }, [step, candidate])

  const saveAndCommit = useCallback(async (fields: Committed) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not save your direction.'); return }
      setCommitted(fields)
      setLocalContract(null)
      setAttempt(a => a + 1)
      setNudging(false)
      setStep(3)
      clearUnveilingDraft()
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setBusy(false)
    }
  }, [])

  async function confirm() {
    if (!localContract) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', contractId: localContract.id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      await onDone()
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function refine() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'draft' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      setLocalContract(data.contract)
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function reviseDirection() {
    if (committed) setCandidate({ ...committed, read: '', document: undefined })
    setNudging(false)
    setStep(2)
  }

  return (
    <div style={{ display: 'flex', gap: 36, alignItems: 'flex-start' }}>
      <div style={{ paddingTop: 4, flexShrink: 0 }}>
        <Thread step={step} />
      </div>

      <div style={{ flex: 1, maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {error && <p style={{ color: red, fontSize: 14, margin: 0 }}>{error}</p>}

        {step === 1 && (
          <>
            <TheRead text={readText} streaming={streaming} readDone={readDone} />
            {proposeError && <p style={{ color: red, fontSize: 14, margin: 0 }}>{proposeError}</p>}
          </>
        )}

        {step === 2 && candidate && !nudging && (
          <ProposedDirection
            mission={candidate.mission}
            busy={busy}
            onAccept={() => void saveAndCommit({ mission: candidate.mission, priorities: candidate.priorities, goals: candidate.goals })}
            onNudgeClick={() => setNudging(true)}
          />
        )}
        {step === 2 && nudging && candidate && (
          <NudgeExchange
            previous={{ mission: candidate.mission, priorities: candidate.priorities, goals: candidate.goals }}
            onCancel={() => setNudging(false)}
            onRevised={revised => { setCandidate(revised); setNudging(false) }}
          />
        )}

        {step >= 3 && (
          <MandateReveal
            key={attempt}
            contract={localContract}
            mission={committed?.mission}
            onHardened={c => { setLocalContract(c); setStep(s => (s < 4 ? 4 : s)) }}
            onError={setError}
          />
        )}

        {step >= 4 && localContract && (
          <OneConfirm
            busy={busy}
            onConfirm={() => void confirm()}
            onRefine={() => void refine()}
            onRevise={reviseDirection}
          />
        )}
      </div>
    </div>
  )
}
