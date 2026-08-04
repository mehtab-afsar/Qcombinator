# Claude Code prompt — build The Frame (F07 "the unveiling" + entry router + Command View home)

> The machine is done. The founder-facing experience was never built — F07 is still the placeholder
> form the code itself calls temporary. Every pilot founder walks through this first, so it is a
> **precondition for the pilot, not polish**. Build it to `UX_SPEC_the_frame.md` and the two mockups.
> **This is UI + wiring, not new machinery.** Config over code still holds.
>
> **Staged: A → stop → B → stop → C → stop → D.** Never run ahead.

---

## Read first, and treat as the target
1. `UX_SPEC_the_frame.md` — the whole spec. **§3 "THE UNVEILING" is the canonical design.**
2. The two mockups are the visual target: `the_unveiling_direction_to_team` (the descent) and
   `executive_team_command_view` (the home). Build to look and feel like these.
3. `CLAUDE.md` (rules), `DecisionLog.md` — especially **ADR-002** (no per-cycle approval gate),
   **ADR-003** (contract immutable; a change = a new epoch, never an edit).
4. The existing pieces you WIRE, not rebuild: the `S001_STRATEGY_SESSION` prompt
   (`lib/prompts/knowledge/ceo-s001.ts`), the Composer, F08 mandate generation
   (`lib/mandate/**`), the Registry, the weekly briefing, the Story 3 approval gate + Gmail send.

## Hard rules
- **Kill the form.** The mission/priorities/goals form (`app/founder/strategy/page.tsx`) is replaced,
  not extended. The founder never authors mission/priorities/goals in boxes again.
- **Propose, never ask.** Every screen leads with what the system knows (the founder's real Q-Score
  and numbers). No cold input. If the data is thin, say so honestly — never fabricate a confident read.
- **No new machinery.** No new Registry mechanics, no new rhythm/mandate logic. You are building the
  front-end frame and wiring the *existing* S001 session + F08 generation to it. Models through
  `lib/llm/router.ts` only.
- **No per-cycle approval anywhere on the Command View** (ADR-002). The only approvals in the whole
  product: confirming the mandate once, and irreversible sends at the Connector boundary (Story 3).
  The F09 code already carries this warning — do not add "approve this week's work".
- **"Change direction" = a new mandate/epoch, never an edit** (ADR-003).
- Everything behind `FF_NEW_EXECUTIVE_MODEL`.

---

## Stage A — The entry state-router (build first; it unblocks the rest)

One front door that routes by founder state (promote the dashboard's existing `useQScore` + contract
logic into the real entry):

| State | Route to | Leading line |
|---|---|---|
| No Q-Score | Q-Score / profile builder | "Before your team can work, they need to know where you stand." |
| Scored, no mandate | The Unveiling (Stage B) | "You're scored. Let's set your direction." |
| Mandate confirmed | Command View (Stage C) | (no prompt — it's home) |

**Never route a founder with no score to a mission box.** Show me the routing working across all
three states. **Stop.**

---

## Stage B — F07 "the unveiling" (the core of this task)

Build the single-descent experience from `UX_SPEC` §3 and the `the_unveiling_direction_to_team`
mockup. One screen, one continuous flow, five layers connected by the thread:

1. **The read** — the CEO (name the Chief of Staff, e.g. "Morgan") states what the score/deck/answers
   show, in serif voice. Generated via the existing S001 prompt through the Composer. Warm, sharp,
   specific to this founder's real numbers. **Not a question.**
2. **The proposed direction** — a one-line statement the founder can **Nudge** (opens a short reshape
   conversation — streamed), never a blank box.
3. **The mandate hardens** — the direction crystallises into priorities + success metrics (this is
   F08 generation running on the confirmed direction). A solid card. Show the machine doing the work.
4. **The team claims it** — each active executive steps forward with one line of what they take on
   (from the Registry — who owns which Program under this mandate).
5. **One confirm** — flows into Stage B.5.

**B.5 — Confirm the mandate.** One weighty page/section, plain-language contract, the locked note.
On confirm: F08's immutability trigger + Program activation fire (already built) → land on the
Command View with the one-time team reveal.

Constraints: streamed where the model speaks; serif for executive voice, sans for chrome; sentence
case; the copy rules in `UX_SPEC` §6 (ban "leverage/seamless/unlock/simply/just", no "!"). Show me
the built flow running against a real scored founder — I want to *read* it. **Stop.**

---

## Stage C — Command View (F09) as the home

Build to the `executive_team_command_view` mockup + `UX_SPEC` §5: the mandate on top with a quiet
"Change direction"; the Q-Score large at centre with its trend; **all five executives around it,
idle ones present but muted**; this week's briefing in serif voice; the single pending action
("Review to send") if a Program prepared an irreversible one.

- The one-time "team assembles" reveal on first arrival only; calm working view every visit after.
- Reuse the existing F10b cycle panel / briefing data — don't rebuild it, reframe it into this layout.
- **No approve/dismiss on briefings. No per-cycle approval control.**

Show me the home rendered for a founder with an active mandate. **Stop.**

---

## ⏸ PILOT GATE — stop here, ship Depth 1, run the pilot

Stages A–D are **Depth 1: the Frame** — the pilot's front door and the minimum that isn't a form.
**Ship this and get founders through it before building the canvas.** Everything below (Depth 2)
is the richer interface; it builds on the same Command View foundation, so nothing is wasted by
waiting. Do not start Depth 2 until Depth 1 is live and a pilot has walked the arc. When you resume,
the spec is `CANVAS_SPEC.md`.

---

## Stage D — Verify + report
- Walk the full arc against a real scored founder: score → unveiling → confirm → command view. One
  clean continuous experience, no forms, no "version 1" dead-ends, no screen-jumps.
- Confirm: no per-cycle approval anywhere; "change direction" creates a new epoch; briefings unchanged
  in data (provenance intact); models routed; new-machinery untouched.
- Report what you built, what you deliberately reused, and — plainly — anything that doesn't yet match
  the mockups, so I can judge the *feel*, not just the function.

## Definition of done
- [ ] The form is gone. A founder never types mission/priorities/goals into boxes.
- [ ] Entry routes by state; no cold mission box for the unscored.
- [ ] F07 is the single-descent unveiling — read → direction → mandate → team → one confirm — and it
      reads like a sharp executive wrote it, streamed, in serif voice.
- [ ] Confirm is one weighty signature; a change starts a new epoch.
- [ ] Command View is the home, matching the mockup; no per-cycle approval.
- [ ] Behind the flag; existing machinery reused not rebuilt; models routed; tests + build green.

## How to report
Show real running output — the actual unveiling text for a real founder, the rendered home — not a
description. The entire point is that the current thing *feels* dead; the only proof it's fixed is
that it *reads* and *feels* alive. Say what still doesn't match the mockups.

---
---

# PART 2 — DEPTH 2: THE CANVAS (only after Depth 1 ships + the pilot walks it)

> Spec: `CANVAS_SPEC.md`. Visual target: `patel_canvas_gtm_cockpit`. The four design decisions are
> settled there — do not re-open them. This is a **view over existing data** (`asset_versions`,
> `action_log`, the rhythm engine) — not new machinery. Same staging discipline: E → stop → F → stop → G → stop → H.

### The settled decisions (from CANVAS_SPEC §1 — build to these, don't relitigate)
- **One interface, progressive depth** — the hub is calm, the cockpit is dense, no separate "simple mode".
- **Auto-laid-out, NOT a freeform draggable whiteboard** — the system draws it; the founder navigates.
- **Nodes open read-first** — edit + direct-the-AI live one layer deeper.
- **Chat commands the map but never skips the approval gate** (ADR-004).

## Stage E — make the hub navigable
The Command View's executive nodes become **enterable**. Click Patel → transition into Patel's canvas
(§F), clearly "inside" Patel (breadcrumb / back-to-team). Idle executives explain themselves rather
than opening an empty cockpit. Everything still orbits the Q-Score. **Stop.**

## Stage F — the executive canvas template (Patel first, but GENERIC)
Build the cockpit from `CANVAS_SPEC` §4 + the mockup: anchor · bird's-eye stats · versioned document
nodes · action nodes with status (incl. "waiting on you") · the activity log · the chat rail. **Build
it generic and Registry-driven** — no Patel-specific structure. Read every node from existing tables
(the §7 mapping). **Stop.**

## Stage G — node workspaces + chat-as-command
- **Node workspace (read-first, CANVAS_SPEC §5):** click a document → current version rendered clean;
  underneath, quiet: version history, inline edit (→ founder version), "ask the executive to rework this".
- **Chat-as-command (§4.6, D4):** per executive — query, steer, initiate. **Every irreversible act
  routes through review-to-send. Chat never bypasses the gate.** **Stop.**

## Stage H — replication + verify
- **Prove replication:** a second executive (Finance or Ops) renders its cockpit from the Registry
  with **zero bespoke design work**. If it needs hand-building, the template isn't generic — fix that.
- Verify: no per-cycle approval anywhere; irreversible acts gate whether triggered by cycle or chat;
  "change direction" makes a new epoch; it's a view over existing data with no new tables; behind the flag.
- Report what's built, what's reused, and anything not yet matching the mockups.

### Definition of done (Depth 2)
- [ ] Hub nodes enterable; clicking an executive opens their cockpit, clearly "inside" them.
- [ ] The cockpit is a **generic template** — a second executive renders from the Registry, no new design.
- [ ] Document nodes open read-first; versions/edit/direct-AI underneath.
- [ ] Chat per executive queries + initiates; every irreversible act gates.
- [ ] A view over `asset_versions` / `action_log` / the rhythm engine — **no new machinery**. Behind the flag.
- [ ] Matches `patel_canvas_gtm_cockpit`.
