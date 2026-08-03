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

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { bg, ink, muted, bdr, alpha } from '@/lib/constants/colors'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { RhythmPanel } from '@/features/executive/components/RhythmPanel'
import { BriefingsPanel } from '@/features/executive/components/BriefingsPanel'
import { ActionsPanel } from '@/features/executive/components/ActionsPanel'
import type { ExecutiveSummary, ProgramInstance } from '@/features/executive/types/executive.types'

type LoadState = 'loading' | 'not_found' | 'ready'

export default function ExecutiveDetailPage() {
  const executiveId = String(useParams().executiveId ?? '')
  const [state, setState] = useState<LoadState>('loading')
  const [executive, setExecutive] = useState<ExecutiveSummary | null>(null)
  const [program, setProgram] = useState<ProgramInstance | null>(null)

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const [execRes, contractRes] = await Promise.all([
          fetch('/api/executives'),
          fetch('/api/contracts'),
        ])
        if (!live) return
        if (!execRes.ok || !contractRes.ok) { setState('not_found'); return }

        const found: ExecutiveSummary | undefined =
          (await execRes.json()).executives?.find((e: ExecutiveSummary) => e.id === executiveId)
        if (!found) { setState('not_found'); return } // an unknown id — honest 404, not a crash

        const programs: ProgramInstance[] = (await contractRes.json()).programs ?? []
        setExecutive(found)
        setProgram(programs.find(p => p.owner === executiveId) ?? null)
        setState('ready')
      } catch {
        if (live) setState('not_found')
      }
    })()
    return () => { live = false }
  }, [executiveId])

  if (state === 'loading') {
    return (
      <div style={{ background: bg, minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Loader2 size={20} color={muted} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (state === 'not_found' || !executive) {
    return (
      <div style={{ background: bg, minHeight: '100vh', padding: '48px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <a href="/founder/executive" style={{ color: muted, fontSize: 13, textDecoration: 'none' }}>
            ← Back to your executive team
          </a>
          <p style={{ color: ink, fontSize: 16, marginTop: 20 }}>
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
        <a href="/founder/executive" style={{ color: muted, fontSize: 13, textDecoration: 'none' }}>
          ← Back to your executive team
        </a>

        <div style={{ marginTop: 20 }}>
          <h1 style={{
            fontFamily: FONT_SERIF, fontSize: 28, fontWeight: 500, letterSpacing: '-0.01em',
            color: ink, margin: 0,
          }}>
            {executive.name}
          </h1>
          <p style={{ color: muted, fontSize: 15, fontStyle: 'italic', margin: '6px 0 0' }}>
            &ldquo;{executive.motto}&rdquo;
          </p>
          {executive.domains.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {executive.domains.map(d => (
                <span key={d} style={{
                  fontSize: 11, color: muted, border: `1px solid ${bdr}`, borderRadius: 4,
                  padding: '2px 8px', textTransform: 'uppercase', letterSpacing: 0.4,
                }}>
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>

        {!active ? (
          <div style={{
            marginTop: 32, padding: '20px 22px', border: `1px solid ${alpha(bdr, 0.8)}`,
            borderRadius: 4, background: '#fff',
          }}>
            <p style={{ color: muted, fontSize: 14, margin: 0, lineHeight: 1.6 }}>
              No active program yet. {executive.name.split(' ')[0]} isn&rsquo;t assigned any work
              in your current mandate — this is honest, not a fault. New Programs are added to
              the Registry as the product grows.
            </p>
          </div>
        ) : (
          <div style={{ marginTop: 20 }}>
            <div style={{
              padding: '18px 20px', border: `1px solid ${ink}`, borderRadius: 4, background: '#fff',
            }}>
              <p style={{
                fontSize: 11, color: muted, textTransform: 'uppercase',
                letterSpacing: 0.6, margin: 0, fontWeight: 600,
              }}>
                Objective
              </p>
              <p style={{ color: ink, fontSize: 15, margin: '6px 0 0', lineHeight: 1.5 }}>
                {program!.objective}
              </p>
              {program!.successMetric && (
                <p style={{ color: muted, fontSize: 13, margin: '10px 0 0', lineHeight: 1.5 }}>
                  Success metric: {program!.successMetric}
                </p>
              )}
            </div>

            <ActionsPanel executiveId={executiveId} />
            <RhythmPanel executiveId={executiveId} />
            <BriefingsPanel executiveId={executiveId} />
          </div>
        )}
      </div>
    </div>
  )
}
