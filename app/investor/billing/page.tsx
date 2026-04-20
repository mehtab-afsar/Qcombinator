'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, CreditCard, Zap, BarChart3, Search, FileText, RefreshCw, Crown } from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue, green, amber } from '@/lib/constants/colors'

const PRO_FEATURES = [
  { icon: Search,     label: 'Unlimited deal flow access' },
  { icon: BarChart3,  label: 'AI match scores + personalization' },
  { icon: Zap,        label: 'Pipeline management & kanban' },
  { icon: FileText,   label: 'Thesis extraction from PDF' },
  { icon: CheckCircle,label: 'Founder deep-dive profiles' },
  { icon: Crown,      label: 'Priority support' },
]

interface BillingInfo {
  subscriptionTier: 'free' | 'pro'
  subscriptionStatus: string | null
  periodEnd: string | null
}

function BillingInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const success      = searchParams.get('success') === '1'

  const [billing,    setBilling]    = useState<BillingInfo | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [acting,     setActing]     = useState(false)
  const [toast,      setToast]      = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/investor/billing/status')
      .then(r => r.json())
      .then(d => setBilling(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (success) {
      showToast('🎉 Welcome to Pro! Your subscription is now active.')
      router.replace('/investor/billing')
    }
  }, [success, router])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 5000)
  }

  async function handleUpgrade() {
    setActing(true)
    try {
      const res = await fetch('/api/investor/billing/checkout', { method: 'POST' })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch {
      showToast('Something went wrong. Please try again.')
      setActing(false)
    }
  }

  async function handleManage() {
    setActing(true)
    try {
      const res = await fetch('/api/investor/billing/portal', { method: 'POST' })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch {
      showToast('Could not open billing portal. Please try again.')
      setActing(false)
    }
  }

  const isPro = billing?.subscriptionTier === 'pro'

  return (
    <div style={{ minHeight: '100vh', background: bg, color: ink, padding: '40px 24px 80px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '12px 20px', borderRadius: 10,
          background: ink, color: bg, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)', maxWidth: 360,
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 36 }}
        >
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: muted, fontWeight: 600, marginBottom: 8 }}>
            Investor · Billing
          </p>
          <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.4rem)', fontWeight: 300, letterSpacing: '-0.03em', color: ink }}>
            Billing & Subscription
          </h1>
        </motion.div>

        {/* Current Plan Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}
        >
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${bdr}`, background: surf, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard style={{ height: 14, width: 14, color: muted }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>Current Plan</p>
          </div>
          <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw style={{ height: 14, width: 14, color: muted, animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13, color: muted }}>Loading…</span>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                    background: isPro ? '#EFF6FF' : surf,
                    color: isPro ? blue : muted,
                    border: `1px solid ${isPro ? '#BFDBFE' : bdr}`,
                  }}>
                    {isPro ? '⚡ Pro' : 'Free'}
                  </div>
                  {isPro && billing?.periodEnd && (
                    <span style={{ fontSize: 11, color: muted }}>
                      Renews {new Date(billing.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  {billing?.subscriptionStatus && billing.subscriptionStatus !== 'inactive' && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                      background: billing.subscriptionStatus === 'active' ? '#ECFDF5' : '#FFFBEB',
                      color: billing.subscriptionStatus === 'active' ? green : amber,
                    }}>
                      {billing.subscriptionStatus}
                    </span>
                  )}
                </div>
                {isPro ? (
                  <button
                    onClick={handleManage}
                    disabled={acting}
                    style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${bdr}`, background: 'transparent', color: ink, fontSize: 12, fontWeight: 500, cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <CreditCard style={{ height: 12, width: 12 }} />
                    {acting ? 'Loading…' : 'Manage subscription'}
                  </button>
                ) : null}
              </>
            )}
          </div>
        </motion.div>

        {/* Pro Plan Card */}
        {!isPro && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.14 }}
            style={{
              background: bg, border: `2px solid ${blue}`, borderRadius: 14, overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ padding: '2px 10px', borderRadius: 999, background: blue, color: '#fff', fontSize: 11, fontWeight: 700 }}>
                    ⚡ Pro
                  </span>
                </div>
                <p style={{ fontSize: 26, fontWeight: 700, color: ink, lineHeight: 1 }}>
                  $99<span style={{ fontSize: 14, fontWeight: 400, color: muted }}> / month</span>
                </p>
              </div>
              <button
                onClick={handleUpgrade}
                disabled={acting}
                style={{
                  padding: '12px 28px', borderRadius: 10, border: 'none',
                  background: blue, color: '#fff',
                  fontSize: 14, fontWeight: 600, cursor: acting ? 'not-allowed' : 'pointer',
                  opacity: acting ? 0.7 : 1,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 2px 12px rgba(59,130,246,0.3)',
                }}
              >
                <Zap style={{ height: 14, width: 14 }} />
                {acting ? 'Loading…' : 'Upgrade to Pro'}
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {PRO_FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ height: 28, width: 28, borderRadius: 7, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon style={{ height: 13, width: 13, color: blue }} />
                  </div>
                  <span style={{ fontSize: 13, color: ink }}>{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Already Pro — full feature confirmation */}
        {isPro && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.14 }}
            style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 14, padding: '20px 24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <CheckCircle style={{ height: 16, width: 16, color: green }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: green }}>You&apos;re on the Pro plan</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {PRO_FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon style={{ height: 12, width: 12, color: green }} />
                  <span style={{ fontSize: 12, color: '#166534' }}>{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  )
}

export default function InvestorBillingPage() {
  return (
    <Suspense>
      <BillingInner />
    </Suspense>
  )
}
