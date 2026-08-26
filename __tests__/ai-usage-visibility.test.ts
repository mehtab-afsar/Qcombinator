/**
 * The founder-facing AI usage panel — reachable, and honest when it has nothing to say.
 *
 * It existed and worked, but a founder went looking for it and found nothing: the only route to
 * it was a dropdown item labelled "Subscription", and on arrival the component returned null
 * whenever the call count was zero and swallowed fetch failures silently. Three different
 * situations — feature off, nothing run yet, request failed — all rendered as an empty page,
 * which is indistinguishable from "this doesn't exist".
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')
const component = () => read('features/founder/components/AiUsageSummary.tsx')

describe('it can be found', () => {
  it('the nav entry says AI usage, not only the plan name', () => {
    const src = read('features/founder/components/FounderSidebar.tsx')
    const link = src.slice(src.indexOf('/founder/billing'), src.indexOf('/founder/billing') + 160)
    expect(link).toMatch(/AI usage/i)
  })

  it('the billing page is still the one place that renders it', () => {
    const page = read('app/founder/billing/page.tsx')
    expect(page).toContain('AiUsageSummary')
  })
})

describe('every state says something', () => {
  it('no longer returns null merely because nothing has run yet', () => {
    const src = component()
    expect(src).not.toContain('if (!loaded || !usage || usage.totalCalls === 0) return null')
    expect(src).toMatch(/Nothing yet/)
  })

  it('a failed request is reported rather than swallowed', () => {
    expect(component()).toMatch(/couldn&rsquo;t load your AI usage/)
  })

  it('still renders nothing when the model is switched off for the deployment', () => {
    // A 404 means the feature genuinely is not there — an empty state would be a lie, not honesty.
    const src = component()
    expect(src).toContain('res.status === 404')
    expect(src).toContain('if (!loaded || unavailable) return null')
  })

  it('all three states share one frame, so an empty panel still looks deliberate', () => {
    const src = component()
    expect((src.match(/<Frame>/g) ?? []).length).toBeGreaterThanOrEqual(3)
  })
})
