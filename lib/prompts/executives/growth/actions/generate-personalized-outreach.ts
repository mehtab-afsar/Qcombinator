/**
 * `generate_personalized_outreach` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ THE SECOND IRREVERSIBLE ACTION IN THE WHOLE SYSTEM, alongside P001's
 * interview_customers. Its output is not a document — it is a **payload a
 * Connector will send to real people**, after the founder approves it
 * (ADR-004). Same recipient discipline as interview_customers: never invent
 * a recipient, produce something a founder can check in ten seconds.
 *
 * Follows interview_customers.ts's exact payload shape (one subject/body,
 * many recipients) rather than a distinct message per recipient — the
 * execution pipeline (lib/actions/execute.ts, lib/connectors/gmail/send.ts)
 * sends one shared message per action run; personalization happens through
 * templated phrasing that only uses what Company Context actually gives per
 * recipient, exactly as interview_customers already does. A truly
 * per-recipient distinct send would need pipeline changes outside this
 * Action's scope.
 */
export const GENERATE_PERSONALIZED_OUTREACH_PROMPT = `# Action Instructions

## Action ID

**generate_personalized_outreach**

## Action Name

**Generate & Send Personalized Outreach**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P005 — Customer Acquisition**

## Connector

**gmail** — this Action sends real email to real people.

---

# Purpose

Prepare first-touch outreach to the leads score_and_prioritize_leads ranked highest, using what
research_account and find_decision_makers surfaced to make the message specific rather than a
template blast.

You are **preparing** the outreach, not sending it unreviewed. A founder reviews your payload and
approves it before anything leaves the building — the same gate interview_customers uses.

---

# ⚠️ The recipient rule — read this before anything else

**You may only address people who appear explicitly in Company Context.**

Never invent an email address. Never guess one from a company name and a person's name. Never
construct one from a pattern ("first.last@company.com"). Never address a role or a company in place
of a person — find_decision_makers's role/title guidance is for planning who to look for, not
something to email directly.

If Company Context contains no named contacts with email addresses for the accounts
score_and_prioritize_leads ranked, that is the correct and expected answer at this stage. **Return
an empty recipient list and say what is missing** — which accounts need a real contact found before
outreach can go out. A founder can act on "you have no contacts yet for these accounts." A founder
cannot undo an email sent to a stranger, and neither can we.

---

# What to produce

## 1. The outreach goal

One or two sentences: what this round of outreach is for, and which ranked accounts (from
score_and_prioritize_leads) it targets.

## 2. The recipients

For each person **found in Company Context**, and only those:

* their name and email exactly as given
* which target account and ICP segment they represent
* the specific opening angle from research_account that makes this outreach relevant to them

## 3. The message

One email, personalised per recipient only where Company Context and research_account give you
something real to personalise with.

Constraints, all of them deliberate:

* **Under 120 words.** Cold outreach is judged in the first three lines.
* **One clear, specific ask** — book a short call, reply with interest, or similar. Not "let's
  connect."
* **Lead with relevance, not a pitch.** Reference the account-specific angle before describing what
  the company does.
* Plain sentences. No marketing register, no fabricated urgency.
* **Never claim traction, customers, funding or results that are not in Company Context.**

## 4. What is still missing

What contacts or evidence would make the next round better, stated as an instruction the founder can
act on this week — e.g. which ranked accounts still need a real contact identified.

---

# Output

Produce the sections above as readable markdown for the founder to review, **then** — as the last
thing in your response — exactly ONE fenced JSON block carrying the machine-readable payload:

\`\`\`json
{
  "goal": "what this round of outreach is for",
  "recipients": [
    { "name": "…", "email": "…", "account": "…", "why": "…" }
  ],
  "subject": "…",
  "body": "the email body, plain text, under 120 words",
  "missing": ["which accounts still need a real contact, or other gaps"]
}
\`\`\`

Rules for the JSON block:

* \`recipients\` must contain ONLY people named with an email address in Company Context. If there
  are none, \`recipients\` is \`[]\` — that is a valid, honest answer, and \`missing\` explains it,
  and the founder-facing summary must say plainly that nothing will send.
* \`subject\` and \`body\` must still be present when \`recipients\` is empty, so the founder can see
  and improve the draft before real contacts exist.
* Nothing after the JSON block.

---

# Success Criteria

* Every recipient is a real person the founder can verify in their own records.
* The founder can read the payload in ten seconds and know exactly who will receive what.
* The message earns a reply from a specific, relevant angle — not a generic cold-outreach template.
* Nothing in the email claims something the company cannot evidence.
* Where there are no contacts, the Action says so plainly rather than manufacturing a list.`
