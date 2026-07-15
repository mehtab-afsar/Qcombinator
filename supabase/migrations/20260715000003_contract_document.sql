-- F08b — keep S002's Executive Contract document alongside the structured fields.
--
-- Why this column exists:
--
-- S002 produces eight sections — Executive Summary, Objectives, Strategic
-- Pathway, Asset Blueprint, Asset Dependencies, Success Metrics, Executive Risks,
-- and the one-page Contract. PRD §8's schema stores four arrays (priorities,
-- success_metrics, responsibilities, active_programs). Everything else had
-- nowhere to live.
--
-- The prompt itself calls the Contract "the most important output... the
-- agreement between the founder and the Edge Alpha Executive Team". Extracting
-- four arrays and discarding the rest would mean the founder approves a mandate
-- whose reasoning they never see — and ADR-003's audit trail ("what were we
-- operating under, when") would keep the WHAT and lose the WHY.
--
-- The structured arrays stay authoritative for the machine: F10's mandate
-- integrity check reads active_programs, never this text. This column is for
-- humans, and for the record.

alter table executive_contracts
  add column if not exists contract_document text;

comment on column executive_contracts.contract_document is
  'S002''s full Executive Contract document (markdown). Human-readable record of the mandate and its reasoning. NOT authoritative for execution — active_programs is. Null on contracts drafted before F08b, and on any deterministic fallback draft.';

-- The immutability trigger (20260715000002) must cover this too: the document is
-- part of the contract's content, and ADR-003 says content is never edited in
-- place. Replacing the function rather than adding a second trigger keeps one
-- source of truth for what "immutable" means here.
create or replace function executive_contracts_reject_content_edit()
returns trigger
language plpgsql
as $$
begin
  if new.priorities        is distinct from old.priorities
  or new.success_metrics   is distinct from old.success_metrics
  or new.responsibilities  is distinct from old.responsibilities
  or new.active_programs   is distinct from old.active_programs
  or new.contract_document is distinct from old.contract_document
  or new.strategy_id       is distinct from old.strategy_id
  or new.epoch             is distinct from old.epoch
  or new.version           is distinct from old.version
  then
    raise exception
      'executive_contracts are immutable (ADR-003): content cannot be edited in place. Issue a new epoch instead.'
      using errcode = 'check_violation';
  end if;

  if old.status = 'confirmed' and new.status = 'draft' then
    raise exception 'a confirmed contract cannot return to draft'
      using errcode = 'check_violation';
  end if;
  if old.status = 'superseded' and new.status <> 'superseded' then
    raise exception 'a superseded contract cannot be revived'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- CLAUDE.md §4: additive and reversible.
--
--   -- restore the trigger function without contract_document, then:
--   alter table executive_contracts drop column if exists contract_document;
--
-- Additive: one nullable column. Existing rows are unaffected; the trigger gains
-- one more protected column and loses nothing.
