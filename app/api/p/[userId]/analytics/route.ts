import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/p/:userId/analytics
// Auth required — founders can only see their own portfolio view stats.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const ago7  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString()
    const ago30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { count: totalViews },
      { count: last7Days  },
      { count: last30Days },
      { data:  recent     },
    ] = await Promise.all([
      supabase
        .from('portfolio_views')
        .select('*', { count: 'exact', head: true })
        .eq('founder_id', userId),

      supabase
        .from('portfolio_views')
        .select('*', { count: 'exact', head: true })
        .eq('founder_id', userId)
        .gte('viewed_at', ago7),

      supabase
        .from('portfolio_views')
        .select('*', { count: 'exact', head: true })
        .eq('founder_id', userId)
        .gte('viewed_at', ago30),

      supabase
        .from('portfolio_views')
        .select('viewed_at, referrer')
        .eq('founder_id', userId)
        .order('viewed_at', { ascending: false })
        .limit(20),
    ])

    return NextResponse.json({
      totalViews: totalViews ?? 0,
      last7Days:  last7Days  ?? 0,
      last30Days: last30Days ?? 0,
      recentViews: (recent ?? []).map(r => ({
        viewedAt: r.viewed_at,
        referrer: r.referrer,
      })),
    })
  } catch (err) {
    console.error('Portfolio analytics error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
