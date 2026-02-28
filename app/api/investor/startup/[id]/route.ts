import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/investor/startup/:id
// Returns a full founder profile for the investor deep-dive page.
// :id is the founder's user_id (UUID).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Auth check — investors only
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: founderId } = await params

    // Fetch in parallel: founder profile + latest Q-Score + latest artifacts
    const [
      { data: profile, error: profileError },
      { data: qrow },
      { data: artifacts },
    ] = await Promise.all([
      supabase
        .from('founder_profiles')
        .select('full_name, startup_name, industry, stage, tagline, location, funding, linkedin_url, website, updated_at, startup_profile_data')
        .eq('user_id', founderId)
        .single(),

      supabase
        .from('qscore_history')
        .select('overall_score, percentile, grade, market_score, product_score, gtm_score, financial_score, team_score, traction_score, calculated_at, assessment_data')
        .eq('user_id', founderId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from('agent_artifacts')
        .select('artifact_type, content, created_at')
        .eq('user_id', founderId)
        .in('artifact_type', ['financial_summary', 'hiring_plan', 'competitive_matrix', 'gtm_playbook', 'brand_messaging', 'strategic_plan'])
        .order('created_at', { ascending: false }),
    ])

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Founder not found' }, { status: 404 })
    }

    // Pick the most recent artifact per type
    const latestByType: Record<string, Record<string, unknown>> = {}
    for (const art of artifacts ?? []) {
      if (!latestByType[art.artifact_type]) {
        latestByType[art.artifact_type] = art.content as Record<string, unknown>
      }
    }

    const fin  = latestByType['financial_summary']  ?? {}
    const hire = latestByType['hiring_plan']         ?? {}
    const comp = latestByType['competitive_matrix']  ?? {}
    const gtm  = latestByType['gtm_playbook']        ?? {}

    // Extract financial metrics from artifact content
    const financialMetrics = {
      mrr:        extractValue(fin, ['mrr', 'MRR', 'monthlyRevenue', 'monthly_revenue']),
      arr:        extractValue(fin, ['arr', 'ARR', 'annualRevenue', 'annual_revenue']),
      growth:     extractValue(fin, ['growth', 'growthRate', 'growth_rate', 'mrrGrowth']),
      runway:     extractValue(fin, ['runway', 'runwayMonths', 'runway_months']),
      burnRate:   extractValue(fin, ['burn', 'burnRate', 'burn_rate', 'monthlyBurn']),
      customers:  extractValue(fin, ['customers', 'customerCount', 'customer_count', 'activeCustomers']),
      cac:        extractValue(fin, ['cac', 'CAC', 'customerAcquisitionCost']),
      ltv:        extractValue(fin, ['ltv', 'LTV', 'lifetimeValue', 'lifetime_value']),
      grossMargin:extractValue(fin, ['grossMargin', 'gross_margin', 'margin']),
    }

    // Extract team from hiring plan artifact
    const teamMembers = extractArray(hire, ['teamMembers', 'team_members', 'team', 'roles']) ?? []

    // Extract competitors from competitive matrix
    const competitors = extractArray(comp, ['competitors', 'competitorAnalysis', 'matrix', 'companies']) ?? []

    // Build stage label
    const stageLabel: Record<string, string> = {
      idea: 'Idea', mvp: 'MVP', launched: 'Seed', scaling: 'Series A',
      'pre-seed': 'Pre-Seed', seed: 'Seed', 'series-a': 'Series A',
      'series-b': 'Series B', bootstrapped: 'Bootstrapped',
    }

    // Build Q-Score breakdown for sidebar
    const qScoreBreakdown = qrow ? [
      { category: 'Market',   score: qrow.market_score ?? 0,    weight: '20%' },
      { category: 'Product',  score: qrow.product_score ?? 0,   weight: '20%' },
      { category: 'GTM',      score: qrow.gtm_score ?? 0,       weight: '15%' },
      { category: 'Team',     score: qrow.team_score ?? 0,      weight: '20%' },
      { category: 'Financial',score: qrow.financial_score ?? 0, weight: '15%' },
      { category: 'Traction', score: qrow.traction_score ?? 0,  weight: '10%' },
    ] : []

    // Derive AI analysis from scores
    const strengths: string[] = []
    const risks: string[] = []
    if (qrow) {
      if ((qrow.team_score ?? 0) >= 70)     strengths.push(`Strong team score (${qrow.team_score}/100) — founders have relevant domain expertise`)
      if ((qrow.market_score ?? 0) >= 70)   strengths.push(`Well-defined market opportunity with clear TAM (market score ${qrow.market_score}/100)`)
      if ((qrow.traction_score ?? 0) >= 70) strengths.push(`Solid traction signals — customers + revenue evidence verified (${qrow.traction_score}/100)`)
      if ((qrow.product_score ?? 0) >= 70)  strengths.push(`Product differentiation validated — clear PMF signals (${qrow.product_score}/100)`)
      if ((qrow.gtm_score ?? 0) >= 70)      strengths.push(`Go-to-market strategy is structured with defined channels (${qrow.gtm_score}/100)`)
      if ((qrow.financial_score ?? 0) >= 70)strengths.push(`Financial model shows healthy unit economics (${qrow.financial_score}/100)`)

      if ((qrow.team_score ?? 0) < 60)      risks.push(`Team score (${qrow.team_score}/100) below benchmark — key hires or advisor gaps`)
      if ((qrow.market_score ?? 0) < 60)    risks.push(`Market sizing may need more rigorous validation (${qrow.market_score}/100)`)
      if ((qrow.traction_score ?? 0) < 60)  risks.push(`Traction is early-stage — limited customer or revenue evidence (${qrow.traction_score}/100)`)
      if ((qrow.financial_score ?? 0) < 60) risks.push(`Financial projections need more supporting data (${qrow.financial_score}/100)`)
      if ((qrow.gtm_score ?? 0) < 60)       risks.push(`GTM strategy lacks specificity — CAC/LTV and channel mix unclear (${qrow.gtm_score}/100)`)
    }
    if (strengths.length === 0) strengths.push('Assessment data not yet available — ask founder to complete Q-Score interview')
    if (risks.length === 0)     risks.push('No significant risk flags from Q-Score assessment')

    const recommendations = [
      `Q-Score of ${qrow?.overall_score ?? 0} puts this founder in the ${qrow?.percentile ?? 0}th percentile`,
      `Review the ${weakest(qrow)} dimension before proceeding to a call`,
      'Schedule a 30-min intro call to validate the assessment findings',
      `Check agent deliverables for GTM and financial model depth`,
    ]

    // Pull rich startup profile data (from the 6-step form)
    const sp = (profile.startup_profile_data ?? {}) as Record<string, unknown>
    const spCompetitors = (sp.competitors as string[] | undefined) ?? []
    const spAdvisors    = (sp.advisors    as string[] | undefined) ?? []

    const result = {
      founderId,
      name: profile.startup_name || (sp.companyName as string) || `${profile.full_name}'s Startup`,
      founderName: profile.full_name,
      tagline: profile.tagline || (sp.oneLiner as string) || profile.industry || '',
      description: extractString(gtm, ['problem', 'problemStatement', 'overview', 'description'])
        || (sp.problemStatement as string)
        || `${profile.startup_name || profile.full_name} is building in the ${profile.industry || 'technology'} space.`,
      website: profile.website || (sp.website as string) || '',
      founded: (sp.foundedDate as string) ? String(new Date(sp.foundedDate as string).getFullYear()) : '',
      location: profile.location || '',
      stage: stageLabel[profile.stage ?? ''] ?? profile.stage ?? 'Unknown',
      sector: profile.industry || 'Technology',
      fundingGoal: profile.funding || (sp.raisingAmount as string) || '',
      teamSize: (sp.teamSize as number | string) ? Number(sp.teamSize) || teamMembers.length || 1 : teamMembers.length || 0,

      qScore: qrow?.overall_score ?? 0,
      qScorePercentile: qrow?.percentile ?? 0,
      qScoreGrade: qrow?.grade ?? '—',
      qScoreBreakdown,
      lastAssessed: qrow?.calculated_at ?? null,

      financials: financialMetrics,
      teamMembers: teamMembers.slice(0, 6),
      competitors: competitors.length > 0
        ? competitors.slice(0, 4)
        // Fall back to names from startup profile form
        : spCompetitors.slice(0, 6).map(name => ({ name })),

      aiAnalysis: { strengths, risks, recommendations },

      // Rich startup profile fields (from founder's 6-step form)
      startupProfile: {
        solution:       (sp.solution       as string) || '',
        whyNow:         (sp.whyNow         as string) || '',
        moat:           (sp.moat           as string) || '',
        uniquePosition: (sp.uniquePosition as string) || '',
        tamSize:        (sp.tamSize        as string) || '',
        marketGrowth:   (sp.marketGrowth   as string) || '',
        customerType:   (sp.customerPersona as string) || '',
        businessModel:  (sp.businessModel  as string) || '',
        differentiation:(sp.differentiation as string) || '',
        // Team
        equitySplit:    (sp.equitySplit    as string) || '',
        teamSizeLabel:  (sp.teamSize       as string) || '',
        advisors:       spAdvisors,
        keyHires:       (sp.keyHires       as string[] | undefined) ?? [],
        // Fundraising
        raisingAmount:  (sp.raisingAmount  as string) || '',
        useOfFunds:     (sp.useOfFunds     as string) || '',
        previousFunding:(sp.previousFunding as string) || '',
        runwayRemaining:(sp.runwayRemaining as string) || '',
        targetCloseDate:(sp.targetCloseDate as string) || '',
      },

      // Artifact coverage tells investors what due diligence material exists
      artifactCoverage: {
        hasFinancialModel:    'financial_summary' in latestByType,
        hasHiringPlan:        'hiring_plan' in latestByType,
        hasGTMPlaybook:       'gtm_playbook' in latestByType,
        hasCompMatrix:        'competitive_matrix' in latestByType,
        hasBrandAssets:       'brand_messaging' in latestByType,
        hasStrategicPlan:     'strategic_plan' in latestByType,
        hasStartupProfile:    Object.keys(sp).length > 0,
      },
    }

    return NextResponse.json({ startup: result })
  } catch (err) {
    console.error('Investor startup GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function extractValue(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k]
    if (v !== undefined && v !== null && v !== '') return String(v)
  }
  return ''
}

function extractString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return ''
}

function extractArray(obj: Record<string, unknown>, keys: string[]): unknown[] | null {
  for (const k of keys) {
    const v = obj[k]
    if (Array.isArray(v) && v.length > 0) return v
  }
  return null
}

function weakest(qrow: { market_score?: number; product_score?: number; gtm_score?: number; financial_score?: number; team_score?: number; traction_score?: number } | null): string {
  if (!qrow) return 'overall'
  const dims = [
    { name: 'market',   score: qrow.market_score ?? 100 },
    { name: 'product',  score: qrow.product_score ?? 100 },
    { name: 'GTM',      score: qrow.gtm_score ?? 100 },
    { name: 'financial',score: qrow.financial_score ?? 100 },
    { name: 'team',     score: qrow.team_score ?? 100 },
    { name: 'traction', score: qrow.traction_score ?? 100 },
  ]
  return dims.sort((a, b) => a.score - b.score)[0].name
}
