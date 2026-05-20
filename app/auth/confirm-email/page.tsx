'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

const bg   = '#F9F7F2'
const ink  = '#18160F'
const muted = '#8A867C'
const green = '#16A34A'
const red   = '#DC2626'

type Status = 'success' | 'already' | 'invalid' | 'error' | 'loading'

const COPY: Record<Status, { icon: string; heading: string; body: string; cta: string; ctaHref: string }> = {
  success: {
    icon: '✓',
    heading: 'Email confirmed',
    body: 'Your email address has been verified. You now have full access to investor matching and all Edge Alpha features.',
    cta: 'Go to dashboard →',
    ctaHref: '/founder/dashboard',
  },
  already: {
    icon: '✓',
    heading: 'Already confirmed',
    body: 'This email address was already verified. You\'re all set.',
    cta: 'Go to dashboard →',
    ctaHref: '/founder/dashboard',
  },
  invalid: {
    icon: '!',
    heading: 'Link expired or invalid',
    body: 'This confirmation link is no longer valid. It may have already been used or expired. You can request a new one from your dashboard.',
    cta: 'Back to dashboard →',
    ctaHref: '/founder/dashboard',
  },
  error: {
    icon: '!',
    heading: 'Something went wrong',
    body: 'We couldn\'t confirm your email right now. Please try again or contact support.',
    cta: 'Back to dashboard →',
    ctaHref: '/founder/dashboard',
  },
  loading: {
    icon: '…',
    heading: 'Confirming your email',
    body: 'Just a moment…',
    cta: '',
    ctaHref: '',
  },
}

function ConfirmContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    const s = searchParams.get('status') as Status | null
    if (s && s in COPY) {
      setStatus(s)
    } else {
      setStatus('invalid')
    }
  }, [searchParams])

  const copy = COPY[status]
  const isSuccess = status === 'success' || status === 'already'
  const iconColor  = isSuccess ? green : status === 'loading' ? muted : red

  return (
    <div style={{
      minHeight: '100vh', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: '#fff',
        border: '1px solid #E2DDD5',
        borderRadius: 16,
        padding: '48px 40px',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        {/* Brand */}
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: muted, margin: '0 0 36px', textTransform: 'uppercase' }}>
          Edge Alpha
        </p>

        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: isSuccess ? '#F0FDF4' : status === 'loading' ? '#F0EDE6' : '#FEF2F2',
          border: `2px solid ${iconColor}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 28, fontWeight: 700, color: iconColor,
        }}>
          {copy.icon}
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: 24, fontWeight: 600, color: ink, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          {copy.heading}
        </h1>

        {/* Body */}
        <p style={{ fontSize: 14, color: muted, lineHeight: 1.7, margin: '0 0 32px' }}>
          {copy.body}
        </p>

        {/* CTA */}
        {copy.cta && (
          <button
            onClick={() => router.push(copy.ctaHref)}
            style={{
              background: ink, color: bg,
              border: 'none', borderRadius: 10,
              padding: '13px 28px',
              fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            {copy.cta}
          </button>
        )}
      </div>
    </div>
  )
}

export default function ConfirmEmailPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  )
}
