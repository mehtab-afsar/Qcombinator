/**
 * The notification counterpart to the approval gate (lib/actions/generate.ts's THE GATE,
 * covered by action-gate.test.ts). Before this, an Action recorded `pending_approval` told
 * nobody — a founder found out only by opening the app. See lib/actions/notify-pending.ts.
 */

jest.mock('@/lib/notifications/create', () => ({ createNotification: jest.fn() }))
jest.mock('@/lib/email/send', () => ({ sendActionPendingEmail: jest.fn() }))

import { notifyActionPending } from '@/lib/actions/notify-pending'
import { createNotification } from '@/lib/notifications/create'
import { sendActionPendingEmail } from '@/lib/email/send'
import type { PayloadMetadata } from '@/lib/actions/payload'
import type { SupabaseClient } from '@supabase/supabase-js'

const m = (fn: unknown) => fn as jest.Mock

const withRecipients: PayloadMetadata = {
  recipientCount: 2, recipientDomains: ['acme.com', 'initech.com'], subjectLength: 20, bodyLength: 200,
}
const noRecipients: PayloadMetadata = { recipientCount: 0, recipientDomains: [], subjectLength: 0, bodyLength: 0 }

function fakeAdmin(email: string | null, fullName: string | null): SupabaseClient {
  return {
    auth: { admin: { getUserById: jest.fn().mockResolvedValue({ data: { user: email ? { email } : null } }) } },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: fullName ? { full_name: fullName } : null }),
    }),
  } as unknown as SupabaseClient
}

beforeEach(() => jest.clearAllMocks())

describe('notifyActionPending', () => {
  it('creates an in-app notification naming the real Action and a redacted recipient summary', async () => {
    await notifyActionPending(fakeAdmin('jane@startup.com', 'Jane Founder'), 'f1', 'interview_customers', withRecipients)

    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'f1',
      type: 'action_pending',
      title: expect.stringContaining('Interview Customers'),
      body: expect.stringContaining('2 recipients'),
    }))
    // Domains, never addresses — same PII rule as action_log itself.
    const body = m(createNotification).mock.calls[0][0].body as string
    expect(body).toContain('acme.com')
    expect(body).not.toContain('@')
  })

  it('omits the summary line entirely for an Action with no recipients (an internal/other kind of send)', async () => {
    await notifyActionPending(fakeAdmin('jane@startup.com', 'Jane'), 'f1', 'interview_customers', noRecipients)
    expect(m(createNotification).mock.calls[0][0].body).toBeUndefined()
  })

  it('sends the email counterpart to the founder\'s real address', async () => {
    await notifyActionPending(fakeAdmin('jane@startup.com', 'Jane Founder'), 'f1', 'interview_customers', withRecipients)
    expect(sendActionPendingEmail).toHaveBeenCalledWith(expect.objectContaining({
      email: 'jane@startup.com',
      fullName: 'Jane Founder',
      actionName: expect.stringContaining('Interview Customers'),
    }))
  })

  it('skips the email (but still creates the in-app notification) when the founder has no resolvable address', async () => {
    await notifyActionPending(fakeAdmin(null, null), 'f1', 'interview_customers', withRecipients)
    expect(createNotification).toHaveBeenCalled()
    expect(sendActionPendingEmail).not.toHaveBeenCalled()
  })

  it('a notification failure does not throw — this must never break the Rhythm cycle that triggered it', async () => {
    m(createNotification).mockRejectedValueOnce(new Error('db down'))
    await expect(
      notifyActionPending(fakeAdmin('jane@startup.com', 'Jane'), 'f1', 'interview_customers', withRecipients)
    ).resolves.toBeUndefined()
  })

  it('an email failure does not throw either', async () => {
    m(sendActionPendingEmail).mockRejectedValueOnce(new Error('resend down'))
    await expect(
      notifyActionPending(fakeAdmin('jane@startup.com', 'Jane'), 'f1', 'interview_customers', withRecipients)
    ).resolves.toBeUndefined()
  })
})
