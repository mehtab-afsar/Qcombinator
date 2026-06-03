/**
 * GET /api/investor/dashboard
 *
 * Consolidated endpoint that replaces 4 separate API calls the investor
 * dashboard previously made on mount:
 *   /api/investor/profile       → investor_profiles (full_name, firm_name, ...)
 *   /api/investor/pipeline      → investor_pipeline rows
 *   /api/investor/messages/unread → unread count + pending connection requests
 *   /api/investor/billing/status  → subscription_tier
 *
 * Single auth check + one investor_profiles read (was 3 separate reads)
 * + parallel pipeline/messages/connections queries.
 *
 * Note: deal-flow is NOT included here — it's a heavy query with its own
 * 5-minute Cache-Control and is fetched separately by the dashboard page.
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const admin = createAdminClient()

    // ── Step 1: load investor_profiles once (covers profile + billing + demo_investor_id)
    type InvestorRow = {
      full_name: string | null; firm_name: string | null; thesis: string | null
      sectors: string[] | null; stages: string[] | null; ai_personalization: Record<string, unknown> | null
      subscription_tier: string | null; subscription_status: string | null
      subscription_current_period_end: string | null; demo_investor_id: string | null
    }
    const { data: investorRowRaw } = await admin
      .from('investor_profiles')
      .select(
        'full_name, firm_name, thesis, sectors, stages, ai_personalization,' +
        'subscription_tier, subscription_status, subscription_current_period_end,' +
        'demo_investor_id, verification_status'
      )
      .eq('user_id', user.id)
      .single()
    const investorRow = investorRowRaw as InvestorRow | null

    const demoInvestorId = investorRow?.demo_investor_id

    // ── Step 2: pipeline + unread messages + pending connections — all parallel
    const pendingOrFilter = demoInvestorId
      ? `demo_investor_id.eq.${demoInvestorId},investor_id.eq.${user.id}`
      : `investor_id.eq.${user.id}`

    const [
      { data: pipelineRows, error: pipelineErr },
      { count: unreadMessages },
      { count: pendingRequests },
    ] = await Promise.all([
      admin
        .from('investor_pipeline')
        .select('*')
        .eq('investor_user_id', user.id)
        .order('updated_at', { ascending: false }),
      admin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .is('read_at', null),
      admin
        .from('connection_requests')
        .select('id', { count: 'exact', head: true })
        .or(pendingOrFilter)
        .eq('status', 'pending'),
    ])

    if (pipelineErr) log.warn('[dashboard] pipeline query failed:', pipelineErr.message)

    // Build pipelineMap (same shape as /api/investor/pipeline)
    const pipelineMap: Record<string, { stage: string; notes: string | null; created_at: string; updated_at: string }> = {}
    for (const row of pipelineRows ?? []) {
      pipelineMap[row.founder_user_id] = {
        stage:      row.stage,
        notes:      row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    }

    return NextResponse.json(
      {
        // Matches /api/investor/profile shape
        profile: investorRow ? {
          full_name:           investorRow.full_name,
          firm_name:           investorRow.firm_name,
          thesis:              investorRow.thesis,
          sectors:             investorRow.sectors,
          stages:              investorRow.stages,
          ai_personalization:  investorRow.ai_personalization,
          verification_status: (investorRow as Record<string, unknown>).verification_status ?? 'verified',
        } : null,

        // Matches /api/investor/pipeline shape
        pipeline:    pipelineRows ?? [],
        pipelineMap,

        // Matches /api/investor/messages/unread shape
        unreadMessages:  unreadMessages  ?? 0,
        pendingRequests: pendingRequests ?? 0,

        // Matches /api/investor/billing/status shape
        subscriptionTier:   (investorRow?.subscription_tier as string)                    ?? 'free',
        subscriptionStatus: (investorRow?.subscription_status as string)                  ?? null,
        periodEnd:          (investorRow?.subscription_current_period_end as string)      ?? null,
      },
      { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } },
    )
  } catch (err) {
    log.error('GET /api/investor/dashboard', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
