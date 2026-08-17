/**
 * `follow_up_prospects` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ DRAFTS THE NEXT FOLLOW-UP MESSAGE, DOES NOT SEND ANYTHING. See
 * follow-up-prospects.ts in the Registry (the ActionDef) for the full
 * reasoning on why this stays draft-only rather than a Gmail-connector,
 * irreversible send like P001's interview_customers.
 *
 * Internal and reversible: produces copy, sends nothing. Runs autonomously
 * (ADR-004). DERIVED, NOT SEEDED — the workbook's Action Registry sheet is
 * empty; only the name came from the Program Registry.
 */
export const FOLLOW_UP_PROSPECTS_PROMPT = `# Action Instructions

## Action ID

**follow_up_prospects**

## Action Name

**Follow-up Prospects**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P005 — Customer Acquisition**

---

# ⚠️ This is a draft follow-up, not a sent message

Produce the next follow-up message for prospects already in outreach. This Action does not send
any message, does not connect to email or any outreach tool, and never claims a prospect has
already been followed up with. Frame the output as ready for a human (or a future, explicitly
approved sending step) to send.

---

# Purpose

Keep prospects already in the funnel moving, by drafting the specific next message each one needs
based on where they stand — no reply, engaged but stalled, objection raised — rather than letting a
sequence run generic and untailored.

---

# What to produce

## 1. Prospect status brief

| Field | Detail |
|---|---|
| Prospect / segment | … |
| Where they are in the sequence (which touch, from launch_outreach) | … |
| Signal since the last touch (no reply, opened, replied, objection, went quiet) | … |
| Time since last touch | … |

## 2. Follow-up message

The complete next message, tailored to the signal above — a silent prospect gets a different
follow-up than one who raised a specific objection. Reference the Customer Acquisition Blueprint's
(AS015) value proposition and, where an objection was raised, address it directly rather than
repeating the original pitch.

## 3. Escalation or exit recommendation

State whether to continue the sequence, escalate (e.g. try a different channel or contact), or
recommend exiting this prospect from active outreach — with the reasoning, tied to AS015's funnel
and qualification thinking.

---

# Output

Readable markdown: the status brief, the follow-up message in full, and the escalation/exit
recommendation. One prospect or tightly related group per run — do not batch unrelated segments
into one output.

**Evidence rule:** every claim traces to AS015 or Company Context. Never invent a prospect's prior
reply, engagement history or company detail not provided. Use **[TO VALIDATE: …]** for anything
requiring confirmation before it can ship.

**Stay in scope:** this drafts one follow-up against the existing outreach sequence and Customer
Acquisition Blueprint. It does not redesign the sequence itself — that is what re-running
launch_outreach is for. It does not send anything — sending is outside this Action.

---

# Success Criteria

* The follow-up is tailored to the specific signal, not a generic nudge.
* The escalation/exit call is a real judgement, not automatic continuation.
* Every claim traces to AS015 or Company Context.
* Nothing in the output implies the message has already been sent.`
