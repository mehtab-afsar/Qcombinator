import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'
import { postProfileSectionFeedEvent } from '@/lib/feed/auto-events'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const {
      section,
      rawConversation,
      extractedFields,
      confidenceMap,
      completionScore,
      uploadedDocuments,
    } = await req.json()

    if (!section) return NextResponse.json({ error: 'section required' }, { status: 400 })

    const supabase = createAdminClient()
    const isCompleted = completionScore >= 70

    // Check if this section was previously completed — only post a feed event on first completion
    const { data: existing } = await supabase
      .from('profile_builder_data')
      .select('completed_at')
      .eq('user_id', user.id)
      .eq('section', section)
      .maybeSingle()

    const wasAlreadyCompleted = !!(existing?.completed_at)

    const { error } = await supabase
      .from('profile_builder_data')
      .upsert({
        user_id: user.id,
        section,
        raw_conversation: rawConversation ?? null,
        extracted_fields: extractedFields ?? {},
        confidence_map: confidenceMap ?? {},
        completion_score: completionScore ?? 0,
        uploaded_documents: uploadedDocuments ?? null,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,section' })

    if (error) {
      log.error('POST /api/profile-builder/save', { error })
      return NextResponse.json({ error: 'Save failed' }, { status: 500 })
    }

    // Fire feed event only on first-time section completion
    if (isCompleted && !wasAlreadyCompleted) {
      void postProfileSectionFeedEvent(user.id, section, supabase).catch(() => {})
    }

    return NextResponse.json({ saved: true, section, completionScore, completed: isCompleted })
  } catch (err) {
    log.error('POST /api/profile-builder/save', { err })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
