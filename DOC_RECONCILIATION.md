# Doc Reconciliation — 15 Jul 2026

*What changed, and by whose authority. `EDGE_ALPHA_PRD.md` + `DecisionLog.md` are canonical; three docs were a generation behind and have been rewritten to match. This is Step 0 of Phase 0 — done, so the coding agent can go straight to the flag and the audit.*

**Why it mattered:** the three stale docs weren't merely out of date — `Featureinventory.md` is written as **build tickets**, and it instructed an engineer (or AI) to build the **deferred** Outcome Loop and Evidence Pack as P0, and to call `applyAgentScoreSignal()` on an outcome — a direct violation of ADR-005. Contradicting docs are more dangerous than missing ones.

---

## Result

| Doc | Status |
|---|---|
| `EDGE_ALPHA_PRD.md` | ✅ canonical — 5 factual corrections applied |
| `DecisionLog.md` | ✅ canonical — unchanged |
| `Featureinventory.md` | 🔄 **rewritten** — reconciled + reformatted |
| `Architecture.md` | 🔄 **rewritten** — reconciled + reformatted |
| `Starthere.md` | 🔄 **rewritten** — reconciled, self-contradictions removed, reformatted |
| `Roadmap.md`, `CLAUDE.md` | ✅ already aligned (written after the review) |

*All three rewritten docs had also lost their markdown formatting when copied into the repo (tables flattened, headings stripped). Rewriting fixed drift and formatting together.*

---

## `EDGE_ALPHA_PRD.md` — 5 corrections

| # | Change | Authority |
|---|---|---|
| 1 | §2 Problem: the boost mechanism is **`ARTIFACT_BOOST` + `applyAgentScoreSignal()` in `features/qscore/services/agent-signal.ts`**, called from routes under `app/api/agents/**`. `qscoreBoosts` in `lib/edgealpha.config.ts` is **derived display data only** (read by `lib/cxo/cxo-config.ts`) | Codebase audit — the PRD named the wrong file; Phase 0 would have "decoupled" a display field |
| 2 | §7.2 composer example: "the Registry defines P001 under **A003 Patel (S003)**" → "under the **Growth** executive, whose Executive System Prompt is **S003**"; noted that workbook IDs are design-source nomenclature | Internal inconsistency — the roster maps P001 to `growth`, not to a workbook ID |
| 3 | §8 data model: table `connections` → **`connector_connections`** | `app/api/connections` + the founder→investor intro flow already own that namespace |
| 4 | §9 API: `POST /api/connections/:provider/oauth` → **`POST /api/connectors/:provider/oauth`** | Same collision; also aligns with the `/connectors/gmail/send` nomenclature in Roman's constitution |
| 5 | §12 + §15: connector references updated to `connector_connections` / `app/api/connectors/**` | Consistency with 3–4 |

> **Needs Roman's sign-off:** the `connectors` namespace decision (3–5). It's adopted here because the documented path collided with a **live** route; confirm before Story 3.

---

## `Featureinventory.md` — rewritten

| Change | Authority |
|---|---|
| **F15 Outcome Loop: P0/Phase 1 → ⛔ DEFERRED.** Removed its instruction to call `applyAgentScoreSignal()` on an outcome | ADR-009 (deferred) + ADR-005 (the score never moves from execution) |
| **F16 Evidence Pack: P0/Phase 1 → ⛔ DEFERRED** | ADR-009 |
| **F17 Investor Side → ⛔ DEFERRED** | ADR-009 |
| **F05: P001 assets `[AS001, AS004, AS013]` → `[AS001–AS005]`.** AS013 belongs to P004, not P001 | ADR-011 / PRD §10 |
| **F05: P001 actions** → the real registry set (`validate_icps`, `interview_customers`, `prioritize_channels`, `review_messaging`, `approve_gtm_plan`) | PRD §10 |
| **F05/F10: `runsWhen` removed** | ADR-008 — the rhythm runs all contract-active Programs in v1 |
| **F06: "Standard + Knowledge Base + Specific" → the fixed 4-layer nomenclature** (Executive System Prompt + Program Prompt + Asset/Action Instructions + Company Context) | ADR-012 |
| **F08: `PATCH /api/contracts/:id` → `POST /api/contracts/new-epoch`**; contracts immutable | ADR-003 |
| **F11: founder Asset editing added** (`PUT /api/assets/:id`, `authored_by`, new immutable version, no approval) | ADR-007 — was missing entirely |
| **F01 rewritten:** Q-Score is a separate diagnostic; Phase 0 does **not** change old-model behaviour; the invariant binds the new model only | ADR-005 + the score-decoupling decision |
| **F13: `connections` → `connector_connections`, `app/api/connectors/**`** | Namespace collision |
| **Build-order contradiction (old lines 382–383) resolved** to one chain: `F05 → F06 → F07 → F08 → F09 → F11 → F12 → F10 → F13 → F14` | — |
| Phases re-labelled to **Story 1/2/3**; stale `EDGE_ALPHA_MASTER_PRD.md` reference → `EDGE_ALPHA_PRD.md` | Roadmap.md |

---

## `Architecture.md` — rewritten

| Change | Authority |
|---|---|
| **§5 fixed:** "the score moved only by `applyAgentScoreSignal()` on proven outcomes" → the Q-Score is a **separate diagnostic** fed by Company Builder artefacts; nothing in the new model calls it | ADR-005 — the old line contradicted the PRD |
| **Prompt Composer: 3-layer → 4-layer** | ADR-012 |
| **`runsWhen` / event-awareness removed** from the rhythm; noted as a deferred optimisation | ADR-008 |
| **Outcome Loop, `outcomes` table and Evidence Pack removed** from the target layers and the "new" list | ADR-009 |
| **Connector namespace** → `connector_connections`, `app/api/connectors/**` | Collision |
| **§9 rewritten with the verified CI state:** Jest never runs in CI · Node 18 vs Next 16's 20.9+ · CI builds then discards (serves E2E against `dev`) · advisory phases non-blocking · no typecheck script | Codebase audit — these were absent from the docs |
| Verified mechanism of the score boost documented (`agent-signal.ts`, not `edgealpha.config.ts`) | Codebase audit |
| `compose-system-prompt.ts` noted as the old, frozen assembler | Codebase audit |
| Stale `EDGE_ALPHA_MASTER_PRD.md` reference → `EDGE_ALPHA_PRD.md` | — |

---

## `Starthere.md` — rewritten

| Change | Authority |
|---|---|
| **Self-contradiction removed:** the folder tree contained `lib/outcomes/{record.ts,map.ts}` while the doc's own text said to remove the outcomes layer | ADR-009 |
| **Step "a real result moves the score" removed**; step "build the Evidence Pack" removed | ADR-005, ADR-009 |
| **Two different folder trees → one tree**; **two sections numbered 4 → clean numbering** | Structural |
| **Four dangling doc references fixed** (`EDGE_ALPHA_MASTER_PRD.md`, `EDGE_ALPHA_ROADMAP.md`, `EDGE_ALPHA_FEATURE_BUILD_SPEC.md`, `EDGE_ALPHA_ARCHITECTURE_TECHSTACK.md` → the real filenames) | Files were renamed |
| **P001 assets `[AS001, AS004, AS013]` → `AS001–AS005`**; actions corrected | ADR-011 / PRD §10 |
| **Founder Asset editing added** to the sequence | ADR-007 |
| **CEO clarified:** owns S001/S002 but is **not** a separate architectural layer | ADR-013 |
| **`app/api/connections` → `app/api/connectors`** in the tree | Collision |
| `compose-system-prompt.ts` added to the freeze table | Codebase audit |
| Explicit note: **no `lib/outcomes/`, no evidence route — do not create them** | ADR-009 |

---

## Verification

- No doc marks a deferred layer (Outcome Loop, Evidence Pack, investor side) as P0 or Phase 1.
- No doc references `runsWhen`, `PATCH /api/contracts/:id`, "Standard + Knowledge Base + Specific", or AS013-in-P001.
- No doc says the score moves from execution.
- All doc cross-references resolve to real filenames.
- `docs/registry-source/Edge_Alpha_Agentic_OS_Template.xlsx` is in the repo with a README stating it is seed-only (ADR-010).

## Still open

- **Roman to confirm** the `connectors` namespace (PRD corrections 3–5).
- **`docs/PLATFORM_ARCHITECTURE.md`** is a pre-existing, superseded architecture doc — delete it or mark it "SUPERSEDED — see Architecture.md" so nobody reads the old design.
