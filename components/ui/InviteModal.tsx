'use client'

import { useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { ink, muted, blue, bdr } from '@/lib/constants/colors'

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  onSendInvite: (email: string, role: 'admin' | 'member' | 'viewer') => Promise<void>
}

const ROLES = [
  { value: 'admin', label: 'Co-founder (Admin)', desc: 'Full access, can invite others' },
  { value: 'member', label: 'Team Member', desc: 'Operational agents only' },
  { value: 'viewer', label: 'Viewer (read-only)', desc: 'Q-Score + artifacts only' },
]

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '32px 28px',
          maxWidth: 420,
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: ink, margin: 0 }}>Invite to team</h2>
            <p style={{ fontSize: 13, color: muted, margin: '4px 0 0' }}>Add a co-founder or team member</p>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'transparent',
              border: `1px solid ${bdr}`,
              cursor: 'pointer',
              color: muted,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ink, marginBottom: 8 }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="cofounder@example.com"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: `1px solid ${bdr}`,
                fontSize: 14,
                color: ink,
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Role */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: ink, marginBottom: 8 }}>
              Role
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={role}
                onChange={e => setRole(e.target.value as 'admin' | 'member' | 'viewer')}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  paddingRight: 36,
                  borderRadius: 10,
                  border: `1px solid ${bdr}`,
                  fontSize: 14,
                  color: ink,
                  background: '#fff',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  appearance: 'none',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = blue
                }}
                onBlur={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = bdr
                }}
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label} — {r.desc}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: muted,
                  pointerEvents: 'none',
                }}
              />
            </div>
            <p style={{ fontSize: 11, color: muted, margin: '8px 0 0' }}>
              {ROLES.find(r => r.value === role)?.desc}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 12 }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 10,
                border: `1px solid ${bdr}`,
                background: '#fff',
                color: ink,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 10,
                border: 'none',
                background: blue,
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Sending...' : 'Send invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
