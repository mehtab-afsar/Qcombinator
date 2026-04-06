import {
  FileText, Mail, Swords, BookOpen, Zap, Sparkles, DollarSign, Scale,
  Users, BarChart3, Search, Compass, List, TrendingUp, Target, Phone,
  PieChart, Briefcase, FileCheck, Calendar, Globe, Newspaper, Activity,
  LineChart, FlaskConical, Map, Star, Heart, UserPlus, Gift, Rocket,
  ShieldCheck, Gavel, FileSignature, Lock, AlertTriangle, Building2,
  ClipboardList, Award, Megaphone, Repeat, BarChart2
} from "lucide-react";

export const ARTIFACT_META: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  // ── Existing ──────────────────────────────────────────────────────────────
  icp_document:            { icon: FileText,      label: "ICP Document",              color: "#2563EB" },
  outreach_sequence:       { icon: Mail,          label: "Outreach Sequence",         color: "#16A34A" },
  battle_card:             { icon: Swords,        label: "Battle Card",               color: "#DC2626" },
  gtm_playbook:            { icon: BookOpen,      label: "GTM Playbook",              color: "#D97706" },
  sales_script:            { icon: Zap,           label: "Sales Script",              color: "#16A34A" },
  brand_messaging:         { icon: Sparkles,      label: "Brand Messaging",           color: "#7C3AED" },
  financial_summary:       { icon: DollarSign,    label: "Financial Summary",         color: "#16A34A" },
  legal_checklist:         { icon: Scale,         label: "Legal Checklist",           color: "#D97706" },
  hiring_plan:             { icon: Users,         label: "Hiring Plan",               color: "#2563EB" },
  pmf_survey:              { icon: BarChart3,     label: "PMF Research Kit",          color: "#7C3AED" },
  interview_notes:         { icon: ClipboardList, label: "Interview Notes",           color: "#7C3AED" },
  competitive_matrix:      { icon: Search,        label: "Competitive Analysis",      color: "#DC2626" },
  strategic_plan:          { icon: Compass,       label: "Strategic Plan",            color: "#2563EB" },

  // ── Patel ─────────────────────────────────────────────────────────────────
  lead_list:               { icon: List,          label: "Lead List",                 color: "#2563EB" },
  campaign_report:         { icon: TrendingUp,    label: "Campaign Report",           color: "#2563EB" },
  ab_test_result:          { icon: FlaskConical,  label: "A/B Test Result",           color: "#2563EB" },

  // ── Susi ──────────────────────────────────────────────────────────────────
  call_playbook:           { icon: Phone,         label: "Call Playbook",             color: "#16A34A" },
  pipeline_report:         { icon: PieChart,      label: "Pipeline Report",           color: "#16A34A" },
  proposal:                { icon: Briefcase,     label: "Proposal",                  color: "#16A34A" },
  win_loss_analysis:       { icon: BarChart2,     label: "Win/Loss Analysis",         color: "#16A34A" },

  // ── Maya ──────────────────────────────────────────────────────────────────
  content_calendar:        { icon: Calendar,      label: "Content Calendar",          color: "#7C3AED" },
  seo_audit:               { icon: Globe,         label: "SEO Audit",                 color: "#7C3AED" },
  press_kit:               { icon: Newspaper,     label: "Press Kit",                 color: "#7C3AED" },
  newsletter_issue:        { icon: Mail,          label: "Newsletter Issue",          color: "#7C3AED" },
  brand_health_report:     { icon: Activity,      label: "Brand Health Report",       color: "#7C3AED" },

  // ── Felix ─────────────────────────────────────────────────────────────────
  financial_model:         { icon: LineChart,     label: "Financial Model",           color: "#16A34A" },
  investor_update:         { icon: FileCheck,     label: "Investor Update",           color: "#16A34A" },
  board_deck:              { icon: Briefcase,     label: "Board Deck",                color: "#16A34A" },
  cap_table_summary:       { icon: PieChart,      label: "Cap Table Summary",         color: "#16A34A" },
  fundraising_narrative:   { icon: Target,        label: "Fundraising Narrative",     color: "#16A34A" },

  // ── Leo ───────────────────────────────────────────────────────────────────
  nda:                     { icon: FileSignature, label: "NDA",                       color: "#D97706" },
  safe_note:               { icon: Gavel,         label: "SAFE Note",                 color: "#D97706" },
  contractor_agreement:    { icon: FileText,      label: "Contractor Agreement",      color: "#D97706" },
  privacy_policy:          { icon: Lock,          label: "Privacy Policy",            color: "#D97706" },
  ip_audit_report:         { icon: ShieldCheck,   label: "IP Audit Report",           color: "#D97706" },
  term_sheet_redline:      { icon: AlertTriangle, label: "Term Sheet Redline",        color: "#D97706" },

  // ── Harper ────────────────────────────────────────────────────────────────
  job_description:         { icon: FileText,      label: "Job Description",           color: "#2563EB" },
  interview_scorecard:     { icon: ClipboardList, label: "Interview Scorecard",       color: "#2563EB" },
  offer_letter:            { icon: Award,         label: "Offer Letter",              color: "#2563EB" },
  onboarding_plan:         { icon: UserPlus,      label: "Onboarding Plan",           color: "#2563EB" },
  comp_benchmark_report:   { icon: BarChart3,     label: "Comp Benchmark",            color: "#2563EB" },

  // ── Nova ──────────────────────────────────────────────────────────────────
  retention_report:        { icon: Repeat,        label: "Retention Report",          color: "#7C3AED" },
  product_insight_report:  { icon: Star,          label: "Product Insight Report",    color: "#7C3AED" },
  experiment_design:       { icon: FlaskConical,  label: "Experiment Design",         color: "#7C3AED" },
  roadmap:                 { icon: Map,           label: "Product Roadmap",           color: "#7C3AED" },
  user_persona:            { icon: Users,         label: "User Persona",              color: "#7C3AED" },

  // ── Atlas ─────────────────────────────────────────────────────────────────
  competitor_weekly:       { icon: Activity,      label: "Competitor Weekly",         color: "#DC2626" },
  market_map:              { icon: Map,           label: "Market Map",                color: "#DC2626" },
  review_intelligence_report: { icon: Search,     label: "Review Intelligence",       color: "#DC2626" },

  // ── Sage ──────────────────────────────────────────────────────────────────
  investor_readiness_report: { icon: Target,      label: "Investor Readiness Report", color: "#2563EB" },
  contradiction_report:    { icon: AlertTriangle, label: "Contradiction Report",      color: "#2563EB" },
  okr_health_report:       { icon: ClipboardList, label: "OKR Health Report",         color: "#2563EB" },
  crisis_playbook:         { icon: ShieldCheck,   label: "Crisis Playbook",           color: "#2563EB" },

  // ── Carter ────────────────────────────────────────────────────────────────
  customer_health_report:  { icon: Heart,         label: "Customer Health Report",    color: "#EC4899" },
  churn_analysis:          { icon: TrendingUp,    label: "Churn Analysis",            color: "#EC4899" },
  qbr_deck:                { icon: Building2,     label: "QBR Deck",                  color: "#EC4899" },
  expansion_playbook:      { icon: Rocket,        label: "Expansion Playbook",        color: "#EC4899" },
  cs_playbook:             { icon: BookOpen,      label: "CS Playbook",               color: "#EC4899" },

  // ── Riley ─────────────────────────────────────────────────────────────────
  growth_model:            { icon: LineChart,     label: "Growth Model",              color: "#F59E0B" },
  paid_campaign:           { icon: Megaphone,     label: "Paid Campaign",             color: "#F59E0B" },
  referral_program:        { icon: Gift,          label: "Referral Program",          color: "#F59E0B" },
  launch_playbook:         { icon: Rocket,        label: "Launch Playbook",           color: "#F59E0B" },
  growth_report:           { icon: BarChart3,     label: "Growth Report",             color: "#F59E0B" },
  experiment_results:      { icon: FlaskConical,  label: "Experiment Results",        color: "#F59E0B" },
};

export const QUICK_QUESTIONS: Record<string, string[]> = {
  // Existing
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

  // New
  lead_list:          ["What's your ICP (title, company size, industry)?", "Which geographies should we target?", "What's the minimum company revenue or headcount?", "Any specific tech stack or tools they should use?", "How many leads do you need?"],
  call_playbook:      ["Who is this call with (name, title, company)?", "What stage is this deal at?", "What objections have they raised before?", "What's your target outcome for this call?", "Any recent news or context about this company?"],
  pipeline_report:    ["What's your current close rate?", "Which stage has the most stuck deals?", "What's your average sales cycle length?", "What's your current pipeline value?", "What's your monthly revenue target?"],
  proposal:           ["Who is the proposal for?", "What problem are you solving for them?", "What pricing tier or package?", "What's the main ROI you're delivering?", "Any specific terms or conditions to include?"],
  content_calendar:   ["What topics resonate most with your audience?", "Which channels do you publish on?", "What's your posting frequency goal?", "Who is your primary audience?", "What's your content goal this month?"],
  seo_audit:          ["What are your 3-5 target keywords?", "What's your domain and current traffic?", "Who are your top SEO competitors?", "What content do you already have?", "What's your primary conversion goal?"],
  retention_report:   ["What's your Day 7 and Day 30 retention currently?", "Which user segment retains best?", "What do churned users have in common?", "What's your current NPS score?", "What actions correlate with long-term retention?"],
  growth_model:       ["What's your current MoM growth rate?", "Which channels are driving the most customers?", "What's your current CAC and LTV?", "What's your viral coefficient (referrals per customer)?", "What growth bottleneck are you trying to solve?"],
  customer_health_report: ["How many active customers do you have?", "What's your average NPS score?", "Which accounts are most at risk of churning?", "What does 'healthy engagement' look like for your product?", "What's your current churn rate?"],
  churn_analysis:     ["What's your monthly churn rate?", "When do customers typically churn (Day 30, 90, 6mo)?", "What are the top reasons customers cancel?", "Which segments churn most?", "Have you done win-back campaigns before?"],
};
