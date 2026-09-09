# Edge Alpha

A founder operating system: an AI Executive team that works to a founder's mandate — running Programs, maintaining living documents, and (with just-in-time approval) acting in the founder's real tools — plus a Q-Score, an evidence-based investment-readiness score across six dimensions.

Live at [edgealpha.vc](https://www.edgealpha.vc).

## What this actually is

Most of what looks like "AI features" here is one engine, reused everywhere, not a pile of one-off agents:

- **The Registry** (`lib/registry/**`) — Executives, Programs, Assets and Actions are *config*, not code. Adding a capability means adding a Registry entry, not a new route.
- **The Composer** (`lib/prompts/compose.ts`) — the one place a prompt gets assembled, in a fixed layer order (Executive system prompt → Program prompt → Asset/Action instructions → Company Context). Nothing prompts a model directly.
- **The Operating Rhythm** (`lib/rhythm/**`) — runs every contract-active Program on a cycle, generating and versioning Assets, writing Briefings.
- **Actions & Connectors** (`lib/actions/**`, `lib/connectors/**`) — the one place execution touches the outside world (send an email, post to Slack). Everything else is reversible and needs no approval; an irreversible external Action always does, at the Connector boundary.
- **The Q-Score** (`features/qscore/**`) — a separate, evidence-based diagnostic across six dimensions (P1–P6). It never moves automatically from Executive work — that's enforced by a test, not just a rule.

See [`CLAUDE.md`](./CLAUDE.md) for the full set of engineering rules this repo is held to, and [`docs/EDGE_ALPHA_END_TO_END.md`](./docs/EDGE_ALPHA_END_TO_END.md) for a plain-English walkthrough of how it all fits together.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Supabase (Postgres + RLS + Vault) · Anthropic (primary LLM, Groq as live fallback) · Stripe · Resend · Vercel. Inline styles throughout — no Tailwind component library, no CSS modules.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values you need — see below
npx supabase start           # local Postgres + auth + storage, via Docker
npm run dev                  # http://localhost:3000
```

**Minimum to run locally:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (from `supabase start`'s output), and `ANTHROPIC_API_KEY`. Everything else in `.env.example` is a real integration (Stripe, Resend, PostHog, Sentry, Google/Slack OAuth, …) — the app degrades gracefully without them; you'll see a startup log listing what's missing.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm test` | Jest — unit/integration suite |
| `npm run test:e2e` | Playwright — critical-path E2E |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run verify-db` | Sanity-checks the DB connection/schema |

Before calling any change done: `npm run typecheck`, `npm test`, and `npm run lint` clean.

## Project layout

```
app/                Next.js routes — thin: validate → call lib/ → return
lib/                 Business logic. Registry, Composer, Rhythm, Actions, Connectors, LLM router
features/            UI feature modules (one per surface: qscore, executive, profile-builder, …)
supabase/migrations/ Every schema change — additive, reversible, RLS on every table
docs/                PRD, architecture, per-feature design docs, decision log
__tests__/           Jest suite (mirrors the lib/ modules under test)
```

## Ground rules

This codebase is actively guarded against the kind of sprawl AI-assisted development tends to produce — see `CLAUDE.md` for the full list, but the short version:

- Config over code — a new capability is a Registry entry, not a new route.
- One of everything — one Composer, one Execution Engine, one Connector interface, one score-signal writer.
- ~300 lines per file, ~50 per function. Split when it grows.
- RLS on every table. Secrets by reference (Vault), never plaintext. No `any`.
- Append-only history where it matters (`qscore_history`, `action_log`) — insert, never mutate.
- Tests on every change, including the failure paths.

If a change would violate one of these, stop and fix the approach before continuing — that file is the actual law for this repo, checked in at the root so every session (human or agent) reads it first.
