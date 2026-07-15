# Edge Alpha — Start Here (the eagle view)

*Plain-language orientation. Read this first, then use the other docs for detail. Its job: total clarity on what's frozen, what folders to build, and which piece to build first.*

---

## 1. How your documents fit together

Seven documents, each answering one question:

| Document | Answers |
|---|---|
| **Starthere.md** (this) | *Where do I start and how is it laid out?* |
| **EDGE_ALPHA_PRD.md** | *What are we building and why?* — **canonical; wins any conflict** |
| **Roadmap.md** | *In what order and by when?* |
| **Featureinventory.md** | *What exactly does each feature need?* (the tickets) |
| **Architecture.md** | *What's the system and the stack?* |
| **DecisionLog.md** | *What's already been decided — don't re-open it* |
| **CLAUDE.md** | *The rules the coding agent follows every session* |

When building, you'll mostly live in **this doc + Featureinventory.md**.
Design source for the Registry: `docs/registry-source/Edge_Alpha_Agentic_OS_Template.xlsx` (seed only — never read at runtime).

---

## 2. The eagle view — the whole thing as one picture

Picture the product as a **body**.

- **The skeleton (bones)** = the shared machinery every executive uses: the Registry, the Prompt Composer, the Mandate, the Operating Rhythm, Asset Versioning, the Connector layer. Build the bones **once**; every executive plugs into them.
- **The head** = the **CEO perspective**. It owns the S001/S002 prompts — it reads the Q-Score and drafts the Executive Contract (the mandate). It is **not** a separate architectural layer: it runs through the same Composer and engine as everything else (ADR-013).
- **The first arm** = **Growth (Patel)** running **P001 GTM**. The first Program proven end to end. The runtime itself is **generic** — GTM is the proof case, not a special case (ADR-011).

**The plan in one line:** build the skeleton, add the mandate, then prove one Program end to end. Once one arm works, every other arm is a Registry entry.

You are **not** building 5 executives at once.

---

## 3. What to scrap — and the golden rule

**Golden rule: don't touch the old agents. At all. Not yet.**

We use the **strangler** approach (ADR-014): build everything new in **new folders**, behind a feature flag, while the old agents keep running untouched. Only when the new model reaches parity do you delete the old. Deleting early is how rewrites die.

So the honest answer to "what do I scrap?" is: **nothing right now.** You *freeze* the old, *build* the new beside it, *delete* later.

| Old thing | Now | Delete later? |
|---|---|---|
| `features/agents/{persona}` — persona prompts + logic | **Freeze** | Yes — after parity |
| `features/agents/{persona}/components/*Renderer.tsx` | **Keep — reuse these** | No, they're useful |
| `app/api/agents/**` — the ~170 per-agent routes (173 of 275, 63%) | **Freeze** | Yes |
| `features/agents/data/agents.ts` | **Freeze** | Yes — replaced by `lib/registry` |
| `lib/edgealpha.config.ts` | **Freeze**, then rewrite into `lib/registry` | Yes |
| `lib/agents/compose-system-prompt.ts` — the old 3-part assembler | **Freeze; do not extend** | Yes — dies with the old model |
| `app/founder/cxo` — the 11-agent chat UI | **Freeze** | Yes — replaced by the Command View |

**Never scrap — these are the bones you reuse:** `lib/agents/{task-graph, delegation, orchestrator, engine, memory-*, startup-state, context*}`, `lib/actions`, `lib/tools`, `lib/llm`, `lib/qscore`, `features/qscore`, the scheduler.

**Rule of thumb:** if you're editing a file inside `features/agents/**` or `app/api/agents/**`, stop — you're touching the old body.

---

## 4. The folder structure you'll build

Follows the existing conventions: shared logic in `lib/<thing>/`, feature UI in `features/<thing>/`, routes in `app/api/<thing>/`, pages in `app/founder/<page>/`.

```
lib/
├── registry/                     ← THE CATALOG (authoritative runtime source)
│   ├── types.ts                  Executive · ProgramTemplate · AssetDef · ActionDef
│   ├── index.ts                  getExecutive() · getProgram() · getAsset() · getAction()
│   ├── executives/
│   │   ├── ceo.ts                owns S001/S002 prompts
│   │   └── growth.ts             Patel (S003)   [product/operations/finance later]
│   ├── programs/
│   │   └── growth/
│   │       └── p001-gtm.ts       objective · successMetric · assets · actions · prompt refs
│   ├── assets/
│   │   └── growth/
│   │       ├── as001-icp.ts
│   │       ├── as002-pains-gains.ts
│   │       ├── as003-buyer-journey.ts
│   │       ├── as004-positioning.ts
│   │       └── as005-channel-strategy.ts
│   └── actions/
│       ├── validate-icps.ts
│       ├── interview-customers.ts      (irreversible → connector: gmail)
│       ├── prioritize-channels.ts
│       ├── review-messaging.ts
│       └── approve-gtm-plan.ts
│
├── prompts/                      ← THE WORDS (4-layer composition)
│   ├── compose.ts                the Composer + validation
│   └── knowledge/
│       ├── ceo.ts
│       └── growth.ts             lifted (read-only) from Patel's S003
│
├── mandate/                      ← SCORE → CONTRACT
│   ├── strategy.ts               S001
│   └── contract.ts               S002 — generate · confirm · new epoch (immutable)
│
├── rhythm/                       ← THE AUTONOMOUS ENGINE
│   ├── run.ts                    the weekly, idempotent cycle
│   └── types.ts
│
├── assets/                       ← COMPANY MEMORY
│   └── versioning.ts             new version · current · history · validate · founder edits
│
└── connectors/                   ← ACT IN REAL TOOLS
    ├── index.ts                  the adapter interface (send / read)
    ├── vault.ts                  token_ref → secrets manager
    └── gmail.ts                  first adapter

features/
└── executive/                    ← NEW founder-facing UI
    ├── components/               command view · mandate card · asset pages · approval drawer
    ├── hooks/
    └── types/                    (reuse the old *Renderer.tsx here)

app/
├── founder/
│   ├── executive/page.tsx        the Command View
│   ├── strategy/page.tsx         the Strategy Session
│   └── assets/[id]/page.tsx      Asset page (view + edit)
└── api/                          ← generic routes (NOT per-agent)
    ├── strategy/route.ts
    ├── contracts/route.ts
    ├── contracts/new-epoch/route.ts
    ├── rhythm/run/route.ts
    ├── programs/[id]/route.ts
    ├── programs/[id]/actions/[actionId]/route.ts
    ├── assets/[id]/route.ts                    GET (current + history) · PUT (founder edit)
    └── connectors/[provider]/oauth/route.ts    ← NOT /api/connections (taken)

supabase/migrations/
└── <timestamp>_executive_model.sql             all new tables
```

**Note the two things that do NOT exist here:** there is no `lib/outcomes/` and no evidence-pack route. The Outcome Loop and Evidence Pack are **deferred** (ADR-009) — do not create them.

---

## 5. Which do I build first? (skeleton → mandate → first arm)

**Step A — the skeleton (bones).** Registry → Prompt Composer → mandate tables → Asset Versioning → Briefings → Rhythm engine → Connectors. Shared by everything.

**Step B — the mandate (the head's job).** The CEO reads the Q-Score and drafts an Executive Contract activating P001; the founder confirms once. Build only what's needed for that — the CEO's own Programs come later.

**Step C — prove Growth / P001 end to end.** From mandate, through the rhythm, to versioned Assets, a Briefing, and (Story 3) one approved Action executed via Gmail.

> **Direct answer to "which first":** build the skeleton, keep the **CEO minimal** (just the mandate-maker), and **complete Growth / P001 first**. A fully-built CEO with no working arm produces plans nobody executes.

**Build order:** `F05 → F06 → F07 → F08 → F09` (Story 1) → `F11 → F12 → F10` (Story 2) → `F13 → F14` (Story 3).

---

## 6. Growth / P001, end to end — the exact sequence

Everything behind `NEW_EXECUTIVE_MODEL`; the old Patel untouched.

1. **Define it in the Registry.** `lib/registry/executives/growth.ts` + `programs/growth/p001-gtm.ts` — assets **AS001–AS005**, actions `[validate_icps, interview_customers, prioritize_channels, review_messaging, approve_gtm_plan]`. → **F05**
2. **Give it words.** `lib/prompts/knowledge/growth.ts` (lifted read-only from Patel's S003) + the P001 Program Prompt; wire `compose.ts` to assemble the 4 layers. → **F06**
3. **The mandate.** The CEO drafts an Executive Contract from the Q-Score; `app/api/contracts` persists it; the founder confirms on `/founder/executive`; P001 goes active. → **F07, F08, F09**
4. **The rhythm runs it.** `lib/rhythm/run.ts` executes P001: writes **versioned** AS001–AS005 and publishes a Briefing. Trigger manually first, Cron after. → **F10, F11, F12**
5. **The founder can edit any Asset.** A save creates a new immutable current version, used next cycle. No approval. → **F11**
6. **Connect Gmail.** `lib/connectors/gmail.ts` + vault + `app/api/connectors/gmail/oauth`. → **F13**
7. **One real Action, with approval.** `interview_customers` prepares invitations → founder approves → sends → `action_log`. → **F14**

When those work for one founder, **the arm is alive** — every other executive is the same steps with different Registry entries.

---

## 7. What "done" looks like (your first milestone)

A single founder can:

> get scored → the CEO drafts a mandate → the founder confirms it → the rhythm runs Growth's P001 → AS001–AS005 appear as versioned Assets and **improve across ≥2 cycles** → a Briefing is published each cycle → the founder edits an Asset and the next cycle uses it → the founder approves one outreach Action → it sends via Gmail → it's logged.

All behind the flag, with the old agents still running, untouched. **The Q-Score does not move from any of this** — that's correct, not a bug (ADR-005).

---

## 8. Before you start

1. **Phase 0 first** (see `Roadmap.md`): reconcile docs · add the flag · audit every creation path · pin the score invariant with a test · settle action-vs-cadence naming · billing test · make CI able to enforce the rules · add the FROZEN markers.
2. **Read `CLAUDE.md`** — it's the rules your agent follows.
3. **No blocking decisions remain.** Both prior open questions are resolved (PRD §14).

---

## One-paragraph summary

Don't touch the old agents — freeze them and build everything new in fresh `lib/registry`, `lib/prompts`, `lib/mandate`, `lib/rhythm`, `lib/assets`, `lib/connectors` folders, plus a new `features/executive` UI and a handful of generic API routes. Build the shared skeleton once, keep the CEO minimal (its only job is turning the Q-Score into a mandate the founder confirms), then prove Growth / P001 end to end — mandate → rhythm → versioned, founder-editable Assets → Briefing → one approved Action through Gmail. The Q-Score stays separate throughout. Prove that one arm, and every other executive is the same steps with different Registry entries.
