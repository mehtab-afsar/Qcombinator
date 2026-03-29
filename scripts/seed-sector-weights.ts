/**
 * Edge Alpha IQ Score v2 — Seed Sector Weight Profiles
 * Idempotent: upserts all 11 sector profiles
 * Run: npx ts-node scripts/seed-sector-weights.ts
 */

import { createClient } from '@supabase/supabase-js'

const profiles = [
  { sector: 'b2b_saas',    p1: 0.24, p2: 0.18, p3: 0.10, p4: 0.16, p5: 0.05, p6: 0.27, rationale: 'Revenue metrics and financial efficiency dominate; IP less critical than distribution' },
  { sector: 'biotech',     p1: 0.08, p2: 0.18, p3: 0.32, p4: 0.26, p5: 0.08, p6: 0.08, rationale: 'IP and team credentials are primary signals; revenue comes late' },
  { sector: 'marketplace', p1: 0.28, p2: 0.24, p3: 0.08, p4: 0.16, p5: 0.06, p6: 0.18, rationale: 'Supply/demand balance and market size matter most; margins moderate' },
  { sector: 'fintech',     p1: 0.20, p2: 0.18, p3: 0.18, p4: 0.20, p5: 0.08, p6: 0.16, rationale: 'Regulatory/IP moat and team credibility balanced with financial scale' },
  { sector: 'consumer',    p1: 0.26, p2: 0.22, p3: 0.06, p4: 0.14, p5: 0.06, p6: 0.26, rationale: 'Growth velocity and market potential dominant; IP rarely matters' },
  { sector: 'climate',     p1: 0.14, p2: 0.20, p3: 0.22, p4: 0.18, p5: 0.18, p6: 0.08, rationale: 'Impact credibility and IP moat key; P5 carries real weight for climate track' },
  { sector: 'hardware',    p1: 0.12, p2: 0.20, p3: 0.28, p4: 0.22, p5: 0.06, p6: 0.12, rationale: 'Build complexity and team depth are the core moat for hardware' },
  { sector: 'edtech',      p1: 0.18, p2: 0.20, p3: 0.10, p4: 0.16, p5: 0.12, p6: 0.24, rationale: 'Financial sustainability and market scale matter; some impact weight' },
  { sector: 'healthtech',  p1: 0.16, p2: 0.18, p3: 0.22, p4: 0.20, p5: 0.10, p6: 0.14, rationale: 'Clinical IP and expert team required; financial secondary pre-clearance' },
  { sector: 'ai_ml',       p1: 0.20, p2: 0.20, p3: 0.18, p4: 0.22, p5: 0.06, p6: 0.14, rationale: 'Team is the moat for AI; data/IP secondary; market opportunity large' },
  { sector: 'default',     p1: 0.20, p2: 0.20, p3: 0.17, p4: 0.18, p5: 0.08, p6: 0.17, rationale: 'Balanced weights for unknown or mixed sectors' },
]

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  for (const p of profiles) {
    const sum = p.p1 + p.p2 + p.p3 + p.p4 + p.p5 + p.p6
    if (Math.abs(sum - 1.0) > 0.001) {
      console.error(`WEIGHT ERROR for ${p.sector}: sum=${sum}`)
      process.exit(1)
    }

    const { error } = await supabase
      .from('sector_weight_profiles')
      .upsert({
        sector: p.sector,
        p1_weight: p.p1, p2_weight: p.p2, p3_weight: p.p3,
        p4_weight: p.p4, p5_weight: p.p5, p6_weight: p.p6,
        rationale: p.rationale,
      }, { onConflict: 'sector' })

    if (error) {
      console.error(`Failed to upsert ${p.sector}:`, error)
    } else {
      console.log(`✓ ${p.sector} (sum=${sum.toFixed(2)})`)
    }
  }

  console.log('Sector weight seed complete.')
}

run().catch(console.error)
