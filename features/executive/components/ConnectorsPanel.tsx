'use client'

/**
 * Connected accounts (F13) — where a founder grants and withdraws the system's ability to act
 * in their real tools.
 *
 * The founder is handing over the ability to send email AS THEM. The copy says that plainly
 * rather than softening it: someone who does not understand what they granted cannot meaningfully
 * withdraw it, and "Connect Gmail" alone does not convey "this may email people as you".
 *
 * Shows the granted scope in human terms and a disconnect that actually works — F13's acceptance
 * criteria are "Gmail connect/revoke works", and revoke is the half that usually rots.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link2, Loader2, ShieldCheck } from 'lucide-react'
import { surf, bdr, ink, muted, blue, green, red } from '@/lib/constants/colors'

interface Grant {
  id: string
  provider: string
  status: 'active' | 'revoked' | 'expired'
  scopes: string[]
  accountEmail: string | null
  connectedAt: string
}
interface Available { provider: string; scopes: string[] }

/** Scope URL → what it actually permits, in a founder's words. */
function describeScope(scope: string): string {
  if (scope.endsWith('/gmail.send')) return 'Send email as you. It cannot read your inbox.'
  if (scope.includes('gmail.readonly')) return 'Read your inbox.'
  return scope
}

export function ConnectorsPanel() {
  const [grants, setGrants] = useState<Grant[]>([])
  const [available, setAvailable] = useState<Available[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/connectors')
      if (!res.ok) return
      const data = await res.json()
      setGrants(data.grants ?? [])
      setAvailable(data.available ?? [])
    } catch {
      /* transient */
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // Google sends the founder back here with ?connector=<status>. Surface the reason rather than
  // silently reloading — "cancelled" and "scope_declined" are things they need to understand.
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('connector')
    if (!status) return
    if (status !== 'connected') setError(CONNECT_MESSAGES[status] ?? 'The connection did not complete.')
    window.history.replaceState({}, '', window.location.pathname)
    void load()
  }, [load])

  async function connect(provider: string) {
    setBusy(provider)
    setError(null)
    try {
      const res = await fetch(`/api/connectors/${provider}/oauth`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not start the connection.'); return }
      window.location.href = data.url // hand off to Google
    } catch {
      setError('Could not reach the server.')
      setBusy(null)
    }
  }

  async function disconnect(provider: string) {
    setBusy(provider)
    setError(null)
    try {
      const res = await fetch(`/api/connectors/${provider}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not disconnect.'); return }
      await load()
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(null)
    }
  }

  if (!loaded) return null

  const activeFor = (provider: string) =>
    grants.find(g => g.provider === provider && g.status === 'active')

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link2 size={17} color={muted} />
        <h2 style={{ color: ink, fontSize: 17, fontWeight: 600, margin: 0 }}>Connected accounts</h2>
      </div>
      <p style={{ color: muted, fontSize: 14, marginTop: 8, lineHeight: 1.6, maxWidth: 560 }}>
        Your team can only act in tools you connect here — and even then, nothing irreversible
        happens without your approval each time.
      </p>

      {error && <p style={{ color: red, fontSize: 13, marginTop: 10 }}>{error}</p>}

      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {available.map(({ provider, scopes }) => {
          const grant = activeFor(provider)
          return (
            <div key={provider} style={row}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: ink, fontSize: 15, fontWeight: 600, textTransform: 'capitalize' }}>
                    {provider}
                  </span>
                  {grant && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: green, fontSize: 12 }}>
                      <ShieldCheck size={13} /> connected
                    </span>
                  )}
                </div>
                {/* Say what was granted, in plain words. */}
                <p style={{ color: muted, fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
                  {grant?.accountEmail && <strong style={{ color: ink }}>{grant.accountEmail} — </strong>}
                  {(grant?.scopes ?? scopes).map(describeScope).join(' ')}
                </p>
              </div>

              {grant ? (
                <button onClick={() => void disconnect(provider)} disabled={busy === provider} style={secondaryBtn}>
                  {busy === provider ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  Disconnect
                </button>
              ) : (
                <button onClick={() => void connect(provider)} disabled={busy === provider} style={connectBtn}>
                  {busy === provider ? 'Opening…' : 'Connect'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Callback outcomes worth explaining rather than swallowing. */
const CONNECT_MESSAGES: Record<string, string> = {
  cancelled: 'You cancelled the connection — nothing was changed.',
  scope_declined: 'Sending permission was not granted. Connect again and leave the send permission ticked.',
  no_refresh_token: 'Google did not return a durable credential. Remove this app at myaccount.google.com, then connect again.',
  expired_state: 'That connection link expired. Try again.',
  bad_state: 'That connection link was not valid. Start again from this page.',
  already_connected: 'This account is already connected. Disconnect it first.',
  not_configured: 'This connector is not configured yet.',
}

const card: React.CSSProperties = {
  background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: 24, marginTop: 20,
}
const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  background: '#fff', border: `1px solid ${bdr}`, borderRadius: 10, padding: 14,
}
const connectBtn: React.CSSProperties = {
  background: blue, color: '#fff', border: 'none', borderRadius: 8,
  padding: '8px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
}
const secondaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'none', color: ink, border: `1px solid ${bdr}`,
  borderRadius: 8, padding: '8px 16px', fontSize: 14, cursor: 'pointer',
}
