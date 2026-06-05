'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Download, RefreshCw, ChevronDown } from 'lucide-react'
import { bg, ink } from '@/lib/constants/colors'

const C = {
  surf:  '#F5F3EF',
  sep:   '#E8E4DE',
  text2: '#6B6560',
  green: '#16A34A',
  amber: '#D97706',
  red:   '#DC2626',
}

const FEATURES = [
  ['500 AI agent conversations / month',  '50 on Free'],
  ['Unlimited Q-Score recalculations',    '2 / month on Free'],
  ['Unlimited investor connections',      '3 / month on Free'],
  ['Priority placement in deal flow',     'More investor visibility'],
  ['Usage analytics & benchmark reports', 'Track your progress'],
  ['Premium badge on investor profile',   'Signal serious intent'],
  ['Priority support',                    'Direct access'],
]

interface UsageStat { used: number; limit: number | null }
interface BillingInfo {
  subscriptionTier:   'free' | 'premium'
  subscriptionStatus: string | null
  periodEnd:          string | null
  usage: {
    agentChat:          UsageStat
    qscoreRecalc:       UsageStat
    investorConnection: UsageStat
  }
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function Bar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const color = !limit ? C.green : pct >= 90 ? C.red : pct >= 70 ? C.amber : ink

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: ink }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color }}>
          {limit === null ? 'Unlimited' : `${used} of ${limit}`}
        </span>
      </div>
      <div style={{ height: 3, background: C.sep, borderRadius: 999, overflow: 'hidden' }}>
        {limit !== null && (
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, transition: 'width .5s ease' }} />
        )}
      </div>
    </div>
  )
}

function BillingInner() {
  const searchParams = useSearchParams()
  const success      = searchParams.get('success') === '1'

  const [billing,         setBilling]         = useState<BillingInfo | null>(null)
  const [loading,         setLoading]         = useState(true)
  const [acting,          setActing]          = useState(false)
  const [toast,           setToast]           = useState<string | null>(null)
  const [invoices,        setInvoices]        = useState<Array<{
    id: string; number: string | null; status: string | null
    amount: number; currency: string; date: number
    pdfUrl: string | null; hostedUrl: string | null; description: string
  }>>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [invoicesLoaded,  setInvoicesLoaded]  = useState(false)
  const [historyOpen,     setHistoryOpen]     = useState(false)

  useEffect(() => {
    fetch('/api/founder/billing/status')
      .then(r => r.json()).then(d => setBilling(d))
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (success) {
      showToast('Subscription activated — welcome to Premium.')
      window.history.replaceState({}, '', '/founder/billing')
    }
  }, [success])

  async function loadInvoices() {
    if (invoicesLoaded || invoicesLoading) return
    setInvoicesLoading(true)
    try {
      const res  = await fetch('/api/founder/billing/invoices')
      const data = await res.json()
      setInvoices(data.invoices ?? [])
      setInvoicesLoaded(true)
    } finally {
      setInvoicesLoading(false)
    }
  }

  function toggleHistory() {
    setHistoryOpen(v => !v)
    if (!invoicesLoaded) loadInvoices()
  }

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
  const limits    = isPremium
    ? { agentChat: null, qscoreRecalc: null, investorConnection: null }
    : { agentChat: 50,   qscoreRecalc: 2,    investorConnection: 3    }

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
          <p style={{ fontSize: 14, color: C.text2, marginTop: 6 }}>Manage your plan, usage, and billing history.</p>
        </div>

        {/* Plan row */}
        <div style={{ padding: '20px 0', borderTop: `1px solid ${C.sep}`, borderBottom: `1px solid ${C.sep}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          {loading ? (
            <span style={{ fontSize: 13, color: C.text2 }}>Loading…</span>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: ink }}>{isPremium ? 'Premium' : 'Free'}</span>
                {isPremium && billing?.periodEnd && (
                  <span style={{ fontSize: 13, color: C.text2 }}>Renews {fmt(billing.periodEnd)}</span>
                )}
                {!isPremium && (
                  <span style={{ fontSize: 13, color: C.text2 }}>No active subscription</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {billing?.subscriptionStatus && billing.subscriptionStatus !== 'inactive' && (
                  <span style={{ fontSize: 12, color: billing.subscriptionStatus === 'active' ? C.green : C.amber }}>
                    {billing.subscriptionStatus === 'active' ? 'Active' : billing.subscriptionStatus}
                  </span>
                )}
                {isPremium && (
                  <button onClick={handleManage} disabled={acting} style={{ padding: '7px 14px', borderRadius: 7, border: `1px solid ${C.sep}`, background: 'transparent', color: ink, fontSize: 12, fontWeight: 500, cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.5 : 1 }}>
                    {acting ? 'Loading…' : 'Manage'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Usage */}
        {u && (
          <div style={{ marginBottom: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.text2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>Usage this month</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Bar label="AI agent conversations" used={u.agentChat.used}          limit={limits.agentChat}          />
              <Bar label="Q-Score recalculations"  used={u.qscoreRecalc.used}       limit={limits.qscoreRecalc}       />
              <Bar label="Investor connections"     used={u.investorConnection.used} limit={limits.investorConnection} />
            </div>
          </div>
        )}

        {/* Upgrade — only on Free */}
        {!isPremium && !loading && (
          <div style={{ marginBottom: 48 }}>
            {/* pricing */}
            <div style={{ background: ink, borderRadius: 16, padding: '32px 36px', color: '#fff', marginBottom: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Premium plan</p>
                  <p style={{ fontSize: 36, fontWeight: 300, letterSpacing: '-0.04em', lineHeight: 1, color: '#fff' }}>
                    $29 <span style={{ fontSize: 15, fontWeight: 400, color: 'rgba(255,255,255,0.45)' }}>/ month</span>
                  </p>
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={acting}
                  style={{ padding: '11px 24px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.5 : 1, transition: 'background .15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.18)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'}
                >
                  {acting ? 'Loading…' : 'Upgrade'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {FEATURES.map(([label, sub]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <Check style={{ height: 12, width: 12, color: 'rgba(255,255,255,0.5)', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{label}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto', whiteSpace: 'nowrap', paddingLeft: 12 }}>{sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Already Premium — quiet confirmation */}
        {isPremium && !loading && (
          <div style={{ marginBottom: 48, padding: '20px 0', borderTop: `1px solid ${C.sep}` }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.text2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Included features</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FEATURES.map(([label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Check style={{ height: 11, width: 11, color: C.green, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: ink }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Billing history */}
        <div style={{ borderTop: `1px solid ${C.sep}` }}>
          <button
            onClick={toggleHistory}
            style={{ width: '100%', padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'inherit' }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>Billing history</span>
            {invoicesLoading
              ? <RefreshCw style={{ height: 12, width: 12, color: C.text2, animation: 'spin 1s linear infinite' }} />
              : <ChevronDown style={{ height: 12, width: 12, color: C.text2, transform: historyOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            }
          </button>

          {historyOpen && invoicesLoaded && (
            <div style={{ paddingBottom: 24 }}>
              {invoices.length === 0 ? (
                <p style={{ fontSize: 13, color: C.text2, padding: '8px 0' }}>No invoices yet.</p>
              ) : invoices.map((inv, i) => {
                const date   = new Date(inv.date * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                const amount = `$${(inv.amount / 100).toFixed(2)}`
                const statusColor = inv.status === 'paid' ? C.green : inv.status === 'open' ? C.amber : C.text2
                return (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderTop: i > 0 ? `1px solid ${C.sep}` : 'none' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, color: ink, margin: 0 }}>{inv.description}</p>
                      <p style={{ fontSize: 11, color: C.text2, margin: '2px 0 0' }}>{date}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: ink }}>{amount}</span>
                    <span style={{ fontSize: 11, color: statusColor, textTransform: 'capitalize', minWidth: 30 }}>{inv.status}</span>
                    {inv.pdfUrl && (
                      <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.text2, fontSize: 11, textDecoration: 'none' }}>
                        <Download style={{ height: 11, width: 11 }} /> PDF
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default function FounderBillingPage() {
  return <Suspense><BillingInner /></Suspense>
}
