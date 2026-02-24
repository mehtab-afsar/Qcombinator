# Qcombinator — Progress & Next Steps

_Last updated: 2026-02-25_

---

## What's Built ✅

### Infrastructure
- Next.js 14 App Router + Supabase + Auth (magic link + OAuth)
- Cream design system — `bg=#F9F7F2`, `surf=#F0EDE6`, `ink=#18160F` — applied across all pages
- RLS policies, DB schema (8+ tables), migrations
- Route guards in `middleware.ts`

### Founder Flow
- Onboarding chat (Groq LLM) → LLM extraction → Q-Score saved to DB (`data_source: 'onboarding'`)
- Assessment interview (multi-topic, GPT-4o) → Q-Score refinement + pre-populates from onboarding
- Q-Score calculator: 6 dimensions (market, product, GTM, financial, team, traction)
- Confidence-aware scoring + bluff detection (round numbers, impossible ratios, AI buzzwords)
- Division-by-zero guards in market scorer; interview auto-terminates at 25 exchanges / 4 per topic
- Founder dashboard with Q-Score, SVG sparkline score history, agent cards
- Auth redirect on onboarding (already-authenticated users go to dashboard)

### Agent System
- 9 agents (Patel, Susi, Maya, Felix, Leo, Harper, Nova, Atlas, Sage) with dedicated system prompts
- OpenRouter SSE streaming for all non-Patel agents
- Patel: 2-pass system (chat → tool_call detection → artifact generation); artifacts saved to `agent_artifacts` and loaded on subsequent visits
- Felix: financial panel (FinancialPanel component)
- `agent_actions` table + `/api/agents/actions` POST+PATCH extraction API
- Action items UI on agent chat page: "Get action items" button (appears after 4 messages), panel with priority badges and status toggles
- Usage limits: 50 messages/month per user; auto-resets on 1st of month; 429 shown as in-chat message

### Investor Flow
- Investor onboarding (4 steps) with auth; redirect if already authenticated
- Investor portal: sidebar nav (dashboard, deal flow, connections, messages)
- `/api/investor/deal-flow` — real founder profiles + Q-Scores from DB; falls back to mock if empty
- `/api/investor/connections` GET+PATCH — real connection requests with founder_profiles JOIN
- Investor dashboard fetches real connections + deal flow from DB
- Deal flow list: Q-Score badges, filters, stage labels
- Connection request cards, decline feedback form, meeting scheduler modal
- Messaging UI (Signal Network) for both founder and investor routes

---

## Remaining

All planned items complete. Future enhancements if needed:
- Stripe billing integration (upgrade from free tier)
- Push notifications (browser or mobile)
- Admin dashboard (user management, usage analytics)

---

## Scripts (keep)
- `scripts/seed-demo-user.mjs` — Seeds real Supabase DB: `node scripts/seed-demo-user.mjs`
- `scripts/test-qscore.ts` — Tests scoring: `npx tsx scripts/test-qscore.ts`
- `scripts/verify-database.ts` — Checks all tables: `npx tsx scripts/verify-database.ts`

## Reference Docs (keep)
- `STRATEGY.md` — Product vision, 3 loops, what not to build yet
- `edge-alpha-architecture.md` — Full DB schema, RLS policies, system architecture
