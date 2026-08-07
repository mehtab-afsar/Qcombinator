/**
 * F13 — the Slack channel allowlist, mirroring connector-safety.test.ts's Gmail coverage.
 *
 * Same last-line-of-defence reasoning as the email allowlist: a prepared payload comes from a
 * language model reading founder-supplied context, and the approval step checks that the
 * *message* reads well, not that the destination is real. This check does not care how plausible
 * a channel looks.
 */

import { assertChannelAllowed, ChannelBlockedError, devSlackChannelAllowlist } from '@/lib/connectors/allowlist'

const DEV_CHANNEL = devSlackChannelAllowlist[0]

const originalNodeEnv = process.env.NODE_ENV
const originalVercelEnv = process.env.VERCEL_ENV

function setEnv(nodeEnv: string | undefined, vercelEnv: string | undefined): void {
  Object.defineProperty(process.env, 'NODE_ENV', { value: nodeEnv, configurable: true })
  if (vercelEnv === undefined) delete process.env.VERCEL_ENV
  else process.env.VERCEL_ENV = vercelEnv
}

afterEach(() => setEnv(originalNodeEnv, originalVercelEnv))

describe('the Slack channel allowlist — outside production, only the dev channel', () => {
  beforeEach(() => setEnv('development', undefined))

  it('allows the dev channel', () => {
    expect(() => assertChannelAllowed(DEV_CHANNEL)).not.toThrow()
  })

  it('BLOCKS a real workspace channel', () => {
    expect(() => assertChannelAllowed('C0REALCHANNEL')).toThrow(ChannelBlockedError)
  })

  it('an undefined channel is not a bypass — nothing to post to, nothing blocked', () => {
    expect(() => assertChannelAllowed(undefined)).not.toThrow()
  })

  it('the error names the blocked channel without leaking anything else', () => {
    try {
      assertChannelAllowed('C0REALCHANNEL')
    } catch (err) {
      expect((err as Error).message).toContain('C0REALCHANNEL')
    }
  })
})

describe('the Slack allowlist only lifts in REAL production', () => {
  it('NODE_ENV=production alone is not enough — a preview deploy is not production', () => {
    setEnv('production', 'preview')
    expect(() => assertChannelAllowed('C0REALCHANNEL')).toThrow(ChannelBlockedError)
  })

  it('a missing VERCEL_ENV is treated as NON-production (fail closed)', () => {
    setEnv('production', undefined)
    expect(() => assertChannelAllowed('C0REALCHANNEL')).toThrow(ChannelBlockedError)
  })

  it('both production → the allowlist lifts, as it must for real founders', () => {
    setEnv('production', 'production')
    expect(() => assertChannelAllowed('C0REALCHANNEL')).not.toThrow()
  })
})
