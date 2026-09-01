import { normalizeDomain } from '../evidence/domain'

describe('normalizeDomain', () => {
  it('leaves a bare lowercase domain unchanged', () => {
    expect(normalizeDomain('acme.com')).toBe('acme.com')
  })

  it('strips protocol, www, path, query, and lowercases mixed case', () => {
    expect(normalizeDomain('https://www.Acme.com/pricing?x=1')).toBe('acme.com')
  })

  it('strips protocol and lowercases an all-caps host', () => {
    expect(normalizeDomain('http://ACME.COM')).toBe('acme.com')
  })

  it('treats a bare domain and a fully-qualified URL for the same site identically', () => {
    expect(normalizeDomain('acme.com')).toBe(normalizeDomain('https://www.acme.com/'))
  })
})
