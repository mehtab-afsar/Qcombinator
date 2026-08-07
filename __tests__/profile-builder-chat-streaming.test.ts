/**
 * Profile Builder chat — Stage B of the rebuild.
 *
 * The bug: the model already generated a warm, human, one-question-at-a-time reply
 * (FOLLOW_UP_PROMPT in lib/profile-builder/extraction-prompts.ts already instructs
 * it to open with "Got it —"/"Makes sense —" and ask ONE thing) — but the client
 * (app/founder/profile-builder/page.tsx) prepended its OWN mechanical
 * "Got it — noted: field1, field2, field3." template in front of it, doubling the
 * acknowledgement and making the whole exchange read like a form, not a person.
 *
 * Fix: delete the client-side template; stream the model's own reply via SSE
 * instead of waiting for the whole JSON response.
 */

import { readFileSync } from 'fs'

// handleSend (the code these checks pin) moved out of page.tsx into its own hook
// as part of the profile-builder feature-folder split (Stage 8) — reading page.tsx
// here would make the negative assertions below vacuously pass without testing
// anything, so they read the hook file, the actual home of this logic now.
const hook = readFileSync('features/profile-builder/hooks/useSectionChat.ts', 'utf8')
const route = readFileSync('app/api/profile-builder/extract/route.ts', 'utf8')

describe('the client no longer echoes extracted fields back as a template', () => {
  it('the "Got it — noted:" prefix is gone', () => {
    expect(hook).not.toContain('Got it — noted:')
    expect(hook).not.toContain('extractPrefix')
  })

  it('the model-authored reply (followUpQuestion) is used directly, not wrapped', () => {
    expect(hook).toContain('const agentReply: string = followUpQuestion')
  })

  it('flattenForDisplay — the helper that built the field-dump prefix — is gone, not just unused', () => {
    // CLAUDE.md: no dead code left behind.
    expect(hook).not.toContain('flattenForDisplay')
    const engine = readFileSync('lib/profile-builder/question-engine.ts', 'utf8')
    expect(engine).not.toContain('export function flattenForDisplay')
  })
})

describe('the reply streams in — SSE, not a single blocking JSON response', () => {
  it('the extract route returns an event-stream, reusing the one established SSE convention', () => {
    // Same framing as app/api/investor/ai-analysis/chat/route.ts — not a second,
    // parallel streaming protocol invented here (CLAUDE.md §0.2).
    expect(route).toContain("'Content-Type': 'text/event-stream'")
    expect(route).toContain("type: 'meta'")
    expect(route).toContain("type: 'delta'")
    expect(route).toContain('[DONE]')
  })

  it('generation is routed through routedStream — the router, not a hardcoded model', () => {
    expect(route).toContain('routedStream(')
    expect(route).not.toMatch(/claude-[a-z0-9-]+/i)
  })

  it('the client reads the stream progressively and updates the same bubble in place', () => {
    expect(hook).toContain('streamExtract')
    expect(hook).toMatch(/i === (sec\.messages\.length|msgs\.length) - 1/)
  })
})

describe('the known-state-and-gaps-as-input principle stays intact', () => {
  // The brief's core reframe: hand the model what's known + what's missing and let
  // IT converse, rather than the client deciding what to say. Confirm the route
  // still feeds the model real state (not just the raw founder message) and that
  // the gap-ranking stays server-side input to the prompt, not client-side text.
  it('the follow-up prompt is built from real extracted state and real missing fields', () => {
    // The extracted-state/missing-fields/conversation context moved from a `.replace()`-
    // substituted instructions template into composeAdhocPrompt's fenced `data` param
    // (CLAUDE.md §3: founder-derived content is data, not instructions) — same facts fed
    // to the model, different mechanism. Assert the new one.
    expect(route).toContain('flatSummaryOf(merged)')
    expect(route).toContain('missingFields.join(')
    expect(route).toContain('followUpData')
    expect(route).toContain('composeAdhocPrompt(')
  })
})
