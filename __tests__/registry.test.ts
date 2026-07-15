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
    id: 'validate_icps', name: 'Validate ICPs', kind: 'oneoff', irreversible: false,
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
})

// ─── P001's scope (F05 acceptance) ────────────────────────────────────────────

describe('P001 GTM', () => {
  it('has exactly AS001–AS005 (PRD §10)', () => {
    expect(getProgram('P001').assets).toEqual(['AS001', 'AS002', 'AS003', 'AS004', 'AS005'])
  })

  it('does NOT contain AS013 — that is P004 Sales Enablement', () => {
    // Regression guard. An earlier Featureinventory draft listed AS013 under P001;
    // ADR-011 corrected it, and the workbook's Asset Registry confirms AS013 is
    // "Sales Enablement Kit | P004 – Guide". This test stops the error returning.
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
  it('interview_customers is the only irreversible action, and it uses gmail', () => {
    const irreversible = getProgram('P001').actions
      .map(getAction)
      .filter(a => a.irreversible)

    expect(irreversible.map(a => a.id)).toEqual(['interview_customers'])
    expect(getAction('interview_customers').connector).toBe('gmail')
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

  it('only growth owns a seeded program', () => {
    expect(listProgramsForExecutive('growth').map(p => p.id)).toEqual(['P001'])
    for (const id of ['ceo', 'product', 'operations', 'finance']) {
      expect(listProgramsForExecutive(id)).toEqual([])
    }
  })
})

// ─── The shared asset ─────────────────────────────────────────────────────────

describe('AS004 — the shared asset', () => {
  it('is owned by P001, with sharedWith unset until P002 is seeded', () => {
    // The workbook says AS004 belongs to "P001 - GTM, P002 - Brand". P002 is not
    // seeded, and a reference to an unseeded Program would fail the load — the
    // same rule that keeps growth.programs to ['P001'].
    expect(getAsset('AS004').program).toBe('P001')
    expect(getAsset('AS004').sharedWith).toBeUndefined()
  })

  it('listProgramsForAsset returns owner + sharedWith', () => {
    // F11 must validate writes against this, not against asset.program alone —
    // otherwise a legitimate P002 write to AS004 would be blocked.
    expect(listProgramsForAsset('AS004')).toEqual(['P001'])
    expect(listProgramsForAsset('AS001')).toEqual(['P001'])
  })
})

// ─── F05's headline claim ─────────────────────────────────────────────────────

describe('adding a Program requires no new route (F05 acceptance)', () => {
  // P002 Brand is the real next Program (workbook: assets AS004, AS007–AS009).
  // It shares AS004 with P001, which makes it the exact case the sharedWith
  // decision exists for.
  const p002: ProgramTemplate = {
    id: 'P002',
    handle: 'Brand',
    name: 'Brand Strategy',
    owner: 'growth',
    objective: 'Define and strengthen the brand.',
    successMetric: 'Brand is coherent and differentiated.',
    assets: ['AS004'],
    actions: ['review_messaging'],
    programPromptRef: 'P002',
  }

  const seededAssets = () =>
    ['AS001', 'AS002', 'AS003', 'AS004', 'AS005'].map(getAsset)
  const seededActions = () => getProgram('P001').actions.map(getAction)

  it('a brand new Program resolves through the same loader, unchanged', () => {
    // Config only: no route, no migration, no engine change. AS004 gains
    // sharedWith: ['P002'] — the declaration that P002 may maintain it.
    const as004 = { ...getAsset('AS004'), sharedWith: ['P002'] as ProgramTemplate['id'][] }

    const problems = validateRegistry(
      [{ ...getExecutive('growth'), programs: ['P001', 'P002'] }],
      [...listPrograms(), p002],
      [...seededAssets().filter(a => a.id !== 'AS004'), as004],
      seededActions(),
    )

    expect(problems).toEqual([])
  })

  it('and it CANNOT be added while forgetting to declare the share', () => {
    // The guard that makes AS004's unset sharedWith safe. Seed P002 listing AS004
    // but leave AS004 naming only P001, and the load fails — rather than Story 2
    // silently blocking a legitimate P002 write months later.
    const problems = validateRegistry(
      [{ ...getExecutive('growth'), programs: ['P001', 'P002'] }],
      [...listPrograms(), p002],
      seededAssets(), // AS004 as seeded today: owner P001, no sharedWith
      seededActions(),
    )

    expect(problems).toContain(
      "Program 'P002' lists asset 'AS004', but 'AS004' does not name it as its owner or in sharedWith (it names P001)",
    )
  })
})
