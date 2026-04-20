/**
 * Settings Service — all Supabase reads/writes for the settings page
 * Pure async functions, no React
 */

import { createClient } from '@/lib/supabase/client'

export interface SettingsProfile {
  email: string
  fullName: string
  startupName: string
  industry: string
  description: string
  tagline: string
  location: string
  problemStatement: string
  targetCustomer: string
  avatarUrl: string
  companyLogoUrl: string
  // Startup profile (from signup / profile builder)
  stage: string
  revenueStatus: string
  teamSize: string
  fundingStatus: string
  website: string
  notificationPreferences: {
    emailNotifications: boolean
    qScoreUpdates: boolean
    investorMessages: boolean
    weeklyDigest: boolean
    runwayAlerts: boolean
  }
}

/** Loads the current user's settings from Supabase. */
export async function loadSettings(): Promise<SettingsProfile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('founder_profiles')
    .select('full_name, startup_name, industry, description, tagline, location, startup_profile_data, notification_preferences, stage, revenue_status, team_size, funding_status, website')
    .eq('user_id', user.id)
    .single()

  const prefs = ((data?.notification_preferences ?? {}) as Record<string, boolean>)
  const sp    = ((data?.startup_profile_data    ?? {}) as Record<string, unknown>)
  const meta  = (user.user_metadata ?? {}) as Record<string, string>

  return {
    email:            user.email ?? '',
    fullName:         data?.full_name    || meta.full_name    || '',
    startupName:      data?.startup_name || meta.startup_name || '',
    industry:         data?.industry       ?? '',
    description:      data?.description    ?? '',
    tagline:          (data?.tagline        as string) ?? '',
    location:         (data?.location       as string) ?? '',
    problemStatement: (sp.problemStatement  as string) ?? '',
    targetCustomer:   (sp.targetCustomer    as string) ?? '',
    avatarUrl:        (user.user_metadata?.avatar_url       as string) ?? '',
    companyLogoUrl:   (user.user_metadata?.company_logo_url as string) ?? '',
    stage:            data?.stage          ?? '',
    revenueStatus:    data?.revenue_status ?? '',
    teamSize:         data?.team_size      ?? '',
    fundingStatus:    data?.funding_status ?? '',
    website:          data?.website        ?? '',
    notificationPreferences: {
      emailNotifications: prefs.emailNotifications !== false,
      qScoreUpdates:      prefs.qScoreUpdates      !== false,
      investorMessages:   prefs.investorMessages   !== false,
      weeklyDigest:       prefs.weeklyDigest        === true,
      runwayAlerts:       prefs.runwayAlerts        !== false,
    },
  }
}

/** Saves account settings (full name). */
export async function saveAccountSettings(fullName: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('founder_profiles')
    .update({ full_name: fullName })
    .eq('user_id', user.id)
  if (error) throw error
}

/** Saves company fields: name, industry, description, tagline, location. */
export async function saveCompanySettings(
  startupName: string, industry: string, description: string,
  tagline: string, location: string
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('founder_profiles')
    .update({ startup_name: startupName, industry, description, tagline: tagline || null, location: location || null })
    .eq('user_id', user.id)
  if (error) throw error
}

/** Saves startup details: problemStatement and targetCustomer (stored in startup_profile_data JSONB). */
export async function saveStartupDetailsSettings(
  problemStatement: string, targetCustomer: string
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('founder_profiles')
    .select('startup_profile_data')
    .eq('user_id', user.id)
    .single()

  const current = ((existing?.startup_profile_data ?? {}) as Record<string, unknown>)
  const { error } = await supabase
    .from('founder_profiles')
    .update({
      startup_profile_data: {
        ...current,
        problemStatement: problemStatement || null,
        targetCustomer:   targetCustomer   || null,
      },
    })
    .eq('user_id', user.id)
  if (error) throw error
}

/** Saves startup profile fields (Stage, Revenue, Team Size, Funding, Website). */
export async function saveStartupProfileSettings(
  stage: string, revenueStatus: string, teamSize: string, fundingStatus: string, website: string
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('founder_profiles')
    .update({ stage, revenue_status: revenueStatus, team_size: teamSize, funding_status: fundingStatus, website: website || null })
    .eq('user_id', user.id)
  if (error) throw error
}

/** Saves notification preferences. */
export async function saveNotificationSettings(prefs: {
  emailNotifications: boolean
  qScoreUpdates: boolean
  investorMessages: boolean
  weeklyDigest: boolean
  runwayAlerts: boolean
}): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('founder_profiles')
    .update({ notification_preferences: prefs })
    .eq('user_id', user.id)
  if (error) throw error
}

/** Exports all user data as a JSON blob download. */
export async function exportUserData(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const [{ data: fp }, { data: qs }, { data: aa }] = await Promise.all([
    supabase.from('founder_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('qscore_history').select('*').eq('user_id', user.id).order('calculated_at', { ascending: false }).limit(10),
    supabase.from('agent_artifacts').select('id, agent_id, artifact_type, title, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ])

  const blob = new Blob(
    [JSON.stringify({ profile: fp, qscoreHistory: qs, agentArtifacts: aa }, null, 2)],
    { type: 'application/json' }
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `edge-alpha-data-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}
