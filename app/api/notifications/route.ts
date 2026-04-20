import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody, markReadSchema } from '@/lib/api/validate'

const ACTION_ICONS: Record<string, string> = {
  price_change_alert:   '🔔',
  runway_alert:         '⚠️',
  runway_cuts_analysis: '✂️',
  deal_reminder:        '🤝',
  investor_update_sent: '📧',
  outreach_sent:        '📣',
  site_deployed:        '🌐',
  blog_published:       '✍️',
  nda_generated:        '📄',
  safe_generated:       '📋',
  term_sheet_analysis:  '⚖️',
  data_room_generated:  '🗂️',
  weekly_standup:       '📊',
  offer_letter_sent:    '📩',
  survey_created:       '📝',
  fake_door_deployed:   '🚪',
  agent_complete:       '🤖',
  investor_view:        '👁️',
  qscore_update:        '📈',
  message:              '💬',
}

const NOTABLE_ACTIVITY = [
  'price_change_alert', 'runway_alert', 'runway_cuts_analysis', 'deal_reminder',
  'investor_update_sent', 'outreach_sent', 'site_deployed', 'blog_published',
  'nda_generated', 'safe_generated', 'term_sheet_analysis', 'data_room_generated',
  'weekly_standup', 'offer_letter_sent', 'survey_created', 'fake_door_deployed',
]

// GET /api/notifications — returns notifications from the new table, falls back to agent_activity
export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ notifications: [], total: 0 })
    const { user } = auth
    const supabase = await createClient()

    // Try notifications table first
    const { data: notifRows } = await supabase
      .from('notifications')
      .select('id, type, title, body, metadata, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (notifRows && notifRows.length > 0) {
      const notifications = notifRows.map(row => ({
        id:          row.id as string,
        icon:        ACTION_ICONS[row.type as string] ?? '🤖',
        agentId:     (row.metadata as Record<string, unknown>)?.agent_id as string ?? '',
        action_type: row.type as string,
        title:       row.title as string,
        time:        row.created_at as string,
        read:        row.read as boolean,
        metadata:    row.metadata as Record<string, unknown>,
      }))
      return NextResponse.json({ notifications, total: notifications.length })
    }

    // Fallback: derive from agent_activity (legacy path while notifications table is empty)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: activityRows } = await supabase
      .from('agent_activity')
      .select('id, agent_id, action_type, description, created_at, metadata')
      .eq('user_id', user.id)
      .in('action_type', NOTABLE_ACTIVITY)
      .gt('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20)

    const notifications = (activityRows ?? []).map(row => ({
      id:          row.id as string,
      icon:        ACTION_ICONS[row.action_type as string] ?? '🤖',
      agentId:     row.agent_id as string,
      action_type: row.action_type as string,
      title:       row.description as string,
      time:        row.created_at as string,
      read:        false,
      metadata:    row.metadata as Record<string, unknown> | null,
    }))

    return NextResponse.json({ notifications, total: notifications.length })
  } catch {
    return NextResponse.json({ notifications: [], total: 0 })
  }
}

// PATCH /api/notifications — mark notification ids as read
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
      .update({ read: true })
      .in('id', ids)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
