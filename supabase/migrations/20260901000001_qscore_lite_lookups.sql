-- Q-Score Lite -- public-evidence-only fundability score, cached by company domain.
--
-- NOT the real Q-Score. features/qscore/** is founder-self-reported; this is computed entirely
-- from public web evidence (Tavily search + GitHub), with zero founder input. Fully independent
-- scoring engine, fully independent table -- see features/qscore-lite/scoring/aggregate.ts's own
-- header comment for the full reasoning. Also independent from leverage_check_submissions (a
-- different diagnostic entirely, self-report-based, keyed by an anonymous submission id rather
-- than a company domain).
--
-- Genuinely anonymous, like leverage_check_submissions: no auth.users row exists yet for most
-- visitors. Write path is service-role only (app/api/qscore-lite/submit and
-- app/api/qscore-lite/link-email, via getAdminClient()) -- no direct anon Supabase access is
-- needed, so RLS is enabled with ZERO permissive policies, same pattern as
-- leverage_check_submissions and qscore_history_dedup_audit.
--
-- Keyed by normalized domain, not a fresh id per submission -- a second lookup for the same
-- company UPSERTS (replaces evidence/score), it does not append. Same "cache, not audit log"
-- shape as founder_pulled_data. Staleness is an app-level check in the submit route (pulled_at
-- older than 30 days triggers a full re-gather), not a DB trigger -- consistent with how
-- founder_pulled_data's staleness is handled entirely in application code.

create table if not exists qscore_lite_lookups (
  id                     uuid primary key default gen_random_uuid(),

  domain                 text not null,            -- normalized: lowercased host, no protocol/www/path
  company_name           text not null,             -- latest submitted display name for this domain
  url                    text not null,              -- latest submitted full URL as entered

  -- Raw evidence bundle (Tavily results + GitHub match, tagged with url/domain/publishedDate) --
  -- kept so a scoring-formula change can be recomputed without re-fetching. Shape: EvidenceItem[]
  -- (features/qscore-lite/evidence/gather.ts).
  evidence               jsonb not null,

  -- Full per-indicator breakdown (all 20: rawScore, citedUrls, directness, reliability, recency,
  -- corroboration, evidenceWeight, indicatorScore) -- IndicatorResult[]
  -- (features/qscore-lite/scoring/types.ts). Drives the results page's citation display.
  indicator_results      jsonb not null,

  qsl_score              numeric(5,2) not null check (qsl_score between 0 and 100),
  confidence_pct         numeric(5,2) not null check (confidence_pct between 0 and 100),
  active_indicator_count integer not null check (active_indicator_count between 0 and 20),
  ai_generated           boolean not null default true,  -- false when extraction fell back to all-null

  -- Funnel linkage -- identical shape to leverage_check_submissions. Populated later, non-blocking,
  -- only if the visitor uses the results page's email CTA.
  email                  text,
  linked_founder_id      uuid references auth.users(id) on delete set null,
  linked_at              timestamptz,

  pulled_at              timestamptz not null default now(),  -- last (re)compute -- staleness check
                                                                  -- reads this in app code
  created_at             timestamptz not null default now()
);

-- Upsert target, not append -- a second lookup for the same domain replaces the row.
create unique index if not exists qscore_lite_lookups_domain_idx
  on qscore_lite_lookups (domain);

create index if not exists qscore_lite_lookups_recent
  on qscore_lite_lookups (created_at desc);

alter table qscore_lite_lookups enable row level security;

-- No policies, on purpose (see header). service_role is the only reader/writer; anon/authenticated
-- get nothing.

comment on table qscore_lite_lookups is
  'Public-evidence-only "Q-Score Lite" cache, keyed by normalized company domain -- independent of the real Q-Score (features/qscore/**) and of leverage_check_submissions. Written only by app/api/qscore-lite/submit and app/api/qscore-lite/link-email (service role). linked_founder_id/linked_at are set later, non-blocking, by app/api/auth/signup when a visitor converts via the results page email CTA.';
comment on column qscore_lite_lookups.evidence is
  'Raw EvidenceItem[] bundle (Tavily + GitHub), kept so a scoring-formula change can be recomputed without re-fetching.';
comment on column qscore_lite_lookups.indicator_results is
  'Full IndicatorResult[] (20 entries) -- rawScore/citedUrls/directness/reliability/recency/corroboration/evidenceWeight per indicator, for citation display and audit.';
comment on column qscore_lite_lookups.ai_generated is
  'false when the LLM extraction call threw or its output failed parsing/validation and the all-null fallback state was used instead.';

-- --- Rollback ------------------------------------------------------------------------
--   drop index if exists qscore_lite_lookups_recent;
--   drop index if exists qscore_lite_lookups_domain_idx;
--   drop table if exists qscore_lite_lookups;
