/**
 * AS018 — Asset Instructions for "Market Intelligence Report".
 *
 * Layer 3 of the Composer (ADR-012). The lowest INSTRUCTION layer; Company
 * Context below it is data, not instructions.
 *
 * Lifted verbatim from the design workbook
 * `docs/registry-source/Edge_Alpha_Agentic_OS_Template.xlsx`. Shorter than
 * AS001–AS017's Asset Instructions — the workbook varies in depth per Asset,
 * and this one is what it is. Nothing was invented to pad it out.
 *
 * ADR-010: the workbook is the DESIGN and SEEDING source. Nothing reads it at
 * runtime — this file is the runtime source. Regenerate deliberately when the
 * workbook changes; never wire the app to the spreadsheet.
 */
export const AS018_MARKET_INTELLIGENCE_REPORT_PROMPT = `# AS018 — Market Intelligence Report

## Purpose

Produce an executive-quality Market Intelligence Report that helps the Founder and Executive Team understand the company's competitive environment, customer behaviour and market dynamics.

The report should identify strategic opportunities, emerging risks and changing market conditions that influence commercial growth.

The report is intended to support executive decision-making—not market research for its own sake.

---

# Analytical Framework

Use **Porter's Five Forces** as the primary analytical framework.

Assess:

1. Competitive Rivalry
2. Threat of New Entrants
3. Threat of Substitute Products or Services
4. Bargaining Power of Customers
5. Bargaining Power of Suppliers

Where appropriate, supplement the analysis with:

* SWOT Analysis
* PESTLE Analysis
* Strategic Group Mapping
* Customer Research
* Win/Loss Analysis

Only use additional frameworks where they materially improve the quality of the report.

---

# Required Sections

## 1. Executive Summary

Provide a concise executive overview.

Summarise:

* overall market attractiveness
* biggest opportunity
* biggest threat
* strategic recommendation

The Founder should understand the report within two minutes.

---

## 2. Porter's Five Forces Assessment

Evaluate each of the Five Forces.

For every force include:

* Current Assessment
* Supporting Evidence
* Business Impact
* Strategic Implications

Conclude with an overall industry attractiveness assessment.

---

## 3. Competitor Landscape

Identify:

* direct competitors
* indirect competitors
* substitute solutions

Compare competitors across:

* positioning
* product
* pricing
* target market
* strengths
* weaknesses
* competitive advantages

Present findings in a comparison table.

---

## 4. Customer Insights

Summarise:

* customer segments
* buying behaviour
* buying criteria
* decision-makers
* customer pain points
* unmet needs

Highlight changes since the previous review.

---

## 5. Market Trends

Identify important developments affecting the company.

Examples include:

* technology trends
* regulatory developments
* funding activity
* customer behaviour
* competitive moves
* macroeconomic developments

Distinguish between short-term trends and structural shifts.

---

## 6. SWOT Analysis

Summarise:

* Strengths
* Weaknesses
* Opportunities
* Threats

Focus on strategic implications rather than descriptive analysis.

---

## 7. Win / Loss Analysis

Where evidence exists, analyse:

* reasons for winning
* reasons for losing
* recurring objections
* competitive displacement
* buying patterns

Identify recurring commercial lessons.

---

## 8. Executive Recommendations

Provide the three to five highest-impact recommendations.

For each recommendation include:

* Recommendation
* Business Rationale
* Expected Commercial Impact
* Suggested Priority (High / Medium / Low)

Recommendations should directly influence strategy, GTM, product or commercial execution.

---

# Output

Generate one complete **Market Intelligence Report**.

The report should be suitable for review by:

* Founder
* Executive Team
* Board of Directors
* Investors

---

# Success Criteria

The Asset is successful when:

* the competitive landscape is clearly understood
* industry attractiveness has been assessed using Porter's Five Forces
* customer and competitor insights are evidence-based
* strategic implications are explicit
* recommendations are practical and prioritised

The Founder should be able to review the report in approximately ten minutes and immediately understand where the market is moving, how competitors are positioned and what actions the company should take next.`
