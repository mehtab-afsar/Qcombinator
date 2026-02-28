import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/agents/leo/safe
// Body: { safeType: 'post-money' | 'pre-money', investorName, investorEmail, investmentAmount, valuationCap, discountRate, companyName?, jurisdiction? }
// Generates a YC-standard SAFE agreement as downloadable HTML

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      safeType = 'post-money',
      investorName,
      investorEmail,
      investmentAmount,
      valuationCap,
      discountRate = 20,
      companyName,
      jurisdiction = 'Delaware',
    } = await request.json()

    if (!investorName || !investmentAmount || !valuationCap) {
      return NextResponse.json({ error: 'investorName, investmentAmount, and valuationCap are required' }, { status: 400 })
    }

    // Fetch company name from founder profile if not provided
    let company = companyName
    if (!company) {
      const { data: profile } = await supabase
        .from('founder_profiles')
        .select('startup_name')
        .eq('user_id', user.id)
        .single()
      company = profile?.startup_name ?? '[Company Name]'
    }

    const effectiveDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const amountFmt = `$${Number(investmentAmount).toLocaleString()}`
    const capFmt = `$${Number(valuationCap).toLocaleString()}`
    const discountFmt = `${discountRate}%`

    const html = buildSafeHtml({
      safeType: safeType as 'post-money' | 'pre-money',
      company,
      investorName,
      investorEmail: investorEmail ?? '',
      investmentAmount: amountFmt,
      valuationCap: capFmt,
      discountRate: discountFmt,
      jurisdiction,
      effectiveDate,
    })

    // Log
    try {
      await supabase.from('agent_activity').insert({
        user_id: user.id,
        agent_id: 'leo',
        action_type: 'safe_generated',
        description: `${safeType} SAFE generated for ${investorName} — ${amountFmt} at ${capFmt} cap`,
        metadata: { safeType, investorName, investmentAmount, valuationCap, discountRate },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({ html, company, safeType })
  } catch (err) {
    console.error('Leo SAFE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function buildSafeHtml(p: {
  safeType: 'post-money' | 'pre-money'
  company: string
  investorName: string
  investorEmail: string
  investmentAmount: string
  valuationCap: string
  discountRate: string
  jurisdiction: string
  effectiveDate: string
}): string {
  const isPostMoney = p.safeType === 'post-money'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SAFE Agreement — ${p.company} / ${p.investorName}</title>
<style>
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.8; color: #000; max-width: 800px; margin: 60px auto; padding: 0 40px; }
  h1 { font-size: 16pt; text-align: center; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px; }
  .subtitle { text-align: center; font-size: 12pt; margin-bottom: 40px; }
  h2 { font-size: 12pt; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 32px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 4px; }
  .parties { background: #f9f9f9; border: 1px solid #ccc; padding: 20px 24px; border-radius: 4px; margin: 24px 0; }
  .parties p { margin: 6px 0; }
  .key-terms { background: #fff8e1; border: 2px solid #f59e0b; padding: 20px 24px; border-radius: 4px; margin: 24px 0; }
  .key-terms table { width: 100%; border-collapse: collapse; }
  .key-terms td { padding: 6px 12px; border-bottom: 1px solid #fde68a; vertical-align: top; }
  .key-terms td:first-child { font-weight: bold; width: 40%; white-space: nowrap; }
  p { margin-bottom: 12px; }
  .sig-block { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .sig-party h3 { font-size: 11pt; text-transform: uppercase; margin-bottom: 20px; }
  .sig-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 6px; font-size: 10pt; }
  .disclaimer { margin-top: 48px; padding: 16px 20px; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 4px; font-size: 10pt; color: #7f1d1d; }
  @media print { body { margin: 0; } .disclaimer { display: none; } }
</style>
</head>
<body>
<h1>Simple Agreement for Future Equity</h1>
<p class="subtitle">${isPostMoney ? 'Post-Money SAFE' : 'Pre-Money SAFE'} — YC Standard Form</p>

<div class="parties">
  <p><strong>THIS CERTIFIES THAT</strong> in exchange for the payment by <strong>${p.investorName}</strong>${p.investorEmail ? ` (${p.investorEmail})` : ''} (the "Investor") of <strong>${p.investmentAmount}</strong> (the "Purchase Amount"), <strong>${p.company}</strong>, a ${p.jurisdiction} corporation (the "Company"), issues to the Investor the right to certain shares of the Company's Capital Stock, subject to the terms set forth below.</p>
  <p><strong>Effective Date:</strong> ${p.effectiveDate}</p>
</div>

<div class="key-terms">
  <table>
    <tr><td>Purchase Amount</td><td>${p.investmentAmount}</td></tr>
    <tr><td>Valuation Cap</td><td>${p.valuationCap}${isPostMoney ? ' (Post-Money)' : ' (Pre-Money)'}</td></tr>
    <tr><td>Discount Rate</td><td>${p.discountRate} discount to Next Equity Financing price</td></tr>
    <tr><td>SAFE Type</td><td>${isPostMoney ? 'Post-Money SAFE (YC standard)' : 'Pre-Money SAFE'}</td></tr>
    <tr><td>Company</td><td>${p.company}</td></tr>
    <tr><td>Investor</td><td>${p.investorName}</td></tr>
  </table>
</div>

<h2>1. Events</h2>

<p><strong>1.1 Equity Financing.</strong> If there is an Equity Financing before the termination of this Safe, on the initial closing of such Equity Financing, this Safe will automatically convert into the number of shares of Safe Preferred Stock equal to the Purchase Amount divided by the Conversion Price.</p>

<p>"Conversion Price" means the lower of: (i) the Safe Price (Purchase Amount divided by ${isPostMoney ? 'the Post-Money Valuation Cap divided by the Fully Diluted Capitalization' : 'the Pre-Money Valuation Cap divided by the Company Capitalization immediately prior to the Equity Financing'}); or (ii) the Discount Price (the price per share of the Standard Preferred Stock sold in the Equity Financing multiplied by (1 minus the Discount Rate of ${p.discountRate})).</p>

<p><strong>1.2 Liquidity Event.</strong> If there is a Liquidity Event before the termination of this Safe, the Investor will, at its option, either (i) receive a cash payment equal to the Purchase Amount (if the Investor elects to receive cash), or (ii) automatically receive from the Company a number of shares of Common Stock equal to the Purchase Amount divided by the Liquidity Price, if the Investor elects to receive shares.</p>

<p><strong>1.3 Dissolution Event.</strong> If there is a Dissolution Event before the termination of this Safe, the Investor will automatically be entitled to receive a portion of Proceeds equal to the Purchase Amount, due and payable to the Investor immediately prior to, or concurrent with, the consummation of the Dissolution Event, subject to the preferences set forth herein.</p>

<h2>2. Definitions</h2>

<p><strong>"Capital Stock"</strong> means the capital stock of the Company, including, without limitation, the "Common Stock" and the "Preferred Stock."</p>

<p><strong>"Change of Control"</strong> means (i) a transaction or series of related transactions in which any "person" or "group" (within the meaning of Section 13(d) and 14(d) of the Securities Exchange Act of 1934) becomes the "beneficial owner" (as defined in Rule 13d-3 under the Securities Exchange Act of 1934) of shares of the Company representing 50% or more of the total voting power of the Company's then-outstanding capital stock; (ii) a transaction pursuant to which shares of the Company are sold or exchanged; or (iii) a sale, lease or other disposition of all or substantially all of the assets of the Company.</p>

<p><strong>"Company Capitalization"</strong> means the sum, as of immediately prior to the Equity Financing, of: (1) all shares of Capital Stock (on an as-converted basis) issued and outstanding, assuming exercise or conversion of all outstanding vested and unvested options, warrants and other convertible securities, but excluding (A) this Safe, (B) all other Safes, and (C) convertible promissory notes; and (2) all shares of Common Stock reserved and available for future grant under any equity incentive or similar plan of the Company.</p>

<p><strong>"Discount Price"</strong> means the price per share of the Standard Preferred Stock sold in the Equity Financing multiplied by one minus the Discount Rate of ${p.discountRate}.</p>

<p><strong>"Dissolution Event"</strong> means (i) a voluntary termination of operations; (ii) a general assignment for the benefit of the Company's creditors; or (iii) any other liquidation, dissolution or winding up of the Company (excluding a Liquidity Event), whether voluntary or involuntary.</p>

<p><strong>"Equity Financing"</strong> means a bona fide transaction or series of transactions with the principal purpose of raising capital, pursuant to which the Company issues and sells Preferred Stock at a fixed pre-money valuation.</p>

<p><strong>"Fully Diluted Capitalization"</strong> means the number of shares of Capital Stock outstanding or issuable (treating all Preferred Stock on an as-converted to Common Stock basis) at the applicable time, including all shares of Capital Stock reserved for issuance under any equity incentive or similar plan, all outstanding warrants and other convertible instruments, all Safes, and all convertible notes, treating each on an as-converted or as-exercised basis, as applicable.</p>

<p><strong>"Liquidity Event"</strong> means a Change of Control or an IPO.</p>

<p><strong>"Preferred Stock"</strong> means the Company's preferred stock, and shall include, without limitation, the Standard Preferred Stock.</p>

<p><strong>"Safe Preferred Stock"</strong> means the shares of a series of Preferred Stock issued to the Investor in an Equity Financing, having the identical rights, privileges, preferences and restrictions as the shares of Standard Preferred Stock, other than with respect to: (i) the per share liquidation preference and the initial conversion price for purposes of price-based anti-dilution protection, which will equal the Conversion Price; and (ii) the basis for any dividend rights, which will be based on the Conversion Price.</p>

<p><strong>"Safe Price"</strong> means the price per share equal to ${isPostMoney ? 'the Post-Money Valuation Cap' : 'the Pre-Money Valuation Cap'} of ${p.valuationCap} divided by the ${isPostMoney ? 'Fully Diluted Capitalization' : 'Company Capitalization'} immediately prior to the Equity Financing.</p>

<p><strong>"Standard Preferred Stock"</strong> means the shares of a series of Preferred Stock issued to the investors investing new money in the Company in connection with the initial closing of the Equity Financing.</p>

<h2>3. Company Representations</h2>

<p>The Company represents and warrants to the Investor that: (a) the Company is duly organized, validly existing and in good standing as a corporation under the laws of the state of its incorporation; (b) the execution, delivery and performance of this Safe is within the power of the Company; (c) the Company has not entered into any agreement, arrangement or understanding that would cause the issuance of shares of Safe Preferred Stock hereunder to violate any pre-emptive rights, rights of first refusal or other rights to purchase securities of the Company; (d) the Company is not a party to any existing arrangement that would prevent the Company from performing its obligations under this Safe; and (e) this Safe has been duly executed and delivered by the Company, and constitutes legal, valid and binding obligations of the Company, enforceable in accordance with its terms.</p>

<h2>4. Investor Representations</h2>

<p>The Investor represents and warrants to the Company that: (a) the Investor has full legal capacity, power and authority to execute and deliver this Safe and to perform its obligations hereunder; (b) this Safe constitutes a valid and binding obligation of the Investor, enforceable in accordance with its terms; (c) the Investor is an accredited investor as such term is defined in Rule 501 of Regulation D under the Securities Act of 1933, as amended; (d) the Investor has been advised that the Safe and the underlying securities have not been registered under the Securities Act, or state securities laws, and are, therefore, "restricted securities" and must be held indefinitely unless they are subsequently registered or an exemption from such registration is available; (e) the Investor is purchasing this Safe and the securities to be acquired by the Investor hereunder for its own account for investment, not as a nominee or agent, and not with a view to, or for resale in connection with, any distribution or public offering thereof; and (f) the Investor understands that this Safe is a risky investment and that the Investor may not be able to liquidate this Safe or any securities acquired upon conversion or exercise hereof.</p>

<h2>5. Miscellaneous</h2>

<p><strong>5.1 Governing Law.</strong> This Safe shall be governed by the laws of the State of ${p.jurisdiction}, without regard to its conflicts of law provisions.</p>

<p><strong>5.2 Entire Agreement.</strong> This Safe constitutes the full and entire understanding and agreement between the parties with regard to the subjects hereof, and no party shall be liable or bound to any other in any manner by any oral or written representations, warranties, covenants and agreements except as specifically set forth herein.</p>

<p><strong>5.3 Amendment.</strong> This Safe may be amended, modified or waived only with the written consent of the Company and the Investor.</p>

<p><strong>5.4 Severability.</strong> If any provision of this Safe is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.</p>

<div class="sig-block">
  <div class="sig-party">
    <h3>${p.company} (Company)</h3>
    <div class="sig-line">Signature</div>
    <div class="sig-line">Name:</div>
    <div class="sig-line">Title:</div>
    <div class="sig-line">Date: ${p.effectiveDate}</div>
    <div class="sig-line">Address:</div>
  </div>
  <div class="sig-party">
    <h3>${p.investorName} (Investor)</h3>
    <div class="sig-line">Signature</div>
    <div class="sig-line">Name: ${p.investorName}</div>
    <div class="sig-line">Email: ${p.investorEmail || '_______________'}</div>
    <div class="sig-line">Date: ${p.effectiveDate}</div>
    <div class="sig-line">Address:</div>
  </div>
</div>

<div class="disclaimer">
  <strong>⚠ Legal Disclaimer:</strong> This document is generated by Edge Alpha AI and is based on the YC standard SAFE template. It is provided for informational purposes only and does not constitute legal advice. You should have this document reviewed by a qualified attorney before execution. Edge Alpha makes no warranty as to the accuracy or completeness of this document for your specific circumstances.
</div>
</body>
</html>`
}
