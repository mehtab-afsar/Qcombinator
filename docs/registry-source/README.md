# Registry source — design & seeding only

`Edge_Alpha_Agentic_OS_Template.xlsx` is the **design and seeding source** for the Registry: Executives, Programs, Assets, Actions and their prompts.

**It is NOT a live registry.** Per **ADR-010**, the authoritative runtime source is the TypeScript Registry at `lib/registry/**`. Nothing in the app reads this workbook at runtime.

**How it's used**
- Story 1 seeds `lib/registry/**` from this workbook (reconciled against `EDGE_ALPHA_PRD.md` §10, which is authoritative where they disagree — e.g. P001's assets are **AS001–AS005**).
- When the workbook changes, update the code Registry deliberately. Never wire the app to read the file.

**Sheets:** Executive Registry · Executive Prompts · Morgan Prompts · Program Registry · Program Prompts · Specialist Registry · Asset Registry · Standard Asset Prompt · Knowledge Base · Asset Prompts · Action Registry · Action Prompt · Company Instance.
