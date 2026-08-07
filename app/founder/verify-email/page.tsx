'use client'

/**
 * The blocking screen for an unconfirmed email/password sign-up.
 *
 * ⚠️ WHY THIS EXISTS. A founder who signed up with a stranger's email used to get exactly the
 * same dashboard, exactly the same access, as one who'd verified. middleware.ts now redirects
 * any founder whose Supabase user has no `email_confirmed_at` (lib/auth/email-confirmed.ts)
 * here, for every /founder/** page — this is the destination, not a decoration. Confirmation
 * itself is Supabase's own native email flow now — /api/auth/email-status reports status,
 * /api/auth/resend-confirmation triggers Supabase's built-in resend.
 *
 * A Google sign-up never sees this page: Google already verified the address, so
 * /auth/callback sets email_confirmed_at immediately and middleware's gate passes straight
 * through.
 *
 * Polls status rather than requiring a manual refresh — clicking the link in the confirmation
 * email opens a NEW tab, so this tab needs to notice on its own that it's now unblocked.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { O, FONT_SERIF } from '@/features/onboarding/theme'

const POLL_MS = 4_000

export default function VerifyEmailPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    async function check() {
      try {
        const res = await fetch('/api/auth/email-status')
        if (!res.ok) return
        const data: { emailConfirmed?: boolean; email?: string | null } = await res.json()
        if (!live) return
        if (data.email) setEmail(data.email)
        if (data.emailConfirmed) {
          // Confirmed in another tab — middleware's gate now passes; move on.
          router.replace('/founder/getting-started')
          return
        }
      } finally {
        if (live) setChecking(false)
      }
    }
    void check()
    const interval = setInterval(check, POLL_MS)
    return () => { live = false; clearInterval(interval) }
  }, [router])

  async function handleResend() {
    if (sending || sent) return
    setSending(true); setError('')
    try {
      const res = await fetch('/api/auth/resend-confirmation', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Could not resend the email. Try again shortly.')
        return
      }
      setSent(true)
      setTimeout(() => setSent(false), 15_000) // allow another resend after a cooldown
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setSending(false)
    }
  }

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: O.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{
        width: '100%', maxWidth: 440, background: O.card, border: `1px solid ${O.bdr}`,
        borderRadius: 16, padding: '44px 36px', textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', background: O.alpha(O.ink, 0.06),
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px',
        }}>
          <MailCheck size={26} color={O.ink} />
        </div>

        <h1 style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 480, color: O.ink, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
          Check your email
        </h1>

        <p style={{ fontSize: 14, color: O.muted, lineHeight: 1.7, margin: '0 0 6px' }}>
          {checking
            ? 'Confirming your account…'
            : <>We sent a confirmation link to {email && <strong style={{ color: O.ink }}>{email}</strong>}. Click it to unlock your account.</>}
        </p>
        <p style={{ fontSize: 13, color: O.muted, lineHeight: 1.6, margin: '0 0 28px' }}>
          This page updates on its own — no need to come back and refresh.
        </p>

        {error && <p style={{ fontSize: 13, color: O.red, marginBottom: 16 }}>{error}</p>}

        <button
          onClick={handleResend}
          disabled={sending || sent}
          style={{
            width: '100%', height: 46, borderRadius: 12, border: 'none',
            background: sent ? '#F0FDF4' : O.ink, color: sent ? '#16A34A' : '#fff',
            fontSize: 14, fontWeight: 600, cursor: sending || sent ? 'default' : 'pointer',
          }}
        >
          {sent ? '✓ Sent — check your inbox' : sending ? 'Sending…' : 'Resend confirmation email'}
        </button>

        <button
          onClick={handleSignOut}
          style={{
            marginTop: 16, background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: O.muted, textDecoration: 'underline',
          }}
        >
          Wrong email? Sign out and start over
        </button>
      </div>
    </div>
  )
}
