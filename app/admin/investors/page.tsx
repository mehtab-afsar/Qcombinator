'use client'

import { useState, useEffect } from 'react'
import { Check, X, RefreshCw, Building2, MapPin, Target } from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue, green, red } from '@/lib/constants/colors'

interface PendingInvestor {
  user_id:             string
  full_name:           string | null
  email:               string | null
  firm_name:           string | null
  firm_type:           string | null
  location:            string | null
  thesis:              string | null
  sectors:             string[] | null
  stages:              string[] | null
  created_at:          string
  verification_status: string
}

const font = { family: 'system-ui, -apple-system, sans-serif', size: { sm: 11, base: 13, md: 14, lg: 16 }, weight: { normal: 400, medium: 500, semibold: 600, bold: 700 } }
const radius = { sm: 8, md: 10, lg: 14, full: 9999 }

export default function AdminInvestorsPage() {
  const [investors, setInvestors] = useState<PendingInvestor[]>([])
  const [loading,   setLoading]   = useState(true)
  const [acting,    setActing]    = useState<Record<string, boolean>>({})
  const [toast,     setToast]     = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/investor/verify')
      const data = await res.json()
      if (res.ok) setInvestors(data.investors ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handleVerify(userId: string, status: 'verified' | 'rejected') {
    setActing(a => ({ ...a, [userId]: true }))
    try {
      const res = await fetch('/api/investor/verify', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ investorUserId: userId, status }),
      })
      if (res.ok) {
        setInvestors(prev => prev.filter(i => i.user_id !== userId))
        setToast(`Investor ${status === 'verified' ? 'verified ✓' : 'rejected ✗'}`)
        setTimeout(() => setToast(null), 3000)
      }
    } finally {
      setActing(a => ({ ...a, [userId]: false }))
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: font.family, color: ink }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: font.size.lg, fontWeight: font.weight.bold, letterSpacing: '-0.02em', margin: '0 0 4px' }}>
              Investor Verification Queue
            </h1>
            <p style={{ fontSize: font.size.base, color: muted, margin: 0 }}>
              {loading ? 'Loading…' : `${investors.length} pending`}
            </p>
          </div>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: radius.md, border: `1px solid ${bdr}`, background: 'white', fontSize: font.size.base, color: muted, cursor: 'pointer' }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 64, color: muted }}>Loading…</div>
        ) : investors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64, background: surf, borderRadius: radius.lg, border: `1px solid ${bdr}` }}>
            <Check size={32} color={green} style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: font.size.md, fontWeight: font.weight.semibold, color: ink, margin: '0 0 4px' }}>All caught up</p>
            <p style={{ fontSize: font.size.base, color: muted, margin: 0 }}>No pending investor verifications.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {investors.map(inv => (
              <div key={inv.user_id} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: radius.lg, padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <p style={{ fontSize: font.size.md, fontWeight: font.weight.bold, color: ink, margin: 0 }}>
                        {inv.full_name ?? '—'}
                      </p>
                      <span style={{ fontSize: font.size.sm, color: muted }}>{inv.email}</span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
                      {inv.firm_name && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: font.size.base, color: muted }}>
                          <Building2 size={12} /> {inv.firm_name} {inv.firm_type ? `(${inv.firm_type})` : ''}
                        </span>
                      )}
                      {inv.location && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: font.size.base, color: muted }}>
                          <MapPin size={12} /> {inv.location}
                        </span>
                      )}
                      {(inv.stages?.length ?? 0) > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: font.size.base, color: muted }}>
                          <Target size={12} /> {inv.stages?.join(', ')}
                        </span>
                      )}
                    </div>

                    {(inv.sectors?.length ?? 0) > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                        {inv.sectors?.map(s => (
                          <span key={s} style={{ padding: '2px 8px', borderRadius: radius.full, background: `${blue}12`, color: blue, fontSize: font.size.sm, fontWeight: font.weight.semibold }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {inv.thesis && (
                      <p style={{ fontSize: font.size.base, color: muted, lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {inv.thesis}
                      </p>
                    )}

                    <p style={{ fontSize: font.size.sm, color: muted, margin: '8px 0 0' }}>
                      Signed up {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => handleVerify(inv.user_id, 'verified')}
                      disabled={acting[inv.user_id]}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: radius.sm, border: 'none', background: green, color: 'white', fontSize: font.size.base, fontWeight: font.weight.semibold, cursor: acting[inv.user_id] ? 'not-allowed' : 'pointer', opacity: acting[inv.user_id] ? 0.6 : 1 }}
                    >
                      <Check size={13} /> Verify
                    </button>
                    <button
                      onClick={() => handleVerify(inv.user_id, 'rejected')}
                      disabled={acting[inv.user_id]}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: radius.sm, border: `1px solid ${red}`, background: 'white', color: red, fontSize: font.size.base, fontWeight: font.weight.semibold, cursor: acting[inv.user_id] ? 'not-allowed' : 'pointer', opacity: acting[inv.user_id] ? 0.6 : 1 }}
                    >
                      <X size={13} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: ink, color: 'white', borderRadius: 10, padding: '10px 20px', fontSize: font.size.base, fontWeight: font.weight.medium, zIndex: 9999 }}>
          {toast}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
