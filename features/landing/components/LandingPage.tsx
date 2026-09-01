"use client";

import { useLayoutEffect } from "react";
import { L } from "../theme";
import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { Ladder } from "./Ladder";
import { Bridge } from "./Bridge";
import { Problems } from "./Problems";
import { Discover } from "./Discover";
import { HowItWorks } from "./HowItWorks";
import { QScoreLiteCallout } from "./QScoreLiteCallout";
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
        {/* ── One argument, in order. ────────────────────────────────────────────────
            The page used to run Hero → Ladder → Discover → HowItWorks, which cut from the
            Founder Leverage story straight into the Q-Score story with nothing between them:
            two measurement systems, three competing "start here" CTAs, and a reader left to
            work out the connection themselves.

            Now: a hook, then the scale it refers to, then what three minutes buys you — and
            Bridge hands that over to the product. CommandPreview comes next because seeing five
            executives do real work is the most convincing thing here and it was buried near the
            footer. Problems states why fundability is hard immediately before HowItWorks answers
            it, instead of interrupting the leverage argument as it used to. Q-Score Lite lands
            after the six dimensions, where "what would MY company score?" is the natural next
            question rather than a third front door competing with the hero. ── */}
        <Hero signupOpen={signupOpen} />
        <Ladder />
        <Discover />
        <Bridge />
        <CommandPreview />
        <Problems />
        <HowItWorks />
        <QScoreLiteCallout />
        <SocialProof />
        <Pricing signupOpen={signupOpen} />
        <Faq />
        <FinalCta signupOpen={signupOpen} />
      </main>
      <Footer />
    </div>
  );
}
