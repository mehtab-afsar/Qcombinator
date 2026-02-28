import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/leo/privacy-policy
// Generates a Privacy Policy + Terms of Service for the startup, downloadable as HTML.
// Body: { docType: 'privacy' | 'tos' | 'both', collectsPayments?, hasUserAccounts?, jurisdiction?, extraContext? }

function esc(s: string) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      docType = 'both',
      collectsPayments = false,
      hasUserAccounts = true,
      jurisdiction = 'Delaware, USA',
      extraContext,
    } = body as {
      docType?: 'privacy' | 'tos' | 'both'
      collectsPayments?: boolean
      hasUserAccounts?: boolean
      jurisdiction?: string
      extraContext?: string
    }

    const { data: fp } = await supabase
      .from('founder_profiles')
      .select('startup_name, website, full_name, industry, startup_profile_data')
      .eq('user_id', user.id)
      .single()

    const company = fp?.startup_name ?? 'The Company'
    const founder = fp?.full_name ?? 'The Founder'
    const website = fp?.website ?? 'https://example.com'
    const sp = (fp?.startup_profile_data ?? {}) as Record<string, unknown>
    const dataCollected = hasUserAccounts ? 'name, email address, account credentials, usage data' : 'email address, usage data, cookies'

    const genPrivacy = docType === 'privacy' || docType === 'both'
    const genTos = docType === 'tos' || docType === 'both'
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    // Build privacy policy HTML
    let privacyHtml = ''
    if (genPrivacy) {
      const raw = await callOpenRouter(
        [
          {
            role: 'system',
            content: `You are Leo, a startup legal advisor. Generate a complete, legally sound Privacy Policy.
Return ONLY the full privacy policy text as plain prose sections (NO JSON). Use clear section headings in ALL CAPS.
Include: Information We Collect, How We Use Information, Information Sharing, Data Retention, Security, Cookies, User Rights (GDPR/CCPA), Contact.
Keep it founder-friendly: plain English, but legally complete.
Do NOT add disclaimers about "consult a lawyer" — just produce the document.`,
          },
          {
            role: 'user',
            content: `Generate Privacy Policy for:
Company: ${company}
Website: ${website}
Jurisdiction: ${jurisdiction}
Has user accounts: ${hasUserAccounts}
Collects payments: ${collectsPayments}
Data collected: ${dataCollected}
Industry: ${fp?.industry ?? 'technology'}
${extraContext ? `Additional context: ${extraContext}` : ''}
Effective date: ${today}`,
          },
        ],
        { maxTokens: 2000, temperature: 0.2 }
      )
      privacyHtml = raw
    }

    // Build ToS HTML
    let tosHtml = ''
    if (genTos) {
      const raw = await callOpenRouter(
        [
          {
            role: 'system',
            content: `You are Leo, a startup legal advisor. Generate a complete, legally sound Terms of Service.
Return ONLY the full terms text as plain prose sections (NO JSON). Use clear section headings in ALL CAPS.
Include: Acceptance of Terms, Description of Service, User Accounts, Acceptable Use, Intellectual Property, Disclaimers, Limitation of Liability, Termination, Governing Law, Changes to Terms, Contact.
Keep it founder-friendly: plain English, but legally complete.
Do NOT add disclaimers about "consult a lawyer" — just produce the document.`,
          },
          {
            role: 'user',
            content: `Generate Terms of Service for:
Company: ${company}
Website: ${website}
Jurisdiction: ${jurisdiction}
Has user accounts: ${hasUserAccounts}
Collects payments: ${collectsPayments}
Industry: ${fp?.industry ?? 'technology'}
Founder contact: ${user.email ?? founder}
${(sp.solution as string) ? `Product: ${sp.solution as string}` : ''}
${extraContext ? `Additional context: ${extraContext}` : ''}
Effective date: ${today}`,
          },
        ],
        { maxTokens: 2000, temperature: 0.2 }
      )
      tosHtml = raw
    }

    // Build combined HTML document
    function docSection(title: string, content: string) {
      const formatted = content
        .split('\n')
        .map(line => {
          const trimmed = line.trim()
          if (!trimmed) return '<br>'
          // Detect ALL CAPS headings (3+ words or single short heading)
          if (/^[A-Z][A-Z\s\/&():,0-9-]{4,}$/.test(trimmed)) {
            return `<h2 style="font-size:14px;font-weight:700;color:#18160F;margin:24px 0 8px;text-transform:uppercase;letter-spacing:0.05em">${esc(trimmed)}</h2>`
          }
          return `<p style="font-size:13px;color:#18160F;line-height:1.75;margin:0 0 10px">${esc(trimmed)}</p>`
        })
        .join('\n')

      return `
        <div style="margin-bottom:60px">
          <h1 style="font-size:22px;font-weight:800;color:#18160F;margin:0 0 6px">${esc(title)}</h1>
          <p style="font-size:12px;color:#8A867C;margin:0 0 32px">Effective ${today} · ${esc(company)} · ${esc(website)}</p>
          ${formatted}
        </div>`
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(company)} — Legal Documents</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:700px;margin:0 auto;padding:48px 32px;background:#F9F7F2;color:#18160F">
  <div style="background:#fff;borderRadius:16px;padding:48px;border:1px solid #E2DDD5;border-radius:16px">
    <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#8A867C;margin:0 0 24px">${esc(company)} · Legal Documents</p>
    ${genPrivacy ? docSection('Privacy Policy', privacyHtml) : ''}
    ${genTos ? docSection('Terms of Service', tosHtml) : ''}
    <div style="border-top:1px solid #E2DDD5;padding-top:24px;margin-top:24px">
      <p style="font-size:11px;color:#8A867C;margin:0">Generated by Edge Alpha for ${esc(company)} on ${today}. This is a starting point — review with legal counsel before publishing.</p>
    </div>
  </div>
</body>
</html>`

    await supabase.from('agent_activity').insert({
      user_id: user.id,
      agent_id: 'leo',
      action_type: 'legal_docs_generated',
      description: `Legal documents generated: ${docType === 'both' ? 'Privacy Policy + ToS' : docType === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}`,
      metadata: { docType, company, jurisdiction },
    }).then(() => {})

    return NextResponse.json({ html, docType, company })
  } catch (err) {
    console.error('Leo privacy policy error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
