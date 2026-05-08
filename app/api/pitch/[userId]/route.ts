import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/pitch/:userId
 *
 * PUBLIC route — no auth required. Returns a startup's shareable pitch data
 * for the investor-facing pitch profile page at /pitch/:userId.
 *
 * Pulls from:
 *  - founder_profiles (company name, tagline, sector, stage, etc.)
 *  - qscore_history   (latest Q-Score + P1–P6 sub-scores)
 *  - agent_artifacts  (ICP, positioning, financial summary, strategic plan)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const supabase = createAdminClient()

  // ── 1. Load founder profile ──────────────────────────────────────────────
  const { data: rawProfile } = await supabase
    .from('founder_profiles')
    .select('full_name, startup_name, industry, stage, tagline, location, website, team_size, funding, description, startup_profile_data, avatar_url, company_logo_url')
    .eq('user_id', userId)
    .maybeSingle()

  if (!rawProfile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Normalise startup_profile_data (extra fields from the 6-step profile builder)
  const sp = (rawProfile.startup_profile_data ?? {}) as Record<string, unknown>

  const profile = {
    companyName:  rawProfile.startup_name || (sp.companyName as string) || rawProfile.full_name || '',
    founderName:  rawProfile.full_name || '',
    tagline:      rawProfile.tagline || (sp.oneLiner as string) || '',
    sector:       rawProfile.industry || (sp.industry as string) || 'Technology',
    stage:        rawProfile.stage || (sp.stage as string) || '',
    website:      rawProfile.website || (sp.website as string) || '',
    location:     rawProfile.location || (sp.location as string) || '',
    teamSize:     rawProfile.team_size || (sp.teamSize as string) || '',
    fundingGoal:  rawProfile.funding || (sp.raisingAmount as string) || '',
    description:  rawProfile.description || (sp.problemStatement as string) || '',
    avatarUrl:    (rawProfile as Record<string, unknown>).avatar_url as string | null ?? null,
    companyLogoUrl: (rawProfile as Record<string, unknown>).company_logo_url as string | null ?? null,
    // Extra profile-builder fields useful for the pitch page
    solution:     (sp.solution as string) || '',
    whyNow:       (sp.whyNow as string) || '',
    moat:         (sp.moat as string) || '',
    tamSize:      (sp.tamSize as string) || '',
    businessModel:(sp.businessModel as string) || '',
  }

  // ── 2. Load latest Q-Score ────────────────────────────────────────────────
  const { data: qrow } = await supabase
    .from('qscore_history')
    .select('overall_score, percentile, grade, p1_score, p2_score, p3_score, p4_score, p5_score, p6_score, calculated_at, score_version, iq_breakdown')
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Build sub-score breakdown (P1–P6 labels matching the existing investor detail page)
  type IQParam = { id: string; name: string; weight: number; averageScore: number }
  const iqBreakdown = qrow?.iq_breakdown as { parameters?: IQParam[] } | null
  const iqParams: IQParam[] = (qrow?.score_version === 'v2_q' && Array.isArray(iqBreakdown?.parameters))
    ? (iqBreakdown!.parameters as IQParam[])
    : []

  const qscoreBreakdown = qrow
    ? (iqParams.length > 0
      ? iqParams.map(p => ({
          label: p.name,
          score: Math.round(p.averageScore * 20), // 0–5 → 0–100
          weight: Math.round(p.weight * 100),
        }))
      : [
          { label: 'Market Readiness',   score: qrow.p1_score ?? 0, weight: 20 },
          { label: 'Market Potential',   score: qrow.p2_score ?? 0, weight: 17 },
          { label: 'IP & Defensibility', score: qrow.p3_score ?? 0, weight: 18 },
          { label: 'Founder & Team',     score: qrow.p4_score ?? 0, weight: 15 },
          { label: 'Structural Impact',  score: qrow.p5_score ?? 0, weight: 12 },
          { label: 'Financials',         score: qrow.p6_score ?? 0, weight: 18 },
        ])
    : []

  const qscore = qrow
    ? {
        score:      qrow.overall_score ?? 0,
        percentile: qrow.percentile ?? 0,
        grade:      qrow.grade ?? '—',
        calculatedAt: qrow.calculated_at,
        breakdown:  qscoreBreakdown,
      }
    : null

  // ── 3. Load key agent artifacts ───────────────────────────────────────────
  const { data: artifactRows } = await supabase
    .from('agent_artifacts')
    .select('artifact_type, title, content, created_at')
    .eq('user_id', userId)
    .in('artifact_type', ['icp_document', 'positioning_messaging', 'financial_summary', 'strategic_plan', 'buyer_journey', 'gtm_playbook'])
    .order('created_at', { ascending: false })

  // Deduplicate — keep the most-recent artifact per type
  const latestByType: Record<string, { title: string; content: Record<string, unknown>; created_at: string }> = {}
  for (const a of artifactRows ?? []) {
    if (!latestByType[a.artifact_type]) {
      latestByType[a.artifact_type] = {
        title:      a.title as string,
        content:    a.content as Record<string, unknown>,
        created_at: a.created_at as string,
      }
    }
  }

  return NextResponse.json({
    profile,
    qscore,
    artifacts: latestByType,
    generatedAt: new Date().toISOString(),
  })
}
