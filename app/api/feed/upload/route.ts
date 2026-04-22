import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!ALLOWED_MIME.includes(file.type)) return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are allowed' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Image must be under 5 MB' }, { status: 400 })

    const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg'
    const path = `${user.id}/${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const admin = createAdminClient()

    // Ensure bucket exists
    await admin.storage.createBucket('feed-media', { public: true, fileSizeLimit: MAX_SIZE, allowedMimeTypes: ALLOWED_MIME }).catch(() => {})

    const { error: uploadErr } = await admin.storage.from('feed-media').upload(path, buffer, { contentType: file.type, upsert: false })
    if (uploadErr) return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 })

    const { data: { publicUrl } } = admin.storage.from('feed-media').getPublicUrl(path)
    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('[feed/upload]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
