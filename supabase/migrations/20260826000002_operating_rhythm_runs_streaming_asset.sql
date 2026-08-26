-- Live-preview identity — the fix for a cross-executive data-correctness bug.
--
-- `streaming_text` (20260811000001) carries no identity: it is one text column keyed by run id,
-- and a run spans EVERY executive's Programs (ADR-008 — a cycle is whole-company). So any client
-- that believed it had a generating asset rendered whatever text happened to be in that column.
-- In practice that meant the COO's, CTO's and CFO's tabs showing the CGO's document body under
-- their own asset's name, and hiding the founder's real saved document behind it for the whole
-- cycle. The derivation bug that made those tabs believe they were generating is fixed in
-- lib/rhythm/progress.ts; this column is the other half — it lets a client VERIFY that the text
-- it is about to render belongs to the document it is showing, rather than inferring it.
--
-- ⚠️ Written in the SAME update as streaming_text, always (lib/rhythm/streaming.ts). Two separate
-- statements would produce two Realtime events, and the first would pair the new asset's opening
-- tokens with the previous asset's id — reintroducing exactly this bug in a narrower window.
--
-- `text`, deliberately: no FK, no CHECK. The Registry is TypeScript (ADR-010), so there is no
-- table to reference, and a Registry rename must never make a live run's UPDATE fail. It is
-- validated on read, in the client.
--
-- Additive, reversible. No publication change — operating_rhythm_runs joined supabase_realtime in
-- 20260811000001. No RLS change — the founder-scoped select_own policy (20260715000009) covers
-- new columns. No `replica identity full` — the client reads payload.new, which Realtime already
-- delivers as the complete row, so it would double WAL volume for nothing.

alter table operating_rhythm_runs
  add column if not exists streaming_asset_id text;

comment on column operating_rhythm_runs.streaming_asset_id is
  'Which Registry asset streaming_text currently belongs to (e.g. AS001). Transient, like the text itself: written in the SAME update so a Realtime subscriber can never pair new text with a stale id, and null whenever streaming_text is null. Never authoritative, never read back historically. text rather than a FK because the Registry is TypeScript (ADR-010).';

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   alter table operating_rhythm_runs drop column if exists streaming_asset_id;
