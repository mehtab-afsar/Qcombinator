"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";

// ─── types ────────────────────────────────────────────────────────────────────
interface Question {
  id: string;
  text: string;
  type: "radio" | "text" | "scale";
  options?: string[];
}

interface SurveyContent {
  targetAudience?: string;
  ellisQuestion?: { question: string; options: string[] };
  followUpQuestions?: { id: string; question: string; type: "text" | "radio"; options?: string[] }[];
  interviewScript?: string[];
  questions?: { id: string; text: string; type: string; options?: string[] }[];
}

interface Survey {
  id: string;
  title: string;
  content: SurveyContent;
}

// ─── helper: normalise any content shape into a flat Question[] ───────────────
function extractQuestions(content: SurveyContent): Question[] {
  const qs: Question[] = [];

  // 1. ellis / sean-ellis "very disappointed" question
  if (content.ellisQuestion) {
    qs.push({
      id: "ellis",
      text: content.ellisQuestion.question,
      type: "radio",
      options: content.ellisQuestion.options,
    });
  }

  // 2. follow-up questions
  if (content.followUpQuestions?.length) {
    for (const q of content.followUpQuestions) {
      qs.push({
        id: q.id,
        text: q.question,
        type: q.type === "radio" ? "radio" : "text",
        options: q.options,
      });
    }
  }

  // 3. generic questions array (alternative schema)
  if (content.questions?.length && qs.length === 0) {
    for (const q of content.questions) {
      qs.push({
        id: q.id,
        text: q.text,
        type: (q.type as Question["type"]) ?? "text",
        options: q.options,
      });
    }
  }

  // 4. fallback – no recognisable structure
  if (qs.length === 0) {
    qs.push({
      id: "how_disappointed",
      text: "How would you feel if you could no longer use this product?",
      type: "radio",
      options: ["Very disappointed", "Somewhat disappointed", "Not disappointed"],
    });
    qs.push({
      id: "what_benefit",
      text: "What is the main benefit you get from this product?",
      type: "text",
    });
    qs.push({
      id: "who_else",
      text: "Who else do you think would benefit most from this product?",
      type: "text",
    });
  }

  return qs;
}

// ─── scale question ───────────────────────────────────────────────────────────
function ScaleQuestion({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(String(n))}
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            border: `1.5px solid ${value === String(n) ? blue : bdr}`,
            background: value === String(n) ? blue : surf,
            color: value === String(n) ? "#fff" : ink,
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 15,
            fontWeight: value === String(n) ? 600 : 400,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function SurveyPage() {
  const params      = useParams<{ surveyId: string }>();
  const searchParams = useSearchParams();
  const surveyId    = params.surveyId;
  const userId      = searchParams.get("uid") ?? "";

  const [survey,           setSurvey]           = useState<Survey | null>(null);
  const [questions,        setQuestions]        = useState<Question[]>([]);
  const [answers,          setAnswers]          = useState<Record<string, string>>({});
  const [respondentEmail,  setRespondentEmail]  = useState("");
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [submitting,       setSubmitting]       = useState(false);
  const [submitted,        setSubmitted]        = useState(false);
  const [submitError,      setSubmitError]      = useState<string | null>(null);

  // ── fetch survey ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!surveyId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/survey?surveyId=${encodeURIComponent(surveyId)}`);
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? "Survey not found");
        }
        const data = await res.json() as { survey: Survey };
        setSurvey(data.survey);
        setQuestions(extractQuestions(data.survey.content));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load survey");
      } finally {
        setLoading(false);
      }
    })();
  }, [surveyId]);

  // ── handle submit ─────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    // Basic validation – all questions must be answered
    for (const q of questions) {
      if (!answers[q.id]?.trim()) {
        setSubmitError("Please answer all questions before submitting.");
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId,
          userId,
          respondentEmail: respondentEmail || undefined,
          answers,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Submission failed");
      }
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── render: loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            border: `3px solid ${bdr}`, borderTopColor: blue,
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }} />
          <p style={{ color: muted, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 14 }}>
            Loading survey…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── render: error ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{
          background: surf, border: `1px solid ${bdr}`, borderRadius: 12,
          padding: 40, maxWidth: 480, width: "100%", textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
          <h2 style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: ink, fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>
            Survey not found
          </h2>
          <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: muted, fontSize: 14, margin: 0 }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  // ─── render: success ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{
          background: surf, border: `1px solid ${bdr}`, borderRadius: 16,
          padding: "48px 40px", maxWidth: 520, width: "100%", textAlign: "center",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", background: `${green}18`,
            border: `2px solid ${green}`, display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 24px", fontSize: 28,
          }}>
            ✓
          </div>
          <h2 style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: ink, fontSize: 24, fontWeight: 700, margin: "0 0 12px" }}>
            Thank you!
          </h2>
          <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: muted, fontSize: 15, margin: "0 0 8px", lineHeight: 1.6 }}>
            Your response has been recorded.
          </p>
          <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: muted, fontSize: 14, margin: 0 }}>
            We appreciate your feedback — it helps us build a better product.
          </p>
        </div>
      </div>
    );
  }

  // ─── render: survey form ──────────────────────────────────────────────────
  const title = survey?.title ?? "Quick Survey";

  return (
    <div style={{ minHeight: "100vh", background: bg, padding: "40px 16px 80px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: `${blue}14`, border: `1px solid ${blue}30`,
            borderRadius: 20, padding: "4px 14px", marginBottom: 20,
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: blue, fontFamily: "system-ui, -apple-system, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Customer Survey
            </span>
          </div>
          <h1 style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 28, fontWeight: 700, color: ink, margin: "0 0 12px", lineHeight: 1.2 }}>
            {title}
          </h1>
          <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 15, color: muted, margin: 0, lineHeight: 1.6 }}>
            Your feedback helps us improve. This takes about 2 minutes.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Questions */}
            {questions.map((q, idx) => (
              <div key={q.id} style={{
                background: surf, border: `1px solid ${bdr}`,
                borderRadius: 12, padding: "24px 28px",
              }}>
                <label style={{
                  display: "block",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  fontSize: 15, fontWeight: 600, color: ink, marginBottom: 16,
                  lineHeight: 1.5,
                }}>
                  <span style={{ color: muted, fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>
                    Question {idx + 1}
                  </span>
                  {q.text}
                </label>

                {/* Radio */}
                {q.type === "radio" && q.options && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {q.options.map((opt) => (
                      <label key={opt} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 16px", borderRadius: 8,
                        border: `1.5px solid ${answers[q.id] === opt ? blue : bdr}`,
                        background: answers[q.id] === opt ? `${blue}08` : bg,
                        cursor: "pointer", transition: "all 0.15s",
                      }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%",
                          border: `2px solid ${answers[q.id] === opt ? blue : bdr}`,
                          background: answers[q.id] === opt ? blue : "transparent",
                          flexShrink: 0, transition: "all 0.15s",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {answers[q.id] === opt && (
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
                          )}
                        </div>
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          style={{ display: "none" }}
                        />
                        <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 14, color: ink }}>
                          {opt}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Text */}
                {q.type === "text" && (
                  <textarea
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Your answer…"
                    rows={4}
                    style={{
                      width: "100%", resize: "vertical", padding: "12px 14px",
                      border: `1.5px solid ${bdr}`, borderRadius: 8,
                      background: bg, color: ink, fontSize: 14,
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      lineHeight: 1.6, outline: "none", boxSizing: "border-box",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = blue; }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = bdr;  }}
                  />
                )}

                {/* Scale */}
                {q.type === "scale" && (
                  <div>
                    <ScaleQuestion
                      value={answers[q.id] ?? ""}
                      onChange={(v) => setAnswers(prev => ({ ...prev, [q.id]: v }))}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                      <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 12, color: muted }}>Not at all</span>
                      <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 12, color: muted }}>Extremely</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Email (optional) */}
            <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "24px 28px" }}>
              <label style={{
                display: "block",
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontSize: 15, fontWeight: 600, color: ink, marginBottom: 4,
              }}>
                Your email
                <span style={{ fontWeight: 400, color: muted, fontSize: 13, marginLeft: 6 }}>(optional)</span>
              </label>
              <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 13, color: muted, margin: "0 0 12px" }}>
                Leave your email if you&apos;d like us to follow up with you.
              </p>
              <input
                type="email"
                value={respondentEmail}
                onChange={(e) => setRespondentEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: "100%", padding: "11px 14px",
                  border: `1.5px solid ${bdr}`, borderRadius: 8,
                  background: bg, color: ink, fontSize: 14,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = blue; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = bdr;  }}
              />
            </div>

            {/* Submit error */}
            {submitError && (
              <div style={{
                background: "#DC262610", border: "1px solid #DC262640",
                borderRadius: 8, padding: "12px 16px",
              }}>
                <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 14, color: "#DC2626", margin: 0 }}>
                  {submitError}
                </p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: blue, color: "#fff",
                border: "none", borderRadius: 10,
                padding: "14px 32px", fontSize: 15, fontWeight: 600,
                fontFamily: "system-ui, -apple-system, sans-serif",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
                transition: "opacity 0.15s",
                alignSelf: "flex-start",
              }}
            >
              {submitting ? "Submitting…" : "Submit Feedback"}
            </button>
          </div>
        </form>

        {/* Footer */}
        <p style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 12, color: muted, textAlign: "center", marginTop: 40,
        }}>
          Powered by Qcombinator
        </p>
      </div>
    </div>
  );
}
