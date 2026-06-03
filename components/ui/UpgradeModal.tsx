'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Zap, Loader2 } from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue } from '@/lib/constants/colors'

interface Props {
  open:      boolean
  onClose:   () => void
  feature?:  string  // which feature triggered the gate (optional, for messaging)
}

const BENEFITS = [
  '500 AI advisor conversations / month',
  'Unlimited Q-Score recalculations',
  'Unlimited investor connections',
  'Priority support',
]

export function UpgradeModal({ open, onClose, feature }: Props) {
  const [loading, setLoading] = useState(false)

  const featureMessages: Record<string, string> = {
    agent_chat:          "You've used all your AI advisor conversations this month.",
    qscore_recalc:       "You've used all your Q-Score recalculations this month.",
    investor_connection: "You've used all your investor connections this month.",
  }

  const featureMsg = feature ? featureMessages[feature] : null

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res = await fetch('/api/founder/billing/checkout', { method: 'POST' })
      const { url } = await res.json() as { url?: string }
      if (url) window.location.href = url
    } catch {
      // fallback — navigate to billing
      window.location.href = '/founder/billing'
    }
    setLoading(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 9000,
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9001, width: '100%', maxWidth: 440,
              background: bg, borderRadius: 18,
              border: `1px solid ${bdr}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              padding: '32px 28px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {/* Close */}
            <button
              onClick={onClose}
              style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4 }}
            >
              <X size={18} />
            </button>

            {/* Icon + heading */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: `${blue}14`, border: `1.5px solid ${blue}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Zap size={22} color={blue} fill={blue} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: ink, margin: '0 0 6px' }}>
                Unlock Premium
              </h2>
              {featureMsg && (
                <p style={{ fontSize: 13, color: muted, margin: 0 }}>{featureMsg}</p>
              )}
              {!featureMsg && (
                <p style={{ fontSize: 13, color: muted, margin: 0 }}>
                  Get unlimited access to all platform features.
                </p>
              )}
            </div>

            {/* Pricing */}
            <div style={{ textAlign: 'center', padding: '16px 0', borderTop: `1px solid ${bdr}`, borderBottom: `1px solid ${bdr}`, marginBottom: 20 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: ink, letterSpacing: '-0.04em' }}>$29</span>
              <span style={{ fontSize: 15, color: muted }}> / month</span>
              <p style={{ fontSize: 12, color: muted, margin: '4px 0 0' }}>Cancel anytime · No contracts</p>
            </div>

            {/* Benefits */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
              {BENEFITS.map(b => (
                <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={11} color="#059669" strokeWidth={3} />
                  </div>
                  <span style={{ fontSize: 13, color: ink }}>{b}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleUpgrade}
              disabled={loading}
              style={{
                width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                background: loading ? muted : ink, color: '#fff',
                fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 2px 8px rgba(24,22,15,0.2)',
                transition: 'all 0.12s',
              }}
            >
              {loading
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</>
                : 'Continue to payment →'
              }
            </button>

            <p style={{ fontSize: 11, color: muted, textAlign: 'center', margin: '10px 0 0' }}>
              Secured by Stripe · SSL encrypted
            </p>
          </motion.div>

          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Convenience gate wrapper ────────────────────────────────────────────────
// Wraps a feature trigger. If user is at limit, shows upgrade modal instead.

interface GateProps {
  blocked:   boolean          // true when user has hit the limit
  feature?:  string
  children:  React.ReactNode  // the actual feature UI (hidden when blocked)
}

export function UpgradeGate({ blocked, feature, children }: GateProps) {
  const [open, setOpen] = useState(false)

  if (!blocked) return <>{children}</>

  return (
    <>
      {/* Render children but overlay a gate */}
      <div style={{ position: 'relative' }}>
        <div style={{ pointerEvents: 'none', opacity: 0.4, userSelect: 'none' }}>
          {children}
        </div>
        <div
          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(249,247,242,0.85)', backdropFilter: 'blur(2px)', borderRadius: 10, cursor: 'pointer' }}
          onClick={() => setOpen(true)}
        >
          <div style={{ textAlign: 'center' }}>
            <Zap size={20} color={blue} style={{ marginBottom: 6 }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>Limit reached</p>
            <p style={{ fontSize: 12, color: muted, margin: '4px 0 8px' }}>Upgrade to continue</p>
            <button style={{ padding: '7px 16px', borderRadius: 7, background: blue, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Upgrade →
            </button>
          </div>
        </div>
      </div>

      <UpgradeModal open={open} onClose={() => setOpen(false)} feature={feature} />
    </>
  )
}
