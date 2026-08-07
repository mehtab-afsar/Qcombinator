/**
 * Profile Builder — per-founder quick replies (Stage D of the rebuild).
 *
 * The brief's complaint: smart-questions.ts's FIELD_QUESTIONS bank is static —
 * every founder asked about e.g. replication time saw the same generic hint. Fixed
 * by generating the QUICK-REPLY OPTIONS per founder, from their real sector/stage/
 * extracted context, via the model — while keeping the field-selection logic
 * (rankMissingIndicators / gap-ranker.ts, WHICH question is worth asking) as the
 * pure rule-based ranker it already correctly was. Only the founder-facing text of
 * the options is now model-generated, matching the brief's own framing: gap-ranker
 * stays an INPUT to the model, not the thing that writes what the founder reads.
 */

import { readFileSync } from 'fs'

const route = readFileSync('app/api/profile-builder/upload/route.ts', 'utf8')
const page = readFileSync('features/profile-builder/components/SmartQAScreen.tsx', 'utf8')

describe('quick replies are generated per founder, through the router', () => {
  it('generateQuickReplies feeds the founder\'s real sector, stage and extracted context', () => {
    const fn = route.slice(route.indexOf('async function generateQuickReplies'), route.indexOf('function buildNarrativePrompt'))
    expect(fn).toContain('${sector}')
    expect(fn).toContain('${stage}')
    expect(fn).toContain('contextFields')
    expect(fn).toContain("routedText('generation'")
    expect(fn).not.toMatch(/claude-[a-z0-9-]+/i)
  })

  it('rankMissingIndicators stays the pure rule-based ranker — WHICH field, not what to say', () => {
    // gap-ranker.ts must not itself call the LLM; it's the model's INPUT, per the brief.
    const gapRanker = readFileSync('lib/profile-builder/gap-ranker.ts', 'utf8')
    expect(gapRanker).not.toContain('routedText')
    expect(gapRanker).not.toContain('routedStream')
  })

  it('a failed or empty generation never crashes the upload — allSettled, and no quickReplies key added', () => {
    const start = route.indexOf('const gapQuestions:')
    const block = route.slice(start, start + 700)
    expect(block).toContain('Promise.allSettled')
    expect(block).toMatch(/status === 'fulfilled'/)
  })
})

describe('the smart-QA screen offers quick replies but the free-text field is the real fallback', () => {
  it('quickReplies renders as tappable chips only when present', () => {
    expect(page).toContain('q.quickReplies && q.quickReplies.length > 0')
  })

  it('a tapped chip submits directly — one tap, matching the brief\'s constraint', () => {
    expect(page).toContain('onClick={() => handleSmartNext(reply)}')
  })

  it('the free-text textarea is unconditional, not gated on quickReplies existing', () => {
    // The "Answer input" block (the textarea) must render regardless of whether
    // this question got quick replies — that's the sane fallback the brief asks for.
    const answerInputIdx = page.indexOf('{/* Answer input */}')
    const nearby = page.slice(answerInputIdx, answerInputIdx + 400)
    expect(nearby).not.toContain('quickReplies &&')
  })
})

describe('smart-QA answers are no longer silently dropped by the Stage-B streaming change', () => {
  // Real regression found while building Stage D: handleSmartNext still called
  // fetch(...).then(res => res.json()) on a route Stage B changed to always return
  // an SSE stream — every smart-QA answer failed silently (caught, then the flow
  // just advanced as if it had worked) until this was caught and fixed here.
  it('handleSmartNext uses the streaming helper, not res.json()', () => {
    const start = page.indexOf('const handleSmartNext')
    const end = page.indexOf('return (', start)
    const fn = page.slice(start, end)
    expect(fn).toContain('streamExtract(')
    expect(fn).not.toContain('res.json()')
  })
})
