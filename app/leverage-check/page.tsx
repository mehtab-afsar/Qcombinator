import type { Metadata } from "next";
import { LeverageCheckPage } from "@/features/leverage-check/components/LeverageCheckPage";

export const metadata: Metadata = {
  title: "10× Founder Leverage Check — Edge Alpha",
  description: "An 8-question, 3-minute diagnostic: how much of your company runs through you, and where AI could create the most leverage in how you run it. No signup wall — just your number.",
};

export default function Page() {
  return <LeverageCheckPage />;
}
