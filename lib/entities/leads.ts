/**
 * Leads — the first real-world entity an Action can WRITE.
 *
 * ⚠️ THE SPINE, SLICE 1 (docs/AGI_ACTIONS_PRD.md). Before this module, every Action's structured
 * output was discarded: `lib/actions/generate.ts` parsed the model's fenced JSON, kept
 * `payload.body` as prose, and threw the structure away. Chained Actions passed paragraphs
 * between prompts rather than records, which is why P005's AI SDR could research "CEO of Acme"
 * and have it dead-end inside a document.
 *
 * ⚠️ THIS IS NOT A RECIPIENT SOURCE, and must never become one implicitly. `founder_contacts`
 * is the only thing that feeds Company Context for a Gmail-send Action (lib/contacts/context.ts,
 * gated in lib/rhythm/run.ts's founderContactsContextFor), and generate.ts's
 * assertRecipientsInContext refuses any payload whose recipient isn't literally in that context.
 * A lead is an AI-researched hypothesis; a contact is someone the founder vouched for. The
 * promotion from one to the other is a deliberate, later, founder-facing step. See the
 * founder_leads migration header for the full reasoning.
 */

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'

/**
 * The shape a model must emit to produce leads. Deliberately separate from
 * `founderLeadPostSchema` (lib/api/validate.ts) — that one validates a human typing into a form.
 * Sharing a validator between a person and a language model means loosening it for one silently
 * loosens it for the other.
 *
 * `company` is the only required field: `find_decision_makers` deliberately never names a real
 * person (see its own registry header), so a researched lead legitimately has a role and no name.
 */
export const modelLeadSchema = z.object({
  company:   z.string().trim().min(1).max(200),
  title:     z.string().trim().max(200).optional(),
  score:     z.number().int().min(0).max(100).optional(),
  rationale: z.string().trim().max(1_000).optional(),
})

export const modelLeadsPayloadSchema = z.object({
  leads: z.array(modelLeadSchema).max(100),
})

export type ModelLead = z.infer<typeof modelLeadSchema>

/**
 * The idempotency key for a lead, computed here rather than as a Postgres expression index so
 * supabase-js's `.upsert({ onConflict })` can name a plain column (it cannot target an
 * expression). This is what stops a weekly cycle from duplicating every lead it already found.
 *
 * Pure — unit-tested directly.
 */
export function dedupeKey(company: string, title?: string | null): string {
  return `${company.trim().toLowerCase()}|${(title ?? '').trim().toLowerCase()}`
}

/**
 * Pull leads out of whatever the model returned. Returns `null` — never throws — when the payload
 * simply isn't a leads payload, which is the ordinary case for the ~60 Actions that don't declare
 * `produces`. A malformed leads block from an Action that DID declare it is a real problem, so
 * that logs a warning and yields an empty array rather than passing silently.
 */
export function parseModelLeads(payload: unknown): ModelLead[] | null {
  if (!payload || typeof payload !== 'object' || !('leads' in payload)) return null
  const parsed = modelLeadsPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    log.warn('lead payload failed validation', { issue: parsed.error.issues[0]?.message })
    return []
  }
  return parsed.data.leads
}

/** How many leads reach a prompt. Leads are unbounded — a founder with 400 must not blow out
 *  every prompt in the Program — and the rendered text says when it truncated, so the model
 *  knows it is seeing a top slice rather than the whole pipeline. */
const CONTEXT_LIMIT = 40

/**
 * The founder's current pipeline, as Company Context — the leads table read BACK, which until
 * now it never was. Slice 1 wrote rows; every downstream step still reasoned from the prior
 * step's prose summary, so it could not see a lead's real status, score, or whether enrichment
 * had since found a person there.
 *
 * ⚠️ NEVER RENDERS AN EMAIL ADDRESS, deliberately — only whether one is on file. The single
 * Action that legitimately needs real addresses (`generate_personalized_outreach`) gets them from
 * `founder_contacts`, the founder-vouched path (`lib/contacts/context.ts`). "This lead has an
 * email on file" is all pipeline reasoning needs; spreading addresses through every prompt in the
 * Program is not, and every prompt is a place PII could come to rest.
 *
 * Gated to Actions of lead-producing Programs by `leadsContextFor` (lib/rhythm/run.ts) — never
 * Assets or Briefings, whose output persists as documents. Same carve-out, same reason, as
 * `founderContactsContextFor`.
 *
 * Returns null — never throws — on any failure; the caller wraps in `.catch(() => null)` anyway.
 */
export async function getLeadsContext(
  admin: SupabaseClient,
  founderId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from('founder_leads')
    .select('company, title, contact_name, email_status, score, status')
    .eq('founder_id', founderId)
    .order('score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(CONTEXT_LIMIT + 1)

  if (error || !data || data.length === 0) return null

  const rows = data as Array<{
    company: string
    title: string | null
    contact_name: string | null
    email_status: string
    score: number | null
    status: string
  }>

  const truncated = rows.length > CONTEXT_LIMIT
  const shown = rows.slice(0, CONTEXT_LIMIT)

  const lines = shown.map(r => {
    const who = [r.contact_name, r.title].filter(Boolean).join(', ')
    return [
      `- ${r.company}`,
      who ? ` — ${who}` : '',
      ` · ${r.status}`,
      r.score != null ? ` · fit ${r.score}` : '',
      // Whether, never what.
      r.email_status === 'verified' ? ' · verified email on file' : ' · no email yet',
    ].join('')
  })

  return [
    'This founder\'s current lead pipeline. Reason from these real records rather than from any',
    'earlier summary — this is the live state, including any status the founder has changed by',
    'hand. Email addresses are deliberately not listed here; outreach draws recipients from the',
    'founder\'s own contact list, not from this pipeline.',
    truncated ? `Showing the top ${CONTEXT_LIMIT} by fit score; there are more.` : '',
    '',
    ...lines,
  ].filter(Boolean).join('\n')
}

export interface LeadProvenance {
  programId?: string | null
  executionId?: string | null
}

/**
 * Write researched leads, idempotently.
 *
 * Existing rows are left alone rather than overwritten: a founder may have edited a lead's status
 * or notes since the last cycle, and a weekly re-run must never silently undo that. Enrichment
 * (filling in a real name/email) is a separate, later write path with its own semantics.
 *
 * @returns how many rows were actually inserted — surfaced into the Action's own result so
 *          "0 leads" is visible to the founder rather than silent (this codebase's documented
 *          "door problem" in miniature).
 * @throws never. A write failure is logged and reported as 0 — the Action's analysis genuinely
 *         succeeded, and failing it here would fail the whole Program stage in lib/rhythm/run.ts.
 */
export async function upsertLeads(
  admin: SupabaseClient,
  founderId: string,
  leads: readonly ModelLead[],
  provenance: LeadProvenance = {},
): Promise<number> {
  if (leads.length === 0) return 0

  const rows = leads.map(lead => ({
    founder_id: founderId,
    company: lead.company.trim(),
    title: lead.title?.trim() || null,
    score: lead.score ?? null,
    rationale: lead.rationale?.trim() || null,
    source: 'ai_research',
    status: 'researched',
    program_id: provenance.programId ?? null,
    execution_id: provenance.executionId ?? null,
    dedupe_key: dedupeKey(lead.company, lead.title),
  }))

  try {
    const { data, error } = await admin
      .from('founder_leads')
      .upsert(rows, { onConflict: 'founder_id,dedupe_key', ignoreDuplicates: true })
      .select('id')

    if (error) {
      log.warn('lead write failed', { founderId, err: error.message })
      return 0
    }
    return data?.length ?? 0
  } catch (err) {
    log.warn('lead write threw', { founderId, err: (err as Error)?.message })
    return 0
  }
}
