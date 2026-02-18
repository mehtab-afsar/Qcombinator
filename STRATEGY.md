# Edge Alpha — Strategic Plan
*Where we are, where we're stuck, and the path forward*

---

## The Plateau Problem

The current build has all the right pieces — but they don't form a loop yet.

Right now the user experience is:
> Onboard → Take assessment → Get Q-Score → Chat with an agent → ...nothing changes

The score sits there. The agent conversation disappears from memory next session.
The investor matching is demo data. There's no moment where a founder feels *traction*.

**The core product needs to be a feedback loop, not a series of isolated features:**
> Assessment → Q-Score → Agent coaching → Specific actions → Re-assessment → Score improves → Investor access unlocked

Everything below is about closing that loop.

---

## What's Built (Honest Inventory)

### ✅ Infrastructure (solid)
- Next.js 15 App Router, feature-based architecture
- Supabase local DB — 5 clean migrations, all idempotent
- Auth: signup → session → `founder_profiles` row with all onboarding fields
- RLS on all tables, service role key for server-side writes

### ✅ Assessment → Q-Score (working end-to-end)
- 9-section assessment form, auto-saves drafts
- 6-dimension scoring engine (market 20%, product 18%, GTM 17%, financial 18%, team 15%, traction 12%)
- Percentile vs cohort, week-over-week deltas via `qscore_with_delta` view
- `useQScore` hook with Supabase Realtime subscription

### ✅ Agent Chat (partially working)
- 9 agents with per-agent configs and system prompts in `features/agents/{name}/`
- Groq `llama-3.1-70b-versatile` backend
- Conversations and messages persist to `agent_conversations` + `agent_messages`
- Loads previous conversation on mount

### ✅ Onboarding (both flows wired)
- Founder: stage, funding, time_commitment → `founder_profiles`
- Investor: all 4 steps → `investor_profiles` with GIN-indexed arrays
- `onboarding_completed` flag set correctly

### 🟡 Partially Working
- Investor matching: real Q-Score gate, demo investor data (no `investor_profiles` seed)
- Dashboard: reads real Q-Score, but "Recommended Actions" are static
- Messages inbox: UI only, no `messages` table
- Improve Q-Score page: static tips, not personalised to actual low scores
- Agent system prompts: written and in `features/agents/{name}/prompts/` but **not used** — API still uses inline `buildAgentSystemPrompt()`

### ❌ Not Started
- Auth route guards (unauthenticated can access `/founder/*`)
- Usage limits enforcement (`subscription_usage` table exists but nothing reads it)
- Investor deal flow from real founder data
- Streaming agent responses
- Re-assessment flow after first submission

---

## The Big Picture: Three Product Loops

The platform needs three closed loops. Each one builds on the previous.

```
LOOP 1 — FOUNDER GROWTH LOOP (core, ship first)
  Assessment → Q-Score → Personalised agent coaching → Score improves

LOOP 2 — INVESTOR SIGNAL LOOP (ship second)
  Founder score ≥ 65 → Visible to investors → Connection request → Meeting

LOOP 3 — PLATFORM NETWORK LOOP (ship third)
  More founders → Better percentile data → Smarter matching → More investor trust
```

---

## Section-by-Section Plan

---

### 1. AI Agents — The Biggest Unlock

**Current problem:** The agents are just a chat interface. They give good advice but:
- Don't know what the user's actual Q-Score breakdown looks like when they chat
- Don't inject the per-agent system prompt (it's written, just not wired)
- Don't feed outcomes back into the Q-Score
- Have no memory of what advice was already given

**What needs to change:**

**A. Wire the actual system prompts (1 hour, high impact)**
- In `/api/agents/chat/route.ts`, replace `buildAgentSystemPrompt()` with an import from `features/agents/{agentId}/prompts/system-prompt.ts`
- Each agent has a distinct persona and approach — use them

**B. Inject the Q-Score dimension into every conversation (2 hours)**
- When a user opens Patel (GTM expert), load their `gtm_score` from DB and inject it into the system prompt:
  ```
  Context: This founder's GTM score is 42/100 (below average).
  Their key weakness: low channel diversity — only 1 channel tried.
  Focus your coaching on fixing this specific gap.
  ```
- This turns a generic chat into a targeted coaching session

**C. Agent → Action → Score feedback loop (the hardest, most valuable thing)**

Right now: agent gives advice → nothing happens to the score.

Proposed architecture:
1. At the end of each agent conversation, the agent is prompted to output a structured "action summary" — 1-3 concrete actions the founder said they'd take
2. These actions are saved to a new `agent_actions` table: `{ conversation_id, dimension, action_text, committed_at }`
3. The dashboard shows "You have 3 open actions from Patel — complete them to improve your GTM score"
4. When the founder re-takes the assessment, the score improvement is tied back to the actions they said they'd take

This closes the loop: chat → commit → do → re-assess → score goes up → investor access widens.

**D. Conversation memory (medium effort)**
- Currently: on page reload, history is re-fetched from DB ✅ (done)
- Missing: the Groq call only gets messages from the current session's in-memory array — after reload, the loaded history isn't passed to Groq
- Fix: when loading messages from DB on mount, store them in state AND pass them as `conversationHistory` in the first new message

**E. Streaming responses (UX, medium effort)**
- Groq supports `stream: true`
- Without streaming, there's a 2–4 second blank wait before any text appears
- With streaming, text appears token-by-token like ChatGPT
- This is a UX multiplier — makes the agents feel alive

**New table needed:**
```sql
CREATE TABLE agent_actions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id  UUID REFERENCES agent_conversations(id),
  agent_id         TEXT NOT NULL,
  dimension        TEXT NOT NULL,  -- which Q-Score dimension this improves
  action_text      TEXT NOT NULL,  -- "Talk to 5 more customers this week"
  status           TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'skipped')),
  committed_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);
```

---

### 2. Onboarding — The Leaky Bucket

**Current problem:** The onboarding collects data but doesn't set the user up for success.

A founder completes 4 screens, gets to the assessment, and faces 9 dense sections with no guidance on why each section matters or what a "good" answer looks like.

**What needs to change:**

**A. The assessment needs inline context (no code change — just content)**
- Each section should show: "This determines your [X] score — investors care about this because..."
- Section 1 (Problem Origin) → affects Product score
- Section 4 (Customer Evidence) → affects Traction score
- This is a copy/UX change, not an engineering change

**B. Progressive Q-Score reveal**
Currently: user completes all 9 sections and gets a score at the end.
Better: show a "live preview" Q-Score that updates as sections are completed — grayed-out dimensions fill in as you progress. This makes the assessment feel like a game, not a form.

**C. The investor onboarding has no auth step**
Right now `/investor/onboarding` posts to `/api/investor/onboarding` which calls `supabase.auth.getUser()` — but there's no signup/login in the investor flow. The user would get a 401.
Fix: Add a Step 0 to investor onboarding — email + password account creation, same pattern as founder.

**D. Onboarding for existing founders coming back**
If a user already has an account and visits `/founder/onboarding`, they'll go through the full flow and try to create a duplicate account. Need: redirect to `/founder/dashboard` if already authenticated.

---

### 3. Architecture — What to Harden

**A. Route guards (P0 — needs doing now)**

`middleware.ts` matcher isn't protecting routes. Any URL is accessible without auth.

```typescript
// middleware.ts — needs this logic:
// /founder/* → require auth + role = 'founder'
// /investor/* → require auth + role = 'investor'
// /login, /founder/onboarding → allow unauthenticated
// All else → redirect to /login
```

Without this, the entire platform is publicly accessible and Q-Score data could be exposed.

**B. The `founderProfile` localStorage cache needs to be sourced from DB**

Currently the agent chat context reads from localStorage (`founderProfile`, `assessmentData`).
This means:
- A user who clears storage gets no context injection
- The data can be stale (months-old assessment)

Fix: Add a `/api/founder/context` endpoint that returns the latest `founder_profiles` row + `qscore_assessments.assessment_data` joined — agents should call this, not read from localStorage.

**C. API error handling is inconsistent**

Some routes return `{ error: string }` with status 4xx, others return `{ error: true }` with status 200. The client-side code mixes `response.ok` checks with `data.error` checks.

Pick one pattern and apply it everywhere:
- Server: always use HTTP status codes (400, 401, 403, 500)
- Client: always check `if (!response.ok)` before reading body

**D. The `buildAgentSystemPrompt` function in the API is 200+ lines**

It replicates all the agent personalities inline in the route file. It should be deleted once the per-agent system prompts are wired in. Keeping both creates drift — someone edits one but not the other.

---

### 4. Q-Score — Making It Feel Real

**Current state:** Score is calculated correctly, stored, deltas work.

**What would make founders care about their score:**

**A. Show what moved the needle**
- When a score changes, highlight which dimensions went up/down and by how much
- "Your GTM score went from 42 → 58 (+16) after your conversation with Patel" ← this is the dream

**B. Comparative benchmarks**
- "Your market score (72) is above average for Seed-stage B2B SaaS (avg: 61)"
- This requires tagging `qscore_history` rows with `stage` + `industry` at insert time (already on `founder_profiles`) — then the percentile calculation can be filtered by cohort

**C. Score history chart**
- The dashboard shows one score — there's no history view
- A simple line chart of score over time (last 5 assessments) would make re-assessment feel rewarding
- Data is already in `qscore_history` — just needs a chart component

**D. What the investor sees**
- Founders don't know how investors interpret their score
- Add a "Investor View Preview" — shows exactly what an investor sees on the matching page when they click on this founder
- This creates urgency to improve the score

---

### 5. Investor Side — From Demo to Real

**This is the monetisation engine.** Without real investors, the platform has no "right side of the marketplace."

**What needs to happen in order:**

1. **Seed 15–20 real investor profiles** — manually create these from public AngelList/LinkedIn data. Real names, real theses, real check sizes. This transforms the matching page from "clearly fake" to "looks real".

2. **Wire the matching algorithm** — currently shows all investors regardless of Q-Score or thesis match. Logic needed:
   ```
   founder.qscore >= 65
   AND founder.industry OVERLAPS investor.sectors
   AND founder.stage IN investor.stages
   ORDER BY match_score DESC
   ```

3. **Wire connection requests to DB** — the modal currently updates local state only. Need to INSERT into `connection_requests` table on submit.

4. **Investor dashboard shows real requests** — once connection requests are in DB, the investor dashboard can query them by `investor_id`.

5. **Email notifications** — when a connection request is sent, the investor should get an email. Supabase has a `pg_net` extension for this, or use a simple webhook to Resend/SendGrid.

---

### 6. The "Wow Moment" — What to Build Next

The feature most likely to make a founder say "I need to keep coming back":

> **"Your Q-Score went up 12 points this week. Here's what changed — and what to do next."**

This requires:
1. Weekly digest email: pull `qscore_history` for all users, compare last two scores, generate a personalised Groq summary, send via email
2. Dashboard "What improved" card: show the delta with a natural language explanation
3. Agent "checkpoint": after 5 conversations with Patel, prompt "You've been working on GTM for 2 weeks — want to re-take the assessment to see if your score improved?"

This closes the loop and creates habit formation.

---

## Immediate Next Steps (ordered)

| # | Task | Why first | Effort |
|---|---|---|---|
| 1 | Route guards in `middleware.ts` | Security — data is exposed right now | 1hr |
| 2 | Wire per-agent system prompts into `/api/agents/chat` | Removes biggest gap between what's written and what runs | 1hr |
| 3 | Inject Q-Score dimension into agent context | Turns generic chat into targeted coaching | 2hr |
| 4 | Investor auth step in `/investor/onboarding` | API call currently fails with 401 | 1hr |
| 5 | Redirect if already authenticated in onboarding | Prevents duplicate accounts | 30min |
| 6 | Seed 15 investor profiles in DB | Makes matching page feel real | 2hr |
| 7 | Wire connection requests → `connection_requests` table | First real founder→investor interaction | 1hr |
| 8 | Streaming agent responses | Highest UX impact, medium effort | 2hr |
| 9 | `agent_actions` table + end-of-chat action extraction | Closes the coaching loop | 3hr |
| 10 | Score history chart on dashboard | Makes re-assessment rewarding | 2hr |

---

## What to Not Build Yet

- Stripe / subscription billing — no paying users yet to validate pricing
- Mobile app — web works fine at this stage
- Workshop registration — no workshops scheduled
- Portfolio tracking for investors — too early
- Social features (following, feeds) — premature complexity

---

## The One Metric That Matters Right Now

> **% of users who take the assessment AND have at least one agent conversation**

If this is low, the platform is a Q-Score calculator with a chat feature bolted on.
If this is high, founders are finding the loop and coming back.

Everything above is in service of making this number go up.
