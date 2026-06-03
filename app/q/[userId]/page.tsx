import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAdminClient } from '@/lib/supabase/server'
import { APP_NAME, APP_URL } from '@/lib/constants/app'

interface Props {
  params: Promise<{ userId: string }>
}

async function getBadgeData(userId: string) {
  const admin = getAdminClient()

  const [profileRes, scoreRes] = await Promise.all([
    admin
      .from('founder_profiles')
      .select('full_name, startup_name, stage, industry')
      .eq('user_id', userId)
      .single(),
    admin
      .from('qscore_history')
      .select('overall_score, calculated_at')
      .eq('user_id', userId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  if (profileRes.error || !profileRes.data) return null

  return {
    name:        profileRes.data.full_name ?? 'Founder',
    startupName: profileRes.data.startup_name ?? 'Stealth Startup',
    stage:       profileRes.data.stage ?? null,
    score:       scoreRes.data?.overall_score ?? 0,
    calculatedAt: scoreRes.data?.calculated_at ?? null,
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params
  const data = await getBadgeData(userId)
  if (!data) return { title: `${APP_NAME} | Q-Score` }

  const title = `${data.name} — Q-Score ${data.score}/100 | ${APP_NAME}`
  const description = `${data.name} from ${data.startupName} has a Q-Score of ${data.score}/100 on ${APP_NAME}. Q-Score is the quantified startup readiness metric used by investors to evaluate founders.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${APP_URL}/q/${userId}`,
      siteName: APP_NAME,
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#16a34a'
  if (score >= 65) return '#2563eb'
  if (score >= 40) return '#d97706'
  return '#6b7280'
}

function getScoreGrade(score: number): string {
  if (score >= 80) return 'Investor-Ready'
  if (score >= 65) return 'Deal-Flow Eligible'
  if (score >= 40) return 'In Progress'
  return 'Getting Started'
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const filled = (score / 100) * circumference

  return (
    <svg width={128} height={128} viewBox="0 0 128 128">
      <circle cx={64} cy={64} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={10} />
      <circle
        cx={64} cy={64} r={radius}
        fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${filled} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 64 64)"
      />
      <text x={64} y={60} textAnchor="middle" fontSize={28} fontWeight={800} fill={color} fontFamily="system-ui, sans-serif">
        {score}
      </text>
      <text x={64} y={78} textAnchor="middle" fontSize={11} fill="#9ca3af" fontFamily="system-ui, sans-serif">
        / 100
      </text>
    </svg>
  )
}

export default async function QScoreBadgePage({ params }: Props) {
  const { userId } = await params
  const data = await getBadgeData(userId)

  if (!data) notFound()

  const color = getScoreColor(data.score)
  const grade = getScoreGrade(data.score)
  const dateStr = data.calculatedAt
    ? new Date(data.calculatedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  return (
    <div style={{
      minHeight: '100vh', background: '#f9fafb',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Badge card */}
      <div style={{
        background: '#fff', borderRadius: 24,
        boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
        padding: '40px 48px', maxWidth: 440, width: '100%',
        textAlign: 'center',
      }}>
        {/* Brand */}
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#7c3aed', marginBottom: 28 }}>
          {APP_NAME} · Q-Score
        </div>

        {/* Score ring */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <ScoreRing score={data.score} color={color} />
        </div>

        {/* Grade */}
        <div style={{
          display: 'inline-block', padding: '4px 14px',
          background: `${color}15`, borderRadius: 99,
          fontSize: 12, fontWeight: 700, color, marginBottom: 20,
        }}>
          {grade}
        </div>

        {/* Founder info */}
        <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 4 }}>
          {data.name}
        </div>
        <div style={{ fontSize: 15, color: '#6b7280', marginBottom: 6 }}>
          {data.startupName}
        </div>
        {data.stage && (
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 0, textTransform: 'capitalize' }}>
            {data.stage.replace('-', ' ')} stage
          </div>
        )}

        {/* Date */}
        {dateStr && (
          <div style={{ fontSize: 11, color: '#d1d5db', marginTop: 20 }}>
            Calculated {dateStr}
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '28px 0' }} />

        {/* What is Q-Score */}
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>
          Q-Score is the quantified startup readiness metric used by investors on {APP_NAME} to evaluate founders across 6 dimensions: market, product, go-to-market, financial, team, and traction.
        </p>

        {/* CTA */}
        <Link
          href={`${APP_URL}/founder/onboarding`}
          style={{
            display: 'block', padding: '13px 24px',
            background: '#7c3aed', color: '#fff',
            borderRadius: 12, fontSize: 14, fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Get your Q-Score →
        </Link>
      </div>

      {/* Footer */}
      <p style={{ marginTop: 24, fontSize: 12, color: '#9ca3af' }}>
        Powered by{' '}
        <Link href={APP_URL} style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>
          {APP_NAME}
        </Link>
      </p>
    </div>
  )
}
