/**
 * Startup Profile Service — load + save startup profile data in founder_profiles
 */

import { createClient } from '@/lib/supabase/client'

export interface StartupProfileData {
  companyName: string; website: string; incorporation: string;
  foundedDate: string; industry: string; oneLiner: string; stage: string;
  problemStatement: string; whyNow: string; solution: string;
  uniquePosition: string; moat: string;
  tamSize: string; marketGrowth: string; customerPersona: string;
  businessModel: string; competitors: string[]; differentiation: string;
  tractionType: string; mrr: string; arr: string; growthRate: string;
  customerCount: string; churnRate: string; cac: string; ltv: string;
  userInterviews: string; lois: string; pilots: string; waitlist: string;
  teamSize: string; advisors: string[]; equitySplit: string; keyHires: string[];
  raisingAmount: string; useOfFunds: string; previousFunding: string;
  runwayRemaining: string; targetCloseDate: string;
}

export async function loadStartupProfile(empty: StartupProfileData): Promise<{
  data: StartupProfileData
  userId: string | null
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: empty, userId: null }

  const { data: fp } = await supabase
    .from('founder_profiles')
    .select('startup_name, industry, stage, startup_profile_data')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!fp) return { data: empty, userId: user.id }

  const saved = (fp.startup_profile_data ?? {}) as Partial<StartupProfileData>
  return {
    data: {
      ...empty, ...saved,
      companyName: saved.companyName || fp.startup_name || '',
      industry:    saved.industry    || fp.industry     || '',
      stage:       saved.stage       || fp.stage        || '',
    },
    userId: user.id,
  }
}

export async function saveStartupProfile(
  data: StartupProfileData,
  complete: boolean,
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('founder_profiles').update({
    startup_name:              data.companyName || undefined,
    industry:                  data.industry    || undefined,
    stage:                     data.stage       || undefined,
    website:                   data.website     || undefined,
    tagline:                   data.oneLiner    || undefined,
    startup_profile_data:      data,
    startup_profile_completed: complete,
    updated_at:                new Date().toISOString(),
  }).eq('user_id', user.id)
}
