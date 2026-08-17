import type { AssetDef } from '../../../types'

/**
 * AS010 — Content Strategy.
 *
 * Workbook (Program Registry, P003 assets): the repeatable content system —
 * TOFU/MOFU/BOFU funnel, content pillars, PESO distribution, hub-and-spoke,
 * editorial calendar — that guides all future publishing. Owned by
 * P003 — Demand Generation.
 */
export const AS010_CONTENT_STRATEGY: AssetDef = {
  id: 'AS010',
  name: 'Content Strategy',
  program: 'P003',
  outputSchema: 'markdown',
  instructionsRef: 'AS010',
}
