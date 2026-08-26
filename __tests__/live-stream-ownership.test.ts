/**
 * The two predicates that decide whether a founder is looking at live text or a saved document.
 *
 * Both existed before as ad-hoc expressions written inline at four call sites, and they
 * disagreed: AssetWorkspaceBody asked `liveText !== undefined` over a value that initialised to
 * `''` (so it was permanently "live", hiding the real saved document behind a fake "Writing this
 * now…" for the whole cycle), while AssetWorkspacePanel asked `Boolean(liveText)` — the same
 * value, in the same render tree, answered two ways.
 *
 * The underlying defect is worth naming, because it appeared three separate times in this
 * feature: A BOOLEAN DERIVED FROM "IS THIS NOT undefined", OVER A VALUE WHOSE EMPTY STATE IS ''.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { streamOwnedBy, isLiveStream, type LiveStream } from '@/features/executive/hooks/live-stream'

const stream = (over: Partial<LiveStream> = {}): LiveStream => ({ text: 'Writing…', assetId: 'AS001', ...over })

describe('streamOwnedBy — may this document render this text as its own?', () => {
  it('yes, when the stream names this exact asset', () => {
    expect(streamOwnedBy(stream(), 'AS001')).toBe(true)
  })

  it('⚠️ NO for a different asset — the cross-executive leak', () => {
    // The COO's AS019 panel, handed the CGO's in-flight P001 text. It used to render it, under
    // AS019's own name and section outline, because nothing asked the text who it belonged to.
    expect(streamOwnedBy(stream({ assetId: 'AS001' }), 'AS019')).toBe(false)
  })

  it('⚠️ NO for an owned but EMPTY stream — the hidden-document bug', () => {
    // An empty stream is not "live". Treating it as live is what suppressed Versions, Edit and
    // Direct-the-AI, and put "Writing this now…" over a document that was already finished.
    expect(streamOwnedBy(stream({ text: '' }), 'AS001')).toBe(false)
  })

  it('⚠️ NO for a stream that never declared an owner', () => {
    // The inference that caused all of this: text with no owner is owned by NOTHING. It must
    // never be treated as owned by whichever asset happens to look active.
    expect(streamOwnedBy(stream({ assetId: null }), 'AS001')).toBe(false)
  })

  it('no stream, or no asset to compare against', () => {
    expect(streamOwnedBy(null, 'AS001')).toBe(false)
    expect(streamOwnedBy(undefined, 'AS001')).toBe(false)
    expect(streamOwnedBy(stream(), null)).toBe(false)
    expect(streamOwnedBy(null, null)).toBe(false)
  })
})

describe('isLiveStream — is anything being written here at all?', () => {
  it('true only for a stream carrying actual text', () => {
    expect(isLiveStream(stream())).toBe(true)
    expect(isLiveStream(stream({ assetId: null }))).toBe(true) // ownership is a separate question
  })

  it('false for null, undefined, and the empty stream', () => {
    expect(isLiveStream(null)).toBe(false)
    expect(isLiveStream(undefined)).toBe(false)
    expect(isLiveStream(stream({ text: '' }))).toBe(false)
  })
})

describe('the call sites use the shared predicates, not their own', () => {
  const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

  it('AssetWorkspaceBody no longer derives liveness from `!== undefined`', () => {
    // The single line a future refactor is most likely to reintroduce. Comment lines are
    // stripped first — this file's own docstring quotes the old expression to explain it, and a
    // naive substring search over the whole source would fail on the explanation rather than
    // on the defect.
    const code = read('features/executive/components/AssetWorkspaceBody.tsx')
      .split('\n')
      .filter(line => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join('\n')

    expect(code).not.toMatch(/!==\s*undefined/)
    expect(code).toContain('isLiveStream(liveStream)')
  })

  it('the Panel and the Body agree, because they call the same function', () => {
    expect(read('features/executive/components/AssetWorkspacePanel.tsx')).toContain('isLiveStream')
    expect(read('features/executive/components/AssetWorkspacePanel.tsx')).not.toMatch(/Boolean\(liveText\)/)
  })

  it('a step row is keyed on its own assetId, never on merely looking active', () => {
    const src = read('features/executive/components/RhythmPanel.tsx')
    expect(src).toContain('streamOwnedBy(activeLive, step.assetId)')
    expect(src).not.toMatch(/liveText=\{step\.state === 'active'/)
  })

  it('the open document panel asks the stream who owns it, not the derived active id', () => {
    const src = read('features/executive/hooks/useAutoOpenLiveAsset.ts')
    expect(src).toContain('streamOwnedBy(rhythm.activeLive, openAssetId)')
    // The old gate compared two derivations against each other, both fed by the same bad source.
    expect(src).not.toMatch(/openAssetId === activeAssetId \? rhythm/)
  })

  it('the SSE path carries identity too — or "Run now" would silently stop previewing', () => {
    const src = read('app/api/rhythm/run/route.ts')
    expect(src).toContain("type: 'begin'")
    expect(src).toMatch(/type: 'delta', text, assetId/)
  })
})
