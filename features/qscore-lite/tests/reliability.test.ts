import { reliabilityForUrl, domainOf, GITHUB_API_SOURCE } from '../scoring/reliability'

const DOMAIN = 'acme.com'

describe('reliabilityForUrl — one assertion per tier', () => {
  it('direct/verified: official registries and patent databases score 1.00', () => {
    expect(reliabilityForUrl('https://patents.google.com/patent/x', DOMAIN)).toBe(1.00)
    expect(reliabilityForUrl('https://www.uspto.gov/x', DOMAIN)).toBe(1.00)
  })

  it("GitHub's own API match (not a search snippet) scores 1.00", () => {
    expect(reliabilityForUrl(GITHUB_API_SOURCE, DOMAIN)).toBe(1.00)
  })

  it('reputable database/media scores 0.75', () => {
    expect(reliabilityForUrl('https://www.crunchbase.com/organization/acme', DOMAIN)).toBe(0.75)
    expect(reliabilityForUrl('https://techcrunch.com/2024/acme-raises', DOMAIN)).toBe(0.75)
  })

  it("the submitted company's own domain scores 0.50 (company-owned claim)", () => {
    expect(reliabilityForUrl('https://acme.com/about', DOMAIN)).toBe(0.50)
    expect(reliabilityForUrl('https://acme.com/careers', DOMAIN)).toBe(0.50)
  })

  it('a LinkedIn company page scores 0.50', () => {
    expect(reliabilityForUrl('https://www.linkedin.com/company/acme', DOMAIN)).toBe(0.50)
  })

  it('a LinkedIn personal profile scores 0.25 (thin search-index text)', () => {
    expect(reliabilityForUrl('https://www.linkedin.com/in/janedoe', DOMAIN)).toBe(0.25)
  })

  it('an unrecognized domain falls through to the default 0.25', () => {
    expect(reliabilityForUrl('https://some-random-blog.example.com/post', DOMAIN)).toBe(0.25)
  })

  it('a malformed URL falls through to the default 0.25 rather than throwing', () => {
    expect(reliabilityForUrl('not a url', DOMAIN)).toBe(0.25)
  })
})

describe('domainOf — corroboration identity', () => {
  it('two URLs on the same host normalize to the same domain', () => {
    expect(domainOf('https://crunchbase.com/x')).toBe(domainOf('https://crunchbase.com/y'))
  })

  it('www. and bare host normalize to the same domain', () => {
    expect(domainOf('https://www.acme.com/a')).toBe(domainOf('https://acme.com/b'))
  })

  it('the GitHub API pseudo-source stays distinct from any real domain', () => {
    expect(domainOf(GITHUB_API_SOURCE)).toBe(GITHUB_API_SOURCE)
    expect(domainOf(GITHUB_API_SOURCE)).not.toBe(domainOf('https://github.com/acme'))
  })
})
