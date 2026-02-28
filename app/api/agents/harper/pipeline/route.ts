import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// GET /api/agents/harper/pipeline
// Returns hiring funnel analytics: sourced → applied → screened → interviewed → offered → hired
// Derived from: agent_activity (sourcing, outreach), applications (applied, scored, scorecard), agent_activity (offer sent, hired)

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()

    // Fetch all data in parallel
    const [
      { data: applications },
      { data: sourcingActivity },
      { data: outreachActivity },
      { data: scorecardActivity },
      { data: offerActivity },
      { data: hiredActivity },
    ] = await Promise.all([
      admin.from('applications').select('id, role_slug, role_title, status, score, created_at').eq('user_id', user.id),
      admin.from('agent_activity').select('created_at, metadata').eq('user_id', user.id).eq('agent_id', 'harper').eq('action_type', 'candidates_sourced'),
      admin.from('agent_activity').select('created_at, metadata').eq('user_id', user.id).eq('agent_id', 'harper').eq('action_type', 'candidate_outreach_drafted'),
      admin.from('agent_activity').select('created_at, metadata').eq('user_id', user.id).eq('agent_id', 'harper').eq('action_type', 'scorecard_generated'),
      admin.from('agent_activity').select('created_at, metadata').eq('user_id', user.id).eq('agent_id', 'harper').eq('action_type', 'offer_letter_generated'),
      admin.from('agent_activity').select('created_at, metadata').eq('user_id', user.id).eq('agent_id', 'harper').eq('action_type', 'candidate_hired'),
    ])

    const apps = applications ?? []

    // Funnel counts
    const sourced   = sourcingActivity?.reduce((acc, a) => acc + (((a.metadata as Record<string, unknown>)?.count as number) ?? 1), 0) ?? 0
    const outreached = outreachActivity?.length ?? 0
    const applied   = apps.length
    const screened  = apps.filter(a => a.score !== null && a.score !== undefined).length
    const interviewed = scorecardActivity?.length ?? 0
    const offered   = offerActivity?.length ?? 0
    const hired     = hiredActivity?.length ?? 0

    // Per-role breakdown
    const roleMap: Record<string, { applied: number; screened: number; avgScore: number | null }> = {}
    for (const app of apps) {
      const role = app.role_title ?? app.role_slug ?? 'Unknown'
      if (!roleMap[role]) roleMap[role] = { applied: 0, screened: 0, avgScore: null }
      roleMap[role].applied++
      if (app.score !== null && app.score !== undefined) {
        roleMap[role].screened++
      }
    }

    // Average score of screened candidates
    const scoredApps = apps.filter(a => a.score !== null && a.score !== undefined)
    const avgScore = scoredApps.length > 0
      ? Math.round(scoredApps.reduce((s, a) => s + (a.score ?? 0), 0) / scoredApps.length)
      : null

    // Score distribution
    const scoreDistribution = {
      strong: scoredApps.filter(a => (a.score ?? 0) >= 70).length,
      good:   scoredApps.filter(a => (a.score ?? 0) >= 50 && (a.score ?? 0) < 70).length,
      weak:   scoredApps.filter(a => (a.score ?? 0) < 50).length,
    }

    // Conversion rates between stages
    const convSourceToApply    = sourced   > 0 ? Math.round((applied    / Math.max(outreached, sourced)) * 100) : null
    const convApplyToScreen    = applied   > 0 ? Math.round((screened   / applied)    * 100) : null
    const convScreenToInterview = screened > 0 ? Math.round((interviewed / screened)   * 100) : null
    const convInterviewToOffer  = interviewed > 0 ? Math.round((offered  / interviewed) * 100) : null
    const convOfferToHire       = offered   > 0 ? Math.round((hired     / offered)     * 100) : null

    // Time to hire estimate — days between oldest application and latest offer
    const oldestApp = apps.length > 0 ? new Date(apps[apps.length - 1]?.created_at ?? Date.now()) : null
    const latestOffer = offerActivity && offerActivity.length > 0 ? new Date(offerActivity[0].created_at) : null
    const avgDaysToOffer = oldestApp && latestOffer
      ? Math.abs(Math.round((latestOffer.getTime() - oldestApp.getTime()) / 86400000))
      : null

    return NextResponse.json({
      funnel: {
        sourced,
        outreached,
        applied,
        screened,
        interviewed,
        offered,
        hired,
      },
      conversionRates: {
        sourceToApply: convSourceToApply,
        applyToScreen: convApplyToScreen,
        screenToInterview: convScreenToInterview,
        interviewToOffer: convInterviewToOffer,
        offerToHire: convOfferToHire,
      },
      avgScore,
      scoreDistribution,
      byRole: roleMap,
      avgDaysToOffer,
      totalApplications: applied,
    })
  } catch (err) {
    console.error('Harper pipeline GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
