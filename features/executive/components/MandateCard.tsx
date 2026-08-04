'use client'

import { useEffect, useState } from 'react'
import { ink, muted } from '@/lib/constants/colors'
import { SectionCard } from '@/features/shared/components/SectionCard'
import type { Contract, ExecutiveSummary } from '../types/executive.types'

/**
 * The mandate itself — what the founder committed to.
 *
 * ⚠️ NOT A WALL OF JSON. This is the plain-language read of the contract a founder
 * sees before confirming (F08) — priorities, success metrics, and now who actually
 * takes each piece on, by name, not by the raw Registry id `generateMandate`'s JSON
 * tail stores ('growth', not 'Patel'). Self-fetches /api/executives for that name
 * lookup, the same established pattern as ExecutiveRoster/ActionsPanel/BriefingsPanel
 * — one Registry, read the same way everywhere, not a second hardcoded name list.
 *
 * "Who is OPERATING it" is still <ExecutiveRoster/>, rendered separately once a
 * mandate is confirmed. This shows who it's ASSIGNED to, before that's even true —
 * the founder should be able to read that off the draft, not just trust it happened.
 *
 * Sharp corners + serif headline to match ExecutiveCard/the detail page — one visual
 * language for the whole Command View, not the mandate looking like an older,
 * different product.
 *
 * Renders state. No executive reasoning lives here (CLAUDE.md §2).
 */
export function MandateCard({
  contract, showResponsibilities = true, footer,
}: {
  contract: Contract
  /** false inside the unveiling's "mandate hardens" layer — Layer 4 shows who takes
   *  it on a beat later, with more ceremony; showing it twice in a row is redundant. */
  showResponsibilities?: boolean
  /** Rendered after the mandate content, inside the same card — e.g. CommandView's
   *  "Change direction" control. Kept as a prop rather than owned here so the copy
   *  explaining it stays physically in the file that calls for it. */
  footer?: React.ReactNode
}) {
  const [executives, setExecutives] = useState<ExecutiveSummary[]>([])

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const res = await fetch('/api/executives')
        if (res.ok && live) setExecutives((await res.json()).executives ?? [])
      } catch {
        /* Falls back to the raw Registry id below — still true, just less readable. */
      }
    })()
    return () => { live = false }
  }, [])

  const nameById = new Map(executives.map(e => [e.id, e.name]))

  return (
    <SectionCard
      title="Your mandate"
      action={
        <span style={{ color: muted, fontSize: 12 }}>
          {/* The epoch is the operating period — "what were we operating under, when"
              (ADR-003). It is the number that means something to a founder; the
              row version is bookkeeping (ADR-022), so it is not shown. */}
          Epoch {contract.epoch}
          {contract.status === 'confirmed' && contract.confirmedAt && (
            <> · confirmed {new Date(contract.confirmedAt).toLocaleDateString()}</>
          )}
        </span>
      }
    >
      <Block label="Priorities" items={contract.priorities} />
      <Block label="Success metrics" items={contract.successMetrics} />

      {showResponsibilities && contract.responsibilities.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ color: muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, margin: 0 }}>
            Who takes this on
          </h3>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: ink, fontSize: 14, lineHeight: 1.7 }}>
            {contract.responsibilities.map((r, i) => (
              <li key={i}>
                <strong>{nameById.get(r.executive) ?? r.executive}</strong> — {r.mandate}
              </li>
            ))}
          </ul>
        </div>
      )}

      {footer}
    </SectionCard>
  )
}

function Block({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ color: muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, margin: 0 }}>
        {label}
      </h3>
      <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: ink, fontSize: 14, lineHeight: 1.7 }}>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  )
}
