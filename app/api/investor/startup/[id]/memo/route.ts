import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/investor/startup/:id/memo
// Auth required (investor). Generates an AI investment memo for a founder.
// Body: { startup } — the StartupData object already loaded by the deep-dive page.


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth
    const supabase = await createClient()

    const { id: founderId } = await params
    const body = await request.json()
    const { startup, regenerate } = body
    if (!startup) {
      return NextResponse.json({ error: 'startup data required' }, { status: 400 })
    }

    // Check for a cached memo (unless regenerate=true)
    if (!regenerate) {
      const { data: cached } = await supabase
        .from('agent_artifacts')
        .select('content, created_at')
        .eq('user_id', user.id)
        .eq('artifact_type', 'investment_memo')
        .filter('content->>founderId', 'eq', founderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cached?.content) {
        const c = cached.content as { memoHtml: string; memoMd: string; founderId: string }
        return NextResponse.json({ memoHtml: c.memoHtml, memoMd: c.memoMd, cached: true })
      }
    }

    // Fetch investor's name + firm for the memo header
    const { data: investorProfile } = await supabase
      .from('investor_profiles')
      .select('full_name, firm_name')
      .eq('user_id', user.id)
      .single()

    const investorName = investorProfile?.full_name || 'Investor'
    const firmName     = investorProfile?.firm_name  || ''
    const today        = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const dimensionRows = (startup.qScoreBreakdown ?? [])
      .map((d: { category: string; score: number; weight: string }) =>
        `| ${d.category} | ${d.score}/100 | ${d.weight} |`
      ).join('\n')

    const artifactList = Object.entries(startup.artifactCoverage ?? {})
      .map(([k, v]) => `${v ? '✅' : '⬜'} ${k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`)
      .join(' · ')

    const prompt = `You are an experienced venture capital analyst. Write a concise, professional investment memo for the following startup. Use sharp, direct language. No fluff. Be specific about what's compelling AND what's concerning.

---STARTUP DATA---
Company: ${startup.name}
Founder: ${startup.founderName}
Stage: ${startup.stage}
Sector: ${startup.sector}
Location: ${startup.location || 'Unknown'}
Founded: ${startup.founded || 'Unknown'}
Team Size: ${startup.teamSize || 'Unknown'}
Q-Score: ${startup.qScore}/100 (${startup.qScoreGrade}, ${startup.qScorePercentile}th percentile)
Tagline: "${startup.tagline || ''}"
Description: "${startup.description || ''}"

Q-Score Breakdown:
${dimensionRows}

Financials:
${JSON.stringify(startup.financials || {}, null, 2)}

AI Analysis:
Strengths: ${(startup.aiAnalysis?.strengths ?? []).join('; ')}
Risks: ${(startup.aiAnalysis?.risks ?? []).join('; ')}
Recommendations: ${(startup.aiAnalysis?.recommendations ?? []).join('; ')}

Artifacts built by founder: ${artifactList}
---

Write the investment memo in this EXACT structure (use markdown headers):

## Executive Summary
[2-3 sentences: what the company does, stage, key metric or differentiator]

## Investment Thesis
[3-4 sentences: why this could be a strong investment. Be specific to this company's data.]

## Market Opportunity
[2-3 sentences: size of opportunity, why now, why this sector]

## Team Assessment
[2-3 sentences: founder assessment based on Q-Score team dimension and available data]

## Product & Traction
[2-3 sentences: product maturity, evidence of traction or lack thereof]

## Financial Overview
[2-3 sentences: what we know about financials, runway, growth trajectory]

## Key Risks
1. [Risk 1 — be specific to this startup's data, not generic]
2. [Risk 2]
3. [Risk 3]

## Recommendation
**[INVEST / WATCH / PASS]** — [2-3 sentence rationale based on the actual data above. If Q-Score < 50, likely Pass or Watch. If > 70, lean toward Invest or Watch. Be honest about gaps in data.]

---
Be analytical. Avoid superlatives. Cite specific Q-Score dimensions where relevant. If data is missing, say so directly (e.g. "financial data not yet available"). Aim for ~400-500 words total.`

    const memoMd = (await callOpenRouter(
      [{ role: 'user', content: prompt }],
      { maxTokens: 900, temperature: 0.4 },
    )).trim()

    // Build self-contained HTML
    const memoHtml = buildMemoHtml({
      memoMd,
      companyName:  startup.name,
      founderName:  startup.founderName,
      qScore:       startup.qScore,
      stage:        startup.stage,
      sector:       startup.sector,
      investorName,
      firmName,
      today,
      founderId,
    })

    // Save the generated memo to agent_artifacts (investor's own namespace)
    void supabase
      .from('agent_artifacts')
      .insert({
        user_id:       user.id,
        artifact_type: 'investment_memo',
        content: { founderId, memoMd, memoHtml, generatedAt: new Date().toISOString() },
      })

    return NextResponse.json({ memoHtml, memoMd, cached: false })
  } catch (err) {
    log.error('POST /api/investor/startup/[id]/memo', { err })
    return NextResponse.json({ error: 'Failed to generate memo' }, { status: 500 })
  }
}

// ─── HTML builder ─────────────────────────────────────────────────────────────
function buildMemoHtml(opts: {
  memoMd: string; companyName: string; founderName: string; qScore: number;
  stage: string; sector: string; investorName: string; firmName: string;
  today: string; founderId: string;
}): string {
  const { memoMd, companyName, founderName, qScore, stage, sector, investorName, firmName, today } = opts

  const scoreColor   = qScore >= 70 ? '#16A34A' : qScore >= 50 ? '#D97706' : '#DC2626'
  const scoreLabel   = qScore >= 80 ? 'Strong' : qScore >= 65 ? 'Good' : qScore >= 50 ? 'Moderate' : 'Early'
  const scoreBg      = qScore >= 70 ? '#F0FDF4' : qScore >= 50 ? '#FFFBEB' : '#FEF2F2'

  // Parse memoMd into sections for structured rendering
  const mdToHtml = (md: string) => {
    let html = md
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '')               // strip top-level # headers
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<oli>$1</oli>')
    // Wrap <li> groups in <ul>
    html = html.replace(/((<li>[\s\S]*?<\/li>\n?)+)/g, '<ul>$1</ul>')
    html = html.replace(/((<oli>[\s\S]*?<\/oli>\n?)+)/g, (_, g: string) => '<ol>' + g.replace(/<\/?oli>/g, (m: string) => m.replace('oli', 'li')) + '</ol>')
    // Wrap remaining lines in <p>
    html = html.replace(/^(?!<h[23]|<ul|<ol|<li|<\/ul|<\/ol)(.+)$/gm, '<p>$1</p>')
    html = html.replace(/<p>\s*<\/p>/g, '')
    return html
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Investment Memo — ${companyName}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    max-width: 820px; margin: 0 auto;
    padding: 56px 48px 80px;
    color: #1a1714; background: #fff;
    font-size: 14px; line-height: 1.75;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  /* ── Cover ────────────────────────────────────── */
  .cover {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding-bottom: 24px; margin-bottom: 28px;
    border-bottom: 2px solid #1a1714;
  }
  .cover-left {}
  .cover-eyebrow {
    font-family: Arial, sans-serif; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.18em; color: #8A867C;
    margin: 0 0 8px;
  }
  .cover-company {
    font-size: 28px; font-weight: 700; letter-spacing: -0.03em;
    color: #1a1714; margin: 0 0 4px;
  }
  .cover-founder { font-family: Arial, sans-serif; font-size: 13px; color: #8A867C; margin: 0; }
  .cover-meta {
    font-family: Arial, sans-serif; font-size: 12px; color: #8A867C;
    text-align: right;
  }
  .cover-meta p { margin: 0; line-height: 1.6; }
  /* ── Q-Score block ─────────────────────────────── */
  .qscore-block {
    display: flex; align-items: center; gap: 20px;
    background: ${scoreBg}; border: 1px solid ${scoreColor}30;
    border-left: 4px solid ${scoreColor};
    border-radius: 10px; padding: 16px 20px; margin-bottom: 28px;
  }
  .qscore-num {
    font-size: 52px; font-weight: 300; color: ${scoreColor};
    letter-spacing: -0.05em; line-height: 1;
  }
  .qscore-sub { font-family: Arial, sans-serif; }
  .qscore-sub .label { font-size: 11px; font-weight: 700; color: ${scoreColor}; text-transform: uppercase; letter-spacing: 0.1em; }
  .qscore-sub .grade { font-size: 13px; color: #3D3A35; margin-top: 2px; }
  .tags { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }
  .tag {
    font-family: Arial, sans-serif; font-size: 11px; font-weight: 600;
    padding: 3px 10px; border-radius: 999px; border: 1px solid;
  }
  .tag-stage  { background: #F0EDE6; color: #6B6560; border-color: #D5D0C8; }
  .tag-sector { background: #EFF6FF; color: #2563EB; border-color: #BFDBFE; }
  /* ── Sections ──────────────────────────────────── */
  h2 {
    font-family: Arial, sans-serif; font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.14em; color: #8A867C;
    margin: 36px 0 12px; padding-top: 14px;
    border-top: 1px solid #2563EB;
    border-top-width: 2px;
  }
  h3 {
    font-size: 15px; font-weight: 700; color: #1a1714;
    margin: 20px 0 8px; letter-spacing: -0.01em;
  }
  p { margin: 0 0 12px; color: #3D3A35; }
  ul { margin: 0 0 12px; padding-left: 22px; }
  ol { margin: 0 0 12px; padding-left: 22px; }
  li { margin-bottom: 5px; color: #3D3A35; }
  strong { color: #1a1714; }
  em { color: #5a5650; }
  /* ── Footer ────────────────────────────────────── */
  .footer {
    margin-top: 56px; padding-top: 16px;
    border-top: 1px solid #E2DDD5;
    font-family: Arial, sans-serif; font-size: 11px; color: #8A867C;
    display: flex; justify-content: space-between; gap: 12;
  }
  @media print {
    body { padding: 24px 32px; }
    .qscore-block { -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>

<!-- Cover -->
<div class="cover">
  <div class="cover-left">
    <p class="cover-eyebrow">Investment Memo</p>
    <p class="cover-company">${companyName}</p>
    <p class="cover-founder">Founder: ${founderName}</p>
  </div>
  <div class="cover-meta">
    <p>${today}</p>
    ${firmName ? `<p>${firmName}</p>` : ''}
    <p>${investorName}</p>
  </div>
</div>

<!-- Q-Score callout -->
<div class="qscore-block">
  <div class="qscore-num">${qScore}</div>
  <div class="qscore-sub">
    <div class="label">Q-Score</div>
    <div class="grade">${scoreLabel} · Edge Alpha Assessment</div>
  </div>
  <div class="tags">
    <span class="tag tag-stage">${stage}</span>
    <span class="tag tag-sector">${sector}</span>
  </div>
</div>

<!-- Body -->
${mdToHtml(memoMd)}

<!-- Footer -->
<div class="footer">
  <span>Confidential — prepared for ${firmName || investorName} internal use only</span>
  <span>Edge Alpha · edgealpha.ai · ${today}</span>
</div>

</body>
</html>`
}
