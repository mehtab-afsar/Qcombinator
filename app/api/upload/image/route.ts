import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

type ImageType = 'founder-avatar' | 'investor-avatar' | 'founder-logo' | 'investor-logo'

function getBucketAndPath(imageType: ImageType, userId: string, ext: string) {
  const isAvatar = imageType.endsWith('avatar')
  const bucket   = isAvatar ? 'avatars' : 'logos'
  const filename = isAvatar ? `avatar.${ext}` : `logo.${ext}`
  return { bucket, path: `${userId}/${filename}` }
}

function getDbTarget(imageType: ImageType): { table: string; column: string } {
  switch (imageType) {
    case 'founder-avatar':  return { table: 'founder_profiles',  column: 'avatar_url' }
    case 'investor-avatar': return { table: 'investor_profiles', column: 'avatar_url' }
    case 'founder-logo':    return { table: 'founder_profiles',  column: 'company_logo_url' }
    case 'investor-logo':   return { table: 'investor_profiles', column: 'firm_logo_url' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await req.formData()
    const file      = form.get('file') as File | null
    const imageType = form.get('imageType') as ImageType | null

    if (!file)      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!imageType) return NextResponse.json({ error: 'imageType is required' }, { status: 400 })

    const validTypes: ImageType[] = ['founder-avatar', 'investor-avatar', 'founder-logo', 'investor-logo']
    if (!validTypes.includes(imageType)) {
      return NextResponse.json({ error: 'Invalid imageType' }, { status: 400 })
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP and SVG images are allowed' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File exceeds 5 MB limit' }, { status: 400 })
    }

    const ext = file.type === 'image/svg+xml' ? 'svg'
      : file.type === 'image/webp' ? 'webp'
      : file.type === 'image/png'  ? 'png'
      : 'jpg'

    const buffer = Buffer.from(await file.arrayBuffer())
    const { bucket, path } = getBucketAndPath(imageType, user.id, ext)

    // Use user-scoped client for storage upload (RLS policy allows owner to upload)
    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (uploadErr) {
      log.error('Storage upload error: ' + uploadErr.message, uploadErr)
      const msg = uploadErr.message?.toLowerCase().includes('bucket')
        ? 'Storage buckets not set up. Run migration 20260420000004 in the Supabase SQL editor to create the avatars and logos buckets.'
        : `Storage upload failed: ${uploadErr.message}`
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)

    // Add cache-bust so browsers pick up the new image even though the path is the same
    const url = `${publicUrl}?t=${Date.now()}`

    // Update DB column via admin client
    const admin = createAdminClient()
    const { table, column } = getDbTarget(imageType)
    const { error: dbErr } = await admin
      .from(table)
      .update({ [column]: url })
      .eq('user_id', user.id)

    if (dbErr) log.warn('DB update failed (non-blocking):', dbErr.message)

    // Also mirror onto auth user_metadata so sidebars can read it from useAuth()
    // without a separate profile fetch
    const metaKey = imageType === 'founder-avatar' || imageType === 'investor-avatar'
      ? 'avatar_url'
      : imageType === 'founder-logo' ? 'company_logo_url' : 'firm_logo_url'

    await supabase.auth.updateUser({ data: { [metaKey]: url } })

    return NextResponse.json({ url })
  } catch (err) {
    log.error('Image upload error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
