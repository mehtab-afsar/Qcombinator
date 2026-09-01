"use client";

import { useLayoutEffect } from "react";
import { L } from "../theme";
import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { Ladder } from "./Ladder";
import { Discover } from "./Discover";
import { HowItWorks } from "./HowItWorks";
import { CommandPreview } from "./CommandPreview";
import { SocialProof } from "./SocialProof";
import { Pricing } from "./Pricing";
import { Faq } from "./Faq";
import { FinalCta } from "./FinalCta";
import { Footer } from "./Footer";

/** @param signupOpen resolved on the SERVER (app/page.tsx) from the real gate, so the page and
 *  the API can never disagree about whether the product is open. Cosmetic either way — the lock
 *  itself is lib/auth/signup-access.ts, applied at every account-creating route. */
export function LandingPage({ signupOpen }: { signupOpen: boolean }) {
  // The how-it-works section is scroll-position-driven (useScroll). Browsers restore the
  // previous scroll offset on reload by default, which can momentarily land mid-way through
  // that pinned section before the full page layout has settled — showing a flash of the
  // fully-built scene that then "corrects" back down. Force this page to always open at the
  // top and stop the browser from restoring a stale offset.
  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ background: L.bg, color: L.ink, minHeight: "100vh" }}>
      <Nav signupOpen={signupOpen} />
      <main>
        <Hero signupOpen={signupOpen} />
        <Ladder />
        <Discover />
        <HowItWorks />
        <CommandPreview />
        <SocialProof />
        <Pricing signupOpen={signupOpen} />
        <Faq />
        <FinalCta signupOpen={signupOpen} />
      </main>
      <Footer />
    </div>
  );
}
