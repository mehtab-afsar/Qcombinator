/**
 * Investor Configuration API
 * GET: Fetch investor's current config
 * POST: Save investor's config preferences
 */

import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { verifyAuth, verifyInvestor } from '@/lib/auth/verify'
import { INVESTOR_DEFAULTS } from '@/lib/constants/investor-config/defaults'
import { parseBody, investorConfigSchema } from '@/lib/api/validate'
import { log } from '@/lib/logger'

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })
    const { user } = auth
    const supabase = await createClient()

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
    log.error('GET /api/investor/config', { error })
    return Response.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyInvestor(createAdminClient())
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })
    const { user } = auth
    const supabase = await createClient()

    const parsed = await parseBody(req, investorConfigSchema)
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 })
    const { investorType, preferences } = parsed.data

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
    log.error('POST /api/investor/config', { error })
    return Response.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    )
  }
}
