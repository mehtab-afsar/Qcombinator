'use client'

/**
 * One Executive's own space — the "hierarchy" half of the Command View redesign.
 *
 * F09 IA restructuring: this tab follows the same beat vocabulary as the CEO tab (Read →
 * Mandate → Executive → Confirm), scoped to one executive. "The Direction" beat is deliberately
 * absent here — Direction (agree/nudge) is a whole-company concept the CEO tab owns; there is no
 * per-executive direction in the data model, and inventing one would duplicate Unveiling's own
 * layer for no real gain. "Confirm" is a read-only status line, never a button — see the comment
 * on ConfirmStatus below for why.
 *
 * Not a chat. Clicking through from the roster/tab bar does not open a conversation with Patel —
 * it opens a status page. See ExecutiveCard's docstring for why that distinction matters.
 *
 * Generic route, not one per executive (CLAUDE.md §0.1) — this file handles all 5 ids today and
 * will handle a 6th without modification if one is ever added.
 *
 * Thin: renders state, calls the API. No executive reasoning (CLAUDE.md §2).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Inbox, AlertCircle, Compass } from 'lucide-react'
import { bg, muted, ink } from '@/lib/constants/colors'
import { space } from '@/features/shared/tokens'
import { PageHeader } from '@/features/shared/components/PageHeader'
import { EmptyState } from '@/features/shared/components/EmptyState'
import { Badge } from '@/features/shared/components/Badge'
import { PageSpinner } from '@/features/shared/components/Spinner'
import { fetchWithTimeout, isTimeoutError } from '@/features/shared/lib/fetchWithTimeout'
import { RhythmPanel } from '@/features/executive/components/RhythmPanel'
import { BriefingsPanel } from '@/features/executive/components/BriefingsPanel'
import { ActionsPanel } from '@/features/executive/components/ActionsPanel'
import { ProgramAssetsPanel } from '@/features/executive/components/ProgramAssetsPanel'
import { ExecutiveTabBar } from '@/features/executive/components/ExecutiveTabBar'
import { ExecutiveRead } from '@/features/executive/components/ExecutiveRead'
import { BeatHeading } from '@/features/executive/components/BeatHeading'
import type { Contract, ExecutiveSummary, ProgramInstance } from '@/features/executive/types/executive.types'

type LoadState = 'loading' | 'timeout' | 'not_found' | 'ready'

/**
 * "Confirm" — always a read-only status line, never a button, on every tab but the CEO's.
 *
 * There is exactly one confirm in this product (ADR-002 — no per-plan sign-off) and one
 * immutable, whole-contract mandate row (ADR-003). "Finance confirmed, Growth didn't" isn't a
 * state the data model can express, so nothing here should look clickable — a disabled button
 * implies an action merely blocked for now, which is the wrong signal when no such action
 * exists at all.
 */
function ConfirmStatus({ contract }: { contract: Contract | null }) {
  if (!contract || contract.status !== 'confirmed') return null
  return (
    <div>
      <BeatHeading>Confirm</BeatHeading>
      <p style={{ color: muted, fontSize: 13, margin: 0 }}>
        Confirmed as part of your mandate · epoch {contract.epoch}
        {contract.confirmedAt && <> · {new Date(contract.confirmedAt).toLocaleDateString()}</>}
      </p>
    </div>
  )
}

export default function ExecutiveDetailPage() {
  const executiveId = String(useParams().executiveId ?? '')
  const [state, setState] = useState<LoadState>('loading')
  const [executive, setExecutive] = useState<ExecutiveSummary | null>(null)
  const [program, setProgram] = useState<ProgramInstance | null>(null)
  const [contract, setContract] = useState<Contract | null>(null)
  const live = useRef(true)

  const load = useCallback(async () => {
    setState('loading')
    try {
      const [execRes, contractRes] = await Promise.all([
        fetchWithTimeout('/api/executives'),
        fetchWithTimeout('/api/contracts'),
      ])
      if (!live.current) return
      if (!execRes.ok || !contractRes.ok) { setState('not_found'); return }

      const found: ExecutiveSummary | undefined =
        (await execRes.json()).executives?.find((e: ExecutiveSummary) => e.id === executiveId)
      if (!live.current) return
      if (!found) { setState('not_found'); return } // an unknown id — honest 404, not a crash

      const contractData = await contractRes.json()
      if (!live.current) return
      const programs: ProgramInstance[] = contractData.programs ?? []
      setContract(contractData.contract ?? null)
      setExecutive(found)
      setProgram(programs.find(p => p.owner === executiveId) ?? null)
      setState('ready')
    } catch (err) {
      if (live.current) setState(isTimeoutError(err) ? 'timeout' : 'not_found')
    }
  }, [executiveId])

  useEffect(() => {
    live.current = true
    void load()
    return () => { live.current = false }
  }, [load])

  if (state === 'loading') {
    return <PageSpinner label="Loading…" />
  }

  if (state === 'timeout') {
    return (
      <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <EmptyState
            icon={AlertCircle}
            title="This is taking longer than expected"
            body="We couldn't load this executive in time."
            action={{ label: 'Try again', onClick: () => void load() }}
          />
        </div>
      </div>
    )
  }

  if (state === 'not_found' || !executive) {
    return (
      <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <PageHeader title="Executive team" back={{ label: 'Back to your executive team', href: '/founder/executive' }} />
          <ExecutiveTabBar />
          <p style={{ color: muted, fontSize: 16 }}>
            This executive isn&rsquo;t available.
          </p>
        </div>
      </div>
    )
  }

  const active = program !== null
  // The Mandate beat: this executive's slice of the ONE whole-company contract
  // (ExecutiveContract.responsibilities), the same join MandateCard/TeamClaimsIt already do.
  const mandateEntries = contract?.responsibilities.filter(r => r.executive === executiveId) ?? []

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <PageHeader
          title={executive.name}
          back={{ label: 'Back to your executive team', href: '/founder/executive' }}
        />
        <ExecutiveTabBar />
        <p style={{ color: muted, fontSize: 15, fontStyle: 'italic', margin: '4px 0 0' }}>
          &ldquo;{executive.motto}&rdquo;
        </p>
        {executive.domains.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {executive.domains.map(d => (
              <Badge key={d} variant="neutral">{d}</Badge>
            ))}
          </div>
        )}

        {!contract ? (
          <div style={{ marginTop: 32 }}>
            <EmptyState
              icon={Compass}
              title="No mandate set yet"
              body="Your team works to a mandate you set on the CEO tab — nothing is assigned here until that exists."
              action={{ label: 'Go to the CEO tab', href: '/founder/executive' }}
            />
          </div>
        ) : contract.status !== 'confirmed' ? (
          <div style={{ marginTop: 32 }}>
            <EmptyState
              icon={Compass}
              title="Your mandate is still being set"
              body="Finish setting your direction on the CEO tab — every executive's work here starts once it's confirmed."
              action={{ label: 'Go to the CEO tab', href: '/founder/executive' }}
            />
          </div>
        ) : (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: space[5] }}>
            <ExecutiveRead />

            <div>
              <BeatHeading>The Mandate</BeatHeading>
              {mandateEntries.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18, color: ink, fontSize: 14, lineHeight: 1.7 }}>
                  {mandateEntries.map((r, i) => <li key={i}>{r.mandate}</li>)}
                </ul>
              ) : (
                <EmptyState
                  icon={Inbox}
                  title="No active program yet"
                  body={`${executive.name} isn't assigned any work in your current mandate — this is honest, not a fault. New Programs are added to the Registry as the product grows.`}
                />
              )}
            </div>

            {active && (
              <div>
                <BeatHeading>The Executive</BeatHeading>
                <div style={{ display: 'flex', flexDirection: 'column', gap: space[4] }}>
                  <ProgramAssetsPanel executiveId={executiveId} />
                  <ActionsPanel executiveId={executiveId} />
                  <RhythmPanel executiveId={executiveId} />
                  <BriefingsPanel executiveId={executiveId} />
                </div>
              </div>
            )}

            <ConfirmStatus contract={contract} />
          </div>
        )}
      </div>
    </div>
  )
}
