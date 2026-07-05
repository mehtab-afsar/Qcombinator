'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Check, ChevronRight, ArrowUpRight,
  Building2, Target, Sparkles, SlidersHorizontal, Users,
} from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue } from '@/lib/constants/colors'
import type { LucideIcon } from 'lucide-react'

const font = {
  family: 'system-ui, -apple-system, sans-serif',
  size: { xs: 10, sm: 11, base: 13, md: 14, lg: 16, xl: 18, '2xl': 22, '3xl': 28 },
  weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
}
const radius = { sm: 9, md: 10, lg: 14, full: 9999 }
const space: Record<number, number> = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 }

interface InvestorProgress {
  onboarding_completed: boolean
  has_thesis: boolean
  has_criteria: boolean
  has_weights: boolean
  has_team_member: boolean
  full_name: string
  firm_name: string
}

interface Step {
  id: string
  icon: LucideIcon
  title: string
  description: string
  detail: string
  href: string
  completed: boolean
  badge?: string
}

function getSteps(p: InvestorProgress): Step[] {
  return [
    {
      id: 'account',
      icon: Target,
      title: 'Account created',
      description: 'Your Edge Alpha investor account is live.',
      detail: '',
      href: '/investor/settings',
      completed: true,
    },
    {
      id: 'criteria',
      icon: Target,
      title: 'Investment criteria set',
      description: 'Your stages, sectors, and check size drive deal flow matching.',
      detail: '',
      href: '/investor/settings?tab=preferences',
      completed: p.has_criteria,
    },
    {
      id: 'firm_profile',
      icon: Building2,
      title: 'Complete your firm profile',
      description: 'Founders see this before requesting a connection. Make it count.',
      detail: '~3 min · Your name, firm, location, and photo',
      href: '/investor/settings?tab=account',
      completed: p.onboarding_completed,
      badge: 'Trust signal',
    },
    {
      id: 'thesis',
      icon: Sparkles,
      title: 'Upload your investment thesis',
      description: 'We use your thesis to surface founders aligned with your worldview.',
      detail: 'Optional · Enables semantic matching beyond keyword filters',
      href: '/investor/settings?tab=preferences',
      completed: p.has_thesis,
    },
    {
      id: 'weights',
      icon: SlidersHorizontal,
      title: 'Configure Q-Score weights',
      description: 'Tune which Q-Score parameters matter most to you.',
      detail: 'Optional · Takes 2 min · Personalizes your deal flow ranking',
      href: '/investor/settings?tab=preferences',
      completed: p.has_weights,
    },
    {
      id: 'team',
      icon: Users,
      title: 'Invite an analyst',
      description: 'Share deal flow and pipeline with your team.',
      detail: 'Optional · Analysts get read access to your deal flow',
      href: '/investor/settings?tab=team',
      completed: p.has_team_member,
    },
  ]
}

export default function InvestorGettingStarted() {
  const router = useRouter()
  const [profile, setProfile] = useState<InvestorProgress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data } = await sb
        .from('investor_profiles')
        .select('onboarding_completed, full_name, firm_name, thesis, sectors, stages, check_sizes')
        .eq('user_id', user.id)
        .single()

      if (!data) { router.replace('/investor/onboarding'); return }

      const hasThesis   = !!data.thesis && (data.thesis as string).length > 20
      const hasCriteria = (data.sectors?.length ?? 0) > 0 && (data.stages?.length ?? 0) > 0
      const hasWeights  = false // Weights are optional, advanced feature

      let hasTeamMember = false
      const { count } = await sb
        .from('investor_team_members')
        .select('*', { count: 'exact', head: true })
        .eq('investor_user_id', user.id)
      hasTeamMember = (count ?? 0) > 0

      setProfile({
        onboarding_completed: data.onboarding_completed ?? false,
        has_thesis:           hasThesis,
        has_criteria:         hasCriteria,
        has_weights:          hasWeights,
        has_team_member:      hasTeamMember,
        full_name:            data.full_name ?? '',
        firm_name:            data.firm_name ?? '',
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

  const steps   = getSteps(profile)
  const done    = steps.filter(s => s.completed).length
  const total   = steps.length
  const pct     = Math.round((done / total) * 100)
  const allDone = done === total

  const firstName = profile.full_name.split(' ')[0] || 'there'
  const nextStep  = steps.find(s => !s.completed)

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: font.family, color: ink }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: `${space[10]}px ${space[6]}px ${space[12]}px` }}>

        {/* Header */}
        <div style={{ marginBottom: space[8] }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: radius.full,
            background: `${blue}10`, border: `1px solid ${blue}20`,
            fontSize: font.size.sm, fontWeight: font.weight.semibold,
            color: blue, marginBottom: space[3],
          }}>
            Your deal flow is being personalized
          </div>
          <h1 style={{ fontSize: font.size['3xl'], fontWeight: font.weight.bold, letterSpacing: '-0.04em', margin: `0 0 ${space[3]}px`, color: ink, lineHeight: 1.1 }}>
            {allDone
              ? `You're all set, ${firstName}!`
              : `Welcome to Edge Alpha, ${firstName}`
            }
          </h1>
          <p style={{ fontSize: font.size.lg, color: muted, margin: 0, lineHeight: 1.6 }}>
            {allDone
              ? `Your deal flow is fully personalized. Matched founders are waiting in your pipeline.`
              : `Complete these steps to get the most accurate founder matches for ${profile.firm_name || 'your fund'}.`
            }
          </p>
        </div>

        {/* Progress card */}
        <div style={{
          background: surf, border: `1px solid ${bdr}`, borderRadius: radius.lg,
          padding: `${space[6]}px`, marginBottom: space[6],
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space[4] }}>
            <div>
              <p style={{ margin: 0, fontSize: font.size.xl, fontWeight: font.weight.bold, color: ink }}>
                {done} of {total} complete
              </p>
              <p style={{ margin: `${space[1]}px 0 0`, fontSize: font.size.base, color: muted }}>
                {allDone ? 'Profile fully set up.' : `${total - done} step${total - done === 1 ? '' : 's'} remaining`}
              </p>
            </div>
            <span style={{
              fontSize: font.size['2xl'], fontWeight: font.weight.bold,
              color: allDone ? '#059669' : pct >= 50 ? blue : ink,
            }}>
              {pct}%
            </span>
          </div>

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
                    {nextStep.detail && <p style={{ margin: '2px 0 0', fontSize: font.size.sm, color: muted }}>{nextStep.detail}</p>}
                  </div>
                </div>
                <ChevronRight size={16} color={blue} />
              </Link>
            </div>
          )}
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}>
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isNext = idx === steps.findIndex(s => !s.completed)
            return (
              <div
                key={step.id}
                style={{
                  background: surf, border: `1px solid ${step.completed ? blue + '25' : bdr}`,
                  borderRadius: radius.lg, overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: space[4], padding: `${space[4]}px ${space[5]}px` }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: step.completed ? '#ECFDF5' : `${blue}08`,
                    border: `1.5px solid ${step.completed ? '#059669' : blue + '30'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}>
                    {step.completed
                      ? <Check size={18} color="#059669" strokeWidth={2.5} />
                      : <Icon size={18} color={blue} />
                    }
                  </div>

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
                        <span style={{ padding: '2px 8px', borderRadius: radius.full, background: '#EFF6FF', color: blue, fontSize: font.size.xs, fontWeight: font.weight.semibold }}>
                          {step.badge}
                        </span>
                      )}
                      {step.completed && (
                        <span style={{ padding: '2px 8px', borderRadius: radius.full, background: '#ECFDF5', color: '#059669', fontSize: font.size.xs, fontWeight: font.weight.semibold }}>
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

                  {!step.completed && (
                    <Link
                      href={step.href}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '8px 14px', borderRadius: radius.sm,
                        background: isNext ? blue : 'transparent',
                        border: `1.5px solid ${isNext ? blue : bdr}`,
                        color: isNext ? '#fff' : muted,
                        fontSize: font.size.sm, fontWeight: font.weight.semibold,
                        textDecoration: 'none', whiteSpace: 'nowrap',
                        transition: 'all 0.12s', flexShrink: 0,
                      }}
                    >
                      {isNext ? 'Start' : 'Go'}
                      <ArrowUpRight size={13} />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {allDone && (
          <div style={{ marginTop: space[8], textAlign: 'center' }}>
            <div style={{ padding: space[6], background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: radius.lg }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: `0 auto ${space[3]}px` }}>
                <Check size={24} color="#fff" strokeWidth={2.5} />
              </div>
              <h3 style={{ margin: `0 0 ${space[2]}px`, fontSize: font.size.xl, fontWeight: font.weight.bold, color: '#065F46' }}>
                Profile complete!
              </h3>
              <p style={{ margin: `0 0 ${space[4]}px`, fontSize: font.size.md, color: '#047857' }}>
                Your deal flow is fully personalized. Explore matched founders now.
              </p>
              <Link
                href="/investor/dashboard"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '12px 24px', borderRadius: radius.md,
                  background: '#059669', color: '#fff',
                  fontSize: font.size.md, fontWeight: font.weight.semibold,
                  textDecoration: 'none',
                }}
              >
                View deal flow <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* Quick link to dashboard even if not done */}
        {!allDone && (
          <div style={{ marginTop: space[6], textAlign: 'center' }}>
            <Link href="/investor/dashboard" style={{ fontSize: font.size.base, color: muted, textDecoration: 'underline' }}>
              Skip for now — explore deal flow →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
