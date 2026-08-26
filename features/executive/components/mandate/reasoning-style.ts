/**
 * Shared styling for the structured mandate panel, so the label/value treatment has one
 * definition rather than being retyped in three sibling components.
 *
 * `.ts`, not `.tsx`, on purpose: __tests__/design-tokens.test.ts sweeps new `.tsx` files under
 * features/ for hex literals. That sweep is right, and this file honours it anyway — every
 * colour below comes from lib/constants/colors.
 */

import type { CSSProperties } from 'react'
import { ink, muted, blue, amber, alpha } from '@/lib/constants/colors'
import { font, radius } from '@/features/shared/tokens'
import type { Priority, ParsedRisk } from '@/lib/mandate/document-structure'

/** Small caps label in the left column of a labelled row. */
export const labelStyle: CSSProperties = {
  color: muted,
  fontSize: font.size.xs,
  fontWeight: font.weight.semibold,
  letterSpacing: font.letterSpacing.label,
  textTransform: 'uppercase',
  paddingTop: 2,
}

/** The value beside it. Capped by measure, not by the card — the card is deliberately wide. */
export const valueStyle: CSSProperties = {
  color: ink,
  fontSize: 13.5,
  lineHeight: 1.6,
  margin: 0,
  maxWidth: '68ch',
}

/** Two columns: a fixed label gutter, then the sentence. */
export const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '104px 1fr',
  gap: 12,
  alignItems: 'start',
}

/**
 * High is amber, not red. It is a ranking the executive assigned, not a fault condition — red
 * would read as "something is wrong with this objective", which is a different claim entirely.
 */
export const PRIORITY_COLOR: Record<Priority, string> = {
  high: amber,
  medium: blue,
  low: muted,
}

export const RISK_COLOR: Record<ParsedRisk['kind'], string> = {
  strategic: amber,
  execution: blue,
  assumption: muted,
}

export const RISK_LABEL: Record<ParsedRisk['kind'], string> = {
  strategic: 'Strategic risk',
  execution: 'Execution risk',
  assumption: 'Critical assumption',
}

/** A pill — the app's dominant chip shape (features/shared/tokens.ts's button radii). */
export function chipStyle(color: string): CSSProperties {
  return {
    display: 'inline-block',
    flexShrink: 0,
    background: alpha(color, 0.1),
    color,
    borderRadius: radius.full,
    padding: '3px 10px',
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
    letterSpacing: font.letterSpacing.label,
    textTransform: 'uppercase',
  }
}
