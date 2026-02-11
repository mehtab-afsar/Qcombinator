# Edge Alpha — Deep Dive Specification

A feature-by-feature breakdown of what each section requires to be production-ready.
Each section lists current state, what's missing, and exact work needed.

---

## 1. Q-Score Algorithm

### Current State
- 6-dimension weighted model built: Market (20%), Product (18%), GTM (17%), Financial (18%), Team (15%), Traction (12%)
- Calculators live in `features/qscore/calculators/dimensions/`
- Scores saved to `qscore_history` table
- `useQScore` hook reads latest score from DB in real time

### What's Missing
- **Percentile calculation**: Currently hardcoded to `50`. Needs to compare user's score against cohort (all `qscore_history` rows) to produce a real rank
- **Grade thresholds**: `A+` = 95+, `A` = 90–94, `B+` = 80–89, `B` = 70–79, `C` = 55–69, `D` = 40–54, `F` = <40. Currently defined but not validated end-to-end
- **Week-over-week change**: `/api/qscore/latest` should compare to the previous score and return `change` delta per dimension
- **Score improvement tips**: Each dimension needs 3–5 specific, actionable recommendations based on the actual answers that caused low scores
- **Industry / stage adjustments**: Phase 2 — a SaaS company in idea stage should be scored differently than a launched fintech

### Files to Touch
- `app/api/qscore/latest/route.ts` — add previous score comparison
- `app/api/qscore/calculate/route.ts` — add real percentile query
- `features/qscore/calculators/dimensions/*.ts` — validate scoring rubrics with real data
- `features/qscore/calculators/prd-aligned-qscore.ts` — wire in industry/stage multipliers (Phase 2)

---

## 2. Assessment Flow

### Current State
- 9-section form built with individual form components
- Auto-saves draft to API (`/api/assessment/save`) and localStorage
- Submit calls `/api/assessment/submit` → triggers Q-Score calculation → redirects to dashboard

### What's Missing
- **Resume draft**: `/api/assessment/save` stores draft but the load-on-mount logic in `assessment/page.tsx` needs hardening — if API fails it falls back to localStorage, but no error UI shown to user
- **Section validation**: Each section needs client-side validation before allowing "Next" — currently any section can be skipped
- **Progress persistence**: If user closes tab mid-assessment, they should land back on the section they were on
- **Section 7 (GTM) + Section 8 (Financial)**: Components exist (`GoToMarketForm`, `FinancialHealthForm`) but their answers are not fully mapped to the Q-Score GTM/Financial dimension calculators
- **Re-assessment flow**: After first submission, user should be able to retake — currently unclear if submitting again creates a second row or updates existing

### Files to Touch
- `app/founder/assessment/page.tsx` — add section validation, resume-to-section logic
- `features/founder/components/assessment/GoToMarketForm.tsx` — verify field names map to `AssessmentData` type
- `features/founder/components/assessment/FinancialHealthForm.tsx` — same
- `features/qscore/calculators/dimensions/gtm.ts` — map GTM form fields to scoring
- `features/qscore/calculators/dimensions/financial.ts` — map Financial form fields to scoring
- `app/api/assessment/save/route.ts` — add upsert logic (update existing draft, don't create duplicates)

---

## 3. Auth Flow

### Current State
- Signup calls `/api/auth/signup` → creates user in Supabase Auth + inserts `founder_profiles` row
- Login page exists with email/password form
- `useAuth` hook wraps Supabase session

### What's Missing
- **Route protection / middleware**: `middleware.ts` exists but the matcher only partially covers routes. Unauthenticated users hitting `/founder/*` should redirect to `/login` — currently not enforced
- **Post-login role routing**: After login, if user is a founder → `/founder/dashboard`, if investor → `/investor/dashboard`. Currently all logins go to the same place
- **Investor role**: No mechanism to designate a user as investor vs founder during signup
- **Email confirmation**: Supabase email confirm is off for local dev — needs a decision for production
- **Password reset flow**: UI exists in settings but `/api/auth/reset-password` not wired
- **Session expiry handling**: If JWT expires mid-session, API calls will return 401 but the UI doesn't catch this and prompt re-login
- **Onboarding gate**: After signup, user should be forced through onboarding before reaching dashboard

### Files to Touch
- `middleware.ts` — enforce auth checks on all `/founder/*` and `/investor/*` routes
- `app/login/page.tsx` — add role-based redirect after login
- `app/founder/onboarding/page.tsx` — mark `onboarding_completed = true` in DB on finish
- `app/api/auth/signup/route.ts` — add `role` field support (`founder` | `investor`)
- New: `app/api/auth/reset-password/route.ts`

---

## 4. Agent Architecture

### Current State
- 9 agents defined with configs + full system prompts (`features/agents/{name}/config.ts` + `prompts/system-prompt.ts`)
- Chat API calls Groq `llama-3.1-70b-versatile`
- Conversations + messages now persist to DB
- Previous conversation loaded on chat open

### What's Missing
- **Per-agent system prompts not wired into API**: `/api/agents/chat` builds its own `buildAgentSystemPrompt()` inline, completely ignoring the detailed prompts in `features/agents/{name}/prompts/system-prompt.ts`. These need to be imported and used instead
- **Conversation threading**: Currently loads the most recent conversation for an agent. There's no way for users to start a new conversation or browse past ones
- **Message history to Groq**: `conversationHistory` passed from client contains the local in-memory array — after a page reload this is lost. Should fetch history from DB and pass it
- **Usage gating**: Free tier = 3 agent chats/day. No enforcement exists. `subscription_usage` table is there but nothing writes to it
- **Agent-specific context injection**: Each agent should receive relevant Q-Score dimension data — e.g. Felix (Finance) should see the user's financial score and MRR in his system prompt
- **Streaming responses**: Currently waits for full Groq response before showing. Should stream token-by-token for better UX

### Files to Touch
- `app/api/agents/chat/route.ts` — import system prompts from `features/agents/{id}/prompts/system-prompt.ts`, add usage tracking, add streaming
- `app/founder/agents/[agentId]/page.tsx` — add "New Chat" button, conversation browser, fetch history from DB on mount instead of local state
- `features/agents/index.ts` — ensure all 9 system prompt exports work
- New: `app/api/agents/conversations/route.ts` — list all conversations for a user+agent

---

## 5. Investor Matching

### Current State
- UI fully built with search, filters, connection request modal, status badges
- Uses hardcoded `mockInvestors[]` array — demo banner added
- Q-Score gate now uses real score from `useQScore()` (≥ 60 to connect)
- Connection requests not saved to DB

### What's Missing
- **`investor_profiles` table**: Doesn't exist yet. Needs schema: `id, user_id, firm_name, thesis, investment_focus[], check_size_min, check_size_max, location, portfolio[], stage_preference[]`
- **Seed data**: 10–20 realistic investor profiles to seed for demo/testing
- **Matching algorithm**: Currently all investors shown regardless. Needs logic: `score ≥ 65 AND overlap between founder.industry and investor.investment_focus`
- **Connection request persistence**: `handleConnectionSubmit` updates local state only. Needs to POST to `/api/connections/request` which inserts into `connection_requests` table
- **Connection status sync**: Investor dashboard should read real `connection_requests` from DB, not mock data

### Files to Touch
- New migration: `supabase/migrations/20250101000004_investor_profiles.sql`
- New seed: `supabase/seed/investors.sql` — 15 sample investors
- New: `app/api/connections/request/route.ts` — insert into `connection_requests`
- New: `app/api/connections/status/route.ts` — update connection status
- `app/founder/matching/page.tsx` — replace `mockInvestors` with API fetch
- `app/investor/dashboard/page.tsx` — fetch real `connection_requests` from DB

---

## 6. Investor Portal

### Current State
- Investor dashboard, deal flow, portfolio, startup detail, AI analysis pages all built
- All data is mock — demo banner added to dashboard
- No investor onboarding flow wired to DB

### What's Missing
- **Investor onboarding → DB**: Form exists but submits to nowhere. Needs `/api/investor/onboarding` to save thesis/preferences to `investor_profiles`
- **Deal flow from real data**: Should query `founder_profiles JOIN qscore_history` to show real founders who have completed assessment
- **Startup detail page**: Reads mock data. Should fetch from `founder_profiles` + `qscore_history` + `qscore_assessments` for the selected founder
- **AI analysis page**: Uses mock analysis. Should call Groq with founder's actual assessment data and Q-Score breakdown to generate real analysis
- **Portfolio**: No concept of "accepted" investments tracked in DB yet — this is Phase 3

### Files to Touch
- New: `app/api/investor/onboarding/route.ts`
- New: `app/api/investor/deal-flow/route.ts` — query real founders
- `app/investor/deal-flow/page.tsx` — fetch from API
- `app/investor/startup/[id]/page.tsx` — fetch real founder data
- `app/investor/ai-analysis/page.tsx` — call Groq with real data

---

## 7. Improve Q-Score Page

### Current State
- Page exists at `/founder/improve-qscore`
- Shows static tips and action items

### What's Missing
- **Personalized to actual low scores**: Should read the user's real Q-Score breakdown and show tips specific to the lowest 2–3 dimensions
- **Agent recommendations**: For each weak dimension, suggest the specific agent to talk to (e.g. GTM score low → talk to Patel)
- **Progress tracking**: After re-taking assessment, show the delta since last submission
- **Action completion tracking**: When user completes an action ("I talked to Patel"), mark it done and prompt re-assessment

### Files to Touch
- `app/founder/improve-qscore/page.tsx` — wire to `useQScore()`, generate personalized tips
- `features/qscore/utils/recommendations.ts` — expose `getImprovementTips(dimension, score)` function

---

## 8. Academy & Workshops

### Current State
- 3-tab page: Workshops, Mentors, Programs
- All data from `features/academy/data/workshops.ts` (hardcoded array)
- Register/Book buttons show "Coming Soon"

### What's Missing
- **`workshops` table**: Schema: `id, title, date, instructor, topic, spots_total, spots_taken, status`
- **Registration flow**: Clicking register should INSERT into a `workshop_registrations` table and send confirmation email (Phase 2)
- **Q-Score gate on workshops**: Premium workshops only for users with Q-Score ≥ 70 or premium tier
- **Content delivery**: Recorded workshop replays — needs a video URL field and a player component

### Files to Touch
- New migration: `supabase/migrations/20250101000005_workshops.sql`
- New: `app/api/academy/workshops/route.ts` — fetch upcoming workshops
- `app/founder/academy/page.tsx` — replace hardcoded data with API fetch

---

## 9. Subscription & Usage Limits

### Current State
- `subscription_usage` table exists with columns: `user_id, feature, usage_count, limit_count, reset_at`
- Nothing writes to or reads from this table yet

### What's Missing
- **Usage increment**: Every agent chat should increment `usage_count` for `agent_chat` feature
- **Limit enforcement**: Before sending to Groq, check if `usage_count >= limit_count` — return 403 with upgrade prompt if so
- **Free tier defaults**: On signup, seed `subscription_usage` rows: `agent_chat (3/day)`, `qscore_recalc (1/week)`, `investor_connection (2/month)`
- **Reset logic**: A cron job (or Supabase Edge Function) to reset usage counts when `reset_at` is reached
- **Upgrade flow**: Settings page has UI placeholder — needs Stripe integration (Phase 3)

### Files to Touch
- `app/api/agents/chat/route.ts` — check + increment usage before/after Groq call
- `app/api/auth/signup/route.ts` — seed free tier usage rows on account creation
- New: `app/api/subscription/usage/route.ts` — GET current usage for frontend display
- `app/founder/settings/page.tsx` — wire usage display to API

---

## 10. Real-time & Notifications

### Current State
- `useQScore` has a Supabase Realtime subscription on `qscore_history` — wired but not tested end-to-end
- Toast notification fires on new Q-Score insert
- No other real-time features

### What's Missing
- **Test the Realtime subscription**: Open dashboard in two tabs, submit assessment in tab 1 — tab 2 should update automatically without refresh
- **Investor notifications**: When a founder sends a connection request, investor should see a badge update in real time
- **Agent message streaming**: Stream Groq token-by-token to the chat UI instead of waiting for the full response
- **Supabase Realtime requires auth**: The Realtime filter uses `user_id=eq.{id}` — verify this works with anon key + RLS

### Files to Touch
- `features/qscore/hooks/useQScore.tsx` — test and verify Realtime works
- `app/api/agents/chat/route.ts` — add streaming support (`stream: true` in Groq call)
- `app/founder/agents/[agentId]/page.tsx` — handle streaming response in UI

---

## 11. Messages / Inbox

### Current State
- Full messaging UI built with conversation list + message thread
- All data is mock — demo banner added

### What's Missing
- **`messages` table**: Needs schema for founder ↔ investor direct messages (separate from agent chat): `id, from_user_id, to_user_id, connection_request_id, content, read, created_at`
- **Message delivery**: When investor accepts connection request, a `messages` row should be created to bootstrap the thread
- **Read receipts**: Mark messages as read when conversation is opened
- **Real-time messages**: New message from investor should appear in founder's inbox without refresh

### Files to Touch
- New migration: `supabase/migrations/20250101000006_messages.sql`
- New: `app/api/messages/route.ts` — GET conversations + POST new message
- `app/messages/page.tsx` — replace mock data with API, add Realtime subscription

---

## Priority Order

| Section | Effort | Impact | Priority |
|---|---|---|---|
| Auth flow (route guards, role routing) | Small | Blocker | **P0** |
| Agent system prompts wired in | Small | High | **P0** |
| Q-Score percentile + week delta | Small | High | **P1** |
| Assessment validation + resume | Medium | High | **P1** |
| Investor profiles table + seed | Medium | High | **P1** |
| Connection requests → DB | Small | High | **P1** |
| Usage limits enforcement | Medium | Medium | **P2** |
| Investor deal flow from real data | Medium | Medium | **P2** |
| Improve Q-Score personalization | Small | Medium | **P2** |
| Real-time streaming (agents) | Medium | UX | **P2** |
| Messages table + real-time | Large | Medium | **P3** |
| Academy workshops table | Small | Low | **P3** |
| Stripe + subscription upgrade | Large | Revenue | **P3** |
