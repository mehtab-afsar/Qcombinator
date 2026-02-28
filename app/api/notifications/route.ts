import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/notifications
// Returns recent notable agent events as in-app notifications (last 30 days, max 20)

const NOTABLE = [
  'price_change_alert',
  'runway_alert',
  'runway_cuts_analysis',
  'deal_reminder',
  'investor_update_sent',
  'outreach_sent',
  'site_deployed',
  'blog_published',
  'nda_generated',
  'safe_generated',
  'term_sheet_analysis',
  'data_room_generated',
  'weekly_standup',
  'offer_letter_sent',
  'survey_created',
  'fake_door_deployed',
]

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
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ notifications: [], total: 0 })

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data } = await supabase
      .from('agent_activity')
      .select('id, agent_id, action_type, description, created_at, metadata')
      .eq('user_id', user.id)
      .in('action_type', NOTABLE)
      .gt('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20)

    const notifications = (data ?? []).map(row => ({
      id:          row.id,
      icon:        ACTION_ICONS[row.action_type] ?? '🤖',
      agentId:     row.agent_id as string,
      action_type: row.action_type as string,
      title:       row.description as string,
      time:        row.created_at as string,
      metadata:    row.metadata as Record<string, unknown> | null,
    }))

    return NextResponse.json({ notifications, total: notifications.length })
  } catch {
    return NextResponse.json({ notifications: [], total: 0 })
  }
}
