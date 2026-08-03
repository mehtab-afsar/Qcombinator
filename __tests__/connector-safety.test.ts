/**
 * F13 — the two properties that stop a bug reaching a stranger.
 *
 * 1. The recipient allowlist: outside production, only Mo's address may receive mail.
 * 2. Message-ID determinism: the ONLY thing that makes an ambiguous timeout recoverable.
 *
 * These are tested harder than anything else in the Connector layer because they are the last
 * line. A prepared payload comes from a language model reading founder-supplied context, and the
 * approval step checks that the *message* reads well — a plausible address looks correct to a
 * human skimming it. These checks do not care how plausible an address looks.
 */

import { assertRecipientsAllowed, RecipientBlockedError, devAllowlist } from '@/lib/connectors/allowlist'
import { __messageIdFor } from '@/lib/connectors/gmail'
import { getConnector } from '@/lib/connectors/registry'
import { ConnectorError } from '@/lib/connectors/types'

const MO = devAllowlist[0]
const to = (...emails: string[]) => emails.map(email => ({ email }))

const originalNodeEnv = process.env.NODE_ENV
const originalVercelEnv = process.env.VERCEL_ENV

function setEnv(nodeEnv: string | undefined, vercelEnv: string | undefined): void {
  Object.defineProperty(process.env, 'NODE_ENV', { value: nodeEnv, configurable: true })
  if (vercelEnv === undefined) delete process.env.VERCEL_ENV
  else process.env.VERCEL_ENV = vercelEnv
}

afterEach(() => setEnv(originalNodeEnv, originalVercelEnv))

describe('the recipient allowlist — outside production, only Mo', () => {
  beforeEach(() => setEnv('development', undefined))

  it('allows Mo', () => {
    expect(() => assertRecipientsAllowed(to(MO))).not.toThrow()
  })

  it('BLOCKS a real third party', () => {
    expect(() => assertRecipientsAllowed(to('jane@acme.com'))).toThrow(RecipientBlockedError)
  })

  it('blocks the WHOLE send if even one recipient is off-list', () => {
    // All-or-nothing on purpose. Filtering to the allowed subset would silently send a message
    // the founder approved for several people to one of them — quieter, and wrong in a way
    // nobody notices.
    expect(() => assertRecipientsAllowed(to(MO, 'jane@acme.com'))).toThrow(RecipientBlockedError)
  })

  it('is case- and whitespace-insensitive — a near-miss is still a match', () => {
    expect(() => assertRecipientsAllowed(to(`  ${MO.toUpperCase()} `))).not.toThrow()
  })

  it('blocks addresses that merely LOOK like the allowlisted one', () => {
    // The failure mode this catches: a model producing a plausible variant, which a human
    // skimming an approval screen would not notice.
    for (const lookalike of [
      'mo@innosphere.venture',        // singular
      'mo@innosphere-ventures.com',   // hyphen
      'mo@innosphere.ventures.co',    // suffix
      'm0@innosphere.ventures',       // zero
      'mo+test@innosphere.ventures',  // plus-addressing is a DIFFERENT address
    ]) {
      expect(() => assertRecipientsAllowed(to(lookalike))).toThrow(RecipientBlockedError)
    }
  })

  it('an empty recipient list is not a bypass', () => {
    expect(() => assertRecipientsAllowed([])).not.toThrow() // nothing to send to, nothing blocked
  })

  it('the error never leaks the blocked addresses into its message', () => {
    // The audit log holds no addresses; an error message must not become the back door.
    try {
      assertRecipientsAllowed(to('secret.person@bigco.com'))
    } catch (err) {
      expect((err as Error).message).not.toContain('secret.person@bigco.com')
    }
  })
})

describe('the allowlist only lifts in REAL production', () => {
  it('NODE_ENV=production alone is not enough — a preview deploy is not production', () => {
    // Vercel preview builds run with NODE_ENV=production. Treating that as production would put
    // every preview branch one bug away from emailing strangers.
    setEnv('production', 'preview')
    expect(() => assertRecipientsAllowed(to('jane@acme.com'))).toThrow(RecipientBlockedError)
  })

  it('a missing VERCEL_ENV is treated as NON-production (fail closed)', () => {
    setEnv('production', undefined)
    expect(() => assertRecipientsAllowed(to('jane@acme.com'))).toThrow(RecipientBlockedError)
  })

  it('both production → the allowlist lifts, as it must for real founders', () => {
    setEnv('production', 'production')
    expect(() => assertRecipientsAllowed(to('jane@acme.com'))).not.toThrow()
  })
})

describe('Message-ID determinism — what makes an ambiguous timeout recoverable', () => {
  it('the SAME idempotency key always yields the SAME id', () => {
    // Non-negotiable: this id is how a send is recognised at the provider after a timeout. A
    // random id would be unfindable exactly when it matters.
    expect(__messageIdFor('key-abc')).toBe(__messageIdFor('key-abc'))
  })

  it('different keys yield different ids', () => {
    expect(__messageIdFor('key-abc')).not.toBe(__messageIdFor('key-xyz'))
  })

  it('is a well-formed RFC-5322 Message-ID', () => {
    expect(__messageIdFor('key-abc')).toMatch(/^<[a-f0-9]{32}@edgealpha\.ai>$/)
  })
})

describe('the connector registry — one map, no switch statements', () => {
  it('resolves gmail', () => {
    expect(getConnector('gmail').provider).toBe('gmail')
  })

  it('gmail requests send-only scope — it cannot read the mailbox', () => {
    const scopes = getConnector('gmail').scopes
    expect(scopes).toEqual(['https://www.googleapis.com/auth/gmail.send'])
    expect(scopes.some(s => s.includes('readonly') || s === 'https://mail.google.com/')).toBe(false)
  })

  it('an unknown provider throws rather than silently doing nothing', () => {
    // A grant naming a provider we cannot serve must fail loudly: the alternative is an Action
    // that appears to send and quietly does not.
    expect(() => getConnector('slack')).toThrow(ConnectorError)
  })
})
