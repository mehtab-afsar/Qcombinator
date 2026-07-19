-- F12 fix — the append-only trigger must not block ACCOUNT DELETION.
--
-- Found by the Story-2 end-to-end test: deleting an auth user cascades
-- auth.users → founder_profiles → executive_briefings, and the append-only trigger
-- rejected the cascade — so a founder with even one briefing could never delete their
-- account (right-to-erasure). The guarantee we want is "no one edits or prunes briefing
-- history", not "briefings outlive the founder".
--
-- The distinction is trigger depth: a DIRECT delete fires this trigger at depth 1 and
-- stays forbidden; a CASCADED delete (from the founder row going away) fires it at
-- depth > 1 and is allowed. UPDATE remains forbidden unconditionally.
--
-- Idempotent (CREATE OR REPLACE; trigger unchanged). Reversible: restore the previous
-- function body from 20260715000007.

create or replace function executive_briefings_append_only()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    -- Cascaded from a parent row's deletion (account erasure) — allowed.
    return old;
  end if;
  raise exception 'executive_briefings are append-only: % is not permitted', tg_op
    using errcode = 'check_violation';
  return null;
end;
$$;
