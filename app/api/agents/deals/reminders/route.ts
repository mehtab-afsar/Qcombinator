import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/agents/deals/reminders
// Returns deals that are stale (next_action_date is past or within 3 days)
// Used by Susi to surface follow-up reminders in the chat greeting
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const in3Days = new Date(now)
    in3Days.setDate(in3Days.getDate() + 3)

    // Active deals with a next_action_date at or before 3 days from now
    const { data, error } = await supabase
      .from('deals')
      .select('id, company, contact_name, stage, value, next_action, next_action_date, updated_at')
      .eq('user_id', user.id)
      .not('stage', 'in', '("won","lost")')
      .lte('next_action_date', in3Days.toISOString())
      .order('next_action_date', { ascending: true })
      .limit(5)

    if (error) {
      return NextResponse.json({ reminders: [] })
    }

    const reminders = (data ?? []).map(deal => {
      const actionDate = deal.next_action_date ? new Date(deal.next_action_date) : null
      const isOverdue = actionDate ? actionDate < now : false
      const daysOverdue = actionDate ? Math.floor((now.getTime() - actionDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
      const daysDue = actionDate ? Math.ceil((actionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0

      return {
        ...deal,
        isOverdue,
        daysOverdue: isOverdue ? daysOverdue : 0,
        daysDue: !isOverdue ? daysDue : 0,
        label: isOverdue
          ? daysOverdue === 0 ? 'Due today' : `${daysOverdue}d overdue`
          : daysDue === 0 ? 'Due today' : `Due in ${daysDue}d`,
      }
    })

    return NextResponse.json({ reminders })
  } catch (err) {
    console.error('Deal reminders error:', err)
    return NextResponse.json({ reminders: [] })
  }
}
