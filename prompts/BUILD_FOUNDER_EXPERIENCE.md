# Claude Code prompt — build the Founder Experience spine (mandate → activation → artefacts → direct → actions)

> The machine is built; the *experience* after the Q-Score is thin — "input boxes and loaders," the AI
> feels handicapped, the artefacts are invisible, there's no head-and-tail. This fixes that. It is a
> **requirement now**, written into the PRD: see `EDGE_ALPHA_PRD.md` §4 "The founder experience — the
> spine." Build to that section and the two mockups: `activation_watch_your_team_build` and
> `patel_canvas_gtm_cockpit` (use the cockpit only as the artefact-centric reference, NOT the full canvas).
>
> **Staged: 1 → stop → 2 → stop → 3 → stop → 4 → stop → 5.** This is surfacing + wiring over machinery that
> already exists — NOT a new engine. Behind `FF_NEW_EXECUTIVE_MODEL`. Models via `lib/llm/router.ts`.

## The non-negotiable guardrails (from the DecisionLog — do not violate)
- **No adviser-chat surface** (ADR-034). Interactivity is *scoped* — "ask Patel about THIS document" — never
  an open-ended messaging window.
- **Artefacts never move the Q-Score** (ADR-005). Making documents visible must not re-introduce the
  "document production = progress" flaw.
- **No per-cycle approval** (ADR-002). The only two approvals: confirming the mandate once, and irreversible
  sends at the Connector boundary (ADR-004).
- **A change of direction = a new epoch** (ADR-003), never an in-place edit.
- **Show real output at every stage.** The whole complaint is that it *feels* dead — the only proof it's
  fixed is that it *reads and feels alive*. Descriptions are not acceptable; run it and show the real thing.

---

## Stage 1 — The mandate & direction (the unveiling) — verify it delivers

F07 "the unveiling" just shipped (commit e628028). Before building forward, prove it actually delivers the
spine's step 2, against a real scored founder:
- The CEO **reads** the score and **proposes** a direction — the founder never types into a blank box.
- It **hardens** into a mandate; the team steps forward; **one** confirmation.
- Streaming feels like a continuous descent, not two buffering waits (the S001 stream + the S002 draft).

Report the real run — the actual read text, the hardened mandate, the team lines. If the pacing buffers or
the read doesn't stream, fix that here. **Stop.**

---

## Stage 2 — Activation: run the first cycle ON CONFIRM, and let the founder WATCH it (the missing moment)

**The core bug.** Confirming a mandate today activates the Programs but **does not run the first cycle** —
the founder lands in an empty room with a "Run now" button and an 8-minute silent wait. That is the
"confirm, then nothing" defect. Fix it:

- **On confirm, trigger the first cycle immediately** (server-side, off the confirm action — the chunked
  rhythm + step chain already exist; you're triggering them, not building them).
- **Stream it to the founder** as the `activation_watch_your_team_build` mockup: *"Patel is building your
  go-to-market strategy"*, a document list, each artefact moving `queued → writing… → done` with **real
  content appearing** (surface the actual generated text, not a spinner). "2 of 5 documents."
- When it finishes → land in Stage 3 (the work), not on a mandate card.
- Copy: serif for the executive, sans for chrome; "this happens once, now — then it runs quietly each week."
- **This is where the AI stops feeling handicapped and the artefacts become visible.** It is the payoff for
  setting a mandate. Required, not optional (PRD §4 spine, step 3).

Show me the real activation run — the streamed document content, one after another. **Stop.**

---

## Stage 3 — Land in the work: the artefacts are the CENTRE, not a mandate card

After activation the founder must land **among their living strategy** — the five real documents their team
made — not a status summary (PRD §4 spine, step 4).

- The home surface leads with the **five documents as openable, tangible objects** (reference the document
  cluster in `patel_canvas_gtm_cockpit`): each shows its current version, version count, last change.
- Clicking a document opens it **read-first**: the current version rendered clean; underneath, quiet: version
  history, inline edit (→ a new founder-authored version, used next cycle — this path exists), and the
  briefing that explains what changed.
- The mandate stays visible but *quiet* (a line at the top with "change direction" → a new epoch), not the
  centre. The centre is the work.

This reuses `asset_versions` (versions, provenance) and the existing edit path — no new machinery. Show me
the artefact-centric home rendered for a founder who has run a cycle. **Stop.**

---

## Stage 4 — Direct an executive about a specific artefact (scoped, not open chat)

The experience is dead without *any* interactivity, but the adviser chat is deleted for good reason. So:
scoped command only.

- On a document: "ask Patel about this" / "Patel, sharpen the pricing section" → the executive reworks *that
  artefact* in place → a **new version** (same versioning path). Directed, about a real artefact, never a
  blank conversation.
- Routes through the Composer (no inline prompt — CLAUDE.md §2) and the router.
- **It cannot bypass a gate:** a scoped command that would trigger an irreversible act (send an email) still
  routes through review-to-send (ADR-004). Steering and reworking are free; sending is not.

Show me a real rework: a founder directs a change, a new version appears with the change. **Stop.**

---

## Stage 5 — Actions: make the whole action surface legible (and the honest finding about it)

**The finding, verified — put it in front of Mo, don't bury it.** P001 has five actions, but only ONE reaches
the outside world:

| Action | Reaches the world? | What it is |
|---|---|---|
| Validate ICPs · Prioritize Channels · Review Messaging · Approve GTM Plan | **No — internal, reversible** | the executive *thinks*: analyses, critiques, decides. Runs autonomously. |
| **Interview Customers** | **Yes — irreversible, via Gmail** | drafts a real email → **waits for approval** → sends |

**So today the system's only way to *act in the world* is: send an email.** Everything else is internal
document work. Gmail is the only connector (`lib/connectors/gmail.ts`). That is thin for a product that
promises "a team that runs your company," and Mo is right to flag it.

**This stage does two things:**

1. **Make the action surface legible** — the founder should *see* all five actions with honest status (done ·
   not run yet · **waiting on you**), and clearly *which reach the outside world*. The one waiting on approval
   (the email) is the star; the internal ones show as background work the team did. Reference the actions
   column in `patel_canvas_gtm_cockpit`. No per-cycle approval; the email routes through review-to-send.

2. **Write the honest gap into `FOLLOWUPS.md`, don't silently fix it:** the *external action surface is one
   connector deep.* The architecture is generic (the Connector interface + Registry support more), so
   breadth is a matter of adding connectors + actions (LinkedIn outreach, calendar, a CRM write, publishing a
   landing page…) — but that is **deliberate pilot scope** (P001, one connector, prove the pattern), and
   expanding it is Phase 5 (broaden), not this build. Record it as a known, intentional limitation with the
   growth path named, so it's a decision on the roadmap, not a surprise.

Show me the action surface, and the `FOLLOWUPS.md` entry. **Stop.**

---

## Definition of done
- [ ] The unveiling delivers a real proposed direction and hardened mandate, streamed, no buffering feel.
- [ ] **Confirming triggers the first cycle immediately and the founder watches it build — real content, one
      artefact after another.** No "confirm then empty room."
- [ ] The home is artefact-centric — five openable documents, read-first, edit + version history — not a card.
- [ ] A founder can direct an executive to rework a specific artefact → a new version; sends still gate.
- [ ] All five actions are legible with honest status; the one external action (email) is clear and gated.
- [ ] The one-connector limitation is recorded in `FOLLOWUPS.md` with the growth path, not silently patched.
- [ ] Reuses `asset_versions` / `action_log` / the rhythm engine — no new machinery. Behind the flag. Green tests + build.

## How to report
Real running output at every stage — the streamed activation, the rendered artefact home, a real rework —
not a description. The entire point is *feel*. Say plainly what still doesn't match the mockups' feel.
