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
import { ShieldCheck, Plug } from 'lucide-react'
import { bdr, ink, muted, bg, green, red } from '@/lib/constants/colors'
import { radius } from '@/features/shared/tokens'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { Button } from '@/features/shared/components/Button'
import { CONNECTOR_BRANDING, CATEGORY_LABELS, CATEGORY_ORDER } from '../constants/connector-branding'

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
  if (scope.includes('gmail.compose')) return 'Required by Google to read your inbox — this connection never drafts or sends anything.'
  if (scope === 'chat:write') return 'Post messages to a channel you choose, as the Edge Alpha bot. It cannot read your workspace.'
  if (scope === 'read_only') return 'Read your subscriptions, customers and charges. It cannot move money or change anything.'
  if (scope === 'insight:read' || scope === 'query:read') return 'Read your product analytics and insights.'
  if (scope === 'dashboard:read') return 'Read your dashboards. It cannot create or change anything.'
  if (scope === 'people:read') return 'Look up real people and their work email addresses, using your Apollo credits.'
  if (scope === 'organizations:read') return 'Look up companies. It cannot change anything in Apollo.'
  return scope
}

export function ConnectorsPanel() {
  const [grants, setGrants] = useState<Grant[]>([])
  const [available, setAvailable] = useState<Available[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** Which provider's key form is open, and what's typed in it — API-key providers only. */
  const [keyFor, setKeyFor] = useState<string | null>(null)
  const [keyInput, setKeyInput] = useState('')

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
    } finally {
      // Previously only reset on the catch branch — an error response (e.g. Stripe's
      // "not configured") left the button spinning forever even though the request had
      // already finished and an error message was set.
      setBusy(null)
    }
  }

  /**
   * The API-key path. Apollo is the first provider with no OAuth handshake to redirect into —
   * the founder holds a key and hands it over — so `connect()`'s redirect has nothing to redirect
   * to. Its own route verifies the key with Apollo before storing it, so an invalid key fails
   * here rather than silently at the moment credits get spent.
   */
  async function connectWithKey(provider: string) {
    setBusy(provider)
    setError(null)
    try {
      const res = await fetch(`/api/connectors/${provider}/key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not connect.'); return }
      setKeyInput('')
      setKeyFor(null)
      await load()
    } catch {
      setError('Could not reach the server.')
    } finally {
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

  // Group by what the connector lets the Executive DO, not by vendor. A provider with no
  // category (none shipped today, but the panel must not break if one ever lacks branding)
  // falls into a trailing "Other" group.
  const groups: Array<{ key: string; label: string; items: Available[] }> = [
    ...CATEGORY_ORDER.map(key => ({
      key,
      label: CATEGORY_LABELS[key],
      items: available.filter(a => CONNECTOR_BRANDING[a.provider]?.category === key),
    })),
    { key: 'other', label: 'Other', items: available.filter(a => !CONNECTOR_BRANDING[a.provider]) },
  ].filter(group => group.items.length > 0)

  return (
    <SectionCard
      title="Connected accounts"
      subtitle="Your team can only act in tools you connect here — and even then, nothing irreversible happens without your approval each time."
    >
      {error && <p style={{ color: red, fontSize: 13, marginTop: 0 }}>{error}</p>}

      <div style={{ marginTop: 16, display: 'grid', gap: 20 }}>
        {groups.map(group => (
          <div key={group.key}>
            <p style={{ color: muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 10px' }}>
              {group.label}
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {group.items.map(({ provider, scopes }) => {
                const grant = activeFor(provider)
                const branding = CONNECTOR_BRANDING[provider]
                const Icon = branding?.icon ?? Plug
                const color = branding?.color ?? muted
                return (
                  <div key={provider} style={row}>
                    <div style={{
                      width: 38, height: 38, borderRadius: radius.md, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${color}18`,
                    }}>
                      <Icon size={18} color={color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: ink, fontSize: 15, fontWeight: 600 }}>
                          {branding?.label ?? provider}
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

                      {/* API-key providers get a form instead of a redirect — there is no
                          handshake to hand off to. Only ever rendered for the one provider whose
                          form is open. */}
                      {!grant && keyFor === provider && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                          <input
                            type="password"
                            value={keyInput}
                            onChange={e => setKeyInput(e.target.value)}
                            placeholder="Paste your API key"
                            aria-label={`${branding?.label ?? provider} API key`}
                            style={{
                              flex: 1, minWidth: 200, padding: '7px 10px', borderRadius: radius.sm,
                              border: `1px solid ${bdr}`, background: bg, color: ink,
                              fontSize: 13, fontFamily: 'inherit',
                            }}
                          />
                          <Button
                            variant="primary" size="sm"
                            loading={busy === provider}
                            disabled={keyInput.trim().length < 10}
                            onClick={() => void connectWithKey(provider)}
                          >
                            Save key
                          </Button>
                          {branding?.keyHint && (
                            <span style={{ color: muted, fontSize: 12, width: '100%' }}>
                              Find it in {branding.keyHint}. It&rsquo;s stored encrypted and only
                              used for lookups you trigger.
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {grant ? (
                      <Button variant="secondary" size="sm" loading={busy === provider} onClick={() => void disconnect(provider)}>
                        Disconnect
                      </Button>
                    ) : branding?.auth === 'api_key' ? (
                      <Button
                        variant={keyFor === provider ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => { setKeyFor(keyFor === provider ? null : provider); setKeyInput('') }}
                      >
                        {keyFor === provider ? 'Cancel' : 'Connect'}
                      </Button>
                    ) : (
                      <Button variant="primary" size="sm" loading={busy === provider} onClick={() => void connect(provider)}>
                        Connect
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

/** Callback outcomes worth explaining rather than swallowing. */
const CONNECT_MESSAGES: Record<string, string> = {
  cancelled: 'You cancelled the connection — nothing was changed.',
  scope_declined: 'The required permission was not granted. Connect again and leave every permission ticked.',
  no_refresh_token: 'Google did not return a durable credential. Remove this app at myaccount.google.com, then connect again.',
  expired_state: 'That connection link expired. Try again.',
  bad_state: 'That connection link was not valid. Start again from this page.',
  already_connected: 'This account is already connected. Disconnect it first.',
  not_configured: 'This connector is not configured yet.',
}

const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  background: bg, border: `1px solid ${bdr}`, borderRadius: radius.md, padding: 14,
}
