# Edge Alpha — The Frame: UX spec for the founder's first experience

*The product experience around the machinery. Covers the intelligent entry, the Strategy Session
(F07), the mandate confirmation (F08), and the Command View (F09). The machinery is built; this
spec is the frame it was always missing. Build the founder-facing flow to THIS, not to the
placeholder form. 4 Aug 2026.*

---

> **This spec is Depth 1 — the pilot-critical frame.** The full interface (a navigable, spatial
> canvas; per-executive cockpits; node workspaces; chat-as-command) is **Depth 2**, in
> `CANVAS_SPEC.md`. The Command View here (§5) is the canvas's top level — building this frame
> starts the canvas. Build Depth 1 first (it's the pilot's front door); Depth 2 is the richer layer
> on the same foundation.

## 0. The problem this fixes

The current strategy page is a form: a "mission" textarea, a "priorities" list, a "goals" list.
Its own code comment admits it — *"Deliberately a plain form. The workbook's S001 is a six-step LLM
executive session; that arrives later."* **Later is now.** A form asks the founder to do the
executive team's job — author their own strategy — then hands it back as a "mandate." That is
backwards, and it kills the USP. Nobody buys "text input → document." People buy walking into a
room where their executive team is already seated and working to a direction they set once.

**The whole fix is one inversion: don't ask — propose.** The system already holds the Q-Score
(6 dimensions), the profile-builder data, and company context. It should draft, and the founder
should shape. You react to a draft; you never fill a blank.

---

## 1. Four principles (every screen obeys these)

1. **Lead with what you know.** The first thing the founder sees is evidence the system understands
   them — "you're a 62; GTM is your weakest point and biggest lever." This earns the right to propose.
2. **Propose, don't ask.** The mandate assembles from a short guided conversation, not typed into boxes.
3. **The team is visible.** The USP — an AI executive team — must be legible in one glance. Show all
   five executives, even the idle ones. Idle seats sell the room.
4. **One confirmation, and it's heavy.** There is exactly one sign-off in the product: confirming the
   mandate. Make it feel like a decision, not a Save button. A change starts a **new mandate**, never
   an edit (this is the ADR-003 immutability rule, surfaced as a feature).

---

## 2. The intelligent entry (the front door — build first)

Today the strategy page is a dead-end form that ignores where the founder actually is. Replace the
entry with a **state check that routes**:

| Founder state | Route to | The line it leads with |
|---|---|---|
| No Q-Score yet | **Q-Score / profile builder** | "Before your team can work, they need to know where you stand." |
| Scored, no mandate | **Strategy Session (§3)** | "You're scored. Let's set your direction." |
| Mandate confirmed | **Command View (§5)** | (the home screen — no prompt needed) |
| Mandate + a mid-cycle action waiting | **Command View, action surfaced** | "Patel drafted something. It needs you." |

The dashboard already computes a CTA by state (`useQScore` + contract state) — promote that logic
into the real front door. **Never show a cold mission box to a founder who hasn't scored.** The
score isn't a chore they skipped; it's the thing that makes the proposal possible, so the flow
depends on it, in that order.

---

## 3. Screen 1 — The Strategy Session (F07, rebuilt) — "THE UNVEILING"

> **Canonical design: the single-descent "unveiling"** (mockup `the_unveiling_direction_to_team`).
> It replaces BOTH the old form AND the earlier two-column chat sketch. The founder does not fill a
> form and does not conduct a Q&A. They watch one continuous descent — read → direction → mandate →
> team → confirm — each layer stripping vagueness and adding weight ("removing one cloth after
> another"). The chat/"nudge" only opens if the founder wants to reshape a layer; it is not the
> default path. Direction and mandate must *feel heavy*; the execution team is just the agents
> stepping forward to claim their parts — no ceremony around them, they are the ceremony.
>
> **The five layers, top to bottom, connected by one thread (dots darken as commitment deepens):**
> 1. **The read** (serif, warm) — the CEO states what the score/deck/answers show. Not a question.
> 2. **The proposed direction** (a statement, one line) — with a single quiet action, "Nudge this",
>    never a blank box. The founder reacts; they never author.
> 3. **It hardens into the mandate** — the loose direction crystallises into priorities + success
>    metrics in a solid card. The informal becomes formal, in front of them.
> 4. **The team takes it on** — each executive steps forward and claims their part in one line.
>    Active executive filled; idle ones may be omitted here (they appear on the Command View).
> 5. **One heavy confirm** — the single signature, with the locked note ("they run to it without
>    asking again; you change direction by coming back here, which starts a new mandate").
>
> No "save." No "version 1." No screen-jumps to a separate mandate page or team page — those were
> three disjointed screens; this is one moment. After confirm → the Command View (§5).

**Replaces:** the mission/priorities/goals form.
**Reuses:** the `S001_STRATEGY_SESSION` prompt (already written), the Composer, and F08's mandate
generation. This is a **UI + wiring** change, not new machinery — the session prompt exists, it's
just bolted to a form instead of a conversation.

### The experience
A guided conversation led by the **CEO / Chief of Staff executive** (give them a name — e.g.
"Morgan"). Not open-ended chat — a **directed session of ~3–5 turns** that always terminates in a
drafted mandate. The founder answers the calls only they can make; the system does the strategy work.

**Turn structure (from S001):**
1. **The read + the proposal.** Morgan states what the score says and proposes a direction.
   *"I've read your Q-Score. You're a 62 — strong team, sharp product, but GTM is your weakest point
   and biggest lever. So I'd point the whole team there first. Sound right?"* → founder confirms/redirects.
2. **The win.** *"One number that matters most this quarter — what would make it a win?"* → e.g. "£10k MRR by Q4."
3. **The priority fork.** A concrete either/or drawn from their real data. *"You've 11 pilots and 4
   paying. Convert the pilots, or fill the funnel?"* → quick-reply chips + free text.
4. *(optional, only if needed)* one sharpening question.
5. **The draft.** Morgan says "here's your mandate" → transitions to the confirmation screen (§4).

### Layout (two columns, 680px)
- **Left (1.4fr): the conversation.** Morgan's turns in **serif** (`--font-voice`), founder replies
  as plain bubbles. The current question offers **quick-reply chips** (from the founder's real data)
  *and* a free-text field — never only free text.
- **Right (1fr, sticky): "your mandate · taking shape."** The formal mandate fields (direction,
  the win, priority) **fill in live as the founder answers** — showing the machine doing the work.
  Unanswered fields read "one more answer," not blank boxes. Footer: the locked note —
  *"You'll confirm this once. After that, your team works to it — a change starts a new mandate."*

### Behaviour rules
- **Every turn is answerable in one tap or one short sentence.** If a founder must write a paragraph,
  the design has failed.
- **The proposal is pre-drafted from data**, not asked cold. If the score/profile is thin, Morgan
  says so honestly and asks one more question — never fabricates a confident read.
- **No dead-ends.** The session always reaches a draft; the founder can edit any field on the
  confirmation screen.

---

## 4. Screen 1.5 — Confirm the mandate (F08, the signature moment)

Between the session and the Command View: **one clean page**, the drafted Executive Contract in
plain language — direction, the win, priorities, which Programs it activates, which executives take
them. Not a wall of JSON; a page a founder reads in 30 seconds and believes.

- One primary action: **Confirm mandate**. One secondary: **Refine** (back to the session).
- Copy makes the weight explicit, without a scary modal: *"This sets your team in motion. You can
  change direction later — that starts a new mandate, and your team re-plans around it."*
- On confirm → the immutability trigger fires (already built), Programs activate (already built), and
  the founder lands on the Command View with the team **assembling** (a brief, honest reveal — see §5).

---

## 5. Screen 2 — The Command View (F09, the payoff / the home)

**This is the home screen after a mandate exists.** The USP made visible. Structure:

- **Top: the mandate.** One line — *"Reach £10k MRR by Q4 through founder-led GTM"* — with a quiet
  **"Change direction"** action (→ starts a new mandate/session; never edits in place).
- **Centre: the Q-Score**, large, with its trend (*"62 · up 6 this month"*). Everything orbits it.
- **Around it: the five executives.** Active ones (Patel · Growth · "working now") are filled; idle
  ones ("Finance · idle · no program yet") are muted but **present**. The idle seats are not clutter
  — they show the founder there's a whole team here, room to grow. Keep them.
- **Below: this week's briefing**, in the executive's **serif voice** — the verdict, one paragraph.
  *"Stop refining strategy and start converting pilots…"*
- **The one action waiting.** If a Program prepared an irreversible action (an email to send), it
  surfaces here as **"Review to send"** — the ONLY approval in the product, at the Connector
  boundary. Payload → founder reviews → sends. (Story 3's gate, surfaced.)

### The reveal (first landing only)
On the founder's *first* arrival after confirming, the executives **assemble** — a brief, restrained
animation of the team taking their seats around the score. Once. Not a gimmick on every visit — the
one-time "you just hired a team" moment. Every subsequent visit is the calm working view.

### Hard guardrails (do not violate — these are load-bearing product rules)
- **No "approve this week's work" control anywhere on this screen.** The founder approves the mandate
  once (§4) and irreversible sends at the Connector boundary — nothing else. Re-adding a per-cycle
  approval rebuilds the gate ADR-002 deliberately removed. The F09 code already carries this warning.
- **"Change direction" is a new mandate, not an edit.** It routes back to a session and creates a new
  epoch. Never mutate a confirmed contract.
- **Briefings are read, never acknowledged/dismissed.** No tick-box on a briefing.
- **A briefing names only Assets that genuinely exist.** (The provenance rule — already enforced server-side.)

---

## 6. Copy and voice (this is half the product)

Follow these; generic SaaS copy is what makes it feel cheap.

- **The executives speak in serif** (`--font-voice`), first person, like a sharp colleague:
  *"Stop refining strategy and start converting pilots."* The system chrome speaks in sans, as the product.
- **Sentence case everywhere.** Buttons are verbs: "Confirm mandate," "Review to send," "Change
  direction." Never "Submit," "OK," "Set Your Direction."
- **Ban the filler:** no "leverage," "seamless," "unlock," "empower," "simply," "just," no "!". Say
  what it does.
- **Lead with the founder's real numbers**, always — "you're a 62," "11 pilots and 4 paying." Specific
  beats generic; it proves the system is paying attention.
- **Never fabricate confidence.** If the data is thin, the executive says so and asks. An executive
  who bluffs is worse than one who admits a gap.

---

## 7. What's reused vs new (respect the machinery — CLAUDE.md)

**Reused, not rebuilt:** the Q-Score (F01), the `S001_STRATEGY_SESSION` prompt, the Composer (F06),
the Registry (F05), the Executive Contract + immutability trigger + epoch (F08), Programs, the
weekly briefing (F12), the approval gate + Gmail connector (Story 3). **None of this spec adds
machinery.** It is the front-end frame + the wiring of the S001 session to a conversation instead
of a form. Config over code still holds — this is UI and prompt-wiring, not new routes per screen.

**New:** the entry state-router (promote the dashboard CTA logic to the front door); the guided
Strategy Session UI; the mandate confirmation page; the Command View layout + the one-time reveal.

---

## 8. Build order

1. **Entry state-router** — route by (no score / scored-no-mandate / mandate). Cheapest, unblocks the rest.
2. **Command View (F09)** — the payoff and the home. Build this before the session, so the session
   has somewhere to land, and so the target experience is visible early.
3. **Strategy Session (F07)** — the guided conversation, wired to the existing S001 prompt + F08 generation.
4. **Mandate confirmation (F08 UI)** — the signature page.
5. **The one-time reveal** — last, it's polish.

## 9. Definition of done
- A founder with no score is routed to score first — never shown a cold mission box.
- A scored founder sets direction by answering ~3–5 questions; the mandate assembles from answers,
  not typed into boxes.
- Confirming is one clear, weighty action; a change creates a new mandate, never an edit.
- The Command View shows the score centre, all five executives (idle ones present), the mandate, the
  weekly briefing in serif voice, and the single pending action.
- No per-cycle approval control exists anywhere. The two mockups (`executive_team_command_view`,
  `strategy_session_guided`) are the visual target.
