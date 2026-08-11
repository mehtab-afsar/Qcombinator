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

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { assertRecipientsAllowed, RecipientBlockedError, devAllowlist } from '@/lib/connectors/allowlist'
import { __messageIdFor } from '@/lib/connectors/gmail/send'
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
    expect(__messageIdFor('key-abc')).toMatch(/^<[a-f0-9]{32}@edgealpha\.vc>$/)
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

  it('resolves slack', () => {
    expect(getConnector('slack').provider).toBe('slack')
  })

  it('slack requests post-only scope — it cannot read the workspace', () => {
    expect(getConnector('slack').scopes).toEqual(['chat:write'])
  })

  it('an unknown provider throws rather than silently doing nothing', () => {
    // A grant naming a provider we cannot serve must fail loudly: the alternative is an Action
    // that appears to send and quietly does not.
    expect(() => getConnector('unregistered_provider')).toThrow(ConnectorError)
  })
})

/**
 * F14 — the reservation must claim the slot WITHOUT claiming the send.
 *
 * Both halves of this were live defects, found by the first real sends and invisible to 621
 * passing tests:
 *
 *   1. The reservation was written as `executed`, so the log recorded sends that never happened —
 *      and a failed send permanently blocked its own (action, run) slot forever.
 *   2. Worse: the winner's own outcome row then collided with its own reservation. It sent the
 *      email, failed to record it, and reported a refusal. The send was real and the log denied
 *      it — the one combination an audit trail must never produce.
 *
 * These are source/schema guards rather than behavioural ones on purpose: the behaviour needs a
 * live provider, and the property worth pinning is structural — reserve as `sending`, and let the
 * outcome land beside it.
 */
describe('F14 — the idempotency reservation', () => {
  const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

  const migrations = (): string =>
    readdirSync(join(__dirname, '..', 'supabase', 'migrations'))
      .filter((f: string) => f.includes('action_log'))
      .map((f: string) => read(`supabase/migrations/${f}`))
      .join('\n')
      .split('\n')
      .filter((l: string) => !l.trim().startsWith('--')) // the fix migration quotes the bug
      .join('\n')

  it('reserves as `sending`, never as `executed`', () => {
    const src = read('lib/actions/execute.ts')
    const reservation = src.slice(src.indexOf('reserved = await recordAttempt'), src.indexOf('const connector'))
    expect(reservation).toContain("status: 'sending'")
    expect(reservation).not.toContain("status: 'executed'")
  })

  it('guards the reservation only — an outcome row must be free to land beside it', () => {
    const index = migrations()
      .split(/;\s*/)
      .filter(s => s.includes('action_log_one_execution') && s.includes('create'))
      .pop() as string

    expect(index).toContain('unique index')
    expect(index).toContain("status = 'sending'")
    // The collision that sent an email and then denied it.
    expect(index).not.toContain("'executed'")
  })

  it('still holds the slot for a retry — the reservation row is never removed', () => {
    // Append-only is what makes a 'sending' row a permanent claim rather than a lease. If the
    // table ever gained a DELETE path for it, a second click could win the slot twice.
    const sql = migrations()
    expect(sql).toMatch(/delete/i)      // the trigger that forbids it
    expect(sql).not.toMatch(/delete\s+from\s+action_log/i)
  })
})
