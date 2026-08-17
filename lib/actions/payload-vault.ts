/**
 * F14 — where the real payload lives between generation and approval.
 *
 * Reads and deletes reuse `lib/connectors/vault.ts`'s `resolveSecret`/`deleteSecret` directly,
 * unchanged — both operate purely by id, so they're safe to share regardless of how the secret
 * was named at creation. No new RPC for either.
 *
 * Storing does NOT reuse `storeSecret`: that function fixes the vault secret's name to
 * `connector:${provider}:${founderId}` — exactly right for a connector grant (one live
 * credential per founder+provider, ever), wrong here (a founder can have several Actions
 * pending approval at once, each needing its OWN payload, not one shared slot that the next
 * pending Action would silently overwrite). So this calls the SAME underlying
 * `create_secret_for_connector` RPC directly, with a name unique per payload — still zero new
 * Postgres surface, just a different caller of an already-generic function.
 *
 * ⚠️ SERVICE-ROLE ONLY, same as vault.ts itself — never called from a client-exposed path
 * without an ownership check in front of it (see app/api/actions/[id]/payload/route.ts).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { resolveSecret, deleteSecret, VaultError } from '@/lib/connectors/vault'
import { log } from '@/lib/logger'
import type { ActionPayload } from './payload'

/** Store a payload and return its `payload_ref`. */
export async function storePayload(
  admin: SupabaseClient,
  founderId: string,
  payload: ActionPayload,
): Promise<string> {
  // Unique per call, unlike storeSecret's fixed connector:${provider}:${founderId} — a founder
  // can have several Actions pending at once, each needing its own slot.
  const name = `action-payload:${founderId}:${randomUUID()}`
  const { data, error } = await admin.rpc('create_secret_for_connector', {
    p_secret: JSON.stringify(payload),
    p_name: name,
  })
  if (error) {
    log.error('payload vault write failed', { code: error.code })
    throw new VaultError('write_failed', 'Could not store the payload securely.')
  }
  if (!data) throw new VaultError('write_failed', 'The vault returned no reference.')
  return data as string
}

/**
 * Resolve a `payload_ref` back to the real payload.
 *
 * @throws VaultError — same fail-closed contract as resolveSecret. A missing or unreadable
 *   payload is never a reason to proceed without one.
 */
export async function resolvePayload(admin: SupabaseClient, payloadRef: string): Promise<ActionPayload> {
  const raw = await resolveSecret(admin, payloadRef)
  try {
    return JSON.parse(raw) as ActionPayload
  } catch {
    throw new VaultError('read_failed', 'The stored payload was not valid JSON.')
  }
}

/** Delete a payload once it's served its purpose — approved-and-executed, declined, or expired. */
export async function deletePayload(admin: SupabaseClient, payloadRef: string): Promise<void> {
  return deleteSecret(admin, payloadRef)
}
