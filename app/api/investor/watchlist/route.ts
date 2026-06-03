/**
 * Investor watchlist — watch founders and get notified when they hit a Q-Score threshold.
 *
 * GET  /api/investor/watchlist         → list all watched founders with their current Q-Score
 * POST /api/investor/watchlist         → add founder to watchlist (body: { founderId, thresholdQscore? })
 * DELETE /api/investor/watchlist       → remove founder from watchlist (body: { founderId })
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const admin = createAdminClient()

    const { data: watchlist } = await admin
      .from('investor_watchlist')
      .select('id, founder_id, threshold_qscore, notified_at, created_at')
      .eq('investor_id', auth.user.id)
      .order('created_at', { ascending: false })

    if (!watchlist || watchlist.length === 0) return NextResponse.json({ watchlist: [] })

    const founderIds = watchlist.map((w: { founder_id: string }) => w.founder_id)

    // Enrich with founder profile + current Q-Score
    const [{ data: profiles }, { data: scores }] = await Promise.all([
      admin.from('founder_profiles').select('user_id, startup_name, full_name, industry, stage').in('user_id', founderIds),
      admin.from('qscore_history').select('user_id, overall_score, calculated_at').in('user_id', founderIds).order('calculated_at', { ascending: false }).limit(founderIds.length * 3),
    ])

    const profileMap = new Map((profiles ?? []).map((p: Record<string, unknown>) => [p.user_id as string, p]))
    const scoreMap   = new Map<string, number>()
    for (const s of (scores ?? []) as { user_id: string; overall_score: number }[]) {
      if (!scoreMap.has(s.user_id)) scoreMap.set(s.user_id, s.overall_score)
    }

    const enriched = watchlist.map((w: Record<string, unknown>) => {
      const p = profileMap.get(w.founder_id as string)
      return {
        ...w,
        founderName:  (p?.full_name  as string) ?? 'Unknown',
        startupName:  (p?.startup_name as string) ?? 'Unknown',
        industry:     (p?.industry   as string) ?? '',
        stage:        (p?.stage      as string) ?? '',
        currentScore: scoreMap.get(w.founder_id as string) ?? 0,
        thresholdMet: w.threshold_qscore !== null &&
          (scoreMap.get(w.founder_id as string) ?? 0) >= (w.threshold_qscore as number),
      }
    })

    return NextResponse.json({ watchlist: enriched })
  } catch (err) {
    log.error('GET /api/investor/watchlist', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const admin = createAdminClient()

    const { founderId, thresholdQscore } = await request.json() as { founderId: string; thresholdQscore?: number }
    if (!founderId) return NextResponse.json({ error: 'founderId required' }, { status: 400 })

    const { data, error } = await admin
      .from('investor_watchlist')
      .upsert({
        investor_id:       auth.user.id,
        founder_id:        founderId,
        threshold_qscore:  thresholdQscore ?? null,
        notified_at:       null, // reset notification on re-watch
      }, { onConflict: 'investor_id,founder_id' })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id: data?.id, watching: true }, { status: 201 })
  } catch (err) {
    log.error('POST /api/investor/watchlist', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const admin = createAdminClient()

    const { founderId } = await request.json() as { founderId: string }
    if (!founderId) return NextResponse.json({ error: 'founderId required' }, { status: 400 })

    await admin
      .from('investor_watchlist')
      .delete()
      .eq('investor_id', auth.user.id)
      .eq('founder_id', founderId)

    return NextResponse.json({ watching: false })
  } catch (err) {
    log.error('DELETE /api/investor/watchlist', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
