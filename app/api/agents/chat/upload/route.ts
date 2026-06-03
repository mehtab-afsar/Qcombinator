import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseDocument } from '@/lib/profile-builder/document-parser'
import { getAdminClient } from '@/lib/supabase/server'
import { embedAndStoreDocument } from '@/lib/agents/document-rag'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/rtf',
  'text/rtf',
  'application/msword',
  'application/vnd.ms-powerpoint',
  'application/vnd.oasis.opendocument.text',
  'image/png',
  'image/jpeg',
  'image/webp',
])

const ALLOWED_EXTS = new Set([
  '.pdf', '.pptx', '.docx', '.xlsx', '.csv',
  '.txt', '.rtf', '.doc', '.ppt', '.odt',
  '.png', '.jpg', '.jpeg', '.webp',
])

// Parsed text is prepended to the user message, which has an 8,000-char cap in the chat route.
// Leave ~2,000 chars for the user's actual message.
const MAX_PARSED_CHARS = 6000

export async function POST(req: NextRequest) {
  const auth = await verifyAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit. Please compress or use a smaller excerpt.' }, { status: 400 })
  }

  const ext = ('.' + (file.name.split('.').pop() ?? '').toLowerCase())
  const mimeType = file.type || 'application/octet-stream'

  if (!ALLOWED_TYPES.has(mimeType) && !ALLOWED_EXTS.has(ext)) {
    return NextResponse.json({
      error: 'Unsupported file type. Accepted: PDF, DOCX, XLSX, PPTX, CSV, TXT, RTF, PNG, JPG, WEBP.',
    }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await parseDocument(buffer, file.name, mimeType)

    const truncated = result.text.length > MAX_PARSED_CHARS
    const parsedText = truncated ? result.text.slice(0, MAX_PARSED_CHARS) : result.text

    // Fire-and-forget: embed full parsed text and store for future RAG queries.
    // Uses full text (not truncated) so the vector index covers the whole document.
    // Only runs when VOYAGE_API_KEY is configured.
    if (process.env.VOYAGE_API_KEY && result.text.length > 20) {
      const supabase = await getAdminClient()
      void embedAndStoreDocument(auth.user.id, file.name, result.text, supabase)
        .catch(e => console.error('[chat/upload] embed failed:', e))
    }

    return NextResponse.json({
      filename: file.name,
      mimeType,
      parsedText,
      confidence: result.confidence,
      truncated,
      charCount: result.text.length,
    })
  } catch (err) {
    console.error('[chat/upload] parse error:', err)
    return NextResponse.json({ error: 'Failed to parse file. The document may be corrupted or encrypted.' }, { status: 500 })
  }
}
