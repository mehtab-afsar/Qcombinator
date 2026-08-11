-- Team Management, Phase 4 — the audit trail.
--
-- Not a reuse of action_log. action_log.action_id is validated in TypeScript against the
-- Registry before insert (see getAction(), ADR-010) — a team event like "role changed" has
-- no Registry entry. Its status CHECK ('pending_approval'|'approved'|'executed'|'failed'|
-- 'declined'|'unknown') and payload_hash/irreversible/provider/execution_id columns are
-- shaped for the Connector-approval boundary (F13/F14); none of that maps to "Alice invited
-- bob@x.com as member". Forcing it in would give one column two incompatible meanings —
-- exactly what CLAUDE.md's "one source of truth per fact" rule warns against. A dedicated
-- table costs one small migration, reusing action_log's own proven append-only shape.

CREATE TABLE IF NOT EXISTS team_audit_log (
  id             uuid primary key default gen_random_uuid(),
  startup_id     uuid not null references startups(id) on delete cascade,
  actor_id       uuid references auth.users(id) on delete set null,
  event          text not null check (event in
                   ('invited', 'invite_cancelled', 'invite_resent', 'joined',
                    'role_changed', 'removed', 'left')),
  target_email   text,
  target_user_id uuid references auth.users(id) on delete set null,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS team_audit_log_startup_recent
  ON team_audit_log (startup_id, created_at desc);

ALTER TABLE team_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_audit_log_select_members" ON team_audit_log;
CREATE POLICY "team_audit_log_select_members"
  ON team_audit_log FOR SELECT
  TO authenticated
  USING (startup_id IN (SELECT public.user_startup_ids()));  -- the EXISTING helper (20260806000001), not a new one

-- No insert/update/delete policy for authenticated — written server-side (admin client) from
-- the invite/members routes, same pattern as action_log and notifications.

-- The pg_trigger_depth() > 1 cascade carve-out is copied deliberately from action_log's own
-- trigger. action_log needed a follow-up fix (20260715000010_briefings_allow_cascade_delete.sql)
-- because an append-only table without this carve-out blocks account deletion entirely — the
-- DELETE cascading from `on delete cascade`/`on delete set null` above IS a DELETE, and a
-- naive append-only trigger rejects it just as readily as a direct one. Shipping the carve-out
-- from day one instead of hitting that bug twice.
CREATE OR REPLACE FUNCTION team_audit_log_append_only()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'team_audit_log is append-only: % is not permitted', TG_OP
    USING errcode = 'check_violation';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS team_audit_log_no_mutation ON team_audit_log;
CREATE TRIGGER team_audit_log_no_mutation
  BEFORE UPDATE OR DELETE ON team_audit_log
  FOR EACH ROW EXECUTE FUNCTION team_audit_log_append_only();
