import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/agents/felix/invoice
// Body: { customerEmail, customerName, amount, description, currency?, dueDate?, sendEmail? }
// Creates a Stripe invoice and optionally finalizes + sends it via Stripe's email.
// Falls back to Resend if no Stripe key but RESEND_API_KEY is set.

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const {
      customerEmail,
      customerName,
      amount,         // in dollars (e.g. 1500)
      description,
      currency = 'usd',
      dueDate,        // ISO date string e.g. "2026-03-15"
      sendEmail = true,
    } = await request.json()

    if (!customerEmail || !amount || !description) {
      return NextResponse.json({ error: 'customerEmail, amount, and description are required' }, { status: 400 })
    }

    const amountCents = Math.round(Number(amount) * 100)
    if (isNaN(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
    }

    // Get founder profile for company name
    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('startup_name, full_name')
      .eq('user_id', user.id)
      .single()

    const companyName = (profile?.startup_name as string | undefined) ?? 'Your Company'
    const founderName = (profile?.full_name as string | undefined) ?? 'Founder'
    const founderEmail = user.email!

    const stripeKey = process.env.STRIPE_SECRET_KEY

    if (stripeKey) {
      // ── Stripe flow ─────────────────────────────────────────────────────────
      const stripeBase = 'https://api.stripe.com/v1'
      const stripeHeaders = {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }

      function stripeParams(obj: Record<string, string | number | boolean | undefined>): string {
        return Object.entries(obj)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      }

      // 1. Find or create customer
      const searchRes = await fetch(`${stripeBase}/customers/search?query=email:'${encodeURIComponent(customerEmail)}'&limit=1`, {
        headers: { 'Authorization': `Bearer ${stripeKey}` },
      })
      const searchData = await searchRes.json() as { data?: { id: string }[] }
      let customerId = searchData.data?.[0]?.id

      if (!customerId) {
        const custRes = await fetch(`${stripeBase}/customers`, {
          method: 'POST',
          headers: stripeHeaders,
          body: stripeParams({ email: customerEmail, name: customerName || customerEmail }),
        })
        const custData = await custRes.json() as { id?: string; error?: { message: string } }
        if (!custData.id) {
          return NextResponse.json({ error: custData.error?.message ?? 'Failed to create Stripe customer' }, { status: 500 })
        }
        customerId = custData.id
      }

      // 2. Create invoice
      const dueDateUnix = dueDate ? Math.floor(new Date(dueDate).getTime() / 1000) : undefined
      const invoiceRes = await fetch(`${stripeBase}/invoices`, {
        method: 'POST',
        headers: stripeHeaders,
        body: stripeParams({
          customer: customerId,
          collection_method: 'send_invoice',
          days_until_due: dueDateUnix ? undefined : 30,
          due_date: dueDateUnix,
          description: `${description} — ${companyName}`,
        }),
      })
      const invoiceData = await invoiceRes.json() as { id?: string; error?: { message: string } }
      if (!invoiceData.id) {
        return NextResponse.json({ error: invoiceData.error?.message ?? 'Failed to create invoice' }, { status: 500 })
      }

      // 3. Add line item
      await fetch(`${stripeBase}/invoiceitems`, {
        method: 'POST',
        headers: stripeHeaders,
        body: stripeParams({
          customer: customerId,
          invoice: invoiceData.id,
          amount: amountCents,
          currency,
          description,
        }),
      })

      // 4. Finalize + send
      let invoiceUrl: string | null = null
      if (sendEmail) {
        const finalRes = await fetch(`${stripeBase}/invoices/${invoiceData.id}/finalize`, {
          method: 'POST',
          headers: stripeHeaders,
        })
        const finalData = await finalRes.json() as { hosted_invoice_url?: string }
        invoiceUrl = finalData.hosted_invoice_url ?? null

        await fetch(`${stripeBase}/invoices/${invoiceData.id}/send`, {
          method: 'POST',
          headers: stripeHeaders,
        })
      }

      // Log activity
      try {
        await supabase.from('agent_activity').insert({
          user_id: user.id,
          agent_id: 'felix',
          action_type: 'invoice_created',
          description: `Invoice for $${amount} sent to ${customerName || customerEmail} — ${description}`,
          metadata: { customerEmail, amount, currency, stripeInvoiceId: invoiceData.id, sent: sendEmail },
        })
      } catch { /* non-critical */ }

      return NextResponse.json({
        success: true,
        invoiceId: invoiceData.id,
        invoiceUrl,
        sent: sendEmail,
        platform: 'stripe',
      })
    }

    // ── Resend fallback (no Stripe key) ──────────────────────────────────────
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ error: 'Neither STRIPE_SECRET_KEY nor RESEND_API_KEY is configured' }, { status: 503 })
    }

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`
    const dueDateDisplay = dueDate
      ? new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const invoiceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background: #F9F7F2; margin: 0; padding: 40px 20px; }
  .card { background: #fff; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #E2DDD5; overflow: hidden; }
  .header { background: #18160F; padding: 28px 32px; }
  .body { padding: 28px 32px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E2DDD5; font-size: 14px; }
  .row:last-child { border-bottom: none; font-weight: 700; font-size: 16px; }
  .label { color: #8A867C; }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <p style="color:rgba(249,247,242,0.55);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;margin:0 0 6px">Invoice</p>
    <p style="color:#F9F7F2;font-size:22px;font-weight:800;margin:0">${companyName}</p>
    <p style="color:rgba(249,247,242,0.55);font-size:12px;margin:4px 0 0">${invoiceNumber}</p>
  </div>
  <div class="body">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px">
      <div><p style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8A867C;margin-bottom:4px">Bill To</p>
           <p style="font-size:14px;color:#18160F">${customerName || customerEmail}</p>
           <p style="font-size:12px;color:#8A867C">${customerEmail}</p></div>
      <div style="text-align:right">
           <p style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8A867C;margin-bottom:4px">Due Date</p>
           <p style="font-size:14px;color:#18160F">${dueDateDisplay}</p></div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead><tr style="background:#F9F7F2">
        <th style="padding:8px 12px;text-align:left;font-size:10px;color:#8A867C;font-weight:700;text-transform:uppercase">Description</th>
        <th style="padding:8px 12px;text-align:right;font-size:10px;color:#8A867C;font-weight:700;text-transform:uppercase">Amount</th>
      </tr></thead>
      <tbody>
        <tr><td style="padding:12px;font-size:14px;color:#18160F;border-bottom:1px solid #E2DDD5">${description}</td>
            <td style="padding:12px;font-size:14px;color:#18160F;text-align:right;border-bottom:1px solid #E2DDD5">$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
        <tr><td style="padding:12px;font-size:14px;font-weight:700;color:#18160F">Total</td>
            <td style="padding:12px;font-size:16px;font-weight:800;color:#18160F;text-align:right">$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency.toUpperCase()}</td></tr>
      </tbody>
    </table>
    <p style="font-size:12px;color:#8A867C;margin-top:20px">To pay, please reply to this email. Questions? Contact ${founderName} at ${founderEmail}.</p>
  </div>
</div>
</body>
</html>`

    if (sendEmail) {
      const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${founderName} via ${companyName} <no-reply@edgealpha.ai>`,
          to: [customerEmail],
          reply_to: founderEmail,
          subject: `Invoice ${invoiceNumber} — ${companyName} ($${Number(amount).toLocaleString()})`,
          html: invoiceHtml,
        }),
      })

      if (!sendRes.ok) {
        return NextResponse.json({ error: 'Failed to send invoice email' }, { status: 500 })
      }
    }

    // Log
    try {
      await supabase.from('agent_activity').insert({
        user_id: user.id,
        agent_id: 'felix',
        action_type: 'invoice_created',
        description: `Invoice ${invoiceNumber} for $${amount} sent to ${customerName || customerEmail}`,
        metadata: { customerEmail, amount, currency, invoiceNumber, sent: sendEmail },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({
      success: true,
      invoiceNumber,
      html: invoiceHtml,
      sent: sendEmail,
      platform: 'resend',
    })
  } catch (err) {
    console.error('Felix invoice error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
