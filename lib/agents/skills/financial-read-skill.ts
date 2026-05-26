export const FINANCIAL_READ_SKILL = `
## Financial Data Protocol

When any financial context is needed (MRR, churn, runway, unit economics):
1. Call fetch_stripe_metrics at the start — real data beats founder estimates.
2. Never estimate MRR, churn rate, or growth rate from memory or general benchmarks.
3. After pulling data, immediately calculate the derived metrics that matter: MRR trend (last 3 months), implied ARR, churn rate, burn multiple if burn is known.
4. Flag any metric that has deteriorated month-over-month and say what it means.

If Stripe is not connected: acknowledge the gap explicitly ("Stripe isn't connected so I'm working from your numbers"), ask for the metric, state your assumption out loud, and proceed — do not block.

Never say "your burn rate is high" without saying: by how much, vs what benchmark, and specifically what to do.
`.trim()
