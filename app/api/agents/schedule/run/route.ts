/**
 * Scheduled Actions Cron Runner
 *
 * POST /api/agents/schedule/run
 * Called by Vercel Cron every 15 minutes.
 * Protected by CRON_SECRET (Authorization: Bearer <secret>).
 *
 * Fetches pending scheduled_actions where execute_at <= now(),
 * dispatches them (email steps → outreach/send, voice → susi/vapi),
 * and marks done/failed.
 */

export const runtime = 'nodejs'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface ScheduledAction {
  id: string
  user_id: string
  agent_id: string
  action_type: string
  payload: Record<string, unknown>
  execute_at: string
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = getAdmin()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Fetch up to 50 pending actions due now
  const { data: actions, error } = await supabase
    .from('scheduled_actions')
    .select('id, user_id, agent_id, action_type, payload, execute_at')
    .eq('status', 'pending')
    .lte('execute_at', new Date().toISOString())
    .order('execute_at', { ascending: true })
    .limit(50)

  if (error) {
    log.error('[schedule/run] fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!actions || actions.length === 0) {
    return NextResponse.json({ dispatched: 0 })
  }

  // Mark all fetched as running to prevent double-dispatch
  const ids = (actions as ScheduledAction[]).map(a => a.id)
  await supabase
    .from('scheduled_actions')
    .update({ status: 'running' })
    .in('id', ids)

  let dispatched = 0
  let failed = 0

  await Promise.allSettled(
    (actions as ScheduledAction[]).map(async (action) => {
      try {
        let result: unknown = null

        if (action.action_type === 'send_email_step') {
          const res = await fetch(`${baseUrl}/api/agents/outreach/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': action.user_id },
            body: JSON.stringify({
              contacts: action.payload.contacts ?? [],
              steps: action.payload.steps ?? [],
              agentId: action.agent_id,
            }),
          })
          result = await res.json()
          if (!res.ok) throw new Error(`outreach/send ${res.status}`)

        } else if (action.action_type === 'vapi_call') {
          const res = await fetch(`${baseUrl}/api/agents/susi/vapi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': action.user_id },
            body: JSON.stringify(action.payload),
          })
          result = await res.json()
          if (!res.ok) throw new Error(`susi/vapi ${res.status}`)

        } else if (action.action_type === 'followup_check') {
          // Log to agent_activity — the agent will see it on next turn
          result = { checked: true }
        }

        await supabase
          .from('scheduled_actions')
          .update({ status: 'done', result, completed_at: new Date().toISOString() } as Record<string, unknown>)
          .eq('id', action.id)

        void supabase.from('agent_activity').insert({
          user_id: action.user_id,
          agent_id: action.agent_id,
          action_type: `scheduled_${action.action_type}`,
          description: `Scheduled action executed: ${action.action_type}`,
          metadata: { scheduled_action_id: action.id, result },
        })

        dispatched++
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        await supabase
          .from('scheduled_actions')
          .update({ status: 'failed', error: errMsg } as Record<string, unknown>)
          .eq('id', action.id)
        log.error(`[schedule/run] action ${action.id} failed:`, errMsg)
        failed++
      }
    })
  )

  // ── Pass 2: Process pending delegation_tasks (immediate priority) ──────────
  // These are inter-agent delegations created when startup state changes —
  // e.g., Felix creates a delegation to Harper when runway drops below 12 months.
  const internalSecret = process.env.INTERNAL_RUN_SECRET
  let delegationsDispatched = 0
  let delegationsFailed = 0

  if (internalSecret) {
    const { data: pendingDelegations } = await supabase
      .from('delegation_tasks')
      .select('id, to_agent, from_agent, user_id, instruction, payload_type')
      .eq('status', 'pending')
      .eq('priority', 'immediate')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(5)  // process max 5 per cron run to avoid timeout

    const delegationIds = ((pendingDelegations ?? []) as { id: string }[]).map(d => d.id)
    if (delegationIds.length > 0) {
      // Mark as running before dispatching to prevent double-execution
      await supabase.from('delegation_tasks').update({ status: 'running' }).in('id', delegationIds)

      for (const task of (pendingDelegations ?? []) as { id: string; to_agent: string; from_agent: string }[]) {
        try {
          const res = await fetch(`${baseUrl}/api/agents/process-delegation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-secret': internalSecret },
            body: JSON.stringify({ taskId: task.id }),
          })
          if (res.ok) {
            await supabase.from('delegation_tasks').update({
              status: 'complete',
              completed_at: new Date().toISOString(),
            }).eq('id', task.id)
            log.info(`[schedule/run] delegation executed: ${task.from_agent} → ${task.to_agent}`, { taskId: task.id })
            delegationsDispatched++
          } else {
            const errBody = await res.text().catch(() => res.statusText)
            await supabase.from('delegation_tasks').update({
              status: 'failed',
              error: `HTTP ${res.status}: ${errBody.slice(0, 200)}`,
            }).eq('id', task.id)
            log.error(`[schedule/run] delegation failed: ${task.from_agent} → ${task.to_agent}`, { taskId: task.id, status: res.status })
            delegationsFailed++
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          await supabase.from('delegation_tasks').update({ status: 'failed', error: errMsg }).eq('id', task.id)
          log.error(`[schedule/run] delegation dispatch error`, { taskId: task.id, err: errMsg })
          delegationsFailed++
        }
      }
    }
  }

  // ── Pass 3: Create delegations for at-risk agent goals ──────────────────
  // When an agent goal is at_risk (e.g., Felix's runway < 12 months),
  // automatically create a delegation to the relevant agent to address it.
  // last_delegation_created_at prevents creating duplicates on repeat runs.

  type GoalRow = { id: string; user_id: string; agent_id: string; reason: string; suggested_action: string | null }
  const { data: atRiskGoals } = await supabase
    .from('agent_goals')
    .select('id, user_id, agent_id, reason, suggested_action')
    .eq('status', 'at_risk')
    .is('last_delegation_created_at', null)
    .limit(10)

  const GOAL_DELEGATION_MAP: Record<string, { toAgent: string; payloadType: string; instruction: (reason: string) => string }> = {
    felix:  { toAgent: 'harper', payloadType: 'financial_constraint_changed',  instruction: (r) => `Runway is at risk: ${r}. Rebuild the hiring plan to fit current financial constraints.` },
    patel:  { toAgent: 'susi',   payloadType: 'icp_updated',                   instruction: (r) => `GTM is at risk: ${r}. Update the sales script and outreach approach.` },
    nova:   { toAgent: 'maya',   payloadType: 'pmf_signal_updated',            instruction: (r) => `PMF signal changed: ${r}. Refresh the brand messaging to align with current product-market fit.` },
    atlas:  { toAgent: 'patel',  payloadType: 'competitive_landscape_changed', instruction: (r) => `Competitive landscape changed: ${r}. Update the ICP to reflect new positioning.` },
    susi:   { toAgent: 'patel',  payloadType: 'pipeline_thin',                 instruction: (r) => `Pipeline is thin: ${r}. Audit and tighten the ICP to attract better-qualified leads.` },
    carter: { toAgent: 'susi',   payloadType: 'churn_risk_detected',           instruction: (r) => `Churn alert: ${r}. Identify at-risk accounts and draft a commercial intervention sales script.` },
    riley:  { toAgent: 'maya',   payloadType: 'growth_stalling',               instruction: (r) => `Growth stalling: ${r}. Refresh brand messaging and top-of-funnel positioning to unlock new demand.` },
    maya:   { toAgent: 'maya',   payloadType: 'brand_refresh_needed',          instruction: (r) => `Brand messaging stale: ${r}. Generate fresh brand messaging aligned with current ICP and competitive position.` },
    leo:    { toAgent: 'sage',   payloadType: 'legal_risk_escalation',         instruction: (r) => `Legal risks unresolved: ${r}. Assess impact on fundraising readiness and generate investor readiness report flagging legal blockers.` },
  }

  let goalsProcessed = 0
  for (const goal of (atRiskGoals ?? []) as GoalRow[]) {
    const mapping = GOAL_DELEGATION_MAP[goal.agent_id]
    if (!mapping) continue

    try {
      const { data: inserted } = await supabase
        .from('delegation_tasks')
        .insert({
          from_agent:   goal.agent_id,
          to_agent:     mapping.toAgent,
          user_id:      goal.user_id,
          instruction:  mapping.instruction(goal.reason ?? 'unknown reason'),
          payload_type: mapping.payloadType,
          payload_data: { reason: goal.reason, suggestedAction: goal.suggested_action },
          priority:     'immediate',
          status:       'pending',
          expires_at:   new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select('id')
        .single()

      if (inserted) {
        await supabase
          .from('agent_goals')
          .update({ last_delegation_created_at: new Date().toISOString() })
          .eq('id', goal.id)
        log.info('[schedule/run] created delegation from at-risk goal', {
          fromAgent: goal.agent_id, toAgent: mapping.toAgent, userId: goal.user_id,
        })
        goalsProcessed++
      }
    } catch (err) {
      log.warn('[schedule/run] failed to create delegation from goal', { goalId: goal.id, err: (err as Error)?.message })
    }
  }

  // ── Pass 4: Check investor watchlist thresholds ──────────────────────────
  // Alert investors when a watched founder crosses their Q-Score threshold.

  let watchlistAlerts = 0
  try {
    type WatchRow = { id: string; investor_id: string; founder_id: string; threshold_qscore: number | null }
    const { data: watchEntries } = await supabase
      .from('investor_watchlist')
      .select('id, investor_id, founder_id, threshold_qscore')
      .not('threshold_qscore', 'is', null)
      .is('notified_at', null)
      .limit(50)

    for (const entry of (watchEntries ?? []) as WatchRow[]) {
      const { data: latestScore } = await supabase
        .from('qscore_history')
        .select('overall_score')
        .eq('user_id', entry.founder_id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single()

      const score = (latestScore as { overall_score?: number } | null)?.overall_score ?? 0
      if (entry.threshold_qscore !== null && score >= entry.threshold_qscore) {
        // Create notification for the investor
        void Promise.resolve(supabase.from('notifications').insert({
          user_id:  entry.investor_id,
          type:     'qscore_update',
          title:    `A founder you're watching just reached Q-Score ${score}`,
          metadata: { founderId: entry.founder_id, score, threshold: entry.threshold_qscore },
        }))

        // Mark as notified
        await supabase.from('investor_watchlist')
          .update({ notified_at: new Date().toISOString() })
          .eq('id', entry.id)
        watchlistAlerts++
        log.info('[schedule/run] watchlist threshold alert sent', { investorId: entry.investor_id, founderId: entry.founder_id, score })
      }
    }
  } catch (err) {
    log.warn('[schedule/run] watchlist check failed', { err: (err as Error)?.message })
  }

  return NextResponse.json({
    scheduledActions: { dispatched, failed, total: actions.length },
    delegations: { dispatched: delegationsDispatched, failed: delegationsFailed },
    goalsProcessed,
    watchlistAlerts,
  })
}

// Allow Vercel Cron GET for health check
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json({ ok: true })
}
