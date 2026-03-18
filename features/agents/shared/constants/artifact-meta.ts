import { FileText, Mail, Swords, BookOpen, Zap, Sparkles, DollarSign, Scale, Users, BarChart3, Search, Compass } from "lucide-react";

export const ARTIFACT_META: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  icp_document:       { icon: FileText,   label: "ICP Document",         color: "#2563EB" },
  outreach_sequence:  { icon: Mail,       label: "Outreach Sequence",    color: "#16A34A" },
  battle_card:        { icon: Swords,     label: "Battle Card",          color: "#DC2626" },
  gtm_playbook:       { icon: BookOpen,   label: "GTM Playbook",         color: "#D97706" },
  sales_script:       { icon: Zap,        label: "Sales Script",         color: "#16A34A" },
  brand_messaging:    { icon: Sparkles,   label: "Brand Messaging",      color: "#7C3AED" },
  financial_summary:  { icon: DollarSign, label: "Financial Summary",    color: "#16A34A" },
  legal_checklist:    { icon: Scale,      label: "Legal Checklist",      color: "#D97706" },
  hiring_plan:        { icon: Users,      label: "Hiring Plan",          color: "#2563EB" },
  pmf_survey:         { icon: BarChart3,  label: "PMF Research Kit",     color: "#7C3AED" },
  competitive_matrix: { icon: Search,     label: "Competitive Analysis", color: "#DC2626" },
  strategic_plan:     { icon: Compass,    label: "Strategic Plan",       color: "#2563EB" },
};

export const QUICK_QUESTIONS: Record<string, string[]> = {
  icp_document:       ["Describe your product in one sentence", "Who are your 1-2 best current customers?", "What core problem do you solve for them?", "What is your pricing model?", "What industries or company sizes do you target?"],
  outreach_sequence:  ["What does your product do?", "Who are you reaching out to (role + company type)?", "What pain point do you address?", "What's your call-to-action (demo, trial, etc.)?", "Any traction or social proof to mention?"],
  battle_card:        ["Who is your main competitor?", "What are their key weaknesses?", "What's your #1 differentiator?", "What objections do prospects raise when comparing?", "What's your pricing vs. theirs?"],
  gtm_playbook:       ["What's your product and target market?", "What stage are you at (pre-revenue, early, scaling)?", "Which 2-3 channels have shown early traction?", "What's your CAC target and current burn?", "What's your 3-month launch goal?"],
  sales_script:       ["What's your product and primary use case?", "Who is the typical buyer (role + company size)?", "What are the top 3 objections you hear?", "What's your close/ask at the end of calls?", "What proof points or case studies do you have?"],
  brand_messaging:    ["What's your product and target audience?", "What's your category (project management, AI assistant, etc.)?", "What's your primary differentiator in one phrase?", "What emotion do you want customers to feel?", "Name 2-3 competitors and why you're better"],
  financial_summary:  ["Current MRR and growth rate?", "Monthly burn rate and runway?", "Team size and key hires planned?", "How will you use the funds you're raising?", "Key unit economics: CAC, LTV, gross margin?"],
  legal_checklist:    ["What's your entity type and state of incorporation?", "Do you have a co-founder agreement / vesting schedule?", "Have you assigned IP from all founders to the company?", "What fundraising instrument are you using (SAFE, note, equity)?", "Any regulatory or compliance concerns for your industry?"],
  hiring_plan:        ["What stage are you at and what's your current team?", "What are the 3 biggest gaps in the team right now?", "What's your hiring budget for the next 6 months?", "What roles do you plan to hire first?", "What's your target org structure in 12 months?"],
  pmf_survey:         ["What's your product and who uses it?", "How do you currently measure PMF (retention, NPS, revenue)?", "What's your biggest signal of product-market fit so far?", "What do your most engaged users have in common?", "What's the #1 thing users say when they love your product?"],
  competitive_matrix: ["Who are your top 3-5 competitors?", "What are the 5 key features customers evaluate?", "Where do you clearly win vs. each competitor?", "Where are you behind and what's the roadmap?", "How does your pricing compare?"],
  strategic_plan:     ["What's your 12-month vision for the company?", "What are your 3 biggest strategic bets?", "What are the top 3 risks to achieving this?", "What milestones would trigger a fundraise?", "What does success look like in 12 months (metrics)?"],
};
