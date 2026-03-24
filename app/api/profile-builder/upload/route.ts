import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseDocument } from '@/lib/profile-builder/document-parser'
import { EXTRACTION_PROMPTS } from '@/lib/profile-builder/extraction-prompts'
import { callOpenRouter } from '@/lib/openrouter'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
]
const ALLOWED_EXTS = ['.pdf', '.pptx', '.xlsx', '.csv', '.png', '.jpg', '.jpeg', '.webp']

function getSupabase() {
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

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const section = parseInt(formData.get('section') as string ?? '0', 10)

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 })

    const mimeType = file.type
    const filename = file.name
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
    const isAllowedType = ALLOWED_TYPES.includes(mimeType) || ALLOWED_EXTS.includes(ext)
    if (!isAllowedType) return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = parseDocument(buffer, filename, mimeType)

    // Store file in Supabase Storage
    const supabase = getSupabase()
    const storagePath = `profile-builder/${userId}/${Date.now()}-${filename}`
    await supabase.storage.from('uploads').upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    }).catch(e => console.warn('Storage upload failed (non-blocking):', e))

    // Run LLM extraction with the section prompt
    let extractedFields: Record<string, unknown> = {}
    let confidenceMap: Record<string, number> = {}
    const sectionPrompt = EXTRACTION_PROMPTS[section]

    if (sectionPrompt && parsed.text.length > 50) {
      try {
        const raw = await callOpenRouter([
          { role: 'system', content: sectionPrompt },
          { role: 'user', content: `Document text:\n\n${parsed.text}` },
        ], { maxTokens: 1200, temperature: 0.1 })

        // Extract JSON from response
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed2 = JSON.parse(jsonMatch[0])
          const { confidence: conf, ...rest } = parsed2
          extractedFields = rest
          confidenceMap = conf ?? {}
          // Boost confidence for doc-extracted fields
          for (const key of Object.keys(confidenceMap)) {
            if (typeof confidenceMap[key] === 'number') {
              confidenceMap[key] = Math.min(1, confidenceMap[key] + 0.10)
            }
          }
        }
      } catch (e) {
        console.warn('LLM extraction failed for upload:', e)
      }
    }

    // If XLSX had structuredData, merge it
    if (parsed.structuredData) {
      Object.assign(extractedFields, { financial: { ...parsed.structuredData } })
    }

    // Save upload record
    const { data: uploadRecord } = await supabase
      .from('profile_builder_uploads')
      .insert({
        user_id: userId,
        section,
        filename,
        file_type: mimeType,
        storage_path: storagePath,
        extracted_text: parsed.text.slice(0, 8000),
        parsed_data: extractedFields,
        confidence: parsed.confidence,
      })
      .select('id')
      .single()

    // Build extraction preview for UI
    const preview: Array<{ field: string; value: unknown; confidence: number }> = []
    const flatten = (obj: unknown, prefix = '') => {
      if (typeof obj !== 'object' || obj === null) return
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        const fullKey = prefix ? `${prefix}.${k}` : k
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          flatten(v, fullKey)
        } else if (v !== null && v !== undefined) {
          preview.push({ field: fullKey, value: v, confidence: (confidenceMap[k] ?? parsed.confidence) })
        }
      }
    }
    flatten(extractedFields)

    return NextResponse.json({
      uploadId: uploadRecord?.id ?? null,
      extractedPreview: preview.slice(0, 20),
      extractedFields,
      confidenceMap,
      parsedText: parsed.text.slice(0, 500),
      summary: `Extracted ${preview.length} fields from ${filename}`,
    })
  } catch (err) {
    console.error('[profile-builder/upload]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
