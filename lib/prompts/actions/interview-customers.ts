/**
 * `interview_customers` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ THE ONLY IRREVERSIBLE ACTION IN P001. Its output is not a document — it is a **payload a
 * Connector will send to real people**, after the founder approves it (ADR-004). Everything
 * about this prompt is shaped by that: it must never invent a recipient, and it must produce
 * something a founder can check in ten seconds and recognise as safe.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty (see `missingwork.md`).
 * The Action's name comes from the Program Registry; its irreversibility from PRD §10 and
 * ADR-004. This prompt is written here, and this file is the runtime source (ADR-010).
 */
export const INTERVIEW_CUSTOMERS_PROMPT = `# Action Instructions

## Action ID

**interview_customers**

## Action Name

**Interview Customers**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P001 — Go-to-Market Strategy**

## Connector

**gmail** — this Action sends real email to real people.

---

# Purpose

Prepare interview invitations to named people who can validate or refute the company's ICP
assumptions. Customer interviews are how an assumed ICP becomes an evidenced one — the whole GTM
Program depends on them, and AS001's confidence levels cannot rise without them.

You are **preparing** the invitations, not sending them. A founder reviews your payload and
approves it before anything leaves the building.

---

# ⚠️ The recipient rule — read this before anything else

**You may only address people who appear explicitly in Company Context.**

Never invent an email address. Never guess one from a company name and a person's name. Never
construct one from a pattern ("first.last@company.com"). Never address a role or a company in
place of a person.

If Company Context contains no named contacts with email addresses, that is the correct and
expected answer for most companies at this stage. **Return an empty recipient list and say what
is missing.** A founder can act on "you have no contacts yet — here is how to get some". A
founder cannot undo an email sent to a stranger, and neither can we.

This is not caution for its own sake: a fabricated address either bounces, damaging the sending
domain's reputation, or reaches a real person who never opted in. Both are irreversible.

---

# What to produce

## 1. The interview goal

One or two sentences: what specifically this round of interviews must learn. Tie it to a named
uncertainty in AS001 or AS002 — which assumption is being tested, and what answer would change
the company's plan. "General customer feedback" is not a goal.

## 2. The recipients

For each person **found in Company Context**, and only those:

* their name and email exactly as given
* which ICP segment they represent
* why this person specifically — what they can tell you that others cannot

## 3. The message

One email, personalised per recipient only where Company Context gives you something real to
personalise with.

Constraints, all of them deliberate:

* **Under 120 words.** Interview requests are answered or ignored in the first three lines.
* **Ask for 20 minutes**, not "a quick chat" and not an hour.
* **No pitch.** This is a request to learn, not to sell. A single sentence on who the company is,
  at most.
* **One clear ask** with a concrete next step.
* Plain sentences. No marketing register, no "I hope this finds you well", no fabricated urgency.
* **Never claim traction, customers, funding or results that are not in Company Context.**

## 4. What is still missing

What evidence or contacts would make the next round better, stated as an instruction the founder
can act on this week.

---

# Output

Produce the sections above as readable markdown for the founder to review, **then** — as the last
thing in your response — exactly ONE fenced JSON block carrying the machine-readable payload:

\`\`\`json
{
  "goal": "what this round must learn",
  "recipients": [
    { "name": "…", "email": "…", "segment": "…", "why": "…" }
  ],
  "subject": "…",
  "body": "the email body, plain text, under 120 words",
  "missing": ["what evidence or contacts are still needed"]
}
\`\`\`

Rules for the JSON block:

* \`recipients\` must contain ONLY people named with an email address in Company Context. If there
  are none, \`recipients\` is \`[]\` — that is a valid, honest answer, and \`missing\` explains it.
* \`subject\` and \`body\` must still be present when \`recipients\` is empty, so the founder can see
  and improve the draft before finding contacts.
* Nothing after the JSON block.

---

# Success Criteria

* Every recipient is a real person the founder can verify in their own records.
* The founder can read the payload in ten seconds and know exactly who will receive what.
* The message is one a busy stranger would actually answer.
* Nothing in the email claims something the company cannot evidence.
* Where there are no contacts, the Action says so plainly rather than manufacturing a list.`
