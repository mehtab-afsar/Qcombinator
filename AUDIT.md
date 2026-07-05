# Edge Alpha — Full Codebase Audit

**Date:** 2026-07-05 · **Snapshot:** commit `3f6cf98` · **Auditor:** Claude (multi-agent review: backend/security, frontend, devops/QA + manual verification of every critical claim)

---

## 0. What this project actually is

**Edge Alpha** is a dual-sided marketplace built on one core asset: the **Q-Score** — a deterministic 0–100 startup quality score computed across six parameters (P1 Market Readiness, P2 Market Potential, P3 IP/Defensibility, P4 Founder/Team, P5 Structural Impact, P6 Financials).

- **Founder side:** a profile builder (LLM-assisted evidence extraction) feeds the Q-Score engine; nine AI agents (Patel/GTM, Felix/finance, Maya/brand, Nova/product, Atlas/competitive, Harper/hiring, Leo/legal, Susi/sales, Sage/strategy) produce real deliverables (ICP docs, financial models, hiring plans…) that raise dimension scores. Freemium: free tier (50 chats/mo) → $49/mo premium.
- **Investor side:** scored deal flow filtered by sector/stage, startup deep-dives assembled from founder artifacts, pipeline, portfolio tracking, connection requests. Free tier gated; Pro subscription.
- **Stack:** Next.js 16 (App Router, Turbopack), Supabase (Postgres + RLS, ~70 tables), LLM router (Groq llama-3.3-70b / Anthropic Claude Haiku / OpenRouter fallback), Stripe, Resend, Upstash Redis rate limiting, Sentry + PostHog, Vercel (5 cron jobs).
- **Scale:** 275 API routes, ~30 migrations, 879 lines unit tests + 1,119 lines Q-Score tests + 3,939 lines Playwright E2E.

**The honest one-liner:** the product core (Q-Score engine, agent system, security posture) is far stronger than typical MVP-stage code — but **billing is broken in production**, **CI cannot fail**, and the landing page undersells the product. Those three things gate the ship date; almost nothing else does.

---

## 1. Verdict at a glance

| Area | Grade | One line |
|---|---|---|
| Security | **A−** | Genuinely hardened: auth on all routes, RLS everywhere, CSRF, rate limits, webhook signatures. Minor hardening items only. |
| Q-Score engine | **A** | Deterministic, confidence-weighted, sector-adaptive, well-tested. This is the moat — treat it that way. |
| Backend architecture | **B−** | Sound patterns, but 275 routes (170+ per-agent) is sprawl a solo dev cannot maintain. |
| Billing | **F → A− after fix** | Webhook handler throws on every event (verified at runtime). Revenue is zero until fixed. ~1 hour of work. |
| CI/CD | **D** | 159 E2E tests exist; none can fail the build. `continue-on-error: true` everywhere + hardcoded "✅ passed". |
| Frontend | **B** | Consistent inline-style system, good copy. Monolith pages (3,099-line profile builder), no reduced-motion, a11y gaps. |
| Observability | **B+** | Sentry + PostHog (10 funnel events) + structured logs. Missing: Web Vitals, cron alerting. |
| Docs | **B** | Excellent `docs/PLATFORM_ARCHITECTURE.md` (39KB); no root README. |

---

## 2. Critical findings (fix before shipping)

### 🔴 C1 — Stripe webhook throws on EVERY event: billing is dead

`app/api/webhooks/stripe/route.ts:34-42`:

```ts
const { count } = await admin
  .from('processed_webhook_events')
  .insert({ event_id: event.id, ... }, { count: 'exact' })
  .onConflict('event_id')   // ❌ does not exist in supabase-js v2
  .ignore()                 // ❌ does not exist
```

**Verified at runtime** (supabase-js 2.93.3): `typeof builder.onConflict === 'undefined'`. This chain throws `TypeError` on line 41 — which is **outside the `try` block that starts at line 48** — so every webhook event returns 500. Consequences:

- `checkout.session.completed` never processes → paying customers stay on free tier.
- Stripe retries for ~3 days, then marks the endpoint failing.
- It compiled because `createAdminClient()` (`lib/supabase/server.ts:48`) returns an untyped client — the `any` schema generic swallows the invalid chain. TypeScript strict mode was blind here.

**Fix** (also handles retry dedup correctly):

```ts
const { error: dedupErr, count } = await admin
  .from('processed_webhook_events')
  .upsert(
    { event_id: event.id, source: 'stripe', processed_at: new Date().toISOString() },
    { onConflict: 'event_id', ignoreDuplicates: true, count: 'exact' }
  )
if (dedupErr) { /* log + 500 so Stripe retries */ }
if (count === 0) return NextResponse.json({ received: true, deduplicated: true })
```

### 🔴 C2 — CI cannot fail: 3,939 lines of E2E tests gate nothing

`.github/workflows/e2e-tests.yml:50-68` — all five Playwright phases carry `continue-on-error: true`. Then:

- `:90-100` — the summary step **hardcodes** "✅" for every phase regardless of outcome.
- `:102-105` — `quality-gates` runs with `if: always()` and echoes "✅ Quality gates passed" unconditionally.
- `:122-125` — `deploy-check` runs with `always()` and prints "READY FOR PRODUCTION" even if every test failed.

A red test suite produces a green check-mark on main. **Fix:** drop `continue-on-error` from Phase 1 (critical paths), make `quality-gates`/`deploy-check` require success (remove `always()`), keep artifact uploads on `always()`. Note: the workflow only passes 3 secrets (`:10-12`) — many tests likely need more env and are probably already failing invisibly; check the uploaded reports after the gate is live.

### 🔴 C3 — Webhook trusts malformed sessions (blind casts)

`app/api/webhooks/stripe/route.ts:60-61, 85-86` — `session.customer as string` / `session.subscription as string`. Stripe types these `string | Customer | null`; a session without a subscription (or with expanded objects) writes `null`/garbage into `stripe_customer_id`/`stripe_subscription_id`, which later breaks `customer.subscription.updated/deleted` lookups (`:110, :129` match on `stripe_subscription_id`). Missing `metadata.user_id` silently `break`s with no log (`:54`). **Fix:** guard clause extracting string IDs, log skipped events, ack 200 (retry can't fix a malformed session).

### 🟠 C4 — Usage meter always reads 0

`app/api/founder/billing/status/route.ts:28` selects `used_count`; the column is `usage_count` (`supabase/migrations/20250101000001_create_tables.sql:47`, confirmed by the RPC in `20260512000003_increment_usage_rpc.sql`). PostgREST errors, the route ignores `error`, `usageRows` is null → every founder sees 0/50 chats used forever. Enforcement via the `increment_usage` RPC still works — but the display lies, which kills upgrade pressure (nobody upgrades when they never see a limit approaching). **Fix:** one-line column rename in the select + read `row.usage_count`.

---

## 3. Expert panel

### 3.1 Senior Backend Engineer — B−

**Good:** consistent `verifyAuth()` early-return pattern across routes; `Promise.all` for parallel queries (`billing/status/route.ts:19-31`); webhook idempotency table with the right instinct (execution broken, see C1); LLM router with task-class → model-tier mapping (`lib/llm/router.ts`) is a clean abstraction; graceful degradation patterns (waitlist secondary inserts non-fatal).

**Wrong:**
- **Severity High — Route sprawl.** 275 routes, of which 170+ are per-agent one-offs (`/api/agents/atlas/*` ×17, `/api/agents/leo/*` ×17, …). Each is a copy-paste surface for auth/validation drift. A solo dev cannot keep 275 files consistent. *Fix (post-launch): collapse per-agent routes into `/api/agents/[agentId]/[action]/route.ts` with a capability registry — the 9 system prompts already centralize behavior; routes should too.*
- **Severity High — Untyped Supabase clients.** C1 proved the cost: invalid API chains compile. *Fix: generate DB types (`supabase gen types typescript`) and type `createAdminClient(): SupabaseClient<Database>` in `lib/supabase/server.ts:48`. One import, entire class of bug eliminated.*
- **Severity Medium — Hardcoded plan limits** in `billing/status/route.ts:6-9` AND duplicated in the webhook (`webhooks/stripe/route.ts:69-93`) AND in the RPC defaults. Three sources of truth. *Fix: single `lib/billing/plans.ts` constant imported by all three.*
- **Severity Low — `nextMonthStart()` uses server-local timezone** (`webhooks/stripe/route.ts:9-12`); on Vercel (UTC) fine, but fragile. Use `Date.UTC`.

### 3.2 Security Engineer — A−

**Confirmed strong (all verified, not assumed):** `.env*` gitignored; no hardcoded secrets; service-role key server-side only; RLS enabled with `auth.uid()` policies incl. the cleanup migration `20260421000008_fix_missing_rls.sql`; CSRF origin checks on mutating `/api` calls (`middleware.ts:133-152`); security headers incl. 2-year HSTS preload (`next.config.ts:17-30`); Stripe + Resend webhook signature verification; no stack traces in responses; user-supplied Felix Stripe key is `rk_`-validated, ephemeral, never stored; prompt-injection surface low (system prompts are constants; user text only enters the message array).

**Hardening list (none blocking):**
- **Medium — Rate limiter fails open silently.** `middleware.ts:23-32`: missing/erroring Upstash → `_redisUnavailable = true` forever, no log, no metric. An attacker who can induce Redis failure gets unlimited signup/LLM calls. *Fix: `log.warn` once on fallback + Sentry breadcrumb; consider in-memory fallback limiter for auth routes.*
- **Medium — `/api/qscore/calculate` is rate-limited (`middleware.ts:11`) but exploration found no such route** — dead rule; meanwhile `/api/agents/generate` at 5/min has no per-user (vs per-IP) key check worth confirming.
- **Low — Admin auth is copy-paste** (email whitelist per route). Centralize into `verifyAdmin()` next to `lib/auth/verify.ts`.
- **Low — Cron routes:** add Vercel cron IP allowlist on top of `CRON_SECRET`.

### 3.3 Senior Frontend Engineer — B

**Good:** coherent inline-style design system driven by `lib/constants/colors.ts`; the agent-page modularization (22,617 → 1,123 lines) shows the refactor muscle exists; investor dashboard (609 lines, 5 useState) is the model to copy.

**Wrong:**
- **High — Monoliths remain:** `app/founder/profile-builder/page.tsx` (3,099 lines), `app/founder/dashboard/page.tsx` (1,909 lines, 25 useState / 7 useEffect — this audit found a build-breaking missing-state bug there yesterday, which is what monoliths do), `app/founder/settings/page.tsx` (1,471). *Fix: apply the same `features/` extraction already proven on the agents page.*
- **Medium — Landing page** (`app/page.tsx`, 773 lines): good copy, but no 3D/differentiation, no `prefers-reduced-motion` anywhere in the repo, zero alt text, hover-only affordances (`onMouseEnter` handlers, `:209-210`), no page-level metadata, no robots.ts/sitemap.ts/JSON-LD. *(Being rebuilt — see Part C of the shipping plan.)*
- **Low — Dead export:** `landingTheme` in `lib/constants/colors.ts:33-69` unused (the rebuild will use it).

### 3.4 DevOps / Platform — D (dragged down by C2)

**Good:** Sentry across client/server/edge with replay masking; structured JSON logger used consistently; 38 env vars documented in `.env.example` with retrieval instructions; idempotent seed scripts; `vercel.json` crons.

**Wrong:** C2 (CI theater). **Medium:** no alerting when the 5 cron jobs fail (a dead `drip-emails` cron is invisible). **Medium:** CI runs tests against `npm run dev &` — dev-mode behavior diverges from prod; use `npm run build && npm run start`. **Low:** Node 18 in CI (`e2e-tests.yml:22`) vs Next 16 preferring Node 20+.

### 3.5 QA / Test Engineer — B−

**Good:** real test pyramid exists — Q-Score calculator invariants (bounds, determinism, stage inference) covered by 1,119 lines; RLS policy tests; 19 Playwright specs spanning flows/API/perf/security/a11y.

**Gaps:** no checkout → webhook → DB-state round-trip test (would have caught C1 instantly — the single highest-ROI test to add); no unit test for the webhook handler at all; middleware (rate limit, CSRF) untested; tests can't fail CI (C2).

### 3.6 Product Manager — B+

**Sharp value prop:** "become fundable, then raise" with the Q-Score as progress bar is genuinely differentiated vs. generic AI-copilot tools. The agent → artifact → score-boost loop is a real habit loop.

**Concerns:**
- **High — Feature breadth vs. depth:** 9 agents × ~15 routes each, academy, feed, merch page, pitch deck generator, surveys, NDA generator… For launch, the funnel that matters is: sign up → profile builder → first Q-Score → first artifact → score boost → share/connect. Everything not on that path is maintenance debt right now.
- **High — Two-sided cold start:** investor side needs live founders to be worth anything. Recommend launching founder-side only, with investor deal flow as the carrot ("847 investors waiting" framing), activating investors once ≥50 scored founders exist.
- **Metric blindness is solved on paper** (10 PostHog events in `lib/analytics.ts`) — but nobody has defined activation. Recommend: activation = first Q-Score computed; north star = weekly scored founders sharing their score.

### 3.7 UI/UX + Accessibility — C+

Onboarding flow is coherent; empty states exist on dashboards. But: no `prefers-reduced-motion` (WCAG 2.3.3), missing alt text, no visible focus styles on custom buttons, FAQ accordions without `aria-expanded` (`app/page.tsx:673`), hover-only interactions. The landing rebuild addresses all of these on the marketing surface; the app pages should follow the same checklist afterwards.

### 3.8 Data / Analytics — B

Instrumented: signup, onboarding, profile-builder completion, agent messages, artifacts, Q-Score milestones, match views, connections, upgrade, churn. Missing: Web Vitals; funnel-step timing (time-to-first-score is THE activation metric); LLM cost per user (Helicone key exists in `.env.example` — wire it); PostHog events fire-and-forget with no delivery monitoring.

### 3.9 Growth / Marketing — C+

Positioning is strong; discovery is absent: no robots.ts, no sitemap.ts, no structured data, no blog/SEO surface, single OG image. The Q-Score itself is the growth loop — the `/q/[userId]` public share pages exist (`middleware.ts` PUBLIC_PREFIXES) but nothing on the landing page drives "share your score" virality. Quick win: make score-sharing a first-class CTA post-assessment.

### 3.10 Tech Lead synthesis — the real state

This is a **late-MVP codebase with an early-MVP process wrapped around it**. Code quality, security, and the scoring engine are ahead of stage; release engineering (CI gate, billing verification, type-safety at the DB boundary) is behind stage. The debt inventory is: 3 monolith pages, route sprawl, triple-source plan limits, untyped DB client. None of it blocks launch. C1–C4 do.

---

## 4. Prioritized recommendations (Impact × Effort)

| # | Item | Impact | Effort | Priority |
|---|---|---|---|---|
| 1 | Fix webhook idempotency TypeError (C1) | Revenue exists | 30 min | **NOW** |
| 2 | Webhook field guards (C3) | Billing integrity | 30 min | **NOW** |
| 3 | Fix `used_count` → `usage_count` (C4) | Upgrade pressure works | 10 min | **NOW** |
| 4 | CI gate (C2) | Tests mean something | 30 min | **NOW** |
| 5 | Landing page rebuild (3D Q-Prism, SEO, a11y) | Conversion + credibility | 2–3 days | **This week** |
| 6 | Checkout→webhook round-trip test | Never break revenue again | 2–3 h | This week |
| 7 | Typed Supabase clients (`gen types`) | Kills the C1 bug class | 2–4 h | This week |
| 8 | robots.ts / sitemap.ts / JSON-LD | Discoverable at all | 1 h | This week (in #5) |
| 9 | Rate-limiter fail-open logging | Attack visibility | 30 min | This month |
| 10 | Single `lib/billing/plans.ts` source of truth | No limit drift | 1 h | This month |
| 11 | Cron failure alerting (Sentry check-ins) | Silent-death detection | 2 h | This month |
| 12 | Split profile-builder + dashboard monoliths | Velocity, fewer regressions | 2–3 days | This month |
| 13 | Time-to-first-score funnel timing in PostHog | Know your activation | 2 h | This month |
| 14 | CI: prod build + Node 20 + full env | Tests match prod | 2 h | This month |
| 15 | Collapse per-agent routes → `[agentId]/[action]` | Halve maintenance surface | 1–2 wk | This quarter |
| 16 | `verifyAdmin()` centralization + cron IP allowlist | Hardening | 2 h | This quarter |
| 17 | Root README (pitch + quickstart + arch links) | Onboarding/fundraise | 1 h | This quarter |
| 18 | Web Vitals + LLM cost tracking (Helicone) | Perf + unit economics | 0.5 day | This quarter |

**Quick wins (this week):** #1–8. **Medium (this month):** #9–14. **Strategic (this quarter):** #15–18.

---

## 5. Top 5 risks

1. **Revenue path silently broken (C1).** Already real. Defuse: fix + round-trip test + Stripe CLI replay before launch.
2. **Solo-dev bus factor × 275 routes.** Every week of feature breadth adds maintenance the one maintainer can't repay. Defuse: freeze new surfaces until launch; consolidate routes in Q3.
3. **Two-sided cold start.** Investors arrive to an empty shelf → churn → founders lose the carrot. Defuse: founder-first launch; seed investor side with the 18 test companies' anonymized profiles; activate investors at ≥50 real scored founders.
4. **Q-Score credibility.** One founder gaming the score (self-reported data, LLM extraction quirks) in front of one investor damages the core asset. Defuse: confidence multipliers already exist — surface them to investors ("verified vs self-reported"); keep the Stripe-verified MRR badge prominent.
5. **Green-but-broken deploys (C2).** CI theater means regressions ship undetected. Defuse: gate now; expand the gated set as flaky tests are fixed.

---

## 6. 90-day roadmap

**Weeks 1–2 — Ship-blockers:** C1–C4 fixed + webhook round-trip test + Stripe CLI verification; landing page rebuild live; robots/sitemap/JSON-LD; typed Supabase clients.
**Weeks 3–4 — Launch founder side:** activation funnel dashboards (time-to-first-score); score-share CTA; cron alerting; root README; soft launch to a founder community cohort.
**Weeks 5–8 — Tighten the loop:** split the two monolith pages; single plans source; usage-limit UX (upgrade nudges now that the meter works); watch funnel, cut features that <5% touch; begin route consolidation.
**Weeks 9–12 — Open investor side:** when ≥50 scored founders: activate investor onboarding, verified-data badges in deal flow, connection loop; Helicone LLM cost per user; pricing experiment on the $49 tier.

## 7. Five metrics to track from day one

1. **Time-to-first-Q-Score** (signup → first score computed) — activation.
2. **Weekly scored founders** (founders with a score update that week) — north star.
3. **Artifact→boost rate** (% of agent artifacts that trigger a score signal) — habit loop health.
4. **Free→premium conversion after first limit-hit** — monetization (measurable only after C4 fix).
5. **LLM cost per weekly-active founder** — unit economics guardrail.

---

*Full methodology: three parallel exploration agents (backend/security, frontend, devops/QA) over the entire repo, followed by manual runtime verification of every critical claim (the supabase-js API check was executed against the installed 2.93.3 package). File:line references are exact as of commit `3f6cf98`.*
