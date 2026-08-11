import { orbitPosition } from '@/features/executive/lib/orbit-layout'

describe('orbitPosition', () => {
  it('the first card sits at the top of the ring (12 o\'clock)', () => {
    const { x, y } = orbitPosition(0, 4, 200)
    expect(x).toBeCloseTo(0)
    expect(y).toBeCloseTo(-200)
  })

  it('4 cards land at 90-degree increments, clockwise from the top', () => {
    expect(orbitPosition(1, 4, 200).x).toBeCloseTo(200) // 3 o'clock
    expect(orbitPosition(1, 4, 200).y).toBeCloseTo(0)
    expect(orbitPosition(2, 4, 200).x).toBeCloseTo(0) // 6 o'clock
    expect(orbitPosition(2, 4, 200).y).toBeCloseTo(200)
    expect(orbitPosition(3, 4, 200).x).toBeCloseTo(-200) // 9 o'clock
    expect(orbitPosition(3, 4, 200).y).toBeCloseTo(0)
  })

  it('every card is exactly `radius` away from the centre, for any count', () => {
    for (const total of [1, 2, 3, 5, 7]) {
      for (let i = 0; i < total; i++) {
        const { x, y } = orbitPosition(i, total, 150)
        expect(Math.hypot(x, y)).toBeCloseTo(150)
      }
    }
  })

  it('radius scales the offset linearly', () => {
    const small = orbitPosition(1, 5, 100)
    const big = orbitPosition(1, 5, 300)
    expect(big.x).toBeCloseTo(small.x * 3)
    expect(big.y).toBeCloseTo(small.y * 3)
  })

  it('zero cards never divides by zero — returns a defined origin, not NaN', () => {
    expect(orbitPosition(0, 0, 200)).toEqual({ x: 0, y: 0 })
  })
})
