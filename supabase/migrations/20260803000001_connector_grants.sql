-- F13 — the Connector vault: which providers a founder has authorised, and a REFERENCE to the
-- credential. Never the credential itself.
--
-- ADR-031 named this table (`connector_grants`, not `connections` — `connection_requests`
-- already owns that word for founder↔investor intros; not "mandate" — that means the Executive
-- Contract, whose immutability rules are load-bearing).
--
-- ADR-032: the secret lives in Supabase Vault. `token_ref` is a `vault.secrets.id`. Verified
-- before choosing: a raw dump of vault.secrets yields ciphertext only, and `authenticated` has
-- neither USAGE on the vault schema nor SELECT on vault.decrypted_secrets — so a founder who
-- somehow obtained a token_ref still cannot resolve it. Two independent failures are required
-- for a token to leak, not one.
--
-- ⚠️ The existing precedent in this database is the opposite and must not be copied:
-- `linear_tokens.api_key` and `founder_profiles.{calendly,posthog,fireflies}_api_key` store
-- credentials in PLAINTEXT, and linear_tokens' RLS lets the browser read the raw key. Those are
-- old-model and frozen (ADR-014).
--
-- Design: F13_F14_DESIGN.md §2. Additive, idempotent, reversible.

create table if not exists connector_grants (
  id            uuid primary key default gen_random_uuid(),
  founder_id    uuid not null references founder_profiles(user_id) on delete cascade,
  -- Matches ActionDef.connector in the code Registry (ADR-010: the Registry is code, so this is
  -- deliberately a text value and NOT a foreign key to a providers table).
  provider      text not null,
  status        text not null default 'active'
                check (status in ('active', 'revoked', 'expired')),
  -- Exactly what was granted, as granted — so a later scope widening is visible, not silent.
  scopes        jsonb not null default '[]'::jsonb,
  -- A vault.secrets id. NEVER a token. Nullable because the row is written before the vault
  -- write is confirmed; a grant with a null token_ref is unusable by design (fail closed).
  token_ref     text,
  -- Which account this authorises, so the founder can tell one grant from another.
  account_email text,
  connected_at  timestamptz not null default now(),
  expires_at    timestamptz,
  revoked_at    timestamptz,
  last_used_at  timestamptz
);

-- THE load-bearing constraint: one ACTIVE grant per provider per founder, enforced by the
-- database rather than by a select-then-insert in application code — the same argument F11
-- makes for one-current-asset. Without it, a founder who double-clicks "connect" gets two active
-- grants and a coin-flip about which token sends.
-- Partial, so revoked and expired rows accumulate as history: nothing is pruned.
create unique index if not exists connector_grants_one_active_per_provider
  on connector_grants (founder_id, provider)
  where status = 'active';

create index if not exists connector_grants_founder
  on connector_grants (founder_id, status);

alter table connector_grants enable row level security;

-- Read-only for authenticated, exactly like asset_versions and executive_briefings: a grant's
-- lifecycle is the system's to manage. A founder revokes through a ROUTE (which also revokes
-- upstream at Google and deletes the vault secret), never by writing this table — otherwise a
-- row could say 'revoked' while the token remains live at the provider.
-- No INSERT/UPDATE/DELETE policy is deliberate, not an omission.
drop policy if exists "connector_grants_select_own" on connector_grants;
create policy "connector_grants_select_own"
  on connector_grants for select
  to authenticated
  using (auth.uid() = founder_id);

comment on table connector_grants is
  'F13 — authorised connectors per founder. token_ref points at a Supabase Vault secret (ADR-032); the credential is NEVER stored here. Read-only for authenticated; all writes server-side. One active grant per (founder, provider), DB-enforced.';
comment on column connector_grants.token_ref is
  'vault.secrets.id — a REFERENCE. Never a token, never plaintext, never logged (CLAUDE.md §3).';
comment on column connector_grants.scopes is
  'Exactly the scopes granted, as granted, so a later widening is visible rather than silent.';

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   drop policy if exists "connector_grants_select_own" on connector_grants;
--   drop index if exists connector_grants_founder;
--   drop index if exists connector_grants_one_active_per_provider;
--   drop table if exists connector_grants;
--
-- ⚠️ Dropping this table ORPHANS its vault secrets — the refs are the only pointer to them.
-- Revoke the grants first, which deletes the secrets, then drop.
