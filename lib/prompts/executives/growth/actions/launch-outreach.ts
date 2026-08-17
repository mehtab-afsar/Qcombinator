/**
 * `launch_outreach` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ DRAFTS AN OUTREACH SEQUENCE AND SENDING PLAN, DOES NOT SEND ANYTHING.
 * See launch-outreach.ts in the Registry (the ActionDef) for the full
 * reasoning on why this stays draft-only rather than a Gmail-connector,
 * irreversible send like P001's interview_customers.
 *
 * Internal and reversible: produces copy and a plan, sends nothing. Runs
 * autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action
 * Registry sheet is empty; only the name came from the Program Registry.
 */
export const LAUNCH_OUTREACH_PROMPT = `# Action Instructions

## Action ID

**launch_outreach**

## Action Name

**Launch Outreach**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P005 — Customer Acquisition**

---

# ⚠️ This is a draft sequence and sending plan, not a sent campaign

Produce first-touch outreach copy and the plan for sending it. This Action does not send any
message to any prospect, does not connect to email or any outreach tool, and never claims a
message has already gone out. Frame the output as ready for a human (or a future, explicitly
approved sending step) to send — not as a record that outreach has happened.

---

# Purpose

Turn a target list (generate_lead_lists) into first-touch outreach that reflects the Customer
Acquisition Blueprint's (AS015) channel strategy and lead-generation approach — so outreach opens
with the company's actual value proposition and channel logic, not generic cold-email copy.

---

# What to produce

## 1. Campaign brief

| Field | Detail |
|---|---|
| Target list / segment this serves | … |
| Primary channel (email, LinkedIn, other — per AS015 Bullseye) | … |
| Number of prospects in this run | … |
| Sequence length (number of touches) | … |

## 2. Message sequence

The complete text for each touch in the sequence — subject line (if email) or opener (if
LinkedIn/other), body, and call to action. Each message should tie directly to the prospect
segment's problem and the value proposition in AS015 — never generic template copy.

## 3. Sending plan

| Touch | Channel | Timing (days from first touch) | Trigger to stop the sequence (reply, meeting booked, opt-out) |

## 4. What happens next

State plainly that this sequence is ready to send but has not been sent, and name what would need
to happen for it to go out (a connected send channel and explicit approval — see follow_up_prospects
for the next step once a prospect responds).

---

# Output

Readable markdown: the brief table, full message copy for every touch, and the sending-plan table.
Length follows the sequence length — do not pad.

**Evidence rule:** every claim in the copy traces to AS015 or Company Context. Never invent case
studies, customer names, statistics or results not present in the source material. Use
**[TO VALIDATE: …]** for anything requiring confirmation before it can ship.

**Stay in scope:** this drafts one outreach sequence against the existing Customer Acquisition
Blueprint. It does not redesign channel strategy itself — that is what re-running AS015 is for. It
does not send anything — sending is outside this Action.

---

# Success Criteria

* Every message is complete and ready to send, not an outline.
* The sequence ties to a specific AS015 channel and segment, not generic copy.
* The sending plan is specific enough to execute without further clarification.
* Nothing in the output implies any message has already been sent.`
