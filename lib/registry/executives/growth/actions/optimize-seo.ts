import type { ActionDef } from '../../../types'

/**
 * optimize_seo — translate the SEO Strategy's topic clusters and keyword
 * priorities into specific on-page and technical recommendations.
 *
 * Internal analysis and recommendation. Produces guidance against AS011;
 * nothing leaves the product and no website is actually modified, so it runs
 * autonomously — approval gates exist ONLY at the Connector boundary, never
 * on internal work (ADR-002, ADR-004).
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name and one-line purpose came from the Program Registry.
 */
export const OPTIMIZE_SEO: ActionDef = {
  id: 'optimize_seo',
  name: 'Optimize SEO',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'optimize_seo',
}
