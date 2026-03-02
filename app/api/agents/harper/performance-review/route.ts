import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/harper/performance-review
// Body: { employeeName?: string, role?: string, reviewPeriod?: string }
// Returns: { review: { html: string, framework: { categories[], ratingScale,
//   selfAssessment[], managerQuestions[], developmentPlan, calibration } } }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({})) as {
      employeeName?: string; role?: string; reviewPeriod?: string
    }

    const admin = getAdmin()

    const [{ data: hiringArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'harper')
        .eq('artifact_type', 'hiring_plan').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const stage = profileData?.stage as string ?? 'Seed'

    const hiring = hiringArt?.content as Record<string, unknown> | null
    const teamValues = (hiring?.cultureValues as string[] | undefined)?.slice(0, 3).join(', ') ?? ''

    const employeeName = body.employeeName ?? 'Team Member'
    const role = body.role ?? 'Engineer'
    const reviewPeriod = body.reviewPeriod ?? 'Q1 2026'

    const prompt = `You are Harper, a people operations expert. Create a performance review framework for ${startupName}.

COMPANY: ${startupName} (${stage} stage)
EMPLOYEE: ${employeeName} — ${role}
REVIEW PERIOD: ${reviewPeriod}
TEAM VALUES: ${teamValues || 'excellence, ownership, growth'}

Build a comprehensive but lean performance review framework suitable for an early-stage startup. Generate a complete HTML document and structured framework data.

Return JSON only (no markdown):
{
  "framework": {
    "categories": [
      {
        "category": "review category (e.g. Results & Impact, Growth & Learning, Team Collaboration, Leadership)",
        "weight": 25,
        "criteria": ["specific criterion 1", "criterion 2", "criterion 3"],
        "ratingDescriptors": {
          "1": "what 1/5 looks like",
          "3": "what 3/5 looks like",
          "5": "what 5/5 looks like"
        }
      }
    ],
    "ratingScale": "description of 1-5 rating scale",
    "selfAssessment": ["self-reflection question 1", "question 2", "question 3", "question 4"],
    "managerQuestions": ["manager-directed question 1", "question 2", "question 3"],
    "developmentPlan": {
      "strengthToLeverage": "top strength to double down on",
      "growthArea": "most important development focus",
      "resources": ["resource or action 1", "resource 2"],
      "successMetric": "how to measure growth in 90 days"
    },
    "calibration": "guidance for calibrating ratings across the team"
  },
  "html": "<!DOCTYPE html><html>...</html>"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1200 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let review: Record<string, unknown> = {}
    try { review = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate performance review' }, { status: 500 })
    }

    // Generate proper HTML if not provided
    if (!review.html || String(review.html).length < 200) {
      const fw = review.framework as Record<string, unknown> | undefined
      const cats = fw?.categories as { category: string; weight: number; criteria: string[] }[] | undefined ?? []
      const selfQ = fw?.selfAssessment as string[] | undefined ?? []
      const mgrQ = fw?.managerQuestions as string[] | undefined ?? []
      const dev = fw?.developmentPlan as { strengthToLeverage?: string; growthArea?: string; successMetric?: string } | undefined

      review.html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Performance Review — ${employeeName}</title>
<style>
  body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #18160F; line-height: 1.6; }
  h1 { font-size: 28px; margin-bottom: 4px; } .meta { color: #8A867C; font-size: 14px; margin-bottom: 32px; }
  h2 { font-size: 18px; border-bottom: 2px solid #E2DDD5; padding-bottom: 6px; margin-top: 32px; }
  .category { background: #F9F7F2; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  .cat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .cat-name { font-weight: 700; font-size: 16px; } .weight { color: #8A867C; font-size: 13px; }
  .criteria { color: #8A867C; font-size: 13px; margin-bottom: 10px; }
  .rating-row { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
  .rating-box { width: 36px; height: 36px; border: 1px solid #E2DDD5; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; }
  .question { background: #F9F7F2; border-left: 3px solid #2563EB; padding: 10px 14px; margin-bottom: 10px; font-size: 14px; border-radius: 0 6px 6px 0; }
  .dev-box { background: #EFF6FF; border-radius: 8px; padding: 16px; }
  .footer { margin-top: 48px; border-top: 1px solid #E2DDD5; padding-top: 16px; color: #8A867C; font-size: 12px; }
  .sig { display: flex; gap: 48px; margin-top: 32px; }
  .sig-line { flex: 1; border-bottom: 1px solid #18160F; padding-top: 32px; font-size: 12px; color: #8A867C; }
</style>
</head>
<body>
<h1>Performance Review</h1>
<p class="meta">${employeeName} &bull; ${role} &bull; ${reviewPeriod} &bull; ${startupName}</p>

<h2>Review Categories</h2>
${cats.map(c => `<div class="category">
  <div class="cat-header"><span class="cat-name">${c.category}</span><span class="weight">Weight: ${c.weight}%</span></div>
  <p class="criteria">${c.criteria.join(' · ')}</p>
  <div class="rating-row">${[1,2,3,4,5].map(n => `<div class="rating-box">${n}</div>`).join('')}<span style="margin-left:8px;font-size:13px;color:#8A867C">Rating (1-5)</span></div>
  <p style="margin-top:10px;font-size:13px;color:#8A867C">Comments:</p>
  <div style="min-height:60px;border:1px solid #E2DDD5;border-radius:6px;padding:8px;font-size:13px;color:#8A867C">Write feedback here…</div>
</div>`).join('')}

<h2>Self-Assessment Questions</h2>
${selfQ.map(q => `<div class="question">${q}</div>`).join('')}

<h2>Manager Questions</h2>
${mgrQ.map(q => `<div class="question" style="border-color:#16A34A">${q}</div>`).join('')}

${dev ? `<h2>Development Plan</h2>
<div class="dev-box">
  <p><strong>Strength to leverage:</strong> ${dev.strengthToLeverage ?? ''}</p>
  <p><strong>Growth area:</strong> ${dev.growthArea ?? ''}</p>
  <p><strong>Success metric (90 days):</strong> ${dev.successMetric ?? ''}</p>
</div>` : ''}

<div class="sig">
  <div class="sig-line">Employee Signature &amp; Date</div>
  <div class="sig-line">Manager Signature &amp; Date</div>
</div>

<div class="footer">Generated by Harper · ${startupName} · ${reviewPeriod}</div>
</body></html>`
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'harper', action_type: 'performance_review_created',
      action_data: { startupName, employeeName, role, reviewPeriod },
    }).maybeSingle()

    return NextResponse.json({ review })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
