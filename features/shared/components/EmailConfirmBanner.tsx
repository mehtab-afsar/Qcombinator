"use client";

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MailWarning, X } from 'lucide-react'

interface Props {
  statusApiPath:  string
  resendApiPath:  string
  /** @deprecated no longer used — toast is positioned bottom-right */
  leftOffset?: number
}

export function EmailConfirmBanner({ statusApiPath, resendApiPath }: Props) {
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

  const visible = status === 'unconfirmed' && !dismissed

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="email-confirm-toast"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 90,
            width: 340,
            background: '#fff',
            border: '1px solid #FCD34D',
            borderLeft: '4px solid #D97706',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: '14px 16px',
            fontFamily: 'inherit',
          }}
        >
          {/* close button */}
          <button
            onClick={handleDismiss}
            style={{
              position: 'absolute', top: 10, right: 10,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 4, display: 'flex', alignItems: 'center',
              color: '#9CA3AF', borderRadius: 4,
            }}
            aria-label="Dismiss"
          >
            <X style={{ height: 14, width: 14 }} />
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingRight: 20 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MailWarning style={{ height: 16, width: 16, color: '#D97706' }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 3px' }}>
                Confirm your email
              </p>
              <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
                Your email isn't verified yet. Confirm it to unlock investor matching.
              </p>
            </div>
          </div>

          <button
            onClick={handleResend}
            disabled={sending || sent}
            style={{
              marginTop: 12, width: '100%',
              padding: '8px 14px', borderRadius: 8, border: 'none',
              fontSize: 12, fontWeight: 600, cursor: sending || sent ? 'default' : 'pointer',
              background: sent ? '#F0FDF4' : '#FEF3C7',
              color: sent ? '#16A34A' : '#92400E',
              transition: 'all 0.15s',
            }}
          >
            {sent ? '✓ Email sent — check your inbox' : sending ? 'Sending…' : 'Resend confirmation email'}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
