import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

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

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const {
      section,
      rawConversation,
      extractedFields,
      confidenceMap,
      completionScore,
      uploadedDocuments,
    } = await req.json()

    if (!section) return NextResponse.json({ error: 'section required' }, { status: 400 })

    const supabase = getAdminClient()
    const isCompleted = completionScore >= 70

    const { error } = await supabase
      .from('profile_builder_data')
      .upsert({
        user_id: userId,
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
      console.error('[profile-builder/save]', error)
      return NextResponse.json({ error: 'Save failed' }, { status: 500 })
    }

    return NextResponse.json({ saved: true, section, completionScore, completed: isCompleted })
  } catch (err) {
    console.error('[profile-builder/save]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
