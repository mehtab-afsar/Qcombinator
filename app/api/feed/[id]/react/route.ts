import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

// POST /api/feed/[id]/react — toggle like on a post
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id: postId } = await params
    const supabase = await createClient()

    // Check if already liked
    const { data: existing } = await supabase
      .from('feed_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (existing) {
      // Unlike
      await supabase.from('feed_reactions').delete().eq('id', existing.id)
      return NextResponse.json({ liked: false })
    } else {
      // Like
      await supabase.from('feed_reactions').insert({ post_id: postId, user_id: auth.user.id, reaction: 'like' })
      return NextResponse.json({ liked: true })
    }
  } catch (err) {
    log.error('POST /api/feed/[id]/react', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
