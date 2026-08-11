/**
 * Production crash: "TypeError: s.filter is not a function" on /investor/portfolio-companies
 * (the sidebar's "Portfolio" link). GET /api/investor/portfolio-companies returns
 * { companies: [...] } — an object — but the page did `setCompanies(await res.json())`,
 * setting the companies state to that whole object instead of the array inside it. Every
 * downstream `companies.filter(...)` (search, status counts, bulk-invite) then threw on the
 * next render, since `companies` was never actually an array.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

describe('GET /api/investor/portfolio-companies response shape', () => {
  it('returns { companies: [...] }, not a bare array', () => {
    const src = read('app/api/investor/portfolio-companies/route.ts')
    expect(src).toContain('NextResponse.json({ companies: data ?? [] })')
  })
})

describe('the portfolio-companies page unwraps the companies key', () => {
  const src = read('app/investor/portfolio-companies/page.tsx')

  it('reads .companies off the parsed response, not the whole body', () => {
    expect(src).toContain('setCompanies((await res.json()).companies ?? [])')
    // The exact bug's shape — restated so a future edit that reintroduces it fails loudly.
    expect(src).not.toMatch(/setCompanies\(await res\.json\(\)\)/)
  })

  it('companies state is always an array before any .filter() call runs on it', () => {
    const loadIdx = src.indexOf('const load = useCallback')
    const firstFilterIdx = src.indexOf('companies.filter(')
    expect(loadIdx).toBeGreaterThan(-1)
    expect(firstFilterIdx).toBeGreaterThan(loadIdx)
  })
})
