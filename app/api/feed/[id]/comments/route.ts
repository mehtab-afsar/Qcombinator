import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

// GET /api/feed/[id]/comments — public, returns all comments for a post
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id: postId } = await params
    const supabase = await createClient()

    const { data: comments, error } = await supabase
      .from('feed_comments')
      .select('id, user_id, body, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) throw error

    if (!comments || comments.length === 0) {
      return NextResponse.json({ comments: [] })
    }

    // Enrich with author data
    const userIds = [...new Set(comments.map(c => c.user_id))]
    const [{ data: founders }, { data: investors }] = await Promise.all([
      supabase.from('founder_profiles').select('user_id, full_name, startup_name, avatar_url').in('user_id', userIds),
      supabase.from('investor_profiles').select('user_id, full_name, firm_name, avatar_url').in('user_id', userIds),
    ])

    const founderMap = Object.fromEntries((founders ?? []).map(f => [f.user_id, f]))
    const investorMap = Object.fromEntries((investors ?? []).map(i => [i.user_id, i]))
    const myId = auth.user.id

    const enriched = comments.map(c => {
      const fp = founderMap[c.user_id]
      const ip = investorMap[c.user_id]
      const isInvestor = !!ip && !fp
      const name = isInvestor
        ? (ip?.full_name ?? ip?.firm_name ?? 'An Investor')
        : (fp?.startup_name ?? fp?.full_name ?? 'A Founder')
      const avatarUrl = (isInvestor ? ip?.avatar_url : fp?.avatar_url) ?? null
      return {
        id:        c.id,
        body:      c.body,
        createdAt: c.created_at,
        isOwn:     c.user_id === myId,
        author: {
          name,
          avatarUrl,
          role: isInvestor ? 'investor' : 'founder',
        },
      }
    })

    return NextResponse.json({ comments: enriched })
  } catch (err) {
    log.error('GET /api/feed/[id]/comments', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/feed/[id]/comments — create a comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id: postId } = await params
    const { body } = await req.json()

    if (!body?.trim()) return NextResponse.json({ error: 'body is required' }, { status: 400 })
    if (body.trim().length > 1000) return NextResponse.json({ error: 'Comment too long (max 1000 chars)' }, { status: 400 })

    const supabase = await createClient()

    const { data: comment, error } = await supabase
      .from('feed_comments')
      .insert({ post_id: postId, user_id: auth.user.id, body: body.trim() })
      .select('id, body, created_at, user_id')
      .single()

    if (error) throw error

    // Enrich with author info
    const [{ data: fp }, { data: ip }] = await Promise.all([
      supabase.from('founder_profiles').select('full_name, startup_name, avatar_url').eq('user_id', auth.user.id).maybeSingle(),
      supabase.from('investor_profiles').select('full_name, firm_name, avatar_url').eq('user_id', auth.user.id).maybeSingle(),
    ])
    const isInvestor = !!ip && !fp
    const name = isInvestor ? (ip?.full_name ?? 'An Investor') : (fp?.startup_name ?? fp?.full_name ?? 'A Founder')

    return NextResponse.json({
      comment: {
        id:        comment.id,
        body:      comment.body,
        createdAt: comment.created_at,
        isOwn:     true,
        author: { name, avatarUrl: (isInvestor ? ip?.avatar_url : fp?.avatar_url) ?? null, role: isInvestor ? 'investor' : 'founder' },
      }
    }, { status: 201 })
  } catch (err) {
    log.error('POST /api/feed/[id]/comments', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
