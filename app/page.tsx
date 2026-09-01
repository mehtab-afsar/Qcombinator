import type { Metadata } from "next";
import { LandingPage } from "@/features/landing/components/LandingPage";
import { isSignupOpen } from "@/lib/auth/signup-access";
import { FAQS } from "@/features/landing/copy";
import { APP_NAME, APP_URL } from "@/lib/constants/app";

export const metadata: Metadata = {
  title: `${APP_NAME} — Fundable is measurable`,
  description:
    "Edge Alpha scores your startup across the six dimensions investors actually price — then five AI executives help you move the number. Get your Q-Score free.",
  alternates: { canonical: APP_URL },
  openGraph: {
    title: `${APP_NAME} — Fundable is measurable`,
    description:
      "A 0–100 investment-readiness score, five AI executives, and a marketplace of verified investors that unlocks at Q-Score 70.",
    url: APP_URL,
    siteName: APP_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — Fundable is measurable`,
    description:
      "Get your Q-Score, fix what investors will flag, and raise when you're ready.",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: APP_NAME,
  url: APP_URL,
  logo: `${APP_URL}/icon.svg`,
  description:
    "The AI-powered startup OS: Q-Score investment readiness scoring, five AI executives, and a verified investor marketplace.",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

/**
 * Re-rendered at most once a minute rather than built once at deploy. The signup gate now lives
 * in a database row that can be flipped at any moment (lib/auth/signup-access.ts), so a fully
 * static page would keep offering a signup CTA after the product had been closed — or keep
 * saying "Launching soon" after it opened — until the next deploy.
 *
 * A minute of staleness is only ever cosmetic. The lock itself is checked per request inside
 * every account-creating route, so a stale button leads to an honest refusal, never to an
 * account that shouldn't exist.
 */
export const revalidate = 60

export default async function Page() {
  const signupOpen = await isSignupOpen()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <LandingPage signupOpen={signupOpen} />
    </>
  );
}
