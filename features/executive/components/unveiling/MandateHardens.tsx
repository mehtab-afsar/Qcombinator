'use client'

/**
 * Layer 3 — the direction crystallises into a mandate (UX_SPEC_the_frame.md §3.3).
 *
 * "Propose, don't ask" applies here too: this triggers the draft itself, the moment
 * the founder lands on this layer, rather than waiting for a button press. It's the
 * EXISTING POST /api/contracts {action:'draft'} -> createDraft -> S002
 * (lib/mandate/contract.ts) — no new backend, no new machinery. This wraps the
 * existing MandateCard with an entrance beat rather than forking it.
 */

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { muted } from '@/lib/constants/colors'
import { MandateCard } from '../MandateCard'
import type { Contract } from '../../types/executive.types'

export function MandateHardens({
  contract, onHardened, onError,
}: {
  /** null the first time this layer is reached — MandateHardens drafts it itself. */
  contract: Contract | null
  onHardened: (contract: Contract) => void
  onError: (message: string) => void
}) {
  const [drafting, setDrafting] = useState(!contract)
  // StrictMode/re-renders must not fire a second draft request while one is in flight.
  const requested = useRef(false)

  useEffect(() => {
    if (contract || requested.current) return
    requested.current = true
    setDrafting(true)
    void (async () => {
      try {
        const res = await fetch('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'draft' }),
        })
        const data = await res.json()
        if (!res.ok) {
          onError(data.error ?? 'Could not draft your mandate.')
          return
        }
        onHardened(data.contract as Contract)
      } catch {
        onError('Could not reach the server. Try again.')
      } finally {
        setDrafting(false)
      }
    })()
  }, [contract, onHardened, onError])

  if (drafting || !contract) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
        <Loader2 size={16} color={muted} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ color: muted, fontSize: 14 }}>Hardening into your mandate…</span>
      </div>
    )
  }

  return <MandateCard contract={contract} showResponsibilities={false} />
}
