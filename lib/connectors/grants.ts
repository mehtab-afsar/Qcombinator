/**
 * F13 — the grant lifecycle: connect, resolve, revoke.
 *
 * This is the only place `connector_grants` and the vault are used together, so it is the only
 * place that has to get their ORDERING right — and the ordering is where this goes wrong:
 *
 *   connect: vault FIRST, then the row. A row pointing at a secret that was never written is a
 *            grant that looks usable and is not.
 *   revoke:  the PROVIDER first, then the row, then the secret. Any other order can leave a
 *            token that still works at Google with nothing left pointing at it.
 *
 * Service-role only. `connector_grants` is read-only for authenticated by design.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'
import { getConnector } from './registry'
import { deleteSecret, resolveSecret, storeSecret, updateSecret } from './vault'
import { refreshAccessToken } from './oauth'
import { ConnectorError, type ResolvedGrant } from './types'

export interface ConnectorGrant {
  id: string
  founderId: string
  provider: string
  status: 'active' | 'revoked' | 'expired'
  scopes: string[]
  accountEmail: string | null
  connectedAt: string
  expiresAt: string | null
}

interface GrantRow {
  id: string
  founder_id: string
  provider: string
  status: 'active' | 'revoked' | 'expired'
  scopes: unknown
  token_ref: string | null
  account_email: string | null
  connected_at: string
  expires_at: string | null
}

/** Never exposes `token_ref` — it has no business leaving this module. */
function toGrant(row: GrantRow): ConnectorGrant {
  return {
    id: row.id,
    founderId: row.founder_id,
    provider: row.provider,
    status: row.status,
    scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
    accountEmail: row.account_email,
    connectedAt: row.connected_at,
    expiresAt: row.expires_at,
  }
}

/**
 * Record a new connection.
 *
 * The vault write happens FIRST. If the row were written first and the vault write then failed,
 * the founder would have an `active` grant whose `token_ref` is null — a connection that reads
 * as working and cannot send. Failing before the row exists leaves nothing behind.
 *
 * @throws ConnectorError if an active grant already exists (the partial unique index, 23505).
 */
export async function recordGrant(
  admin: SupabaseClient,
  args: {
    founderId: string
    provider: string
    refreshToken: string
    scopes: string[]
    accountEmail: string | null
    expiresAt?: string | null
  },
): Promise<ConnectorGrant> {
  const tokenRef = await storeSecret(admin, {
    founderId: args.founderId,
    provider: args.provider,
    secret: args.refreshToken,
  })

  const { data, error } = await admin
    .from('connector_grants')
    .insert({
      founder_id: args.founderId,
      provider: args.provider,
      status: 'active',
      scopes: args.scopes,
      token_ref: tokenRef,
      account_email: args.accountEmail,
      expires_at: args.expiresAt ?? null,
    })
    .select()
    .single()

  if (error) {
    // The row failed, so the secret we just wrote is orphaned — clean it up rather than leave
    // an unreferenced credential sitting in the vault forever.
    await deleteSecret(admin, tokenRef).catch(() => {
      log.error('orphaned vault secret after a failed grant insert', { provider: args.provider })
    })
    if (error.code === '23505') {
      throw new ConnectorError(
        'already_connected',
        `${args.provider} is already connected. Disconnect it first.`,
      )
    }
    throw new ConnectorError('write_failed', `Could not record the connection: ${error.message}`)
  }
  return toGrant(data as GrantRow)
}

/** The founder's grants, newest first. Safe for a user-scoped client — RLS is SELECT-own. */
export async function listGrants(
  client: SupabaseClient,
  founderId: string,
): Promise<ConnectorGrant[]> {
  const { data, error } = await client
    .from('connector_grants')
    .select('*')
    .eq('founder_id', founderId)
    .order('connected_at', { ascending: false })

  if (error) throw new ConnectorError('read_failed', `Could not read connections: ${error.message}`)
  return (data ?? []).map(r => toGrant(r as GrantRow))
}

/**
 * Resolve an active grant into something a Connector can use.
 *
 * ⚠️ The ONE place a credential enters memory. Everything downstream receives a `ResolvedGrant`
 * and never touches the vault, so there is a single function to audit.
 *
 * ⚠️ THE VAULT HOLDS A **REFRESH** TOKEN, NOT AN ACCESS TOKEN. They are different things and
 * Gmail rejects the former with a 401 — which is exactly what the first real send did, because
 * every test mocked the vault and could not tell them apart. The refresh token is exchanged for
 * a short-lived access token here, on every resolve.
 *
 * Exchanging each time is deliberate rather than lazy: it means NO access token is ever stored,
 * so the only credential at rest is the one that is useless without our client secret. The cost
 * is one extra HTTP call per send, which is nothing beside an email.
 *
 * Fails closed on every branch: not connected, revoked, expired, missing secret, or a refresh
 * Google refuses (which means the founder revoked us on their side).
 */
export async function resolveGrant(
  admin: SupabaseClient,
  founderId: string,
  provider: string,
): Promise<ResolvedGrant> {
  const { data, error } = await admin
    .from('connector_grants')
    .select('*')
    .eq('founder_id', founderId)
    .eq('provider', provider)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw new ConnectorError('read_failed', `Could not read the connection: ${error.message}`)
  if (!data) {
    throw new ConnectorError('not_connected', `${provider} is not connected. Connect it to continue.`)
  }

  const row = data as GrantRow
  if (!row.token_ref) {
    // A grant with no reference cannot possibly work. Loud, because it means the row and the
    // vault diverged — recordGrant is written to make this impossible.
    log.error('active grant has no token_ref', { grantId: row.id, provider })
    throw new ConnectorError('no_credential', `${provider} needs reconnecting.`)
  }

  const refreshToken = await resolveSecret(admin, row.token_ref)

  // Mint a fresh access token. A refusal from GOOGLE means the grant is genuinely dead — usually
  // the founder revoked us at myaccount.google.com — so mark it expired and let the UI ask for a
  // reconnect rather than failing silently on every future send.
  //
  // ⚠️ ONLY a refusal from Google. An error raised on OUR side (missing client credentials, a
  // network failure, the vault being unreachable) says nothing about whether the founder still
  // consents. Treating those the same way meant a local misconfiguration silently marked a
  // perfectly good connection dead and made the founder reconnect for no reason — which is what
  // happened the first time a script ran without the client env set. Our own faults leave the
  // grant exactly as it was, so the next correctly-configured attempt just works.
  let accessToken: string
  try {
    accessToken = (await refreshAccessToken(refreshToken)).accessToken
  } catch (err) {
    const ourFault = err instanceof ConnectorError && err.code === 'not_configured'
    if (ourFault) {
      log.error('cannot refresh — the connector is misconfigured on our side', { provider })
      throw err
    }
    await admin
      .from('connector_grants')
      .update({ status: 'expired', expires_at: new Date().toISOString() })
      .eq('id', row.id)
    log.warn('grant marked expired — google refused the refresh', { grantId: row.id, provider })
    throw err
  }

  return {
    grantId: row.id,
    founderId: row.founder_id,
    provider: row.provider,
    accessToken,
    accountEmail: row.account_email,
    scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
  }
}

/** Swap the stored credential after a refresh, keeping the same ref so the grant never changes. */
export async function refreshCredential(
  admin: SupabaseClient,
  args: { grantId: string; secret: string; expiresAt: string | null },
): Promise<void> {
  const { data, error } = await admin
    .from('connector_grants')
    .select('token_ref')
    .eq('id', args.grantId)
    .maybeSingle()

  if (error || !data?.token_ref) {
    throw new ConnectorError('no_credential', 'Could not find the credential to refresh.')
  }

  await updateSecret(admin, { tokenRef: data.token_ref as string, secret: args.secret })
  await admin.from('connector_grants').update({ expires_at: args.expiresAt }).eq('id', args.grantId)
}

/**
 * Disconnect a provider.
 *
 * ORDER IS THE WHOLE POINT, and it is deliberately not the obvious one:
 *   1. tell the PROVIDER to forget us — the only step that actually stops sending
 *   2. mark the row revoked
 *   3. delete the vault secret
 *
 * If step 1 fails we stop, leaving an active grant we still know about. The tempting order
 * (delete our copy first) would leave a token that still works at Google with nothing on our
 * side pointing at it — unrevokable, because we threw away the handle.
 *
 * Step 3 failing is survivable: the grant is already revoked, so the orphan is inert.
 */
export async function revokeGrant(
  admin: SupabaseClient,
  founderId: string,
  provider: string,
): Promise<void> {
  const grant = await resolveGrant(admin, founderId, provider)

  // 1. Upstream first. A failure here aborts — better a connection we know is live than a
  //    credential we can no longer reach.
  await getConnector(provider).revoke(grant)

  // 2. Ours. From here the system will refuse to use it regardless of the vault.
  const { error } = await admin
    .from('connector_grants')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', grant.grantId)
  if (error) throw new ConnectorError('write_failed', `Could not revoke: ${error.message}`)

  // 3. Best-effort cleanup. The row is already revoked, so a leftover secret is unreachable —
  //    worth logging, not worth failing the founder's disconnect over.
  const { data } = await admin
    .from('connector_grants').select('token_ref').eq('id', grant.grantId).maybeSingle()
  if (data?.token_ref) {
    await deleteSecret(admin, data.token_ref as string).catch(() => {
      log.error('vault secret left behind after revoke', { grantId: grant.grantId })
    })
  }

  log.info('connector revoked', { provider, grantId: grant.grantId })
}
