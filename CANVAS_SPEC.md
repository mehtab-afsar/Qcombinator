# Edge Alpha — The Canvas (Depth 2 of the Frame)

*The interface at its full form: a spatial, navigable canvas that draws Edge Alpha's data in its
true shape instead of flattening it into pages. Builds directly on `UX_SPEC_the_frame.md` — the
Command View specced there IS this canvas's top level. Visual targets: the mockups
`executive_team_command_view` (the hub) and `patel_canvas_gtm_cockpit` (an executive's canvas).
4 Aug 2026.*

---

## 0. The principle

Edge Alpha's data is a graph: `Executive → Program → Asset → Action`. That's the Registry. The old
UI flattened that graph into "encyclopedia pages after pages," which is why it felt dead and lost.
**A canvas doesn't impose a metaphor — it reveals the structure that's already there.** Q-Score at
the centre; executives around it; drill into one and find their programs, versioned documents, and
actions; direct the work by chatting with them. The same centre-and-branches shape repeats at each
level because the data nests that way. This is the honest picture of what was built.

---

## 1. Four decisions (settled — do not re-open without new reasoning)

**D1 — The canvas is the home. One interface, progressive depth. Never two UIs.**
The top level *is* the simple view (score, team, this week's briefing, the one pending action). A
founder who wants calm stays there; one who wants to operate drills in. Same interface, different
altitude. Building a separate "simple mode" is the mistake — it forks the product and drifts.
**Every level shows only the few things that matter and lets you descend for the rest.**

**D2 — Opinionated auto-layout, NOT a freeform draggable whiteboard.**
The system draws the canvas; the founder navigates it. There is nothing to arrange — the structure
is fixed by the Registry, so a draggable whiteboard would imply an arrangement that doesn't exist,
and freeform canvases die of chaos and mobile-hostility. Spatial and delightful at the top (score
centre, agents around, pan/zoom feel); dense and legible when you drill in (the cockpit).

**D3 — A node opens read-first; edit and direct-the-AI are one layer deeper.**
Clicking a document opens the current version rendered clean — most of the time the founder is
*reading* what their team produced. Quiet and available underneath: flip through versions (stored),
edit inline (creates a founder-authored version — that path exists), or tell the executive "rework
the pricing section." Three capabilities, revealed in order, never shouted at once.

**D4 — Chat commands the map but never skips the gate.**
Chat can query and initiate ("run the cycle," "why did the ICP change?"). It cannot bypass approval
on an irreversible act — "send the emails" always routes through review-to-send (ADR-004). Chat is
a faster way to direct, not a way to escape the one guardrail that matters.

---

## 2. The two depths (one continuous build)

**Depth 1 — the Frame (pilot-critical, already specced in `UX_SPEC_the_frame.md`):**
the unveiling → the Command View as home → read a document → approve the one action. The minimum a
pilot founder needs. **The Command View is the canvas's top level — building the Frame starts the canvas.**

**Depth 2 — the canvas (this spec):** the top level becomes navigable, executives become enterable,
each gets a cockpit, nodes become workspaces, chat becomes the command layer, and the whole thing
replicates across the team from the Registry.

---

## 3. Level 1 — the hub (the Command View, made navigable)

Already designed (`executive_team_command_view`). For Depth 2, add one thing: **the executive nodes
become enterable.** Click Patel → transition into Patel's canvas (§4), clearly "inside" Patel
(breadcrumb / back-to-team). Idle executives are present but muted; clicking one explains it has no
program yet rather than opening an empty cockpit. Everything still orbits the Q-Score at centre.

---

## 4. Level 2 — the executive canvas (a GENERIC template; Patel is the first instance)

Built to the `patel_canvas_gtm_cockpit` mockup. **This layout has zero Patel-specific structure** —
it is the template every executive gets, populated from *their* Registry entries. Sections:

1. **Anchor** — the executive's identity, the Q-Score dimension they own, current status
   (*"Patel · Chief Growth Officer · owns your market & GTM score · running P001"*).
2. **Bird's-eye stats** — the owned dimension + trend · this cycle's activity · how many actions
   wait on the founder · when it last ran. The pilot's-vision glance.
3. **Documents — versioned nodes.** Each asset as a node showing current version + version count +
   last change ("v3 · updated 2 days ago · 3 versions"). Nodes that didn't change this cycle read
   "no change" honestly. Click → the node workspace (§5).
4. **Actions — status nodes.** Each action with state: done · not run yet · one-off done · and the
   critical one — **waiting on you** (the prepared irreversible action, "email drafted to 3 leads ·
   review to send"). Click the pending one → the approval surface (Story 3's gate).
5. **Activity log — everything the executive has done.** A plain feed: documents written, actions
   prepared/taken, cycles run, founder edits used. The complete operating record.
6. **Chat rail — ask or command.** Per-executive. Query ("why did the ICP change?"), steer ("hold
   the outreach"), initiate ("run the cycle now"). Routes irreversible acts through the gate (D4).

---

## 5. Level 3 — the node workspace (read-first, per D3)

Clicking a document node opens a focused workspace *inside* the canvas (a panel/expand, not a jump
to an unrelated page — preserve the sense of place):
- **Read** — the current version, clean, is the default and the front.
- **Versions** — flip through history (from `asset_versions`); restore = a new version, never a rewind.
- **Edit** — inline; a save creates a founder-authored current version, used next cycle. No approval.
- **Direct the AI** — "ask Patel to rework this section" → the executive reworks it in place → a new version.

Edit and direct-AI are available but quiet; read leads.

---

## 6. Replication — the reason this is affordable

The Level-2 template is **Registry-driven.** Finance's canvas is the same template with Finance's
programs/assets/actions; Ops, Product, the same. **Design Patel once, and the Registry casts the
other four for free** — the same config-over-code principle that runs the engine, now running the
interface. A sixth executive added later gets a canvas automatically. Nothing is designed twice.

---

## 7. It's a view over existing data — not new machinery

Every element maps to data already built. This is a frontend project.

| Canvas element | Existing source |
|---|---|
| Documents + every version | `asset_versions` (immutable, versioned, provenance) |
| Actions + status + "waiting on you" | `action_log` + the Story 3 approval gate |
| Activity log | `action_log` + `operating_rhythm_runs` |
| This cycle / last run / stats | the rhythm engine |
| Chat with an executive | the Composer + the executive's system prompt (S00x) |
| Who owns what | the Registry |

No new tables, no new engine. If a query is missing (e.g. a per-executive activity feed), it's a
read over existing rows, not a schema change.

---

## 8. Guardrails (load-bearing — from the DecisionLog)
- **No per-cycle approval anywhere** (ADR-002). The two approvals in the whole product: the mandate
  (once), and irreversible sends at the Connector boundary. Chat does not add a third.
- **Irreversible acts always gate** (ADR-004), whether triggered by the cycle or by chat.
- **"Change direction" / editing a mandate = a new epoch** (ADR-003), never an in-place edit.
- **Briefings are read, never acknowledged/dismissed.** No tick-box on a briefing.
- **Behind `FF_NEW_EXECUTIVE_MODEL`.** New engine machinery untouched. Models via `lib/llm/router.ts`.

---

## 9. Build order
1. **Depth 1 first** (the Frame — `UX_SPEC_the_frame.md`). Pilot-critical; also lays the hub the canvas grows from.
2. **Make the hub navigable** — executive nodes become enterable.
3. **The executive canvas template** — build Patel's cockpit *generic*, Registry-driven (§4).
4. **Node workspaces** — read → versions → edit → direct-AI (§5).
5. **Chat-as-command** per executive, gated (§4.6, D4).
6. **Replication check** — confirm Finance/Ops/Product render from the Registry with zero bespoke work.

## 10. Definition of done
- One interface, progressive depth; the hub is calm, the cockpit is dense, no separate "simple mode."
- Auto-laid-out; nothing draggable/freeform.
- Clicking an executive enters their cockpit; clicking a document opens a read-first workspace with
  versions/edit/direct-AI underneath.
- Chat per executive queries + initiates; every irreversible act routes through the gate.
- The cockpit is a generic template — a second executive renders from the Registry with no new design.
- It's a view over `asset_versions` / `action_log` / the rhythm engine — no new machinery. Behind the flag.
- Matches the mockups `executive_team_command_view` and `patel_canvas_gtm_cockpit`.
