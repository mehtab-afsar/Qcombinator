import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// POST /api/agents/felix/invoice
// Generates a professional HTML invoice from line items.
// Returns the HTML string for client-side download — no PDF generation needed.

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function esc(s: string) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      clientName,
      clientEmail,
      clientCompany,
      lineItems,
      invoiceNumber,
      issueDate,
      dueDate,
      currency = 'USD',
      notes,
    } = body as {
      clientName: string
      clientEmail?: string
      clientCompany?: string
      lineItems: { description: string; quantity: number; unitPrice: number }[]
      invoiceNumber?: string
      issueDate?: string
      dueDate?: string
      currency?: string
      notes?: string
    }

    if (!clientName || !lineItems?.length) {
      return NextResponse.json({ error: 'clientName and lineItems are required' }, { status: 400 })
    }

    const admin = getAdmin()

    // Fetch founder's company info
    const { data: fp } = await admin
      .from('founder_profiles')
      .select('startup_name, full_name, startup_profile_data')
      .eq('user_id', user.id)
      .single()

    const sp = (fp?.startup_profile_data ?? {}) as Record<string, unknown>
    const senderCompany = fp?.startup_name ?? 'Your Company'
    const senderName    = fp?.full_name ?? ''
    const senderEmail   = (sp.email as string) ?? user.email ?? ''

    const invNum  = invoiceNumber ?? `INV-${Date.now().toString().slice(-6)}`
    const issued  = issueDate ?? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const due     = dueDate ?? new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0)
    const total    = subtotal // can extend with tax later

    const rows = lineItems.map(li => {
      const amount = li.quantity * li.unitPrice
      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #E2DDD5;color:#18160F;font-size:13px">${esc(li.description)}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #E2DDD5;color:#8A867C;font-size:13px;text-align:right">${li.quantity}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #E2DDD5;color:#8A867C;font-size:13px;text-align:right">${fmt(li.unitPrice, currency)}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #E2DDD5;color:#18160F;font-weight:600;font-size:13px;text-align:right">${fmt(amount, currency)}</td>
        </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${esc(invNum)}</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F9F7F2; color: #18160F; }
.page { max-width: 720px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
.header { background: #18160F; padding: 36px 40px; display: flex; justify-content: space-between; align-items: flex-start; }
.company { color: #fff; font-size: 20px; font-weight: 800; }
.inv-label { color: #8A867C; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; }
.inv-number { color: #fff; font-size: 28px; font-weight: 700; margin-top: 4px; }
.meta { padding: 32px 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; border-bottom: 1px solid #E2DDD5; }
.meta-block label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #8A867C; margin-bottom: 4px; }
.meta-block p { font-size: 14px; color: #18160F; line-height: 1.5; }
table { width: 100%; border-collapse: collapse; }
th { padding: 10px 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #8A867C; text-align: left; background: #F9F7F2; }
th:not(:first-child) { text-align: right; }
.totals { padding: 24px 40px; }
.total-row { display: flex; justify-content: flex-end; gap: 80px; padding: 8px 0; font-size: 14px; }
.total-row.grand { font-size: 18px; font-weight: 800; border-top: 2px solid #18160F; margin-top: 8px; padding-top: 12px; }
.footer { padding: 24px 40px; background: #F9F7F2; border-top: 1px solid #E2DDD5; }
.notes { font-size: 12px; color: #8A867C; line-height: 1.7; }
@media print {
  body { background: #fff; }
  .page { box-shadow: none; margin: 0; border-radius: 0; }
}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="company">${esc(senderCompany)}</div>
      ${senderEmail ? `<div style="color:#8A867C;font-size:12px;margin-top:4px">${esc(senderEmail)}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div class="inv-label">Invoice</div>
      <div class="inv-number">${esc(invNum)}</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-block">
      <label>Bill To</label>
      <p><strong>${esc(clientName)}</strong>${clientCompany ? `<br>${esc(clientCompany)}` : ''}${clientEmail ? `<br><span style="color:#8A867C">${esc(clientEmail)}</span>` : ''}</p>
    </div>
    <div class="meta-block" style="text-align:right">
      <label>Invoice Date</label>
      <p>${esc(issued)}</p>
      <label style="margin-top:12px;display:block">Due Date</label>
      <p>${esc(due)}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:right">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>${fmt(subtotal, currency)}</span></div>
    <div class="total-row grand"><span>Total Due</span><span>${fmt(total, currency)}</span></div>
  </div>

  <div class="footer">
    ${notes ? `<p class="notes"><strong>Notes:</strong> ${esc(notes)}</p>` : ''}
    <p class="notes" style="margin-top:${notes ? 12 : 0}px">Thank you for your business, ${esc(clientName)}. Please make payment by ${esc(due)}.</p>
    ${senderName ? `<p class="notes" style="margin-top:8px">${esc(senderName)} · ${esc(senderCompany)}</p>` : ''}
    <p style="font-size:10px;color:#8A867C;margin-top:16px;padding-top:12px;border-top:1px solid #E2DDD5">
      Generated with <a href="https://edgealpha.ai" style="color:#2563EB;text-decoration:none">Edge Alpha</a> · Print or save as PDF: Ctrl/Cmd + P
    </p>
  </div>
</div>
</body>
</html>`

    // Log activity
    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'felix',
      action_type: 'invoice_created',
      description: `Invoice ${invNum} created for ${clientName} — ${fmt(total, currency)}`,
      metadata:    { invoiceNumber: invNum, clientName, total, currency, lineCount: lineItems.length },
    })

    return NextResponse.json({ html, invoiceNumber: invNum, total, currency })
  } catch (err) {
    console.error('Felix invoice error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
