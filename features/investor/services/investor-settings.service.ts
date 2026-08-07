/**
 * Investor Settings Service — load + save investor profile settings
 */

import { createClient } from '@/lib/supabase/client'
import { investorConnectionOrFilter } from '@/lib/investor/demo-investor'

export interface InvestorSettingsData {
  email: string
  displayName: string
  fundName: string
  title: string
  thesis: string
  sectors: string[]
  stages: string[]
  checkSizes: string[]
  avatarUrl: string
  firmLogoUrl: string
  newFounders: boolean
  highQScore: boolean
  connectionReq: boolean
  weeklyDigest: boolean
  emailNotifications: boolean
  qscoreUpdates: boolean
  investorMessages: boolean
  runwayAlerts: boolean
}

export async function loadInvestorSettings(): Promise<InvestorSettingsData | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: notifPrefs }] = await Promise.all([
    supabase
      .from('investor_profiles')
      .select('full_name, firm_name, title, thesis, sectors, stages, check_sizes, avatar_url, firm_logo_url')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('notification_preferences')
      .select('high_q_score, connection_req, weekly_digest, deal_flow_notifications, email_notifications, qscore_updates, investor_messages, runway_alerts')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  return {
    email:          user.email ?? '',
    displayName:    profile?.full_name   ?? (user.user_metadata?.full_name as string) ?? '',
    fundName:       profile?.firm_name   ?? '',
    title:          profile?.title       ?? '',
    thesis:         profile?.thesis      ?? '',
    sectors:        profile?.sectors     ?? [],
    stages:         profile?.stages      ?? [],
    checkSizes:     profile?.check_sizes ?? [],
    avatarUrl:      profile?.avatar_url   ?? '',
    firmLogoUrl:    profile?.firm_logo_url ?? '',
    newFounders:    notifPrefs?.deal_flow_notifications !== false,
    highQScore:     notifPrefs?.high_q_score    !== false,
    connectionReq:  notifPrefs?.connection_req  !== false,
    weeklyDigest:   notifPrefs?.weekly_digest   === true,
    emailNotifications: notifPrefs?.email_notifications !== false,
    qscoreUpdates:  notifPrefs?.qscore_updates  !== false,
    investorMessages: notifPrefs?.investor_messages !== false,
    runwayAlerts:   notifPrefs?.runway_alerts   !== false,
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
  emailNotifications: boolean
  qscoreUpdates: boolean
  investorMessages: boolean
  runwayAlerts: boolean
}

export async function saveInvestorNotifications(input: SaveNotificationsInput): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id:                 user.id,
      deal_flow_notifications: input.newFounders,
      high_q_score:            input.highQScore,
      connection_req:          input.connectionReq,
      weekly_digest:           input.weeklyDigest,
      email_notifications:     input.emailNotifications,
      qscore_updates:          input.qscoreUpdates,
      investor_messages:       input.investorMessages,
      runway_alerts:           input.runwayAlerts,
    }, { onConflict: 'user_id' })

  if (error) throw error
}

export async function signOutInvestor(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
}

/**
 * Download the investor's own data as a JSON file — client-side only, mirroring
 * features/founder/services/settings.service.ts::exportUserData()'s mechanism exactly.
 */
export async function exportInvestorData(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('investor_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const demoInvestorId = (profile as { demo_investor_id?: string } | null)?.demo_investor_id ?? null
  const orFilter = investorConnectionOrFilter(user.id, demoInvestorId)

  const [{ data: connections }, { data: portfolioCompanies }] = await Promise.all([
    supabase
      .from('connection_requests')
      .select('id, founder_id, status, personal_message, created_at, updated_at')
      .or(orFilter)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('investor_portfolio_companies')
      .select('id, company_name, founder_name, sector, stage, invested_at, invite_status, created_at')
      .eq('investor_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const blob = new Blob(
    [JSON.stringify({ profile, connections, portfolioCompanies }, null, 2)],
    { type: 'application/json' }
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `edge-alpha-investor-data-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}
