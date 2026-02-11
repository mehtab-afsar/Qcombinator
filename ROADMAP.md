# Edge Alpha — Build Roadmap

## ✅ Done

### Infrastructure
- [x] Next.js 15 + TypeScript + Tailwind setup
- [x] Local Supabase Docker running (`http://127.0.0.1:54321`)
- [x] DB migrations organized in `supabase/migrations/` (8 tables, indexes, RLS)
- [x] `.env.local` wired to local Supabase (prod keys commented out)
- [x] Groq AI client connected (`lib/groq.ts`)

### Architecture
- [x] Feature-based folder structure (`features/founder`, `investor`, `qscore`, `agents`, `matching`, `academy`, `demo`, `auth`)
- [x] Per-agent subfolders with `config.ts` + `prompts/system-prompt.ts` for all 9 agents
- [x] `lib/` = infrastructure only, `components/ui/` = Radix/shadcn atoms
- [x] Build ✅ Lint ✅ Zero errors

### Pages Built (UI shells)
- [x] Landing page
- [x] Auth — login / signup
- [x] Founder — onboarding, assessment (7 sections), dashboard, agents chat, improve Q-Score, matching, metrics, profile, pitch analyzer, pitch deck, academy, startup profile, settings
- [x] Investor — onboarding, dashboard, deal flow, portfolio, startup detail, AI analysis
- [x] Messages inbox

### Q-Score Engine
- [x] 6-dimension scoring model (market 20%, product 18%, GTM 17%, financial 18%, team 15%, traction 12%)
- [x] All dimension calculators built (`features/qscore/calculators/`)
- [x] Q-Score persisted to `qscore_history` table via `/api/qscore/calculate`

### Backend Wiring (Phase 1 — COMPLETE)
- [x] Sign up → creates row in `founder_profiles` automatically
- [x] Assessment submit saves to `qscore_assessments` table + triggers Q-Score calculation
- [x] Dashboard reads Q-Score from DB via `useQScore` hook
- [x] Agent chat persists conversations to `agent_conversations` + messages to `agent_messages`
- [x] Agent chat loads previous conversation history on open
- [x] Agents hub uses real Q-Score (not mock)
- [x] Matching page uses real Q-Score for gating (≥ 60 to connect)
- [x] `localStorage` used as cache only — DB is source of truth for Q-Score & assessments
- [x] Demo Mode notice on investor/matching/messages pages (no investor_profiles table yet)

---

## 🔴 To Do

### 1. Auth Flow (Priority: HIGH)
- [ ] Route guards working: unauthenticated → redirect to `/login`
- [ ] Investor vs founder role routing after login

### 2. Agent System Prompts (Priority: HIGH)
- [ ] Wire per-agent system prompts from `features/agents/{name}/prompts/system-prompt.ts` into `/api/agents/chat`

### 3. Investor Matching (Priority: MEDIUM)
- [ ] Investor profiles table + seeded mock investors (replace demo data with DB)
- [ ] Matching logic: Q-Score ≥ 65 gate + thesis alignment
- [ ] Connection request saved to `connection_requests` table
- [ ] Investor dashboard shows real connection requests from DB

### 4. Investor Portal (Priority: MEDIUM)
- [ ] Investor onboarding saves thesis/preferences to DB
- [ ] Deal flow pulls real founders from `founder_profiles`

### 5. Real-time Q-Score (Priority: MEDIUM)
- [ ] Supabase Realtime subscription on `qscore_history` working end-to-end
- [ ] Dashboard score updates without refresh after assessment submit

### 6. Subscription & Usage Limits (Priority: LOW)
- [ ] `subscription_usage` table enforced in API routes
- [ ] Free tier limits: 3 agent chats/day, 1 Q-Score recalc/week
- [ ] Upgrade flow UI (settings page)

### 7. Testing (Priority: LOW)
- [ ] Write regression tests for Q-Score calculators (`features/qscore/calculators/`)
- [ ] API route integration tests (assessment save, Q-Score calculate)
- [ ] E2E: signup → onboarding → assessment → dashboard flow

---

## Next Sprint (Start Here)
1. Route guard middleware: unauthenticated users → `/login`
2. Wire agent system prompts per-agent into `/api/agents/chat`
3. Seed `investor_profiles` table + wire matching page to DB
4. Wire connection requests to `connection_requests` table
