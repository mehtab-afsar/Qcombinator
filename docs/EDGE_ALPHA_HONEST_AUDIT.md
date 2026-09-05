# Edge Alpha — honest state of the Executive/Program/Action system

*No sugar coating. Written after actually reading the code (not the docs, not memory), file by file, with exact citations. Anywhere I couldn't verify something from the code, I say so instead of guessing. Dated 3 Sep 2026.*

---

## 1. Does a Program actually run for a real founder today, on its own?

**No, not automatically. Only when someone clicks a button, or once at signup.**

There are three ways a "cycle" can start, and they all end up in the same engine (`lib/rhythm/run.ts`):

- A founder clicks **"Run now"** in the product.
- The moment a founder **confirms their Executive's mandate** for the first time, one cycle fires automatically.
- A **weekly scheduled job** (`/api/cron/rhythm`) — this is the one meant to make it run "on its own," every cycle, without a founder having to remember to click anything.

The weekly job **is not running**. The code for it exists and works, but on 11 Aug 2026 it was deliberately removed from Vercel's cron schedule (commit `9d938e6`, message: *"Cut cron jobs to 2 to unblock Vercel deploy (Hobby plan limit)"*) because our Vercel plan only allows 2 scheduled jobs and this lost the seat. It hasn't been added back. On top of that, even if it were re-added, the job is configured to run for up to 200 seconds, but our current Vercel plan kills any job after 60 seconds — so turning the cron back on today would still fail partway through a cycle, not just start late. Both of these are known, already flagged in the code's own comments — this isn't a hidden problem, it's a fixed-but-not-yet-fixed one.

**What this means in plain terms:** the "operating rhythm" — the thing that's supposed to make Edge Alpha proactively work on a founder's behalf every week without them asking — currently only happens if the founder manually triggers it, or once automatically when they first set up their Executive. Nothing runs on a schedule right now.

---

## 2. When a Program does run, what actually happens to what it produces — does anyone see it, use it, or approve it?

**It produces two real things, stored in real database tables, and there is a real page to read, edit, and even instruct the AI to redo them. But we have no way to tell whether founders actually open them.**

Every real cycle writes to two tables:
- **`asset_versions`** — the actual documents (e.g. "ICP Profiles," a GTM plan section). Every new version is a new row — nothing is ever overwritten, matching our "versioned, never overwritten" rule.
- **`executive_briefings`** — a short "here's what changed this cycle" summary.

There's a real, working page for this (`/founder/executive/[executiveId]`), and it's not buried — "Executive Team" is the second item in the sidebar, and there's a card at the top of the dashboard that becomes an amber "N actions need your approval" banner whenever something's waiting. This is the primary product surface now, not a hidden experiment.

For documents specifically, the page is genuinely functional, not just a read-only dump: you can **read** the current version, browse **version history** and restore an old one, **hand-edit** the text yourself and save a new version, or type free-text instructions and have the AI **redo the document** into a new version. That's real, working functionality.

**What we can't verify:** there's no "marked as read," no view count, no tracking of any kind for whether a founder has ever opened a document. For briefings there's one analytics event that fires when the page loads — which the code itself calls "the retention signal" — but loading the page isn't the same as reading the briefing. So honestly: **I cannot tell you, from the code, whether founders are actually reading what the AI produces.** That data simply isn't collected.

The one place there IS a real approve/decline button, working end-to-end, is described in question 4 below — and it's exactly where it's supposed to be per our own rules: never on documents, only on things that leave the building (send an email, post to Slack).

---

## 3. Is what a Program produces actually specific to that founder, or is it generic AI output?

**Both — and it's a real mix, not a fake one.**

The instructions the AI is given (the "GTM Program" playbook, over a thousand lines) are **identical for every founder** — they're not templated with the founder's name, numbers, or industry dropped in. That part is boilerplate, same for everyone.

But underneath those shared instructions, every cycle also attaches a block of the founder's own real data: their confirmed strategy and contract, their actual Stripe revenue numbers (if connected), an anonymized comparison against similar real founders on the platform, their own prior documents, and a short digest of what's changed since last cycle (new uploads, metric moves). That part is genuinely founder-specific, pulled fresh from the database each time, not made up.

So the honest description is: **same playbook, different homework attached to it each time** — closer to a consultant using a standard framework on your actual numbers than either "fully custom advice" or "fully generic ChatGPT output."

**One real gap found here:** the Program's own instructions explicitly tell the AI to check the founder's "Latest Q-Score" before writing anything — but the code that assembles that founder-specific data block never actually includes the Q-Score. It's a documented omission in the code itself ("Q-Score is a v1 omission"), but it means every cycle today runs while blind to the one thing its own instructions say to look at first.

---

## 4. Do the "Actions" — sending an email, posting to Slack — actually go out for real, or is this simulated?

**For Gmail: yes, genuinely proven with a real send. For Slack: the code is real, but nobody has confirmed it actually works yet.**

The approve/decline flow itself is real and correctly locked down: a founder clicks approve, the system re-checks that nothing changed since they saw it, re-checks their permission, and only then actually calls out. Decline never reaches the sending code at all — it can't accidentally fire.

**Gmail has actually sent real email.** On 4 Aug 2026, the team ran the first real sends and it exposed three genuine bugs a real inbox found that no test had — the wrong kind of token was being sent (an outright authentication failure), a failed send was permanently blocking retries, and a race condition could make a successful send record itself as a failure. All three were fixed, and the commit message even quotes a real Gmail message ID that was sent. That's about as strong a proof-of-life as this kind of feature gets.

**Slack has not been proven the same way.** The code that would post to Slack is written and looks correct, but its own comment says, in effect, "we're guessing at the exact shape Slack expects here — confirm this the first time it actually runs for real." There's no equivalent "first real send" record for Slack anywhere in the project history. So: **built, plausible, unconfirmed.**

Neither Gmail's nor Slack's actual sending code has automated tests covering it — the existing tests fake ("mock") the sending step entirely, so they prove the approval logic works, not that a real message goes out. The Gmail proof we do have came from a real production run, not from a test suite.

---

## 5. Is the Q-Score connected to any of this — Executives, Programs, Actions, Documents?

**By design, the score itself can never be moved by any of this — and that rule is enforced by a real automated test, not just a comment. But the *reading* side is only half-wired.**

No code anywhere in the Program/Action/document system is allowed to change a founder's Q-Score — there's a dedicated automated check that scans the whole codebase for any attempt to do that and fails the build if it finds one. I confirmed this test currently passes. This part of the "the score is a separate diagnostic" rule is real, not aspirational.

In the other direction — using the score as an *input* — it's inconsistent:
- When a founder first sets a mandate for their Executive (a one-time strategy conversation), their actual Q-Score genuinely is fed in, and the AI is explicitly told to open by naming their strongest and weakest areas. That part works as advertised.
- But the regular week-to-week cycle described in question 1 — the one that actually produces documents — never receives the Q-Score at all, for the reason noted in question 3.
- There's also a specific document, the "Q-Score Trend Report," whose entire stated job is to track how a founder's Q-Score has moved over time. As currently wired, it runs through the same pipeline that doesn't supply Q-Score data — so today it has no actual Q-Score numbers to report on, despite the name.

---

## Bottom line, plainly

- **The core loop is real, not vaporware:** a founder can trigger a cycle, it genuinely calls the AI with a mix of a shared playbook and their own real business data, and it genuinely saves a document you can read, edit, or ask the AI to redo.
- **But it doesn't run itself yet.** The "weekly, automatic, don't-have-to-think-about-it" promise isn't happening — the scheduled job that would do that has been switched off since 11 Aug and would still break even if switched back on, on our current hosting plan.
- **We can't currently tell if founders are using it.** No read/open tracking exists on the documents themselves.
- **Sending real emails is a proven capability** (one real, documented, bug-surfacing send). **Posting to Slack is unproven** — real code, no confirmed real-world run yet.
- **The Q-Score is properly walled off from being gamed** by any of this (verified by an automated test), but it's only a *real input* at the one-time strategy-setting moment — the ongoing weekly work currently runs blind to it, which contradicts what that work's own instructions say it should be checking.
