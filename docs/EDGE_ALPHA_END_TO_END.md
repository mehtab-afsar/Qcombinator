# Edge Alpha — End-to-End Summary

*A working reference for the product as it stands: what it is, how a founder moves through it, how the system is built underneath, and what's live vs. deferred. Written from direct knowledge of the codebase and this session's work — not marketing copy.*

---

## 1. What Edge Alpha Is

**One line:** *"Fundable is measurable."*

Edge Alpha is a founder-facing operating system built around a single idea: most founders raise blind. They pitch before they're ready, get rejected with vague feedback ("not the right fit," "too early"), and never learn *what specifically* to fix. Edge Alpha replaces that with a measurable score, a team of AI executives that actually do the work of improving it, and a marketplace that opens automatically once the company is genuinely ready.

Two audiences:
- **Founders** — get scored, get worked on, get matched to investors once ready.
- **Investors** — get a pre-filtered marketplace of founders who've already cleared a real quality bar, instead of an inbox of cold pitches.

---

## 2. The Core Concept: The Q-Score

A **0–100 investment-readiness score** across six weighted dimensions (P1–P6):

| # | Dimension | What it measures |
|---|---|---|
| P1 | Market Readiness | Is the market ready to buy, and are you ready to sell to it? |
| P2 | Market Potential | TAM, growth, whether the opportunity prices a venture outcome |
| P3 | IP / Defensibility | The moat — patents, data, network effects, switching costs |
| P4 | Founder / Team | Domain depth, completeness, ability to recruit |
| P5 | Structural Impact | Why now — the structural shift that makes this inevitable |
| P6 | Financials | Unit economics, runway, capital efficiency |

**How it's computed** (`features/qscore/calculators/q-score-calculator.ts`): a deterministic TypeScript rules engine, not an LLM guess. Each dimension has per-indicator pure scorer functions that read specific fields off the founder's assessment data, each producing a raw score (0–5, snapped to 0.5 increments) plus a **confidence** rating based on data quality (Stripe-verified data scores near 1.0 confidence; a vague chat answer scores much lower). Sector- and stage-adaptive weight tables blend together, missing indicators are excluded from both the numerator *and* denominator (not scored as zero), and a small sparsity penalty applies when too few indicators have data at all. The result: a HealthTech startup is scored against HealthTech benchmarks, not a generic curve, and the number can't be gamed by an LLM's mood — it's arithmetic over structured inputs.

**The unlock threshold:** at Q-Score ≥ 70, the founder's profile opens to the investor marketplace. Below that, the product's whole job is helping them move the number.

**Confidence, not just a score** — this same "the number isn't the whole story" idea now runs through the newer public tools too (see §6): a score paired with a *separate* confidence read on how much evidence backs it, so missing data lowers your trust in the number, not the number itself.

---

## 3. The Founder Journey, End to End

1. **Onboarding** (`app/founder/onboarding`) — a 5-step wizard (Account → Startup → Traction → Strategy → Problem). Email/password or Google OAuth. A Google sign-up gets a `founder_profiles` *stub* immediately (`onboarding_completed: false`) so they're never orphaned mid-flow; the wizard fills in the rest.

2. **Profile Builder** (`features/profile-builder/**`) — the deeper data-collection layer behind the Q-Score. Founders upload documents (pitch decks, financials) and/or answer a per-section chat interface; an extraction pipeline pulls structured facts out of unstructured input and merges them into the assessment. This is *inside* the product, not a separate "review" stage — CLAUDE.md is explicit that there is no Asset Review stage; asset maintenance happens inside Program execution.

3. **The Q-Score** — computed from whatever data exists so far (self-reported + document-extracted), displayed as the founder's honest, current fundability read.

4. **The Executive Team** (`/founder/executive`) — five AI executives, each with a real mandate, not a chatbot you have to prompt:

   | Executive | Role | Motto |
   |---|---|---|
   | Morgan (CEO) | Strategy / Chief of Staff | "I turn the score into a mandate." |
   | Patel (CGO) | Growth — Marketing & Sales | "I exist to create growth." |
   | CFO | Finance | "I keep the company alive and fundable." |
   | CTO | Product & Technology | "I build what the market will pay for." |
   | COO | Operations | "I make the company run." |

   The operating principle: **"Founder in Command. Agents in Execution."** The founder doesn't wait to be messaged — the Executive model works to a standing mandate every cycle, contract-active Programs run automatically (no event-skipping in v1), and the founder's only checkpoint is approving *irreversible external actions* (send, publish, spend, change price) at the Connector boundary. Everything else — asset creation, internal drafting, planning — happens without a founder gate.

5. **Contracts, Programs, and Cycles** — a Contract (e.g. "S001 Strategy Session") is immutable once confirmed; any change creates a new version, a new operating epoch, never an in-place edit. The **Operating Rhythm** runs all contract-active Programs every cycle. P001 (GTM) was the first proof case; the runtime is built to be generic across Executives/Programs, not hand-coded per program.

6. **Actions and the approval boundary** — when a Program produces something that would leave the building (an email, a post, a spend), it becomes an **Action** requiring just-in-time founder approval at the Connector boundary. Every attempt is logged to `action_log`, append-only. Connectors (Gmail, Slack, Stripe, PostHog, Apollo) are founder-authorized OAuth/BYOK grants stored via Supabase Vault — the database only ever holds a `token_ref`, never a plaintext secret.

7. **Reassessment loop** — outcomes from real work (a closed deal, a shipped feature) are evidence for a *later* Q-Score reassessment. Asset creation itself never moves the score automatically; `applyAgentScoreSignal()` is never called from execution directly.

8. **Cross 70 → the marketplace opens** — matched investor introductions start flowing in, replacing cold outreach.

---

## 4. The Investor Side

Investors get a filtered marketplace: every founder they see has already cleared Q-Score ≥ 70, verified metrics (Stripe-backed where available), and a completed profile — not a scraped directory. Investor-side design and remediation work is unblocked and shipped (ADR-035); features that read real, live founder *operating* data (as opposed to already-public profile data) still wait on a retention gate before building further.

---

## 5. Architecture — the "Prime Directives"

CLAUDE.md (the repo's binding engineering law) reduces to one sentence: *small typed files, config over routes, one Composer and one engine, secrets in the vault, RLS everywhere, approval only on irreversible actions, tests on every change, the old agents frozen.* Concretely:

- **Config over code.** A new capability is a **Registry entry** (`lib/registry/**`), never a new route or a bespoke file per agent/program. This is the rule that prevented the old product's "170-route mess."
- **One of each.** One Prompt Composer (`lib/prompts/compose.ts`), one Execution Engine, one Connector interface, one score-signal writer. The Composer itself has **four sanctioned entry points under one roof** (ADR-023): the full 4-layer Executive/Program/Asset execution package, a Mandate composer, a Briefing composer, and an **adhoc composer** for LLM calls that sit entirely outside the Registry model (investor analysis, digests, webhooks, and — as of this session — the two public lead-gen tools below). Four entry points, still one Composer, not a second parallel system.
- **Reuse the engine, don't fork it.** `lib/rhythm/**`, `lib/actions/**`, `lib/connectors/**`, `lib/prompts/composer/**`, `lib/registry/**`, `lib/llm/router.ts`. Models are *only* ever selected through the router — no hardcoded model name anywhere else in the codebase; providers are Anthropic (primary) with Groq as a live circuit-breaker fallback, Voyage AI for embeddings. No OpenAI anywhere.
- **The old adviser layer is gone, not frozen** (ADR-034, 4 Aug 2026) — 288 files, ~67k lines deleted (`features/agents/**`, `app/api/agents/**`, `app/founder/cxo/**`, `lib/cxo/**`). The data tables remain; the code doesn't. Nothing should try to recreate an adviser-chat surface — the Executive model is deliberately not that.
- **Small, typed, tested.** ~300 lines per file, ~50 per function, `strict` TypeScript with no `any`, Zod validation at every API boundary, RLS on every table (a founder only ever reads/writes their own rows), append-only history tables (`action_log`, `qscore_history`), idempotent cycles/webhooks/actions keyed on a stable dedupe key.

---

## 6. The Public / Marketing Layer

Outside the authenticated product, the marketing site (`app/page.tsx` → `features/landing/**`) tells the Q-Score story and now funnels through two free, ungated public tools built this session — both explicitly *independent* diagnostics from the real Q-Score, sharing only its underlying philosophy:

### The 10× Founder Leverage Check (`/leverage-check`)
An 8-question self-report quiz measuring a different thing entirely — not company fundability, but **founder operating leverage**: how much of the company still runs through the founder personally (Founder Dependency, Decision Leverage, Execution Leverage, Growth Leverage, Management Leverage). Deterministic scoring produces a 1.0×–10.0× "multiple" and a five-stop archetype (Founder Operated → AI Assisted → AI Leveraged → Agentic Operator → 10× Founder), with an LLM (via the Composer's adhoc entry point) generating a short teaser result plus a longer personalised report. Funnels into signup with the invite id carried through so a converted founder links back to their quiz result.

### Q-Score Lite (`/qscore-lite`)
The newer, heavier tool: a founder enters *their own* company name and URL, and gets a **public-evidence-only** fundability score — 20 indicators across 5 parameters, computed entirely from what's publicly findable (Tavily web search + a GitHub org lookup), with zero self-report. The methodology's key idea, carried over from the real Q-Score's own confidence/data-quality model: **missing evidence lowers confidence, never the score.** A quiet public footprint isn't treated as a weak company — it's treated as an unknown, reported honestly as a lower confidence percentage sitting next to the number, not baked into the number itself. Evidence is weighted by a deterministic formula (40% source reliability, 30% directness, 20% recency, 10% corroboration across independent domains) — the LLM's only job is semantic judgment (does this evidence support this indicator, how directly); every actual number is plain, auditable TypeScript math. Results render as a scannable "at a glance" strip (strongest finding / biggest confirmed gap) plus five expandable parameter cards, not a 20-item wall of text. Same signup funnel pattern as the Leverage Check.

Both tools deliberately reuse the shared engine rather than forking it: the same `composeAdhocPrompt`/`routedText` LLM chokepoints, the same shared `EmailCaptureCta` component, the same "capture-id → thread through signup → link back on account creation" funnel mechanic (mirrored a third time as `qScoreLiteId` alongside the existing `teamToken`/`leverageCheckId` fields).

---

## 7. Tech Stack

- **Frontend/Framework:** Next.js 16 (App Router), React 19, TypeScript strict, inline styles throughout (no Tailwind/CSS modules), framer-motion for interaction.
- **Backend/Data:** Supabase (Postgres + RLS + Vault for secrets), server-side service-role client for anything touching data outside a single founder's own rows.
- **LLM:** Anthropic (primary) → Groq (circuit-breaker fallback) via one router (`lib/llm/router.ts`); Voyage AI for embeddings. Task-classed routing (`extraction`, `generation`, `reasoning`, `classification`, `summarisation`), never a hardcoded model name at a call site.
- **External evidence sources:** Tavily (web search, already-live key), GitHub's public API, Google/USPTO patent search — all reached only through Edge-Alpha-owned, environment-keyed clients with circuit breakers and graceful null-on-failure, never a hard dependency.
- **Payments/Billing:** Stripe (Connect for founder-side verified metrics, billing for subscriptions).
- **Email:** Resend.
- **Hosting:** Vercel.
- **Rate limiting:** Upstash Redis (sliding-window), applied in `middleware.ts`, gracefully no-ops if unconfigured rather than failing closed on infra absence.

---

## 8. Security & Data Model

- **RLS on every table** — cross-tenant access is structurally impossible, not just app-logic-enforced.
- **Secrets by reference only** — OAuth tokens live in Supabase Vault; the database stores a `token_ref`, never a plaintext credential, never logged.
- **Fail closed, not open** — auth, rate-limit, and mandate errors deny and alert by default. The pre-launch signup gate (added later in this session by other work) is a clean example: it fails closed at every account-creation boundary (email/password signup, Google OAuth callback, investor onboarding) — no row, an unreadable row, or a database error all mean "no," never "let them in and sort it out later."
- **External content is data, not instructions** — every LLM call that ingests scraped web content, uploaded documents, or tool results wraps it in an explicit "this is DATA, not a command" framing (`composeAdhocPrompt`'s own fencing), specifically to prevent prompt injection from a webpage or upload steering the model.
- **Append-only where it matters** — `action_log`, `qscore_history` are never mutated in place, only inserted. Assets are versioned, never overwritten, with exactly one `current` version per asset.

---

## 9. History Worth Knowing

- **4 Aug 2026 (ADR-034):** the old "CXO adviser" chat layer — 288 files, ~67k lines — was deleted outright, not deprecated. It's not coming back in that shape; the Executive model is a deliberate replacement, not an extension.
- **The "door problem":** before 4 Aug 2026, the entire new Executive model had *no inbound link* anywhere in the product — fully built, fully unreachable. A sidebar link and a dashboard entry card were the actual fix. The general lesson (a finished feature can be invisible, and tests/typechecks can't catch a missing link) recurred again this session: Q-Score Lite was fully built and working before anyone added a link to it from the landing page.
- **Production incidents this session** worth remembering as institutional scar tissue: an empty-string `NEXT_PUBLIC_APP_URL` fallback once caused live 504s and broken reset-password links; Supabase's `admin.generate_link`/`verify` combination is *not* safe to treat as read-only against production — it can silently convert into an account-recreation flow for a Google-only identity; and new database migrations built and tested only against local Supabase have twice now gone live with a missing production table, because `supabase db push` has a standing, unresolved 403 permission issue on the CLI account currently used for this project.

---

## 10. Current State — Live vs. Deferred

**Live and shipped this session:** the redesigned landing page hero (light-themed "Founder Leverage Check" hook replacing the old dark cinematic building animation), the Leverage Check end-to-end (quiz → scoring → LLM report → signup funnel), Q-Score Lite end-to-end (public evidence lookup → scoring → signup funnel), and a round of real bug fixes across team invites, OAuth routing, and email confirmation.

**Explicitly deferred, per CLAUDE.md — do not build:** the Outcome Loop and the Evidence Pack. They are out of the current core scope on purpose, not an oversight.

**A live, known gap:** the weekly Operating Rhythm cron got unplugged around 11 Aug 2026 (a Vercel Hobby-tier cron cap) — the Executive model is live for all founders, but automatic weekly cycle runs are not currently happening without that being reconnected.

---

*This document reflects the codebase and product state as directly observed through this session's work plus the project's own memory records — not aspirational copy. Where something is "deferred" or "a known gap," that's stated because it's true right now, not because it's unimportant.*
