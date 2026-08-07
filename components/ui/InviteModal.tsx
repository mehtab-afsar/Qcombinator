'use client'

import { useState } from 'react'
import { X, Mail, Crown, Users, Eye, Check } from 'lucide-react'
import { bg, ink, muted, blue, bdr, alpha, red } from '@/lib/constants/colors'

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  onSendInvite: (email: string, role: 'admin' | 'member' | 'viewer') => Promise<void>
}

const ROLES = [
  { value: 'admin', label: 'Co-founder', sub: 'Admin', desc: 'Full access, can invite others', icon: Crown },
  { value: 'member', label: 'Team Member', sub: null, desc: 'Operational agents only', icon: Users },
  { value: 'viewer', label: 'Viewer', sub: 'Read-only', desc: 'Q-Score + artifacts only', icon: Eye },
] as const

export function InviteModal({ isOpen, onClose, onSendInvite }: InviteModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member' | 'viewer'>('admin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    setError('')
    setLoading(true)
    try {
      await onSendInvite(email, role)
      setEmail('')
      setRole('admin')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(24,22,15,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div
        style={{
          background: bg,
          borderRadius: 20,
          padding: '30px 30px 26px',
          maxWidth: 440,
          width: '100%',
          border: `1px solid ${bdr}`,
          boxShadow: '0 24px 70px rgba(24,22,15,0.28)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 26 }}>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: ink, margin: 0, letterSpacing: '-0.01em' }}>Invite to team</h2>
            <p style={{ fontSize: 13, color: muted, margin: '5px 0 0' }}>Add a co-founder or team member</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: 999, flexShrink: 0,
              background: 'transparent', border: `1px solid ${bdr}`,
              cursor: 'pointer', color: muted, transition: 'background 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = alpha(ink, 0.05))}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 9 }}>
              Email address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: muted }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="cofounder@example.com"
                autoFocus
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 38px',
                  borderRadius: 11,
                  border: `1px solid ${bdr}`,
                  background: '#fff',
                  fontSize: 14,
                  color: ink,
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = blue
                  ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 3px ${alpha(blue, 0.12)}`
                }}
                onBlur={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = bdr
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                }}
              />
            </div>
          </div>

          {/* Role — selectable cards instead of a native <select> */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 9 }}>
              Role
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ROLES.map(r => {
                const selected = role === r.value
                const Icon = r.icon
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: `1.5px solid ${selected ? blue : bdr}`,
                      background: selected ? alpha(blue, 0.06) : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s, background 0.15s',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: selected ? blue : alpha(ink, 0.06),
                      color: selected ? '#fff' : muted,
                      transition: 'background 0.15s, color 0.15s',
                    }}>
                      <Icon size={16} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: ink }}>{r.label}</span>
                        {r.sub && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: selected ? blue : muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {r.sub}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: muted, marginTop: 1 }}>{r.desc}</div>
                    </div>
                    <div style={{
                      width: 18, height: 18, borderRadius: 999, flexShrink: 0,
                      border: `1.5px solid ${selected ? blue : bdr}`,
                      background: selected ? blue : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s, border-color 0.15s',
                    }}>
                      {selected && <Check size={11} color="#fff" strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: alpha(red, 0.08), border: `1px solid ${alpha(red, 0.25)}`, color: red, fontSize: 12.5, fontWeight: 500 }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '11px 16px',
                borderRadius: 11,
                border: `1px solid ${bdr}`,
                background: 'transparent',
                color: ink,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => !loading && ((e.currentTarget as HTMLElement).style.background = alpha(ink, 0.04))}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1.4,
                padding: '11px 16px',
                borderRadius: 11,
                border: 'none',
                background: ink,
                color: bg,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                fontFamily: 'inherit',
                transition: 'opacity 0.15s',
              }}
            >
              {loading ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
