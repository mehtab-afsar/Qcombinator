import type { AssetDef } from '../../types'

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
 * ⚠️ `sharedWith` is intentionally UNSET, and P002 is why.
 *
 * P002 is not seeded yet (only P001 is — see the F05 plan), and every reference
 * in this Registry must resolve or the load fails. Claiming `sharedWith: ['P002']`
 * today would be a dangling pointer to a Program that does not exist — the same
 * rule that keeps `growth.programs` to `['P001']`.
 *
 * **This will not be forgotten.** `validateRegistry()` checks the link in both
 * directions: the moment P002 is seeded listing AS004 among its assets, the load
 * FAILS until `sharedWith: ['P002']` is added here. The guard does the
 * remembering, not a person.
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
  outputSchema: 'markdown',
  instructionsRef: 'AS004',
}
