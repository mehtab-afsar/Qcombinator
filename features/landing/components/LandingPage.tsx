"use client";

import { useLayoutEffect } from "react";
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
  // The hero and how-it-works sections are scroll-position-driven (useScroll).
  // Browsers restore the previous scroll offset on reload by default, which
  // can momentarily land mid-way through those pinned sections before the
  // full page layout has settled — showing a flash of the fully-built scene
  // that then "corrects" back down. Force this page to always open at the
  // top and stop the browser from restoring a stale offset.
  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

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
