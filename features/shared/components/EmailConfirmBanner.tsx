"use client";

import { useState, useEffect } from 'react'
import { MailWarning, X } from 'lucide-react'

interface Props {
  statusApiPath:  string
  resendApiPath:  string
  /** px offset from the left edge (match sidebar width). Default 52 */
  leftOffset?: number
}

export function EmailConfirmBanner({ statusApiPath, resendApiPath, leftOffset = 52 }: Props) {
  const [status, setStatus]       = useState<'loading' | 'confirmed' | 'unconfirmed'>('loading')
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending]     = useState(false)
  const [sent, setSent]           = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('ea_confirm_dismissed')) {
      setDismissed(true)
      return
    }
    fetch(statusApiPath)
      .then(r => r.json())
      .then((d: { emailConfirmed?: boolean }) => {
        setStatus(d.emailConfirmed ? 'confirmed' : 'unconfirmed')
      })
      .catch(() => setStatus('confirmed'))
  }, [statusApiPath])

  async function handleResend() {
    if (sending || sent) return
    setSending(true)
    try {
      await fetch(resendApiPath, { method: 'POST' })
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  function handleDismiss() {
    sessionStorage.setItem('ea_confirm_dismissed', '1')
    setDismissed(true)
  }

  if (status !== 'unconfirmed' || dismissed) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: leftOffset, right: 0, zIndex: 38,
      background: '#FEF3C7',
      borderBottom: '1px solid #FCD34D',
      display: 'flex', alignItems: 'center',
      padding: '0 16px',
      height: 40,
      gap: 10,
      fontFamily: 'system-ui, sans-serif',
    }}>
      <MailWarning style={{ height: 15, width: 15, color: '#92400E', flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: '#78350F', flex: 1, minWidth: 0 }}>
        Please confirm your email address to unlock investor matching.
      </span>
      <button
        onClick={handleResend}
        disabled={sending || sent}
        style={{
          fontSize: 12, fontWeight: 600,
          color: sent ? '#16A34A' : '#92400E',
          background: sent ? '#F0FDF4' : '#FEF9C3',
          border: 'none', cursor: sending || sent ? 'default' : 'pointer',
          padding: '2px 8px', borderRadius: 6,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        {sent ? 'Sent ✓' : sending ? 'Sending…' : 'Resend email'}
      </button>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 4, display: 'flex', alignItems: 'center',
          color: '#92400E', borderRadius: 4, flexShrink: 0,
        }}
      >
        <X style={{ height: 13, width: 13 }} />
      </button>
    </div>
  )
}
