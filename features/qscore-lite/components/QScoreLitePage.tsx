"use client";

import { useState } from "react";
import { bg, ink } from "@/lib/constants/colors";
import type { ParameterScore, IndicatorResult } from "../scoring/types";
import { LookupForm } from "./LookupForm";
import { LoadingState } from "./LoadingState";
import { ResultsView } from "./ResultsView";

export interface QScoreLiteApiResult {
  id: string;
  domain: string;
  companyName: string;
  qslScore: number;
  confidencePct: number;
  activeIndicatorCount: number;
  parameters: ParameterScore[];
  indicators: IndicatorResult[];
}

type Stage = "form" | "loading" | "results";

export function QScoreLitePage() {
  const [stage, setStage] = useState<Stage>("form");
  const [result, setResult] = useState<QScoreLiteApiResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(companyName: string, url: string) {
    setStage("loading");
    setError("");
    try {
      const res = await fetch("/api/qscore-lite/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setStage("form");
        return;
      }
      setResult(data as QScoreLiteApiResult);
      setStage("results");
    } catch {
      setError("Something went wrong. Please try again.");
      setStage("form");
    }
  }

  return (
    <div style={{ background: bg, color: ink, minHeight: "100vh" }}>
      {stage === "form" && <LookupForm onSubmit={handleSubmit} error={error} />}
      {stage === "loading" && <LoadingState />}
      {stage === "results" && result && <ResultsView result={result} />}
    </div>
  );
}
