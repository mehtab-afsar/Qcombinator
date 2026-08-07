/**
 * The non-production recipient allowlist.
 *
 * Story 3's rules: *"During development, the ONLY permitted recipient is Mo's own address. No
 * email to any third party, ever, for any reason, including 'realistic testing'. Hard-code an
 * allowlist in non-production and make it impossible to bypass."*
 *
 * ⚠️ THIS IS THE LAST THING BETWEEN A BUG AND A STRANGER'S INBOX. A prepared payload comes from
 * a language model reading founder-supplied context; the approval step checks that the *message*
 * reads well, and a plausible-looking address looks correct to a human skimming it. This check
 * does not care how plausible an address looks.
 *
 * Deliberately NOT configurable by an environment variable. A variable is a thing someone sets
 * wrongly at 2am; a constant is a thing someone has to change in a diff that gets reviewed.
 */

import { log } from '@/lib/logger'

/** The only addresses that may receive mail outside production. */
const DEV_ALLOWLIST: readonly string[] = ['mo@innosphere.ventures']

/**
 * The only Slack channel that may receive a post outside production.
 *
 * ⚠️ PLACEHOLDER — replace with the real dev/test channel id before the Slack connector is used
 * against a real workspace (a Slack App must exist first; see the connector plan's prerequisite).
 * A channel id (`C0123456789`), not a channel name — names can be renamed out from under this.
 */
const DEV_SLACK_CHANNEL_ALLOWLIST: readonly string[] = ['REPLACE_WITH_TEST_CHANNEL_ID']

export class RecipientBlockedError extends Error {
  readonly blocked: string[]
  constructor(blocked: string[]) {
    super(
      `Blocked: outside production this system may only email ${DEV_ALLOWLIST.join(', ')}. ` +
      `Refused ${blocked.length} other recipient${blocked.length === 1 ? '' : 's'}.`,
    )
    this.name = 'RecipientBlockedError'
    this.blocked = blocked
  }
}

export class ChannelBlockedError extends Error {
  readonly channel: string
  constructor(channel: string) {
    super(
      `Blocked: outside production this system may only post to ${DEV_SLACK_CHANNEL_ALLOWLIST.join(', ')}. ` +
      `Refused channel '${channel}'.`,
    )
    this.name = 'ChannelBlockedError'
    this.channel = channel
  }
}

/** True only in a real production deployment. Anything ambiguous counts as non-production. */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production'
}

/**
 * Refuse the whole send if ANY recipient is off-list.
 *
 * All-or-nothing on purpose. Filtering to the allowed subset would silently send a message the
 * founder approved for five people to one of them — quieter, and wrong in a way nobody notices.
 * A hard failure is louder and safer.
 *
 * @throws RecipientBlockedError outside production when any recipient is not allowlisted.
 */
export function assertRecipientsAllowed(recipients: ReadonlyArray<{ email: string }>): void {
  if (isProduction()) return

  const allowed = new Set(DEV_ALLOWLIST.map(e => e.toLowerCase()))
  const blocked = recipients
    .map(r => r.email.trim().toLowerCase())
    .filter(email => !allowed.has(email))

  if (blocked.length === 0) return

  // Log the COUNT and the domains, not the addresses — the same rule the audit log follows.
  log.error('recipient allowlist blocked a send outside production', {
    blockedCount: blocked.length,
    domains: [...new Set(blocked.map(e => e.slice(e.lastIndexOf('@') + 1)))],
  })
  throw new RecipientBlockedError(blocked)
}

/**
 * Refuse a Slack post outside production unless it targets the designated dev/test channel.
 * Same shape and strictness as `assertRecipientsAllowed` — not configurable by an environment
 * variable, hard-coded so a change to it is a reviewed diff, not a 2am setting.
 *
 * @throws ChannelBlockedError outside production when the channel is not allowlisted.
 */
export function assertChannelAllowed(channel: string | undefined): void {
  if (isProduction()) return
  if (!channel) return // nothing to post to, nothing blocked

  const allowed = new Set(DEV_SLACK_CHANNEL_ALLOWLIST)
  if (allowed.has(channel)) return

  log.error('channel allowlist blocked a post outside production', { blockedChannel: channel })
  throw new ChannelBlockedError(channel)
}

/** Exposed for tests and for the security review pack — never for runtime branching. */
export const devAllowlist = DEV_ALLOWLIST
export const devSlackChannelAllowlist = DEV_SLACK_CHANNEL_ALLOWLIST
