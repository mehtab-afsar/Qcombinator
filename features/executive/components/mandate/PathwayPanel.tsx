'use client'

/**
 * The recommended strategic pathway — the one choice the mandate actually makes, so it gets its
 * own panel rather than sitting in the same rhythm as everything around it.
 *
 * Each rationale is omitted when the model didn't state it (the captured generation gives a
 * "why" and a "why not the others" but no expected outcomes) — same rule as ObjectiveCards.
 */

import { bdr, ink } from '@/lib/constants/colors'
import { blue, alpha } from '@/lib/constants/colors'
import { font, radius } from '@/features/shared/tokens'
import type { ParsedPathway } from '@/lib/mandate/document-structure'
import { labelStyle, rowStyle, valueStyle } from './reasoning-style'

export function PathwayPanel({ pathway }: { pathway: ParsedPathway }) {
  const rows: Array<[string, string | null]> = [
    ['Why this', pathway.why],
    ['Outcomes', pathway.outcomes],
    ['Not chosen', pathway.alternatives],
  ]
  const present = rows.filter((row): row is [string, string] => Boolean(row[1]))

  return (
    <div style={{
      border: `1px solid ${bdr}`, borderRadius: radius.lg, background: alpha(blue, 0.04),
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <h4 style={{
        fontFamily: font.family.serif, fontSize: font.size.xl, fontWeight: font.weight.medium,
        color: ink, margin: 0, lineHeight: 1.3, textWrap: 'balance',
      }}>
        {pathway.name}
      </h4>

      {present.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {present.map(([label, text]) => (
            <div key={label} style={rowStyle}>
              <span style={labelStyle}>{label}</span>
              <p style={valueStyle}>{text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
