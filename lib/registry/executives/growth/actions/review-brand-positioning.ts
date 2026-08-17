import type { ActionDef } from '../../../types'

/**
 * review_brand_positioning — review the brand's identity and narrative against
 * current market perception.
 *
 * Internal analysis. Reads AS004/AS007/AS009, touches nothing outside the
 * product, so it runs autonomously — approval gates exist ONLY at the
 * Connector boundary, never on internal work (ADR-002, ADR-004).
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name and one-line purpose came from the Program Registry.
 */
export const REVIEW_BRAND_POSITIONING: ActionDef = {
  id: 'review_brand_positioning',
  program: 'P002',
  name: 'Review Brand Positioning',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'review_brand_positioning',
}
