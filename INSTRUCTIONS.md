# Edge Alpha — Design Mistake Registry

This file is a permanent record of architectural failures we have already made. Before building any new agent feature, deliverable pipeline, or tool integration — read this. If you are about to do something that looks like a pattern below, stop.

---

## Failure 1 — The Four-Layer Tool Chain (Never Break the Chain)

**What broke:** Patel's D2/D3/D4 deliverables (Pains & Gains, Buyer Journey, Positioning) never generated. The agent looped asking questions forever. Users saw "ok" responses but no deliverable.

**Root cause:** There are four files that MUST all be updated in sync for a new artifact tool to work end-to-end. Missing any one of them silently kills the entire pipeline with no error:

| Layer | File | What it controls |
|-------|------|-----------------|
| 1 | `lib/constants/artifact-types.ts` | Canonical string constant — `ARTIFACT_TYPES.FOO = 'foo'` |
| 2 | `lib/llm/tools.ts` | LLM tool definition — what Claude sees in its tool list |
| 3 | `lib/edgealpha.config.ts` | Agent config — which agent owns which tools |
| 4 | `app/api/agents/generate/run/route.ts` | Uses `ALL_ARTIFACT_TYPES` (derived from layer 1) to validate inbound artifact type strings |

**The invariant:** `getToolsForAgent(agentId)` reads from layer 3 → resolves against layer 2. If the artifact type is absent from ANY layer, the LLM never sees the tool. The generation route also rejects artifact types not in `ALL_ARTIFACT_TYPES`. Layers 1, 2, and 3 must be updated together, atomically.

**Rule: When adding any new deliverable, update all four files in a single commit. Never add a deliverable prompt, renderer, or page reference without first completing all four layers.**

---

## Failure 2 — The Describe-Instead-of-Execute Pattern

**What broke:** Patel would say "I'll now create your ICP Document for you..." followed by a text description. The deliverable was never built. The user repeated themselves. The agent looped asking more questions.

**Root cause:** The system prompt said "build the deliverable" but never mandated that building = calling the tool. Claude is highly capable of producing text that sounds like it is doing the task without actually invoking the tool. This is the LLM being helpful in the wrong direction.

**The fix applied:** The TOOL USAGE RULES section now explicitly states:
- "Do NOT write 'I'll now build your ICP' — that is a broken promise."
- "Describing what you are about to build instead of building it wastes a full user interaction."

**Rule: Any system prompt that says "build a deliverable" must also say "build = call the tool". Describing the deliverable is not building it. Always mandate the tool call explicitly.**

---

## Failure 3 — The Over-Gated Tool Release

**What broke:** The chat route withheld all tools until `userMsgCount >= 3` (i.e., after 4+ message exchanges). Combined with failure 2 (LLM describing instead of executing), the founder could answer all questions correctly and still not get a deliverable because tools weren't even available yet.

**Root cause:** The gate was designed to prevent premature tool calls before the agent had any context. But 3 messages is too conservative — by the second user message, the agent usually has enough to draft D1 with assumptions labeled.

**The fix applied:** Lowered to `userMsgCount >= 2`.

**Rule: Tool gates exist to prevent firing before any context is gathered. One exchange (1 user message) is sufficient. Never gate beyond 2. The Missing-Data Rule (best draft + ASSUMED labels) handles insufficient context better than withholding tools.**

---

## Failure 4 — Silent JSON Parse Failure in generateArtifactJSON

**What broke:** When the generation LLM returned malformed JSON or markdown-wrapped JSON that wasn't fully cleaned, `JSON.parse()` threw an uncaught exception. The artifact pipeline crashed silently. No artifact was saved. No error surfaced to the user.

**Root cause:** `generateArtifactJSON` did `return JSON.parse(clean)` with no try/catch. A single stray backtick or trailing newline in the LLM response killed the entire artifact creation silently.

**The fix applied:** Wrapped in try/catch — on parse failure returns `{ raw_output: clean, _parse_error: true }` so the artifact is saved with the raw content and the error is visible in the database.

**Rule: Never call JSON.parse() on LLM output without a try/catch. LLMs are not reliable JSON serializers. Always have a fallback that preserves the raw output.**

---

## Failure 5 — Confusing Two Component Trees (CXO vs Agent)

**What broke:** Fixes applied to `AgentWorkspace`/`AgentLeftPanel` had no effect on the `/founder/cxo/[agentId]` route, which uses a completely separate component tree (`CXOWorkspace`/`CXOSidebar`/`CXODashboard`).

**Root cause:** Two parallel UI architectures exist for the same agents:
- `/founder/agents/[agentId]` → `AgentWorkspace` → `AgentLeftPanel` + chat
- `/founder/cxo/[agentId]` → `CXOWorkspace` → `CXOSidebar` + `CXODashboard` (with `CXOChat` iframe)

Fixes to one tree have zero effect on the other.

**Rule: Before modifying any agent UI component, confirm which route and component tree the user is actually on. The two trees are:**
- **CXO tree:** `CXOWorkspace`, `CXOSidebar`, `CXODashboard`, `CXOChat` — lives under `/founder/cxo/`
- **Agent tree:** `AgentWorkspace`, `AgentLeftPanel` — lives under `/founder/agents/`

---

## Failure 6 — Working Code vs Reachable Code

**What broke:** The prerequisite chain for D2/D3/D4 (`PATEL_PREREQUISITE_CHAIN` in `chat/route.ts`) was complete and correct. The generation prompts in `artifact-prompts.ts` were complete. The renderers in `DeliverablePanel.tsx` were complete. The page deliverables array was complete. None of it ever ran because the tool definitions in layers 1-3 were missing (Failure 1).

**Root cause:** It is easy to confuse "code exists" with "code is reachable". Code gated behind a condition that is never true is dead code. Completed downstream layers have zero value when an upstream gate is broken.

**Rule: When debugging a pipeline that "should work", trace from the entry point forward — don't start from the code you wrote last. Ask: "Can the LLM even see this tool?" before debugging the code that runs after the tool is called.**

---

## Checklist for New Deliverables

Before considering a new agent deliverable "done", verify all of the following:

- [ ] `lib/constants/artifact-types.ts` — constant added
- [ ] `lib/llm/tools.ts` — `artifactTool()` definition added + entry in `TOOL_DEFINITIONS`
- [ ] `lib/edgealpha.config.ts` — artifact type added to the owning agent's `tools` array
- [ ] `features/agents/[agent]/prompts/artifact-prompts.ts` — generation prompt written
- [ ] `features/agents/shared/components/DeliverablePanel.tsx` — renderer case added
- [ ] `app/founder/agents/[agent]/page.tsx` — deliverable added to `DELIVERABLES` array
- [ ] System prompt updated to mandate tool call (not text description)
- [ ] Prerequisites enforced in both system prompt AND route-level check
- [ ] End-to-end test: send 2 messages → tool is called → artifact appears in the panel

---

*Last updated: 2026-05-08*
