import type { ActionDef } from '../../../types'

/**
 * monitor_and_classify_responses — review what is known about replies to
 * outreach already sent (Company Context / prior cycle results) and
 * classify interest level per lead, recommending the next step.
 *
 * Internal analysis, not a live inbox read by default — `irreversible: false`, no `connector`
 * (a real read would be irreversible-shaped, and this Action isn't). If the founder has clicked
 * "Pull from Gmail" (see `founder_pulled_data` / `app/api/actions/[id]/pull-data/route.ts`),
 * the cached result reaches this Action's Company Context as "Real Data You Pulled In" — real,
 * but only ever as current as the founder's last click, never a live feed fetched on this Action's
 * own initiative.
 *
 * Genuinely new capability — nothing like it existed on P005 before this
 * restructuring. Sits after generate_personalized_outreach and before
 * follow_up_prospects/qualify_leads in P005's actions array, routing each
 * lead to whichever comes next.
 *
 * ⚠️ DELIBERATELY NO `dependsOn: 'generate_personalized_outreach'` — do not add one.
 * `generate_personalized_outreach` is `irreversible: true`; its `result` isn't set until a
 * human approves and it actually sends, which can happen a cycle or more later, so there is
 * nothing reliable to thread through same-run (see ActionDef.dependsOn's own docstring,
 * lib/registry/types.ts). This Action is also conceptually broader than "this run's own send"
 * anyway — it reviews replies to outreach that was already sent and approved, possibly cycles
 * ago. `follow_up_prospects` is where this Action's OWN result starts the next real link in the
 * chain (see follow-up-prospects.ts).
 */
export const MONITOR_AND_CLASSIFY_RESPONSES: ActionDef = {
  id: 'monitor_and_classify_responses',
  program: 'P005',
  name: 'Monitor & Classify Responses',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'monitor_and_classify_responses',
}
