/**
 * F13 — the secret store. Supabase Vault (ADR-032).
 *
 * The database stores a `token_ref`; the credential lives in the vault. Verified before this was
 * chosen, not assumed:
 *   · `vault.secrets` holds ciphertext — a database dump yields nothing usable
 *   · `authenticated` has NEITHER `USAGE` on the vault schema NOR `SELECT` on
 *     `vault.decrypted_secrets`
 *
 * That second property is the load-bearing one: a founder who somehow obtained another founder's
 * `token_ref` still could not resolve it. Two independent failures are required for a token to
 * leak, not one.
 *
 * ⚠️ SERVICE-ROLE ONLY. Every function here must be called from a server path. There is no
 * user-scoped read of a secret, by design.
 *
 * ⚠️ Never log a resolved token. Not at debug level, not in an error message, not "temporarily".
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'

export class VaultError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'VaultError'
    this.code = code
  }
}

/**
 * Store a credential and return its `token_ref`.
 *
 * The name is scoped per founder and provider so two founders connecting the same provider never
 * collide, and so an operator reading `vault.secrets` can tell rows apart without decrypting.
 * The name is NOT a secret and must never contain one.
 */
export async function storeSecret(
  admin: SupabaseClient,
  args: { founderId: string; provider: string; secret: string },
): Promise<string> {
  const name = `connector:${args.provider}:${args.founderId}`
  const { data, error } = await admin.rpc('create_secret_for_connector', {
    p_secret: args.secret,
    p_name: name,
  })

  if (error) {
    // The message may quote the statement, so it is deliberately NOT interpolated into ours.
    log.error('vault write failed', { provider: args.provider, code: error.code })
    throw new VaultError('write_failed', 'Could not store the credential securely.')
  }
  if (!data) throw new VaultError('write_failed', 'The vault returned no reference.')
  return data as string
}

/**
 * Resolve a `token_ref` back to the credential.
 *
 * @throws VaultError — and the caller must FAIL CLOSED on it. A missing or unreadable secret is
 *         never a reason to proceed without one: no cached token, no "try anyway", no degraded
 *         send (CLAUDE.md §3).
 */
export async function resolveSecret(admin: SupabaseClient, tokenRef: string): Promise<string> {
  const { data, error } = await admin.rpc('read_secret_for_connector', { p_id: tokenRef })

  if (error) {
    log.error('vault read failed', { code: error.code }) // never the ref, never the value
    throw new VaultError('read_failed', 'Could not read the stored credential.')
  }
  if (!data) {
    // The grant points at a secret that is gone. Fail closed and loudly — this means the grant
    // row and the vault have diverged, which someone needs to know about.
    throw new VaultError('not_found', 'The stored credential is missing. Reconnect this account.')
  }
  return data as string
}

/** Replace a credential in place, keeping the same `token_ref`. */
export async function updateSecret(
  admin: SupabaseClient,
  args: { tokenRef: string; secret: string },
): Promise<void> {
  // Same ref on purpose: the grant row never changes, so there is no window where it points at
  // nothing. Token refresh happens far more often than connect, so this is the hot path.
  const { error } = await admin.rpc('update_secret_for_connector', {
    p_id: args.tokenRef,
    p_secret: args.secret,
  })
  if (error) {
    log.error('vault update failed', { code: error.code })
    throw new VaultError('write_failed', 'Could not update the stored credential.')
  }
}

/**
 * Delete a credential.
 *
 * Called on revocation, AFTER the provider has been told — so a failure leaves us holding a
 * still-valid grant we know about, rather than an orphaned token we have lost the reference to.
 */
export async function deleteSecret(admin: SupabaseClient, tokenRef: string): Promise<void> {
  const { error } = await admin.rpc('delete_secret_for_connector', { p_id: tokenRef })
  if (error) {
    log.error('vault delete failed', { code: error.code })
    throw new VaultError('delete_failed', 'Could not delete the stored credential.')
  }
}
