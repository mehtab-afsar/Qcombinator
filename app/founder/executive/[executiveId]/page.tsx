'use client'

/**
 * One Executive's own space — the "hierarchy" half of the Command View redesign.
 *
 * The roster page (/founder/executive) shows all 5 executives at a glance; this is where you
 * actually see one's work: their Program's objective, cycle progress, briefing history, and any
 * Action waiting on you — all scoped to them, not the whole team dumped on one page.
 *
 * Not a chat. Clicking through from the roster does not open a conversation with Patel — it opens
 * a status page. See ExecutiveCard's docstring for why that distinction matters.
 *
 * Generic route, not one per executive (CLAUDE.md §0.1) — this file handles all 5 ids today and
 * will handle a 6th without modification if one is ever added. Mirrors the shape of
 * /founder/assets/[id], except the roster is small and Registry-fixed (5 items, no pagination),
 * so it's fetched as a list and matched client-side rather than needing its own per-id route.
 *
 * Thin: renders state, calls the API. No executive reasoning (CLAUDE.md §2).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Inbox, AlertCircle } from 'lucide-react'
import { bg, muted } from '@/lib/constants/colors'
import { space } from '@/features/shared/tokens'
import { PageHeader } from '@/features/shared/components/PageHeader'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { EmptyState } from '@/features/shared/components/EmptyState'
import { Badge } from '@/features/shared/components/Badge'
import { PageSpinner } from '@/features/shared/components/Spinner'
import { fetchWithTimeout, isTimeoutError } from '@/features/shared/lib/fetchWithTimeout'
import { RhythmPanel } from '@/features/executive/components/RhythmPanel'
import { BriefingsPanel } from '@/features/executive/components/BriefingsPanel'
import { ActionsPanel } from '@/features/executive/components/ActionsPanel'
import type { ExecutiveSummary, ProgramInstance } from '@/features/executive/types/executive.types'

type LoadState = 'loading' | 'timeout' | 'not_found' | 'ready'

export default function ExecutiveDetailPage() {
  const executiveId = String(useParams().executiveId ?? '')
  const [state, setState] = useState<LoadState>('loading')
  const [executive, setExecutive] = useState<ExecutiveSummary | null>(null)
  const [program, setProgram] = useState<ProgramInstance | null>(null)
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

      const programs: ProgramInstance[] = (await contractRes.json()).programs ?? []
      if (!live.current) return
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
          <p style={{ color: muted, fontSize: 16 }}>
            This executive isn&rsquo;t available.
          </p>
        </div>
      </div>
    )
  }

  const active = program !== null

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <PageHeader
          title={executive.name}
          back={{ label: 'Back to your executive team', href: '/founder/executive' }}
        />
        <p style={{ color: muted, fontSize: 15, fontStyle: 'italic', margin: '-20px 0 0' }}>
          &ldquo;{executive.motto}&rdquo;
        </p>
        {executive.domains.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {executive.domains.map(d => (
              <Badge key={d} variant="neutral">{d}</Badge>
            ))}
          </div>
        )}

        {!active ? (
          <div style={{ marginTop: 32 }}>
            <EmptyState
              icon={Inbox}
              title="No active program yet"
              body={`${executive.name.split(' ')[0]} isn't assigned any work in your current mandate — this is honest, not a fault. New Programs are added to the Registry as the product grows.`}
            />
          </div>
        ) : (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: space[5] }}>
            <SectionCard title="Objective">
              <p style={{ margin: 0, lineHeight: 1.5 }}>{program!.objective}</p>
              {program!.successMetric && (
                <p style={{ color: muted, fontSize: 13, margin: '10px 0 0', lineHeight: 1.5 }}>
                  Success metric: {program!.successMetric}
                </p>
              )}
            </SectionCard>

            <ActionsPanel executiveId={executiveId} />
            <RhythmPanel executiveId={executiveId} />
            <BriefingsPanel executiveId={executiveId} />
          </div>
        )}
      </div>
    </div>
  )
}
