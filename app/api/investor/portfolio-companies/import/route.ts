import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody, portfolioCompanyImportSchema } from '@/lib/api/validate'
import { log } from '@/lib/logger'

// POST /api/investor/portfolio-companies/import
// Body: { rows: Array<{ company_name, founder_name, founder_email, sector, stage, invested_at, investment_note }> }
// Bulk inserts portfolio companies from CSV import

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const parsed = await parseBody(req, portfolioCompanyImportSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { rows } = parsed.data

    const inserts = rows
      .filter((r): r is typeof r & { company_name: string } => Boolean(r.company_name?.trim()))
      .map((r) => ({
        investor_user_id: auth.user.id,
        company_name:     r.company_name.trim(),
        founder_name:     r.founder_name?.trim() || null,
        founder_email:    r.founder_email?.trim().toLowerCase() || null,
        sector:           r.sector?.trim() || null,
        stage:            r.stage?.trim() || null,
        invested_at:      r.invested_at || null,
        investment_note:  r.investment_note?.trim() || null,
      }))

    if (inserts.length === 0) {
      return NextResponse.json({ error: 'No valid rows found (company_name is required)' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('investor_portfolio_companies')
      .insert(inserts)
      .select()

    if (error) {
      log.error('POST /api/investor/portfolio-companies/import', { error })
      return NextResponse.json({ error: 'Failed to import companies' }, { status: 500 })
    }

    return NextResponse.json({ imported: data?.length ?? 0, companies: data })
  } catch (err) {
    log.error('POST /api/investor/portfolio-companies/import', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
