"use client";

import { useState } from "react";
import { bg, ink } from "@/lib/constants/colors";
import type { DimensionScores, Archetype } from "../scoring/calculate";
import { QuizWizard } from "./QuizWizard";
import { ResultsView } from "./ResultsView";

export interface LeverageCheckApiResult {
  id: string;
  multiple: number;
  archetype: Archetype;
  dimensionScores: DimensionScores;
  strongestDimension: keyof DimensionScores;
  weakestDimension: keyof DimensionScores;
  shortResult: string;
  fullReport: string;
}

export function LeverageCheckPage() {
  const [result, setResult] = useState<LeverageCheckApiResult | null>(null);

  return (
    <div style={{ background: bg, color: ink, minHeight: "100vh" }}>
      {result ? <ResultsView result={result} /> : <QuizWizard onComplete={setResult} />}
    </div>
  );
}
