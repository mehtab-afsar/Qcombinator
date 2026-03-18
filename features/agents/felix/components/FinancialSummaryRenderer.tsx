'use client'

import { useState } from 'react'
import { bg, surf, bdr, ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

export function FinancialSummaryRenderer({ data, artifactId }: { data: Record<string, unknown>; artifactId?: string }) {
  const d = data as {
    snapshot?: Record<string, string>;
    unitEconomicsVerdict?: string;
    keyInsights?: string[];
    fundraisingRecommendation?: { amount?: string; rationale?: string; timeline?: string };
    useOfFunds?: { category: string; percentage: number; rationale: string }[];
    risks?: { risk: string; severity: string; mitigation: string }[];
  };

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [recipients, setRecipients]           = useState("");
  const [topWin, setTopWin]                   = useState("");
  const [topChallenge, setTopChallenge]       = useState("");
  const [ask, setAsk]                         = useState("");
  const [sendingUpdate, setSendingUpdate]     = useState(false);
  const [updateResult, setUpdateResult]       = useState<{ ok?: boolean; error?: string } | null>(null);

  // Stripe live metrics state
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeKey, setStripeKey]             = useState("");
  const [fetchingStripe, setFetchingStripe]   = useState(false);
  const [stripeMetrics, setStripeMetrics]     = useState<{ mrr: number; arr: number; activeSubscriptions: number; totalCustomers?: number; last30DayRevenue: number } | null>(null);
  const [stripeError, setStripeError]         = useState<string | null>(null);

  // Runway alert state
  const [alertSent, setAlertSent]             = useState(false);
  const [sendingAlert, setSendingAlert]       = useState(false);
  const [alertError, setAlertError]           = useState<string | null>(null);

  // Runway cuts analysis state
  const [analyzingCuts, setAnalyzingCuts]     = useState(false);
  const [cutsResult, setCutsResult]           = useState<{
    cuts: { category: string; potentialSaving: string; action: string; difficulty: string; timeframe: string; rationale: string }[];
    summary: string;
    totalPotentialSavings: string;
  } | null>(null);
  const [cutsError, setCutsError]             = useState<string | null>(null);

  // Scenario modeling state
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [scenarioInput, setScenarioInput]         = useState("");
  const [modelingScenario, setModelingScenario]   = useState(false);
  const [scenarioResult, setScenarioResult]       = useState<{
    scenarioSummary?: string;
    assumptions?: string[];
    impacts?: { metric: string; current: string; projected: string; change: string; direction: string }[];
    runwayImpact?: string;
    breakEvenImpact?: string;
    recommendation?: string;
    alternativeScenario?: string;
  } | null>(null);
  const [scenarioError, setScenarioError]         = useState<string | null>(null);

  // Expense categorization state
  const [showExpensesPanel, setShowExpensesPanel] = useState(false);
  const [expensesInput, setExpensesInput]         = useState("");
  const [categorizingExpenses, setCategorizingExpenses] = useState(false);
  const [expensesResult, setExpensesResult]       = useState<{
    lineItems?: { description: string; amount: number; category: string; subcategory: string; isRecurring: boolean }[];
    totals?: Record<string, number>;
    totalMonthlyBurn?: number;
    largestCategories?: string[];
    savingsOpportunities?: { item: string; suggestion: string; estimatedSaving: number }[];
    burnHealthNote?: string;
  } | null>(null);
  const [expensesError, setExpensesError]         = useState<string | null>(null);

  async function handleCategorizeExpenses() {
    if (!expensesInput.trim() || categorizingExpenses) return;
    setCategorizingExpenses(true); setExpensesError(null); setExpensesResult(null);
    try {
      const res = await fetch('/api/agents/felix/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses: expensesInput }),
      });
      const r = await res.json();
      if (res.ok && r.result) setExpensesResult(r.result);
      else setExpensesError(r.error ?? 'Categorization failed');
    } catch { setExpensesError('Network error'); }
    finally { setCategorizingExpenses(false); }
  }

  // Invoice state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceEmail, setInvoiceEmail]         = useState("");
  const [invoiceName, setInvoiceName]           = useState("");
  const [invoiceAmount, setInvoiceAmount]       = useState("");
  const [invoiceDesc, setInvoiceDesc]           = useState("");
  const [invoiceDue, setInvoiceDue]             = useState("");
  const [sendingInvoice, setSendingInvoice]     = useState(false);
  const [invoiceResult, setInvoiceResult]       = useState<{ invoiceNumber?: string; invoiceUrl?: string; platform?: string } | null>(null);
  const [invoiceError, setInvoiceError]         = useState<string | null>(null);

  // Actuals vs Projections state
  const [showActualsPanel, setShowActualsPanel] = useState(false);
  const [actualMRRInput, setActualMRRInput]     = useState("");
  const [runningActuals, setRunningActuals]     = useState(false);
  const [actualsResult, setActualsResult]       = useState<{
    actualMRR?: number; projectedMRR?: number | null; variance?: number | null; variancePct?: number | null; onTrack?: boolean | null;
    analysis?: { headline?: string; status?: string; drivers?: string[]; risks?: string[]; actions?: { priority: string; action: string; impact: string }[]; forecastNote?: string };
  } | null>(null);
  const [actualsError, setActualsError]         = useState<string | null>(null);

  // Financial model state
  const [runningModel, setRunningModel]         = useState(false);
  const [modelResult, setModelResult]           = useState<{
    startingMetrics?: { mrr: number; burn: number; runway: number; customers: number; cashOnHand: number };
    scenarios?: { name: string; monthlyGrowthRate: number; months: { month: number; revenue: number; expenses: number; netBurn: number; cumulativeCash: number; customers: number }[] }[];
    assumptions?: string[];
    keyMilestones?: { month: number; milestone: string; revenueTarget: number }[];
    breakEvenMonth?: number | null;
    recommendation?: string;
    csvData?: string;
  } | null>(null);
  const [modelError, setModelError]             = useState<string | null>(null);
  const [modelScenario, setModelScenario]       = useState("Base");

  async function handleRunModel() {
    if (runningModel) return;
    setRunningModel(true); setModelError(null);
    try {
      const res = await fetch('/api/agents/felix/model', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.scenarios) setModelResult(r);
      else setModelError(r.error ?? 'Failed to generate financial model');
    } catch { setModelError('Network error'); }
    finally { setRunningModel(false); }
  }

  function handleDownloadModelCSV() {
    if (!modelResult?.csvData) return;
    const blob = new Blob([modelResult.csvData], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = '24-month-financial-model.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // Fundraising modeler state
  const [showFundraisingModal, setShowFundraisingModal] = useState(false);
  const [calcRaiseAmount, setCalcRaiseAmount]           = useState("");
  const [calcPreMoney, setCalcPreMoney]                 = useState("");
  const [calcInstrument, setCalcInstrument]             = useState("SAFE");
  const [calculatingFundraising, setCalculatingFundraising] = useState(false);
  const [fundraisingCalcResult, setFundraisingCalcResult] = useState<{
    raiseAmount?: number; postMoneyValuation?: number | null; investorPercent?: number | null;
    yourRemaining?: number | null; runwayExtensionMonths?: number | null;
    recommendation?: string; timeline?: string;
    useOfFunds?: { category: string; percentage: number; amount: string; rationale: string }[];
    investorReturn?: string; milestoneToHit?: string; dilutionComment?: string; alternativeStructure?: string;
  } | null>(null);
  const [fundraisingCalcError, setFundraisingCalcError] = useState<string | null>(null);

  async function handleRunActuals() {
    const mrr = parseFloat(actualMRRInput.replace(/[^0-9.]/g, ''));
    if (isNaN(mrr) || mrr <= 0 || runningActuals) return;
    setRunningActuals(true); setActualsError(null); setActualsResult(null);
    try {
      const res = await fetch('/api/agents/felix/actuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualMRR: mrr, financialSnapshot: d.snapshot }),
      });
      const result = await res.json();
      if (res.ok) setActualsResult(result);
      else setActualsError(result.error ?? 'Analysis failed');
    } catch { setActualsError('Network error'); }
    finally { setRunningActuals(false); }
  }

  async function handleModelScenario() {
    if (!scenarioInput.trim() || modelingScenario) return;
    setModelingScenario(true); setScenarioError(null); setScenarioResult(null);
    try {
      const res = await fetch('/api/agents/felix/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenarioInput.trim(), financialSnapshot: d.snapshot }),
      });
      const r = await res.json();
      if (res.ok && r.result) setScenarioResult(r.result);
      else setScenarioError(r.error ?? 'Modeling failed');
    } catch { setScenarioError('Network error'); }
    finally { setModelingScenario(false); }
  }

  async function handleModelFundraising() {
    const raise = parseFloat(calcRaiseAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(raise) || raise <= 0 || calculatingFundraising) return;
    setCalculatingFundraising(true); setFundraisingCalcError(null); setFundraisingCalcResult(null);
    try {
      const preMoney = parseFloat(calcPreMoney.replace(/[^0-9.]/g, ''));
      const res = await fetch('/api/agents/felix/fundraising', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raiseAmount: raise,
          preMoneyValuation: isNaN(preMoney) || preMoney <= 0 ? undefined : preMoney,
          instrument: calcInstrument,
        }),
      });
      const r = await res.json();
      if (res.ok) setFundraisingCalcResult(r);
      else setFundraisingCalcError(r.error ?? 'Modeling failed');
    } catch { setFundraisingCalcError('Network error'); }
    finally { setCalculatingFundraising(false); }
  }

  // Scenario Planning (Felix Bear/Base/Bull) state
  const [generatingScenPlan, setGeneratingScenPlan]       = useState(false);
  const [scenPlanResult, setScenPlanResult]               = useState<Record<string, unknown> | null>(null);
  const [scenPlanError, setScenPlanError]                 = useState<string | null>(null);
  const [scenPlanIdx, setScenPlanIdx]                     = useState(0);

  async function handleGenerateScenarioPlanning() {
    if (generatingScenPlan) return;
    setGeneratingScenPlan(true); setScenPlanError(null); setScenPlanResult(null);
    try {
      const res = await fetch('/api/agents/felix/scenario-planning', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.scenarios) setScenPlanResult(r.scenarios);
      else setScenPlanError(r.error ?? 'Generation failed');
    } catch { setScenPlanError('Network error'); }
    finally { setGeneratingScenPlan(false); }
  }

  // Unit Economics state
  const [generatingUnitEcon, setGeneratingUnitEcon]       = useState(false);
  const [unitEconResult, setUnitEconResult]               = useState<Record<string, unknown> | null>(null);
  const [unitEconError, setUnitEconError]                 = useState<string | null>(null);

  async function handleGenerateUnitEcon() {
    if (generatingUnitEcon) return;
    setGeneratingUnitEcon(true); setUnitEconError(null); setUnitEconResult(null);
    try {
      const res = await fetch('/api/agents/felix/unit-economics', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.analysis) setUnitEconResult(r.analysis);
      else setUnitEconError(r.error ?? 'Analysis failed');
    } catch { setUnitEconError('Network error'); }
    finally { setGeneratingUnitEcon(false); }
  }

  // Cash Flow Forecast state
  const [generatingCashFlow, setGeneratingCashFlow]       = useState(false);
  const [cashFlowResult, setCashFlowResult]               = useState<Record<string, unknown> | null>(null);
  const [cashFlowError, setCashFlowError]                 = useState<string | null>(null);
  const [cashFlowScenario, setCashFlowScenario]           = useState<'base' | 'bull' | 'bear'>('base');

  const [unitEconTab, setUnitEconTab]                     = useState<'overview' | 'cohorts' | 'levers' | 'projections'>('overview');

  async function handleGenerateUnitEconomics() {
    if (generatingUnitEcon) return;
    setGeneratingUnitEcon(true); setUnitEconError(null); setUnitEconResult(null);
    try {
      const res = await fetch('/api/agents/felix/unit-economics', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.economics) setUnitEconResult(r.economics);
      else if (res.ok && r.analysis) setUnitEconResult(r.analysis);
      else setUnitEconError(r.error ?? 'Generation failed');
    } catch { setUnitEconError('Network error'); }
    finally { setGeneratingUnitEcon(false); }
  }

  // Cost Reduction state
  const [generatingCostRed, setGeneratingCostRed]         = useState(false);
  const [costRedResult, setCostRedResult]                 = useState<Record<string, unknown> | null>(null);
  const [costRedError, setCostRedError]                   = useState<string | null>(null);
  const [costRedTab, setCostRedTab]                       = useState<'categories' | 'quickwins' | 'renegotiation' | 'plan'>('categories');

  async function handleGenerateCostReduction() {
    if (generatingCostRed) return;
    setGeneratingCostRed(true); setCostRedError(null); setCostRedResult(null);
    try {
      const res = await fetch('/api/agents/felix/cost-reduction', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.analysis) setCostRedResult(r.analysis);
      else setCostRedError(r.error ?? 'Analysis failed');
    } catch { setCostRedError('Network error'); }
    finally { setGeneratingCostRed(false); }
  }

  // Revenue Forecast state
  const [revForecastMonths, setRevForecastMonths]         = useState('18');
  const [generatingRevForecast, setGeneratingRevForecast] = useState(false);
  const [revForecastResult, setRevForecastResult]         = useState<Record<string, unknown> | null>(null);
  const [revForecastError, setRevForecastError]           = useState<string | null>(null);
  const [revForecastTab, setRevForecastTab]               = useState<'projections' | 'drivers' | 'milestones' | 'risks'>('projections');

  async function handleGenerateRevForecast() {
    if (generatingRevForecast) return;
    setGeneratingRevForecast(true); setRevForecastError(null); setRevForecastResult(null);
    try {
      const res = await fetch('/api/agents/felix/revenue-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forecastMonths: parseInt(revForecastMonths) || 18 }),
      });
      const r = await res.json();
      if (res.ok && r.forecast) setRevForecastResult(r.forecast);
      else setRevForecastError(r.error ?? 'Generation failed');
    } catch { setRevForecastError('Network error'); }
    finally { setGeneratingRevForecast(false); }
  }

  async function handleGenerateCashFlow() {
    if (generatingCashFlow) return;
    setGeneratingCashFlow(true); setCashFlowError(null); setCashFlowResult(null);
    try {
      const res = await fetch('/api/agents/felix/cash-flow', { method: 'POST' });
      const r = await res.json();
      if (res.ok && r.forecast) setCashFlowResult(r.forecast);
      else setCashFlowError(r.error ?? 'Generation failed');
    } catch { setCashFlowError('Network error'); }
    finally { setGeneratingCashFlow(false); }
  }

  // Board update state
  const [boardUpdateRecipients, setBoardUpdateRecipients] = useState('');
  const [generatingBoardUpdate, setGeneratingBoardUpdate] = useState(false);
  const [boardUpdateHtml, setBoardUpdateHtml]             = useState<string | null>(null);
  const [boardUpdateSent, setBoardUpdateSent]             = useState(false);
  const [boardUpdateError, setBoardUpdateError]           = useState<string | null>(null);

  async function handleGenerateBoardUpdate() {
    if (generatingBoardUpdate) return;
    setGeneratingBoardUpdate(true); setBoardUpdateError(null); setBoardUpdateHtml(null); setBoardUpdateSent(false);
    try {
      const recipients = boardUpdateRecipients.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch('/api/agents/felix/board-update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: recipients.length ? recipients : undefined }),
      });
      const r = await res.json();
      if (res.ok && r.html) {
        setBoardUpdateHtml(r.html);
        if (r.sent) setBoardUpdateSent(true);
      } else { setBoardUpdateError(r.error ?? 'Failed to generate board update'); }
    } catch { setBoardUpdateError('Network error'); }
    finally { setGeneratingBoardUpdate(false); }
  }

  function handleDownloadBoardUpdate() {
    if (!boardUpdateHtml) return;
    const blob = new Blob([boardUpdateHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'board-update.html'; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSendInvoice() {
    if (!invoiceAmount || !invoiceDesc || sendingInvoice) return;
    setSendingInvoice(true); setInvoiceError(null); setInvoiceResult(null);
    try {
      const res = await fetch('/api/agents/felix/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName:  invoiceName || 'Client',
          clientEmail: invoiceEmail || undefined,
          lineItems:   [{ description: invoiceDesc, quantity: 1, unitPrice: parseFloat(invoiceAmount) }],
          dueDate:     invoiceDue || undefined,
        }),
      });
      const result = await res.json();
      if (res.ok && result.html) {
        // Download directly
        const blob = new Blob([result.html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${result.invoiceNumber ?? Date.now()}.html`;
        a.click();
        URL.revokeObjectURL(url);
        setInvoiceResult({ invoiceNumber: result.invoiceNumber });
      } else {
        setInvoiceError(result.error ?? 'Failed to create invoice');
      }
    } catch { setInvoiceError('Network error'); }
    finally { setSendingInvoice(false); }
  }

  // Board Deck Financials state
  const [showBoardDeckPanel, setShowBoardDeckPanel] = useState(false);
  const [generatingBoardDeck, setGeneratingBoardDeck] = useState(false);
  const [boardDeckResult, setBoardDeckResult]         = useState<{
    slides?: { title: string; type: string; headline: string; keyNumbers: { label: string; value: string; change: string | null; trend: string | null }[]; narrative: string; footnote: string | null }[];
    cfoNotes?: string;
    redFlags?: string[];
    positives?: string[];
    guidanceStatement?: string;
  } | null>(null);
  const [boardDeckHtml, setBoardDeckHtml]           = useState<string | null>(null);
  const [boardDeckError, setBoardDeckError]         = useState<string | null>(null);
  const [boardDeckSlide, setBoardDeckSlide]         = useState(0);

  async function handleGenerateBoardDeck() {
    if (generatingBoardDeck) return;
    setGeneratingBoardDeck(true); setBoardDeckError(null); setBoardDeckResult(null); setBoardDeckHtml(null);
    try {
      const res = await fetch('/api/agents/felix/board-deck', { method: 'POST' });
      const r = await res.json();
      if (res.ok) { setBoardDeckResult(r.result ?? null); setBoardDeckHtml(r.htmlDeck ?? null); setBoardDeckSlide(0); }
      else setBoardDeckError(r.error ?? 'Generation failed');
    } catch { setBoardDeckError('Network error'); }
    finally { setGeneratingBoardDeck(false); }
  }

  // Parse runway from snapshot
  const runwayRaw = d.snapshot?.runway ?? d.snapshot?.runwayMonths ?? d.snapshot?.["Runway"] ?? d.snapshot?.["runway (months)"] ?? "";
  const runwayMonths = runwayRaw ? parseFloat(String(runwayRaw).replace(/[^0-9.]/g, "")) : NaN;
  const runwayWarning = !isNaN(runwayMonths) && runwayMonths < 6;
  const runwayUrgency = runwayMonths <= 2 ? "CRITICAL" : runwayMonths <= 4 ? "HIGH" : "MEDIUM";
  const runwayBannerColor = runwayUrgency === "CRITICAL" ? { bg: "#FEF2F2", border: "#FECACA", text: red, badge: "#DC2626" } : runwayUrgency === "HIGH" ? { bg: "#FFFBEB", border: "#FDE68A", text: amber, badge: "#D97706" } : { bg: "#F5F3FF", border: "#DDD6FE", text: "#7C3AED", badge: "#7C3AED" };

  async function handleRunwayAlert() {
    if (sendingAlert || alertSent) return;
    setSendingAlert(true); setAlertError(null);
    try {
      const snap = d.snapshot ?? {};
      const burnRaw = snap["monthlyBurn"] ?? snap["burn"] ?? snap["burnRate"] ?? "";
      const mrrRaw = snap["mrr"] ?? snap["MRR"] ?? "";
      const res = await fetch('/api/agents/felix/runway-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runwayMonths,
          burnRate: burnRaw ? parseFloat(String(burnRaw).replace(/[^0-9.]/g, "")) : undefined,
          mrr: mrrRaw ? parseFloat(String(mrrRaw).replace(/[^0-9.]/g, "")) : undefined,
          artifactId,
        }),
      });
      if (res.ok) setAlertSent(true);
      else { const r = await res.json(); setAlertError(r.error ?? 'Failed to send alert'); }
    } catch { setAlertError('Network error'); }
    finally { setSendingAlert(false); }
  }

  async function handleAnalyzeCuts() {
    if (analyzingCuts) return;
    setAnalyzingCuts(true); setCutsError(null);
    try {
      const snap = d.snapshot ?? {};
      const burnRaw = snap["monthlyBurn"] ?? snap["burn"] ?? snap["burnRate"] ?? "";
      const mrrRaw  = snap["mrr"] ?? snap["MRR"] ?? "";
      const res = await fetch('/api/agents/felix/runway-cuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runwayMonths,
          burnRate: burnRaw ? parseFloat(String(burnRaw).replace(/[^0-9.]/g, "")) : undefined,
          mrr:      mrrRaw  ? parseFloat(String(mrrRaw).replace(/[^0-9.]/g, ""))  : undefined,
          snapshot: snap,
          artifactId,
        }),
      });
      const result = await res.json();
      if (res.ok) setCutsResult(result);
      else setCutsError(result.error ?? 'Analysis failed');
    } catch { setCutsError('Network error'); }
    finally { setAnalyzingCuts(false); }
  }

  async function handleFetchStripe() {
    if (!stripeKey.trim() || fetchingStripe) return;
    setFetchingStripe(true); setStripeError(null);
    try {
      const res = await fetch('/api/agents/felix/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeKey: stripeKey.trim() }),
      });
      const result = await res.json();
      if (res.ok) { setStripeMetrics(result); setShowStripeModal(false); setStripeKey(""); }
      else setStripeError(result.error ?? 'Failed to fetch Stripe metrics');
    } catch { setStripeError('Network error'); }
    finally { setFetchingStripe(false); }
  }

  async function handleSendUpdate() {
    const recipientList = recipients.split(/[\n,]+/).map(r => r.trim()).filter(r => r.includes('@'));
    if (!recipientList.length || sendingUpdate) return;
    setSendingUpdate(true); setUpdateResult(null);
    try {
      const snap = d.snapshot ?? {};
      const res = await fetch('/api/agents/felix/investor-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipientList,
          metricsSnapshot: { mrr: snap['mrr'] ?? snap['MRR'], arr: snap['arr'] ?? snap['ARR'], growth: snap['growth'] ?? snap['growthRate'], runway: snap['runway'] ?? snap['runwayMonths'], topWin, topChallenge, ask },
        }),
      });
      const result = await res.json();
      if (res.ok) setUpdateResult({ ok: true });
      else setUpdateResult({ error: result.error ?? 'Failed to send' });
    } catch { setUpdateResult({ error: 'Network error' }); }
    finally { setSendingUpdate(false); }
  }

  const sectionHead: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, marginBottom: 10 };
  const verdictColor = d.unitEconomicsVerdict === "healthy" ? green : d.unitEconomicsVerdict === "needs-work" ? amber : red;
  const sevColor: Record<string, string> = { high: red, medium: amber, low: green };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Runway Alert Banner ── */}
      {runwayWarning && (
        <div style={{ background: runwayBannerColor.bg, border: `1.5px solid ${runwayBannerColor.border}`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 8, background: runwayBannerColor.badge, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: runwayBannerColor.badge }}>
                  {runwayUrgency} — {runwayMonths} month{runwayMonths !== 1 ? "s" : ""} of runway
                </p>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", padding: "2px 7px", borderRadius: 999, background: runwayBannerColor.badge, color: "white", letterSpacing: "0.08em" }}>
                  {runwayUrgency}
                </span>
              </div>
              <p style={{ fontSize: 12, color: runwayBannerColor.text, lineHeight: 1.5, marginBottom: 10 }}>
                {runwayMonths <= 3
                  ? "You are in the danger zone. Start fundraising conversations and cut burn immediately."
                  : "Begin investor conversations now — fundraising takes 3-6 months. Don't wait."}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {alertSent ? (
                  <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>✓ Alert email sent to your inbox</span>
                ) : (
                  <button onClick={handleRunwayAlert} disabled={sendingAlert} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: runwayBannerColor.badge, color: "white", fontSize: 12, fontWeight: 600, cursor: sendingAlert ? "not-allowed" : "pointer", opacity: sendingAlert ? 0.7 : 1 }}>
                    {sendingAlert ? "Sending…" : "Email me this alert"}
                  </button>
                )}
                <button onClick={handleAnalyzeCuts} disabled={analyzingCuts || !!cutsResult} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${runwayBannerColor.badge}`, background: "transparent", color: runwayBannerColor.badge, fontSize: 12, fontWeight: 600, cursor: analyzingCuts || cutsResult ? "default" : "pointer", opacity: analyzingCuts ? 0.7 : 1 }}>
                  {analyzingCuts ? "Analyzing…" : cutsResult ? "Analysis ready ↓" : "Analyze cuts with AI"}
                </button>
              </div>
              {alertError && <p style={{ fontSize: 11, color: red, marginTop: 6 }}>{alertError}</p>}
              {cutsError  && <p style={{ fontSize: 11, color: red, marginTop: 6 }}>{cutsError}</p>}

              {/* ── Runway Cuts Analysis Results ── */}
              {cutsResult && (
                <div style={{ marginTop: 14, borderTop: `1px dashed ${runwayBannerColor.border}`, paddingTop: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: runwayBannerColor.badge, marginBottom: 6 }}>
                    AI Cut Analysis — {cutsResult.totalPotentialSavings && `Save up to ${cutsResult.totalPotentialSavings}`}
                  </p>
                  {cutsResult.summary && (
                    <p style={{ fontSize: 12, color: runwayBannerColor.text, lineHeight: 1.6, marginBottom: 12 }}>{cutsResult.summary}</p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {cutsResult.cuts.map((cut, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "10px 12px", border: `1px solid ${runwayBannerColor.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: runwayBannerColor.badge }}>{cut.category}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: cut.difficulty === "easy" ? green : cut.difficulty === "medium" ? amber : red, background: cut.difficulty === "easy" ? "#DCFCE7" : cut.difficulty === "medium" ? "#FEF3C7" : "#FEE2E2", padding: "1px 7px", borderRadius: 999 }}>{cut.difficulty}</span>
                          <span style={{ fontSize: 11, color: muted, marginLeft: "auto" }}>{cut.timeframe}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: green }}>{cut.potentialSaving}</span>
                        </div>
                        <p style={{ fontSize: 12, color: ink, fontWeight: 500, marginBottom: 3 }}>{cut.action}</p>
                        <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{cut.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {d.snapshot && (
        <div>
          <p style={sectionHead}>Snapshot</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: bdr, borderRadius: 8, overflow: "hidden" }}>
            {Object.entries(d.snapshot).map(([k, v]) => (
              <div key={k} style={{ background: surf, padding: "10px 12px" }}>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  {k.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p style={{ fontSize: 14, fontWeight: 700, color: ink }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {d.unitEconomicsVerdict && (
        <div style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 10 }}>
          <p style={{ fontSize: 12, color: muted }}>Unit Economics:</p>
          <span style={{ fontSize: 12, fontWeight: 700, color: verdictColor, textTransform: "capitalize" }}>{d.unitEconomicsVerdict.replace(/-/g, ' ')}</span>
        </div>
      )}

      {d.keyInsights && d.keyInsights.length > 0 && (
        <div>
          <p style={sectionHead}>Key Insights</p>
          {d.keyInsights.map((insight, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <span style={{ color: blue, fontWeight: 700, flexShrink: 0, fontSize: 12 }}>{i + 1}.</span>
              <p style={{ fontSize: 13, color: ink, lineHeight: 1.5 }}>{insight}</p>
            </div>
          ))}
        </div>
      )}

      {d.fundraisingRecommendation && (
        <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "14px 16px", border: `1px solid #BFDBFE` }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: blue, marginBottom: 8 }}>Fundraising Recommendation</p>
          {d.fundraisingRecommendation.amount && <p style={{ fontSize: 20, fontWeight: 700, color: ink, marginBottom: 4 }}>{d.fundraisingRecommendation.amount}</p>}
          {d.fundraisingRecommendation.rationale && <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 4 }}>{d.fundraisingRecommendation.rationale}</p>}
          {d.fundraisingRecommendation.timeline && <p style={{ fontSize: 12, color: blue }}>{d.fundraisingRecommendation.timeline}</p>}
        </div>
      )}

      {d.useOfFunds && d.useOfFunds.length > 0 && (
        <div>
          <p style={sectionHead}>Use of Funds</p>
          {d.useOfFunds.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{item.percentage}%</p>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{item.category}</p>
                <p style={{ fontSize: 11, color: muted }}>{item.rationale}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {d.risks && d.risks.length > 0 && (
        <div>
          <p style={sectionHead}>Risks</p>
          {d.risks.map((r, i) => (
            <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{r.risk}</p>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: sevColor[r.severity] || muted }}>{r.severity}</span>
              </div>
              <p style={{ fontSize: 11, color: muted }}>Mitigation: {r.mitigation}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Fundraising Round Modeler ── */}
      {showFundraisingModal ? (
        <div style={{ background: surf, borderRadius: 12, padding: "16px 18px", border: `1px solid ${bdr}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink }}>Fundraising Round Modeler</p>
            <button onClick={() => { setShowFundraisingModal(false); setFundraisingCalcResult(null); setFundraisingCalcError(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 13, lineHeight: 1 }}>✕</button>
          </div>
          {!fundraisingCalcResult ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Raise Amount ($) *</label>
                <input value={calcRaiseAmount} onChange={e => setCalcRaiseAmount(e.target.value)} placeholder="e.g. 500000" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Pre-Money Valuation ($) — optional for SAFE</label>
                <input value={calcPreMoney} onChange={e => setCalcPreMoney(e.target.value)} placeholder="e.g. 4000000" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Instrument</label>
                <select value={calcInstrument} onChange={e => setCalcInstrument(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }}>
                  <option>SAFE</option>
                  <option>Convertible Note</option>
                  <option>Priced Round</option>
                </select>
              </div>
              {fundraisingCalcError && <p style={{ fontSize: 11, color: red }}>{fundraisingCalcError}</p>}
              <button onClick={handleModelFundraising} disabled={!calcRaiseAmount || calculatingFundraising} style={{ padding: "9px", borderRadius: 8, border: "none", background: !calcRaiseAmount ? bdr : blue, color: !calcRaiseAmount ? muted : "#fff", fontSize: 13, fontWeight: 700, cursor: !calcRaiseAmount ? "not-allowed" : "pointer" }}>
                {calculatingFundraising ? "Modeling…" : "Model Round"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(fundraisingCalcResult.postMoneyValuation || fundraisingCalcResult.investorPercent != null) && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
                  {fundraisingCalcResult.postMoneyValuation && (
                    <div style={{ background: bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                      <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Post-Money</p>
                      <p style={{ fontSize: 16, fontWeight: 800, color: blue }}>${(fundraisingCalcResult.postMoneyValuation / 1e6).toFixed(1)}M</p>
                    </div>
                  )}
                  {fundraisingCalcResult.investorPercent != null && (
                    <div style={{ background: bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                      <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Investor Gets</p>
                      <p style={{ fontSize: 16, fontWeight: 800, color: ink }}>{fundraisingCalcResult.investorPercent}%</p>
                    </div>
                  )}
                  {fundraisingCalcResult.yourRemaining != null && (
                    <div style={{ background: bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                      <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", marginBottom: 4 }}>You Retain</p>
                      <p style={{ fontSize: 16, fontWeight: 800, color: green }}>{fundraisingCalcResult.yourRemaining}%</p>
                    </div>
                  )}
                  {fundraisingCalcResult.runwayExtensionMonths && (
                    <div style={{ background: bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                      <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Runway Added</p>
                      <p style={{ fontSize: 16, fontWeight: 800, color: amber }}>{fundraisingCalcResult.runwayExtensionMonths}mo</p>
                    </div>
                  )}
                </div>
              )}
              {fundraisingCalcResult.recommendation && (
                <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 4 }}>RECOMMENDATION</p>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{fundraisingCalcResult.recommendation}</p>
                </div>
              )}
              {fundraisingCalcResult.dilutionComment && (
                <div style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: muted, marginBottom: 4 }}>DILUTION NOTE</p>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{fundraisingCalcResult.dilutionComment}</p>
                </div>
              )}
              {fundraisingCalcResult.useOfFunds && fundraisingCalcResult.useOfFunds.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: muted, marginBottom: 8 }}>USE OF FUNDS</p>
                  {fundraisingCalcResult.useOfFunds.map((u, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${bdr}` }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{u.category}</p>
                        <p style={{ fontSize: 11, color: muted }}>{u.rationale}</p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: blue, whiteSpace: "nowrap", marginLeft: 12 }}>{u.amount ?? `${u.percentage}%`}</span>
                    </div>
                  ))}
                </div>
              )}
              {fundraisingCalcResult.milestoneToHit && (
                <div style={{ background: "#FFFBEB", borderRadius: 8, padding: "10px 14px", border: "1px solid #FDE68A" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: amber, marginBottom: 4 }}>KEY MILESTONE FOR NEXT ROUND</p>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{fundraisingCalcResult.milestoneToHit}</p>
                </div>
              )}
              <button onClick={() => { setFundraisingCalcResult(null); setCalcRaiseAmount(""); setCalcPreMoney(""); }} style={{ padding: "7px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer" }}>New Scenario</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Model a Fundraising Round</p>
            <p style={{ fontSize: 11, color: muted }}>Calculate dilution, post-money valuation, and get AI-powered use-of-funds recommendations.</p>
          </div>
          <button onClick={() => setShowFundraisingModal(true)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            Model Round
          </button>
        </div>
      )}

      {/* ── Investor Update CTA ── */}
      <div style={{ background: surf, borderRadius: 12, padding: "16px 18px", border: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Send Investor Update</p>
          <p style={{ fontSize: 11, color: muted }}>Send a YC-style monthly update with your real metrics to investors.</p>
        </div>
        <button onClick={() => { setShowUpdateModal(true); setUpdateResult(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          Send Update
        </button>
      </div>

      {/* ── Stripe Live Metrics ──────────────────────────────────────────────── */}
      {stripeMetrics ? (
        <div style={{ background: surf, borderRadius: 12, padding: "16px 18px", border: `1px solid ${bdr}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, textTransform: "uppercase", letterSpacing: "0.1em" }}>Live Stripe Metrics</p>
            <button onClick={() => setStripeMetrics(null)} style={{ fontSize: 10, color: muted, background: "none", border: "none", cursor: "pointer" }}>Disconnect</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: bdr, borderRadius: 8, overflow: "hidden" }}>
            {[
              ["MRR", `$${stripeMetrics.mrr.toLocaleString()}`],
              ["ARR", `$${stripeMetrics.arr.toLocaleString()}`],
              ["Active Subs", stripeMetrics.activeSubscriptions.toString()],
              ["Last 30d Revenue", `$${stripeMetrics.last30DayRevenue.toLocaleString()}`],
            ].map(([label, value]) => (
              <div key={label} style={{ background: bg, padding: "10px 12px" }}>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: ink }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: surf, borderRadius: 12, padding: "16px 18px", border: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Connect Stripe</p>
            <p style={{ fontSize: 11, color: muted }}>Pull your real MRR, ARR, and revenue into this model. Enter a read-only restricted key — never stored.</p>
          </div>
          <button onClick={() => setShowStripeModal(true)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            Connect
          </button>
        </div>
      )}

      {/* Stripe key modal */}
      {showStripeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={e => { if (e.target === e.currentTarget) setShowStripeModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Connect Stripe</p>
              <button onClick={() => setShowStripeModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            <p style={{ fontSize: 12, color: muted, marginBottom: 16, lineHeight: 1.6 }}>
              Create a <strong>Restricted Key</strong> in your Stripe Dashboard with <em>read-only</em> access to Customers, Subscriptions, and Charges. The key is used once to fetch metrics and is never stored.
            </p>
            <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 6 }}>Stripe Restricted Key (rk_...)</label>
            <input
              type="password"
              value={stripeKey}
              onChange={e => setStripeKey(e.target.value)}
              placeholder="rk_live_..."
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, boxSizing: "border-box", marginBottom: 14 }}
              onKeyDown={e => { if (e.key === "Enter") handleFetchStripe(); }}
            />
            {stripeError && <p style={{ fontSize: 12, color: red, marginBottom: 12 }}>{stripeError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowStripeModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleFetchStripe} disabled={fetchingStripe || !stripeKey.trim()} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: fetchingStripe ? bdr : "#7C3AED", color: fetchingStripe ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: fetchingStripe ? "not-allowed" : "pointer" }}>
                {fetchingStripe ? "Fetching…" : "Fetch Metrics"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Invoice ───────────────────────────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 2 }}>Create & Send Invoice</p>
          <p style={{ fontSize: 11, color: muted }}>Felix generates and emails a professional invoice to your customer — via Stripe if connected, otherwise Resend.</p>
        </div>
        <button onClick={() => { setShowInvoiceModal(true); setInvoiceResult(null); setInvoiceError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          New Invoice
        </button>
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget && !sendingInvoice) setShowInvoiceModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Create Invoice</p>
              <button onClick={() => setShowInvoiceModal(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: muted }}>✕</button>
            </div>
            {invoiceResult ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 32, marginBottom: 10 }}>🧾</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: green, marginBottom: 6 }}>Invoice downloaded!</p>
                {invoiceResult.invoiceNumber && <p style={{ fontSize: 12, color: muted, marginBottom: 4 }}>Invoice #{invoiceResult.invoiceNumber}</p>}
                <p style={{ fontSize: 11, color: muted, marginTop: 4 }}>Open the HTML file in any browser and print to PDF to send.</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
                  <button onClick={() => { setInvoiceResult(null); setInvoiceName(""); setInvoiceEmail(""); setInvoiceAmount(""); setInvoiceDesc(""); setInvoiceDue(""); }} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>New Invoice</button>
                  <button onClick={() => setShowInvoiceModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: ink, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Customer Name</label>
                    <input value={invoiceName} onChange={e => setInvoiceName(e.target.value)} placeholder="Acme Corp" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Customer Email *</label>
                    <input value={invoiceEmail} onChange={e => setInvoiceEmail(e.target.value)} placeholder="billing@acme.com" type="email" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Amount (USD) *</label>
                    <input value={invoiceAmount} onChange={e => setInvoiceAmount(e.target.value)} placeholder="1500" type="number" min="1" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Due Date</label>
                    <input value={invoiceDue} onChange={e => setInvoiceDue(e.target.value)} type="date" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Description *</label>
                  <input value={invoiceDesc} onChange={e => setInvoiceDesc(e.target.value)} placeholder="Monthly SaaS subscription — Professional Plan" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                </div>
                {invoiceError && <p style={{ fontSize: 12, color: red }}>{invoiceError}</p>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                  <button onClick={() => setShowInvoiceModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button
                    onClick={handleSendInvoice}
                    disabled={sendingInvoice || !invoiceEmail || !invoiceAmount || !invoiceDesc}
                    style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: sendingInvoice ? bdr : blue, color: sendingInvoice ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: sendingInvoice ? "not-allowed" : "pointer" }}
                  >
                    {sendingInvoice ? "Generating…" : "Download Invoice"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Google Sheets export ─────────────────────────────────────────────── */}
      <div style={{ background: surf, borderRadius: 12, padding: "16px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: ink, textTransform: "uppercase", letterSpacing: "0.1em" }}>Export to Google Sheets</p>
          <button
            onClick={() => {
              // Build a CSV that Google Sheets reads as a financial model with formula rows
              const snap = d.snapshot || {};
              const funds = d.useOfFunds || [];
              const now = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });

              const rows: string[][] = [
                ["Felix Financial Model", "", "", "", "", ""],
                ["Generated", now, "", "", "", ""],
                ["", "", "", "", "", ""],
                ["── SNAPSHOT ──", "", "", "", "", ""],
                ...Object.entries(snap).map(([k, v]) => [k.replace(/([A-Z])/g, " $1").trim(), v, "", "", "", ""]),
                ["", "", "", "", "", ""],
                ["── PROJECTIONS (edit yellow cells) ──", "", "", "", "", ""],
                ["Month", "MRR ($)", "New Customers", "Churn (%)", "Burn ($)", "Net Cash"],
                ...Array.from({ length: 12 }, (_, i) => {
                  const row = i + 3; // rows start at row 9 (header = row 8)
                  const mrrRef = i === 0 ? (snap["mrr"] || "0").replace(/[^0-9.]/g, "") : `=B${row-1}*(1+C${row}/100-D${row}/100)`;
                  return [
                    `Month ${i + 1}`,
                    i === 0 ? mrrRef : mrrRef,
                    "10",
                    "2",
                    snap["monthlyBurn"] ? (snap["monthlyBurn"] || "0").replace(/[^0-9.]/g, "") : "20000",
                    i === 0 ? `=B${row+1}-E${row+1}` : `=F${row-1}+B${row+1}-E${row+1}`,
                  ];
                }),
                ["", "", "", "", "", ""],
                ["── USE OF FUNDS ──", "", "", "", "", ""],
                ["Category", "% Allocation", "Rationale", "", "", ""],
                ...funds.map(f => [f.category, `${f.percentage}%`, f.rationale, "", "", ""]),
              ];

              const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "felix_financial_model.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{ padding: "7px 14px", borderRadius: 8, background: ink, border: "none", fontSize: 12, fontWeight: 600, color: bg, cursor: "pointer" }}
          >
            Download CSV
          </button>
        </div>
        <p style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>
          Exports your financial snapshot + a 12-month projection table with live formulas (MRR growth, churn, net cash). Import into Google Sheets: <strong>File → Import → Upload</strong>.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {["Snapshot", "12-month MRR model", "Use of funds"].map((label, i) => (
            <span key={i} style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, background: bg, color: muted, border: `1px solid ${bdr}`, fontWeight: 600 }}>{label}</span>
          ))}
        </div>
      </div>

      {/* ── Actuals vs Projections ── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Actuals vs Projections</p>
            <p style={{ fontSize: 11, color: muted }}>Compare your real MRR against your financial model — get a variance analysis and action plan.</p>
          </div>
          <button onClick={() => { setShowActualsPanel(v => !v); setActualsResult(null); setActualsError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            {showActualsPanel ? "Close" : "Compare"}
          </button>
        </div>
        {showActualsPanel && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Current Actual MRR ($)</label>
                <input
                  value={actualMRRInput}
                  onChange={e => setActualMRRInput(e.target.value)}
                  placeholder={stripeMetrics ? String(stripeMetrics.mrr) : "e.g. 28500"}
                  type="number"
                  min="0"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }}
                  onKeyDown={e => { if (e.key === "Enter") handleRunActuals(); }}
                />
              </div>
              {stripeMetrics && (
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <button onClick={() => setActualMRRInput(String(stripeMetrics.mrr))} style={{ padding: "8px 12px", borderRadius: 7, border: `1px solid ${bdr}`, background: surf, color: muted, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
                    Use Stripe MRR
                  </button>
                </div>
              )}
            </div>
            {actualsError && <p style={{ fontSize: 12, color: red, marginBottom: 8 }}>{actualsError}</p>}
            <button onClick={handleRunActuals} disabled={runningActuals || !actualMRRInput} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: runningActuals ? bdr : ink, color: runningActuals ? muted : bg, fontSize: 12, fontWeight: 600, cursor: runningActuals ? "not-allowed" : "pointer" }}>
              {runningActuals ? "Analyzing…" : "Run Analysis"}
            </button>
            {actualsResult && actualsResult.analysis && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Summary cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {[
                    { label: "Actual MRR", value: `$${(actualsResult.actualMRR ?? 0).toLocaleString()}`, color: ink },
                    { label: "Projected MRR", value: actualsResult.projectedMRR ? `$${actualsResult.projectedMRR.toLocaleString()}` : "N/A", color: muted },
                    { label: "Variance", value: actualsResult.variancePct !== null && actualsResult.variancePct !== undefined ? `${actualsResult.variancePct > 0 ? "+" : ""}${actualsResult.variancePct}%` : "N/A", color: actualsResult.variancePct !== null && actualsResult.variancePct !== undefined ? (actualsResult.variancePct >= 0 ? green : red) : muted },
                  ].map(c => (
                    <div key={c.label} style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 10, color: muted, marginBottom: 2 }}>{c.label}</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: c.color }}>{c.value}</p>
                    </div>
                  ))}
                </div>
                {/* Headline + status */}
                {actualsResult.analysis.headline && (
                  <div style={{ background: actualsResult.onTrack ? "#F0FDF4" : "#FEF2F2", borderRadius: 8, padding: "10px 14px", border: `1px solid ${actualsResult.onTrack ? "#BBF7D0" : "#FECACA"}` }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: actualsResult.onTrack ? green : red }}>{actualsResult.onTrack ? "✓" : "⚠"} {actualsResult.analysis.headline}</p>
                  </div>
                )}
                {/* Drivers */}
                {actualsResult.analysis.drivers && actualsResult.analysis.drivers.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>LIKELY DRIVERS</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {actualsResult.analysis.drivers.map((d, i) => <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>• {d}</p>)}
                    </div>
                  </div>
                )}
                {/* Actions */}
                {actualsResult.analysis.actions && actualsResult.analysis.actions.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>RECOMMENDED ACTIONS</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {actualsResult.analysis.actions.map((a, i) => (
                        <div key={i} style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}`, display: "flex", gap: 10 }}>
                          <span style={{ padding: "2px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: a.priority === "high" ? "#FEF2F2" : "#FFFBEB", color: a.priority === "high" ? red : amber, flexShrink: 0 }}>{a.priority}</span>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 2 }}>{a.action}</p>
                            <p style={{ fontSize: 11, color: muted }}>{a.impact}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {actualsResult.analysis.forecastNote && (
                  <p style={{ fontSize: 12, color: muted, fontStyle: "italic", lineHeight: 1.5 }}>📈 {actualsResult.analysis.forecastNote}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Expense Categorization ── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showExpensesPanel ? 12 : 0 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Expense Categorization</p>
            <p style={{ fontSize: 11, color: muted }}>Paste your expense list — Felix categorizes into buckets, calculates burn, and finds savings opportunities.</p>
          </div>
          <button onClick={() => { setShowExpensesPanel(v => !v); setExpensesResult(null); setExpensesError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            {showExpensesPanel ? "Close" : "Categorize"}
          </button>
        </div>
        {showExpensesPanel && !expensesResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 11, color: muted, lineHeight: 1.6 }}>Paste any format — one per line, CSV, or free text. Include amounts if known.</p>
            <textarea
              value={expensesInput}
              onChange={e => setExpensesInput(e.target.value)}
              placeholder={`AWS - $2,400/mo\nPayroll: 2 engineers @ $150k = $25,000/mo\nGitHub $84\nLinearB $200\nOffice rent $1,800\nTailwind UI $299/yr\nContractor (design) $3,000/mo`}
              rows={6}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
            />
            {expensesError && <p style={{ fontSize: 12, color: red }}>{expensesError}</p>}
            <button onClick={handleCategorizeExpenses} disabled={categorizingExpenses || !expensesInput.trim()} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: categorizingExpenses ? bdr : blue, color: categorizingExpenses ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: categorizingExpenses ? "not-allowed" : "pointer", alignSelf: "flex-start" }}>
              {categorizingExpenses ? "Categorizing…" : "Analyze Expenses"}
            </button>
          </div>
        )}
        {expensesResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Total burn + categories */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", border: `1px solid ${bdr}`, gridColumn: "1 / -1" }}>
                <p style={{ fontSize: 10, color: muted, marginBottom: 2 }}>Total Monthly Burn</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: red }}>${(expensesResult.totalMonthlyBurn ?? 0).toLocaleString()}</p>
                {expensesResult.burnHealthNote && <p style={{ fontSize: 11, color: muted, marginTop: 4, fontStyle: "italic" }}>{expensesResult.burnHealthNote}</p>}
              </div>
              {expensesResult.totals && Object.entries(expensesResult.totals)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, val]) => {
                  const pct = expensesResult.totalMonthlyBurn ? Math.round((val / expensesResult.totalMonthlyBurn!) * 100) : 0;
                  const catColors: Record<string, string> = { payroll: blue, infra: "#7C3AED", marketing: amber, legal: "#DC2626", software: "#0891B2", contractors: green, office: muted, other: muted };
                  const c = catColors[cat] ?? muted;
                  return (
                    <div key={cat} style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: ink, textTransform: "capitalize" }}>{cat}</p>
                        <p style={{ fontSize: 11, fontWeight: 700, color: c }}>${val.toLocaleString()}</p>
                      </div>
                      <div style={{ height: 3, background: bdr, borderRadius: 2 }}>
                        <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: c }} />
                      </div>
                      <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>{pct}% of burn</p>
                    </div>
                  );
                })
              }
            </div>
            {/* Savings opportunities */}
            {expensesResult.savingsOpportunities && expensesResult.savingsOpportunities.length > 0 && (
              <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "12px 14px", border: "1px solid #BBF7D0" }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: green, marginBottom: 8 }}>Savings Opportunities</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {expensesResult.savingsOpportunities.map((opp, oi) => (
                    <div key={oi} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 2 }}>{opp.item}</p>
                        <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{opp.suggestion}</p>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: green, flexShrink: 0 }}>-${opp.estimatedSaving.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Line items table */}
            {expensesResult.lineItems && expensesResult.lineItems.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${bdr}`, overflow: "hidden" }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: muted, padding: "10px 14px", borderBottom: `1px solid ${bdr}` }}>Line Items</p>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {expensesResult.lineItems.map((item, ii) => (
                    <div key={ii} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderBottom: ii < expensesResult.lineItems!.length - 1 ? `1px solid ${bdr}` : "none" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, color: ink }}>{item.description}</p>
                        <p style={{ fontSize: 10, color: muted, textTransform: "capitalize" }}>{item.subcategory}{item.isRecurring ? " · recurring" : ""}</p>
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: red }}>${item.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => { setExpensesResult(null); setExpensesInput(""); }} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>
              ← Analyze Different Expenses
            </button>
          </div>
        )}
      </div>

      {/* ── Scenario Modeling CTA ── */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Model a Financial Scenario</p>
          <p style={{ fontSize: 11, color: muted }}>Ask &ldquo;What if I hire 2 engineers?&rdquo; or &ldquo;What if churn doubles?&rdquo; — Felix models the impact on your runway and burn.</p>
        </div>
        <button onClick={() => { setShowScenarioModal(true); setScenarioResult(null); setScenarioError(null); setScenarioInput(""); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
          Run Scenario
        </button>
      </div>

      {/* ── Scenario Modal ── */}
      {showScenarioModal && (
        <div onClick={() => { if (!modelingScenario) setShowScenarioModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Financial Scenario Modeler</p>
              <button onClick={() => setShowScenarioModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            {!scenarioResult ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ fontSize: 12, color: muted, lineHeight: 1.6 }}>Describe any change to your business and Felix will model the financial impact against your current numbers.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {["What if I hire 2 engineers at $150K each?", "What if churn doubles to 10%?", "What if I raise prices by 30%?", "What if I cut marketing spend in half?"].map(example => (
                    <button key={example} onClick={() => setScenarioInput(example)} style={{ textAlign: "left", padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: scenarioInput === example ? "#F5F3FF" : surf, color: scenarioInput === example ? "#7C3AED" : muted, fontSize: 12, cursor: "pointer" }}>
                      {example}
                    </button>
                  ))}
                </div>
                <textarea
                  value={scenarioInput}
                  onChange={e => setScenarioInput(e.target.value)}
                  placeholder="Or describe your own scenario…"
                  rows={3}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                />
                {scenarioError && <p style={{ fontSize: 12, color: red }}>{scenarioError}</p>}
                <button onClick={handleModelScenario} disabled={modelingScenario || !scenarioInput.trim()} style={{ padding: "10px", borderRadius: 8, border: "none", background: modelingScenario || !scenarioInput.trim() ? bdr : "#7C3AED", color: modelingScenario || !scenarioInput.trim() ? muted : "#fff", fontSize: 13, fontWeight: 700, cursor: modelingScenario || !scenarioInput.trim() ? "not-allowed" : "pointer" }}>
                  {modelingScenario ? "Modeling…" : "Run Scenario"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {scenarioResult.scenarioSummary && (
                  <div style={{ background: "#F5F3FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #DDD6FE" }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#7C3AED" }}>{scenarioResult.scenarioSummary}</p>
                  </div>
                )}
                {scenarioResult.impacts && scenarioResult.impacts.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Impact on Key Metrics</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {scenarioResult.impacts.map((impact, i) => {
                        const dirColor = impact.direction === "positive" ? green : impact.direction === "negative" ? red : muted;
                        return (
                          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "center", padding: "8px 12px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{impact.metric}</p>
                            <p style={{ fontSize: 11, color: muted }}>{impact.current}</p>
                            <p style={{ fontSize: 11, color: ink }}>{impact.projected}</p>
                            <span style={{ fontSize: 11, fontWeight: 700, color: dirColor, whiteSpace: "nowrap" }}>{impact.change}</span>
                          </div>
                        );
                      })}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, padding: "0 12px" }}>
                        {["Metric", "Current", "Projected", "Change"].map(h => (
                          <p key={h} style={{ fontSize: 9, color: muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {scenarioResult.runwayImpact && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Runway Impact</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{scenarioResult.runwayImpact}</p>
                  </div>
                )}
                {scenarioResult.recommendation && (
                  <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 4 }}>Felix&apos;s Recommendation</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{scenarioResult.recommendation}</p>
                  </div>
                )}
                {scenarioResult.alternativeScenario && (
                  <p style={{ fontSize: 11, color: muted, fontStyle: "italic" }}>Alternative: {scenarioResult.alternativeScenario}</p>
                )}
                {scenarioResult.assumptions && scenarioResult.assumptions.length > 0 && (
                  <details style={{ cursor: "pointer" }}>
                    <summary style={{ fontSize: 11, color: muted, fontWeight: 600 }}>Assumptions used</summary>
                    <div style={{ paddingTop: 8 }}>
                      {scenarioResult.assumptions.map((a, i) => <p key={i} style={{ fontSize: 11, color: muted, lineHeight: 1.5, marginBottom: 3 }}>• {a}</p>)}
                    </div>
                  </details>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button onClick={() => { setScenarioResult(null); setScenarioInput(""); }} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 12, cursor: "pointer" }}>Model Another</button>
                  <button onClick={() => setShowScenarioModal(false)} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#7C3AED", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Board Deck Financials ─────────────────────────────────────────────── */}
      <div style={{ background: showBoardDeckPanel && boardDeckResult ? "#0F172A" : surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${showBoardDeckPanel && boardDeckResult ? "#334155" : bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: showBoardDeckPanel && boardDeckResult ? "#94A3B8" : ink, marginBottom: 2 }}>Board Deck Financials</p>
            <p style={{ fontSize: 11, color: muted }}>Generate investor-grade financial slides for your next board meeting — metrics dashboard, revenue trend, unit economics, cash position, forecast.</p>
          </div>
          <button onClick={() => { if (showBoardDeckPanel && !generatingBoardDeck) setShowBoardDeckPanel(false); else { setShowBoardDeckPanel(true); if (!boardDeckResult) handleGenerateBoardDeck(); } }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: generatingBoardDeck ? bdr : "#1E293B", color: generatingBoardDeck ? muted : "#94A3B8", fontSize: 11, fontWeight: 600, cursor: generatingBoardDeck ? "not-allowed" : "pointer", flexShrink: 0 }}>
            {generatingBoardDeck ? "Generating…" : showBoardDeckPanel ? "Close" : boardDeckResult ? "View Slides" : "Generate Slides"}
          </button>
        </div>
        {showBoardDeckPanel && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {generatingBoardDeck && (
              <p style={{ fontSize: 12, color: muted, textAlign: "center", padding: "16px 0" }}>Building financial slides from your Stripe and expense data…</p>
            )}
            {boardDeckError && <p style={{ fontSize: 12, color: red }}>{boardDeckError}</p>}
            {boardDeckResult && !generatingBoardDeck && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Slide navigator */}
                {boardDeckResult.slides && boardDeckResult.slides.length > 0 && (
                  <div style={{ background: "#0F172A", borderRadius: 12, padding: 24, border: "1px solid #334155" }}>
                    {/* Slide tabs */}
                    <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
                      {boardDeckResult.slides.map((s, i) => (
                        <button key={i} onClick={() => setBoardDeckSlide(i)} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: boardDeckSlide === i ? "#3B82F6" : "#1E293B", color: boardDeckSlide === i ? "#fff" : "#94A3B8", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                          {String(s.type ?? '').replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                    {/* Active slide */}
                    {(() => {
                      const slide = boardDeckResult.slides![boardDeckSlide];
                      if (!slide) return null;
                      return (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: "#3B82F6", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>{String(slide.type ?? '').replace(/_/g, ' ')}</p>
                          <p style={{ fontSize: 22, fontWeight: 800, color: "#F8FAFC", marginBottom: 6, lineHeight: 1.2 }}>{slide.title}</p>
                          <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 20, lineHeight: 1.5 }}>{slide.headline}</p>
                          {slide.keyNumbers && slide.keyNumbers.length > 0 && (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 20 }}>
                              {slide.keyNumbers.map((n, i) => (
                                <div key={i} style={{ background: "#1E293B", borderRadius: 10, padding: "14px 16px", border: "1px solid #334155" }}>
                                  <p style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{n.label}</p>
                                  <p style={{ fontSize: 22, fontWeight: 800, color: "#F8FAFC" }}>{n.value}</p>
                                  {n.change && <p style={{ fontSize: 11, fontWeight: 600, marginTop: 2, color: n.trend === "up" ? "#22C55E" : n.trend === "down" ? "#EF4444" : "#94A3B8" }}>{n.change}</p>}
                                </div>
                              ))}
                            </div>
                          )}
                          {slide.narrative && (
                            <p style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.7, borderTop: "1px solid #334155", paddingTop: 14 }}>{slide.narrative}</p>
                          )}
                          {slide.footnote && (
                            <p style={{ fontSize: 11, color: "#475569", fontStyle: "italic", marginTop: 8 }}>* {slide.footnote}</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* CFO notes + guidance */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {boardDeckResult.positives && boardDeckResult.positives.length > 0 && (
                    <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 6 }}>EMPHASIZE</p>
                      {boardDeckResult.positives.map((p, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>✓ {p}</p>)}
                    </div>
                  )}
                  {boardDeckResult.redFlags && boardDeckResult.redFlags.length > 0 && (
                    <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 14px", border: "1px solid #FECACA" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: red, marginBottom: 6 }}>BOARD WILL FLAG</p>
                      {boardDeckResult.redFlags.map((f, i) => <p key={i} style={{ fontSize: 11, color: ink, marginBottom: 3 }}>⚠ {f}</p>)}
                    </div>
                  )}
                </div>

                {boardDeckResult.cfoNotes && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: blue, marginBottom: 4 }}>CFO NOTES — ANTICIPATED Q&A</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{boardDeckResult.cfoNotes}</p>
                  </div>
                )}

                {boardDeckResult.guidanceStatement && (
                  <div style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, marginBottom: 4 }}>QUARTERLY GUIDANCE</p>
                    <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, fontStyle: "italic" }}>{boardDeckResult.guidanceStatement}</p>
                  </div>
                )}

                {/* Download button */}
                {boardDeckHtml && (
                  <button onClick={() => {
                    const blob = new Blob([boardDeckHtml], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'board-financials.html'; a.click();
                    URL.revokeObjectURL(url);
                  }} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#1E293B", color: "#94A3B8", fontSize: 12, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6 }}>
                    ⬇ Download Board Deck HTML
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Investor Update Modal ── */}
      {showUpdateModal && (
        <div onClick={() => { if (!sendingUpdate) setShowUpdateModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Monthly Investor Update</p>
              <button onClick={() => setShowUpdateModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            {updateResult?.ok ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 22, marginBottom: 10 }}>📨</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: green, marginBottom: 6 }}>Update sent!</p>
                <button onClick={() => { setShowUpdateModal(false); setUpdateResult(null); }} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Done</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Recipients (emails, one per line or comma-separated) *</label>
                  <textarea value={recipients} onChange={e => setRecipients(e.target.value)} placeholder="investor@a16z.com&#10;partner@sequoia.com" rows={3} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, resize: "vertical", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Top Win this month</label>
                  <input value={topWin} onChange={e => setTopWin(e.target.value)} placeholder="Closed 3 enterprise deals" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Top Challenge</label>
                  <input value={topChallenge} onChange={e => setTopChallenge(e.target.value)} placeholder="Slow sales cycle at enterprise" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>The Ask (introductions, advice, etc.)</label>
                  <input value={ask} onChange={e => setAsk(e.target.value)} placeholder="Intros to VP Sales at Series B companies" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
                {updateResult?.error && <p style={{ fontSize: 12, color: red }}>{updateResult.error}</p>}
                <button onClick={handleSendUpdate} disabled={!recipients || sendingUpdate} style={{ padding: "10px", borderRadius: 8, border: "none", background: !recipients ? bdr : blue, color: !recipients ? muted : "#fff", fontSize: 13, fontWeight: 700, cursor: !recipients ? "not-allowed" : "pointer" }}>
                  {sendingUpdate ? "Sending…" : "Send via Email"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 24-Month Financial Model ── */}
      <div style={{ background: surf, borderRadius: 12, padding: "16px 20px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: modelResult ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>24-Month Financial Model</p>
            <p style={{ fontSize: 11, color: muted }}>Felix builds a 3-scenario revenue model (Conservative / Base / Optimistic) from your current MRR and burn rate. Exports as CSV.</p>
            {modelError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{modelError}</p>}
          </div>
          <button onClick={handleRunModel} disabled={runningModel} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: runningModel ? bdr : blue, color: runningModel ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: runningModel ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {runningModel ? "Modeling…" : "Build Model"}
          </button>
        </div>
        {modelResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {modelResult.startingMetrics && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {[
                  { label: "MRR", value: `$${(modelResult.startingMetrics.mrr / 1000).toFixed(1)}k` },
                  { label: "Burn", value: `$${(modelResult.startingMetrics.burn / 1000).toFixed(1)}k/mo` },
                  { label: "Runway", value: `${modelResult.startingMetrics.runway}mo` },
                  { label: "Cash", value: `$${(modelResult.startingMetrics.cashOnHand / 1000).toFixed(0)}k` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: ink }}>{value}</p>
                    <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>{label}</p>
                  </div>
                ))}
              </div>
            )}
            {/* Scenario selector */}
            <div style={{ display: "flex", gap: 6 }}>
              {(modelResult.scenarios ?? []).map(s => (
                <button key={s.name} onClick={() => setModelScenario(s.name)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${modelScenario === s.name ? blue : bdr}`, background: modelScenario === s.name ? "#EFF6FF" : bg, color: modelScenario === s.name ? blue : muted, fontSize: 12, fontWeight: modelScenario === s.name ? 700 : 400, cursor: "pointer" }}>
                  {s.name}
                </button>
              ))}
            </div>
            {/* Chart for selected scenario */}
            {(() => {
              const sel = (modelResult.scenarios ?? []).find(s => s.name === modelScenario) ?? modelResult.scenarios?.[0];
              if (!sel) return null;
              const maxRev = Math.max(...sel.months.map(m => m.revenue), 1);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 4 }}>{sel.name} — {sel.monthlyGrowthRate}% monthly growth</p>
                  <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 60 }}>
                    {sel.months.filter((_, i) => i % 3 === 0).map((m, i) => (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <div style={{ width: "100%", height: `${Math.round((m.revenue / maxRev) * 50) + 2}px`, background: blue, borderRadius: 3, minHeight: 2 }} />
                        <p style={{ fontSize: 9, color: muted }}>M{m.month}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <p style={{ fontSize: 11, color: muted }}>Month 1: ${sel.months[0]?.revenue.toLocaleString() ?? 0}</p>
                    <p style={{ fontSize: 11, color: green, fontWeight: 600 }}>Month 24: ${sel.months[23]?.revenue.toLocaleString() ?? 0}</p>
                  </div>
                </div>
              );
            })()}
            {modelResult.keyMilestones && modelResult.keyMilestones.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 6 }}>Key Milestones</p>
                {modelResult.keyMilestones.map((m, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#EFF6FF", border: "1px solid #BFDBFE", color: blue, fontWeight: 600, flexShrink: 0 }}>Mo {m.month}</span>
                    <p style={{ fontSize: 12, color: ink }}>{m.milestone}</p>
                  </div>
                ))}
              </div>
            )}
            {modelResult.recommendation && (
              <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 4 }}>Felix Recommends</p>
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{modelResult.recommendation}</p>
              </div>
            )}
            {modelResult.assumptions && modelResult.assumptions.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Assumptions</p>
                {modelResult.assumptions.map((a, i) => <p key={i} style={{ fontSize: 11, color: muted, marginBottom: 2 }}>• {a}</p>)}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleDownloadModelCSV} disabled={!modelResult.csvData} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: green, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Export CSV</button>
              <button onClick={() => setModelResult(null)} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 12, cursor: "pointer" }}>Rebuild</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Board Update ── */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: boardUpdateHtml ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", marginBottom: 2 }}>Monthly Board Update</p>
            <p style={{ fontSize: 11, color: muted }}>Felix auto-compiles your metrics + team activity into a board-ready update — optionally send via email.</p>
            {boardUpdateError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{boardUpdateError}</p>}
          </div>
          <button onClick={handleGenerateBoardUpdate} disabled={generatingBoardUpdate}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingBoardUpdate ? bdr : "#7C3AED", color: generatingBoardUpdate ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingBoardUpdate ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {generatingBoardUpdate ? "Generating…" : "Generate Update"}
          </button>
        </div>
        {boardUpdateHtml && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input value={boardUpdateRecipients} onChange={e => setBoardUpdateRecipients(e.target.value)}
              placeholder="Board emails to send (comma-separated, optional)"
              style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: "#fff", outline: "none" }} />
            {boardUpdateSent && <p style={{ fontSize: 11, color: "#16A34A", fontWeight: 600 }}>✓ Sent to board members</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleDownloadBoardUpdate}
                style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#7C3AED", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Download HTML
              </button>
              {boardUpdateRecipients.trim() && (
                <button onClick={handleGenerateBoardUpdate} disabled={generatingBoardUpdate}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Send to Board
                </button>
              )}
              <button onClick={() => { setBoardUpdateHtml(null); setBoardUpdateSent(false); }}
                style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 12, cursor: "pointer" }}>
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Cash Flow Forecast ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 20, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Cash Flow Forecast</p>
            <p style={{ fontSize: 11, color: muted }}>12-month forecast with base, bull, and bear scenarios based on your current metrics.</p>
          </div>
          <button onClick={handleGenerateCashFlow} disabled={generatingCashFlow}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingCashFlow ? bdr : green, color: generatingCashFlow ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingCashFlow ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {generatingCashFlow ? "Forecasting…" : "Generate Forecast"}
          </button>
        </div>
        {cashFlowError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{cashFlowError}</p>}
        {cashFlowResult && (() => {
          const scenarios = cashFlowResult.scenarios as { base?: { months?: { month: string; revenue: number; burn: number; netCashFlow: number; cashBalance: number }[]; endBalance?: number; runway?: string; probability?: string }; bull?: { months?: { month: string; revenue: number; burn: number; netCashFlow: number; cashBalance: number }[]; endBalance?: number; runway?: string; probability?: string }; bear?: { months?: { month: string; revenue: number; burn: number; netCashFlow: number; cashBalance: number }[]; endBalance?: number; runway?: string; probability?: string } } | undefined;
          const scene = scenarios?.[cashFlowScenario];
          const months = scene?.months ?? [];
          const scenarioColors: Record<string, string> = { base: blue, bull: green, bear: red };
          return (
            <div>
              {!!cashFlowResult.fundraisingImplication && (
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Fundraising Implication</p>
                  <p style={{ fontSize: 11, color: ink }}>{cashFlowResult.fundraisingImplication as string}</p>
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {(['base', 'bull', 'bear'] as const).map(s => (
                  <button key={s} onClick={() => setCashFlowScenario(s)}
                    style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${cashFlowScenario === s ? scenarioColors[s] : bdr}`, background: cashFlowScenario === s ? scenarioColors[s] + "15" : bg, color: cashFlowScenario === s ? scenarioColors[s] : muted, fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>
                    {s} case {scenarios?.[s]?.probability ? `(${scenarios[s]!.probability})` : ''}
                  </button>
                ))}
              </div>
              {scene && (
                <div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <div style={{ flex: 1, background: surf, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                      <p style={{ fontSize: 10, color: muted, marginBottom: 2, fontWeight: 700, textTransform: "uppercase" }}>End Balance</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: (scene.endBalance ?? 0) >= 0 ? green : red }}>${((scene.endBalance ?? 0) / 1000).toFixed(0)}K</p>
                    </div>
                    <div style={{ flex: 1, background: surf, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                      <p style={{ fontSize: 10, color: muted, marginBottom: 2, fontWeight: 700, textTransform: "uppercase" }}>Runway</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: ink }}>{scene.runway ?? 'N/A'}</p>
                    </div>
                  </div>
                  {months.length > 0 && (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ background: surf }}>
                            {["Month", "Revenue", "Burn", "Net", "Balance"].map(h => (
                              <th key={h} style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: muted, borderBottom: `1px solid ${bdr}`, whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {months.map((m, mi) => (
                            <tr key={mi} style={{ borderBottom: `1px solid ${bdr}` }}>
                              <td style={{ padding: "5px 8px", color: muted, fontWeight: 600 }}>{m.month}</td>
                              <td style={{ padding: "5px 8px", textAlign: "right", color: green }}>${(m.revenue / 1000).toFixed(1)}K</td>
                              <td style={{ padding: "5px 8px", textAlign: "right", color: red }}>${(m.burn / 1000).toFixed(1)}K</td>
                              <td style={{ padding: "5px 8px", textAlign: "right", color: m.netCashFlow >= 0 ? green : red, fontWeight: 600 }}>{m.netCashFlow >= 0 ? '+' : ''}{(m.netCashFlow / 1000).toFixed(1)}K</td>
                              <td style={{ padding: "5px 8px", textAlign: "right", color: m.cashBalance >= 0 ? ink : red, fontWeight: 700 }}>${(m.cashBalance / 1000).toFixed(1)}K</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {!!(cashFlowResult.recommendations as string[] | undefined)?.length && (
                <div style={{ marginTop: 14 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Recommendations</p>
                  {(cashFlowResult.recommendations as string[]).map((r, ri) => (
                    <p key={ri} style={{ fontSize: 11, color: ink, marginBottom: 4 }}>→ {r}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Unit Economics Deep-Dive ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 20, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Unit Economics Deep-Dive</p>
            <p style={{ fontSize: 11, color: muted }}>Analyze LTV/CAC ratio, payback period, burn multiple, and magic number with benchmarks and improvement levers.</p>
          </div>
          <button onClick={handleGenerateUnitEcon} disabled={generatingUnitEcon}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingUnitEcon ? bdr : blue, color: generatingUnitEcon ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingUnitEcon ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {generatingUnitEcon ? "Analyzing…" : "Analyze Unit Economics"}
          </button>
        </div>
        {unitEconError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{unitEconError}</p>}
        {unitEconResult && (() => {
          const improvements = (unitEconResult.improvements as { lever: string; action: string; expectedImpact: string; effort: string; priority: string }[] | undefined) ?? [];
          const benchmarks = (unitEconResult.benchmarks as { metric: string; yourValue: string; benchmark: string; status: string; insight: string }[] | undefined) ?? [];
          const scenario = unitEconResult.scenarioModeling as { current?: Record<string, unknown>; improved?: { assumption: string; ltvCac: number; payback: number; burnMultiple: number }; target?: { benchmark: string; ltvCac: number; payback: number; burnMultiple: number } } | undefined;
          return (
            <div>
              {!!unitEconResult.verdict && (
                <p style={{ fontSize: 12, color: muted, fontStyle: "italic", marginBottom: 14 }}>{unitEconResult.verdict as string}</p>
              )}
              {/* Key metrics grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8, marginBottom: 18 }}>
                {[
                  { label: "LTV/CAC", val: unitEconResult.ltvCacRatio as number, format: (v: number) => `${v.toFixed(1)}x`, threshold: 3 },
                  { label: "Payback", val: unitEconResult.paybackMonths as number, format: (v: number) => `${v}mo`, threshold: 18, reverse: true },
                  { label: "Burn Multiple", val: unitEconResult.burnMultiple as number, format: (v: number) => `${v.toFixed(1)}x`, threshold: 2, reverse: true },
                  { label: "Magic Number", val: unitEconResult.magicNumber as number, format: (v: number) => v.toFixed(2), threshold: 0.75 },
                ].map(m => (
                  <div key={m.label} style={{ background: surf, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr}`, textAlign: "center" }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{m.label}</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: typeof m.val === 'number' ? ((m.reverse ? m.val <= m.threshold : m.val >= m.threshold) ? green : red) : ink }}>
                      {typeof m.val === 'number' ? m.format(m.val) : '—'}
                    </p>
                  </div>
                ))}
              </div>
              {/* Additional metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8, marginBottom: 18 }}>
                {[
                  { label: "Gross Margin", val: unitEconResult.grossMargin },
                  { label: "NRR Estimate", val: unitEconResult.nrrEstimate },
                  { label: "CAC", val: unitEconResult.cac },
                  { label: "LTV", val: unitEconResult.ltv },
                ].map(m => (
                  <div key={m.label} style={{ background: bg, borderRadius: 8, padding: "8px 10px", border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{m.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{m.val as string ?? '—'}</p>
                  </div>
                ))}
              </div>
              {/* Benchmarks */}
              {benchmarks.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Benchmarks</p>
                  {benchmarks.map((b, bi) => (
                    <div key={bi} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", background: surf, borderRadius: 8, border: `1px solid ${bdr}`, marginBottom: 6 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, flex: 1 }}>{b.metric}</p>
                      <span style={{ fontSize: 11, fontWeight: 700, color: ink }}>{b.yourValue}</span>
                      <span style={{ fontSize: 10, color: muted }}>vs {b.benchmark}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: b.status === 'above' ? green : b.status === 'at' ? blue : red, textTransform: "capitalize" }}>{b.status}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Improvement levers */}
              {improvements.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Improvement Levers</p>
                  {improvements.slice(0, 3).map((imp, ii) => (
                    <div key={ii} style={{ padding: "10px 12px", background: bg, borderRadius: 8, border: `1px solid ${bdr}`, marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{imp.lever}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, color: imp.effort === 'low' ? green : imp.effort === 'medium' ? amber : red }}>{imp.effort} effort</span>
                        <span style={{ fontSize: 10, color: muted, marginLeft: "auto" }}>{imp.priority}</span>
                      </div>
                      <p style={{ fontSize: 11, color: muted }}>{imp.action}</p>
                      {!!imp.expectedImpact && <p style={{ fontSize: 11, color: green, marginTop: 4, fontWeight: 600 }}>↑ {imp.expectedImpact}</p>}
                    </div>
                  ))}
                </div>
              )}
              {/* Scenario */}
              {scenario?.improved && (
                <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: green, marginBottom: 4 }}>Improved Scenario: {scenario.improved.assumption}</p>
                  <div style={{ display: "flex", gap: 16 }}>
                    <span style={{ fontSize: 11, color: ink }}>LTV/CAC: <strong>{scenario.improved.ltvCac}x</strong></span>
                    <span style={{ fontSize: 11, color: ink }}>Payback: <strong>{scenario.improved.payback}mo</strong></span>
                    <span style={{ fontSize: 11, color: ink }}>Burn Multiple: <strong>{scenario.improved.burnMultiple}x</strong></span>
                  </div>
                </div>
              )}
              {!!unitEconResult.quickWin && (
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Quick Win This Week</p>
                  <p style={{ fontSize: 11, color: ink }}>{unitEconResult.quickWin as string}</p>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Scenario Planning ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: ink, margin: 0 }}>Scenario Planning</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Bear / Base / Bull 18-month financial models with trigger points and contingency plans.</p>
          </div>
          <button onClick={handleGenerateScenarioPlanning} disabled={generatingScenPlan} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: generatingScenPlan ? bdr : blue, color: generatingScenPlan ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: generatingScenPlan ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, marginLeft: 12 }}>
            {generatingScenPlan ? "Modeling…" : "Model Scenarios"}
          </button>
        </div>
        {scenPlanError && <p style={{ fontSize: 11, color: red, marginBottom: 8 }}>{scenPlanError}</p>}
        {scenPlanResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            {!!scenPlanResult.verdict && <p style={{ fontSize: 12, color: muted, fontStyle: "italic", marginBottom: 12 }}>{String(scenPlanResult.verdict)}</p>}
            {!!scenPlanResult.scenarios && (() => {
              const scenes = scenPlanResult.scenarios as Record<string, unknown>[];
              const colors = [red, amber, green];
              return (
                <div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                    {scenes.map((s, i) => (
                      <button key={i} onClick={() => setScenPlanIdx(i)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `2px solid ${scenPlanIdx === i ? colors[i] : bdr}`, background: scenPlanIdx === i ? colors[i] + "22" : bg, color: scenPlanIdx === i ? colors[i] : ink, fontSize: 12, fontWeight: scenPlanIdx === i ? 700 : 400, cursor: "pointer" }}>
                        {String(s.name ?? '')}
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const s = scenes[scenPlanIdx];
                    if (!s) return null;
                    const c = colors[scenPlanIdx];
                    return (
                      <div style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${c}` }}>
                        {!!s.probability && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: 11, color: muted }}>Probability</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{String(s.probability)}</span>
                        </div>}
                        {!!s.trigger && <p style={{ fontSize: 11, color: muted, marginBottom: 10 }}><b>Trigger:</b> {String(s.trigger)}</p>}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                          {[["mrrIn6Months", "MRR (6mo)"], ["mrrIn12Months", "MRR (12mo)"], ["mrrIn18Months", "MRR (18mo)"]].map(([k, label]) => (
                            !!s[k] && (
                              <div key={k} style={{ textAlign: "center" as const, background: surf, borderRadius: 6, padding: 8 }}>
                                <p style={{ fontSize: 10, color: muted, marginBottom: 2 }}>{label}</p>
                                <p style={{ fontSize: 13, fontWeight: 700, color: c }}>{String(s[k])}</p>
                              </div>
                            )
                          ))}
                        </div>
                        {!!s.fundingImplication && <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}><b>Funding:</b> {String(s.fundingImplication)}</p>}
                        {!!s.keyMilestone && <p style={{ fontSize: 11, color: blue }}><b>Key Milestone:</b> {String(s.keyMilestone)}</p>}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
            {!!scenPlanResult.triggerPoints && (() => {
              const triggers = scenPlanResult.triggerPoints as Record<string, unknown>[];
              return (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginBottom: 8 }}>Trigger Points</p>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                    {triggers.map((t, i) => (
                      <div key={i} style={{ background: bg, borderRadius: 8, padding: 10, border: `1px solid ${bdr}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: ink }}>{String(t.trigger ?? '')}</p>
                          {!!t.scenario && <span style={{ fontSize: 10, background: surf, border: `1px solid ${bdr}`, borderRadius: 20, padding: "2px 7px", color: muted }}>{String(t.scenario)}</span>}
                        </div>
                        {!!t.action && <p style={{ fontSize: 11, color: blue }}><b>Action:</b> {String(t.action)}</p>}
                        {!!t.leadTime && <p style={{ fontSize: 10, color: muted }}>Lead time: {String(t.leadTime)}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            {!!scenPlanResult.priorityAction && (
              <div style={{ marginTop: 12, background: blue + "11", borderRadius: 8, padding: 10, borderLeft: `3px solid ${blue}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Priority Action</p>
                <p style={{ fontSize: 12, color: ink }}>{String(scenPlanResult.priorityAction)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Unit Economics ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: ink, margin: 0 }}>Unit Economics</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Deep dive into LTV:CAC, payback period, cohort retention, and improvement levers</p>
          </div>
          <button onClick={handleGenerateUnitEconomics} disabled={generatingUnitEcon} style={{ padding: "8px 16px", borderRadius: 8, background: generatingUnitEcon ? surf : ink, color: generatingUnitEcon ? muted : bg, fontSize: 12, fontWeight: 600, border: "none", cursor: generatingUnitEcon ? "default" : "pointer" }}>
            {generatingUnitEcon ? "Calculating…" : "Calculate Unit Econ"}
          </button>
        </div>
        {unitEconError && <p style={{ color: "#DC2626", fontSize: 12 }}>{unitEconError}</p>}
        {unitEconResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!!unitEconResult.verdict && <p style={{ fontSize: 13, color: ink, margin: 0, padding: "10px 14px", background: surf, borderRadius: 8 }}>{String(unitEconResult.verdict)}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {!!unitEconResult.ltvCacRatio && <div style={{ padding: "10px 12px", background: surf, borderRadius: 8, textAlign: "center" }}><p style={{ fontSize: 10, color: muted, margin: "0 0 2px" }}>LTV:CAC</p><p style={{ fontSize: 18, fontWeight: 700, color: ink, margin: 0 }}>{String(unitEconResult.ltvCacRatio)}</p>{!!unitEconResult.ltvCacHealth && <p style={{ fontSize: 10, color: muted, margin: "2px 0 0" }}>{String(unitEconResult.ltvCacHealth)}</p>}</div>}
              {!!unitEconResult.paybackMonths && <div style={{ padding: "10px 12px", background: surf, borderRadius: 8, textAlign: "center" }}><p style={{ fontSize: 10, color: muted, margin: "0 0 2px" }}>Payback</p><p style={{ fontSize: 18, fontWeight: 700, color: ink, margin: 0 }}>{String(unitEconResult.paybackMonths)}</p><p style={{ fontSize: 10, color: muted, margin: "2px 0 0" }}>months</p></div>}
              {!!unitEconResult.grossMarginPct && <div style={{ padding: "10px 12px", background: surf, borderRadius: 8, textAlign: "center" }}><p style={{ fontSize: 10, color: muted, margin: "0 0 2px" }}>Gross Margin</p><p style={{ fontSize: 18, fontWeight: 700, color: ink, margin: 0 }}>{String(unitEconResult.grossMarginPct)}</p></div>}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["overview","cohorts","levers","projections"] as const).map(t => (
                <button key={t} onClick={() => setUnitEconTab(t)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${unitEconTab===t ? ink : bdr}`, background: unitEconTab===t ? ink : bg, color: unitEconTab===t ? bg : ink, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {t==="overview" ? "📊 Overview" : t==="cohorts" ? "📈 Cohorts" : t==="levers" ? "🔧 Levers" : "🔮 Projections"}
                </button>
              ))}
            </div>
            {unitEconTab === "overview" && !!unitEconResult.unitBreakdown && (() => {
              const b = unitEconResult.unitBreakdown as Record<string, unknown>;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[["Revenue/Customer", b.revenuePerCustomer], ["Cost to Serve", b.costToServe], ["Contribution Margin", b.contributionMargin], ["Break-even Time", b.timeToBreakEven]].map(([label, val]) => (
                    <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: surf, borderRadius: 8 }}>
                      <p style={{ fontSize: 12, color: muted, margin: 0 }}>{String(label)}</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: 0 }}>{val ? String(val) : "—"}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
            {unitEconTab === "cohorts" && !!(unitEconResult.cohortAnalysis as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(unitEconResult.cohortAnalysis as { cohort: string; retention: string; cumulativeRevenue: string; ltv: string }[]).map((c, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr", gap: 8, padding: "8px 12px", background: surf, borderRadius: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: 0 }}>{c.cohort}</p>
                    <p style={{ fontSize: 11, color: muted, margin: 0 }}>Retention: {c.retention}</p>
                    <p style={{ fontSize: 11, color: muted, margin: 0 }}>Revenue: {c.cumulativeRevenue}</p>
                    <p style={{ fontSize: 11, color: "#16A34A", margin: 0 }}>LTV: {c.ltv}</p>
                  </div>
                ))}
              </div>
            )}
            {unitEconTab === "levers" && !!(unitEconResult.improvementLevers as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(unitEconResult.improvementLevers as { lever: string; currentState: string; target: string; impact: string; howTo: string }[]).map((l, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 4px" }}>{l.lever}</p>
                    <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: muted }}>Now: {l.currentState}</span>
                      <span style={{ fontSize: 11, color: "#16A34A" }}>Target: {l.target}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#2563EB", margin: "0 0 4px" }}>Impact: {l.impact}</p>
                    <p style={{ fontSize: 11, color: muted, margin: 0 }}>How: {l.howTo}</p>
                  </div>
                ))}
              </div>
            )}
            {unitEconTab === "projections" && !!(unitEconResult.projections as unknown[])?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(unitEconResult.projections as { scenario: string; ltvCacIn12Months: string; paybackIn12Months: string; keyAssumption: string }[]).map((p, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: "0 0 6px", textTransform: "capitalize" }}>{p.scenario}</p>
                    <div style={{ display: "flex", gap: 16, marginBottom: 4 }}>
                      <p style={{ fontSize: 12, color: ink, margin: 0 }}>LTV:CAC: <strong>{p.ltvCacIn12Months}</strong></p>
                      <p style={{ fontSize: 12, color: ink, margin: 0 }}>Payback: <strong>{p.paybackIn12Months}</strong></p>
                    </div>
                    <p style={{ fontSize: 11, color: muted, margin: 0 }}>Assumes: {p.keyAssumption}</p>
                  </div>
                ))}
              </div>
            )}
            {!!unitEconResult.priorityAction && <div style={{ padding: "10px 14px", background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid #16A34A" }}><p style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", margin: "0 0 4px" }}>Priority Action</p><p style={{ fontSize: 12, color: ink, margin: 0 }}>{String(unitEconResult.priorityAction)}</p></div>}
            <button onClick={() => setUnitEconResult(null)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, color: muted, fontSize: 11, cursor: "pointer", alignSelf: "flex-start" }}>Re-run</button>
          </div>
        )}
      </div>

      {/* ── Cost Reduction ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: ink, margin: 0 }}>Cost Reduction Analysis</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Find savings across every cost category with quick wins, renegotiation targets, and a 4-week implementation plan</p>
          </div>
          <button onClick={handleGenerateCostReduction} disabled={generatingCostRed} style={{ padding: "8px 16px", borderRadius: 8, background: generatingCostRed ? muted : red, color: "#fff", fontSize: 12, fontWeight: 600, border: "none", cursor: generatingCostRed ? "not-allowed" : "pointer" }}>
            {generatingCostRed ? "Analyzing…" : "Find Savings"}
          </button>
        </div>
        {costRedError && <p style={{ fontSize: 12, color: red }}>{costRedError}</p>}
        {costRedResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[["Potential Savings", costRedResult.totalPotentialSavings], ["Target Multiple", costRedResult.burnMultipleTarget], ["Verdict", null]].map(([l, v]) => (
                l === "Verdict"
                  ? <div key="verdict" style={{ gridColumn: "1 / -1", background: "#EFF6FF", borderRadius: 8, padding: 10 }}><p style={{ fontSize: 12, color: ink, margin: 0, fontStyle: "italic" }}>{String(costRedResult.verdict ?? "")}</p></div>
                  : <div key={String(l)} style={{ background: bg, borderRadius: 8, padding: 10, textAlign: "center" as const }}>
                      <p style={{ fontSize: 18, fontWeight: 700, color: green, margin: 0 }}>{String(v ?? "—")}</p>
                      <p style={{ fontSize: 11, color: muted }}>{String(l)}</p>
                    </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {(["categories", "quickwins", "renegotiation", "plan"] as const).map(t => (
                <button key={t} onClick={() => setCostRedTab(t)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${costRedTab === t ? red : bdr}`, background: costRedTab === t ? "#FEE2E2" : "transparent", color: costRedTab === t ? red : muted, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                  {t === "quickwins" ? "Quick Wins" : t === "renegotiation" ? "Renegotiate" : t}
                </button>
              ))}
            </div>
            {costRedTab === "categories" && !!(costRedResult.categories as unknown[])?.length && (
              <div>
                {(costRedResult.categories as { category: string; estimatedMonthlyCost: string; potentialSaving: string; savingPct: number; difficulty: string; riskToGrowth: string }[]).map((c, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>{c.category}</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 12, color: green, fontWeight: 700 }}>Save {c.potentialSaving}</span>
                        <span style={{ fontSize: 11, color: muted }}>(-{c.savingPct}%)</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: muted }}>Current: {c.estimatedMonthlyCost} · Difficulty: {c.difficulty} · Growth risk: {c.riskToGrowth}</p>
                  </div>
                ))}
              </div>
            )}
            {costRedTab === "quickwins" && !!(costRedResult.quickWins as unknown[])?.length && (
              <div>
                {(costRedResult.quickWins as { win: string; saving: string; howTo: string; timeToImplement: string }[]).map((w, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>{w.win}</p>
                      <span style={{ fontSize: 12, color: green, fontWeight: 700 }}>{w.saving}/mo</span>
                    </div>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 2 }}>{w.howTo}</p>
                    <p style={{ fontSize: 11, color: blue }}>Time: {w.timeToImplement}</p>
                  </div>
                ))}
              </div>
            )}
            {costRedTab === "renegotiation" && !!(costRedResult.renegotiationTargets as unknown[])?.length && (
              <div>
                {(costRedResult.renegotiationTargets as { vendor: string; leverage: string; targetOutcome: string; script: string }[]).map((r, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}` }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 4 }}>{r.vendor}</p>
                    <p style={{ fontSize: 12, color: muted, marginBottom: 4 }}>Leverage: {r.leverage}</p>
                    <p style={{ fontSize: 12, color: green, marginBottom: 6 }}>Target: {r.targetOutcome}</p>
                    <div style={{ background: bg, borderRadius: 6, padding: 10, fontSize: 12, color: ink, fontStyle: "italic" }}>{r.script}</div>
                  </div>
                ))}
              </div>
            )}
            {costRedTab === "plan" && !!(costRedResult.implementationPlan as unknown[])?.length && (
              <div>
                {(costRedResult.implementationPlan as { week: string; actions: string[]; targetSaving: string }[]).map((w, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: red, margin: 0 }}>{w.week}</p>
                      <span style={{ fontSize: 12, color: green, fontWeight: 600 }}>Target: {w.targetSaving}</span>
                    </div>
                    {w.actions?.map((a, ai) => <p key={ai} style={{ fontSize: 12, color: ink, marginBottom: 3 }}>→ {a}</p>)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Revenue Forecast ── */}
      <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 24, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: ink, margin: 0 }}>Revenue Forecast</p>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>Monthly projections, growth drivers, milestones, and sensitivity analysis</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select value={revForecastMonths} onChange={e => setRevForecastMonths(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, background: bg }}>
              {["6","12","18","24"].map(m => <option key={m} value={m}>{m}M</option>)}
            </select>
            <button onClick={handleGenerateRevForecast} disabled={generatingRevForecast} style={{ padding: "8px 16px", borderRadius: 8, background: generatingRevForecast ? muted : green, color: "#fff", fontSize: 12, fontWeight: 600, border: "none", cursor: generatingRevForecast ? "not-allowed" : "pointer" }}>
              {generatingRevForecast ? "Forecasting…" : "Build Forecast"}
            </button>
          </div>
        </div>
        {revForecastError && <p style={{ fontSize: 12, color: red }}>{revForecastError}</p>}
        {revForecastResult && (
          <div style={{ background: surf, borderRadius: 10, padding: 16 }}>
            {!!revForecastResult.summary && <p style={{ fontSize: 13, color: muted, fontStyle: "italic", marginBottom: 14 }}>{String(revForecastResult.summary)}</p>}
            {/* Annual Summary */}
            {!!revForecastResult.annualSummary && (() => {
              const s = revForecastResult.annualSummary as { year1ARR?: number | string; year1Growth?: string; year1CustomerCount?: number | string; forecastEndMRR?: number | string };
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                  {[["Year 1 ARR", s.year1ARR], ["Growth", s.year1Growth], ["Customers", s.year1CustomerCount], ["End MRR", s.forecastEndMRR]].map(([l, v]) => (
                    <div key={String(l)} style={{ background: bg, borderRadius: 8, padding: 10, textAlign: "center" as const }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0 }}>{typeof v === 'number' ? `$${v.toLocaleString()}` : String(v ?? "—")}</p>
                      <p style={{ fontSize: 11, color: muted }}>{String(l)}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {(["projections", "drivers", "milestones", "risks"] as const).map(t => (
                <button key={t} onClick={() => setRevForecastTab(t)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${revForecastTab === t ? green : bdr}`, background: revForecastTab === t ? "#DCFCE7" : "transparent", color: revForecastTab === t ? "#16A34A" : muted, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>
              ))}
            </div>
            {revForecastTab === "projections" && !!(revForecastResult.monthlyProjections as unknown[])?.length && (
              <div style={{ overflowX: "auto" as const }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr>{["Month","New MRR","Churned","Expansion","Total MRR","Customers"].map(h => (
                      <th key={h} style={{ padding: "6px 8px", borderBottom: `1px solid ${bdr}`, color: muted, fontWeight: 600, textAlign: "left" as const }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {(revForecastResult.monthlyProjections as { month: string; newMRR: number; churnedMRR: number; expansionMRR: number; totalMRR: number; customers: number }[]).slice(0, 12).map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : bg }}>
                        <td style={{ padding: "5px 8px", color: ink }}>{row.month}</td>
                        <td style={{ padding: "5px 8px", color: "#16A34A" }}>+${(row.newMRR ?? 0).toLocaleString()}</td>
                        <td style={{ padding: "5px 8px", color: red }}>-${(row.churnedMRR ?? 0).toLocaleString()}</td>
                        <td style={{ padding: "5px 8px", color: blue }}>+${(row.expansionMRR ?? 0).toLocaleString()}</td>
                        <td style={{ padding: "5px 8px", color: ink, fontWeight: 700 }}>${(row.totalMRR ?? 0).toLocaleString()}</td>
                        <td style={{ padding: "5px 8px", color: muted }}>{row.customers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {revForecastTab === "drivers" && !!(revForecastResult.growthDrivers as unknown[])?.length && (
              <div>
                {(revForecastResult.growthDrivers as { driver: string; impact: string; implementation: string; timeline: string }[]).map((d, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>{d.driver}</p>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: d.impact === "high" ? "#DCFCE7" : d.impact === "medium" ? "#FEF3C7" : "#F3F4F6", color: d.impact === "high" ? "#16A34A" : d.impact === "medium" ? amber : muted, fontWeight: 600 }}>{d.impact}</span>
                    </div>
                    <p style={{ fontSize: 12, color: muted, margin: "0 0 2px" }}>{d.implementation}</p>
                    <p style={{ fontSize: 11, color: muted, fontStyle: "italic" }}>Contributes: {d.timeline}</p>
                  </div>
                ))}
              </div>
            )}
            {revForecastTab === "milestones" && !!(revForecastResult.milestones as unknown[])?.length && (
              <div>
                {(revForecastResult.milestones as { milestone: string; estimatedMonth: string; significance: string }[]).map((m, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: green, background: "#DCFCE7", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap" as const }}>{m.estimatedMonth}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>{m.milestone}</p>
                      <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>{m.significance}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {revForecastTab === "risks" && !!(revForecastResult.risks as unknown[])?.length && (
              <div>
                {(revForecastResult.risks as { risk: string; probability: string; mitigation: string }[]).map((r, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${bdr}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0 }}>{r.risk}</p>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: r.probability === "high" ? "#FEE2E2" : r.probability === "medium" ? "#FEF3C7" : "#F3F4F6", color: r.probability === "high" ? red : r.probability === "medium" ? amber : muted, fontWeight: 600 }}>{r.probability}</span>
                    </div>
                    <p style={{ fontSize: 12, color: muted }}>{r.mitigation}</p>
                  </div>
                ))}
                {!!revForecastResult.fundraisingSignal && (
                  <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 12px", marginTop: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: blue, marginBottom: 2 }}>Fundraising Signal</p>
                    <p style={{ fontSize: 12, color: ink }}>{String(revForecastResult.fundraisingSignal)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGAL CHECKLIST RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
