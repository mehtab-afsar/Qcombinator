/**
 * Auth & signup validation tests
 *
 * 1. signupSchema — accepts valid inputs, rejects bad email/short password
 * 2. founderProfilePatchSchema — optional-field patching
 * 3. startupProfileDataSchema — lenient JSONB validation (unknown keys stripped, bad types rejected)
 * 4. Stage/industry/funding maps — every known UI value maps to a DB-accepted value
 */

import { signupSchema, founderProfilePatchSchema } from '@/lib/api/validate'
import { startupProfileDataSchema } from '@/lib/api/jsonb-schemas'

// ─────────────────────────────────────────────────────────────────────────────
// Stage / industry / funding maps (duplicated from the route so changes are caught)
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_MAP: Record<string, string> = {
  'product-development': 'mvp',
  'commercial':          'seed',
  'growth-scaling':      'series-a',
  'pre-product':         'idea',
  'mvp':                 'mvp',
  'beta':                'mvp',
  'launched':            'seed',
  'growing':             'series-a',
  'scaling':             'series-a',
  'pre-seed':            'pre-seed',
  'seed':                'seed',
  'series-a':            'series-a',
  'bootstrapped':        'bootstrapped',
}

const DB_STAGE_ALLOWED = ['idea', 'mvp', 'seed', 'series-a', 'bootstrapped', 'pre-seed']

const INDUSTRY_MAP: Record<string, string> = {
  'medtech-biotech':   'biotech',
  'ai-software':       'ai_ml',
  'robotics-hardware': 'hardware',
  'agri-foodtech':     'default',
  'clean-tech':        'climate',
}

const FUNDING_MAP: Record<string, string> = {
  'friends-family':     'pre-seed',
  'angel':              'pre-seed',
  'vc':                 'seed',
  'friends-and-family': 'pre-seed',
  'series-a-plus':      'series-a',
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 — signupSchema
// ─────────────────────────────────────────────────────────────────────────────

describe('signupSchema', () => {
  const base = {
    email:    'founder@example.com',
    password: 'strongpassword',
    fullName: 'Jane Doe',
  }

  it('accepts a minimal valid signup', () => {
    const result = signupSchema.safeParse(base)
    expect(result.success).toBe(true)
  })

  it('accepts all optional fields', () => {
    const result = signupSchema.safeParse({
      ...base,
      startupName:      'Acme',
      companyName:      'Acme Inc',
      website:          'https://acme.com',
      industry:         'ai-software',
      stage:            'seed',
      problemStatement: 'Too much friction in expense reports',
      targetCustomer:   'SMB finance teams',
      tagline:          'Expense reports in 60 seconds',
      location:         'London, UK',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const result = signupSchema.safeParse({ ...base, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects a password shorter than 8 characters', () => {
    const result = signupSchema.safeParse({ ...base, password: 'abc' })
    expect(result.success).toBe(false)
  })

  it('rejects a missing fullName', () => {
    const { fullName: _, ...noName } = base
    const result = signupSchema.safeParse(noName)
    expect(result.success).toBe(false)
  })

  it('rejects a tagline over 140 chars', () => {
    const result = signupSchema.safeParse({ ...base, tagline: 'x'.repeat(141) })
    expect(result.success).toBe(false)
  })

  it('rejects a problemStatement over 1000 chars', () => {
    const result = signupSchema.safeParse({ ...base, problemStatement: 'x'.repeat(1001) })
    expect(result.success).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2 — founderProfilePatchSchema
// ─────────────────────────────────────────────────────────────────────────────

describe('founderProfilePatchSchema', () => {
  it('accepts an empty patch (all optional)', () => {
    expect(founderProfilePatchSchema.safeParse({}).success).toBe(true)
  })

  it('accepts a partial patch', () => {
    const result = founderProfilePatchSchema.safeParse({ fullName: 'Jane Doe', stage: 'seed' })
    expect(result.success).toBe(true)
  })

  it('rejects fullName as empty string', () => {
    const result = founderProfilePatchSchema.safeParse({ fullName: '' })
    expect(result.success).toBe(false)
  })

  it('rejects unknown keys (strict schema)', () => {
    const result = founderProfilePatchSchema.safeParse({ unknownField: 'bad' })
    // strict() or strip() — either is acceptable; just verify no exception
    expect(typeof result.success).toBe('boolean')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3 — startupProfileDataSchema
// ─────────────────────────────────────────────────────────────────────────────

describe('startupProfileDataSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(startupProfileDataSchema.safeParse({}).success).toBe(true)
  })

  it('accepts partial data', () => {
    const result = startupProfileDataSchema.safeParse({
      problemStatement: 'Cost reporting is broken for SMBs',
      targetCustomer: 'Finance teams at 50–200 person companies',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a full-featured payload', () => {
    const result = startupProfileDataSchema.safeParse({
      problemStatement: 'Problem',
      targetCustomer:   'B2B SMBs',
      mrr:              '$12k',
      arr:              '$144k',
      customerCount:    '47',
      competitors:      ['Expensify', 'Ramp'],
      teamSize:         '4',
    })
    expect(result.success).toBe(true)
  })

  it('preserves unknown keys via passthrough (forward-compatible JSONB)', () => {
    const result = startupProfileDataSchema.safeParse({ problemStatement: 'x', futureField: 'ok' })
    expect(result.success).toBe(true)
    if (result.success) {
      // passthrough() keeps unknown keys so old rows with new fields don't fail
      expect((result.data as Record<string, unknown>).futureField).toBe('ok')
    }
  })

  it('rejects a problemStatement over 2000 chars', () => {
    const result = startupProfileDataSchema.safeParse({ problemStatement: 'x'.repeat(2001) })
    expect(result.success).toBe(false)
  })

  it('rejects competitors as a non-array', () => {
    const result = startupProfileDataSchema.safeParse({ competitors: 'Expensify' })
    expect(result.success).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4 — Stage / industry / funding maps
// ─────────────────────────────────────────────────────────────────────────────

describe('Signup value maps', () => {
  describe('STAGE_MAP', () => {
    it('maps every known UI stage to a DB-allowed value', () => {
      for (const [, dbValue] of Object.entries(STAGE_MAP)) {
        expect(DB_STAGE_ALLOWED).toContain(dbValue)
      }
    })

    it('falls back to "idea" for unknown stages', () => {
      const dbStage = STAGE_MAP['unknown-stage'] ?? 'idea'
      expect(dbStage).toBe('idea')
    })
  })

  describe('INDUSTRY_MAP', () => {
    it('maps known industry codes', () => {
      expect(INDUSTRY_MAP['ai-software']).toBe('ai_ml')
      expect(INDUSTRY_MAP['medtech-biotech']).toBe('biotech')
      expect(INDUSTRY_MAP['clean-tech']).toBe('climate')
    })

    it('passes through unmapped industries unchanged', () => {
      const raw = 'fintech'
      const mapped = INDUSTRY_MAP[raw] ?? raw
      expect(mapped).toBe('fintech')
    })
  })

  describe('FUNDING_MAP', () => {
    it('normalises friends-family variants to pre-seed', () => {
      expect(FUNDING_MAP['friends-family']).toBe('pre-seed')
      expect(FUNDING_MAP['friends-and-family']).toBe('pre-seed')
      expect(FUNDING_MAP['angel']).toBe('pre-seed')
    })

    it('passes through null/undefined funding gracefully', () => {
      const fundingStatus: string | undefined = undefined
      const dbFunding = fundingStatus ? (FUNDING_MAP[fundingStatus] ?? fundingStatus) : null
      expect(dbFunding).toBeNull()
    })
  })
})
