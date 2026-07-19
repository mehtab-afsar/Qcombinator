/**
 * Investor criteria — the SINGLE source of truth for sectors / stages / check-sizes.
 *
 * Used by BOTH investor onboarding and investor settings so an investor's choices
 * persist and reflect across screens. Values are stored slugs (e.g. `saas`), never
 * display strings — matching + deal-flow compare on these slugs.
 */
export interface CriterionOption {
  value: string
  label: string
}

export const INVESTOR_SECTORS: CriterionOption[] = [
  { value: 'ai-ml', label: 'AI & ML' },
  { value: 'saas', label: 'SaaS' },
  { value: 'fintech', label: 'FinTech' },
  { value: 'healthtech', label: 'HealthTech' },
  { value: 'cleantech', label: 'CleanTech' },
  { value: 'deeptech', label: 'DeepTech' },
  { value: 'biotech', label: 'BioTech' },
  { value: 'agritech', label: 'AgriTech' },
  { value: 'edtech', label: 'EdTech' },
  { value: 'hardtech', label: 'HardTech' },
  { value: 'web3', label: 'Web3' },
  { value: 'other', label: 'Other' },
]

export const INVESTOR_STAGES: CriterionOption[] = [
  { value: 'pre-seed', label: 'Pre-seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series-a', label: 'Series A' },
  { value: 'series-b', label: 'Series B' },
  { value: 'growth', label: 'Growth' },
]

export const INVESTOR_CHECK_SIZES: CriterionOption[] = [
  { value: '25k-100k', label: '$25K–$100K' },
  { value: '100k-500k', label: '$100K–$500K' },
  { value: '500k-2m', label: '$500K–$2M' },
  { value: '2m-10m', label: '$2M–$10M' },
  { value: '10m+', label: '$10M+' },
]
