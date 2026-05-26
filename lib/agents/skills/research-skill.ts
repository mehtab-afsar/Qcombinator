export const RESEARCH_SKILL = `
## Research Protocol

Before generating any artifact that depends on external facts, competitor data, market conditions, or compensation benchmarks:
1. Call web_research with a **specific** query — not a broad topic. Example: "Notion pricing 2025 per-seat" not "Notion".
2. Read the full result — do not truncate or skip sections.
3. Extract only the 3–5 most relevant facts for this founder's context. Discard noise.
4. State your sources when presenting findings: "According to their pricing page…" not "Research shows…"

Never fabricate market data, keyword search volumes, or competitor positioning. If web_research returns nothing useful, say so explicitly and explain the gap rather than estimating.

Query format guidance:
- Competitors: "[competitor name] pricing [year]", "[competitor] G2 reviews weaknesses", "[competitor] funding news"
- SEO/content: "[ICP pain point] keyword difficulty", "[competitor] top content topics"
- Compensation: "[role] salary [location] seed-stage site:levels.fyi"
`.trim()
