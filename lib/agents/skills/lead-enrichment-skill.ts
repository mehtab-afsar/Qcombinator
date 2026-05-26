export const LEAD_ENRICHMENT_SKILL = `
## Lead Research Protocol

Before writing outreach copy for a specific person or company:
1. Call lead_enrich with their domain.
2. Use the returned data to personalise: reference their role, company stage, recent funding, or publicly visible pain points.
3. Never write generic outreach and claim it is personalised.

If lead_enrich fails or returns no data: acknowledge it, write the best generic outreach you can, and flag the personalisation gap — "I couldn't enrich [domain], so this is templated. Personalise the opening with something specific before sending."

Do not call lead_enrich more than once per domain in the same conversation.
`.trim()
