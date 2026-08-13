/**
 * The connection-request "opening note" was always shown attributed to "the other party" in
 * ThreadPanel, once a connection was live. That's only correct for the recipient's view — the
 * sender viewing their own accepted connection saw their own words credited to the person they
 * sent them to. Separately, investor-initiated outreach also inserted the same text as a real
 * `messages` row ("so both parties see it in the thread"), which — combined with the note bubble
 * ThreadPanel already renders unconditionally — showed the identical text twice.
 *
 * Fixed by recording who actually wrote personal_message (connection_requests.requested_by,
 * migration 20260813000002) and having both messages APIs + ThreadPanel use it instead of
 * assuming, and by no longer double-writing the note into messages on the outreach path.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

describe('connection_requests.requested_by — migration + both creation paths set it', () => {
  it('the migration adds a nullable, additive column (old rows keep working)', () => {
    const migration = read('supabase/migrations/20260813000002_connection_requests_requested_by.sql')
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES auth.users(id)')
  })

  it('founder-initiated requests (app/api/connections) record the founder as the writer', () => {
    const src = read('app/api/connections/route.ts')
    const insertIdx = src.indexOf('const insertRow')
    const block = src.slice(insertIdx, insertIdx + 300)
    expect(block).toContain('founder_id: user.id')
    expect(block).toContain('requested_by: user.id')
  })

  it('investor outreach records the investor as the writer', () => {
    const src = read('app/api/investor/outreach/route.ts')
    const insertIdx = src.indexOf(".from('connection_requests')\n      .insert({")
    const block = src.slice(insertIdx, insertIdx + 300)
    expect(block).toContain('investor_id:      user.id')
    expect(block).toContain('requested_by:     user.id')
  })

  it('outreach no longer also inserts the note as a real message — that was the literal duplicate bubble', () => {
    const src = read('app/api/investor/outreach/route.ts')
    expect(src).not.toMatch(/admin\.from\('messages'\)\.insert/)
  })
})

describe('both messages APIs tell the caller whether they wrote the note themselves', () => {
  it('GET /api/founder/messages computes personalMessageFromMe, falling back to the old assumption for pre-migration rows', () => {
    const src = read('app/api/founder/messages/route.ts')
    expect(src).toContain('function personalMessageFromMe(')
    // Old behaviour, preserved as the fallback for rows with no requested_by: pending was always
    // the founder's own outgoing request (outreach never leaves a connection pending).
    expect(src).toContain("return c.status === 'pending'")
    expect(src).toContain('personalMessageFromMe: personalMessageFromMe(c, user.id)')
  })

  it('GET /api/investor/messages computes it too, falling back to "not mine" for pre-migration rows', () => {
    const src = read('app/api/investor/messages/route.ts')
    const fieldIdx = src.indexOf('personalMessageFromMe:')
    expect(fieldIdx).toBeGreaterThan(-1)
    const block = src.slice(fieldIdx, fieldIdx + 200)
    expect(block).toContain('=== user.id')
    expect(block).toContain(': false')
  })
})

describe('ThreadPanel attributes the note to whoever actually wrote it, not "the other party"', () => {
  const src = read('features/messaging/components/ThreadPanel.tsx')

  it('takes personalMessageFromMe as a required prop', () => {
    expect(src).toContain('personalMessageFromMe: boolean;')
  })

  it('has one shared bubble renderer used by both the pending and connected states — not two hardcoded copies', () => {
    const occurrences = src.match(/<PersonalMessageBubble/g) ?? []
    expect(occurrences.length).toBe(2)
  })

  it('the bubble renderer branches on fromMe, not on which state (pending vs connected) it is', () => {
    const fnIdx = src.indexOf('function PersonalMessageBubble')
    const fnBody = src.slice(fnIdx, src.indexOf('export function ThreadPanel'))
    expect(fnBody).toContain('if (fromMe)')
    expect(fnBody).toContain('Your message')
    expect(fnBody).toContain('Connection note')
  })
})
