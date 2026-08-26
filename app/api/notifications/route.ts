import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody, markReadSchema } from '@/lib/api/validate'
import { log } from '@/lib/logger'

const NOTABLE_ACTIVITY = [
  'price_change_alert', 'runway_alert', 'runway_cuts_analysis', 'deal_reminder',
  'investor_update_sent', 'outreach_sent', 'site_deployed', 'blog_published',
  'nda_generated', 'safe_generated', 'term_sheet_analysis', 'data_room_generated',
  'weekly_standup', 'offer_letter_sent', 'survey_created', 'fake_door_deployed',
]

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 20

// GET /api/notifications — returns notifications from the new table, falls back to agent_activity.
// Backward compatible: called with no query params (the bell dropdown's shape) it behaves exactly
// as before — top 20, newest first. `before` (an ISO timestamp) pages further back in time;
// `unreadOnly` filters server-side rather than making the client re-filter an already-short page.
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth
    const supabase = await createClient()

    const url = new URL(req.url)
    const before = url.searchParams.get('before')
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true'
    const requestedLimit = Number(url.searchParams.get('limit'))
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_LIMIT) : DEFAULT_LIMIT

    let query = supabase
      .from('notifications')
      .select('id, type, title, body, metadata, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) query = query.lt('created_at', before)
    if (unreadOnly) query = query.eq('read', false)

    const { data: notifRows } = await query

    if (notifRows && notifRows.length > 0) {
      const notifications = notifRows.map(row => ({
        id:          row.id as string,
        agentId:     (row.metadata as Record<string, unknown>)?.agent_id as string ?? '',
        action_type: row.type as string,
        title:       row.title as string,
        body:        row.body as string | undefined,
        time:        row.created_at as string,
        read:        row.read as boolean,
        metadata:    row.metadata as Record<string, unknown>,
      }))
      // Present iff this page came back full — the client's cue that there may be more.
      const nextCursor = notifications.length === limit ? notifications[notifications.length - 1].time : null
      return NextResponse.json({ notifications, total: notifications.length, nextCursor })
    }

    // Fallback: derive from agent_activity (legacy path while notifications table is empty) —
    // only on an unfiltered first page. It's a 30-day stopgap for founders who signed up before
    // the notifications table existed, not something worth paginating in its own right.
    if (!before && !unreadOnly) {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: activityRows } = await supabase
        .from('agent_activity')
        .select('id, agent_id, action_type, description, created_at, metadata')
        .eq('user_id', user.id)
        .in('action_type', NOTABLE_ACTIVITY)
        .gt('created_at', since)
        .order('created_at', { ascending: false })
        .limit(limit)

      const notifications = (activityRows ?? []).map(row => ({
        id:          row.id as string,
        agentId:     row.agent_id as string,
        action_type: row.action_type as string,
        title:       row.description as string,
        time:        row.created_at as string,
        read:        false,
        metadata:    row.metadata as Record<string, unknown> | null,
      }))

      return NextResponse.json({ notifications, total: notifications.length, nextCursor: null })
    }

    return NextResponse.json({ notifications: [], total: 0, nextCursor: null })
  } catch (err) {
    log.error('GET /api/notifications', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/notifications — mark notification ids as read (one id or many; the founder/investor
// notification hooks call this identically for a single-row click and a bulk "mark all read").
export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const parsed = await parseBody(req, markReadSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { ids } = parsed.data

    const supabase = await createClient()
    await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .in('id', ids)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
