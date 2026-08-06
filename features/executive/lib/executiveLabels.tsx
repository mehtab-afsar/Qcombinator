/**
 * The founder-facing short label and color for each of the 5 executives — one source, not
 * redeclared per component (hoisted out of ExecutiveTabBar.tsx during the artifact organization
 * work, since ArtifactCard needs the same mapping).
 *
 * Labels mirror each executive's own Registry title exactly (ceo.ts/growth.ts/product.ts/
 * operations.ts/finance.ts each already declare "CEO"/"...Growth Officer"/etc.) — never invented.
 * Colors are one each from the palette's already-defined, previously-unassigned extended hues
 * (lib/constants/colors.ts) — CEO stays neutral deliberately: it owns no Program in the Registry
 * today (S001/S002 IS the CEO's job, not a Program) and is framed everywhere else in this app as
 * cross-cutting, not one more colored lane.
 */

import type { BadgeVariant } from '@/features/shared/components/Badge'

export const SHORT_LABEL: Record<string, string> = {
  ceo: 'CEO', growth: 'CGO', product: 'CTO', operations: 'COO', finance: 'CFO',
}

export const EXECUTIVE_BADGE_VARIANT: Record<string, BadgeVariant> = {
  ceo: 'neutral', growth: 'purple', product: 'cyan', operations: 'pink', finance: 'indigo',
}

export function Dot({ color }: { color: string }) {
  return <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
}
