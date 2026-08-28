"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { bg, bdr, ink, muted, blue, green, red } from "@/lib/constants/colors";
import { font } from "@/features/shared/tokens";
import { QUIZ_QUESTIONS, DIMENSION_LABELS, type AnswerLetter, type QuestionId } from "../scoring/questions";
import { QuizQuestionCard } from "./QuizQuestionCard";
import type { LeverageCheckApiResult } from "./LeverageCheckPage";

export function QuizWizard({ onComplete }: { onComplete: (result: LeverageCheckApiResult) => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<QuestionId, AnswerLetter>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const question = QUIZ_QUESTIONS[step];
  const isLast = step === QUIZ_QUESTIONS.length - 1;
  const selected = answers[question.id];

  async function handleContinue() {
    if (!selected) return;
    if (!isLast) { setStep((s) => s + 1); return; }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/leverage-check/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong. Please try again."); setSubmitting(false); return; }
      onComplete(data as LeverageCheckApiResult);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "120px 24px 80px" }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <span style={{ fontFamily: font.family.mono, fontSize: 11.5, letterSpacing: "0.12em", textTransform: "uppercase", color: muted }}>
            Question {step + 1} of {QUIZ_QUESTIONS.length}
          </span>
          <span style={{ fontFamily: font.family.mono, fontSize: 11.5, color: muted }}>
            {DIMENSION_LABELS[question.dimension]}
          </span>
        </div>
        <div style={{ height: 3, background: bdr, borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${((step + 1) / QUIZ_QUESTIONS.length) * 100}%`,
            background: `linear-gradient(90deg, ${blue}, ${green})`,
            borderRadius: 2, transition: "width 0.3s ease",
          }} />
        </div>
      </div>

      <QuizQuestionCard question={question} selected={selected} onSelect={(letter) => setAnswers((a) => ({ ...a, [question.id]: letter }))} />

      {error && <p style={{ fontSize: 13, color: red, marginTop: 20 }}>{error}</p>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32 }}>
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: muted, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <ArrowLeft size={14} /> Back
          </button>
        ) : <span />}

        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected || submitting}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 24px", borderRadius: 999, border: "none",
            background: !selected ? bdr : ink, color: bg,
            fontSize: 14.5, fontWeight: 600,
            cursor: !selected || submitting ? "default" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting
            ? <>Preparing your report… <Loader2 size={15} className="lc-spin" /></>
            : <>{isLast ? "See my results" : "Continue"} <ArrowRight size={15} /></>}
        </button>
      </div>

      <style>{`
        .lc-spin { animation: lc-spin-kf 0.8s linear infinite; }
        @keyframes lc-spin-kf { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .lc-spin { animation: none; } }
      `}</style>
    </div>
  );
}
