-- 10x Founder Leverage Check -- anonymous public diagnostic (marketing funnel).
--
-- NOT the Q-Score. CLAUDE.md: "The Q-Score is a separate diagnostic." This is a fully
-- independent 8-question quiz with its own scoring engine (features/leverage-check/scoring/**),
-- own archetype bands, and own LLM-generated copy. It shares only the archetype NAMES with
-- features/landing/copy.ts's LADDER (Founder Operated / AI Assisted / AI Leveraged / Agentic
-- Operator / 10x Founder) for consistent branding -- LADDER's scoreMin/scoreMax there are
-- Q-Score bands (0-100) and are NOT reused here; this quiz computes its own 1.0-10.0 "multiple"
-- from its own 8 answers. Do not cross-wire the two.
--
-- Genuinely anonymous submission: no auth.users row exists yet for most visitors (this quiz is
-- the funnel's TOP, before signup). Every existing public-write table (survey_responses,
-- waitlist_signups) requires a NOT NULL FK to auth.users -- that doesn't fit here. This table has
-- no such FK; linked_founder_id is nullable and populated later, only if the visitor eventually
-- signs up via the quiz's own CTA (app/api/auth/signup's leverageCheckId handling).
--
-- Write path is service-role only: the browser only ever calls our own
-- app/api/leverage-check/submit and app/api/leverage-check/link-email routes, which use
-- getAdminClient() server-side -- same as app/api/survey/route.ts and
-- app/api/webhook/lead/route.ts. No direct anon Supabase access is needed, so RLS is enabled
-- with ZERO permissive policies -- default-deny for anon/authenticated, service_role bypasses
-- RLS entirely regardless. Same pattern as qscore_history_dedup_audit and
-- processed_webhook_events (20260521000002_stripe_webhook_idempotency.sql) -- not a new idiom.

create table if not exists leverage_check_submissions (
  id                   uuid primary key default gen_random_uuid(),

  -- Raw answers as submitted: { q1: 'A', q2: 'C', ... } -- kept verbatim for re-scoring if the
  -- scoring engine's formula ever changes (CLAUDE.md: one source of truth; recomputing from raw
  -- answers is always possible, recomputing from a discarded dimension score is not).
  answers              jsonb   not null,

  -- Deterministic scoring engine output (features/leverage-check/scoring/calculate.ts) -- stored
  -- so the report never needs to be recomputed to be displayed or re-sent.
  dependency_score     integer not null check (dependency_score between 0 and 100),
  decision_score       integer not null check (decision_score between 0 and 100),
  execution_score      integer not null check (execution_score between 0 and 100),
  growth_score         integer not null check (growth_score between 0 and 100),
  management_score     integer not null check (management_score between 0 and 100),
  multiple             numeric(3,1) not null check (multiple between 1.0 and 10.0),
  archetype            text    not null check (archetype in (
                          'FOUNDER OPERATED', 'AI ASSISTED', 'AI LEVERAGED',
                          'AGENTIC OPERATOR', '10X FOUNDER'
                        )),
  strongest_dimension  text    not null,
  weakest_dimension    text    not null,

  -- LLM-generated copy -- parsed from routedText('generation', ...) via the SHORT_RESULT /
  -- FULL_REPORT marker split, or the local fallback template if the model didn't follow format
  -- or the call threw. Never null: a visitor always gets SOME result (see submit route).
  short_result         text    not null,
  full_report          text    not null,
  ai_generated         boolean not null default true,  -- false when the fallback template was used

  -- Funnel linkage -- populated later, non-blocking, only if the visitor submits the email CTA
  -- at the bottom of the full report. Nullable: most submissions never convert, and that's fine.
  email                text,
  linked_founder_id    uuid references auth.users(id) on delete set null,
  linked_at            timestamptz,

  created_at           timestamptz not null default now()
);

create index if not exists leverage_check_submissions_recent
  on leverage_check_submissions (created_at desc);

alter table leverage_check_submissions enable row level security;

-- No policies, on purpose (see header). service_role (getAdminClient()) bypasses RLS and is the
-- only writer/reader; anon/authenticated get nothing.

comment on table leverage_check_submissions is
  'Anonymous public "10x Founder Leverage Check" quiz submissions -- independent of Q-Score. Written only by app/api/leverage-check/submit and app/api/leverage-check/link-email (service role). linked_founder_id/linked_at are set later, non-blocking, by app/api/auth/signup when a visitor converts via the report''s email CTA.';
comment on column leverage_check_submissions.answers is
  'Raw { q1: "A".."D", ..., q8: "A".."D" } as submitted -- the source of truth the scoring columns are derived from. Kept so a future scoring-formula change can be backfilled by recomputation.';
comment on column leverage_check_submissions.ai_generated is
  'false when routedText threw or returned text without a FULL_REPORT marker and the local fallback template (features/leverage-check/report/fallback.ts) was used instead. Never blocks the response either way.';

-- --- Rollback ------------------------------------------------------------------------
--   drop index if exists leverage_check_submissions_recent;
--   drop table if exists leverage_check_submissions;
