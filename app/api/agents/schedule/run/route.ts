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

  return NextResponse.json({ dispatched, failed, total: actions.length })
}

// Allow Vercel Cron GET for health check
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json({ ok: true })
}
