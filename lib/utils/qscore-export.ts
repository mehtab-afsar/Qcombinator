/**
 * Generate downloadable Q-Score card
 */

export interface QScoreExportData {
  companyName: string
  oneLiner?: string
  industry?: string
  stage?: string
  overallScore: number
  dimensions: {
    marketReadiness: number
    marketPotential: number
    ipDefensibility: number
    founderTeam: number
    structuralImpact: number
    financials: number
  }
  timestamp?: string
}

export function generateQScoreHTML(data: QScoreExportData): string {
  const scoreColor = (score: number) => {
    if (score >= 70) return '#3B82F6'
    if (score >= 50) return '#D97706'
    return '#DC2626'
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Q-Score - ${data.companyName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f9f7f2;
      padding: 40px 20px;
      color: #18160f;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.09);
    }
    .company-name {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    .one-liner {
      font-size: 14px;
      color: #8a867c;
      margin-bottom: 16px;
    }
    .meta {
      display: flex;
      gap: 24px;
      font-size: 13px;
      color: #8a867c;
      margin-bottom: 32px;
    }
    .score-circle {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      font-weight: 700;
      color: white;
    }
    .dimensions {
      margin-top: 40px;
    }
    .dimension {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e5e3e0;
    }
    .dimension-score {
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="company-name">${data.companyName}</div>
    ${data.oneLiner ? `<div class="one-liner">${data.oneLiner}</div>` : ''}
    <div class="meta">
      ${data.industry ? `<div>${data.industry}</div>` : ''}
      ${data.stage ? `<div>${data.stage}</div>` : ''}
    </div>
    <div style="text-align: center; margin: 40px 0;">
      <div class="score-circle" style="background: ${scoreColor(data.overallScore)}">
        ${data.overallScore}
      </div>
      <div style="font-size: 14px; color: #8a867c;">Overall Q-Score</div>
    </div>
    <div class="dimensions">
      <div class="dimension">
        <div>Market Readiness</div>
        <div class="dimension-score" style="color: ${scoreColor(data.dimensions.marketReadiness)}">${data.dimensions.marketReadiness}</div>
      </div>
      <div class="dimension">
        <div>Market Potential</div>
        <div class="dimension-score" style="color: ${scoreColor(data.dimensions.marketPotential)}">${data.dimensions.marketPotential}</div>
      </div>
      <div class="dimension">
        <div>IP & Defensibility</div>
        <div class="dimension-score" style="color: ${scoreColor(data.dimensions.ipDefensibility)}">${data.dimensions.ipDefensibility}</div>
      </div>
      <div class="dimension">
        <div>Founder & Team</div>
        <div class="dimension-score" style="color: ${scoreColor(data.dimensions.founderTeam)}">${data.dimensions.founderTeam}</div>
      </div>
      <div class="dimension">
        <div>Structural Impact</div>
        <div class="dimension-score" style="color: ${scoreColor(data.dimensions.structuralImpact)}">${data.dimensions.structuralImpact}</div>
      </div>
      <div class="dimension">
        <div>Financials</div>
        <div class="dimension-score" style="color: ${scoreColor(data.dimensions.financials)}">${data.dimensions.financials}</div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export function downloadQScore(data: QScoreExportData, _format: 'pdf' = 'pdf') {
  const html = generateQScoreHTML(data)
  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.title = `Q-Score - ${data.companyName}`
    setTimeout(() => win.print(), 500)
  }
}
