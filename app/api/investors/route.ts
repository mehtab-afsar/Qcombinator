import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Returns demo investors for the founder matching page.
// Reads from demo_investors table (no auth.users FK — safe for public reads).
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase
      .from('demo_investors')
      .select('*')
      .eq('is_active', true)
      .order('response_rate', { ascending: false })

    if (error) {
      console.error('Error fetching demo investors:', error)
      return NextResponse.json({ error: 'Failed to fetch investors' }, { status: 500 })
    }

    return NextResponse.json({ investors: data ?? [] })
  } catch (err) {
    console.error('Investors API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
