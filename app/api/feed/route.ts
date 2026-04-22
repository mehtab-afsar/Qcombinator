import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

const PAGE_SIZE = 20

// GET /api/feed?cursor=<created_at ISO>&role=founder|investor
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor')
    const roleFilter = searchParams.get('role') // 'founder' | 'investor' | null

    const supabase = await createClient()

    let query = supabase
      .from('feed_posts')
      .select(`
        id, user_id, role, post_type, body, media_url, metadata, likes_count, comments_count, created_at,
        feed_reactions!left ( user_id )
      `)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (cursor) query = query.lt('created_at', cursor)
    if (roleFilter === 'founder' || roleFilter === 'investor') query = query.eq('role', roleFilter)

    const { data: posts, error } = await query
    if (error) throw error

    // Enrich with author names — batch fetch from both tables
    const userIds = [...new Set((posts ?? []).map(p => p.user_id))]
    const [{ data: founders }, { data: investors }] = await Promise.all([
      supabase.from('founder_profiles').select('user_id, full_name, startup_name, avatar_url').in('user_id', userIds),
      supabase.from('investor_profiles').select('user_id, full_name, firm_name, avatar_url').in('user_id', userIds),
    ])

    const founderMap = Object.fromEntries((founders ?? []).map(f => [f.user_id, f]))
    const investorMap = Object.fromEntries((investors ?? []).map(i => [i.user_id, i]))

    const myId = auth.user.id

    const enriched = (posts ?? []).map(post => {
      const founder = founderMap[post.user_id]
      const investor = investorMap[post.user_id]
      const author = post.role === 'founder'
        ? { name: founder?.full_name ?? 'Unknown Founder', subtitle: founder?.startup_name ?? '', avatarUrl: founder?.avatar_url ?? null }
        : { name: investor?.full_name ?? 'Unknown Investor', subtitle: investor?.firm_name ?? '', avatarUrl: investor?.avatar_url ?? null }

      const reactions = (post.feed_reactions as Array<{ user_id: string }> | null) ?? []
      return {
        id:            post.id,
        userId:        post.user_id,
        role:          post.role,
        postType:      post.post_type,
        body:          post.body,
        mediaUrl:      post.media_url,
        metadata:      post.metadata,
        likesCount:    post.likes_count,
        commentsCount: (post as Record<string, unknown>).comments_count as number ?? 0,
        likedByMe:     reactions.some(r => r.user_id === myId),
        createdAt:     post.created_at,
        author,
        isOwn:         post.user_id === myId,
      }
    })

    const nextCursor = enriched.length === PAGE_SIZE ? enriched[enriched.length - 1].createdAt : null
    return NextResponse.json({ posts: enriched, nextCursor })
  } catch (err) {
    log.error('GET /api/feed', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/feed
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await req.json()
    const { text, postType = 'update', mediaUrl, metadata = {} } = body as {
      text: string; postType?: string; mediaUrl?: string; metadata?: Record<string, unknown>
    }

    if (!text?.trim()) return NextResponse.json({ error: 'text is required' }, { status: 400 })
    if (text.trim().length > 2000) return NextResponse.json({ error: 'Post too long (max 2000 chars)' }, { status: 400 })

    const supabase = await createClient()

    // Determine author role
    const { data: investorProfile } = await supabase
      .from('investor_profiles')
      .select('user_id')
      .eq('user_id', auth.user.id)
      .maybeSingle()

    const role = investorProfile ? 'investor' : 'founder'

    const { data: post, error } = await supabase
      .from('feed_posts')
      .insert({
        user_id:   auth.user.id,
        role,
        post_type: postType,
        body:      text.trim(),
        media_url: mediaUrl ?? null,
        metadata,
      })
      .select('id, created_at')
      .single()

    if (error) throw error
    return NextResponse.json({ post }, { status: 201 })
  } catch (err) {
    log.error('POST /api/feed', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
