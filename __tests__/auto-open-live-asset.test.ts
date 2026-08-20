/**
 * activeAssetIdFor (features/executive/hooks/useAutoOpenLiveAsset.ts) — the pure derivation
 * behind "watch a document write itself live": which asset, if any, is actively generating for
 * one executive right now. Everything else in that hook (the auto-open effect, the dismissal
 * ref) is React state wiring around this one fact.
 */

import { activeAssetIdFor } from '@/features/executive/hooks/useAutoOpenLiveAsset'
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
