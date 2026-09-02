/**
 * The narrow Company Context injectors — the things ONE Action gets that an Asset or a Briefing
 * never does.
 *
 * Split out of run.ts, which had grown past CLAUDE.md's file ceiling, and because
 * lib/actions/direct.ts needs these without dragging the whole engine in with them.
 *
 * ⚠️ WHAT UNITES THESE, and why they are not in `buildContext`: each is deliberately narrow.
 * baseContext is shared by every Asset, Briefing and Action in a cycle, and real personal data
 * reaching an Asset would be a second, silent copy of it inside a persisted document — with no
 * link back to the row that says it needs deleting when the founder deletes the contact, the
 * lead, or the reply. So each of these is spread at the Action call site only, and each gates
 * itself on something derived from the Registry rather than a hardcoded list of ids.
 *
 * ⚠️ EVERY ONE OF THESE IS A DATABASE READ. None calls a Connector. A Rhythm step making a live
 * external call is ADR-026's decided territory; these read caches that a founder's own action
 * filled. __tests__/outreach-replies-adr-guard.test.ts pins that for the newest of them.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getProgram, getAction } from '@/lib/registry'
import { latestPerAction } from '@/lib/actions/log'
import { getFounderContactsContext } from '@/lib/contacts/context'
import { getLeadsContext } from '@/lib/entities/leads'
import { getPulledDataContext, PULL_SOURCES } from '@/lib/actions/pulled-data'
import { getOutreachRepliesContext } from '@/lib/signals/context'
import type { CompanyContext } from '@/lib/prompts/types'

/**
 * AI SDR Milestone 1 — real chaining. When `actionId` declares `ActionDef.dependsOn`, look up
 * that Action's own result within THIS execution and return it as a `CompanyContext` addition;
 * otherwise return an empty object, so a spread at the call site is a no-op for every Action
 * that doesn't chain (i.e. everything except the handful of AI SDR steps that opt in).
 *
 * Only ever reads a result that's actually there. A dependency still `pending_approval` (an
 * irreversible Action, not yet approved) has no `result` yet — silently omitted rather than
 * blocking or erroring, since Milestone 1 is scoped to fully-autonomous chains; Milestone 2
 * covers the approval-pause case.
 *
 * Exported so this reads-from-`result` rule is unit-tested directly, matching resultSummary
 * (app/api/actions/route.ts) rather than only reachable through the full runNextStep path.
 */
export async function dependencyContextFor(
  admin: SupabaseClient,
  founderId: string,
  executionId: string,
  actionId: string,
): Promise<Pick<CompanyContext, 'dependencyResult'>> {
  const dependsOn = getAction(actionId).dependsOn
  if (!dependsOn) return {}

  const entries = await latestPerAction(admin, founderId, executionId)
  const entry = entries.find(e => e.actionId === dependsOn)
  const text = entry?.result?.summary
  if (typeof text !== 'string' || !text.trim()) return {}

  return { dependencyResult: { actionId: dependsOn, label: getAction(dependsOn).name, text } }
}

/**
 * A founder's own real contact list, but ONLY for the Actions that actually send email —
 * `getAction(actionId).connector === 'gmail'` (today: `interview_customers`, P001, and
 * `generate_personalized_outreach`, P005; nothing else). Empty object for every Asset, every
 * Briefing, and every other Action — deliberately NOT part of `baseContext`, which is reused
 * unchanged across all of those. Real PII belongs only where it's actually needed; a founder's
 * contact reaching a persisted Asset document (with no link back to the source row to know it
 * needs cleanup if the contact is later deleted) would be a second, silent copy of their data.
 *
 * Slack (`post_team_update`) is intentionally excluded even though it's also `irreversible` +
 * `connector` — a team update has no reason to reference the founder's prospect list at all.
 */
export async function founderContactsContextFor(
  admin: SupabaseClient,
  founderId: string,
  actionId: string,
): Promise<Pick<CompanyContext, 'founderContacts'>> {
  if (getAction(actionId).connector !== 'gmail') return {}

  const text = await getFounderContactsContext(admin, founderId).catch(() => null)
  return text ? { founderContacts: text } : {}
}

/**
 * The founder's live lead pipeline, for the Actions of a Program that actually produces leads.
 *
 * ⚠️ THE GATE IS REGISTRY-DERIVED AND SELF-MAINTAINING: "if this Program declares a lead-producing
 * Action, its Actions may read leads." No hardcoded id list to fall out of date — a future Program
 * that declares `produces: 'lead'` inherits this automatically, and one that stops producing leads
 * loses it automatically.
 *
 * Same narrow shape and same carve-out as `founderContactsContextFor` above — Actions only, never
 * an Asset or a Briefing, because those persist as documents and would become a second silent copy
 * of personal data with no link back to the row. `getLeadsContext` additionally renders no email
 * addresses at all (see its own docstring).
 *
 * This is what lets a chained Action reason from the live table rather than the previous step's
 * already-stale prose summary — `dependencyContextFor` above remains, for genuinely narrative
 * handoffs.
 */
export async function leadsContextFor(
  admin: SupabaseClient,
  founderId: string,
  actionId: string,
): Promise<Pick<CompanyContext, 'pipelineLeads'>> {
  const program = getProgram(getAction(actionId).program)
  if (!program.actions.some(id => getAction(id).produces === 'lead')) return {}

  const text = await getLeadsContext(admin, founderId).catch(() => null)
  return text ? { pipelineLeads: text } : {}
}

/**
 * A founder-triggered pull of real Connector data (Gmail-read, PostHog) — see the
 * `founder_pulled_data` migration's own comment for why this is a cache read here rather than a
 * live Connector call. No allowlist needed: the cache is already scoped to one row per
 * (founder, action), so an Action nobody has ever pulled data for just gets `{}`, same as every
 * narrow injector above when its gate doesn't apply.
 *
 * ⚠️ This is the ONLY thing standing between "founder clicked pull" and "the model saw it" — it
 * must stay a passive DB read. Calling a Connector from inside this function would put a live
 * external call inside a Rhythm cycle step, which ADR-026 forbids.
 */
export async function pulledDataContextFor(
  admin: SupabaseClient,
  founderId: string,
  actionId: string,
): Promise<Pick<CompanyContext, 'pulledData'>> {
  const text = await getPulledDataContext(admin, founderId, actionId).catch(() => null)
  return text ? { pulledData: text } : {}
}

/**
 * Replies to outreach this founder's team actually sent — for the Actions of a Program that sends
 * outreach at all.
 *
 * ⚠️ A PASSIVE READ of the cache lib/signals/outreach-replies.ts filled from a founder-initiated
 * request. Nothing here calls Gmail: a Rhythm step making a live external call is ADR-026's
 * decided territory, and lib/signals/context.ts is asserted to contain no fetch.
 *
 * ⚠️ THE GATE IS REGISTRY-DERIVED AND SELF-MAINTAINING, exactly like leadsContextFor's: "if this
 * Program has an Action that sends email, its Actions may see the replies." No hardcoded id list
 * to fall out of date — a future Program that gains a gmail Action inherits this automatically,
 * and one that loses it loses this too.
 *
 * Same carve-out as its neighbours: Actions only, never an Asset or a Briefing, because those
 * persist as documents.
 */
export async function outreachRepliesContextFor(
  admin: SupabaseClient,
  founderId: string,
  actionId: string,
): Promise<Pick<CompanyContext, 'outreachReplies'>> {
  const program = getProgram(getAction(actionId).program)
  if (!program.actions.some(id => getAction(id).connector === 'gmail')) return {}

  const text = await getOutreachRepliesContext(admin, founderId).catch(() => null)
  return text ? { outreachReplies: text } : {}
}
