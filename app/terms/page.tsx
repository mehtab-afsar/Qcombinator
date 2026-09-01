import type { Metadata } from "next";
import Link from "next/link";
import { bg, ink, muted, blue } from "@/lib/constants/colors";
import { APP_NAME, APP_URL } from "@/lib/constants/app";

export const metadata: Metadata = {
  title: `Terms of Service — ${APP_NAME}`,
  description: `The terms that govern your use of ${APP_NAME}.`,
  alternates: { canonical: `${APP_URL}/terms` },
};

const LAST_UPDATED = "1 September 2026";

function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ color: ink, fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ color: muted, fontSize: 15, lineHeight: 1.7, marginBottom: 14 }}>{children}</p>;
}
function Li({ children }: { children: React.ReactNode }) {
  return <li style={{ color: muted, fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>{children}</li>;
}

export default function TermsOfServicePage() {
  return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px 96px" }}>
        <Link href="/" style={{ color: blue, fontSize: 14, textDecoration: "none" }}>&larr; {APP_NAME}</Link>

        <h1 style={{ color: ink, fontSize: 32, fontWeight: 800, marginTop: 24, marginBottom: 4 }}>
          Terms of Service
        </h1>
        <p style={{ color: muted, fontSize: 13, marginBottom: 32 }}>Last updated: {LAST_UPDATED}</p>

        <P>By creating an account or using {APP_NAME}, you agree to these terms. Please also read our <Link href="/privacy" style={{ color: blue }}>Privacy Policy</Link>, which explains how we handle your data.</P>

        <H2>1. The service</H2>
        <P>
          {APP_NAME} is a founder operating system: it scores your startup's investment readiness
          (the Q-Score), maintains a set of AI-generated Management Assets about your company, and —
          where you explicitly authorize it — takes real actions on your behalf through connected
          third-party accounts.
        </P>

        <H2>2. Your account</H2>
        <P>
          You're responsible for the accuracy of the information you provide and for keeping your
          account credentials secure. You must be authorized to act on behalf of any company you
          represent on the platform.
        </P>

        <H2>3. Subscriptions and billing</H2>
        <P>
          Paid features are billed through our payment processor on the plan you select. Fees are
          non-refundable except where required by law. You can cancel at any time; cancellation
          takes effect at the end of your current billing period.
        </P>

        <H2>4. Connected accounts and actions taken on your behalf</H2>
        <P>
          You may choose to connect third-party accounts (such as Gmail, Slack, Stripe, PostHog, or
          Apollo) to let the product act for you. By connecting an account and approving a specific
          action, you authorize {APP_NAME} to carry out exactly that action — for example, sending a
          specific email you've reviewed. You are responsible for what you approve. You can
          disconnect any connected account at any time, which immediately revokes our access to it.
        </P>

        <H2>5. Acceptable use</H2>
        <P>You agree not to:</P>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <Li>Use the product to send spam, harassment, or unlawful content to any third party.</Li>
          <Li>Attempt to circumvent the approval step required before an irreversible action is sent.</Li>
          <Li>Access another founder's account or data without authorization.</Li>
          <Li>Reverse-engineer, resell, or misuse the platform outside its intended purpose.</Li>
        </ul>

        <H2>6. Your content</H2>
        <P>
          You own the company information, documents, and data you provide. By using the product,
          you grant us a license to process that data solely to provide the service to you — we
          don't use your company data for any other purpose.
        </P>

        <H2>7. AI-generated content</H2>
        <P>
          Documents, analyses, and drafted messages produced by your AI executives are a drafting
          aid, not verified fact or professional advice. You're responsible for reviewing anything
          before relying on it or approving it to be sent to a real person.
        </P>

        <H2>8. Intellectual property</H2>
        <P>The {APP_NAME} product, software, and branding are our property. These terms don't grant you any rights to them beyond using the product as intended.</P>

        <H2>9. Disclaimers and limitation of liability</H2>
        <P>
          The product is provided "as is," without warranties of any kind. To the extent permitted
          by law, {APP_NAME} is not liable for indirect, incidental, or consequential damages
          arising from your use of the product.
        </P>

        <H2>10. Termination</H2>
        <P>You may close your account at any time. We may suspend or terminate an account that violates these terms.</P>

        <H2>11. Changes to these terms</H2>
        <P>If we make a material change, we'll update the date at the top of this page and, where appropriate, let you know directly.</P>

        <H2>12. Contact us</H2>
        <P>
          Questions about these terms — write to{" "}
          <a href="mailto:support@edgealpha.vc" style={{ color: blue }}>support@edgealpha.vc</a>.
        </P>
      </div>
    </div>
  );
}
