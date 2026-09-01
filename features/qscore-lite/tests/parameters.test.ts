import { PARAMETER_DEFINITIONS } from '../scoring/parameters'
import { INDICATOR_DEFINITIONS, weightForIndicator } from '../scoring/indicators'

describe('PARAMETER_DEFINITIONS', () => {
  it('weights sum to exactly 1.0', () => {
    const sum = PARAMETER_DEFINITIONS.reduce((s, p) => s + p.weight, 0)
    expect(sum).toBeCloseTo(1.0)
  })
})

describe('INDICATOR_DEFINITIONS', () => {
  it('has exactly 20 indicators, 4 per parameter', () => {
    expect(INDICATOR_DEFINITIONS).toHaveLength(20)
    for (const param of PARAMETER_DEFINITIONS) {
      expect(INDICATOR_DEFINITIONS.filter(i => i.parameterId === param.id)).toHaveLength(4)
    }
  })

  it('per-indicator weights within each parameter sum back to that parameter\'s own weight', () => {
    for (const param of PARAMETER_DEFINITIONS) {
      const indicators = INDICATOR_DEFINITIONS.filter(i => i.parameterId === param.id)
      const sum = indicators.reduce((s, i) => s + weightForIndicator(i.id), 0)
      expect(sum).toBeCloseTo(param.weight)
    }
  })

  it('all 20 indicator weights sum to 1.0 overall', () => {
    const sum = INDICATOR_DEFINITIONS.reduce((s, i) => s + weightForIndicator(i.id), 0)
    expect(sum).toBeCloseTo(1.0)
  })
})
