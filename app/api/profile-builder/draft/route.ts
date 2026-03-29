import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase.auth.getUser(token)
  return data.user?.id ?? null
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabase
      .from('profile_builder_data')
      .select('section, extracted_fields, confidence_map, completion_score, completed_at, raw_conversation, uploaded_documents')
      .eq('user_id', userId)
      .order('section', { ascending: true })

    if (error) {
      console.error('[profile-builder/draft]', error)
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
    console.error('[profile-builder/draft]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
