'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Check, RefreshCw } from 'lucide-react'
import { bg, ink } from '@/lib/constants/colors'

const C = {
  sep:   '#E8E4DE',
  text2: '#6B6560',
  green: '#16A34A',
  amber: '#D97706',
}

const FEATURES = [
  ['Unlimited deal flow access',          'View every scored founder'],
  ['AI match scores + personalisation',   'Ranked to your thesis'],
  ['Pipeline management',                 'Kanban board & notes'],
  ['Thesis extraction from PDF',          'Auto-parsed criteria'],
  ['Founder deep-dive profiles',          'Score breakdown + artifacts'],
  ['Priority support',                    'Direct access'],
]

interface BillingInfo {
  subscriptionTier:   'free' | 'pro'
  subscriptionStatus: string | null
  periodEnd:          string | null
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function BillingInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const success      = searchParams.get('success') === '1'

  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting,  setActing]  = useState(false)
  const [toast,   setToast]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/investor/billing/status')
      .then(r => r.json()).then(d => setBilling(d))
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (success) {
      showToast('Subscription activated — welcome to Pro.')
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
    <div style={{ minHeight: '100vh', background: bg, color: ink, padding: '48px 24px 100px', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '11px 20px', borderRadius: 10, background: ink, color: bg, fontSize: 13, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.03em', color: ink, margin: 0 }}>Subscription</h1>
          <p style={{ fontSize: 14, color: C.text2, marginTop: 6 }}>Manage your investor plan and access.</p>
        </div>

        {/* Plan row */}
        <div style={{ padding: '20px 0', borderTop: `1px solid ${C.sep}`, borderBottom: `1px solid ${C.sep}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw style={{ height: 12, width: 12, color: C.text2, animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 13, color: C.text2 }}>Loading…</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: ink }}>{isPro ? 'Pro' : 'Free'}</span>
                {isPro && billing?.periodEnd && (
                  <span style={{ fontSize: 13, color: C.text2 }}>Renews {fmt(billing.periodEnd)}</span>
                )}
                {!isPro && (
                  <span style={{ fontSize: 13, color: C.text2 }}>No active subscription</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {billing?.subscriptionStatus && billing.subscriptionStatus !== 'inactive' && (
                  <span style={{ fontSize: 12, color: billing.subscriptionStatus === 'active' ? C.green : C.amber }}>
                    {billing.subscriptionStatus === 'active' ? 'Active' : billing.subscriptionStatus}
                  </span>
                )}
                {isPro && (
                  <button onClick={handleManage} disabled={acting} style={{ padding: '7px 14px', borderRadius: 7, border: `1px solid ${C.sep}`, background: 'transparent', color: ink, fontSize: 12, fontWeight: 500, cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.5 : 1 }}>
                    {acting ? 'Loading…' : 'Manage'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Upgrade card — only on Free */}
        {!isPro && !loading && (
          <div style={{ marginBottom: 48 }}>
            <div style={{ background: ink, borderRadius: 16, padding: '32px 36px', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
                <div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Pro plan</p>
                  <p style={{ fontSize: 36, fontWeight: 300, letterSpacing: '-0.04em', lineHeight: 1, color: '#fff' }}>
                    $99 <span style={{ fontSize: 15, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>/ month</span>
                  </p>
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={acting}
                  style={{ padding: '11px 24px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.5 : 1, transition: 'background .15s', flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.18)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'}
                >
                  {acting ? 'Loading…' : 'Upgrade'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {FEATURES.map(([label, sub]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <Check style={{ height: 12, width: 12, color: 'rgba(255,255,255,0.45)', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{label}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto', whiteSpace: 'nowrap', paddingLeft: 12 }}>{sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Already Pro — quiet feature list */}
        {isPro && !loading && (
          <div style={{ borderTop: `1px solid ${C.sep}`, paddingTop: 32, marginBottom: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.text2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18 }}>Included features</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {FEATURES.map(([label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Check style={{ height: 11, width: 11, color: C.green, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: ink }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default function InvestorBillingPage() {
  return <Suspense><BillingInner /></Suspense>
}
