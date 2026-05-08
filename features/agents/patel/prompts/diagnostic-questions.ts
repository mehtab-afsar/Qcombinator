/**
 * Patel Diagnostic Question Bank
 * Each indicator has 2–3 compound questions designed to surface multiple signals in one ask.
 * Patel selects the 2 most relevant questions for the weakest unscored indicators in each session.
 */

export interface DiagnosticQuestion {
  question: string
  signalsExtracted: string[]
}

export interface IndicatorQuestions {
  indicatorId: string
  indicatorName: string
  dimension: string
  questions: DiagnosticQuestion[]
}

export const DIAGNOSTIC_QUESTIONS: Record<string, IndicatorQuestions> = {

  // ── P1.1 ICP Quality ──────────────────────────────────────────────────────

  'icp.specificity': {
    indicatorId: 'icp.specificity',
    indicatorName: 'Persona Specificity',
    dimension: 'icp',
    questions: [
      {
        question: "Which customer roles or personas are you prioritizing today — and what makes them clearly different from adjacent groups you're NOT targeting?",
        signalsExtracted: ['buyer_roles', 'exclusion_criteria', 'targeting_precision'],
      },
      {
        question: "If a new team member had to identify your ICP from a list of 100 prospects in the wild, what 3–4 observable traits would they look for?",
        signalsExtracted: ['observable_traits', 'specificity_level', 'targeting_operationalizability'],
      },
      {
        question: "Who specifically said yes fastest when you approached them — and what made them different from the ones who said no or went quiet?",
        signalsExtracted: ['early_converts', 'differentiating_traits', 'icp_refinement_signal'],
      },
    ],
  },

  'icp.validation': {
    indicatorId: 'icp.validation',
    indicatorName: 'Persona Validation',
    dimension: 'icp',
    questions: [
      {
        question: "How many real conversations have you had with this specific type of customer — and in those conversations, what patterns kept repeating vs. what surprised you?",
        signalsExtracted: ['conversation_count', 'validated_patterns', 'hypothesis_surprises'],
      },
      {
        question: "What has changed about your ICP definition based on what you've learned from real customers — and what made you update it?",
        signalsExtracted: ['iteration_count', 'validation_signals', 'icp_evolution'],
      },
    ],
  },

  'icp.commercial_alignment': {
    indicatorId: 'icp.commercial_alignment',
    indicatorName: 'Commercial Alignment',
    dimension: 'icp',
    questions: [
      {
        question: "Has anyone in this ICP actually paid you money or committed budget — and if yes, what was the deal size and what pushed them to commit?",
        signalsExtracted: ['paying_customers', 'deal_size', 'budget_trigger', 'authority_level'],
      },
      {
        question: "Who in this persona has the actual budget authority — do they sign the PO themselves, or does it need to go above them? And what's the typical budget size they control?",
        signalsExtracted: ['economic_buyer_identity', 'budget_authority', 'deal_size_range'],
      },
    ],
  },

  'icp.iteration': {
    indicatorId: 'icp.iteration',
    indicatorName: 'Persona Iteration',
    dimension: 'icp',
    questions: [
      {
        question: "Has your definition of who you're targeting changed since you started — what triggered the update and what did you learn?",
        signalsExtracted: ['iteration_triggers', 'learning_events', 'icp_evolution_maturity'],
      },
      {
        question: "Do you regularly review your ICP definition as a team — and what would have to happen in the market for you to update it again?",
        signalsExtracted: ['review_cadence', 'update_criteria', 'iteration_discipline'],
      },
    ],
  },

  'icp.team_alignment': {
    indicatorId: 'icp.team_alignment',
    indicatorName: 'Team Alignment',
    dimension: 'icp',
    questions: [
      {
        question: "If I asked your co-founder or first salesperson to describe your ICP right now, would they say what you just said — or would I get a different answer?",
        signalsExtracted: ['team_alignment_level', 'definition_consistency', 'operationalization'],
      },
      {
        question: "Is your ICP definition written down anywhere that the whole team references — or does it live in your head?",
        signalsExtracted: ['documentation_exists', 'team_adoption', 'operationalization'],
      },
    ],
  },

  // ── P1.2 Customer Insight ──────────────────────────────────────────────────

  'insight.problem': {
    indicatorId: 'insight.problem',
    indicatorName: 'Problem Insight',
    dimension: 'insight',
    questions: [
      {
        question: "What is the exact moment in their workflow when this problem hits hardest — what are they trying to do when it breaks down, and what does that cost them?",
        signalsExtracted: ['problem_trigger_moment', 'workflow_context', 'cost_of_problem'],
      },
      {
        question: "Why hasn't this problem been solved already — what have they tried before you, and why did it fail or fall short?",
        signalsExtracted: ['root_cause_depth', 'incumbent_solution_gaps', 'problem_persistence_reason'],
      },
    ],
  },

  'insight.context': {
    indicatorId: 'insight.context',
    indicatorName: 'Customer Context Understanding',
    dimension: 'insight',
    questions: [
      {
        question: "Walk me through what a typical day looks like for this buyer when they're dealing with this problem — who else is involved, what tools do they use, and what's the pressure they're under?",
        signalsExtracted: ['day_in_life', 'stakeholders_involved', 'tools_environment', 'pressure_context'],
      },
      {
        question: "What else is competing for their attention right now — what other priorities are they balancing that make this problem harder to fix?",
        signalsExtracted: ['competing_priorities', 'organizational_context', 'urgency_blockers'],
      },
    ],
  },

  'insight.validation_depth': {
    indicatorId: 'insight.validation_depth',
    indicatorName: 'Validation Depth',
    dimension: 'insight',
    questions: [
      {
        question: "How many structured customer discovery conversations have you run — and did you use a consistent set of questions, or was each one different?",
        signalsExtracted: ['interview_count', 'methodology_rigor', 'pattern_extraction'],
      },
      {
        question: "Which pains came up most consistently across your conversations — and which ones surprised you by not showing up as often as you expected?",
        signalsExtracted: ['validated_pains', 'hypothesis_corrections', 'pain_hierarchy'],
      },
    ],
  },

  'insight.buying': {
    indicatorId: 'insight.buying',
    indicatorName: 'Buying Insight',
    dimension: 'insight',
    questions: [
      {
        question: "In deals you've had or observed, who was involved in the buying decision — who championed it internally, who had final sign-off, and who tried to kill it?",
        signalsExtracted: ['decision_making_unit', 'champion_profile', 'blocker_profile', 'economic_buyer'],
      },
      {
        question: "What specifically triggered the buyer to go from 'I know this is a problem' to 'I need to buy something now' — was there a specific event, a missed target, a new hire?",
        signalsExtracted: ['purchase_trigger_events', 'urgency_creation', 'buying_moment'],
      },
    ],
  },

  'insight.value_proof': {
    indicatorId: 'insight.value_proof',
    indicatorName: 'Value Proof Clarity',
    dimension: 'insight',
    questions: [
      {
        question: "What is the specific, measurable outcome a customer gets from using your product — and do you have a real example with numbers you can point to?",
        signalsExtracted: ['quantified_outcome', 'customer_proof_example', 'roi_clarity'],
      },
      {
        question: "If a buyer asks you 'what's the ROI on this' — what do you say, and have you ever had a customer confirm that calculation is accurate?",
        signalsExtracted: ['roi_narrative', 'proof_validation', 'financial_value_clarity'],
      },
    ],
  },

  // ── P1.3 Channel Focus ────────────────────────────────────────────────────

  'channel.clarity': {
    indicatorId: 'channel.clarity',
    indicatorName: 'Channel Clarity',
    dimension: 'channel',
    questions: [
      {
        question: "Which channel has produced the most conversations with people who actually had budget to buy — even if the volume was small? What did that look like?",
        signalsExtracted: ['proven_channel', 'budget_qualified_leads', 'channel_effectiveness'],
      },
      {
        question: "How many active channels are you running right now, and for each one, can you tell me the conversion rate and cost per conversation?",
        signalsExtracted: ['channel_count', 'channel_metrics', 'focus_discipline'],
      },
    ],
  },

  'channel.icp_fit': {
    indicatorId: 'channel.icp_fit',
    indicatorName: 'Channel–ICP Fit',
    dimension: 'channel',
    questions: [
      {
        question: "When you reach out through your primary channel, what's the response rate from your ICP — and how does it compare to when you try other channels?",
        signalsExtracted: ['channel_response_rate', 'icp_channel_match', 'comparative_data'],
      },
      {
        question: "Where do your best customers spend their time professionally — conferences, LinkedIn, communities, trade media? Is that where you're showing up?",
        signalsExtracted: ['icp_attention_map', 'channel_presence_alignment', 'missed_channels'],
      },
    ],
  },

  'channel.focus_discipline': {
    indicatorId: 'channel.focus_discipline',
    indicatorName: 'Focus Discipline',
    dimension: 'channel',
    questions: [
      {
        question: "When a new channel idea comes up — a conference, a partnership, a new tactic — how do you decide whether to pursue it or stay focused on what's working?",
        signalsExtracted: ['decision_criteria', 'focus_discipline', 'distraction_resistance'],
      },
      {
        question: "How many channels did you try in the last 6 months, and which ones did you deliberately stop doing and why?",
        signalsExtracted: ['channel_experimentation', 'elimination_discipline', 'learning_application'],
      },
    ],
  },

  'channel.execution_consistency': {
    indicatorId: 'channel.execution_consistency',
    indicatorName: 'Execution Consistency',
    dimension: 'channel',
    questions: [
      {
        question: "What does your weekly outreach/channel execution look like — how many touches, what days, who sends them, and is there a system or does it depend on someone finding time?",
        signalsExtracted: ['execution_cadence', 'system_vs_heroics', 'volume_baseline'],
      },
      {
        question: "If you were sick for two weeks, would your channel execution continue at the same rate — or would it stop?",
        signalsExtracted: ['system_dependency', 'founder_dependency', 'scalability'],
      },
    ],
  },

  'channel.learning_loop': {
    indicatorId: 'channel.learning_loop',
    indicatorName: 'Channel Learning Loop',
    dimension: 'channel',
    questions: [
      {
        question: "What metrics do you track for your primary channel, and when did you last change something based on what the data showed?",
        signalsExtracted: ['tracked_metrics', 'data_driven_iteration', 'optimization_cadence'],
      },
      {
        question: "Have you ever run a deliberate A/B test on your messaging or targeting — what did you test and what did you learn?",
        signalsExtracted: ['testing_maturity', 'hypothesis_driven_optimization', 'learning_velocity'],
      },
    ],
  },

  // ── P1.4 Message Clarity ──────────────────────────────────────────────────

  'message.simplicity': {
    indicatorId: 'message.simplicity',
    indicatorName: 'Message Simplicity',
    dimension: 'message',
    questions: [
      {
        question: "How do you explain what you do in one sentence to someone who's never heard of you — say it out loud like you would at a conference?",
        signalsExtracted: ['elevator_pitch', 'simplicity_level', 'jargon_usage'],
      },
      {
        question: "If your ICP read your homepage headline right now, would they immediately know it was for them — or would they need to read more to figure out if it was relevant?",
        signalsExtracted: ['headline_clarity', 'icp_recognition_speed', 'message_fit'],
      },
    ],
  },

  'message.proof': {
    indicatorId: 'message.proof',
    indicatorName: 'Proof Integration',
    dimension: 'message',
    questions: [
      {
        question: "What's the strongest proof point you have right now — a specific customer win, a metric, a quote — and is it in your core messaging where buyers see it first?",
        signalsExtracted: ['strongest_proof', 'proof_placement', 'proof_specificity'],
      },
      {
        question: "When a skeptical buyer pushes back on your claims, what do you show them — and have you tested whether that proof actually moves them?",
        signalsExtracted: ['objection_proof_mapping', 'proof_effectiveness', 'buyer_validation'],
      },
    ],
  },

  'message.icp_relevance': {
    indicatorId: 'message.icp_relevance',
    indicatorName: 'ICP Relevance',
    dimension: 'message',
    questions: [
      {
        question: "Does your messaging use the exact words and phrases your ICP uses to describe the problem — or does it use your internal language and product terminology?",
        signalsExtracted: ['language_alignment', 'icp_vocabulary_adoption', 'insider_jargon_risk'],
      },
      {
        question: "Have you shown your messaging to 5 people who match your ICP and asked if they felt it was written for them — what did they say?",
        signalsExtracted: ['relevance_testing', 'icp_resonance_score', 'message_validation'],
      },
    ],
  },

  'message.differentiation': {
    indicatorId: 'message.differentiation',
    indicatorName: 'Differentiation Strength',
    dimension: 'message',
    questions: [
      {
        question: "When a prospect is also evaluating [your most common competitor], what do they say when you ask why they chose you — or why they didn't?",
        signalsExtracted: ['competitive_win_reasons', 'differentiation_clarity', 'buyer_stated_preference'],
      },
      {
        question: "What do you say in your messaging that your top competitor literally cannot say about themselves — and is that claim front and center?",
        signalsExtracted: ['unique_claim', 'differentiation_defensibility', 'competitive_positioning'],
      },
    ],
  },

  'message.comprehension': {
    indicatorId: 'message.comprehension',
    indicatorName: 'Customer Comprehension',
    dimension: 'message',
    questions: [
      {
        question: "After seeing your pitch deck or website, have you asked buyers to explain back to you what you do — and what do they actually say?",
        signalsExtracted: ['comprehension_test_results', 'message_recall', 'confusion_points'],
      },
      {
        question: "What's the most common misunderstanding buyers have about what you do when they first encounter your product — and where do they get that wrong idea from?",
        signalsExtracted: ['common_misconceptions', 'message_gap_source', 'clarity_opportunities'],
      },
    ],
  },
}
