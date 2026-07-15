# ⛔ FROZEN — do not edit anything in this folder

**Rule:** CLAUDE.md §0.4 · **Decision:** ADR-014 (strangler migration) · **Spec:** `EDGE_ALPHA_PRD.md` §11

This is the **old model**: 11 adviser personas. It is being replaced by the Executive model (Registry → Programs → Assets → Actions). It is **frozen, not dead** — it is the live product and it keeps running, untouched, until the new model reaches parity.

## The rule

> If you are editing a file in `features/agents/**` or `app/api/agents/**`, **stop** — you are touching the old body.

New work goes in `lib/registry`, `lib/prompts`, `lib/mandate`, `lib/rhythm`, `lib/assets`, `lib/connectors`, and `features/executive`, behind `FF_NEW_EXECUTIVE_MODEL` (`lib/feature-flags.ts`, default off).

**Do not delete this folder.** Deletion happens **last**, after parity, per ADR-014. Deleting early is how rewrites die — and deleting now breaks the live product.

## The exceptions — there are exactly two

1. **`{persona}/components/*Renderer.tsx` are reusable UI.** Keep them; **reuse, don't edit** (CLAUDE.md §0.4, ADR-014 salvage note). The new Executive UI is meant to render Assets through them.
2. **Security guards may be fixed in place (ADR-017)** — but *only* to restore an invariant CLAUDE.md §3 already mandates, with a minimal diff and a new ADR entry. Used once so far, for a fail-open cron guard.

## Things a well-meaning person might "fix" — don't

- **The Q-Score boost still fires here, and that is correct.** Routes under `app/api/agents/**` call `applyAgentScoreSignal()` on artifact creation. ADR-005 decouples the score for the **new** model only. **A change to old-model behaviour is a regression, not progress.** Enforced from the other side by `__tests__/score-invariant.test.ts`.
- **`lib/agents/compose-system-prompt.ts`** is the old 3-part prompt assembler. Frozen; do not extend. It dies with this model. The new path is the 4-layer `lib/prompts/compose.ts`.

## What is actually here

**11 personas:** atlas, carter, felix, harper, leo, maya, nova, patel, riley, sage, susi.
Paired with **173 routes** under `app/api/agents/**` — 63% of the entire 275-route API surface. That sprawl is the thing the Registry exists to end.

**Read before touching anything:** `PHASE0_AUDIT.md` — every artifact and action creation path, with file:line. It is the parity checklist: the new model is not done until it has replaced everything on it.

⚠️ **The freeze boundary is wider than this folder (ADR-018).** Artifact creation is **not** confined here — `app/api/investor/startup/[id]/memo/route.ts` and `features/founder/services/metrics.service.ts` also write `agent_artifacts` from outside the frozen tree. Freezing this folder does not freeze artifact creation.
