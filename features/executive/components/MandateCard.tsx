'use client'

import { surf, bdr, ink, muted } from '@/lib/constants/colors'
import { FONT_SERIF } from '@/features/onboarding/theme'
import type { Contract } from '../types/executive.types'

/**
 * The mandate itself — what the founder committed to.
 *
 * "Who is working to it" used to be listed here as raw `templateId · owner` text
 * ("P001 · growth") — that's now <ExecutiveRoster/>, rendered separately on the page, so the
 * 5 executives get real identity (name, motto) instead of being a line inside this card.
 *
 * Sharp corners + serif headline to match ExecutiveCard/the detail page — one visual language
 * for the whole Command View, not the mandate looking like an older, different product.
 *
 * Renders state. No executive reasoning lives here (CLAUDE.md §2).
 */
export function MandateCard({ contract }: { contract: Contract }) {
  return (
    <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 4, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ fontFamily: FONT_SERIF, color: ink, fontSize: 19, fontWeight: 500, letterSpacing: '-0.01em', margin: 0 }}>Your mandate</h2>
        <span style={{ color: muted, fontSize: 12 }}>
          {/* The epoch is the operating period — "what were we operating under, when"
              (ADR-003). It is the number that means something to a founder; the
              row version is bookkeeping (ADR-022), so it is not shown. */}
          Epoch {contract.epoch}
          {contract.status === 'confirmed' && contract.confirmedAt && (
            <> · confirmed {new Date(contract.confirmedAt).toLocaleDateString()}</>
          )}
        </span>
      </div>

      <Block label="Priorities" items={contract.priorities} />
      <Block label="Success metrics" items={contract.successMetrics} />
    </div>
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
