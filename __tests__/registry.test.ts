/**
 * F05 — the Registry.
 *
 * Covers F05's acceptance criteria and its stated edge case, plus guards on the
 * decisions that are easy to undo by accident later.
 */

import {
  getAction,
  getAsset,
  getExecutive,
  getProgram,
  listExecutives,
  listPrograms,
  listProgramsForAction,
  listProgramsForAsset,
  listProgramsForExecutive,
  validateRegistry,
  ActionNotFoundError,
  AssetNotFoundError,
  ExecutiveNotFoundError,
  ProgramNotFoundError,
  type ActionDef,
  type AssetDef,
  type Executive,
  type ProgramTemplate,
} from '@/lib/registry'
import { getInstructionPrompt } from '@/lib/prompts/registry'

// ─── Resolution (F05 UC-05.6) ─────────────────────────────────────────────────

describe('every reference resolves', () => {
  it('resolves every asset and action of every program', () => {
    for (const program of listPrograms()) {
      for (const assetId of program.assets) {
        expect(getAsset(assetId).id).toBe(assetId)
      }
      for (const actionId of program.actions) {
        expect(getAction(actionId).id).toBe(actionId)
      }
      expect(getExecutive(program.owner).id).toBe(program.owner)
    }
  })

  it('resolves every program of every executive', () => {
    for (const executive of listExecutives()) {
      for (const programId of executive.programs) {
        expect(getProgram(programId).id).toBe(programId)
      }
    }
  })

  it('the seeded registry is internally coherent', () => {
    expect(validateRegistry()).toEqual([])
  })
})

// ─── Unknown ids throw (F05 US-05.2) ──────────────────────────────────────────

describe('unknown ids throw a typed error, never silent undefined', () => {
  it.each([
    ['getExecutive', () => getExecutive('nope'), ExecutiveNotFoundError, 'Unknown executive: nope'],
    ['getProgram', () => getProgram('P999'), ProgramNotFoundError, 'Unknown program: P999'],
    ['getAsset', () => getAsset('AS999'), AssetNotFoundError, 'Unknown asset: AS999'],
    ['getAction', () => getAction('nope'), ActionNotFoundError, 'Unknown action: nope'],
  ])('%s throws', (_name, call, ErrorType, message) => {
    expect(call).toThrow(ErrorType as unknown as jest.Constructable)
    expect(call).toThrow(message as string)
  })
})

// ─── Load-time validation (F05 edge case) ─────────────────────────────────────
//
// "A Program referencing a missing Asset → fail at load with a clear message,
// not at runtime."

describe('a broken registry fails at load with a clear message', () => {
  const executive = (over: Partial<Executive> = {}): Executive => ({
    id: 'growth', name: 'G', motto: '', domains: [], programs: ['P001'],
    systemPromptRef: 'S003', inheritsFrom: [], ...over,
  })
  const program = (over: Partial<ProgramTemplate> = {}): ProgramTemplate => ({
    id: 'P001', handle: 'GTM', name: 'GTM', owner: 'growth', objective: '', successMetric: '',
    assets: ['AS001'], actions: ['validate_icps'], programPromptRef: 'P001', ...over,
  })
  const asset = (over: Partial<AssetDef> = {}): AssetDef => ({
    id: 'AS001', name: 'ICP', program: 'P001', outputSchema: 'markdown',
    instructionsRef: 'AS001', ...over,
  })
  const action = (over: Partial<ActionDef> = {}): ActionDef => ({
    id: 'validate_icps', program: 'P001', name: 'Validate ICPs', kind: 'oneoff', irreversible: false,
    instructionsRef: 'validate_icps', ...over,
  })

  it('names both ids when a program references a missing asset', () => {
    const problems = validateRegistry(
      [executive()],
      [program({ assets: ['AS001', 'AS404'] })],
      [asset()],
      [action()],
    )
    expect(problems).toContain("Program 'P001' references unknown asset 'AS404'")
  })

  it('catches a missing action', () => {
    const problems = validateRegistry(
      [executive()], [program({ actions: ['ghost_action'] })], [asset()], [action()],
    )
    expect(problems).toContain("Program 'P001' references unknown action 'ghost_action'")
  })

  it('catches an executive pointing at an unseeded program', () => {
    // The exact trap that keeps growth.programs honest: PRD §7.1 says Growth owns
    // P001–P008, but only P001 is seeded. Listing the rest must fail loudly.
    const problems = validateRegistry(
      [executive({ programs: ['P001', 'P002'] })], [program()], [asset()], [action()],
    )
    expect(problems).toContain("Executive 'growth' references unknown program 'P002'")
  })

  it('catches an unknown owner', () => {
    const problems = validateRegistry(
      [executive()], [program({ owner: 'nobody' as Executive['id'] })], [asset()], [action()],
    )
    expect(problems).toContain("Program 'P001' has unknown owner 'nobody'")
  })

  it('catches a one-way asset/program link', () => {
    const problems = validateRegistry(
      [executive()], [program({ assets: [] })], [asset()], [action()],
    )
    expect(problems).toContain(
      "Asset 'AS001' claims owner 'P001', but that program does not list it",
    )
  })

  it('catches duplicate ids', () => {
    const problems = validateRegistry(
      [executive()], [program(), program()], [asset()], [action()],
    )
    expect(problems).toContain('Duplicate program id: P001')
  })

  it('reports every problem at once, not just the first', () => {
    const problems = validateRegistry(
      [executive()],
      [program({ assets: ['AS404'], actions: ['ghost'] })],
      [asset()],
      [action()],
    )
    expect(problems.length).toBeGreaterThan(1)
  })

  it('refuses a connector on a reversible action (ADR-004)', () => {
    // A connector reaches outside the product, so it cannot be undone. This
    // combination would send with no approval at the Connector boundary.
    const problems = validateRegistry(
      [executive()],
      [program()],
      [asset()],
      [action({ connector: 'gmail', irreversible: false })],
    )
    expect(problems[0]).toMatch(/must require just-in-time approval/)
  })

  // ── AI SDR Milestone 1 — dependsOn ───────────────────────────────────────────

  it('catches a dependsOn pointing at an unknown action', () => {
    const problems = validateRegistry(
      [executive()], [program()], [asset()],
      [action({ dependsOn: 'ghost_action' })],
    )
    expect(problems).toContain("Action 'validate_icps' depends on unknown action 'ghost_action'")
  })

  it('catches a dependsOn pointing outside its own Program', () => {
    // step_two lives on a DIFFERENT program than validate_icps — run.ts generates one
    // Program's actions at a time, so a cross-Program dependency has no ordering guarantee.
    const problems = validateRegistry(
      [executive()],
      [program({ actions: ['validate_icps'] })],
      [asset()],
      [action({ dependsOn: 'step_two' }), action({ id: 'step_two', instructionsRef: 'step_two' })],
    )
    expect(problems).toContain(
      "Action 'validate_icps' depends on 'step_two', but Program 'P001' does not list 'step_two' " +
        'among its own actions — dependsOn must stay within one Program',
    )
  })

  it('allows a valid same-Program dependsOn — no problems', () => {
    const problems = validateRegistry(
      [executive()],
      [program({ actions: ['validate_icps', 'step_two'] })],
      [asset()],
      [action({ dependsOn: 'step_two' }), action({ id: 'step_two', instructionsRef: 'step_two' })],
    )
    expect(problems).toEqual([])
  })
})

// ─── P001's scope (F05 acceptance) ────────────────────────────────────────────

describe('P001 GTM & Strategy', () => {
  it('has AS001–AS005 (PRD §10) plus AS017, absorbed from P007 on merge (Phase 10 Part 3)', () => {
    expect(getProgram('P001').assets).toEqual(['AS001', 'AS002', 'AS003', 'AS004', 'AS005', 'AS017'])
  })

  it('has its original six actions plus the four absorbed from P007', () => {
    expect(getProgram('P001').actions).toEqual([
      'validate_icps', 'interview_customers', 'prioritize_channels', 'review_messaging',
      'approve_gtm_plan', 'post_team_update',
      'review_pricing', 'test_new_pricing', 'approve_discounts', 'update_commercial_terms',
    ])
  })

  it('does NOT contain AS013 — that is P005 (originally P004 Sales Enablement, merged in Phase 10 Part 3)', () => {
    // Regression guard. An earlier Featureinventory draft listed AS013 under P001;
    // ADR-011 corrected it, and the workbook's Asset Registry confirms AS013 is
    // "Sales Enablement Kit | P004 – Guide" — P004 was later merged into P005.
    // This test stops the AS013-under-P001 error returning.
    expect(getProgram('P001').assets).not.toContain('AS013')
  })

  it('is owned by growth, whose system prompt is S003', () => {
    expect(getProgram('P001').owner).toBe('growth')
    expect(getExecutive('growth').systemPromptRef).toBe('S003')
  })

  it('carries the prompt refs the Composer needs (ADR-012)', () => {
    expect(getProgram('P001').programPromptRef).toBe('P001')
    for (const assetId of getProgram('P001').assets) {
      expect(getAsset(assetId).instructionsRef).toBeTruthy()
    }
  })
})

// ─── P002's scope (F05 acceptance — the second Program, seeded for real) ──────

describe('P002 Brand Strategy', () => {
  it('has AS004 (shared with P001) plus AS007–AS009 (workbook Asset Registry)', () => {
    expect(getProgram('P002').assets).toEqual(['AS004', 'AS007', 'AS008', 'AS009'])
  })

  it('is owned by growth — the same executive as P001, no new voice prompt needed', () => {
    expect(getProgram('P002').owner).toBe('growth')
  })

  it('carries the prompt refs the Composer needs (ADR-012)', () => {
    expect(getProgram('P002').programPromptRef).toBe('P002')
    for (const assetId of getProgram('P002').assets) {
      expect(getAsset(assetId).instructionsRef).toBeTruthy()
    }
  })
})

describe('P003 Demand Generation', () => {
  it('has AS010–AS012 (workbook Asset Registry) — none shared with another Program', () => {
    expect(getProgram('P003').assets).toEqual(['AS010', 'AS011', 'AS012'])
  })

  it('is owned by growth — the same executive as P001/P002, no new voice prompt needed', () => {
    expect(getProgram('P003').owner).toBe('growth')
  })

  it('carries the prompt refs the Composer needs (ADR-012)', () => {
    expect(getProgram('P003').programPromptRef).toBe('P003')
    for (const assetId of getProgram('P003').assets) {
      expect(getAsset(assetId).instructionsRef).toBeTruthy()
    }
  })
})

describe('P004 Sales Enablement — merged into P005 (Phase 10 Part 3)', () => {
  it('no longer exists as a standalone Program id', () => {
    expect(() => getProgram('P004')).toThrow('Unknown program: P004')
  })

  it('AS013, AS014 and its four Actions now belong to P005', () => {
    expect(getProgram('P005').assets).toEqual(expect.arrayContaining(['AS013', 'AS014']))
    for (const actionId of ['train_sales_team', 'update_sales_materials', 'prepare_customer_demo', 'review_win_loss_feedback']) {
      expect(getProgram('P005').actions).toContain(actionId)
      expect(getAction(actionId).program).toBe('P005')
    }
    expect(getAsset('AS013').program).toBe('P005')
    expect(getAsset('AS014').program).toBe('P005')
  })

  it('the Action Instructions survive the merge untouched — only ownership moved', () => {
    for (const assetOrActionId of ['AS013', 'AS014', 'train_sales_team', 'update_sales_materials', 'prepare_customer_demo', 'review_win_loss_feedback']) {
      expect(getInstructionPrompt(assetOrActionId)).toBeTruthy()
    }
  })
})

describe('P005 Customer Acquisition & Sales Enablement', () => {
  it('has AS015 (original) plus AS013–AS014, absorbed from P004 on merge (Phase 10 Part 3)', () => {
    expect(getProgram('P005').assets).toEqual(['AS015', 'AS013', 'AS014'])
  })

  it('has its original nine AI SDR actions plus the four absorbed from P004', () => {
    expect(getProgram('P005').actions).toEqual([
      'find_target_companies', 'find_decision_makers', 'research_account', 'score_and_prioritize_leads',
      'generate_personalized_outreach', 'monitor_and_classify_responses', 'follow_up_prospects',
      'qualify_leads', 'update_crm',
      'train_sales_team', 'update_sales_materials', 'prepare_customer_demo', 'review_win_loss_feedback',
    ])
  })

  it('is owned by growth — the same executive as P001–P003, no new voice prompt needed', () => {
    expect(getProgram('P005').owner).toBe('growth')
  })

  it('carries the prompt refs the Composer needs (ADR-012)', () => {
    expect(getProgram('P005').programPromptRef).toBe('P005')
    for (const assetId of getProgram('P005').assets) {
      expect(getAsset(assetId).instructionsRef).toBeTruthy()
    }
  })
})

describe('P006 Customer Success', () => {
  it('has exactly AS016 (workbook Asset Registry) — not shared with another Program', () => {
    expect(getProgram('P006').assets).toEqual(['AS016'])
  })

  it('is owned by growth — the same executive as P001–P005, no new voice prompt needed', () => {
    expect(getProgram('P006').owner).toBe('growth')
  })

  it('carries the prompt refs the Composer needs (ADR-012)', () => {
    expect(getProgram('P006').programPromptRef).toBe('P006')
    for (const assetId of getProgram('P006').assets) {
      expect(getAsset(assetId).instructionsRef).toBeTruthy()
    }
  })
})

describe('P007 Pricing & Packaging — merged into P001 (Phase 10 Part 3)', () => {
  it('no longer exists as a standalone Program id', () => {
    expect(() => getProgram('P007')).toThrow('Unknown program: P007')
  })

  it('AS017 and its four Actions now belong to P001', () => {
    expect(getProgram('P001').assets).toContain('AS017')
    for (const actionId of ['review_pricing', 'test_new_pricing', 'approve_discounts', 'update_commercial_terms']) {
      expect(getProgram('P001').actions).toContain(actionId)
      expect(getAction(actionId).program).toBe('P001')
    }
    expect(getAsset('AS017').program).toBe('P001')
  })

  it('the Action Instructions survive the merge untouched — only ownership moved', () => {
    for (const assetOrActionId of ['AS017', 'review_pricing', 'test_new_pricing', 'approve_discounts', 'update_commercial_terms']) {
      expect(getInstructionPrompt(assetOrActionId)).toBeTruthy()
    }
  })
})

describe('P008 Market Intelligence', () => {
  it('has exactly AS018 (workbook Asset Registry) — not shared with another Program', () => {
    expect(getProgram('P008').assets).toEqual(['AS018'])
  })

  it('is owned by growth — the same executive as P001–P006, no new voice prompt needed', () => {
    expect(getProgram('P008').owner).toBe('growth')
  })

  it('carries the prompt refs the Composer needs (ADR-012)', () => {
    expect(getProgram('P008').programPromptRef).toBe('P008')
    for (const assetId of getProgram('P008').assets) {
      expect(getAsset(assetId).instructionsRef).toBeTruthy()
    }
  })
})

describe('P009 Review', () => {
  it('has exactly AS019-AS021 — NOT the 5 assets named in prose', () => {
    // Both the workbook's Program Registry prose and S005's own "Program Portfolio"
    // section name five assets (Founder Dashboard, Monthly Review Report, KPI
    // Dashboard, Q-Score Trend, Executive Summary), but the workbook's Asset
    // Registry sheet only ever assigned a real id to three of them. Seeding all
    // five would bake in a workbook contradiction — see
    // lib/registry/executives/operations/programs/p009-review.ts for the full
    // reasoning.
    expect(getProgram('P009').assets).toEqual(['AS019', 'AS020', 'AS021'])
  })

  it('is owned by operations — the first non-Growth Program — whose system prompt is S005', () => {
    expect(getProgram('P009').owner).toBe('operations')
    expect(getExecutive('operations').systemPromptRef).toBe('S005')
  })

  it('carries the prompt refs the Composer needs (ADR-012)', () => {
    expect(getProgram('P009').programPromptRef).toBe('P009')
    for (const assetId of getProgram('P009').assets) {
      expect(getAsset(assetId).instructionsRef).toBeTruthy()
    }
  })
})

// ─── ADR-008: no runsWhen ─────────────────────────────────────────────────────

describe('ADR-008 — the rhythm runs all contract-active programs', () => {
  it('no program carries a runsWhen field', () => {
    // The workbook's P001 prompt has an "Autonomous Activation — Execute this
    // Program whenever..." section, which reads exactly like a spec for this
    // field. It must stay prose: the Contract decides what is active, and
    // event-aware skipping is a deferred cost optimisation, not v1 behaviour.
    for (const program of listPrograms()) {
      expect(program).not.toHaveProperty('runsWhen')
    }
  })
})

// ─── ADR-004: the irreversible flag is a safety property ──────────────────────

describe('P001 actions — approval surface', () => {
  it('interview_customers and post_team_update are the only irreversible actions, each on its own connector', () => {
    const irreversible = getProgram('P001').actions
      .map(getAction)
      .filter(a => a.irreversible)

    expect(irreversible.map(a => a.id).sort()).toEqual(['interview_customers', 'post_team_update'])
    expect(getAction('interview_customers').connector).toBe('gmail')
    expect(getAction('post_team_update').connector).toBe('slack')
  })

  it('the other four are internal, reversible and connector-free', () => {
    for (const id of ['validate_icps', 'prioritize_channels', 'review_messaging', 'approve_gtm_plan']) {
      const action = getAction(id)
      expect(action.irreversible).toBe(false)
      expect(action.connector).toBeUndefined()
    }
  })

  it('approve_gtm_plan is NOT an approval gate (ADR-002)', () => {
    // The name invites someone to "fix" this. Approval gates exist only at the
    // Connector boundary on irreversible external effects. Marking this true
    // would reintroduce the per-plan sign-off the PRD explicitly removed.
    expect(getAction('approve_gtm_plan').irreversible).toBe(false)
  })

  it('every action is one-off — a cadence is a frequency, not an entity (ADR-020)', () => {
    for (const action of getProgram('P001').actions.map(getAction)) {
      expect(action.kind).toBe('oneoff')
    }
  })
})

describe('P002 actions — approval surface', () => {
  it('all four are internal, reversible and connector-free', () => {
    // No website/CMS Connector exists yet (only gmail, slack, stripe, posthog are
    // registered), so update_website_copy drafts copy rather than publishing it —
    // see update-website-copy.ts for the reasoning. If a real Connector is added
    // later, this is the test that should start failing.
    for (const id of ['review_brand_positioning', 'update_website_copy', 'define_brand_voice', 'approve_messaging']) {
      const action = getAction(id)
      expect(action.irreversible).toBe(false)
      expect(action.connector).toBeUndefined()
    }
  })

  it('approve_messaging is NOT an approval gate (ADR-002)', () => {
    // Same naming trap as P001's approve_gtm_plan — see that file's own guard.
    expect(getAction('approve_messaging').irreversible).toBe(false)
  })

  it('every action is one-off (ADR-020)', () => {
    for (const action of getProgram('P002').actions.map(getAction)) {
      expect(action.kind).toBe('oneoff')
    }
  })
})

describe('P003 actions — approval surface', () => {
  it('all five are internal, reversible and connector-free', () => {
    // No CMS, ads or webinar Connector exists yet (only gmail, slack, stripe,
    // posthog are registered), so publish_content/launch_campaign/run_webinar
    // draft or plan rather than actually publishing/spending/hosting — see
    // each file for the reasoning. If a real Connector is added later, this is
    // the test that should start failing.
    for (const id of [
      'publish_content',
      'launch_campaign',
      'optimize_seo',
      'run_webinar',
      'monitor_lead_generation',
    ]) {
      const action = getAction(id)
      expect(action.irreversible).toBe(false)
      expect(action.connector).toBeUndefined()
    }
  })

  it('every action is one-off (ADR-020)', () => {
    for (const action of getProgram('P003').actions.map(getAction)) {
      expect(action.kind).toBe('oneoff')
    }
  })
})

describe('ex-P004 sales enablement actions (now P005) — approval surface', () => {
  it('all four are internal, reversible and connector-free', () => {
    // No LMS/training, deck/CMS/CRM or demo/screen-share Connector exists yet
    // (only gmail, slack, stripe, posthog are registered), so
    // train_sales_team/update_sales_materials/prepare_customer_demo draft or
    // plan rather than actually delivering/publishing — see each file for the
    // reasoning. If a real Connector is added later, this is the test that
    // should start failing.
    for (const id of [
      'train_sales_team',
      'update_sales_materials',
      'prepare_customer_demo',
      'review_win_loss_feedback',
    ]) {
      const action = getAction(id)
      expect(action.irreversible).toBe(false)
      expect(action.connector).toBeUndefined()
    }
  })

  it('every one of the four is one-off (ADR-020)', () => {
    for (const id of ['train_sales_team', 'update_sales_materials', 'prepare_customer_demo', 'review_win_loss_feedback']) {
      expect(getAction(id).kind).toBe('oneoff')
    }
  })
})

describe('P005 actions — approval surface', () => {
  it('has the nine restructured AI SDR actions, in pipeline order, plus four absorbed from P004', () => {
    // The founder-directed AI SDR restructuring (18 Aug 2026), plus the P004 merge
    // (Phase 10 Part 3) — see p005-acquire.ts for the full before/after of both.
    expect(getProgram('P005').actions).toEqual([
      'find_target_companies',
      'find_decision_makers',
      'research_account',
      'score_and_prioritize_leads',
      'generate_personalized_outreach',
      'monitor_and_classify_responses',
      'follow_up_prospects',
      'qualify_leads',
      'update_crm',
      'train_sales_team',
      'update_sales_materials',
      'prepare_customer_demo',
      'review_win_loss_feedback',
    ])
  })

  it('generate_personalized_outreach is the only irreversible action, on the gmail connector', () => {
    // Mirrors P001's own approval-surface test above: this is P005's one real
    // external send — the second in the system alongside interview_customers.
    const irreversible = getProgram('P005').actions
      .map(getAction)
      .filter(a => a.irreversible)

    expect(irreversible.map(a => a.id)).toEqual(['generate_personalized_outreach'])
    expect(getAction('generate_personalized_outreach').connector).toBe('gmail')
  })

  it('the other eight are internal, reversible and connector-free', () => {
    // No prospecting/enrichment or CRM Connector exists yet (only gmail, slack,
    // stripe, posthog are registered), so find_target_companies/
    // find_decision_makers/research_account/score_and_prioritize_leads/
    // monitor_and_classify_responses/follow_up_prospects/qualify_leads/
    // update_crm produce analysis, briefs or recommendations rather than a
    // live data pull or write. If a real Connector is added later, this is
    // the test that should start failing.
    for (const id of [
      'find_target_companies',
      'find_decision_makers',
      'research_account',
      'score_and_prioritize_leads',
      'monitor_and_classify_responses',
      'follow_up_prospects',
      'qualify_leads',
      'update_crm',
    ]) {
      const action = getAction(id)
      expect(action.irreversible).toBe(false)
      expect(action.connector).toBeUndefined()
    }
  })

  it('every action is one-off (ADR-020)', () => {
    for (const action of getProgram('P005').actions.map(getAction)) {
      expect(action.kind).toBe('oneoff')
    }
  })

  it('the AI SDR loop is fully chained end to end, except the one deliberate break', () => {
    // find_target_companies -> find_decision_makers -> research_account ->
    // score_and_prioritize_leads -> generate_personalized_outreach was the original chain
    // (Milestone 1). This asserts it plus the three links added to finish the loop:
    // monitor_and_classify_responses -> follow_up_prospects -> qualify_leads -> update_crm.
    expect(getAction('find_decision_makers').dependsOn).toBe('find_target_companies')
    expect(getAction('research_account').dependsOn).toBe('find_decision_makers')
    expect(getAction('score_and_prioritize_leads').dependsOn).toBe('research_account')
    expect(getAction('generate_personalized_outreach').dependsOn).toBe('score_and_prioritize_leads')
    expect(getAction('follow_up_prospects').dependsOn).toBe('monitor_and_classify_responses')
    expect(getAction('qualify_leads').dependsOn).toBe('follow_up_prospects')
    expect(getAction('update_crm').dependsOn).toBe('qualify_leads')

    // The one deliberate break: an irreversible Action's result isn't reliably available
    // same-run (it waits on founder approval), so nothing chains off generate_personalized_outreach.
    expect(getAction('monitor_and_classify_responses').dependsOn).toBeUndefined()
  })
})

describe('P006 actions — approval surface', () => {
  it('all five are internal, reversible and connector-free', () => {
    // No calendar, meeting, survey/feedback-tool or CRM/analytics write-back
    // Connector exists yet (only gmail, slack, stripe, posthog are
    // registered), so schedule_onboarding/conduct_qbr/monitor_health_scores/
    // collect_feedback/launch_upsell_campaign produce plans, documents or
    // recommendations rather than actually booking, presenting, writing or
    // sending — see each file for the reasoning. launch_upsell_campaign is
    // the closest this batch comes to a real Gmail send like P001's
    // interview_customers, and was deliberately kept plan-only rather than
    // made a second irreversible send action — see that file. If a real
    // Connector is added later, this is the test that should start failing.
    for (const id of [
      'schedule_onboarding',
      'conduct_qbr',
      'monitor_health_scores',
      'collect_feedback',
      'launch_upsell_campaign',
    ]) {
      const action = getAction(id)
      expect(action.irreversible).toBe(false)
      expect(action.connector).toBeUndefined()
    }
  })

  it('every action is one-off (ADR-020)', () => {
    for (const action of getProgram('P006').actions.map(getAction)) {
      expect(action.kind).toBe('oneoff')
    }
  })
})

describe('ex-P007 pricing actions (now P001) — approval surface', () => {
  it('all four are internal, reversible and connector-free', () => {
    // No live-price-write Connector exists — the registered Stripe connector is
    // read/sync only (billing status; see lib/registry/types.ts's ConnectorId
    // comment) — so review_pricing/test_new_pricing/approve_discounts/
    // update_commercial_terms produce analysis, a test plan, a governance
    // record and draft contract language rather than actually changing a live
    // price. If a real price-writing Connector is added later, this is the
    // test that should start failing.
    for (const id of [
      'review_pricing',
      'test_new_pricing',
      'approve_discounts',
      'update_commercial_terms',
    ]) {
      const action = getAction(id)
      expect(action.irreversible).toBe(false)
      expect(action.connector).toBeUndefined()
    }
  })

  it('approve_discounts is NOT an approval gate (ADR-002)', () => {
    // Same naming trap as P001's approve_gtm_plan and P002's approve_messaging
    // — see those files' own guards. This records discount governance already
    // decided; it does not authorise any individual discount or wait on the
    // founder.
    expect(getAction('approve_discounts').irreversible).toBe(false)
  })

  it('every one of the four is one-off (ADR-020)', () => {
    for (const id of ['review_pricing', 'test_new_pricing', 'approve_discounts', 'update_commercial_terms']) {
      expect(getAction(id).kind).toBe('oneoff')
    }
  })
})

describe('P008 actions — approval surface', () => {
  it('all four are internal, reversible and connector-free', () => {
    // No competitive-intelligence, news-monitoring or outreach-send Connector
    // exists — only gmail, slack, gmail_read, stripe and posthog are
    // registered (see lib/registry/types.ts's ConnectorId comment) — so
    // monitor_competitors/conduct_customer_interviews/update_market_report/
    // track_industry_trends produce analysis, an interview guide or synthesis,
    // and document updates rather than a live monitoring feed or an outbound
    // email. conduct_customer_interviews is the closest this batch comes to
    // P001's real Gmail-send Action interview_customers by name, and was
    // deliberately kept draft-only rather than made a second irreversible send
    // action — see that file. If a real Connector is added later, this is the
    // test that should start failing.
    for (const id of [
      'monitor_competitors',
      'conduct_customer_interviews',
      'update_market_report',
      'track_industry_trends',
    ]) {
      const action = getAction(id)
      expect(action.irreversible).toBe(false)
      expect(action.connector).toBeUndefined()
    }
  })

  it('every action is one-off (ADR-020)', () => {
    for (const action of getProgram('P008').actions.map(getAction)) {
      expect(action.kind).toBe('oneoff')
    }
  })
})

describe('P015 Validate', () => {
  it('has exactly AS043-AS048 — six ids newly minted for this build (founder-authorized)', () => {
    // Unlike every Program before it, the workbook's Asset Registry sheet never
    // assigned P015's named assets a real id at all (it only ever assigned ids
    // through AS042). The founder was asked directly and explicitly chose to
    // mint AS043-AS048 now rather than leave P015 asset-less — see
    // lib/registry/executives/product/programs/p015-validate.ts for the full
    // reasoning.
    expect(getProgram('P015').assets).toEqual(['AS043', 'AS044', 'AS045', 'AS046', 'AS047', 'AS048'])
  })

  it('is owned by product — the first Product Program — whose system prompt is S004', () => {
    expect(getProgram('P015').owner).toBe('product')
    expect(getExecutive('product').systemPromptRef).toBe('S004')
  })

  it('carries the prompt refs the Composer needs (ADR-012)', () => {
    expect(getProgram('P015').programPromptRef).toBe('P015')
    for (const assetId of getProgram('P015').assets) {
      expect(getAsset(assetId).instructionsRef).toBeTruthy()
    }
  })
})

describe('P016 Product', () => {
  it('has exactly AS054-AS058 — five ids newly minted for this build (founder-authorized)', () => {
    // Same situation as P015 and P023: the workbook's Asset Registry sheet never assigned
    // P016's named assets a real id at all (its last real assignment was AS053, minted for
    // P023). The founder confirmed building P016 next and the same minting approach — see
    // lib/registry/executives/product/programs/p016-product.ts for the full reasoning.
    expect(getProgram('P016').assets).toEqual(['AS054', 'AS055', 'AS056', 'AS057', 'AS058'])
  })

  it('is owned by product — the second Product Program — whose system prompt is still S004', () => {
    expect(getProgram('P016').owner).toBe('product')
    expect(getExecutive('product').systemPromptRef).toBe('S004')
  })

  it('is the natural sequel to P015 — both owned by product, in Registry order', () => {
    expect(getExecutive('product').programs).toEqual(['P015', 'P016'])
  })

  it('carries the prompt refs the Composer needs (ADR-012)', () => {
    expect(getProgram('P016').programPromptRef).toBe('P016')
    for (const assetId of getProgram('P016').assets) {
      expect(getAsset(assetId).instructionsRef).toBeTruthy()
    }
  })
})

describe('P016 actions — approval surface', () => {
  it('has five actions: a real four-link chain plus one deliberately independent', () => {
    expect(getProgram('P016').actions).toEqual([
      'define_product_vision',
      'plan_product_roadmap',
      'prioritize_backlog',
      'draft_prd',
      'review_success_metrics',
    ])
  })

  it('all five are internal, reversible and connector-free', () => {
    // No roadmap/project-management or analytics-write Connector exists — only gmail, slack,
    // gmail_read, stripe and posthog are registered (see lib/registry/types.ts's ConnectorId
    // comment) — so every P016 action produces analysis, a plan or a draft rather than a live
    // tool write. If a real Connector is added later, this is the test that should start
    // failing.
    for (const action of getProgram('P016').actions.map(getAction)) {
      expect(action.irreversible).toBe(false)
      expect(action.connector).toBeUndefined()
    }
  })

  it('every action is one-off (ADR-020)', () => {
    for (const action of getProgram('P016').actions.map(getAction)) {
      expect(action.kind).toBe('oneoff')
    }
  })

  it('is chained end to end except the one deliberate break, same pattern P005 finished', () => {
    expect(getAction('define_product_vision').dependsOn).toBeUndefined()
    expect(getAction('plan_product_roadmap').dependsOn).toBe('define_product_vision')
    expect(getAction('prioritize_backlog').dependsOn).toBe('plan_product_roadmap')
    expect(getAction('draft_prd').dependsOn).toBe('prioritize_backlog')
    // Deliberately independent — reads broad traction data, not one specific prior step.
    expect(getAction('review_success_metrics').dependsOn).toBeUndefined()
  })
})

describe('P023 Model', () => {
  it('has exactly AS049-AS053 — five ids newly minted for this build (founder-authorized)', () => {
    // Same situation as P015: the workbook's Asset Registry sheet never
    // assigned P023's named assets a real id at all (its last real
    // assignment was AS048, minted for P015). The founder was asked directly
    // and explicitly chose to mint AS049-AS053 now rather than leave P023
    // asset-less — see lib/registry/executives/finance/programs/p023-model.ts
    // for the full reasoning.
    expect(getProgram('P023').assets).toEqual(['AS049', 'AS050', 'AS051', 'AS052', 'AS053'])
  })

  it('is owned by finance — the first Finance Program — whose system prompt is S006', () => {
    expect(getProgram('P023').owner).toBe('finance')
    expect(getExecutive('finance').systemPromptRef).toBe('S006')
  })

  it('carries the prompt refs the Composer needs (ADR-012)', () => {
    expect(getProgram('P023').programPromptRef).toBe('P023')
    for (const assetId of getProgram('P023').assets) {
      expect(getAsset(assetId).instructionsRef).toBeTruthy()
    }
  })
})

describe('P009 actions — approval surface', () => {
  it('all five are internal, reversible and connector-free', () => {
    // No calendar, analytics-write or project-management Connector exists — only
    // gmail, slack, gmail_read, stripe and posthog are registered (see
    // lib/registry/types.ts's ConnectorId comment) — so schedule_monthly_review/
    // review_kpis/identify_constraints/assign_priorities/approve_action_plan
    // produce a schedule, an analysis, a named constraint, a ranked list and a
    // recorded plan rather than a live calendar booking or metrics write. If a
    // real Connector is added later, this is the test that should start failing.
    for (const id of [
      'schedule_monthly_review',
      'review_kpis',
      'identify_constraints',
      'assign_priorities',
      'approve_action_plan',
    ]) {
      const action = getAction(id)
      expect(action.irreversible).toBe(false)
      expect(action.connector).toBeUndefined()
    }
  })

  it('approve_action_plan is NOT an approval gate (ADR-002)', () => {
    // Same naming trap as P001's approve_gtm_plan, P002's approve_messaging and
    // P007's approve_discounts — see those files' own guards. This records a
    // ranked plan already reasoned through; it does not authorise it or wait on
    // the founder.
    expect(getAction('approve_action_plan').irreversible).toBe(false)
  })

  it('every action is one-off (ADR-020)', () => {
    for (const action of getProgram('P009').actions.map(getAction)) {
      expect(action.kind).toBe('oneoff')
    }
  })
})

describe('P015 actions — approval surface', () => {
  it('all five are internal, reversible and connector-free', () => {
    // No interview-tooling, analytics-write or roadmap/project-management
    // Connector exists — only gmail, slack, gmail_read, stripe and posthog are
    // registered (see lib/registry/types.ts's ConnectorId comment) — so
    // score_product_market_fit/prioritize_features/validate_customer_problem/
    // synthesize_customer_feedback/approve_validation_roadmap produce a
    // scorecard, a ranked matrix, an analysis, a log and a recorded roadmap
    // rather than a live tool write. If a real Connector is added later, this
    // is the test that should start failing.
    for (const id of [
      'score_product_market_fit',
      'prioritize_features',
      'validate_customer_problem',
      'synthesize_customer_feedback',
      'approve_validation_roadmap',
    ]) {
      const action = getAction(id)
      expect(action.irreversible).toBe(false)
      expect(action.connector).toBeUndefined()
    }
  })

  it('approve_validation_roadmap is NOT an approval gate (ADR-002)', () => {
    // Same naming trap as P001's approve_gtm_plan, P002's approve_messaging,
    // P007's approve_discounts and P009's approve_action_plan — see those
    // files' own guards. This records a validation roadmap already reasoned
    // through; it does not authorise it or wait on the founder.
    expect(getAction('approve_validation_roadmap').irreversible).toBe(false)
  })

  it('every action is one-off (ADR-020)', () => {
    for (const action of getProgram('P015').actions.map(getAction)) {
      expect(action.kind).toBe('oneoff')
    }
  })
})

describe('P023 actions — approval surface', () => {
  it('all five are internal, reversible and connector-free', () => {
    // No accounting, modelling or billing-write Connector exists — only
    // gmail, slack, gmail_read, stripe and posthog are registered (see
    // lib/registry/types.ts's ConnectorId comment) — so build_financial_model/
    // update_budget/run_scenario_analysis/review_unit_economics/
    // approve_financial_plan produce a model, a reconciled budget, a
    // stress-tested analysis, a metrics review and a recorded plan rather
    // than a live accounting-system write. The registered Stripe connector is
    // read/sync only. If a real Connector is added later, this is the test
    // that should start failing.
    for (const id of [
      'build_financial_model',
      'update_budget',
      'run_scenario_analysis',
      'review_unit_economics',
      'approve_financial_plan',
    ]) {
      const action = getAction(id)
      expect(action.irreversible).toBe(false)
      expect(action.connector).toBeUndefined()
    }
  })

  it('approve_financial_plan is NOT an approval gate (ADR-002)', () => {
    // Same naming trap as P001's approve_gtm_plan, P002's approve_messaging,
    // P007's approve_discounts, P009's approve_action_plan and P015's
    // approve_validation_roadmap — see those files' own guards. This records
    // a financial plan already reasoned through; it does not authorise it or
    // wait on the founder.
    expect(getAction('approve_financial_plan').irreversible).toBe(false)
  })

  it('every action is one-off (ADR-020)', () => {
    for (const action of getProgram('P023').actions.map(getAction)) {
      expect(action.kind).toBe('oneoff')
    }
  })
})

// ─── The roster ───────────────────────────────────────────────────────────────

describe('executive roster (PRD §7.1)', () => {
  it('has all five with the workbook prompt refs', () => {
    expect(listExecutives().map(e => e.id).sort()).toEqual(
      ['ceo', 'finance', 'growth', 'operations', 'product'],
    )
    expect(getExecutive('ceo').systemPromptRef).toBe('S001')
    expect(getExecutive('growth').systemPromptRef).toBe('S003')
    expect(getExecutive('product').systemPromptRef).toBe('S004')
    expect(getExecutive('operations').systemPromptRef).toBe('S005')
    expect(getExecutive('finance').systemPromptRef).toBe('S006')
  })

  it('seeds product/S004 so F06 can prove P001+S004 is invalid (PRD §7.2)', () => {
    // The Composer's headline acceptance test needs a CTO prompt to wrongly pair
    // with P001. It cannot be written unless S004 exists here.
    expect(getExecutive('product').systemPromptRef).toBe('S004')
    expect(getProgram('P001').owner).not.toBe('product')
  })

  it('growth owns six seeded programs — P001, P002, P003, P005, P006, P008 (P007 merged into P001, P004 merged into P005)', () => {
    expect(listProgramsForExecutive('growth').map(p => p.id)).toEqual([
      'P001', 'P002', 'P003', 'P005', 'P006', 'P008',
    ])
    expect(listProgramsForExecutive('ceo')).toEqual([])
  })

  it('operations now owns its first seeded program, P009', () => {
    // The first Program ever seeded for an executive other than Growth.
    expect(listProgramsForExecutive('operations').map(p => p.id)).toEqual(['P009'])
  })

  it('product owns its two seeded programs, P015 and P016', () => {
    // P015 was the first Program ever seeded for an executive other than Growth or
    // Operations; P016 (vision/roadmap) is the natural sequel, seeded next.
    expect(listProgramsForExecutive('product').map(p => p.id)).toEqual(['P015', 'P016'])
  })

  it('finance now owns its first seeded program, P023', () => {
    // The first Program ever seeded for an executive other than Growth,
    // Operations or Product.
    expect(listProgramsForExecutive('finance').map(p => p.id)).toEqual(['P023'])
  })
})

// ─── The shared asset ─────────────────────────────────────────────────────────

describe('AS004 — the shared asset', () => {
  it('is owned by P001, shared with P002 (workbook: "P001 - GTM, P002 - Brand")', () => {
    // sharedWith was unset until P002 existed — a reference to an unseeded
    // Program would have failed the load. Now that P002 is seeded and lists
    // AS004 among its assets, the link must resolve both ways (validateRegistry
    // checks exactly that).
    expect(getAsset('AS004').program).toBe('P001')
    expect(getAsset('AS004').sharedWith).toEqual(['P002'])
  })

  it('listProgramsForAsset returns owner + sharedWith', () => {
    // F11 must validate writes against this, not against asset.program alone —
    // otherwise a legitimate P002 write to AS004 would be blocked.
    expect(listProgramsForAsset('AS004')).toEqual(['P001', 'P002'])
    expect(listProgramsForAsset('AS001')).toEqual(['P001'])
  })
})

// ─── Phase 10 Part 2 — Actions can be shared across Programs too ──────────────

describe('Action ownership mirrors Asset ownership exactly', () => {
  it('every seeded action has exactly one owner and no sharedWith yet', () => {
    // True today: sharing an Action is a capability this phase adds, not something any
    // existing Action actually uses yet. If this ever fails, a real Action started sharing —
    // update this assertion deliberately rather than let it drift silently.
    for (const program of listPrograms()) {
      for (const actionId of program.actions) {
        expect(listProgramsForAction(actionId)).toEqual([program.id])
      }
    }
  })

  it('listProgramsForAction returns owner + sharedWith', () => {
    const shared = { ...getAction('review_messaging'), sharedWith: ['P002'] as ProgramTemplate['id'][] }
    const problems = validateRegistry(
      listExecutives(),
      listPrograms().map(p => (p.id === 'P002' ? { ...p, actions: [...p.actions, 'review_messaging'] } : p)),
      undefined,
      undefined,
    )
    // Baseline: P002 listing review_messaging without the action naming it back is invalid.
    expect(problems).toContain(
      "Program 'P002' lists action 'review_messaging', but 'review_messaging' does not name it " +
        "as its owner or in sharedWith (it names P001)",
    )
    expect(listProgramsForAction('review_messaging')).toEqual(['P001'])
    expect([shared.program, ...(shared.sharedWith ?? [])]).toEqual(['P001', 'P002'])
  })

  it('an action naming an owner that does not claim it back is caught', () => {
    const problems = validateRegistry(
      [{ id: 'growth', name: 'G', motto: '', domains: [], programs: ['P001'], systemPromptRef: 'S003', inheritsFrom: [] }],
      [{ id: 'P001', handle: 'GTM', name: 'GTM', owner: 'growth', objective: '', successMetric: '', assets: [], actions: [], programPromptRef: 'P001' }],
      [],
      [{ id: 'orphan_action', program: 'P001', name: 'Orphan', kind: 'oneoff', irreversible: false, instructionsRef: 'orphan_action' }],
    )
    expect(problems).toContain("Action 'orphan_action' claims owner 'P001', but that program does not list it")
  })
})

// ─── F05's headline claim ─────────────────────────────────────────────────────

describe('adding a Program requires no new route (F05 acceptance) — the general mechanism', () => {
  // P002 itself (above) already proves this happened for real. This exercises
  // the same validateRegistry mechanism generically, with a throwaway id, so the
  // guard on "the share must be declared both ways" survives as a test even
  // though P002 is no longer a hypothetical.
  const p997: ProgramTemplate = {
    id: 'P997',
    handle: 'Test',
    name: 'Test Program',
    owner: 'growth',
    objective: 'Prove the mechanism.',
    successMetric: 'n/a',
    assets: ['AS005'],
    actions: ['review_messaging'],
    programPromptRef: 'P001',
  }

  const seededAssets = () =>
    [
      'AS001', 'AS002', 'AS003', 'AS004', 'AS005', 'AS007', 'AS008', 'AS009', 'AS010', 'AS011', 'AS012',
      'AS013', 'AS014', 'AS015', 'AS016', 'AS017', 'AS018', 'AS019', 'AS020', 'AS021',
      'AS043', 'AS044', 'AS045', 'AS046', 'AS047', 'AS048',
      'AS049', 'AS050', 'AS051', 'AS052', 'AS053',
      'AS054', 'AS055', 'AS056', 'AS057', 'AS058',
    ].map(getAsset)
  const seededActions = () =>
    [
      ...getProgram('P001').actions,
      ...getProgram('P002').actions,
      ...getProgram('P003').actions,
      ...getProgram('P005').actions,
      ...getProgram('P006').actions,
      // P001's own actions above already include the four ex-P007 ones, and P005's own
      // actions above already include the four ex-P004 ones (both merged, Phase 10 Part 3).
      ...getProgram('P008').actions,
      ...getProgram('P009').actions,
      ...getProgram('P015').actions,
      ...getProgram('P016').actions,
      ...getProgram('P023').actions,
    ].map(getAction)

  it('a brand new Program resolves through the same loader, unchanged', () => {
    // Config only: no route, no migration, no engine change. AS005 and
    // review_messaging both gain sharedWith: ['P997'] — the declaration that P997 may
    // maintain/generate them (Phase 10 Part 2 extended the identical mechanism to Actions).
    // operations, product and finance are included unmodified so P009 (owner
    // 'operations'), P015 (owner 'product') and P023 (owner 'finance'), all
    // now part of listPrograms(), still resolve an owner.
    const as005 = { ...getAsset('AS005'), sharedWith: ['P997'] as ProgramTemplate['id'][] }
    const reviewMessaging = { ...getAction('review_messaging'), sharedWith: ['P997'] as ProgramTemplate['id'][] }

    const problems = validateRegistry(
      [
        { ...getExecutive('growth'), programs: ['P001', 'P002', 'P997'] },
        getExecutive('operations'),
        getExecutive('product'),
        getExecutive('finance'),
      ],
      [...listPrograms(), p997],
      [...seededAssets().filter(a => a.id !== 'AS005'), as005],
      [...seededActions().filter(a => a.id !== 'review_messaging'), reviewMessaging],
    )

    expect(problems).toEqual([])
  })

  it('and it CANNOT be added while forgetting to declare the share', () => {
    // The guard that makes an unset sharedWith safe. Seed P997 listing AS005
    // but leave AS005 naming only P001, and the load fails — rather than Story 2
    // silently blocking a legitimate P997 write months later.
    const problems = validateRegistry(
      [
        { ...getExecutive('growth'), programs: ['P001', 'P002', 'P997'] },
        getExecutive('operations'),
        getExecutive('product'),
        getExecutive('finance'),
      ],
      [...listPrograms(), p997],
      seededAssets(), // AS005 as seeded today: owner P001, no sharedWith
      seededActions(),
    )

    expect(problems).toContain(
      "Program 'P997' lists asset 'AS005', but 'AS005' does not name it as its owner or in sharedWith (it names P001)",
    )
  })
})
