import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

// DELETE /api/feed/[id]/comments/[commentId] — delete own comment
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { commentId } = await params
    const supabase = await createClient()

    const { data: comment } = await supabase
      .from('feed_comments')
      .select('user_id')
      .eq('id', commentId)
      .maybeSingle()

    if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    if (comment.user_id !== auth.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await supabase.from('feed_comments').delete().eq('id', commentId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('DELETE /api/feed/[id]/comments/[commentId]', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
