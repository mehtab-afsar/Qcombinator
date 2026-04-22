import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

// DELETE /api/feed/[id] — delete own post
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id: postId } = await params
    const supabase = await createClient()

    // RLS "delete own" policy enforces ownership — extra check for clear error message
    const { data: post } = await supabase
      .from('feed_posts')
      .select('user_id')
      .eq('id', postId)
      .maybeSingle()

    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    if (post.user_id !== auth.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await supabase.from('feed_posts').delete().eq('id', postId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('DELETE /api/feed/[id]', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
