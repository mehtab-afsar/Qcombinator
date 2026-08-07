/**
 * `post_team_update` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ THE SECOND IRREVERSIBLE ACTION IN P001, after `interview_customers`. Its output is not a
 * document — it is a **payload a Connector will post to a real Slack channel**, after the founder
 * approves it (ADR-004). Everything about this prompt is shaped by that: it must never invent a
 * channel, and it must produce something a founder can check in ten seconds and recognise as safe.
 *
 * AUTHORED, NOT SEEDED — this Action postdates the design workbook (see the ActionDef's own
 * docstring, `lib/registry/executives/growth/actions/post-team-update.ts`). This file is the
 * runtime source regardless (ADR-010).
 */
export const POST_TEAM_UPDATE_PROMPT = `# Action Instructions

## Action ID

**post_team_update**

## Action Name

**Post Team Update**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P001 — Go-to-Market Strategy**

## Connector

**slack** — this Action posts a real message to a real Slack channel, as the Edge Alpha bot. It
does not post as the founder, and it cannot read the workspace.

---

# Purpose

Summarise this cycle's GTM progress for the team, in one short, skimmable Slack message — what
moved, what the evidence shows, and what's next. This keeps the team oriented on Go-to-Market
without anyone having to ask.

You are **preparing** the message, not posting it. A founder reviews your payload and approves it
before anything is posted.

---

# ⚠️ The channel rule — read this before anything else

**You may only post to a channel explicitly named in Company Context.**

Never invent a channel name or id. Never guess one from a team's naming convention. Never assume
a "general" or "updates" channel exists just because that is common practice elsewhere.

If Company Context names no channel for this purpose, that is the correct and expected answer for
most companies at this stage. **Return an empty channel and say what is missing.** A founder can
act on "you have no update channel configured yet — here is how to set one." A founder cannot
un-post a message from a channel the whole team saw, and neither can we.

---

# What to produce

## 1. The update

One to three sentences on what changed this cycle in the GTM Program — grounded only in what
Company Context and current Assets (AS001–AS005) actually show. Never claim traction, evidence,
or a decision that is not there.

## 2. The message

Constraints, all of them deliberate:

* **Under 60 words.** A team update is read in Slack between other things — long messages get
  skimmed, not read.
* **Plain sentences.** No marketing register, no exclamation marks, no "exciting update".
* **One clear next step**, if there is one. If there is nothing actionable this cycle, say so
  plainly rather than manufacturing urgency.

## 3. What is still missing

What Company Context or Asset evidence would make the next update more useful, stated as an
instruction the founder can act on this week.

---

# Output

Produce the sections above as readable markdown for the founder to review, **then** — as the last
thing in your response — exactly ONE fenced JSON block carrying the machine-readable payload:

\`\`\`json
{
  "channel": "the channel id or name from Company Context, or empty if none is configured",
  "body": "the message, plain text, under 60 words",
  "missing": ["what is still needed before this update is more useful"]
}
\`\`\`

Rules for the JSON block:

* \`channel\` must be a channel named in Company Context, or \`""\` — that is a valid, honest
  answer, and \`missing\` explains it.
* \`body\` must still be present even when \`channel\` is empty, so the founder can see and improve
  the draft before a channel is configured.
* Nothing after the JSON block.

---

# Success Criteria

* The channel is one the founder can verify was actually configured, never invented.
* The founder can read the payload in ten seconds and know exactly where this will post and what
  it says.
* Nothing in the message claims something the company cannot evidence.
* Where there is no configured channel, the Action says so plainly rather than guessing one.`
