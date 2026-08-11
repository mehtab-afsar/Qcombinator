'use client'

import { useState } from 'react'
import { Crown, Users, Eye, Check } from 'lucide-react'
import { ink, muted, blue, bdr, alpha } from '@/lib/constants/colors'
import { Modal } from '@/features/shared/components/Modal'
import { Button } from '@/features/shared/components/Button'
import { Label } from '@/features/shared/components/Label'
import { TextInput } from '@/features/shared/components/TextInput'
import { ErrorBanner } from '@/features/shared/components/ErrorBanner'

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
    <Modal open={isOpen} onClose={onClose} title="Invite to team" width={440}>
      <p style={{ fontSize: 13, color: muted, margin: '-8px 0 22px' }}>Add a co-founder or team member</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <Label>Email address</Label>
          <TextInput
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="cofounder@example.com"
            autoFocus
          />
        </div>

        {/* Role — selectable cards instead of a native <select>. No shared "selectable card
            list" component exists for this — genuinely bespoke, not a reinvention. */}
        <div>
          <Label>Role</Label>
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

        {error && <ErrorBanner message={error} />}

        <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} style={{ flex: 1.4, justifyContent: 'center' }}>
            {loading ? 'Sending…' : 'Send invite'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
