# Edge Alpha — What's Left to Test & Build

> Generated 2026-03-10. Covers founder portal, investor portal, agents, infra, and known gaps.

---

## 1. Testing Gaps (Things Built But Not Validated End-to-End)

### Auth & Onboarding
- [ ] **Middleware redirect loop** — verify `/login?next=/founder/dashboard` correctly bounces back after sign-in, especially across incognito/session-expired states
- [ ] **Signup → auto-signin race** — test the fixed onboarding flow: create account → immediate `signInWithPassword` → redirect to dashboard. Confirm no race on slow connections.
- [ ] **Investor signup duplicate email** — test creating an investor account with an already-registered email returns a clean 409 + UI error (not a 500)
- [ ] **Auth rollback** — simulate a DB failure after `createUser` to confirm the orphaned auth user is deleted

### Agent Chat
- [ ] **8,000 char input cap** — send a message > 8,000 chars and confirm 400 response with correct error shown in UI
- [ ] **Token budget guard** — trigger with a user who has many artifacts (long MEMORY block > 6,000 chars) and confirm the system prompt is trimmed without breaking the agent response
- [ ] **429 retry** — mock OpenRouter returning 429 and confirm the retry-after wait + single retry works; after 2nd failure confirm correct error toast
- [ ] **30s timeout** — test what the UI shows when the AI call times out (504 toast expected)
- [ ] **Tool call parsing** — test all 16 tool call types produce the correct renderer in the UI: `lead_enrich`, `web_research`, `create_deal`, `competitive_matrix`, and all 12 artifact types

### Webhook
- [ ] **Resend webhook signature** — send a real test event from Resend dashboard with `RESEND_WEBHOOK_SECRET` set; confirm it passes. Then send with a bad signature and confirm 401.
- [ ] **Replay attack guard** — send a valid-signature payload with a timestamp > 5 minutes old; confirm 401
- [ ] **Unhandled event types** — send `email.delivery_delayed` and confirm `{ received: true, handled: false }` response (no DB writes)

### Q-Score
- [ ] **Activity boost idempotency** — call `/api/qscore/activity-boost` twice in one day for the same user; second call should return `boosted: false`
- [ ] **Priority cache** — call `/api/qscore/priority` twice within 6 hours; second call should return `{ cached: true }` and not hit OpenRouter
- [ ] **Score history chain** — after activity boost, confirm `previous_score_id` on new row points to the previous row (was always `null` before the fix)

### Investor Portal
- [ ] **Deal flow with 50 founders** — load `/investor/deal-flow` with 50+ founder accounts in DB; confirm it doesn't timeout (was 150 queries, now 4)
- [ ] **Investor alerts secret** — confirm that `POST /api/investor/alerts` returns 403 when `INTERNAL_API_SECRET` env var is missing (fail-closed behaviour)
- [ ] **Pipeline stage validation** — attempt PATCH `/api/investor/pipeline` with `stage: "hacked"` and confirm 400

### Cron
- [ ] **Weekly automation** — trigger manually via `GET /api/cron/weekly-automation` with correct `Authorization: Bearer <CRON_SECRET>` header; confirm emails sent, results object correct
- [ ] **Cron with no founders** — run when `founder_profiles` is empty and confirm it returns `{ usersProcessed: 0 }` without erroring

---

## 2. Features to Build

### Critical Path (Blocking Launch)

#### ~~Branding Sweep~~ ✅ DONE
- All `Qcombinator` references replaced with `Edge Alpha` across `app/`, `lib/`, `components/`

#### ~~Email Unsubscribe Flow~~ ✅ DONE
- `GET /api/unsubscribe?token=<base64url>` built — handles types: `weekly`, `runway`, `alerts`, `all`
- Links wired into weekly OKR standup, runway alert, investor deal alerts
- Cron now respects `notification_preferences.weeklyDigest` opt-out

#### ~~Rate Limiting~~ ✅ DONE
- Sliding-window in-memory limiter in `middleware.ts` — no extra dependencies
- chat 12/min · generate 5/min · calculate 5/min · research 10/min · actions 6/min · analyze-pitch 8/min
- Returns 429 + `Retry-After: 60` header; auto-prunes store at 5,000 keys
- Upgrade path: replace `checkRateLimit` with Upstash Redis for cross-instance limits

#### ~~`agent_messages` Missing `user_id` RLS~~ ✅ DONE
- Migration `20260310000001` adds `user_id` column (back-filled from conversations), RLS policy, and 6 performance indexes
- `activity-boost` query fixed: uses `role` (not `sender`) column

---

### Investor Portal

#### ~~Real Investor Profiles (not demo)~~ ✅ DONE
- `/api/investors` now merges real `investor_profiles` (onboarding_completed=true) with `demo_investors`. Real investors appear first with a green "LIVE" badge in the UI.
- `/api/connections` GET returns status keyed by `demo_investor_id` OR `investor_id` (whichever is set).
- `/api/connections` POST accepts `{ investor_id }` for real investors or `{ demo_investor_id }` for demo.
- Matching page passes the correct FK based on `investor.type`.
- [x] `investor_id` column already existed in `connection_requests` from initial migration.

#### ~~Investor Messages — Real 2-Way Messaging~~ ✅ DONE
- `supabase/migrations/20260310000002_messages_table.sql` — `messages` table with RLS (sender+recipient only), `read_at` for unread tracking.
- `app/api/messages/route.ts` — GET (fetch thread, auto-marks unread) + POST (send, 4000 char cap, party-check).
- Investor messages page wired: real message thread with chat bubble UI, `⌘+Enter` to send, character counter, disabled state while sending.
- Founder messages page wired: `GET /api/connections` now returns `connectionIds` map; `MessagesPage.tsx` fetches real messages via `GET /api/messages?connectionId=...` and sends via `POST /api/messages` for accepted connections; character counter + sending disabled state.
- Also fixed: portfolio route now returns `connectionId` field and handles real investors (`investor_id`) alongside demo (`demo_investor_id`).

#### ~~Investor → Accept/Decline Connections~~ ✅ DONE
- `PATCH /api/investor/connections` with `{ requestId, action: 'accept' | 'decline' }` was already built.
- Investor messages page has Accept / Decline buttons wired with optimistic UI update and toast confirmation.

---

### Founder Portal

#### Academy Page
- `/founder/academy` exists in the sidebar and as a page file — audit whether it has real content or is a placeholder. Remove from sidebar if placeholder.

#### ~~Notification Preferences~~ ✅ DONE
- Settings page already had email/qscore/investorMessages/weeklyDigest toggles. Added missing `runwayAlerts` toggle (state, load, save, UI). Cron now also respects `runwayAlerts !== false` before sending runway alert emails.

#### ~~Pitch Deck — Real Data Refresh~~ ✅ DONE
- Added "Refresh data" button that re-fetches latest agent artifacts without a full page reload. Shows spinner while refreshing.

#### ~~Messages Badge Accuracy~~ ✅ DONE
- Fixed `FounderSidebar` — badge now only counts `pending` connections (not `pending + viewed`).

---

### Agent Execution Gaps

#### Harper → Public Apply Page (`/apply/[userId]/[roleSlug]`)
- Full flow not tested: generate hiring plan → "Post on Wellfound" → candidate applies via `/apply` URL → score appears in Harper inbox.
- The `roleSlug` derived from artifact content must be stable across artifact versions.

#### Nova → Hosted PMF Survey (`/s/[surveyId]`)
- Test full round-trip: generate PMF survey → share link → respondent fills → results appear in Nova renderer.
- Check `localStorage` response storage doesn't collide across multiple surveys for the same respondent.

#### Atlas → Weekly Competitor Scan
- `POST /api/agents/atlas/weekly-scan` exists but needs to be triggered via Vercel Cron (see infra section).
- Test that changes found insert correct `agent_activity` rows and surface in the activity feed.

#### Felix → Stripe Live Metrics
- Test with a real Stripe restricted key — confirm MRR/ARR display correctly and the key is never persisted to the DB.

---

## 3. Infrastructure / DevOps

### Environment Variables Audit

| Variable | Used In | Status |
|---|---|---|
| `OPENROUTER_API_KEY` | All LLM calls | ✅ Critical |
| `SUPABASE_SERVICE_ROLE_KEY` | All admin routes | ✅ Critical |
| `NEXT_PUBLIC_SUPABASE_URL` | All routes | ✅ Critical |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client auth | ✅ Critical |
| `RESEND_API_KEY` | Email sending | ✅ Critical |
| `RESEND_WEBHOOK_SECRET` | Webhook verification | ⚠️ Skips verification if missing |
| `INTERNAL_API_SECRET` | Investor alerts | ✅ Fails closed if missing (fixed) |
| `HUNTER_API_KEY` | Patel lead enrich | ⚠️ Falls back to user-provided key |
| `TAVILY_API_KEY` | Web research | ⚠️ Research disabled if missing |
| `CRON_SECRET` | Weekly automation | ⚠️ Unprotected if missing |
| `NEXT_PUBLIC_APP_URL` | Email CTAs | ⚠️ Falls back to `https://edgealpha.ai` |
| `STRIPE_RESTRICTED_KEY` | Felix Stripe sync | Optional |
| `NETLIFY_ACCESS_TOKEN` | Patel/Maya deploy | Optional |

### Vercel Cron Setup
~~Add to `vercel.json`~~ ✅ `vercel.json` exists with both crons:
- `0 9 * * 1` → `/api/cron/weekly-automation`
- `0 8 * * 1` → `/api/agents/atlas/weekly-scan`

Confirm `CRON_SECRET` is set in Vercel environment variables.

### Database
- [x] ~~Confirm RLS policies exist~~ — all confirmed in migrations: `agent_messages` (003 + 20260310000001), `pending_actions` (20260225000007), `deals` (20260225000008), `outreach_sends` (20260225000007), `legal_documents` (20260227000001), `deployed_sites` (20260225000009)
- [x] ~~Add index on `agent_activity(user_id, created_at DESC)`~~ — in migration 20260310000001
- [x] ~~Add index on `agent_artifacts(user_id, artifact_type)`~~ — in migration 20260310000001
- [ ] Clean up `connection_requests` dual-FK (`demo_investor_id` UUID + old `investor_id`)

### Error Monitoring
- No Sentry or error tracking is configured. All errors are `console.error` only — invisible in production.
- Recommended: `@sentry/nextjs` with a `SENTRY_DSN` env var and `withSentryConfig` in `next.config`.

---

## 4. Known Dead Code / Tech Debt

| File | Issue |
|---|---|
| ~~`app/api/agents/chat/route.ts`~~ | ~~`streamOpenRouter()` function is dead — `useStream = false` everywhere. Safe to delete.~~ ✅ Deleted (−130 lines) |
| ~~`app/api/agents/outreach/send/route.ts`~~ | ~~Serial email loop with 150ms intentional delay. 100 contacts = 15s response time.~~ ✅ Fixed: batches of 10 in parallel (300ms between batches) → 100 contacts ≈ 3s |
| ~~`app/api/agents/maya/buffer-schedule/route.ts`~~ | ~~Serial Buffer API calls per post.~~ ✅ Fixed: batches of 5 in parallel — 30 posts ≈ 6 batches |
| ~~`app/api/investor/alerts/route.ts`~~ | ~~Serial email loop for up to 50 investors.~~ ✅ Fixed: `Promise.allSettled` — all 50 investor alert emails sent in parallel. |
| ~~`app/api/agents/research/route.ts`~~ | ~~`maxResults` param passed directly to Tavily.~~ ✅ Fixed: server-side cap at 15. |

---

## 5. Pre-Launch Checklist

- [ ] All pages load without console errors on a fresh user account (no leftover `undefined` renders)
- [ ] Complete full **founder flow**: signup → onboarding → assessment → chat 3 agents → workspace → portfolio → request investor connection
- [ ] Complete full **investor flow**: signup → onboarding → browse deal flow → startup deep-dive → add to pipeline → respond to connection
- [ ] Test on mobile (320px viewport) — agent chat page and dashboard especially
- [ ] Confirm `og:image` and `og:title` meta tags on public pages: `/`, `/p/[userId]`, `/s/[surveyId]`, `/apply/[userId]/[roleSlug]`
- [ ] Run `next build` — zero TypeScript errors, zero missing env var warnings
- [ ] Set `RESEND_WEBHOOK_SECRET` in production (webhook events are accepted unsigned without it)
- [ ] Set `INTERNAL_API_SECRET` in production (investor alerts blocked without it — fail-closed)
- [ ] Set `CRON_SECRET` and register crons in `vercel.json`
- [ ] Confirm Supabase RLS is enabled on all tables with user data
