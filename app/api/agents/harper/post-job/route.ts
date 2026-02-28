import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/agents/harper/post-job
// Body: { role: { role, salaryRange, equity, responsibilities?, requirements? }, boards: string[] }
// Generates board-specific job posting formats and tracks what's been posted.
// Boards: "wellfound", "linkedin", "indeed", "hn", "remoteok"
// Returns per-board post content + tracking record

const HN_HEADER = `Ask HN: Who is hiring? (submission format)`

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

interface RoleInput {
  role: string
  salaryRange?: string
  equity?: string
  responsibilities?: string[]
  requirements?: string[]
  whyNow?: string
}

function buildHNFormat(role: RoleInput, startupName: string, founderEmail: string): string {
  const reqs = role.requirements?.slice(0, 4).join('; ') ?? 'See full JD'
  const resp = role.responsibilities?.slice(0, 3).join('; ') ?? ''
  const comp = [role.salaryRange, role.equity].filter(Boolean).join(' + ')
  return `${startupName} | ${role.role} | REMOTE (or specify location) | ${comp || 'Competitive'}

${startupName} is looking for a ${role.role}. ${role.whyNow || ''}

Requirements: ${reqs}
${resp ? `\nWhat you'll do: ${resp}` : ''}

Apply: ${founderEmail}`
}

function buildLinkedInFormat(role: RoleInput, startupName: string, founderEmail: string): string {
  const bullets = (arr?: string[]) => arr?.map(r => `• ${r}`).join('\n') ?? ''
  return `**${role.role} at ${startupName}**

We're hiring a ${role.role} to help us ${role.whyNow || 'scale our product and team'}.

**Compensation:** ${role.salaryRange ?? 'Competitive'} + ${role.equity ?? 'Equity'}

**What you'll do:**
${bullets(role.responsibilities) || '• Drive core product initiatives\n• Work directly with founders'}

**What we're looking for:**
${bullets(role.requirements) || '• Relevant experience in the field\n• Strong communication skills'}

Interested? Message me or apply at ${founderEmail}`
}

function buildWellfoundFormat(role: RoleInput, startupName: string): string {
  return `We're ${startupName}, and we're hiring a ${role.role}.

${role.whyNow || 'This is a key early hire that will shape how we build and grow.'}

**Role:** ${role.role}
**Salary:** ${role.salaryRange ?? 'Competitive'}
**Equity:** ${role.equity ?? '0.1–0.5%'}

**Responsibilities:**
${role.responsibilities?.map(r => `- ${r}`).join('\n') ?? '- Defined by you'}

**Requirements:**
${role.requirements?.map(r => `- ${r}`).join('\n') ?? '- Relevant background'}

We move fast, care about quality, and value ownership. Apply on Wellfound or reach out directly.`
}

function buildIndeedFormat(role: RoleInput, startupName: string): string {
  return `Job Title: ${role.role}
Company: ${startupName}
Job Type: Full-time
Compensation: ${role.salaryRange ?? 'Competitive'} + equity

ABOUT THE ROLE
${role.whyNow || `${startupName} is looking for a ${role.role} to join our growing team.`}

RESPONSIBILITIES
${role.responsibilities?.map(r => `• ${r}`).join('\n') ?? '• Drive key initiatives\n• Work cross-functionally'}

REQUIREMENTS
${role.requirements?.map(r => `• ${r}`).join('\n') ?? '• Relevant experience\n• Strong communicator'}

COMPENSATION & BENEFITS
• Salary: ${role.salaryRange ?? 'Competitive'}
• Equity: ${role.equity ?? 'Available'}
• Remote-friendly`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { role, boards = ['wellfound', 'linkedin', 'hn'] } = await request.json() as { role: RoleInput; boards: string[] }

    if (!role?.role) return NextResponse.json({ error: 'role.role is required' }, { status: 400 })

    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('startup_name, full_name')
      .eq('user_id', user.id)
      .single()

    const startupName = (profile?.startup_name as string | undefined) ?? 'Our Startup'
    const founderEmail = user.email!
    const roleSlug = slugify(role.role)

    // Build per-board content
    const posts: Record<string, string> = {}
    if (boards.includes('hn'))         posts.hn         = buildHNFormat(role, startupName, founderEmail)
    if (boards.includes('linkedin'))   posts.linkedin   = buildLinkedInFormat(role, startupName, founderEmail)
    if (boards.includes('wellfound'))  posts.wellfound  = buildWellfoundFormat(role, startupName)
    if (boards.includes('indeed'))     posts.indeed     = buildIndeedFormat(role, startupName)
    if (boards.includes('remoteok'))   posts.remoteok   = buildIndeedFormat(role, startupName) // same format

    // Board URLs for quick-open
    const boardUrls: Record<string, string> = {
      wellfound: 'https://wellfound.com/jobs/new',
      linkedin:  'https://www.linkedin.com/jobs/post/',
      indeed:    'https://employers.indeed.com/p/post-job',
      hn:        'https://news.ycombinator.com/submit',
      remoteok:  'https://remoteok.com/post-a-job',
    }

    // Track in DB (application link at /apply/userId/roleSlug)
    const applyUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://edgealpha.ai'}/apply/${user.id}/${roleSlug}`

    const trackResult: Record<string, string> = {}
    for (const board of boards) {
      trackResult[board] = 'ready' // mark as "ready to post"
    }

    // Log activity
    try {
      await supabase.from('agent_activity').insert({
        user_id:     user.id,
        agent_id:    'harper',
        action_type: 'job_posting_prepared',
        description: `Job posting content prepared for ${role.role} — ${boards.length} board${boards.length !== 1 ? 's' : ''}`,
        metadata:    { role: role.role, boards, applyUrl },
      })
    } catch { /* non-critical */ }

    // ── Cross-agent: notify Atlas to monitor competitors for similar roles ──
    // Adds a pending_action so Atlas can check if competitors are also hiring
    try {
      await supabase.from('agent_activity').insert({
        user_id:     user.id,
        agent_id:    'atlas',
        action_type: 'competitor_hiring_cue',
        description: `Harper posted "${role.role}" — check if competitors are hiring for similar roles`,
        metadata:    { triggered_by: 'harper', role: role.role, roleSlug },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({
      role: role.role,
      roleSlug,
      posts,
      boardUrls,
      applyUrl,
      boards: trackResult,
      hnHeader: HN_HEADER,
    })
  } catch (err) {
    console.error('Harper post-job error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
