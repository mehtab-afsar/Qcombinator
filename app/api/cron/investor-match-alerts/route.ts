import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

/**
 * GET /api/cron/investor-match-alerts
 * Runs daily. Finds founders who completed their profile builder in the last 24h,
 * matches them against investor criteria (sector + stage), and sends a
 * deal_flow notification to each matching investor.
 *
 * Requires CRON_SECRET in Authorization: Bearer header.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getAdminClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Founders who just completed profile builder
  const { data: newFounders, error: founderErr } = await supabase
    .from('founder_profiles')
    .select('user_id, full_name, startup_name, industry, stage, overall_score:qscore_history(overall_score)')
    .eq('profile_builder_completed', true)
    .gte('profile_builder_completed_at', since)
    .limit(200)

  if (founderErr) {
    log.error('[investor-match-alerts] founder fetch failed:', founderErr)
    return NextResponse.json({ error: founderErr.message }, { status: 500 })
  }

  if (!newFounders?.length) {
    return NextResponse.json({ notified: 0, message: 'No new founders in last 24h' })
  }

  // Fetch all investors with their criteria
  const { data: investors, error: invErr } = await supabase
    .from('investor_profiles')
    .select('user_id, firm_name, sectors, stages')
    .eq('onboarding_completed', true)
    .limit(2000)

  if (invErr) {
    log.error('[investor-match-alerts] investor fetch failed:', invErr)
    return NextResponse.json({ error: invErr.message }, { status: 500 })
  }

  let notified = 0

  for (const founder of newFounders) {
    const founderSector = (founder.industry ?? '').toLowerCase().replace(/[-\s]/g, '_')
    const founderStage  = (founder.stage ?? '').toLowerCase()

    type InvestorRow = { user_id: string; firm_name: string | null; sectors: string[] | null; stages: string[] | null }
    const matchingInvestors = (investors as InvestorRow[] ?? []).filter(inv => {
      const sectorMatch = !inv.sectors?.length ||
        inv.sectors.some((s: string) => founderSector.includes(s.toLowerCase().replace(/[-\s]/g, '_')) ||
          s.toLowerCase().replace(/[-\s]/g, '_').includes(founderSector))
      const stageMatch = !inv.stages?.length ||
        inv.stages.some((s: string) => founderStage.includes(s.toLowerCase().replace(/[-\s]/g, '_')) ||
          s.toLowerCase().replace(/[-\s]/g, '_').includes(founderStage))
      return sectorMatch && stageMatch
    })

    if (!matchingInvestors.length) continue

    // Batch-insert notifications for all matching investors
    const notifications = matchingInvestors.map((inv: InvestorRow) => ({
      user_id:  inv.user_id,
      type:     'deal_flow',
      title:    `New founder match: ${founder.startup_name ?? founder.full_name}`,
      message:  `A ${founder.stage ?? 'early-stage'} ${founder.industry ?? ''} startup just completed their profile and matches your investment criteria.`,
      metadata: {
        founder_id: founder.user_id,
        sector:     founder.industry,
        stage:      founder.stage,
      },
    }))

    const { error: insertErr } = await supabase.from('notifications').insert(notifications)
    if (insertErr) {
      log.warn('[investor-match-alerts] notification insert failed:', insertErr.message)
    } else {
      notified += matchingInvestors.length
    }
  }

  log.info(`[investor-match-alerts] sent ${notified} deal flow notifications for ${newFounders.length} new founders`)
  return NextResponse.json({ notified, founders: newFounders.length })
}
