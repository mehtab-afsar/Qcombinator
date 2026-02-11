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

---

## 🔴 To Do

### 1. Auth Flow (Priority: HIGH)
- [ ] Sign up → creates row in `founder_profiles` automatically (Supabase trigger or API)
- [ ] Onboarding saves to `founder_profiles` table (currently saves to localStorage only)
- [ ] Route guards working: unauthenticated → redirect to `/login`
- [ ] Investor vs founder role routing after login

### 2. Assessment → Database (Priority: HIGH)
- [ ] Assessment submit saves `assessment_data` to `qscore_assessments` table
- [ ] On submit, trigger Q-Score calculation → save to `qscore_history`
- [ ] Dashboard reads Q-Score from DB (currently reads from localStorage)
- [ ] Remove all localStorage dependencies for core data

### 3. Agent Chat (Priority: HIGH)
- [ ] Chat creates row in `agent_conversations` table
- [ ] Messages persist to `agent_messages` table
- [ ] Load previous conversation history on chat open
- [ ] Wire agent system prompts from `features/agents/{name}/prompts/system-prompt.ts` into `/api/agents/chat`

### 4. Investor Matching (Priority: MEDIUM)
- [ ] Investor profiles table + seeded mock investors
- [ ] Matching logic: Q-Score ≥ 65 gate + thesis alignment
- [ ] Connection request flow → `connection_requests` table
- [ ] Investor dashboard shows real connection requests

### 5. Investor Portal (Priority: MEDIUM)
- [ ] Investor onboarding saves thesis/preferences to DB
- [ ] Deal flow pulls real founders from `founder_profiles`
- [ ] Startup detail page reads real assessment + Q-Score data

### 6. Real-time Q-Score (Priority: MEDIUM)
- [ ] Supabase Realtime subscription on `qscore_history` working end-to-end
- [ ] Dashboard score updates without refresh after assessment submit

### 7. Subscription & Usage Limits (Priority: LOW)
- [ ] `subscription_usage` table enforced in API routes
- [ ] Free tier limits: 3 agent chats/day, 1 Q-Score recalc/week
- [ ] Upgrade flow UI (settings page)

### 8. Testing (Priority: LOW)
- [ ] Write regression tests for Q-Score calculators (`features/qscore/calculators/`)
- [ ] API route integration tests (assessment save, Q-Score calculate)
- [ ] E2E: signup → onboarding → assessment → dashboard flow

---

## Next Sprint (Start Here)
1. `POST /api/auth/signup` → insert into `founder_profiles`
2. Assessment page → `POST /api/assessment/submit` → save to DB + trigger Q-Score
3. Dashboard → fetch Q-Score from `/api/qscore/latest` (DB, not localStorage)
4. Agent chat → persist to `agent_conversations` + `agent_messages`
