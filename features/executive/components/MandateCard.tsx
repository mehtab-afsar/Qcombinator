'use client'

import { bg, surf, bdr, ink, muted, green } from '@/lib/constants/colors'
import type { Contract, ProgramInstance } from '../types/executive.types'

/**
 * The mandate itself — what the founder committed to, and who is working to it.
 *
 * Renders state. No executive reasoning lives here (CLAUDE.md §2).
 */
export function MandateCard({ contract, programs }: {
  contract: Contract
  programs: ProgramInstance[]
}) {
  return (
    <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ color: ink, fontSize: 17, fontWeight: 600, margin: 0 }}>Your mandate</h2>
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

      <div style={{ marginTop: 20 }}>
        <h3 style={{ color: muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, margin: 0 }}>
          Who is working to it
        </h3>
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          {programs.length === 0 && (
            <p style={{ color: muted, fontSize: 14, margin: 0 }}>
              No programmes are active yet.
            </p>
          )}
          {programs.map(p => (
            <div key={p.id} style={{
              background: bg, border: `1px solid ${bdr}`, borderRadius: 8, padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: ink, fontSize: 14, fontWeight: 600 }}>
                  {p.templateId} · {p.owner}
                </span>
                <span style={{
                  fontSize: 11, color: p.status === 'active' ? green : muted,
                  border: `1px solid ${p.status === 'active' ? green : bdr}`,
                  borderRadius: 999, padding: '1px 8px',
                }}>
                  {p.status}
                </span>
              </div>
              <p style={{ color: muted, fontSize: 13, margin: '6px 0 0', lineHeight: 1.5 }}>
                {p.objective}
              </p>
            </div>
          ))}
        </div>
      </div>
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
