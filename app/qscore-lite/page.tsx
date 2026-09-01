import type { Metadata } from "next";
import { QScoreLitePage } from "@/features/qscore-lite/components/QScoreLitePage";

export const metadata: Metadata = {
  title: "Q-Score Lite — Edge Alpha",
  description: "Enter your company name and website. We scan public evidence — no self-report — and return a fundability score and confidence level in under a minute.",
};

export default function Page() {
  return <QScoreLitePage />;
}
