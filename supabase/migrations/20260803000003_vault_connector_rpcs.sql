-- F13 — the four vault operations the Connector layer needs, as SECURITY DEFINER functions.
--
-- WHY FUNCTIONS RATHER THAN DIRECT TABLE ACCESS (ADR-032):
-- PostgREST cannot reach the `vault` schema, and it should not be able to. Wrapping each
-- operation in a narrow function means the server can store and resolve a credential while
-- NOTHING can enumerate the vault, dump it, or read a secret it wasn't handed the id for.
-- The surface is four verbs instead of a table.
--
-- ⚠️ EXECUTE IS GRANTED TO service_role ONLY, and REVOKED from public/anon/authenticated. A
-- founder must never be able to call these — `authenticated` already has no access to the vault
-- schema, and this keeps it that way through the RPC door as well. Verified after applying:
--   authenticated USAGE on vault      → false
--   authenticated SELECT decrypted    → false
--
-- Idempotent, additive, reversible.

create or replace function create_secret_for_connector(p_secret text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare
  v_id uuid;
begin
  select vault.create_secret(p_secret, p_name, 'Connector credential — F13/ADR-032') into v_id;
  return v_id;
end;
$$;

create or replace function read_secret_for_connector(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare
  v_secret text;
begin
  -- By id only. There is deliberately no "list" or "search" verb: a caller can resolve a
  -- reference it already holds and nothing more.
  select decrypted_secret into v_secret from vault.decrypted_secrets where id = p_id;
  return v_secret;
end;
$$;

create or replace function update_secret_for_connector(p_id uuid, p_secret text)
returns void
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
begin
  -- Same id, new value — token refresh must not change the ref the grant row points at.
  perform vault.update_secret(p_id, p_secret);
end;
$$;

create or replace function delete_secret_for_connector(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
begin
  delete from vault.secrets where id = p_id;
end;
$$;

-- ── Lock the doors ──────────────────────────────────────────────────────────────────
-- A SECURITY DEFINER function runs as its owner, so an over-broad EXECUTE grant here would hand
-- the vault to whoever could call it. Revoke first, then grant narrowly.
revoke execute on function create_secret_for_connector(text, text) from public, anon, authenticated;
revoke execute on function read_secret_for_connector(uuid)         from public, anon, authenticated;
revoke execute on function update_secret_for_connector(uuid, text) from public, anon, authenticated;
revoke execute on function delete_secret_for_connector(uuid)       from public, anon, authenticated;

grant execute on function create_secret_for_connector(text, text) to service_role;
grant execute on function read_secret_for_connector(uuid)         to service_role;
grant execute on function update_secret_for_connector(uuid, text) to service_role;
grant execute on function delete_secret_for_connector(uuid)       to service_role;

comment on function read_secret_for_connector(uuid) is
  'F13/ADR-032 — resolve a connector token_ref. service_role only; by id only (no enumeration). The returned value must never be logged.';

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   drop function if exists delete_secret_for_connector(uuid);
--   drop function if exists update_secret_for_connector(uuid, text);
--   drop function if exists read_secret_for_connector(uuid);
--   drop function if exists create_secret_for_connector(text, text);
-- ⚠️ Dropping these ORPHANS every stored credential — the functions are the only way in.
-- Revoke the grants first (which deletes the secrets), then drop.
