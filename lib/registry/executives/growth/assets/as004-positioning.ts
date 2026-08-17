import type { AssetDef } from '../../../types'

/**
 * AS004 — Positioning & Messaging Framework.
 *
 * Workbook (Asset Registry): "Defines positioning, value proposition, messaging
 * hierarchy and core messaging."
 *
 * ─── THE SHARED ASSET ────────────────────────────────────────────────────────
 * This is the only Asset in the workbook owned by more than one Program. Its
 * Asset Registry row reads **"P001 - GTM, P002 - Brand"** — every other row names
 * exactly one.
 *
 * `program: 'P001'` is the owner (PRD §10 lists AS004 among P001's assets, and
 * §7.1 models a single owning Program).
 *
 * `sharedWith: ['P002']` was added the moment P002 was seeded (p002-brand.ts
 * lists AS004 among its assets) — exactly the pairing `validateRegistry()`
 * requires in both directions: a Program cannot claim an Asset the Asset does
 * not name it back for, and vice versa. Before P002 existed this was
 * deliberately left unset (a reference to an unseeded Program would have
 * failed the load); now it is the real, resolvable link.
 *
 * Why any of this matters: Story 2's persistence validation must block "a P003
 * output stored as a version of AS001" (PRD §7.3) while still allowing P002 to
 * legitimately update AS004. Owner-only would make those two cases
 * indistinguishable and silently block real work.
 *
 * NOTE for F11: validate writes via `listProgramsForAsset()` — owner **and**
 * `sharedWith` — never against `program` alone.
 */
export const AS004_POSITIONING_MESSAGING: AssetDef = {
  id: 'AS004',
  name: 'Positioning & Messaging Framework',
  program: 'P001',
  sharedWith: ['P002'],
  outputSchema: 'markdown',
  instructionsRef: 'AS004',
}
