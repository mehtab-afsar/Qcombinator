import type { ActionDef } from '../../../types'

/**
 * define_brand_voice — set or refresh the company's tone-of-voice and
 * terminology standards.
 *
 * Internal. Produces/updates guidance inside AS008; nothing leaves the
 * product, so it runs autonomously (ADR-002, ADR-004).
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name and one-line purpose came from the Program Registry.
 */
export const DEFINE_BRAND_VOICE: ActionDef = {
  id: 'define_brand_voice',
  program: 'P002',
  name: 'Define Brand Voice',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'define_brand_voice',
}
