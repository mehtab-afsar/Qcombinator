/**
 * GTM Diagnostics — D1, D2, D3
 *
 * Three targeted diagnostic modules that identify WHY a founder's GTM or market
 * Q-Score is low. Each diagnostic maps to a specific gap and surfaces a routable
 * action ("talk to Patel about X").
 *
 * D1 — ICP Clarity       (5 indicators)
 * D2 — Customer Insight  (5 indicators)
 * D3 — Channel Focus     (5 indicators)
 *
 * Scores: 0–100 per diagnostic, 0–100 per indicator
 * Threshold: <60 = gap identified, action routed to Patel
 */

import { AssessmentData } from '../types/qscore.types';
import { AGENT_IDS } from '@/lib/constants/agent-ids';

export interface DiagnosticIndicator {
  id: string;
  name: string;
  score: number;      // 0-100
  gap: boolean;       // true if score < 60
  evidence: string;   // what we observed in the data
  action?: string;    // specific fix if gap exists
}

export interface GTMDiagnostic {
  id: 'D1' | 'D2' | 'D3';
  name: string;
  score: number;                   // 0-100 average of indicators
  grade: 'strong' | 'weak' | 'critical';
  indicators: DiagnosticIndicator[];
  topGap: string | null;           // the most critical specific gap
  routeTo: 'patel' | null;         // agent to route to if gap detected
  challengeParam: string | null;   // ?challenge= URL param for the agent
}

export interface GTMDiagnosticsResult {
  D1: GTMDiagnostic;
  D2: GTMDiagnostic;
  D3: GTMDiagnostic;
  overallGTMScore: number;
  primaryGap: string | null;       // the single most impactful gap to fix first
  routeToAgent: 'patel' | null;
  routeChallenge: string | null;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function scoreText(text: string | undefined, minLen = 100, targetLen = 400): number {
  if (!text || text.trim().length < 20) return 0;
  const len = text.trim().length;
  if (len < minLen) return 30;
  if (len < targetLen) return 30 + Math.round(50 * (len - minLen) / (targetLen - minLen));
  return 80 + Math.min(20, Math.round(10 * (len - targetLen) / targetLen));
}

function hasSpecificNumbers(text: string): boolean {
  return /\$[\d,]+|\d+%|\d+\s*(customers|users|companies|people|accounts)/i.test(text);
}

function hasNamedEntity(text: string): boolean {
  // Capitalized multi-word sequences suggest real company/person names
  return /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/.test(text);
}

function grade(score: number): 'strong' | 'weak' | 'critical' {
  if (score >= 65) return 'strong';
  if (score >= 40) return 'weak';
  return 'critical';
}

// ─── D1: ICP Clarity ─────────────────────────────────────────────────────────
function diagnoseD1(data: AssessmentData): GTMDiagnostic {
  const icp = data.gtm?.icpDescription ?? '';
  const channels = data.gtm?.channelsTried ?? [];
  const channelResults = data.gtm?.channelResults ?? [];

  const indicators: DiagnosticIndicator[] = [
    // 1.1 Persona Specificity — named job title + company type
    (() => {
      const hasJobTitle = /\b(VP|Director|Head of|Manager|CTO|CEO|CFO|Founder|Owner|Lead)\b/i.test(icp);
      const hasCompanyType = /\b(SaaS|startup|enterprise|SMB|mid-market|agency|clinic|firm|retailer)\b/i.test(icp);
      const score = (hasJobTitle ? 40 : 0) + (hasCompanyType ? 40 : 0) + (icp.length > 200 ? 20 : 0);
      return {
        id: 'D1.1', name: 'Persona Specificity', score,
        gap: score < 60,
        evidence: icp.length < 50 ? 'ICP description is too vague or missing' :
          !hasJobTitle ? 'No specific job title mentioned in ICP' :
          !hasCompanyType ? 'No company type or size mentioned' :
          `ICP references both job title and company type (${score}/100)`,
        action: score < 60 ? 'Define your ICP with a specific job title (e.g. "VP Sales at Series B SaaS") and company size' : undefined,
      };
    })(),

    // 1.2 Validation — has the ICP been validated with real conversations?
    (() => {
      const convCount = data.conversationCount ?? 0;
      const hasQuote = !!(data.customerQuote && data.customerQuote.length > 30);
      const score = Math.min(100,
        (convCount >= 20 ? 40 : convCount >= 5 ? 25 : convCount > 0 ? 10 : 0) +
        (hasQuote ? 40 : 0) +
        (data.customerCommitment && data.customerCommitment.length > 50 ? 20 : 0)
      );
      return {
        id: 'D1.2', name: 'ICP Validation', score,
        gap: score < 60,
        evidence: convCount === 0 ? 'No customer conversations recorded' :
          `${convCount} conversations, ${hasQuote ? 'quote provided' : 'no direct quotes'}`,
        action: score < 60 ? 'Conduct 5 more discovery calls with your ICP and document verbatim quotes' : undefined,
      };
    })(),

    // 1.3 Commercial Alignment — does the ICP have budget and buying authority?
    (() => {
      const hasBudget = /\bbud[gj]et|spending|\$[\d,]+|per seat|per month|ARR|contract\b/i.test(icp + (data.customerQuote ?? ''));
      const hasAuthority = /\b(decision|approver|buyer|sign off|authorize|budget holder)\b/i.test(icp + (data.advantageExplanation ?? ''));
      const score = (hasBudget ? 50 : 0) + (hasAuthority ? 50 : 0);
      return {
        id: 'D1.3', name: 'Commercial Alignment', score,
        gap: score < 60,
        evidence: !hasBudget ? 'No mention of budget or willingness to pay in ICP' :
          !hasAuthority ? 'ICP buyer authority is unclear' :
          'ICP shows both budget signal and buying authority',
        action: score < 60 ? 'Qualify whether your ICP has budget and authority to buy. Add this to your ICP document.' : undefined,
      };
    })(),

    // 1.4 Iteration — has the ICP been refined over time?
    (() => {
      const hasFailed = !!(data.failedBelief && data.failedBelief.length > 50);
      const hasChanged = !!(data.failedChange && data.failedChange.length > 30);
      const hasIterated = !!(data.gtm?.messagingTested);
      const score = (hasFailed ? 35 : 0) + (hasChanged ? 35 : 0) + (hasIterated ? 30 : 0);
      return {
        id: 'D1.4', name: 'ICP Iteration', score,
        gap: score < 60,
        evidence: !hasFailed ? 'No pivots or failed assumptions documented' :
          `Documents failed assumption${hasChanged ? ' and resulting change' : ''}`,
        action: score < 60 ? 'Document how your ICP definition has changed — what did you learn that made you narrow it?' : undefined,
      };
    })(),

    // 1.5 Team Alignment — is the ICP shared and acted upon?
    (() => {
      const channelsFocused = channels.length > 0 && channels.length <= 3;
      const hasConsistentCAC = !!(data.gtm?.currentCAC && data.gtm.currentCAC > 0);
      const score = (channelsFocused ? 50 : channels.length > 3 ? 20 : 0) + (hasConsistentCAC ? 50 : 0);
      return {
        id: 'D1.5', name: 'Team Alignment', score,
        gap: score < 60,
        evidence: channels.length === 0 ? 'No channels defined — ICP not actionable' :
          channels.length > 3 ? `${channels.length} channels tried — ICP may be too broad` :
          `Focused on ${channels.length} channel(s) with${hasConsistentCAC ? '' : 'out'} CAC tracking`,
        action: score < 60 ? 'Narrow to 1-2 channels that directly reach your ICP and measure CAC per channel' : undefined,
      };
    })(),
  ];

  const avgScore = Math.round(indicators.reduce((s, i) => s + i.score, 0) / indicators.length);
  const weakest = indicators.filter(i => i.gap).sort((a, b) => a.score - b.score)[0];

  return {
    id: 'D1', name: 'ICP Clarity',
    score: avgScore,
    grade: grade(avgScore),
    indicators,
    topGap: weakest?.action ?? null,
    routeTo: avgScore < 60 ? AGENT_IDS.PATEL : null,
    challengeParam: avgScore < 60 ? 'gtm' : null,
  };
}

// ─── D2: Customer Insight ─────────────────────────────────────────────────────
function diagnoseD2(data: AssessmentData): GTMDiagnostic {
  const indicators: DiagnosticIndicator[] = [
    // 2.1 Problem Insight — do they understand the root cause?
    (() => {
      const problemScore = scoreText(data.problemStory, 100, 500);
      const hasNumbers = hasSpecificNumbers(data.problemStory ?? '');
      const score = Math.min(100, problemScore + (hasNumbers ? 20 : 0));
      return {
        id: 'D2.1', name: 'Problem Insight', score,
        gap: score < 60,
        evidence: !data.problemStory ? 'No problem origin story provided' :
          `Problem story: ${data.problemStory.length} chars${hasNumbers ? ', has specific numbers' : ', no specific numbers'}`,
        action: score < 60 ? 'Rewrite your problem story with specific numbers, dates, and customer names' : undefined,
      };
    })(),

    // 2.2 Customer Context — do they know who their customer is in detail?
    (() => {
      const typeScore = data.customerType ? 50 : 0;
      const hasSpecificType = data.customerType ? hasNamedEntity(data.customerType) || data.customerType.length > 50 : false;
      const score = typeScore + (hasSpecificType ? 50 : 0);
      return {
        id: 'D2.2', name: 'Customer Context', score,
        gap: score < 60,
        evidence: !data.customerType ? 'Customer type not defined' :
          `Customer type: "${data.customerType.slice(0, 80)}"`,
        action: score < 60 ? 'Describe your customer in one specific sentence: industry, company size, role, and pain.' : undefined,
      };
    })(),

    // 2.3 Validation Depth — quality of conversations, not just count
    (() => {
      const convCount = data.conversationCount ?? 0;
      const hasQuote = !!(data.customerQuote && data.customerQuote.length > 50);
      const hasSurprise = !!(data.customerSurprise && data.customerSurprise.length > 50);
      const score = Math.min(100,
        (convCount >= 20 ? 30 : Math.round(30 * convCount / 20)) +
        (hasQuote ? 35 : 0) +
        (hasSurprise ? 35 : 0)
      );
      return {
        id: 'D2.3', name: 'Validation Depth', score,
        gap: score < 60,
        evidence: `${convCount} conversations, ${hasQuote ? 'verbatim quote: yes' : 'no verbatim quote'}, ${hasSurprise ? 'unexpected insight: yes' : 'no unexpected insight'}`,
        action: score < 60 ? 'Get 3 verbatim quotes that show the pain is real. Document what surprised you.' : undefined,
      };
    })(),

    // 2.4 Buying Insight — do they know the purchase trigger?
    (() => {
      const hasTrigger = /\b(trigger|event|when|budget cycle|contract|renewal|incident|pain|urgency)\b/i.test(
        (data.customerQuote ?? '') + (data.customerCommitment ?? '') + (data.gtm?.icpDescription ?? '')
      );
      const hasPurchase = /\b(paid|signed|contract|LOI|pilot|POC|purchase|demo request|close)\b/i.test(
        data.customerCommitment ?? ''
      );
      const score = (hasTrigger ? 50 : 0) + (hasPurchase ? 50 : 0);
      return {
        id: 'D2.4', name: 'Buying Insight', score,
        gap: score < 60,
        evidence: !hasTrigger ? 'No buying trigger identified in customer evidence' :
          `Trigger identified${hasPurchase ? ' + purchase signal recorded' : ''}`,
        action: score < 60 ? 'Ask every customer: "What event made you start looking for a solution?" Document the pattern.' : undefined,
      };
    })(),

    // 2.5 Value Proof — quantified customer outcome
    (() => {
      const hasMetric = hasSpecificNumbers(data.customerQuote ?? '') || hasSpecificNumbers(data.results ?? '');
      const hasOutcome = /\b(saved|reduced|increased|grew|faster|cheaper|replace|eliminate|automate)\b/i.test(
        (data.customerQuote ?? '') + (data.results ?? '')
      );
      const score = (hasMetric ? 50 : 0) + (hasOutcome ? 50 : 0);
      return {
        id: 'D2.5', name: 'Value Proof', score,
        gap: score < 60,
        evidence: !hasOutcome ? 'No quantified customer outcome documented' :
          `Outcome documented${hasMetric ? ' with specific numbers' : ' (qualitative only)'}`,
        action: score < 60 ? 'Get one customer to say: "We saved X hours / $Y / achieved Z metric using your product."' : undefined,
      };
    })(),
  ];

  const avgScore = Math.round(indicators.reduce((s, i) => s + i.score, 0) / indicators.length);
  const weakest = indicators.filter(i => i.gap).sort((a, b) => a.score - b.score)[0];

  return {
    id: 'D2', name: 'Customer Insight',
    score: avgScore,
    grade: grade(avgScore),
    indicators,
    topGap: weakest?.action ?? null,
    routeTo: avgScore < 60 ? AGENT_IDS.PATEL : null,
    challengeParam: avgScore < 60 ? 'gtm' : null,
  };
}

// ─── D3: Channel Focus ────────────────────────────────────────────────────────
function diagnoseD3(data: AssessmentData): GTMDiagnostic {
  const channels = data.gtm?.channelsTried ?? [];
  const channelResults = data.gtm?.channelResults ?? [];
  const currentCAC = data.gtm?.currentCAC;
  const targetCAC = data.gtm?.targetCAC;
  const messagingTested = data.gtm?.messagingTested ?? false;
  const messagingResults = data.gtm?.messagingResults ?? '';

  const indicators: DiagnosticIndicator[] = [
    // 3.1 Channel Clarity — focused vs spray-and-pray
    (() => {
      const count = channels.length;
      const score = count === 0 ? 0 : count === 1 ? 70 : count === 2 ? 90 : count === 3 ? 80 : Math.max(0, 90 - (count - 3) * 15);
      return {
        id: 'D3.1', name: 'Channel Clarity', score,
        gap: score < 60,
        evidence: count === 0 ? 'No channels defined' :
          count > 4 ? `${count} channels — too many to execute well` :
          `Using ${count} channel(s): ${channels.slice(0, 3).join(', ')}`,
        action: score < 60 ? count === 0 ? 'Define your primary channel. Where does your ICP spend time?' : 'Cut to 2 channels maximum. Depth beats breadth.' : undefined,
      };
    })(),

    // 3.2 ICP-Channel Fit — does the channel actually reach the ICP?
    (() => {
      const icp = data.gtm?.icpDescription ?? '';
      const isB2B = /\b(B2B|enterprise|company|team|business|startup|SaaS)\b/i.test(icp);
      const hasB2BChannels = channels.some(c => /\b(linkedin|outbound|direct|cold email|partner|referral|sales)\b/i.test(c));
      const isB2C = /\b(consumer|user|individual|person|people)\b/i.test(icp);
      const hasB2CChannels = channels.some(c => /\b(social|SEO|content|paid ads|influencer|app store)\b/i.test(c));
      const noICP = icp.length < 30;
      const score = noICP ? 30 :
        (isB2B && hasB2BChannels) ? 85 :
        (isB2C && hasB2CChannels) ? 85 :
        (channels.length > 0) ? 50 : 0;
      return {
        id: 'D3.2', name: 'ICP-Channel Fit', score,
        gap: score < 60,
        evidence: noICP ? 'ICP not specific enough to assess channel fit' :
          `ICP appears ${isB2B ? 'B2B' : isB2C ? 'B2C' : 'unclear'}, channels: ${channels.join(', ') || 'none'}`,
        action: score < 60 ? 'Your channel must match where your ICP actively looks for solutions. Map ICP job → watering hole → channel.' : undefined,
      };
    })(),

    // 3.3 Channel Discipline — tracking and measuring?
    (() => {
      const hasCAC = currentCAC && currentCAC > 0;
      const hasChannelMetrics = channelResults.some(r => r.conversions !== undefined || r.cac !== undefined);
      const score = (hasCAC ? 50 : 0) + (hasChannelMetrics ? 50 : 0);
      return {
        id: 'D3.3', name: 'Channel Discipline', score,
        gap: score < 60,
        evidence: !hasCAC && !hasChannelMetrics ? 'No CAC or channel metrics tracked' :
          `CAC: ${hasCAC ? `$${currentCAC}` : 'not tracked'}, per-channel metrics: ${hasChannelMetrics ? 'yes' : 'no'}`,
        action: score < 60 ? 'Track CAC per channel. Even rough numbers ($X per lead) unlock the ability to optimise.' : undefined,
      };
    })(),

    // 3.4 Execution Consistency — channels tried vs channels measured
    (() => {
      const triedCount = channels.length;
      const measuredCount = channelResults.length;
      const ratio = triedCount > 0 ? measuredCount / triedCount : 0;
      const score = triedCount === 0 ? 0 : Math.round(Math.min(100, ratio * 100));
      return {
        id: 'D3.4', name: 'Execution Consistency', score,
        gap: score < 60,
        evidence: `${triedCount} channels tried, ${measuredCount} with tracked results`,
        action: score < 60 ? 'For every channel you try, record: spend, leads generated, and CAC. No measurement = no learning.' : undefined,
      };
    })(),

    // 3.5 Learning Loop — iterating based on results
    (() => {
      const hasTested = messagingTested;
      const hasResults = messagingResults.length > 50;
      const hasLearned = !!(data.learned && data.learned.length > 50);
      const hasChanged = !!(data.changed && data.changed.length > 30);
      const score = (hasTested ? 25 : 0) + (hasResults ? 25 : 0) + (hasLearned ? 25 : 0) + (hasChanged ? 25 : 0);
      return {
        id: 'D3.5', name: 'Learning Loop', score,
        gap: score < 60,
        evidence: !hasTested ? 'No messaging tests documented' :
          `Messaging tested, ${hasResults ? 'results documented' : 'no results recorded'}, ${hasLearned ? 'learning captured' : 'no learning documented'}`,
        action: score < 60 ? 'Run one channel experiment per week. Document what you tried, what happened, and what you changed.' : undefined,
      };
    })(),
  ];

  const avgScore = Math.round(indicators.reduce((s, i) => s + i.score, 0) / indicators.length);
  const weakest = indicators.filter(i => i.gap).sort((a, b) => a.score - b.score)[0];

  return {
    id: 'D3', name: 'Channel Focus',
    score: avgScore,
    grade: grade(avgScore),
    indicators,
    topGap: weakest?.action ?? null,
    routeTo: avgScore < 60 ? AGENT_IDS.PATEL : null,
    challengeParam: avgScore < 60 ? 'gtm' : null,
  };
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function runGTMDiagnostics(data: AssessmentData): GTMDiagnosticsResult {
  const D1 = diagnoseD1(data);
  const D2 = diagnoseD2(data);
  const D3 = diagnoseD3(data);

  const overallGTMScore = Math.round((D1.score + D2.score + D3.score) / 3);

  // Find the worst diagnostic and its top gap
  const weakestDiag = [D1, D2, D3].sort((a, b) => a.score - b.score)[0];
  const primaryGap = weakestDiag.score < 60 ? weakestDiag.topGap : null;

  return {
    D1, D2, D3,
    overallGTMScore,
    primaryGap,
    routeToAgent: overallGTMScore < 60 ? AGENT_IDS.PATEL : null,
    routeChallenge: overallGTMScore < 60 ? 'gtm' : null,
  };
}
