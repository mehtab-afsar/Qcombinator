'use client'

/**
 * The Registry programs an executive COULD run but the founder's mandate hasn't activated yet
 * (e.g. Patel/Growth has 6; a fresh mandate typically activates 2-3). Before this, the only path
 * to activating one was "Change direction" and hoping the regenerated mandate happened to
 * include it — this is the direct "turn this one on" action, backed by
 * lib/mandate/contract.ts::activateProgram (see its own docstring for why this is still a new
 * Contract epoch under the hood, never an edit, even though it reads as one click here).
 *
 * Renders nothing once every Registry program for this executive is already active — a founder
 * with a fully-loaded executive should see no leftover empty section.
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ink, muted, bdr, bg, red } from '@/lib/constants/colors'
import { radius } from '@/features/shared/tokens'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { Button } from '@/features/shared/components/Button'
import { programName, programObjective } from '../lib/programLabel'
import { useExecutiveWorkspace } from '../hooks/useExecutiveWorkspace'
import type { ProgramInstance } from '../types/executive.types'

export function AvailableProgramsPanel({
  executiveId, activePrograms,
}: {
  executiveId: string
  activePrograms: ProgramInstance[]
}) {
  const { executives, refreshContract } = useExecutiveWorkspace()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const executive = executives.find(e => e.id === executiveId)
  const activeIds = new Set(activePrograms.map(p => p.templateId))
  const availableIds = (executive?.programs ?? []).filter(id => !activeIds.has(id))

  if (availableIds.length === 0) return null

  async function activate(programId: string) {
    setBusyId(programId)
    setError(null)
    try {
      const res = await fetch('/api/contracts/activate-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not activate that program.'); return }
      await refreshContract()
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <SectionCard title="More you could activate">
      <p style={{ color: muted, fontSize: 13, margin: '0 0 14px', lineHeight: 1.5, maxWidth: 560 }}>
        {executive?.name ?? 'This executive'} can also run these — turning one on adds it to your
        mandate immediately, no redraft needed.
      </p>

      {error && <p style={{ color: red, fontSize: 13, marginBottom: 10 }}>{error}</p>}

      <div style={{ display: 'grid', gap: 8 }}>
        {availableIds.map(id => (
          <div
            key={id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              background: bg, border: `1px solid ${bdr}`, borderRadius: radius.md,
              padding: '12px 14px',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: ink, margin: 0 }}>{programName(id)}</p>
              {programObjective(id) && (
                <p style={{
                  fontSize: 12, color: muted, margin: '2px 0 0', lineHeight: 1.4,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {programObjective(id)}
                </p>
              )}
            </div>
            <Button
              variant="secondary" size="sm" loading={busyId === id}
              disabled={busyId !== null} onClick={() => void activate(id)}
              style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <Plus size={13} /> Activate
            </Button>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
