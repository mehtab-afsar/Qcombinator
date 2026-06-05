/**
 * Investor Configuration API
 * GET: Fetch investor's current config
 * POST: Save investor's config preferences
 */

import { createClient } from '@/lib/supabase/server'
import { INVESTOR_DEFAULTS } from '@/lib/constants/investor-config/defaults'
import type { InvestorConfig } from '@/lib/constants/investor-config/types'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch existing config
    const { data: config, error } = await supabase
      .from('investor_configs')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // If no config exists, return defaults based on investor type
    if (error?.code === 'PGRST116') {
      // Determine investor type from profile
      const { data: profile } = await supabase
        .from('investor_profiles')
        .select('investor_type')
        .eq('user_id', user.id)
        .single()

      const investorType = ((profile?.investor_type as string) || 'seed-vc') as keyof typeof INVESTOR_DEFAULTS
      return Response.json(INVESTOR_DEFAULTS[investorType])
    }

    if (error) throw error

    return Response.json(config.preferences_data || INVESTOR_DEFAULTS['seed-vc'])
  } catch (error) {
    console.error('Failed to fetch investor config:', error)
    return Response.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { investorType, preferences } = body as InvestorConfig

    // Validate input
    if (!investorType || !preferences) {
      return Response.json(
        { error: 'Missing required fields: investorType, preferences' },
        { status: 400 }
      )
    }

    // Upsert config
    const { error } = await supabase
      .from('investor_configs')
      .upsert(
        {
          user_id: user.id,
          investor_type: investorType,
          preferences_data: preferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) throw error

    return Response.json({ success: true, data: { investorType, preferences } })
  } catch (error) {
    console.error('Failed to save investor config:', error)
    return Response.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    )
  }
}
