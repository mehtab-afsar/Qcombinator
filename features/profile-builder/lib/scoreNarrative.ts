import type { SubmitResult } from '@/features/profile-builder/types'

export function buildScoreNarrative(
  params: SubmitResult['iqBreakdown'],
  score: number,
  grade: string,
  flags: SubmitResult['reconciliationFlags']
): { overall: string; perParam: Record<string, string> } {
  const s100 = (avg: number) => Math.round(avg * 20)
  const sorted = [...params].sort((a, b) => b.averageScore - a.averageScore)
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]

  const overall = [
    'Your Q-Score of ' + score + ' (Grade ' + grade + ') reflects ' +
      (score >= 70 ? 'a well-evidenced startup with strong fundamentals.'
        : score >= 50 ? 'a startup with solid foundations but meaningful gaps to close before a Series A.'
        : score >= 35 ? 'an early-stage startup where key signals still need to be validated.'
        : 'a very early stage — most scoring dimensions need more evidence.'),
    strongest && s100(strongest.averageScore) >= 60
      ? 'Your strongest dimension is ' + strongest.name + ' (' + s100(strongest.averageScore) + '/100).'
      : null,
    weakest && s100(weakest.averageScore) < 50
      ? 'The biggest opportunity to improve is ' + weakest.name + ' (' + s100(weakest.averageScore) + '/100).'
      : null,
    flags.length > 0
      ? 'Note: ' + flags.length + ' indicator' + (flags.length > 1 ? 's' : '') + ' flagged a data quality concern that investors may scrutinise.'
      : null,
  ].filter(Boolean).join(' ')

  const perParam: Record<string, string> = {}
  for (const p of params) {
    const s = s100(p.averageScore)
    const activeInds = (p.indicators ?? []).filter(i => !i.excluded)
    const strongInds = activeInds.filter(i => i.rawScore >= 4.0).map(i => i.name)
    const weakInds = activeInds.filter(i => i.rawScore > 0 && i.rawScore < 2.5).map(i => i.name)
    const alerts = (p.indicators ?? []).filter(i => i.vcAlert)
    perParam[p.id] = [
      s >= 75 ? p.name + ' is a clear strength.'
        : s >= 50 ? p.name + ' shows promise but has room to grow.'
        : p.name + ' needs attention — this is a common investor ask.',
      strongInds.length > 0 ? 'Strong signals: ' + strongInds.slice(0, 2).join(', ') + '.' : null,
      weakInds.length > 0 ? 'Gaps to address: ' + weakInds.slice(0, 2).join(', ') + '.' : null,
      alerts.length > 0 ? 'Data flag on: ' + alerts.map(a => a.name).join(', ') + '.' : null,
    ].filter(Boolean).join(' ')
  }
  return { overall, perParam }
}
