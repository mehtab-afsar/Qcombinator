'use client'

/**
 * Layers 3+4 — the direction crystallises into a mandate, and the team claims it
 * (UX_SPEC_the_frame.md §3.3-3.4) — ONE cohesive card now, not three separately
 * styled fragments in sequence (a bare `<p>Direction: …</p>`, a bordered card with
 * only priorities/metrics, then an unstyled "who takes this on" list after it).
 * Replaces MandateHardens.tsx + TeamClaimsIt.tsx.
 *
 * "Propose, don't ask" applies here too: this triggers the draft itself, the moment
 * the founder lands on this layer, rather than waiting for a button press. It's the
 * EXISTING POST /api/contracts {action:'draft'} -> createDraft -> S002
 * (lib/mandate/contract.ts) — no new backend, no new machinery.
 *
 * S002 generates a full 8-step reasoning document (objectives, pathway choice,
 * risks) but only 4 short fields used to ever reach the founder — the rest was
 * generated, saved (`contract.document`), and thrown away. The ~77-90s wait was
 * real either way; this surfaces what it paid for instead of hiding it behind a
 * static "Hardening into your mandate…" caption. The wait itself is MandateDrafting's.
 */

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ink, muted, amber, alpha } from '@/lib/constants/colors'
import { Button } from '@/features/shared/components/Button'
import { pickReasoningSections } from '@/lib/mandate/document'
import { MandateDrafting } from './MandateDrafting'
import { MandateCard } from '../MandateCard'
import type { Contract } from '../../types/executive.types'

export function MandateReveal({
  contract, mission, onHardened, onError,
}: {
  /** null the first time this layer is reached — MandateReveal drafts it itself. */
  contract: Contract | null
  /** The committed Strategy mission — shown as this card's subtitle. */
  mission?: string
  onHardened: (contract: Contract) => void
  onError: (message: string) => void
}) {
  const [drafting, setDrafting] = useState(!contract)
  const [regenerating, setRegenerating] = useState(false)
  const [reasoningOpen, setReasoningOpen] = useState(false)
  // StrictMode/re-renders must not fire a second draft request while one is in flight.
  const requested = useRef(false)

  // Shared by the automatic first draft and the manual "try again" retry below — same request,
  // two callers (CLAUDE.md "no duplicated logic"). Redrafting an unconfirmed contract is safe
  // and already how this API is designed to be re-called: it reuses the epoch (ADR-022) and
  // retires the previous draft row rather than editing it in place (ADR-003).
  async function requestDraft(): Promise<void> {
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
    }
  }

  useEffect(() => {
    if (contract || requested.current) return
    requested.current = true
    setDrafting(true)
    void requestDraft().finally(() => setDrafting(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestDraft closes over onHardened/onError, which are already effect deps below
  }, [contract, onHardened, onError])

  async function regenerate(): Promise<void> {
    setRegenerating(true)
    try {
      await requestDraft()
    } finally {
      setRegenerating(false)
    }
  }

  if (drafting || !contract) return <MandateDrafting mission={mission} />

  const reasoning = pickReasoningSections(contract.document)
  // Only the deterministic fallback (lib/mandate/contract.ts's buildDraft) leaves `document`
  // null on a fresh draft — a real AI mandate always carries its reasoning. Only offer to
  // retry while still a draft; a confirmed contract is immutable (ADR-003) and needs the
  // separate new-epoch flow, not this one.
  const isThinFallback = !contract.document && contract.status === 'draft'

  return (
    <MandateCard
      contract={contract}
      directionSummary={mission}
      showResponsibilities
      animateResponsibilities
      footer={(isThinFallback || reasoning.length > 0) && (
        <div style={{ marginTop: 20 }}>
          {isThinFallback && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              padding: '10px 12px', borderRadius: 8, background: alpha(amber, 0.08),
              marginBottom: reasoning.length > 0 ? 14 : 0,
            }}>
              <span style={{ color: amber, fontSize: 13, lineHeight: 1.5 }}>
                We couldn&rsquo;t fully reason through your mandate this time, so this is a
                narrower starting point than usual.
              </span>
              <Button variant="secondary" size="sm" loading={regenerating} onClick={() => void regenerate()}>
                Try again
              </Button>
            </div>
          )}
          {reasoning.length > 0 && (
            <>
              <button
                onClick={() => setReasoningOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                  padding: 0, cursor: 'pointer', color: muted, fontSize: 12, fontFamily: 'inherit',
                  textTransform: 'uppercase', letterSpacing: 0.4,
                }}
              >
                See the full reasoning
                <ChevronDown
                  size={12}
                  style={{ transform: reasoningOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                />
              </button>
              {reasoningOpen && (
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {reasoning.map((section, i) => (
                    <div key={i}>
                      <h4 style={{ color: ink, fontSize: 13, fontWeight: 600, margin: 0 }}>{section.heading}</h4>
                      <p style={{ color: muted, fontSize: 13, lineHeight: 1.7, margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>
                        {section.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    />
  )
}
