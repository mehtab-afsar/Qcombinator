# Missing Work — Mo's list

*Things only you can do. Everything here is **outside the code** — keys, accounts, plan settings and sign-offs. Nothing in this file blocks Story 1; several items block Story 3 or block charging anyone.*

*Compiled 15 Jul 2026 from the Phase 0 audit. Detail: `PHASE0_AUDIT.md`.*

---

## ⚠️ START HERE — this may void half the list

Vercel → Project → Settings → Environment Variables has a **"Shared"** tab next to "Project". Team-level variables live there and I could not see it.

- [ ] **Check the "Shared" tab.** If the keys below are there, most of this file is already done and only the genuinely-absent ones matter.

The **Project** scope currently holds **5** variables. The code reads **33**. The list below assumes Shared is empty — correct it once you know.

**Present today (5):** `ANTHROPIC_API_KEY` · `SUPABASE_SERVICE_ROLE_KEY` · `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `NEXT_PUBLIC_APP_URL`

> Those 5 are **exactly** the "critical" list in `lib/env.ts` (plus one). That file separates *critical* (won't boot) from *recommended* (degrades quietly). **All four "recommended" keys are missing** — so production starts, prints a warning nobody reads, and silently runs without email, cron auth, web research and LLM failover.

---

## 1. Money — billing cannot work at all

Nobody can subscribe today. **This is why the new billing test matters: it guards the path for when you switch it on.**

- [ ] `STRIPE_SECRET_KEY` — without it there is no checkout and no webhook verification
- [ ] `STRIPE_WEBHOOK_SECRET` — every incoming Stripe event is rejected with a 400
- [ ] `STRIPE_FOUNDER_PREMIUM_PRICE_ID` — founder checkout can't build a session
- [ ] `STRIPE_INVESTOR_PRO_PRICE_ID` — investor checkout can't build a session

**Do this before:** charging a single person.

## 2. Email — nothing sends, and nothing ever has

- [ ] `RESEND_API_KEY` — **all** email. Weekly founder digests, day-1/day-7 nudges, outreach, proposals, investor updates, team invites
- [ ] `RESEND_FROM_EMAIL` — the sender address
- [ ] `RESEND_WEBHOOK_SECRET` — delivery/open/reply callbacks that keep `outreach_sends` accurate

**Do this before:** Story 3 (the whole story is "send a real email with approval").

> Worth knowing: `weekly-automation` returns `{skipped: true}` without this key. It has been quietly no-opping every Monday, not failing loudly.

## 3. ~~Groq~~ — NOT NEEDED. The stack is Anthropic-only.

**Decided (Mo, 15 Jul 2026): there is no Groq. The LLM stack is Anthropic, full stop.** `GROQ_API_KEY` is **not** missing work — do not add it.

Two consequences to be aware of, neither of which is a task for you:

- **The Groq failover is dead code.** `lib/llm/providers/index.ts:15-21,43-53` reaches for Groq whenever Anthropic errors or its circuit breaker trips. With no key it returns null and rethrows — so the branch never fires and never will. It should be removed when the LLM layer is next touched (**an engineering task, tracked in `PHASE0_AUDIT.md`, not here**).
- **No LLM failover is now an accepted risk, not a gap.** An Anthropic outage stops chat, artifacts and Q-Score reconciliation. That's a deliberate trade (one vendor, less complexity), not an oversight.

⚠️ **The docs disagree with this and need correcting.** `Architecture.md:72` still lists the LLM layer as *"`lib/llm/router.ts` → **Groq** (llama-3.3-70b, llama-3.1-8b) + **Anthropic**"* and claims *"vendor independence"* as an architectural property. With Anthropic-only that line is false, and "vendor independence" is not a property this system has. **Same class of drift Step 0 was meant to clear.**

## 4. Cron — 4 of 5 scheduled jobs have never run

- [ ] `CRON_SECRET` — `weekly-automation`, `drip-emails`, `investor-match-alerts` and `schedule/run` all refuse without it (401/503). They are registered and Enabled in Vercel, and they do nothing.

⚠️ **Read before you add it.** Two things happen the moment this key exists:

1. **`atlas/weekly-scan` is currently public.** Its auth guard fails open (`if (cronSecret && ...)`) — anyone can call it. Today that's harmless *only* because `TAVILY_API_KEY` is also missing, so it makes no paid calls. **Adding `TAVILY_API_KEY` without deploying the ADR-017 fix turns a public endpoint into a public way to spend your money.** The fix is on branch `phase-0-ground-clearing`. **Deploy it first.**
2. **Founder emails switch on.** `weekly-automation` will email up to 500 founders at 09:00 Monday, and `drip-emails` up to 100/day. They've been dormant. Don't discover that on a Monday morning.

**Order:** deploy the fix → add `CRON_SECRET` → then `TAVILY_API_KEY` → then `RESEND_API_KEY`.

## 5. Agent tools — features that silently do nothing

Each of these makes an advertised feature a no-op. No error, no warning; it just doesn't work.

- [ ] `TAVILY_API_KEY` — web research, competitor scans, Atlas's whole tool set *(see the warning above)*
- [ ] `HUNTER_API_KEY` — contact enrichment (`lead_enrich`)
- [ ] `APOLLO_API_KEY` — lead lists, `bulk_enrich_pipeline`
- [ ] `NETLIFY_API_KEY` — landing-page deploys, blog publishing, fake-door tests
- [ ] `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `VAPI_VOICE_ID` — AI voice calls *(irreversible — real phone calls. Treat with the same care as email.)*
- [ ] `CALENDLY_API_KEY`, `CALENDLY_USER_URI` — booking links

## 6. Internal plumbing

- [ ] `INTERNAL_RUN_SECRET` — async artifact generation and delegation processing. Without it those paths fail auth.
- [ ] `INTERNAL_API_SECRET` — investor alerts. *(Low priority — the audit found nothing calls that route.)*

## 7. Admin

- [ ] `ADMIN_EMAILS` — comma-separated. Empty means **every admin route 403s, including yours.** It fails closed, which is safe, but you cannot use the admin panel.

## 8. Analytics & optional

- [ ] `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` — product analytics. **You are flying blind on usage without these** — and ADR-016 makes week-4 retention the go/no-go for the whole plan. **You cannot measure your own success metric.**
- [ ] `POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID` — server-side queries + Nova's `posthog_query` tool
- [ ] `VOYAGE_API_KEY` — investor-matching embeddings. Degrades gracefully to formula-only.
- [ ] `HELICONE_API_KEY` — LLM observability. Genuinely optional.
- [ ] `ENABLE_RECONCILIATION` — Q-Score reconciliation flag.

---

## 8b. The design workbook has three bugs — only you can fix the source

`docs/registry-source/Edge_Alpha_Agentic_OS_Template.xlsx` is the **design source** (ADR-010). The code works around all three, but a corrupted source re-corrupts the next lift — and the next person may not notice.

- [ ] 🔴 **S003 (Growth) is pasted into its cell TWICE.** Two byte-identical 8,522-character copies, back to back. The cell reads 17,124 chars; the real prompt is ~8,600. Lifting it raw sends the model **the same instructions twice** — wasted context and a real confusion risk. *The code deduplicates on lift and a test pins it, so nothing is broken today.* Fix: delete the second copy (everything from the second `## Executive Motto` onward).
- [ ] 🟠 **S001 (CEO Strategy) has 3 repeated headings** — the same class of bug, partially. S001 is F07's input, so worth fixing before the Strategy Session is built.
- [ ] 🟠 **The Action layer was never generated.** The **Action Registry sheet is empty**, and the "Action Prompt" sheet contains a single row — `ACT001 — Action Registry Generator`, a *meta-prompt whose job is to generate the Action Registry*. It looks like it was written but never run. Consequences:
  - Action ids, `irreversible` flags and connector mappings **do not exist** anywhere in the workbook. The Registry derives all five of P001's actions from PRD §10 instead, and says so in each file.
  - There are **no per-action instruction prompts**, so Actions cannot be composed. The Composer validates them correctly and then throws a clear "no prompt registered for ref" error. **Asset composition is complete and unaffected.**
  - **This blocks Story 3 (F14 — Actions + approval), not Story 1 or 2.** Either run ACT001 to generate the registry, or accept that PRD §10 is the source for P001's actions and the rest get defined when their Programs are.

## 8c. 🔴 A real security bug — 4 tables have RLS enabled but not enforced

*Engineering work, not keys — but it needs your decision on when, so it lives here too. Full detail: `PHASE0_AUDIT.md` §8d.*

- [ ] **Drop 4 broken RLS policies.** `founder_metric_snapshots`, `scheduled_actions`, `agent_goals`, `delegation_tasks` each carry a `for all using (true)` policy with **no `TO` clause**. That applies to *everyone*, and Postgres OR's policies together — so it **overrides** the founder-scoped rule next to it.

  **In plain English:** any person with an account can read every other founder's **financial metrics** and **outreach contact lists** from their browser. The policies were meant to give the service role access — but Supabase's service role bypasses RLS anyway, so they grant the world access to achieve nothing.

  The fix is to delete four lines. It is deliberately **not** bundled into the Story 1 work, because it changes live data access and deserves its own review and its own cross-tenant tests.

  ⚠️ Note `20260421000008_fix_missing_rls.sql` — a migration named *"fix missing RLS"* — added a correct policy but never deleted the broken one, so it fixed nothing. Worth knowing that a past attempt at this already missed.

## 9. Vercel plan

- [ ] **Confirm the plan.** The Cron page showed *"Cron jobs on Hobby have a flexible time window of 1-hour"* — so you're on **Hobby**, with **5** crons registered.
  - Hobby limits how many crons actually run (believed 2/project — **verify, don't take my word**). If real, some of those 5 have never fired regardless of the missing secret.
  - The **1-hour drift** is fine for the Operating Rhythm's design (idempotent, keyed to a week), but Story 2 adds a **6th** cron. A plan upgrade may be a prerequisite.

## 10. Sign-offs needed

- [ ] **Roman — the `connectors` namespace (ADR-021).** The documented path (`/api/connections`, table `connections`) collided with a live founder→investor feature. Adopted `app/api/connectors/**` + `connector_connections` and built the docs to it. No code depends on it yet, so a reversal is a cheap rename — but confirm before Story 3.
- [ ] **`docs/edge-alpha-cto-review.md`** — you said leave it. Flagging once more only because it isn't in `DOC_RECONCILIATION.md`, so nobody knows if it's live.

## 11. Operational (from PRD §14 — carried over, still open)

- [ ] **InnoSphere-owned accounts.** Supabase / Vercel / Stripe / LLM providers are on personal accounts. Migrate before this is a company asset. *(The env vars are dated April — worth doing once, properly, rather than twice.)*
- [ ] **Human security review of the Connector layer** — the PRD requires this **before Story 3 ships**. Highest-risk surface in the product: OAuth tokens plus irreversible sends.
- [ ] **Quality-management / review agenda.**

---

## The short version

**Nothing here blocks Story 1** — the Registry is pure code.

Two things are worth doing regardless of the roadmap:

1. **Check the Shared tab** — it may void most of this.
2. **PostHog** — you cannot measure week-4 retention, and that is the metric ADR-016 says decides whether any of this widens. You are flying blind on the one number that matters.

And one sequencing rule that matters more than the rest: **deploy the ADR-017 fix before you add `TAVILY_API_KEY`.** Right now the missing Tavily key is the only thing making a public endpoint harmless.
