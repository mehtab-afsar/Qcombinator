import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('profile_builder_data')
      .select('section, extracted_fields, confidence_map, completion_score, completed_at, raw_conversation, uploaded_documents')
      .eq('user_id', user.id)
      .order('section', { ascending: true })

    if (error) {
      log.error('GET /api/profile-builder/draft', { error })
      return NextResponse.json({ error: 'Failed to load draft' }, { status: 500 })
    }

    // Map to keyed object { [section]: data }
    const sections: Record<number, unknown> = {}
    const uploadedFilesMap: Record<string, number> = {}  // filename → fields count (deduped)
    for (const row of data ?? []) {
      sections[row.section] = {
        extractedFields: row.extracted_fields ?? {},
        confidenceMap: row.confidence_map ?? {},
        completionScore: row.completion_score ?? 0,
        completedAt: row.completed_at,
        hasConversation: !!row.raw_conversation,
        rawConversation: row.raw_conversation ?? '',
      }
      for (const doc of (row.uploaded_documents ?? []) as Array<{ filename: string; fields: number }>) {
        if (doc.filename && !(doc.filename in uploadedFilesMap)) {
          uploadedFilesMap[doc.filename] = doc.fields ?? 0
        }
      }
    }

    const uploadedFiles = Object.entries(uploadedFilesMap).map(([name, fields]) => ({ name, fields }))

    return NextResponse.json({ sections, totalSections: Object.keys(sections).length, uploadedFiles })
  } catch (err) {
    log.error('GET /api/profile-builder/draft', { err })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
