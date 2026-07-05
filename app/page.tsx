import type { Metadata } from "next";
import { LandingPage } from "@/features/landing/components/LandingPage";
import { FAQS } from "@/features/landing/copy";
import { APP_NAME, APP_URL } from "@/lib/constants/app";

export const metadata: Metadata = {
  title: `${APP_NAME} — Fundable is measurable`,
  description:
    "Edge Alpha scores your startup across the six dimensions investors actually price — then nine AI advisers help you move the number. Get your Q-Score free.",
  alternates: { canonical: APP_URL },
  openGraph: {
    title: `${APP_NAME} — Fundable is measurable`,
    description:
      "A 0–100 investment-readiness score, nine AI advisers, and a marketplace of verified investors that unlocks at Q-Score 70.",
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
    "The AI-powered startup OS: Q-Score investment readiness scoring, nine AI advisers, and a verified investor marketplace.",
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

export default function Page() {
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
      <LandingPage />
    </>
  );
}
