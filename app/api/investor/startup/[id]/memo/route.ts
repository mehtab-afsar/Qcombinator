import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/investor/startup/:id/memo
// Auth required (investor). Generates an AI investment memo for a founder.
// Body: { startup } — the StartupData object already loaded by the deep-dive page.


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: founderId } = await params
    const { startup } = await request.json()
    if (!startup) {
      return NextResponse.json({ error: 'startup data required' }, { status: 400 })
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

    return NextResponse.json({ memoHtml, memoMd })
  } catch (err) {
    console.error('Memo generation error:', err)
    return NextResponse.json({ error: 'Failed to generate memo' }, { status: 500 })
  }
}

// ─── HTML builder ─────────────────────────────────────────────────────────────
function buildMemoHtml(opts: {
  memoMd: string; companyName: string; founderName: string; qScore: number;
  stage: string; sector: string; investorName: string; firmName: string;
  today: string; founderId: string;
}): string {
  const { memoMd, companyName, founderName, qScore, stage, sector, investorName, firmName, today, founderId } = opts

  // Convert basic markdown to HTML (headers, bold, lists)
  const mdToHtml = (md: string) =>
    md
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      .replace(/((<li>.*<\/li>\n?)+)/g, '<ol>$1</ol>')
      .replace(/^(?!<h2|<ol|<li|<strong)(.+)$/gm, '<p>$1</p>')
      .replace(/<p><\/p>/g, '')

  const scoreColor = qScore >= 70 ? '#16A34A' : qScore >= 50 ? '#D97706' : '#DC2626'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Investment Memo — ${companyName}</title>
<style>
  body { font-family: 'Georgia', serif; max-width: 800px; margin: 0 auto; padding: 48px 32px 80px; color: #18160F; background: #fff; font-size: 14px; line-height: 1.7; }
  .header { border-bottom: 2px solid #18160F; padding-bottom: 20px; margin-bottom: 32px; }
  .header h1 { font-size: 22px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.02em; }
  .meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; font-size: 12px; color: #8A867C; font-family: 'Arial', sans-serif; }
  .badge { padding: 2px 10px; border-radius: 999px; border: 1px solid; font-weight: 600; font-family: 'Arial', sans-serif; font-size: 11px; }
  .q-badge { background: ${scoreColor}15; color: ${scoreColor}; border-color: ${scoreColor}60; }
  .stage-badge { background: #F0EDE6; color: #8A867C; border-color: #E2DDD5; }
  .sector-badge { background: #EFF6FF; color: #2563EB; border-color: #BFDBFE; }
  h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #18160F; margin: 28px 0 8px; border-bottom: 1px solid #E2DDD5; padding-bottom: 6px; }
  p { margin: 0 0 10px; color: #3D3A35; }
  ol { margin: 0 0 10px; padding-left: 20px; }
  li { margin-bottom: 6px; color: #3D3A35; }
  strong { color: #18160F; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #E2DDD5; font-size: 11px; color: #8A867C; font-family: 'Arial', sans-serif; display: flex; justify-content: space-between; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
    <div>
      <p style="margin:0;font-size:11px;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.15em;color:#8A867C;font-weight:600">Investment Memo</p>
      <h1>${companyName}</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#8A867C;font-family:Arial,sans-serif">Founder: ${founderName}</p>
    </div>
    <div style="text-align:right;font-family:Arial,sans-serif;font-size:12px;color:#8A867C">
      <p style="margin:0">${today}</p>
      <p style="margin:2px 0 0">${firmName ? firmName + ' · ' : ''}${investorName}</p>
    </div>
  </div>
  <div class="meta">
    <span class="badge q-badge">Q-Score: ${qScore}/100</span>
    <span class="badge stage-badge">${stage}</span>
    <span class="badge sector-badge">${sector}</span>
    <span style="font-size:11px;color:#8A867C;font-family:Arial,sans-serif;align-self:center">Powered by Edge Alpha · edgealpha.ai/p/${founderId}</span>
  </div>
</div>

${mdToHtml(memoMd)}

<div class="footer">
  <span>Confidential — prepared for internal use only</span>
  <span>Generated by Edge Alpha AI · ${today}</span>
</div>
</body>
</html>`
}
