import { documentProgress, type ScopableStepWithKind } from '@/features/executive/lib/scope-progress'

const step = (over: Partial<ScopableStepWithKind> = {}): ScopableStepWithKind => ({
  executiveId: 'growth', state: 'pending', label: 'x', kind: 'asset', ...over,
})

describe('documentProgress', () => {
  it('excludes actions from steps, done and total', () => {
    const steps = [
      step({ label: 'AS001', state: 'done' }),
      step({ label: 'Briefing', kind: 'briefing', state: 'done' }),
      step({ label: 'validate_icps', kind: 'action', state: 'done' }),
      step({ label: 'interview_customers', kind: 'action', state: 'pending' }),
    ]
    const result = documentProgress(steps)
    expect(result.steps.map(s => s.label)).toEqual(['AS001', 'Briefing'])
    expect(result.done).toBe(2)
    expect(result.total).toBe(2)
  })

  it('currentLabel is the active DOCUMENT step, never an active action', () => {
    const steps = [
      step({ label: 'AS001', state: 'done' }),
      step({ label: 'AS002', state: 'pending' }),
      step({ label: 'post_team_update', kind: 'action', state: 'active' }),
    ]
    expect(documentProgress(steps).currentLabel).toBeNull()
  })

  it('finished is true once every document/briefing step is done, even while an action is still active', () => {
    const steps = [
      step({ label: 'AS001', state: 'done' }),
      step({ label: 'Briefing', kind: 'briefing', state: 'done' }),
      step({ label: 'post_team_update', kind: 'action', state: 'active' }),
    ]
    const result = documentProgress(steps)
    expect(result.finished).toBe(true)
    expect(result.currentLabel).toBeNull()
  })

  it('finished is false while a document step is still pending or active', () => {
    const steps = [
      step({ label: 'AS001', state: 'done' }),
      step({ label: 'AS002', state: 'active' }),
    ]
    const result = documentProgress(steps)
    expect(result.finished).toBe(false)
    expect(result.currentLabel).toBe('AS002')
  })

  it('an executive with no document steps at all is not falsely "finished"', () => {
    expect(documentProgress([]).finished).toBe(false)
  })

  it('a skipped (ADR-028, no-change) document step counts as done', () => {
    const steps = [step({ label: 'AS001', state: 'skipped' }), step({ label: 'Briefing', kind: 'briefing', state: 'done' })]
    const result = documentProgress(steps)
    expect(result.done).toBe(2)
    expect(result.finished).toBe(true)
  })
})
