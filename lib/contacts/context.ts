/**
 * A founder's own real prospect list, rendered as Company Context text — the recipient source
 * the AI SDR send (`generate_personalized_outreach`) has never had. `find_decision_makers`
 * deliberately only ever names roles, never a real person; this table is the honest, founder-
 * provided alternative.
 *
 * Mirrors `lib/comparables/retrieve.ts`'s `getComparableCohortContext` shape exactly — a fetch
 * failure must never break a cycle, so the caller always wraps this in `.catch(() => null)`.
 *
 * NOT called from `buildContext()`. Populated narrowly, only for Gmail-send Actions, by
 * `lib/rhythm/run.ts`'s `founderContactsContextFor` — see that function's own comment for why.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

interface ContactRow {
  name: string
  email: string
  company: string | null
  title: string | null
}

export async function getFounderContactsContext(
  admin: SupabaseClient,
  founderId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from('founder_contacts')
    .select('name, email, company, title')
    .eq('founder_id', founderId)
    .order('created_at', { ascending: true })

  if (error || !data || data.length === 0) return null

  const lines = (data as ContactRow[]).map(c => {
    const extra = [c.title, c.company].filter(Boolean).join(' at ')
    return extra ? `${c.name} <${c.email}> — ${extra}` : `${c.name} <${c.email}>`
  })

  return [
    'People this founder has said are legitimate to reach out to. Only address someone from',
    'this list — never invent a name or an email address.',
    '',
    ...lines,
  ].join('\n')
}
