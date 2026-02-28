"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, CheckCircle, Circle, X, Edit3, FileText } from "lucide-react";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";
const amber = "#D97706";
const red   = "#DC2626";

// ─── topics ───────────────────────────────────────────────────────────────────
const TOPICS = [
  { key: "your_story",        label: "Your Story",         dimension: "Team" },
  { key: "customer_evidence", label: "Customer Evidence",   dimension: "Product" },
  { key: "learning_velocity", label: "What You've Learned", dimension: "Product" },
  { key: "market",            label: "Market & Competition",dimension: "Market" },
  { key: "gtm",              label: "Go-to-Market",        dimension: "GTM" },
  { key: "financials",        label: "The Numbers",         dimension: "Financial" },
  { key: "resilience",        label: "Resilience",          dimension: "Traction" },
] as const;

// Fields required per topic (mirrors interview API — used for pre-coverage detection)
const TOPIC_FIELDS: Record<string, string[]> = {
  your_story:        ["problemStory", "advantages", "advantageExplanation"],
  customer_evidence: ["customerQuote", "customerSurprise", "customerCommitment", "conversationCount", "failedBelief"],
  learning_velocity: ["tested", "buildTime", "measurement", "results", "learned", "changed"],
  market:            ["targetCustomers", "conversionRate", "lifetimeValue", "costPerAcquisition"],
  gtm:               ["icpDescription", "channelsTried", "currentCAC"],
  financials:        ["mrr", "monthlyBurn", "runway"],
  resilience:        ["hardshipStory", "motivation"],
};

// Opening question for each topic (used in the greeting when resuming)
const TOPIC_OPENING: Record<string, string> = {
  your_story:        "Tell me about yourself and the problem you're solving. What's the personal story behind this startup?",
  customer_evidence: "Let's talk about your customers. How many conversations have you had, and what did they say?",
  learning_velocity: "What have you actually built and tested so far? Walk me through one specific experiment — what you built, how long it took, and what you measured.",
  market:            "How big is your market? How many people have the problem you're solving, and how do you know?",
  gtm:               "How are you reaching customers today? What channels have you tried and what's working?",
  financials:        "Let's look at the numbers. What's your MRR, monthly burn, and runway?",
  resilience:        "Every startup hits a wall. What was your hardest moment so far and how did you get through it?",
};

// Detect which topics are already sufficiently covered by prior data (onboarding or saved draft).
// Uses 50% field coverage threshold — more lenient than in-interview (70%) since onboarding
// data only captures a subset of each topic's full field set.
function getPreCoveredTopics(data: ExtractedData): string[] {
  const covered: string[] = [];
  for (const topic of TOPICS) {
    const fields = TOPIC_FIELDS[topic.key] ?? [];
    if (fields.length === 0) continue;
    const populated = fields.filter(f => {
      const val = data[f];
      return val != null && val !== "" && val !== 0 && val !== false;
    }).length;
    if (populated / fields.length >= 0.5) {
      covered.push(topic.key);
    }
  }
  return covered;
}

const DIMENSIONS = [
  { key: "market",    label: "Market",    weight: "20%" },
  { key: "product",   label: "Product",   weight: "18%" },
  { key: "gtm",       label: "GTM",       weight: "17%" },
  { key: "financial",  label: "Financial", weight: "18%" },
  { key: "team",      label: "Team",      weight: "15%" },
  { key: "traction",  label: "Traction",  weight: "12%" },
];

// ─── types ────────────────────────────────────────────────────────────────────
interface FileUploadData {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  status: "uploading" | "done" | "error";
}
interface UiMessage { role: "q" | "user"; text: string; fileUpload?: FileUploadData; }

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function fileTypeLabel(mimeType: string, name: string): string {
  if (mimeType === "application/pdf" || name.endsWith(".pdf")) return "PDF";
  if (mimeType === "text/csv" || name.endsWith(".csv")) return "CSV";
  if (name.endsWith(".md")) return "MD";
  return "TXT";
}

// Extracted data fields (flat map that accumulates during the interview)
type ExtractedData = Record<string, string | number | string[] | boolean | null>;

// Key metrics we show in the panel
const KEY_METRICS: { key: string; label: string; prefix?: string; suffix?: string }[] = [
  { key: "mrr",              label: "MRR",              prefix: "$" },
  { key: "arr",              label: "ARR",              prefix: "$" },
  { key: "monthlyBurn",      label: "Monthly Burn",     prefix: "$" },
  { key: "runway",           label: "Runway",           suffix: " months" },
  { key: "conversationCount",label: "Customer Convos" },
  { key: "customerCommitment",label: "Commitment Level" },
  { key: "currentCAC",       label: "CAC",              prefix: "$" },
  { key: "lifetimeValue",    label: "LTV",              prefix: "$" },
  { key: "targetCustomers",  label: "Target Customers" },
  { key: "tam",              label: "TAM",              prefix: "$" },
  { key: "grossMargin",      label: "Gross Margin",     suffix: "%" },
];

function dimColor(score: number): string {
  if (score >= 70) return green;
  if (score >= 40) return amber;
  if (score > 0) return red;
  return bdr;
}

function sanitizeReply(text: string): string {
  if (!text) return "Let's continue — tell me more.";
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      return parsed.reply || parsed.message || "Let's continue — tell me more.";
    } catch {
      return trimmed
        .replace(/[{}"\\[\]]/g, '')
        .replace(/\b(reply|extraction|topicComplete|suggestedNextTopic)\b\s*:/gi, '')
        .replace(/,\s*/g, ' ')
        .trim() || "Let's continue — tell me more.";
    }
  }
  return text;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function AssessmentInterview() {
  const router = useRouter();

  const [messages,       setMessages]       = useState<UiMessage[]>([]);
  const [apiHistory,     setApiHistory]     = useState<{ role: string; content: string }[]>([]);
  const [input,          setInput]          = useState("");
  const [typing,         setTyping]         = useState(false);
  const [completing,     setCompleting]     = useState(false);
  const [currentTopic,   setCurrentTopic]   = useState(0);
  const [coveredTopics,  setCoveredTopics]  = useState<string[]>([]);
  const [extracted,      setExtracted]      = useState<ExtractedData>({});
  const [dimScores,      setDimScores]      = useState<Record<string, number>>({});
  const [overallScore,   setOverallScore]   = useState(0);
  const [uploading,      setUploading]      = useState(false);
  const [isSavingDraft,  setIsSavingDraft]  = useState(false);
  const [dragOver,       setDragOver]       = useState(false);
  const [editingField,   setEditingField]   = useState<string | null>(null);
  const [editValue,      setEditValue]      = useState("");

  const chatEndRef  = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Load onboarding data + opening message
  useEffect(() => {
    let cancelled = false;
    async function init() {
      // Try to load onboarding data for refinement flow
      let onboardingData: ExtractedData = {};
      const preCovered: string[] = [];
      let firstUncovered = 0;

      try {
        const res = await fetch("/api/onboarding/data");
        const { extractedData } = await res.json();
        if (extractedData && Object.keys(extractedData).length > 0) {
          onboardingData = extractedData;
          // Detect covered topics using TOPIC_FIELDS with 50% threshold
          const detected = getPreCoveredTopics(extractedData);
          preCovered.push(...detected);
        }
      } catch {
        // No onboarding data — start fresh
      }

      if (cancelled) return;

      // Pre-populate extracted data from onboarding
      if (Object.keys(onboardingData).length > 0) {
        setExtracted(prev => ({ ...prev, ...onboardingData }));
      }
      if (preCovered.length > 0) {
        setCoveredTopics(preCovered);
        firstUncovered = TOPICS.findIndex(t => !preCovered.includes(t.key));
        if (firstUncovered < 0) firstUncovered = TOPICS.length - 1; // all covered, start last
        setCurrentTopic(firstUncovered);
      }

      // Build greeting based on what we know
      const nextTopicKey  = TOPICS[firstUncovered]?.key ?? "your_story";
      const nextTopicLabel = TOPICS[firstUncovered]?.label ?? "Your Story";
      const openingQuestion = TOPIC_OPENING[nextTopicKey] ?? TOPIC_OPENING.your_story;
      const coveredLabels = preCovered
        .map(k => TOPICS.find(t => t.key === k)?.label)
        .filter(Boolean)
        .join(", ");

      const greeting: UiMessage = preCovered.length > 0
        ? {
            role: "q",
            text: `Welcome back! I've reviewed your onboarding conversation and already have good data on ${coveredLabels}.\n\nLet's fill in the gaps — starting with **${nextTopicLabel}**. You can also drag-and-drop your pitch deck or financials at any time.\n\n${openingQuestion}`,
          }
        : {
            role: "q",
            text: "Welcome to your Q-Score assessment. I'm Q — think of me as a sharp VC evaluator who genuinely wants to understand your startup.\n\nWe'll cover 7 topics through a conversation. You can also drag-and-drop your pitch deck or financials at any time — I'll extract what I can.\n\nLet's start: Tell me about yourself and the problem you're solving. What's the personal story behind this startup?",
          };

      setMessages([greeting]);
      setApiHistory([{ role: "assistant", content: greeting.text }]);
    }

    const timer = setTimeout(init, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  // Recalculate score preview whenever extracted data changes
  useEffect(() => {
    calculatePreviewScore(extracted);
  }, [extracted]);

  // Auto-save draft every 30 seconds if there's data
  useEffect(() => {
    if (Object.keys(extracted).length === 0) return;
    const timer = setInterval(() => {
      saveDraft(extracted);
    }, 30000);
    return () => clearInterval(timer);
  }, [extracted]);

  const calculatePreviewScore = (data: ExtractedData) => {
    // Simplified dimension scoring based on extracted fields
    const scores: Record<string, number> = {};

    // Market: tam, targetCustomers, conversionRate
    let market = 0;
    if (data.tam) market += 35;
    if (data.targetCustomers) market += 30;
    if (data.conversionRate) market += 20;
    if (data.som || data.sam) market += 15;
    scores.market = Math.min(market, 100);

    // Product: customerQuote, conversationCount, tested, results, failedBelief
    let product = 0;
    if (data.conversationCount && Number(data.conversationCount) > 0) product += 25;
    if (data.customerQuote) product += 20;
    if (data.tested) product += 15;
    if (data.results) product += 15;
    if (data.failedBelief) product += 15;
    if (data.customerSurprise) product += 10;
    scores.product = Math.min(product, 100);

    // GTM: icpDescription, channelsTried, currentCAC
    let gtm = 0;
    if (data.icpDescription) gtm += 35;
    if (data.channelsTried && Array.isArray(data.channelsTried) && data.channelsTried.length > 0) gtm += 30;
    if (data.currentCAC) gtm += 20;
    if (data.messagingTested) gtm += 15;
    scores.gtm = Math.min(gtm, 100);

    // Financial: mrr, monthlyBurn, runway, grossMargin
    let financial = 0;
    if (data.mrr) financial += 25;
    if (data.monthlyBurn) financial += 20;
    if (data.runway) financial += 20;
    if (data.grossMargin) financial += 15;
    if (data.projectedRevenue12mo) financial += 10;
    if (data.arr) financial += 10;
    scores.financial = Math.min(financial, 100);

    // Team: problemStory, advantages, hardshipStory
    let team = 0;
    if (data.problemStory) team += 35;
    if (data.advantages) team += 25;
    if (data.advantageExplanation) team += 15;
    if (data.hardshipStory) team += 15;
    if (data.motivation) team += 10;
    scores.team = Math.min(team, 100);

    // Traction: conversationCount, customerCommitment, mrr
    let traction = 0;
    if (data.conversationCount && Number(data.conversationCount) >= 20) traction += 30;
    else if (data.conversationCount && Number(data.conversationCount) >= 5) traction += 15;
    if (data.customerCommitment) traction += 25;
    if (data.mrr && Number(data.mrr) > 0) traction += 25;
    if (data.channelsTried) traction += 10;
    if (data.customerQuote) traction += 10;
    scores.traction = Math.min(traction, 100);

    setDimScores(scores);

    // Weighted overall
    const overall = Math.round(
      (scores.market || 0) * 0.20 +
      (scores.product || 0) * 0.18 +
      (scores.gtm || 0) * 0.17 +
      (scores.financial || 0) * 0.18 +
      (scores.team || 0) * 0.15 +
      (scores.traction || 0) * 0.12
    );
    setOverallScore(overall);
  };

  const saveDraft = async (data: ExtractedData) => {
    try {
      await fetch("/api/assessment/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentData: data }),
      });
    } catch {
      // Silent fail for auto-save
    }
  };

  // ─── send message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || typing) return;
    setInput("");

    const userMsg: UiMessage = { role: "user", text: msg };
    setMessages(prev => [...prev, userMsg]);
    const newHistory = [...apiHistory, { role: "user", content: msg }];
    setApiHistory(newHistory);
    setTyping(true);

    try {
      const res = await fetch("/api/assessment/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          conversationHistory: newHistory,
          currentTopic: TOPICS[currentTopic]?.key ?? "your_story",
          coveredTopics,
          extractedData: extracted,
        }),
      });

      const data = await res.json();
      const reply = sanitizeReply(data.reply);

      setMessages(prev => [...prev, { role: "q", text: reply }]);
      setApiHistory(prev => [...prev, { role: "assistant", content: reply }]);

      // Merge extraction
      if (data.extraction && Object.keys(data.extraction).length > 0) {
        setExtracted(prev => ({ ...prev, ...data.extraction }));
      }

      // Topic progression
      if (data.topicComplete) {
        const topicKey = TOPICS[currentTopic]?.key;
        if (topicKey && !coveredTopics.includes(topicKey)) {
          setCoveredTopics(prev => [...prev, topicKey]);
        }
        if (data.suggestedNextTopic) {
          const nextIdx = TOPICS.findIndex(t => t.key === data.suggestedNextTopic);
          if (nextIdx >= 0) setCurrentTopic(nextIdx);
        } else if (currentTopic < TOPICS.length - 1) {
          setCurrentTopic(prev => prev + 1);
        }
      }

      // Auto-complete when interview signals it's done
      if (data.interviewComplete && !completing) {
        setTimeout(() => handleComplete(), 1500);
      }
    } catch {
      setMessages(prev => [...prev, { role: "q", text: "Connection hiccup — try again." }]);
    } finally {
      setTyping(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, typing, apiHistory, currentTopic, coveredTopics, extracted]);

  // ─── file upload ──────────────────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setDragOver(false);

    const uploadId = `upload-${Date.now()}`;
    setMessages(prev => [...prev, {
      role: "user",
      text: "",
      fileUpload: { id: uploadId, name: file.name, size: file.size, mimeType: file.type, status: "uploading" },
    }]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/assessment/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.error) {
        setMessages(prev => prev.map(m =>
          m.fileUpload?.id === uploadId ? { ...m, fileUpload: { ...m.fileUpload!, status: "error" } } : m
        ));
        setMessages(prev => [...prev, { role: "q", text: data.error }]);
      } else {
        setMessages(prev => prev.map(m =>
          m.fileUpload?.id === uploadId ? { ...m, fileUpload: { ...m.fileUpload!, status: "done" } } : m
        ));
        if (data.extracted && Object.keys(data.extracted).length > 0) {
          setExtracted(prev => ({ ...prev, ...data.extracted }));
        }
        const summary = data.summary || `Processed ${file.name}.`;
        const fieldCount = Object.keys(data.extracted || {}).length;
        setMessages(prev => [...prev, {
          role: "q",
          text: `${summary}\n\nI extracted ${fieldCount} data point${fieldCount !== 1 ? "s" : ""} from your document — you can see them in the panel on the right. Let me know if anything looks off, or we can continue the conversation.`,
        }]);
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.fileUpload?.id === uploadId ? { ...m, fileUpload: { ...m.fileUpload!, status: "error" } } : m
      ));
      setMessages(prev => [...prev, { role: "q", text: "Couldn't process that file. Try sharing the key details in chat instead." }]);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  // ─── complete assessment ──────────────────────────────────────────────────
  const canComplete = coveredTopics.length >= 4;

  const handleComplete = async () => {
    if (completing) return;
    setCompleting(true);
    setTyping(true);
    try {
      // Save final draft
      await saveDraft(extracted);

      // Transform extracted data to match assessment data structure
      const assessmentData = transformExtractedToAssessment(extracted);

      // Submit assessment
      const res = await fetch("/api/assessment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentData }),
      });

      if (res.ok) {
        // Save to localStorage for dashboard
        localStorage.setItem("assessmentData", JSON.stringify(assessmentData));
        router.push("/founder/dashboard");
      } else {
        setMessages(prev => [...prev, { role: "q", text: "There was an issue submitting. Let's try again." }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "q", text: "Submission failed. Please try again." }]);
    } finally {
      setTyping(false);
      setCompleting(false);
    }
  };

  // ─── edit extracted field ─────────────────────────────────────────────────
  const startEdit = (key: string) => {
    setEditingField(key);
    setEditValue(String(extracted[key] ?? ""));
  };

  const saveEdit = () => {
    if (editingField) {
      const num = Number(editValue);
      setExtracted(prev => ({
        ...prev,
        [editingField]: !isNaN(num) && editValue.trim() !== "" ? num : editValue,
      }));
      setEditingField(null);
      setEditValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ─── SVG ring ─────────────────────────────────────────────────────────────
  const circumference = 2 * Math.PI * 42;
  const strokeDash = circumference * (1 - overallScore / 100);

  // Visible extracted metrics
  const visibleMetrics = KEY_METRICS.filter(m => extracted[m.key] != null && extracted[m.key] !== "" && extracted[m.key] !== 0);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: bg, color: ink }}>

      {/* ── header ──────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, borderBottom: `1px solid ${bdr}`,
        padding: "16px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: blue, fontWeight: 600, marginBottom: 2 }}>
            Q-Score Assessment
          </p>
          <p style={{ fontSize: "clamp(1rem,2vw,1.2rem)", fontWeight: 300, letterSpacing: "-0.02em", color: ink }}>
            The Interview
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ padding: "4px 12px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 11, color: muted }}>
            {coveredTopics.length} / {TOPICS.length} topics covered
          </div>
          <button
            onClick={async () => {
              setIsSavingDraft(true);
              await saveDraft(extracted);
              setIsSavingDraft(false);
              router.push("/founder/dashboard");
            }}
            disabled={isSavingDraft}
            style={{
              padding: "6px 14px", background: "transparent", color: muted,
              border: `1px solid ${bdr}`, borderRadius: 8, fontSize: 12, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit", transition: "border-color .15s, color .15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = ink; e.currentTarget.style.color = ink; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.color = muted; }}
          >
            {isSavingDraft ? "Saving…" : "Continue Later"}
          </button>
          {canComplete && (
            <button
              onClick={handleComplete}
              disabled={typing}
              style={{
                padding: "6px 16px", background: green, color: "#fff",
                border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Complete Assessment
            </button>
          )}
        </div>
      </div>

      {/* ── body ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── chat column ───────────────────────────────────────────────── */}
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {/* messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
            <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: "flex", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}
                  >
                    {msg.role === "q" && (
                      <div style={{
                        height: 28, width: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                        background: ink, color: bg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700,
                      }}>
                        Q
                      </div>
                    )}

                    {/* File upload card */}
                    {msg.fileUpload ? (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px",
                        background: ink, borderRadius: 14, borderTopRightRadius: 4,
                        maxWidth: 300, minWidth: 220,
                      }}>
                        {/* file type badge */}
                        <div style={{
                          height: 42, width: 38, flexShrink: 0,
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 8,
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                        }}>
                          <FileText style={{ height: 14, width: 14, color: "rgba(249,247,242,0.7)" }} />
                          <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(249,247,242,0.5)", letterSpacing: "0.04em" }}>
                            {fileTypeLabel(msg.fileUpload.mimeType, msg.fileUpload.name)}
                          </span>
                        </div>
                        {/* file info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: bg, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {msg.fileUpload.name}
                          </p>
                          <p style={{ fontSize: 10, color: "rgba(249,247,242,0.45)" }}>
                            {formatFileSize(msg.fileUpload.size)}
                          </p>
                        </div>
                        {/* status indicator */}
                        {msg.fileUpload.status === "uploading" && (
                          <motion.div
                            style={{ height: 18, width: 18, flexShrink: 0, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "rgba(255,255,255,0.8)" }}
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }}
                          />
                        )}
                        {msg.fileUpload.status === "done" && (
                          <div style={{ height: 20, width: 20, flexShrink: 0, borderRadius: "50%", background: green, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <CheckCircle style={{ height: 11, width: 11, color: "#fff" }} />
                          </div>
                        )}
                        {msg.fileUpload.status === "error" && (
                          <div style={{ height: 20, width: 20, flexShrink: 0, borderRadius: "50%", background: red, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <X style={{ height: 11, width: 11, color: "#fff" }} />
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Regular text bubble */
                      <div style={{
                        maxWidth: "78%", padding: "11px 16px",
                        fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap",
                        borderRadius: 14,
                        background:           msg.role === "user" ? ink  : surf,
                        color:                msg.role === "user" ? bg   : ink,
                        border:               msg.role === "q"    ? `1px solid ${bdr}` : "none",
                        borderTopLeftRadius:  msg.role === "q"    ? 4    : 14,
                        borderTopRightRadius: msg.role === "user" ? 4    : 14,
                      }}>
                        {msg.text}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* typing indicator */}
              {typing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 10 }}>
                  <div style={{ height: 28, width: 28, borderRadius: 8, flexShrink: 0, background: ink, color: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>Q</div>
                  <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, borderTopLeftRadius: 4, padding: "14px 18px", display: "flex", gap: 5, alignItems: "center" }}>
                    {[0, 0.18, 0.36].map((d, i) => (
                      <motion.div key={i} style={{ height: 5, width: 5, background: muted, borderRadius: "50%" }} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: d }} />
                    ))}
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* drag overlay */}
          {dragOver && (
            <div style={{
              position: "absolute", inset: 0, background: "rgba(37,99,235,0.08)",
              border: `2px dashed ${blue}`, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 10, pointerEvents: "none",
            }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: blue }}>Drop your file here</p>
            </div>
          )}

          {/* input area */}
          <div style={{ flexShrink: 0, borderTop: `1px solid ${bdr}`, padding: "12px 28px", background: bg }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.txt,.md"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleFileUpload(f); e.target.value = ""; } }}
            />
            <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "flex-end", gap: 8 }}>
              {/* attachment button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Upload pitch deck or financials (PDF, CSV, TXT)"
                style={{
                  height: 42, width: 42, flexShrink: 0,
                  background: uploading ? surf : "transparent",
                  border: `1px solid ${bdr}`,
                  borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: uploading ? "not-allowed" : "pointer",
                  transition: "background .15s, border-color .15s",
                }}
                onMouseEnter={(e) => { if (!uploading) { e.currentTarget.style.background = surf; e.currentTarget.style.borderColor = ink; }}}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = bdr; }}
              >
                {uploading
                  ? <motion.div style={{ height: 14, width: 14, borderRadius: "50%", border: `2px solid ${bdr}`, borderTopColor: blue }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
                  : <Paperclip style={{ height: 15, width: 15, color: muted }} />
                }
              </button>

              {/* text input */}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your response…"
                disabled={typing}
                rows={1}
                style={{
                  flex: 1, background: surf, border: `1px solid ${bdr}`, borderRadius: 8,
                  padding: "11px 14px", fontSize: 14, color: ink,
                  resize: "none", outline: "none", fontFamily: "inherit",
                  lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
                  opacity: typing ? 0.5 : 1,
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = ink; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = bdr; }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
              />

              {/* send button */}
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || typing}
                style={{
                  height: 42, width: 42, flexShrink: 0,
                  background: !input.trim() || typing ? surf : ink,
                  border: `1px solid ${!input.trim() || typing ? bdr : ink}`,
                  borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: !input.trim() || typing ? "not-allowed" : "pointer",
                  transition: "background .15s",
                }}
              >
                <Send style={{ height: 15, width: 15, color: !input.trim() || typing ? muted : bg }} />
              </button>
            </div>
            <p style={{ maxWidth: 680, margin: "6px auto 0", textAlign: "center", fontSize: 10, color: muted, opacity: 0.5 }}>
              Enter to send · Attach pitch deck or financials with the clip icon
            </p>
          </div>
        </div>

        {/* ── score builder panel ───────────────────────────────────────── */}
        <div style={{
          width: 340, flexShrink: 0,
          borderLeft: `1px solid ${bdr}`,
          background: bg, overflowY: "auto",
          display: "flex", flexDirection: "column",
        }}>

          {/* Q-Score ring */}
          <div style={{ padding: "24px 20px", borderBottom: `1px solid ${bdr}`, textAlign: "center" }}>
            <svg width="100" height="100" viewBox="0 0 100 100" style={{ margin: "0 auto", display: "block" }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke={bdr} strokeWidth="6" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={overallScore >= 70 ? green : overallScore >= 40 ? amber : overallScore > 0 ? red : bdr}
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDash}
                transform="rotate(-90 50 50)"
                style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s" }}
              />
              <text x="50" y="46" textAnchor="middle" fill={ink} fontSize="22" fontWeight="700">
                {overallScore || "—"}
              </text>
              <text x="50" y="60" textAnchor="middle" fill={muted} fontSize="9" fontWeight="600">
                Q-SCORE
              </text>
            </svg>
          </div>

          {/* dimension bars */}
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${bdr}` }}>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 12 }}>
              Dimensions
            </p>
            {DIMENSIONS.map(({ key, label, weight }) => {
              const score = dimScores[key] || 0;
              return (
                <div key={key} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: ink, fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: 10, color: score > 0 ? dimColor(score) : muted, fontWeight: 600 }}>
                      {score > 0 ? score : "—"} <span style={{ fontWeight: 400, color: muted }}>({weight})</span>
                    </span>
                  </div>
                  <div style={{ height: 4, background: surf, borderRadius: 99 }}>
                    <motion.div
                      style={{ height: "100%", borderRadius: 99, background: dimColor(score) }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* topic progress */}
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${bdr}` }}>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 10 }}>
              Topics
            </p>
            {TOPICS.map((topic, i) => {
              const covered = coveredTopics.includes(topic.key);
              const active  = i === currentTopic;
              return (
                <div
                  key={topic.key}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
                    cursor: "pointer", padding: "4px 0",
                  }}
                  onClick={() => { if (!typing) setCurrentTopic(i); }}
                >
                  {covered
                    ? <CheckCircle style={{ height: 14, width: 14, color: green, flexShrink: 0 }} />
                    : <Circle style={{ height: 14, width: 14, color: active ? blue : bdr, flexShrink: 0 }} />
                  }
                  <span style={{
                    fontSize: 12,
                    color: covered ? green : active ? ink : muted,
                    fontWeight: active ? 600 : 400,
                  }}>
                    {topic.label}
                  </span>
                  <span style={{ fontSize: 10, color: muted, marginLeft: "auto" }}>{topic.dimension}</span>
                </div>
              );
            })}
          </div>

          {/* extracted data */}
          {visibleMetrics.length > 0 && (
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${bdr}` }}>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 10 }}>
                Extracted Data
              </p>
              {visibleMetrics.map(({ key, label, prefix, suffix }) => (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                  <span style={{ fontSize: 12, color: muted }}>{label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {editingField === key ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingField(null); }}
                          style={{
                            width: 80, padding: "2px 6px", fontSize: 12, border: `1px solid ${blue}`,
                            borderRadius: 4, outline: "none", background: bg, color: ink, fontFamily: "inherit",
                          }}
                        />
                        <button onClick={saveEdit} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                          <CheckCircle style={{ height: 12, width: 12, color: green }} />
                        </button>
                        <button onClick={() => setEditingField(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                          <X style={{ height: 12, width: 12, color: muted }} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>
                          {prefix}{String(extracted[key])}{suffix}
                        </span>
                        <button
                          onClick={() => startEdit(key)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginLeft: 2 }}
                        >
                          <Edit3 style={{ height: 10, width: 10, color: muted }} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* complete CTA */}
          <div style={{ padding: "16px 20px", marginTop: "auto" }}>
            <button
              onClick={handleComplete}
              disabled={!canComplete || typing}
              style={{
                width: "100%", padding: "10px 14px",
                background: canComplete ? green : surf,
                color: canComplete ? "#fff" : muted,
                border: `1px solid ${canComplete ? green : bdr}`,
                borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: canComplete ? "pointer" : "not-allowed",
                fontFamily: "inherit", transition: "opacity .15s",
              }}
            >
              {canComplete ? "Complete Assessment" : `Cover ${4 - coveredTopics.length} more topic${4 - coveredTopics.length === 1 ? "" : "s"}`}
            </button>
            <p style={{ fontSize: 10, color: muted, textAlign: "center", marginTop: 6, opacity: 0.7 }}>
              {canComplete ? "Your Q-Score will be calculated" : "Minimum 4 topics required to submit"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── transform extracted flat data to assessment structure ──────────────────
function transformExtractedToAssessment(data: ExtractedData) {
  return {
    problemStory: String(data.problemStory || ""),
    problemFollowUps: [],
    advantages: Array.isArray(data.advantages) ? data.advantages : [],
    advantageExplanation: String(data.advantageExplanation || ""),
    customerType: String(data.customerType || ""),
    conversationDate: null,
    customerQuote: String(data.customerQuote || ""),
    customerSurprise: String(data.customerSurprise || ""),
    customerCommitment: String(data.customerCommitment || ""),
    conversationCount: Number(data.conversationCount) || 0,
    customerList: Array.isArray(data.customerList) ? data.customerList : [],
    failedBelief: String(data.failedBelief || ""),
    failedReasoning: String(data.failedReasoning || ""),
    failedDiscovery: String(data.failedDiscovery || ""),
    failedChange: String(data.failedChange || ""),
    tested: String(data.tested || ""),
    buildTime: Number(data.buildTime) || 0,
    measurement: String(data.measurement || ""),
    results: String(data.results || ""),
    learned: String(data.learned || ""),
    changed: String(data.changed || ""),
    targetCustomers: data.targetCustomers ? Number(data.targetCustomers) : undefined,
    conversionRate: data.conversionRate ? Number(data.conversionRate) : undefined,
    dailyActivity: data.dailyActivity ? Number(data.dailyActivity) : undefined,
    lifetimeValue: data.lifetimeValue ? Number(data.lifetimeValue) : undefined,
    costPerAcquisition: (data.costPerAcquisition || data.currentCAC) ? Number(data.costPerAcquisition || data.currentCAC) : undefined,
    hardshipStory: String(data.hardshipStory || data.hardestMoment || ""),
    hardshipType: "",
    gtm: {
      icpDescription: String(data.icpDescription || ""),
      channelsTried: Array.isArray(data.channelsTried) ? data.channelsTried : [],
      channelResults: [],
      currentCAC: Number(data.currentCAC) || undefined,
      targetCAC: Number(data.targetCAC) || undefined,
      messagingTested: Boolean(data.messagingTested),
      messagingResults: String(data.messagingResults || ""),
    },
    financial: {
      mrr: Number(data.mrr) || undefined,
      arr: Number(data.arr) || undefined,
      monthlyBurn: Number(data.monthlyBurn) || 0,
      runway: Number(data.runway) || undefined,
      cogs: Number(data.cogs) || undefined,
      averageDealSize: Number(data.averageDealSize) || undefined,
      projectedRevenue12mo: Number(data.projectedRevenue12mo) || undefined,
      revenueAssumptions: String(data.revenueAssumptions || ""),
    },
  };
}
