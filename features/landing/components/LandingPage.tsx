"use client";

import { L } from "../theme";
import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { Problem } from "./Problem";
import { HowItWorks } from "./HowItWorks";
import { Agents } from "./Agents";
import { SocialProof } from "./SocialProof";
import { Pricing } from "./Pricing";
import { Faq } from "./Faq";
import { FinalCta } from "./FinalCta";
import { Footer } from "./Footer";

export function LandingPage() {
  return (
    <div style={{ background: L.bg, color: L.ink, minHeight: "100vh" }}>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Agents />
        <SocialProof />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
