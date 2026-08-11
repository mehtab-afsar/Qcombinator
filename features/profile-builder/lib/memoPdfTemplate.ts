import { bdr, ink, muted } from '@/lib/constants/colors'
import type { SubmitResult } from '@/features/profile-builder/types'

/** Builds the printable Q-Score memo HTML — a pure string builder, no DOM/window
 *  access. `ScoreReport.tsx` opens a blob URL with this and calls window.print(). */
export function buildMemoHtml(
  submitResult: SubmitResult,
  narrative: { overall: string; perParam: Record<string, string> },
  companyLabel: string,
  dateStr: string,
): string {
  const toS100 = (avg: number) => Math.round(avg * 20)

  const rows = submitResult.iqBreakdown.map(p => {
    const ps = toS100(p.averageScore)
    const inds = (p.indicators ?? []).map(ind => {
      const sc = ind.excluded ? '—' : ind.rawScore === 0 ? '0.0' : ind.rawScore.toFixed(1)
      const flag = ind.vcAlert && !ind.excluded ? ' ⚑' : ''
      const ex = ind.excluded ? ` (${ind.exclusionReason ?? 'N/A'})` : ''
      return `<tr style="border-bottom:1px solid ${bdr}"><td style="padding:6px 12px;font-size:11px;color:${muted}">${ind.name}${ex}</td><td style="padding:6px 12px;font-size:11px;font-weight:700;color:${ind.excluded ? '#aaa' : ind.rawScore >= 4 ? '#16A34A' : ind.rawScore >= 2.5 ? '#D97706' : '#DC2626'};text-align:center">${sc}${flag}</td></tr>`
    }).join('')
    return `<div style="margin-bottom:20px;border:1px solid ${bdr};border-radius:10px;overflow:hidden"><div style="background:#F5F1E8;padding:10px 16px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;font-weight:700;color:${ink}">${p.name}</span><span style="font-size:13px;font-weight:800;color:${ps >= 70 ? '#16A34A' : ps >= 45 ? '#D97706' : '#DC2626'}">${ps}/100</span></div><div style="padding:8px 0"><div style="height:4px;background:${bdr};margin:0 16px 10px"><div style="height:100%;width:${ps}%;background:${ps >= 70 ? '#16A34A' : ps >= 45 ? '#D97706' : '#DC2626'}"></div></div><table style="width:100%;border-collapse:collapse">${inds}</table></div>${narrative.perParam[p.id] ? `<div style="padding:10px 16px;background:#FAF8F3;border-top:1px solid ${bdr};font-size:12px;color:${muted};line-height:1.6">${narrative.perParam[p.id]}</div>` : ''}</div>`
  }).join('')

  const unlocks = submitResult.unlockCards.map(c => `<div style="display:flex;gap:14px;padding:12px 14px;border:1px solid ${bdr};border-radius:8px;margin-bottom:10px"><div style="min-width:44px;text-align:center;padding-top:4px"><div style="font-size:20px;font-weight:800;color:#2563EB">+${c.estimatedPointGain}</div><div style="font-size:9px;color:${muted};text-transform:uppercase;letter-spacing:0.06em">pts</div></div><div><div style="font-size:12px;font-weight:700;color:${ink};margin-bottom:3px">${c.indicatorName}</div><div style="font-size:11px;color:${muted};margin-bottom:5px">${c.currentScore.toFixed(1)}/5 → target ${c.targetScore}/5${c.agentId ? ` · ${c.agentId.charAt(0).toUpperCase() + c.agentId.slice(1)} can help` : ''}</div><div style="font-size:12px;color:${ink};line-height:1.55">${c.action}</div></div></div>`).join('')

  const warnings = submitResult.validationWarnings.length > 0
    ? `<div style="margin:16px 0;padding:12px 16px;background:#FFFBEB;border:1px solid #D97706;border-radius:8px"><div style="font-size:11px;font-weight:700;color:#D97706;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Consistency Notes</div>${submitResult.validationWarnings.map(w => `<div style="font-size:12px;color:${ink};line-height:1.5">· ${w}</div>`).join('')}</div>` : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Q-Score Memo — ${companyLabel}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAFAF9;color:${ink}}
  .page{max-width:720px;margin:0 auto;padding:0 0 80px}
  .print-footer{position:fixed;bottom:0;left:0;right:0;background:#FAFAF9;border-top:1px solid ${bdr};padding:10px 40px;display:flex;justify-content:space-between;align-items:center}
  @media print{
    body{background:white}
    .no-print{display:none!important}
    .print-footer{background:white}
    @page{size:A4;margin:0 0 18mm 0}
  }
</style>
</head>
<body>
<div class="page">

  <!-- Edge Alpha header bar -->
  <div style="background:#1A1815;color:#FAF8F3;padding:14px 40px;display:flex;justify-content:space-between;align-items:center;margin-bottom:0">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:22px;height:22px;background:#FAF8F3;border-radius:4px;display:flex;align-items:center;justify-content:center">
        <div style="width:10px;height:10px;border:2px solid #1A1815;border-radius:2px"></div>
      </div>
      <span style="font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase">Edge Alpha</span>
    </div>
    <span style="font-size:10px;color:rgba(250,248,243,0.5);letter-spacing:0.08em">Q-SCORE MEMO</span>
  </div>

  <!-- Document header -->
  <div style="padding:32px 40px 28px;border-bottom:1px solid ${bdr};background:white">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px">
      <div>
        <div style="font-size:10px;font-weight:700;color:#9B9691;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:8px">Investor Readiness Assessment</div>
        <div style="font-size:26px;font-weight:700;color:${ink};letter-spacing:-0.02em;line-height:1.1;margin-bottom:6px">${companyLabel}</div>
        <div style="font-size:12px;color:#9B9691">${dateStr}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:64px;font-weight:300;color:${ink};line-height:1;letter-spacing:-0.05em">${submitResult.score}</div>
        <div style="display:inline-flex;align-items:center;gap:6px;margin-top:6px;padding:3px 10px;background:#F0F0EE;border-radius:20px">
          <span style="font-size:12px;font-weight:700;color:${ink}">Grade ${submitResult.grade}</span>
        </div>
        ${submitResult.track ? `<div style="font-size:11px;color:#9B9691;margin-top:6px">${submitResult.track} track</div>` : ''}
      </div>
    </div>
  </div>

  <div style="padding:32px 40px">

    <!-- Parameter overview -->
    <div style="margin-bottom:32px">
      <div style="font-size:9px;font-weight:700;color:#9B9691;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:16px">Parameter Overview</div>
      ${submitResult.iqBreakdown.map(p => { const ps = toS100(p.averageScore); const bc = ps >= 70 ? '#16A34A' : ps >= 45 ? '#D97706' : '#DC2626'; return `<div style="display:flex;align-items:center;gap:14px;margin-bottom:11px"><div style="width:160px;font-size:12px;color:${ink};font-weight:500;flex-shrink:0">${p.name}</div><div style="flex:1;height:5px;background:${bdr};border-radius:3px;overflow:hidden"><div style="height:100%;width:${ps}%;background:${bc}"></div></div><div style="width:40px;text-align:right;font-size:12px;font-weight:700;color:${ink}">${ps}</div></div>` }).join('')}
    </div>

    <!-- Narrative -->
    <div style="margin-bottom:32px;padding:18px 22px;background:#F5F3EE;border-left:2px solid ${ink};border-radius:0 8px 8px 0">
      <div style="font-size:9px;font-weight:700;color:#9B9691;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:8px">Assessment Summary</div>
      <p style="font-size:13px;color:${ink};line-height:1.75">${narrative.overall}</p>
    </div>

    <!-- Indicator detail -->
    <div style="margin-bottom:32px">
      <div style="font-size:9px;font-weight:700;color:#9B9691;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:16px">Indicator Detail</div>
      ${rows}
    </div>

    ${warnings}

    ${submitResult.unlockCards.length > 0 ? `<div style="margin-bottom:32px"><div style="font-size:9px;font-weight:700;color:#9B9691;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:16px">Top Score Unlocks</div>${unlocks}</div>` : ''}

    ${submitResult.readinessSummary ? `<div style="padding:18px 22px;background:#F5F3EE;border:1px solid ${bdr};border-radius:8px;margin-bottom:32px"><div style="font-size:9px;font-weight:700;color:#9B9691;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:8px">Investor Readiness Summary</div><p style="font-size:13px;color:${ink};line-height:1.75;font-style:italic">${submitResult.readinessSummary}</p></div>` : ''}

  </div>
</div>

<!-- Footer — fixed at bottom of every page -->
<div class="print-footer">
  <span style="font-size:10px;color:#9B9691">Confidential · Edge Alpha · ${dateStr}</span>
  <span style="font-size:10px;color:#9B9691;font-weight:500">www.edgealpha.vc</span>
</div>

<script>window.onload=function(){window.print()}<\/script>
</body></html>`
}
