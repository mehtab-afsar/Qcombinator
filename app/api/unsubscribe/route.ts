import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'
import { decodeToken, TYPE_KEY_MAP, type UnsubType } from '@/lib/email/unsubscribe-token'

// GET /api/unsubscribe?token=<base64url(userId:type)>&type=weekly|runway|alerts|all
// One-click unsubscribe link embedded in outgoing emails.

export { encodeToken } from '@/lib/email/unsubscribe-token'

const TYPE_LABEL: Record<UnsubType, string> = {
  weekly:  'weekly digest emails',
  runway:  'runway alert emails',
  alerts:  'all email notifications',
  all:     'all Edge Alpha emails',
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token')

  if (!token) {
    return new NextResponse(errorPage('Missing unsubscribe token.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const parsed = decodeToken(token)
  if (!parsed) {
    return new NextResponse(errorPage('Invalid or expired unsubscribe link.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const { userId, type } = parsed

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: profile, error: fetchErr } = await supabase
    .from('founder_profiles')
    .select('notification_preferences')
    .eq('user_id', userId)
    .single()

  let table: 'founder_profiles' | 'investor_profiles' = 'founder_profiles'
  let existingPrefs: Record<string, boolean> = (profile?.notification_preferences ?? {}) as Record<string, boolean>

  if (fetchErr || !profile) {
    const { data: inv } = await supabase
      .from('investor_profiles')
      .select('notification_preferences')
      .eq('user_id', userId)
      .single()
    if (!inv) {
      return new NextResponse(errorPage('Account not found.'), {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      })
    }
    table = 'investor_profiles'
    existingPrefs = (inv.notification_preferences ?? {}) as Record<string, boolean>
  }

  const updatedPrefs: Record<string, boolean> = { ...existingPrefs }
  for (const key of TYPE_KEY_MAP[type]) updatedPrefs[key] = false

  const { error: updateErr } = await supabase
    .from(table)
    .update({ notification_preferences: updatedPrefs })
    .eq('user_id', userId)

  if (updateErr) {
    log.error('Unsubscribe update error:', updateErr)
    return new NextResponse(errorPage('Failed to update preferences. Please try again.'), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  return new NextResponse(successPage(TYPE_LABEL[type]), {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
}

function successPage(what: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Unsubscribed — Edge Alpha</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F9F7F2;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.card{background:#fff;border:1px solid #E2DDD5;border-radius:16px;padding:40px 32px;max-width:420px;width:100%;text-align:center}.icon{width:48px;height:48px;background:#DCFCE7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:24px}h1{font-size:20px;font-weight:700;color:#18160F;margin-bottom:10px}p{font-size:14px;color:#8A867C;line-height:1.6;margin-bottom:24px}a{display:inline-block;background:#18160F;color:#F9F7F2;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600}.re{display:block;margin-top:16px;font-size:12px;color:#8A867C;text-decoration:none}
  </style>
</head>
<body><div class="card"><div class="icon">✓</div><h1>You've been unsubscribed</h1><p>You'll no longer receive ${what} from Edge Alpha.</p><a href="https://edgealpha.ai/founder/settings?tab=notifications">Manage all preferences →</a><a href="https://edgealpha.ai" class="re">Go to Edge Alpha</a></div></body></html>`
}

function errorPage(message: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Error — Edge Alpha</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F9F7F2;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.card{background:#fff;border:1px solid #E2DDD5;border-radius:16px;padding:40px 32px;max-width:420px;width:100%;text-align:center}.icon{width:48px;height:48px;background:#FEE2E2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:24px}h1{font-size:20px;font-weight:700;color:#18160F;margin-bottom:10px}p{font-size:14px;color:#8A867C;line-height:1.6;margin-bottom:24px}a{display:inline-block;background:#18160F;color:#F9F7F2;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600}
  </style>
</head>
<body><div class="card"><div class="icon">✕</div><h1>Something went wrong</h1><p>${message}</p><a href="https://edgealpha.ai/founder/settings?tab=notifications">Manage preferences manually →</a></div></body></html>`
}
