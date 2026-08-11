-- PRD 2 Stage 2 Part B — live text for the Activation screen (F09 "the missing moment").
--
-- `streaming_text` is transient, not part of the permanent record: null except while a step is
-- actively generating, cleared by lib/rhythm/step's self-chain the moment that step finishes.
-- The settled preview (lib/rhythm/preview.ts, computed from the persisted Asset/Briefing) stays
-- the source of truth once a step lands — this column exists only so a founder watching
-- ActivationScreen sees the words appear as they're written, via Supabase Realtime, for a step
-- their own browser was never connected to (the self-chain runs server-to-server — see
-- lib/rhythm/trigger.ts's own docstring on triggerNextRhythmStep).
--
-- Additive, reversible. No RLS change needed: operating_rhythm_runs already has a founder-scoped
-- select_own policy (20260715000009), which is what makes a founder's own browser eligible to
-- subscribe to their own run row via Realtime in the first place.

alter table operating_rhythm_runs
  add column if not exists streaming_text text;

comment on column operating_rhythm_runs.streaming_text is
  'PRD 2 Stage 2 Part B — transient live text for the step currently generating. Never authoritative and never read back historically; cleared after every step. Founder-readable via the existing select_own RLS policy, pushed live via Realtime.';

-- ── Realtime: operating_rhythm_runs UPDATEs must reach a subscribed browser ──────────────────
--
-- Idempotent — `ALTER PUBLICATION ... ADD TABLE` has no IF NOT EXISTS form and errors
-- (SQLSTATE 42710) on a table already published, so this guards on the catalogue first
-- (same pattern as notifications', 20260523000001_misc_patches.sql).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'operating_rhythm_runs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE operating_rhythm_runs;
  END IF;
END $$;

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   alter publication supabase_realtime drop table operating_rhythm_runs;
--   alter table operating_rhythm_runs drop column if exists streaming_text;
