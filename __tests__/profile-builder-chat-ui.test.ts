/**
 * The section chat was producing genuinely broken output, e.g.:
 *
 * "From your documents I found: IP/patents: No · technical depth: 9 specialist AI agents
 * trained on proprietary framework… · proprietary know-how: Proprietary frameworks across
 * 9 specialist domains (PAT…. I still need your how many months to replicate your tech —
 * if a well-funded competitor started building today, how many months would it take them
 * to replicate what you've built?"
 *
 * Not the model writing badly — application code concatenating strings. Three separate
 * bugs, fixed together: (1) two MISSING_FIELD_LABELS entries were full question phrases
 * instead of noun phrases, so "I still need your ${label} — ${question}" read as broken,
 * near-duplicate English; (2) a raw slice(0, 55) truncated mid-word; (3) the doc recap and
 * the question were one concatenated string in one bubble — a wall of text with no clear
 * separation from the founder's own reply. SectionChat.tsx also hand-rolled its own chat
 * bubbles instead of reusing the shared MessageBubble component ThreadPanel.tsx already
 * uses correctly (CLAUDE.md: "one of each, never a second parallel way to do the same
 * thing") — migrated here too, since that's what actually gives messages a real avatar +
 * grouping instead of color-and-alignment-only distinction.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

describe('MISSING_FIELD_LABELS entries are noun phrases, not restated questions', () => {
  const src = read('features/profile-builder/lib/constants.ts')

  it('p3.buildComplexity and p3.replicationTimeMonths no longer read as full questions', () => {
    expect(src).not.toMatch(/'p3\.buildComplexity':\s*'how long/)
    expect(src).not.toMatch(/'p3\.replicationTimeMonths':\s*'how many/)
  })

  it('replaced with short noun phrases matching question-engine.ts\'s own FIELD_DISPLAY_LABELS wording', () => {
    expect(src).toContain("'p3.buildComplexity': 'build complexity'")
    expect(src).toContain("'p3.replicationTimeMonths': 'replication time'")
  })
})

describe('snippet truncation respects word boundaries', () => {
  const src = read('lib/profile-builder/question-engine.ts')

  it('the old raw slice-then-ellipsis (mid-word cuts like "framework…") is gone', () => {
    expect(src).not.toContain("v.slice(0, 55) + (v.length > 55 ? '…' : '')")
  })

  it('a word-boundary-aware truncate helper exists and is used by snippetStr', () => {
    expect(src).toContain('function truncateAtWord(')
    const snippetStrIdx = src.indexOf('function snippetStr(')
    const snippetStrBody = src.slice(snippetStrIdx, snippetStrIdx + 300)
    expect(snippetStrBody).toContain('truncateAtWord(')
  })
})

describe('the doc-recap and the question render as two separate bubbles, not one wall of text', () => {
  const src = read('features/profile-builder/hooks/useInitialQuestion.ts')

  it('builds a multi-entry messages array when a recap exists', () => {
    expect(src).toContain('openingMessages')
    expect(src).toContain('(openingMessages ?? [initialQ]).map(text => ({ role: \'agent\' as const, text }))')
  })

  it('the recap no longer has its own trailing blank line baked in (that job now belongs to the split, not string concatenation)', () => {
    const foundStrIdx = src.indexOf('const foundStr =')
    const block = src.slice(foundStrIdx, foundStrIdx + 200)
    expect(block).not.toContain("}.\\n\\n`")
  })
})

describe('SectionChat reuses the shared MessageBubble component instead of hand-rolling bubbles', () => {
  const src = read('features/profile-builder/components/SectionChat.tsx')

  it('imports buildGroups/MessageGroupBlock from the shared component', () => {
    expect(src).toContain("import { buildGroups, MessageGroupBlock, type ChatMessage } from '@/features/shared/components/MessageBubble'")
  })

  it('the old hand-rolled per-message div (color/alignment swapped on msg.role) is gone', () => {
    expect(src).not.toMatch(/justifyContent:\s*msg\.role === 'user' \? 'flex-end' : 'flex-start'/)
  })

  it('renders via buildGroups + MessageGroupBlock, with meta (timestamp/read-receipt) hidden — there\'s no "read by a human" concept for an AI chat', () => {
    expect(src).toContain('buildGroups(toChatMessages(sec.messages)')
    expect(src).toContain('showMeta={false}')
  })
})

describe('MessageBubble.tsx\'s showMeta prop is additive — existing callers are unaffected', () => {
  const bubble = read('features/shared/components/MessageBubble.tsx')
  const threadPanel = read('features/messaging/components/ThreadPanel.tsx')

  it('showMeta defaults to true, so ThreadPanel (which never passes it) keeps its exact current behavior', () => {
    expect(bubble).toContain('showMeta = true')
  })

  it('ThreadPanel does not pass showMeta — confirms no change needed there', () => {
    expect(threadPanel).not.toContain('showMeta')
  })
})

describe('the Back button is gone from SectionChat only — SmartQAScreen keeps its own', () => {
  it('SectionChat.tsx has no Back button or prevStep prop', () => {
    const src = read('features/profile-builder/components/SectionChat.tsx')
    expect(src).not.toContain('← Back')
    expect(src).not.toContain('prevStep')
  })

  it('app/founder/profile-builder/page.tsx no longer computes or passes prevStep', () => {
    const src = read('app/founder/profile-builder/page.tsx')
    expect(src).not.toContain('prevStep')
  })

  it('SmartQAScreen.tsx — a different screen later in the flow — still has its own Back button, untouched', () => {
    const src = read('features/profile-builder/components/SmartQAScreen.tsx')
    expect(src).toContain('← Back')
  })
})
