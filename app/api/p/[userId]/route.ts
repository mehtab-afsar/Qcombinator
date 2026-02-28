import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/p/:userId
// Public portfolio endpoint — no auth required.
// Returns a founder's public-facing profile, Q-Score, and deliverables summary.

const PUBLIC_ARTIFACT_TYPES = [
  'icp_document', 'outreach_sequence', 'battle_card', 'gtm_playbook',
  'sales_script', 'brand_messaging', 'financial_summary', 'legal_checklist',
  'hiring_plan', 'pmf_survey', 'competitive_matrix', 'strategic_plan',
]

const ARTIFACT_LABELS: Record<string, string> = {
  icp_document:       'ICP Document',
  outreach_sequence:  'Outreach Sequence',
  battle_card:        'Battle Card',
  gtm_playbook:       'GTM Playbook',
  sales_script:       'Sales Script',
  brand_messaging:    'Brand Messaging',
  financial_summary:  'Financial Summary',
  legal_checklist:    'Legal Checklist',
  hiring_plan:        'Hiring Plan',
  pmf_survey:         'PMF Research Kit',
  competitive_matrix: 'Competitive Analysis',
  strategic_plan:     'Strategic Plan',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Use service role client for public access (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    )

    // Fetch all data in parallel
    const [
      { data: profile },
      { data: qrow },
      { data: artifacts },
      { data: evidence },
    ] = await Promise.all([
      supabase
        .from('founder_profiles')
        .select('full_name, startup_name, industry, stage, tagline, location, website, linkedin_url, onboarding_completed, startup_profile_data, description')
        .eq('user_id', userId)
        .single(),

      supabase
        .from('qscore_history')
        .select('overall_score, percentile, grade, market_score, product_score, gtm_score, financial_score, team_score, traction_score, calculated_at')
        .eq('user_id', userId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from('agent_artifacts')
        .select('artifact_type, title, created_at')
        .eq('user_id', userId)
        .in('artifact_type', PUBLIC_ARTIFACT_TYPES)
        .order('created_at', { ascending: false }),

      supabase
        .from('score_evidence')
        .select('id, dimension, evidence_type, status')
        .eq('user_id', userId)
        .eq('status', 'verified'),
    ])

    if (!profile || !profile.onboarding_completed) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })
    }

    // Log view (fire-and-forget — service role bypasses RLS)
    const viewerIp = _req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? _req.headers.get('x-real-ip')
      ?? null
    void (async () => {
      try {
        await supabase.from('portfolio_views').insert({
          founder_id: userId,
          viewer_ip:  viewerIp,
          referrer:   _req.headers.get('referer') ?? null,
        })
      } catch { /* non-fatal */ }
    })()

    // Deduplicate artifacts — one per type (most recent)
    const seenTypes = new Set<string>()
    const deliverables: { type: string; label: string; title: string; createdAt: string }[] = []
    for (const art of artifacts ?? []) {
      if (!seenTypes.has(art.artifact_type)) {
        seenTypes.add(art.artifact_type)
        deliverables.push({
          type:      art.artifact_type,
          label:     ARTIFACT_LABELS[art.artifact_type] ?? art.artifact_type,
          title:     art.title,
          createdAt: art.created_at,
        })
      }
    }

    // Extract rich startup profile fields
    const sp = (profile.startup_profile_data ?? {}) as Record<string, unknown>
    const about = profile.description
      || (sp.problemStatement as string)
      || null
    const solution = (sp.solution as string) || null
    const moat     = (sp.moat     as string) || null
    const whyNow   = (sp.whyNow   as string) || null
    const tamSize  = (sp.tamSize  as string) || null
    const businessModel = (sp.businessModel as string) || null
    const raisingAmount = (sp.raisingAmount as string) || (profile as Record<string,unknown>).funding as string || null
    const advisors  = (sp.advisors  as string[] | undefined) ?? []
    const keyHires  = (sp.keyHires  as string[] | undefined) ?? []
    const hasStartupProfile = Object.keys(sp).length > 0

    const scoreBreakdown = qrow ? {
      market:     qrow.market_score    ?? 0,
      product:    qrow.product_score   ?? 0,
      goToMarket: qrow.gtm_score       ?? 0,
      financial:  qrow.financial_score ?? 0,
      team:       qrow.team_score      ?? 0,
      traction:   qrow.traction_score  ?? 0,
    } : null

    return NextResponse.json({
      founder: {
        name:         profile.full_name,
        startupName:  profile.startup_name,
        tagline:      profile.tagline || (sp.oneLiner as string) || null,
        industry:     profile.industry,
        stage:        profile.stage,
        location:     profile.location,
        websiteUrl:   profile.website || (sp.website as string) || null,
        linkedinUrl:  profile.linkedin_url,
        foundedYear:  (sp.foundedDate as string) ? new Date(sp.foundedDate as string).getFullYear() : null,
        teamSize:     (sp.teamSize as string) || null,
      },
      qScore: qrow ? {
        overall:     qrow.overall_score,
        percentile:  qrow.percentile,
        grade:       qrow.grade,
        breakdown:   scoreBreakdown,
        calculatedAt: qrow.calculated_at,
      } : null,
      deliverables,
      verifiedEvidenceCount: evidence?.length ?? 0,
      // Rich startup profile — shown in About section of public portfolio
      startupProfile: hasStartupProfile ? {
        about,
        solution,
        moat,
        whyNow,
        tamSize,
        businessModel,
        raisingAmount,
        advisors,
        keyHires,
      } : null,
    })
  } catch (err) {
    console.error('Public portfolio error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
