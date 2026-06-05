'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Check, ChevronRight, Lock, ArrowUpRight,
  UserCircle, FileText, Target, TrendingUp, Users, DollarSign,
} from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue } from '@/lib/constants/colors'

const font = {
  family: 'system-ui, -apple-system, sans-serif',
  size: { xs: 10, sm: 11, base: 13, md: 14, lg: 16, xl: 18, '2xl': 22, '3xl': 28 },
  weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
}
const radius = { sm: 9, md: 10, lg: 14, full: 9999 }
const space: Record<number, number> = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 }

interface FounderProgress {
  onboarding_completed: boolean
  profile_builder_completed: boolean
  assessment_completed: boolean
  registration_completed: boolean
  has_pitch_deck: boolean
  has_metrics: boolean
  has_team_member: boolean
  full_name: string
  startup_name: string
}

interface Step {
  id: string
  icon: React.ElementType
  title: string
  description: string
  detail: string
  href: string
  completed: boolean
  locked?: boolean
  badge?: string
}

function getSteps(p: FounderProgress): Step[] {
  return [
    {
      id: 'account',
      icon: UserCircle,
      title: 'Account created',
      description: 'Your Edge Alpha account is live.',
      detail: '',
      href: '/founder/settings',
      completed: true,
    },
    {
      id: 'startup_info',
      icon: Target,
      title: 'Startup info added',
      description: 'Your industry, stage, and traction are visible to investors.',
      detail: '',
      href: '/founder/settings?tab=company',
      completed: p.onboarding_completed,
    },
    {
      id: 'qscore_profile',
      icon: FileText,
      title: 'Complete your Q-Score profile',
      description: 'Answer evidence questions to calculate your Q-Score.',
      detail: '~8 min · Unlocks investor visibility and deal flow matching',
      href: '/founder/profile-builder',
      completed: p.profile_builder_completed,
      badge: 'High impact',
    },
    {
      id: 'pitch_deck',
      icon: TrendingUp,
      title: 'Upload your pitch deck',
      description: 'Investors can view your deck before requesting a connection.',
      detail: 'Optional · Improves your profile quality signal',
      href: '/founder/pitch-deck',
      completed: p.has_pitch_deck,
    },
    {
      id: 'metrics',
      icon: DollarSign,
      title: 'Add your metrics',
      description: 'MRR, burn rate, and runway help investors filter accurately.',
      detail: 'Optional · Required for Financials Q-Score parameter',
      href: '/founder/metrics',
      completed: p.has_metrics,
    },
    {
      id: 'team',
      icon: Users,
      title: 'Invite a co-founder',
      description: 'Team credibility is a signal investors weight heavily.',
      detail: 'Optional · Team parameter contributes ~18% to Q-Score',
      href: '/founder/settings?tab=team',
      completed: p.has_team_member,
    },
  ]
}

export default function FounderGettingStarted() {
  const router = useRouter()
  const [profile, setProfile]   = useState<FounderProgress | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data } = await sb
        .from('founder_profiles')
        .select('onboarding_completed, profile_builder_completed, assessment_completed, registration_completed, full_name, startup_name, startup_profile_data')
        .eq('user_id', user.id)
        .single()

      if (!data) { router.replace('/founder/onboarding'); return }

      // Check for pitch deck and metrics via startup profile data
      const hasPitch   = !!(data.startup_profile_data as Record<string, unknown>)?.pitch_deck_url
      const hasMetrics = !!(data.startup_profile_data as Record<string, unknown>)?.mrr

      // Check for team members
      let hasTeamMember = false
      const { count } = await sb
        .from('startup_members')
        .select('*', { count: 'exact', head: true })
        .eq('startup_id', user.id)
      hasTeamMember = (count ?? 0) > 1

      setProfile({
        onboarding_completed:       data.onboarding_completed        ?? false,
        profile_builder_completed:  data.profile_builder_completed   ?? false,
        assessment_completed:       data.assessment_completed        ?? false,
        registration_completed:     data.registration_completed      ?? false,
        has_pitch_deck:             hasPitch,
        has_metrics:                hasMetrics,
        has_team_member:            hasTeamMember,
        full_name:                  data.full_name ?? '',
        startup_name:               data.startup_name ?? '',
      })
      setLoading(false)
    }
    load()
  }, [router])

  if (loading || !profile) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.family }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2.5px solid ${bdr}`, borderTopColor: blue, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const steps    = getSteps(profile)
  const done     = steps.filter(s => s.completed).length
  const total    = steps.length
  const pct      = Math.round((done / total) * 100)
  const allDone  = done === total
  const nextStep = steps.find(s => !s.completed)

  const firstName = profile.full_name.split(' ')[0] || 'there'

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: font.family, color: ink }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: `${space[10]}px ${space[6]}px ${space[12]}px` }}>

        {/* Header */}
        <div style={{ marginBottom: space[8] }}>
          <p style={{ fontSize: font.size.base, color: muted, margin: `0 0 ${space[1]}px`, fontWeight: font.weight.semibold, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Getting started
          </p>
          <h1 style={{ fontSize: font.size['3xl'], fontWeight: font.weight.bold, letterSpacing: '-0.04em', margin: `0 0 ${space[3]}px`, color: ink, lineHeight: 1.1 }}>
            {allDone
              ? `You're investor-ready, ${firstName}!`
              : `Let's get you investor-ready, ${firstName}`
            }
          </h1>
          <p style={{ fontSize: font.size.lg, color: muted, margin: 0, lineHeight: 1.6 }}>
            {allDone
              ? `Your Q-Score profile is complete. Investors can now find and connect with ${profile.startup_name}.`
              : `Complete these steps to unlock your Q-Score and appear in investor deal flow.`
            }
          </p>
        </div>

        {/* Progress card */}
        <div style={{
          background: surf, border: `1px solid ${bdr}`, borderRadius: radius.lg,
          padding: `${space[6]}px ${space[6]}px ${space[5]}px`,
          marginBottom: space[6],
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space[4] }}>
            <div>
              <p style={{ margin: 0, fontSize: font.size.xl, fontWeight: font.weight.bold, color: ink }}>
                {done} of {total} complete
              </p>
              <p style={{ margin: `${space[1]}px 0 0`, fontSize: font.size.base, color: muted }}>
                {allDone ? 'All steps finished.' : `${total - done} step${total - done === 1 ? '' : 's'} remaining`}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{
                fontSize: font.size['2xl'], fontWeight: font.weight.bold,
                color: allDone ? '#059669' : pct >= 50 ? blue : ink,
              }}>
                {pct}%
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 8, background: bdr, borderRadius: radius.full, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: allDone
                ? 'linear-gradient(90deg, #059669, #10B981)'
                : `linear-gradient(90deg, ${blue}, ${blue}CC)`,
              borderRadius: radius.full,
              width: `${pct}%`,
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>

          {/* Next action CTA */}
          {!allDone && nextStep && (
            <div style={{ marginTop: space[4], paddingTop: space[4], borderTop: `1px solid ${bdr}` }}>
              <p style={{ margin: `0 0 ${space[2]}px`, fontSize: font.size.sm, color: muted, fontWeight: font.weight.semibold, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Next up
              </p>
              <Link href={nextStep.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', padding: '12px 14px', borderRadius: radius.md, background: `${blue}08`, border: `1.5px solid ${blue}20` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: space[3] }}>
                  <div style={{ width: 36, height: 36, borderRadius: radius.sm, background: blue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <nextStep.icon size={16} color="#fff" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: font.size.md, fontWeight: font.weight.semibold, color: ink }}>{nextStep.title}</p>
                    {nextStep.detail && <p style={{ margin: `2px 0 0`, fontSize: font.size.sm, color: muted }}>{nextStep.detail}</p>}
                  </div>
                </div>
                <ChevronRight size={16} color={blue} />
              </Link>
            </div>
          )}
        </div>

        {/* Steps list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}>
          {steps.map((step, idx) => {
            const Icon = step.icon
            return (
              <div
                key={step.id}
                style={{
                  background: surf, border: `1px solid ${step.completed ? blue + '25' : bdr}`,
                  borderRadius: radius.lg, overflow: 'hidden',
                  opacity: step.locked ? 0.5 : 1,
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: space[4], padding: `${space[4]}px ${space[5]}px` }}>
                  {/* Step number / check */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: step.completed ? '#ECFDF5' : step.locked ? surf : `${blue}08`,
                    border: `1.5px solid ${step.completed ? '#059669' : step.locked ? bdr : blue + '30'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}>
                    {step.completed
                      ? <Check size={18} color="#059669" strokeWidth={2.5} />
                      : step.locked
                        ? <Lock size={16} color={muted} />
                        : <Icon size={18} color={blue} />
                    }
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: space[2], flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: font.size.md, fontWeight: font.weight.semibold,
                        color: step.completed ? muted : ink,
                        textDecoration: step.completed ? 'line-through' : 'none',
                      }}>
                        {step.title}
                      </span>
                      {step.badge && !step.completed && (
                        <span style={{
                          padding: '2px 8px', borderRadius: radius.full,
                          background: '#FEF3C7', color: '#D97706',
                          fontSize: font.size.xs, fontWeight: font.weight.semibold,
                        }}>
                          {step.badge}
                        </span>
                      )}
                      {step.completed && (
                        <span style={{
                          padding: '2px 8px', borderRadius: radius.full,
                          background: '#ECFDF5', color: '#059669',
                          fontSize: font.size.xs, fontWeight: font.weight.semibold,
                        }}>
                          Done
                        </span>
                      )}
                    </div>
                    <p style={{ margin: `${space[1]}px 0 0`, fontSize: font.size.base, color: muted, lineHeight: 1.5 }}>
                      {step.description}
                    </p>
                    {step.detail && !step.completed && (
                      <p style={{ margin: `${space[1]}px 0 0`, fontSize: font.size.sm, color: muted }}>
                        {step.detail}
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  {!step.completed && !step.locked && (
                    <Link
                      href={step.href}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '8px 14px', borderRadius: radius.sm,
                        background: idx === steps.findIndex(s => !s.completed) ? blue : 'transparent',
                        border: `1.5px solid ${idx === steps.findIndex(s => !s.completed) ? blue : bdr}`,
                        color: idx === steps.findIndex(s => !s.completed) ? '#fff' : muted,
                        fontSize: font.size.sm, fontWeight: font.weight.semibold,
                        textDecoration: 'none', whiteSpace: 'nowrap',
                        transition: 'all 0.12s',
                        flexShrink: 0,
                      }}
                    >
                      {idx === steps.findIndex(s => !s.completed) ? 'Start' : 'Go'}
                      <ArrowUpRight size={13} />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA if all done */}
        {allDone && (
          <div style={{ marginTop: space[8], textAlign: 'center' }}>
            <div style={{ padding: `${space[6]}px`, background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: radius.lg }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: `0 auto ${space[3]}px` }}>
                <Check size={24} color="#fff" strokeWidth={2.5} />
              </div>
              <h3 style={{ margin: `0 0 ${space[2]}px`, fontSize: font.size.xl, fontWeight: font.weight.bold, color: '#065F46' }}>
                Profile complete!
              </h3>
              <p style={{ margin: `0 0 ${space[4]}px`, fontSize: font.size.md, color: '#047857' }}>
                Your Q-Score is live and investors can now find you in their deal flow.
              </p>
              <Link
                href="/founder/dashboard"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '12px 24px', borderRadius: radius.md,
                  background: '#059669', color: '#fff',
                  fontSize: font.size.md, fontWeight: font.weight.semibold,
                  textDecoration: 'none',
                }}
              >
                Go to dashboard <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
