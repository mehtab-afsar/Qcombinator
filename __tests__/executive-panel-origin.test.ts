import { panelOriginAnimation } from '@/features/executive/lib/panel-origin'

describe('panelOriginAnimation', () => {
  it('null rect → null result, so the caller falls back to the plain slide-in', () => {
    expect(panelOriginAnimation(null, 640, 1440, 900)).toBeNull()
  })

  it('initial matches the clicked card\'s own rect exactly', () => {
    const result = panelOriginAnimation({ top: 120, left: 300, width: 260, height: 140 }, 640, 1440, 900)
    expect(result?.initial).toEqual({ top: 120, left: 300, width: 260, height: 140, opacity: 0.6, borderRadius: 10 })
  })

  it('animate docks the panel full-height at the right edge of the viewport', () => {
    const result = panelOriginAnimation({ top: 120, left: 300, width: 260, height: 140 }, 640, 1440, 900)
    expect(result?.animate).toEqual({ top: 0, left: 1440 - 640, width: 640, height: 900, opacity: 1, borderRadius: 0 })
  })

  it('docks correctly against a narrower viewport too (panelWidth already accounts for min(640,100vw))', () => {
    const result = panelOriginAnimation({ top: 40, left: 10, width: 300, height: 200 }, 380, 380, 720)
    expect(result?.animate).toEqual({ top: 0, left: 0, width: 380, height: 720, opacity: 1, borderRadius: 0 })
  })
})
