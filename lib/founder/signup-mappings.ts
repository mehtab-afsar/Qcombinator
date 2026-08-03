/**
 * Onboarding-form values → the DB's constrained enums.
 *
 * Extracted from app/api/auth/signup/route.ts so the OAuth completion route (which collects the
 * same steps 2–5, minus account creation) maps identically — the CHECK constraints don't care how
 * someone signed up (CLAUDE.md §2: no duplicated logic).
 */

/** DB CHECK constraint (20260420000003): stage IN ('idea','mvp','pre-seed','seed','series-a','bootstrapped') */
const STAGE_MAP: Record<string, string> = {
  'pre-product':         'idea',
  'idea':                'idea',
  'product-development': 'mvp',
  'mvp':                 'mvp',
  'beta':                'mvp',
  'pre-seed':            'pre-seed',
  'commercial':          'seed',
  'launched':            'seed',
  'seed':                'seed',
  'series-a':            'series-a',
  'growth-scaling':      'series-a',
  'growing':             'series-a',
  'scaling':             'series-a',
  'bootstrapped':        'bootstrapped',
}

const INDUSTRY_MAP: Record<string, string> = {
  'medtech-biotech':     'biotech',
  'ai-software':         'ai_ml',
  'robotics-hardware':   'hardware',
  'agri-foodtech':       'default',
  'clean-tech':          'climate',
}

const REVENUE_MAP: Record<string, string> = {
  'early-revenue': 'first-revenue',
  'recurring':     'mrr-10k-100k',
}

export function mapStage(stage: string | undefined): string {
  return STAGE_MAP[stage ?? ''] ?? 'idea'
}

export function mapIndustry(industry: string | undefined): string | null {
  return industry ? (INDUSTRY_MAP[industry] ?? industry) : null
}

export function mapRevenue(revenueStatus: string | undefined): string | null {
  return revenueStatus ? (REVENUE_MAP[revenueStatus] ?? revenueStatus) : null
}
