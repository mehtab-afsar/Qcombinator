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
 * static "Hardening into your mandate…" caption.
 */

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ink, muted } from '@/lib/constants/colors'
import { Spinner } from '@/features/shared/components/Spinner'
import { pickReasoningSections } from '@/lib/mandate/document'
import { MandateCard } from '../MandateCard'
import type { Contract } from '../../types/executive.types'

// Nothing here can be shown live token-by-token (composer/mandate.ts asks the model
// to write the document whole, then a JSON tail — not structured for partial reads),
// so a rotating caption is the same "the app is working, here's roughly on what"
// signal already established for the analogous long wait in profile-builder's
// upload loader (UPLOAD_MESSAGES) — reused pattern, not a second one invented here.
const HARDENING_MESSAGES = [
  'Reading your direction…',
  'Weighing your objectives…',
  'Choosing a pathway…',
  'Assigning your team…',
]

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
  const [msgIdx, setMsgIdx] = useState(0)
  const [reasoningOpen, setReasoningOpen] = useState(false)
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

  useEffect(() => {
    if (!drafting) return
    const timer = setInterval(() => setMsgIdx(i => (i + 1) % HARDENING_MESSAGES.length), 2200)
    return () => clearInterval(timer)
  }, [drafting])

  if (drafting || !contract) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
        <Spinner size="sm" color={muted} />
        <span style={{ color: muted, fontSize: 14 }}>{HARDENING_MESSAGES[msgIdx]}</span>
      </div>
    )
  }

  const reasoning = pickReasoningSections(contract.document)

  return (
    <MandateCard
      contract={contract}
      directionSummary={mission}
      showResponsibilities
      animateResponsibilities
      footer={reasoning.length > 0 && (
        <div style={{ marginTop: 20 }}>
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
        </div>
      )}
    />
  )
}
