/**
 * Investor Settings Service — load + save investor profile settings
 */

import { createClient } from '@/lib/supabase/client'

export interface InvestorSettingsData {
  email: string
  displayName: string
  fundName: string
  title: string
  thesis: string
  sectors: string[]
  stages: string[]
  checkSizes: string[]
  newFounders: boolean
  highQScore: boolean
  connectionReq: boolean
  weeklyDigest: boolean
}

export async function loadInvestorSettings(): Promise<InvestorSettingsData | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('investor_profiles')
    .select('full_name, firm_name, title, thesis, sectors, stages, check_sizes, deal_flow_notifications, notification_preferences')
    .eq('user_id', user.id)
    .single()

  const prefs = (profile?.notification_preferences ?? {}) as Record<string, boolean>

  return {
    email:        user.email ?? '',
    displayName:  profile?.full_name   ?? (user.user_metadata?.full_name as string) ?? '',
    fundName:     profile?.firm_name   ?? '',
    title:        profile?.title       ?? '',
    thesis:       profile?.thesis      ?? '',
    sectors:      profile?.sectors     ?? [],
    stages:       profile?.stages      ?? [],
    checkSizes:   profile?.check_sizes ?? [],
    newFounders:  profile?.deal_flow_notifications !== false,
    highQScore:   prefs.highQScore    !== false,
    connectionReq: prefs.connectionReq !== false,
    weeklyDigest: prefs.weeklyDigest  === true,
  }
}

export interface SaveAccountInput {
  displayName: string
  fundName: string
  title: string
}

export async function saveInvestorAccount(input: SaveAccountInput): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: inv, error } = await supabase
    .from('investor_profiles')
    .update({ full_name: input.displayName, firm_name: input.fundName, title: input.title })
    .eq('user_id', user.id)
    .select('demo_investor_id')
    .single()

  if (error) throw error

  if (inv?.demo_investor_id) {
    await supabase
      .from('demo_investors')
      .update({ name: input.displayName, firm: input.fundName || 'Independent' })
      .eq('id', inv.demo_investor_id)
  }
}

export interface SavePreferencesInput {
  thesis: string
  sectors: string[]
  stages: string[]
  checkSizes: string[]
}

export async function saveInvestorPreferences(input: SavePreferencesInput): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: inv, error } = await supabase
    .from('investor_profiles')
    .update({ thesis: input.thesis, sectors: input.sectors, stages: input.stages, check_sizes: input.checkSizes })
    .eq('user_id', user.id)
    .select('demo_investor_id')
    .single()

  if (error) throw error

  if (inv?.demo_investor_id) {
    await supabase
      .from('demo_investors')
      .update({ thesis: input.thesis, sectors: input.sectors, stages: input.stages, check_sizes: input.checkSizes })
      .eq('id', inv.demo_investor_id)
  }
}

export interface SaveNotificationsInput {
  newFounders: boolean
  highQScore: boolean
  connectionReq: boolean
  weeklyDigest: boolean
}

export async function saveInvestorNotifications(input: SaveNotificationsInput): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('investor_profiles')
    .update({
      deal_flow_notifications: input.newFounders,
      notification_preferences: {
        highQScore:    input.highQScore,
        connectionReq: input.connectionReq,
        weeklyDigest:  input.weeklyDigest,
      },
    })
    .eq('user_id', user.id)

  if (error) throw error
}

export async function signOutInvestor(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
}
