import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

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

    return NextResponse.json({ saved: true, section, completionScore, completed: isCompleted })
  } catch (err) {
    log.error('POST /api/profile-builder/save', { err })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
