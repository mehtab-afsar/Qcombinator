'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  CheckCircle, CreditCard, Zap, BarChart3, Users, RefreshCw,
  TrendingUp, Star, MessageSquare, Crown,
} from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue, green, amber, red } from '@/lib/constants/colors'

const PREMIUM_FEATURES = [
  { icon: MessageSquare, label: '500 AI agent conversations/month',     sub: 'vs 50 on Free'         },
  { icon: RefreshCw,     label: 'Unlimited Q-Score recalculations',     sub: 'vs 2/month on Free'    },
  { icon: Users,         label: 'Unlimited investor connections',        sub: 'vs 3/month on Free'    },
  { icon: TrendingUp,    label: 'Priority placement in deal flow',       sub: 'More investor eyeballs' },
  { icon: BarChart3,     label: 'Usage analytics & benchmark reports',  sub: 'Track your progress'   },
  { icon: Star,          label: '"Premium" badge on investor profile',   sub: 'Signal serious intent' },
  { icon: Crown,         label: 'Priority support',                      sub: 'Direct access'         },
]

const FREE_LIMITS  = { agentChat: 50,  qscoreRecalc: 2,   investorConnection: 3   }
const PRO_LIMITS   = { agentChat: 500, qscoreRecalc: null, investorConnection: null }

interface UsageStat { used: number; limit: number | null }
interface BillingInfo {
  subscriptionTier:   'free' | 'premium'
  subscriptionStatus: string | null
  periodEnd:          string | null
  usage: {
    agentChat:           UsageStat
    qscoreRecalc:        UsageStat
    investorConnection:  UsageStat
  }
}

function UsageMeter({ label, used, limit, color = blue }: { label: string; used: number; limit: number | null; color?: string }) {
  const pct    = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const overPct = pct >= 90
  const barColor = overPct ? red : pct >= 70 ? amber : color

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 12, color: muted }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: limit === null ? green : overPct ? red : ink }}>
          {limit === null ? 'Unlimited' : `${used} / ${limit}`}
        </span>
      </div>
      {limit !== null && (
        <div style={{ height: 4, borderRadius: 999, background: bdr, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: barColor, transition: 'width .4s ease' }} />
        </div>
      )}
    </div>
  )
}

function BillingInner() {
  const searchParams = useSearchParams()
  const success      = searchParams.get('success') === '1'

  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting,  setActing]  = useState(false)
  const [toast,   setToast]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/founder/billing/status')
      .then(r => r.json())
      .then(d => setBilling(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (success) {
      showToast('🎉 Welcome to Premium! Your subscription is now active.')
      window.history.replaceState({}, '', '/founder/billing')
    }
  }, [success])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 5000)
  }

  async function handleUpgrade() {
    setActing(true)
    try {
      const res = await fetch('/api/founder/billing/checkout', { method: 'POST' })
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
      const res = await fetch('/api/founder/billing/portal', { method: 'POST' })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch {
      showToast('Could not open billing portal. Please try again.')
      setActing(false)
    }
  }

  const isPremium = billing?.subscriptionTier === 'premium'
  const u         = billing?.usage
  const limits    = isPremium ? PRO_LIMITS : FREE_LIMITS

  return (
    <div style={{ minHeight: '100vh', background: bg, color: ink, padding: '40px 24px 80px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

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
            Founder · Billing
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

          <div style={{ padding: '20px' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw style={{ height: 14, width: 14, color: muted, animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13, color: muted }}>Loading…</span>
              </div>
            ) : (
              <>
                {/* Plan badge + renewal */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                      background: isPremium ? '#F5F3FF' : surf,
                      color:      isPremium ? '#7C3AED'  : muted,
                      border:     `1px solid ${isPremium ? '#DDD6FE' : bdr}`,
                    }}>
                      {isPremium ? '⚡ Premium' : 'Free'}
                    </div>
                    {isPremium && billing?.periodEnd && (
                      <span style={{ fontSize: 11, color: muted }}>
                        Renews {new Date(billing.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                    {billing?.subscriptionStatus && billing.subscriptionStatus !== 'inactive' && (
                      <span style={{
                        padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                        background: billing.subscriptionStatus === 'active' ? '#ECFDF5' : '#FFFBEB',
                        color:      billing.subscriptionStatus === 'active' ? green     : amber,
                      }}>
                        {billing.subscriptionStatus}
                      </span>
                    )}
                  </div>
                  {isPremium && (
                    <button
                      onClick={handleManage}
                      disabled={acting}
                      style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${bdr}`, background: 'transparent', color: ink, fontSize: 12, fontWeight: 500, cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <CreditCard style={{ height: 12, width: 12 }} />
                      {acting ? 'Loading…' : 'Manage subscription'}
                    </button>
                  )}
                </div>

                {/* Usage meters */}
                {u && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{'This month\'s usage'}</p>
                    <UsageMeter label="AI agent conversations" used={u.agentChat.used}          limit={isPremium ? null : limits.agentChat}          color={blue}  />
                    <UsageMeter label="Q-Score recalculations"  used={u.qscoreRecalc.used}       limit={isPremium ? null : limits.qscoreRecalc}       color={green} />
                    <UsageMeter label="Investor connections"    used={u.investorConnection.used} limit={isPremium ? null : limits.investorConnection} color={amber} />
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Free → Premium upgrade card */}
        {!isPremium && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.14 }}
            style={{ background: bg, border: `2px solid #7C3AED`, borderRadius: 14, overflow: 'hidden' }}
          >
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ padding: '2px 10px', borderRadius: 999, background: '#7C3AED', color: '#fff', fontSize: 11, fontWeight: 700 }}>
                    ⚡ Premium
                  </span>
                </div>
                <p style={{ fontSize: 26, fontWeight: 700, color: ink, lineHeight: 1 }}>
                  $29<span style={{ fontSize: 14, fontWeight: 400, color: muted }}> / month</span>
                </p>
              </div>
              <button
                onClick={handleUpgrade}
                disabled={acting}
                style={{
                  padding: '12px 28px', borderRadius: 10, border: 'none',
                  background: '#7C3AED', color: '#fff',
                  fontSize: 14, fontWeight: 600, cursor: acting ? 'not-allowed' : 'pointer',
                  opacity: acting ? 0.7 : 1,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 2px 12px rgba(124,58,237,0.3)',
                }}
              >
                <Zap style={{ height: 14, width: 14 }} />
                {acting ? 'Loading…' : 'Upgrade to Premium'}
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {PREMIUM_FEATURES.map(({ icon: Icon, label, sub }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ height: 28, width: 28, borderRadius: 7, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Icon style={{ height: 13, width: 13, color: '#7C3AED' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, color: ink, lineHeight: 1.4 }}>{label}</p>
                    <p style={{ fontSize: 11, color: muted, marginTop: 1 }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Already Premium confirmation */}
        {isPremium && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.14 }}
            style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 14, padding: '20px 24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <CheckCircle style={{ height: 16, width: 16, color: '#7C3AED' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: '#5B21B6' }}>You&apos;re on the Premium plan</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {PREMIUM_FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon style={{ height: 12, width: 12, color: '#7C3AED' }} />
                  <span style={{ fontSize: 12, color: '#4C1D95' }}>{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  )
}

export default function FounderBillingPage() {
  return (
    <Suspense>
      <BillingInner />
    </Suspense>
  )
}
