/**
 * One shared heading for the 5-beat vocabulary (The Read / The Mandate / The Executive /
 * Confirm) — used on every Executive Team tab so the pattern reads as one visual system, not
 * five hand-rolled headings per tab.
 *
 * Matches the existing uppercase-eyebrow style MandateCard.tsx already established for section
 * subheadings, rather than inventing a second heading style.
 */

import { muted } from '@/lib/constants/colors'

export function BeatHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      color: muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: 0.4, margin: '0 0 8px',
    }}>
      {children}
    </h3>
  )
}
