/**
 * Industry taxonomy for founder onboarding
 * 28 industries organized into 9 categories with icons
 * Used for displaying searchable industry selector on onboarding Step 2
 */

export interface Industry {
  id: string
  label: string
  description?: string
}

export interface IndustryCategory {
  id: string
  name: string
  description?: string
  industries: Industry[]
}

export const INDUSTRY_CATEGORIES: IndustryCategory[] = [
  {
    id: 'healthcare',
    name: 'Healthcare & Life Sciences',
    industries: [
      { id: 'medtech', label: 'Medical Devices' },
      { id: 'biotech', label: 'Biotechnology' },
      { id: 'pharma', label: 'Pharmaceuticals' },
      { id: 'diagnostics', label: 'Diagnostics & Testing' },
      { id: 'healthtech', label: 'Health Tech / Digital Health' },
      { id: 'wellness', label: 'Wellness & Fitness' },
    ],
  },
  {
    id: 'technology',
    name: 'Software & AI',
    industries: [
      { id: 'ai-ml', label: 'AI / Machine Learning' },
      { id: 'saas', label: 'SaaS / Enterprise Software' },
      { id: 'dev-tools', label: 'Developer Tools' },
      { id: 'cybersecurity', label: 'Cybersecurity' },
      { id: 'cloud-infra', label: 'Cloud Infrastructure' },
      { id: 'data-analytics', label: 'Data & Analytics' },
    ],
  },
  {
    id: 'fintech',
    name: 'Financial Services',
    industries: [
      { id: 'fintech', label: 'FinTech / Payments' },
      { id: 'crypto', label: 'Web3 / Crypto' },
      { id: 'insurtech', label: 'InsurTech' },
      { id: 'wealth-mgmt', label: 'Wealth Management' },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise & B2B',
    industries: [
      { id: 'b2b-marketplace', label: 'B2B Marketplace' },
      { id: 'supply-chain', label: 'Supply Chain & Logistics' },
      { id: 'manufacturing', label: 'Manufacturing / Industry 4.0' },
      { id: 'retail-commerce', label: 'E-Commerce & Retail' },
      { id: 'hr-talent', label: 'HR & Talent Management' },
    ],
  },
  {
    id: 'climate',
    name: 'Climate & Sustainability',
    industries: [
      { id: 'cleantech', label: 'Clean Energy & Climate' },
      { id: 'agritech', label: 'AgriTech & FoodTech' },
      { id: 'water', label: 'Water & Environmental Tech' },
      { id: 'circular-economy', label: 'Circular Economy' },
    ],
  },
  {
    id: 'consumer',
    name: 'Consumer & Direct-to-Consumer',
    industries: [
      { id: 'consumer-goods', label: 'Consumer Goods / CPG' },
      { id: 'food-beverage', label: 'Food & Beverage' },
      { id: 'fashion-apparel', label: 'Fashion & Apparel' },
      { id: 'beauty-cosmetics', label: 'Beauty & Cosmetics' },
      { id: 'travel-hospitality', label: 'Travel & Hospitality' },
    ],
  },
  {
    id: 'education',
    name: 'Education & Workforce',
    industries: [
      { id: 'edtech', label: 'EdTech / Learning' },
      { id: 'skill-training', label: 'Skill Training & Upskilling' },
    ],
  },
  {
    id: 'hardware',
    name: 'Hardware & Physical Products',
    industries: [
      { id: 'robotics', label: 'Robotics & Automation' },
      { id: 'iot', label: 'IoT & Smart Devices' },
      { id: 'consumer-hardware', label: 'Consumer Hardware' },
    ],
  },
  {
    id: 'media',
    name: 'Media & Entertainment',
    industries: [
      { id: 'gaming', label: 'Gaming & Esports' },
      { id: 'streaming', label: 'Streaming & Content' },
      { id: 'creator-economy', label: 'Creator Economy' },
    ],
  },
]

/**
 * Flatten industries for search/filter operations
 */
export function getAllIndustries(): Industry[] {
  return INDUSTRY_CATEGORIES.flatMap(cat => cat.industries)
}

/**
 * Get industry label by ID
 */
export function getIndustryLabel(id: string): string | undefined {
  return getAllIndustries().find(ind => ind.id === id)?.label
}

/**
 * Get category name by industry ID
 */
export function getCategoryByIndustry(industryId: string): IndustryCategory | undefined {
  return INDUSTRY_CATEGORIES.find(cat =>
    cat.industries.some(ind => ind.id === industryId)
  )
}

/**
 * Mapping from old 5-industry system to new 28-industry system
 * Used for migrating existing founder profiles
 */
export const LEGACY_INDUSTRY_MAP: Record<string, string> = {
  'medtech-biotech': 'biotech',      // → choose primary
  'ai-software': 'ai-ml',            // → AI/ML
  'robotics-hardware': 'robotics',   // → Robotics
  'agri-foodtech': 'agritech',       // → AgriTech
  'clean-tech': 'cleantech',         // → Clean Energy
}
