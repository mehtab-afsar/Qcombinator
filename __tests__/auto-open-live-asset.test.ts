import { readFileSync } from 'fs'
import { join } from 'path'
/**
 * activeAssetIdFor (features/executive/hooks/useAutoOpenLiveAsset.ts) — the pure derivation
 * behind "watch a document write itself live": which asset, if any, is actively generating for
 * one executive right now. Everything else in that hook (the auto-open effect, the dismissal
 * ref) is React state wiring around this one fact.
 */

import { activeAssetIdFor, shouldAutoOpen, dismissalFor } from '@/features/executive/hooks/useAutoOpenLiveAsset'
import type { ProgressStep } from '@/features/executive/components/RhythmPanel'

const step = (over: Partial<ProgressStep> = {}): ProgressStep => ({
  key: 'P001:AS001', label: 'ICP Profiles', state: 'pending', templateId: 'P001',
  executiveId: 'growth', kind: 'asset', assetId: 'AS001', actionId: null, preview: null,
  ...over,
})

describe('activeAssetIdFor', () => {
  it('returns the active asset step\'s assetId for this executive', () => {
    const steps = [step({ state: 'done' }), step({ key: 'P001:AS002', assetId: 'AS002', state: 'active' })]
    expect(activeAssetIdFor(steps, 'growth')).toBe('AS002')
  })

  it('returns null when nothing is active', () => {
    const steps = [step({ state: 'done' }), step({ key: 'P001:AS002', assetId: 'AS002', state: 'pending' })]
    expect(activeAssetIdFor(steps, 'growth')).toBeNull()
  })

  it('ignores an active step belonging to a DIFFERENT executive', () => {
    const steps = [step({ executiveId: 'finance', state: 'active' })]
    expect(activeAssetIdFor(steps, 'growth')).toBeNull()
  })

  it('ignores an active BRIEFING or ACTION step — only asset steps open the reading panel', () => {
    const steps = [
      step({ kind: 'briefing', assetId: null, state: 'active', key: 'P001:briefing' }),
      step({ kind: 'action', assetId: null, actionId: 'validate_icps', state: 'active', key: 'P001:validate_icps' }),
    ]
    expect(activeAssetIdFor(steps, 'growth')).toBeNull()
  })

  it('never matches a briefing/action step even if assetId were somehow non-null (defensive)', () => {
    // kind is the authority, not assetId's presence — this pins that down explicitly.
    const steps = [step({ kind: 'briefing', state: 'active' })]
    expect(activeAssetIdFor(steps, 'growth')).toBeNull()
  })

  it('returns null on an empty step list', () => {
    expect(activeAssetIdFor([], 'growth')).toBeNull()
  })
})

// ─── Close it, and open it again whenever you want ──────────────────────────────
//
// A founder's words: "live preview must open, I can close and again open it where I want to."
// What actually blocked that was the fake-live state (fixed in live-stream.ts) — clicking a
// document always did open the panel. These pin the surrounding behaviour so the convenience
// never starts overriding the intent.

describe('shouldAutoOpen — the panel opening itself', () => {
  it('opens on the generating document when nothing is open', () => {
    expect(shouldAutoOpen('AS001', null, null)).toBe(true)
  })

  it('never interrupts a founder already reading something else', () => {
    expect(shouldAutoOpen('AS001', 'AS007', null)).toBe(false)
  })

  it('never reopens the document they just closed', () => {
    expect(shouldAutoOpen('AS001', null, 'AS001')).toBe(false)
  })

  it('but does open the NEXT one, once the cycle moves on', () => {
    // Dismissing one document is not dismissing the feature.
    expect(shouldAutoOpen('AS002', null, 'AS001')).toBe(true)
  })

  it('stays shut when nothing is generating', () => {
    expect(shouldAutoOpen(null, null, null)).toBe(false)
  })
})

describe('dismissalFor — what closing a panel actually dismisses', () => {
  it('closing the generating document dismisses it', () => {
    expect(dismissalFor('AS001', 'AS001')).toBe('AS001')
  })

  it('⚠️ closing an UNRELATED document mid-cycle dismisses nothing', () => {
    // Otherwise reading and closing any settled document during a cycle would silently poison
    // the ref and suppress an auto-open the founder never declined.
    expect(dismissalFor('AS007', 'AS001')).toBeNull()
  })

  it('closing with nothing generating dismisses nothing', () => {
    expect(dismissalFor('AS007', null)).toBeNull()
    expect(dismissalFor(null, 'AS001')).toBeNull()
  })
})

describe('opening by hand is never gated by any of this', () => {
  const page = readFileSync(
    join(__dirname, '..', 'app/founder/executive/[executiveId]/page.tsx'), 'utf8',
  )

  it('a document card calls openAsset directly, on its own path', () => {
    expect(page).toContain('onOpenAsset={openAsset}')
    expect(page).toMatch(/const openAsset = useCallback[\s\S]{0,300}router\.push/)
  })

  it('and closing is always available while one is open', () => {
    expect(page).toMatch(/onClose=\{closeAsset\}/)
    expect(page).toMatch(/const closeAsset = useCallback[\s\S]{0,300}recordDismissal\(\)/)
  })
})
