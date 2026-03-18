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
    .select('full_name, startup_name, industry, description, notification_preferences')
    .eq('user_id', user.id)
    .single()

  const prefs = ((data?.notification_preferences ?? {}) as Record<string, boolean>)

  return {
    email:        user.email ?? '',
    fullName:     data?.full_name    ?? '',
    startupName:  data?.startup_name ?? '',
    industry:     data?.industry     ?? '',
    description:  data?.description  ?? '',
    notificationPreferences: {
      emailNotifications: prefs.emailNotifications !== false,
      qScoreUpdates:      prefs.qScoreUpdates      !== false,
      investorMessages:   prefs.investorMessages   !== false,
      weeklyDigest:       prefs.weeklyDigest       === true,
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

/** Saves company settings. */
export async function saveCompanySettings(
  startupName: string, industry: string, description: string
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('founder_profiles')
    .update({ startup_name: startupName, industry, description })
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
