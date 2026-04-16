/**
 * Agent-shared color constants.
 * Base palette re-exported from canonical lib/constants/colors.ts.
 * Agent-specific semantic maps defined here.
 */
export { bg, surf, bdr, ink, muted, blue, green, amber, red } from '@/lib/constants/colors'

export const pillarAccent: Record<string, string> = {
  "sales-marketing":    "#2563EB",
  "operations-finance": "#16A34A",
  "product-strategy":   "#7C3AED",
}

export const pillarLabel: Record<string, string> = {
  "sales-marketing":    "Sales & Marketing",
  "operations-finance": "Operations & Finance",
  "product-strategy":   "Product & Strategy",
}

export const dimensionLabel: Record<string, string> = {
  goToMarket: "GTM Score",
  financial:  "Financial Score",
  team:       "Team Score",
  product:    "Product Score",
  market:     "Market Score",
  traction:   "Traction Score",
}
